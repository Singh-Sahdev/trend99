from firebase_admin import credentials, firestore
import socketio
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Optional
import random
from serpapi.core import search
from firebase import db
import crud
from fastapi import FastAPI, HTTPException, Depends, Request
import crud
from models import TrendText, Keyword, TrendTextKeywordLink
from auth.auth_routes import router as auth_router, verify_token
from duel import create_duel_room, update_duel, get_duel_result, start_new_game
from fastapi.responses import StreamingResponse
import asyncio
import json,os
from datetime import datetime

from dotenv import load_dotenv
from gradio_client import Client

import api 

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fast_api = FastAPI()
app = socketio.ASGIApp(sio, other_asgi_app=fast_api)

load_dotenv()

# CORS setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

fast_api.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

players_in_queue = []

# Mapping of socket IDs to room IDs
sid_to_room = {}

SERPAPI_KEY = os.getenv("SERPAPI_KEY")


def is_word_in_genre(word,genre):
    prediction = predict_genre(word)
    return genre == prediction


def fetch_trend_score(word : str) -> int:
    try:
        params = {
            'engine': 'google_trends',
            'q': word,
            'geo': 'US',
            'api_key': SERPAPI_KEY
        }
        result = search(params).as_dict()

        if "interest_over_time" in result and "timeline_data" in result["interest_over_time"]:
            # Assuming serpapi_response is the JSON object you received
                latest_data_point = result['interest_over_time']['timeline_data'][-1]
                latest_score = latest_data_point['values'][0].get('extracted_value', latest_data_point['values'][0].get('value'))
                return latest_score

        return 0
    except Exception as e:
        print(f"[Trend Fetch Error] {word}: {e}")
        return 0


import math

def aggregate_trend_score(keywords: list[str]) -> float:
    """
    Calculates an aggregate trend score for a list of keywords using a weighted strategy.

    This method is designed for use in trend-based applications like Trend99,
    where evaluating a set of keywords on how "trendy" they are requires more nuance
    than simply taking the average.

    Strategy:
    - Emphasize standout keywords by giving higher weight to the most trending ones.
    - Reduce the impact of low-trend or spammy keywords.
    - Use logarithmic scaling to dampen the effect of large totals while still rewarding higher combined popularity.
    """

    scores = []

    # Step 1: Fetch individual trend scores for each keyword
    for word in keywords:
        score = fetch_trend_score(word)
        scores.append(score)

    if not scores:
        return 0.0  # No keywords or all failed to fetch

    # Step 2: Sort scores descending to easily extract top ones
    scores.sort(reverse=True)
    max_score = scores[0]  # Most trending keyword
    second_max = scores[1] if len(scores) > 1 else 0  # Second most trending
    sum_score = sum(scores)  # Total trend weight

    # Step 3: Weighted aggregation logic:
    # - 50% weight to the most trending keyword (high trend impact)
    # - 30% weight to the second top keyword (rewards having multiple hot topics)
    # - 20% weight to log-scaled total trend score (encourages broader trend presence but limits extreme values)
    aggregate = (
        0.5 * max_score +
        0.3 * second_max +
        0.2 * math.log(sum_score + 1)  # +1 avoids log(0); log dampens extreme values
    )

    return round(aggregate, 2)



async def predict_genre(sentence: str) -> str:
    try:
        # Make API call to Hugging Face Spaces
        client = Client("Sahdevsingh/genre-model-tfidf-svm")
        result = client.predict(
                text=sentence,
                api_name="/predict"
        )
        return result
    except Exception as e:
        print(f"[Genre Prediction Error] {sentence}: {e}")
        return "unknown"
    

async def predict_sentiment(sentence: str) -> str:
    try:
        # Make API call to Hugging Face Spaces
        client = Client("Sahdevsingh/sentiment-model")
        result:str = client.predict(
                text=sentence,
                api_name="/predict"
        )
        result = result.split()[0]  # Extract the sentiment label
        return result
    except Exception as e:
        print(f"[Sentiment Prediction Error] {sentence}: {e}")
        return "unknown"
    

async def predict_emotion(sentence: str) -> str:
    try:
        # Make API call to Hugging Face Spaces
        client = Client("Sahdevsingh/emotion-model")
        result = client.predict(
                text=sentence,
                api_name="/predict"
        )
        result = result.split()[0]  # Extract the sentiment label
        return result
    except Exception as e:
        print(f"[Emotion Prediction Error] {sentence}: {e}")
        return "unknown"


# =========== firebase utilities ======================

matches_ref = db.collection("matches")
players_ref = db.collection("players")

def save_socket_id(player_id, socket_id):

    players_ref.document(player_id).set({
        "socket_id" : socket_id,
        "is_available_for_duel" : True,
        "queued_at" : None
    } , merge= True)



async def find_match_and_start(sid, player_id):
    """Match player with earliest in queue"""

    player_doc = db.collection("players").document(player_id)
    now = datetime.now()

    player_doc.set({
        "is_available_for_duel": True,
        "queued_at": now,
        "socket_id": sid
    }, merge=True)

    # Use the same collection reference consistently
    players_ref = db.collection("players")

    opponents = players_ref \
        .where("is_available_for_duel", "==", True) \
        .order_by("queued_at") \
        .limit(2) \
        .stream()

    opponents_list = list(opponents)  # Needed if you're using async generator

    if len(opponents_list) < 2:
        return

    opponent_docs = [doc for doc in opponents_list if doc.id != player_id]
    if not opponent_docs:
        return

    opponent = opponent_docs[0]
    opponent_id = opponent.id
    opponent_data = opponent.to_dict()
    opponent_sid = opponent_data["socket_id"]

    # ✅ Always pass player IDs, not socket IDs, for game state logic
    room_id = create_duel_room(player_id, opponent_id, player_id)

    await sio.enter_room(sid, room_id)
    await sio.enter_room(opponent_sid, room_id)

    players_ref.document(player_id).update({"is_available_for_duel": False})
    players_ref.document(opponent_id).update({"is_available_for_duel": False})

    # Notify both players
    await sio.emit("duel_matched", {
        "opponent_id": opponent_id,
        "room_id": room_id,
        "your_turm" : True

    }, to=sid)

    await sio.emit("duel_matched", {
        "opponent_id": player_id,
        "room_id": room_id,
        "your_turn" : False
    }, to=opponent_sid)


    



# ============= socket handlers ======================

@sio.event
async def connect(sid, envi):
    print(f'[CONNECT] player {sid}')
    players_connected_length = 1 # will fetch from number of sockets present

    await sio.emit("connected_users" , {'connected_user' : players_connected_length}, to=sid)

@sio.event
async def disconnect(sid):
    player_query = players_ref.where('socket_id' , '==' , sid).get()

    if player_query:
        player_doc = player_query[0]
        player_id = player_doc.id

        players_ref.document(player_id).update({
            "is_available_for_duel" : False,
            "queued_at" : firestore.DELETE_FIELD
        })


@sio.event
async def join_matchmaking(sid, data):
    player_id = data['player_id']
    print(f'[QUEUE] player {player_id} joined matchmaking')
    await find_match_and_start(sid, player_id)


@sio.event
async def submit_word_duel(sid, data):
    room_id = data['room_id']
    word = data['word']

    player_query = players_ref.where('socket_id', '==', sid).get()
    if not player_query:
        return

    player_id = player_query[0].id
    result = await update_duel(room_id, player_id, word)

    await sio.emit('duel_update' , result, room_id)



@sio.event
async def select_genre(sid, data):
    player_id = data['player_id']
    room_id = data['room_id']
    genre = data['genre']

    match_doc = matches_ref.document(room_id).get()
    if not match_doc.exists:
        return
    
    match = match_doc.to_dict()

    if player_id == match["player_1"]:
        matches_ref.document(room_id).update({"player_1_genre": genre})
        opponent_id = match["player_2"]
    else:
        matches_ref.document(room_id).update({"player_2_genre": genre})
        opponent_id = match["player_1"]

    # Send selected genre to opponent
    opponent_doc = players_ref.document(opponent_id).get()
    if opponent_doc.exists:
        opponent_sid = opponent_doc.to_dict().get("socket_id")
        await sio.emit("opponent_genre_selected", {"genre": genre}, to=opponent_sid)

    # Fetch updated genre info
    updated_match = matches_ref.document(room_id).get().to_dict()
    genre1 = updated_match["player_1_genre"]
    genre2 = updated_match["player_2_genre"]

    if genre1 and genre2:
        final_genre = genre1 if genre1 == genre2 else random.choice([genre1, genre2])
        matches_ref.document(room_id).update({
            "genre": final_genre,
            "status": "genre_finalized"
        })

        # Notify both players of the final genre
        await sio.emit("genre_finalized", {"genre": final_genre}, room=room_id)



@sio.event
async def send_game_result(sid, data):
    room_id = data['room_id']
    result = get_duel_result(room_id, sid)

    await sio.emit('duel_result' , result , room=room_id)


# ======= fast api routes ================


# FastAPI endpoints for health check or other necessary functionalities
@fast_api.get("/health")
async def health_check():
    return {"status": "ok"}


@fast_api.get("/initialize-firestore")
async def initialize_firestore():
    # Create a test player document
    db.collection("players").document("test_player").set({
        "socket_id": "dummy_socket",
        "is_available_for_duel": True,
        "is_in_duel": False,
        "last_updated": firestore.SERVER_TIMESTAMP
    })

    # Create a test match document
    db.collection("matches").document("dummy_match").set({
        "players": {
            "player1": "test_player",
            "player2": None
        },
        "created_at": firestore.SERVER_TIMESTAMP,
        "status": "waiting"
    })

    return {"message": "Test entries created in Firestore"}


# Include authentication routes
fast_api.include_router(auth_router)

# ---------- TrendText APIs ----------
@fast_api.post("/trendtexts/")
def create_trendtext(trendtext: TrendText):
    trendtext_id = crud.create_trendtext(trendtext)
    return {"id": trendtext_id}

@fast_api.get("/trendtexts/{trendtext_id}")
def read_trendtext(trendtext_id: str):
    trendtext = crud.get_trendtext(trendtext_id)
    if not trendtext:
        raise HTTPException(status_code=404, detail="TrendText not found")
    return trendtext

@fast_api.put("/trendtexts/{trendtext_id}")
def update_trendtext(trendtext_id: str, trendtext: TrendText):
    crud.update_trendtext(trendtext_id, trendtext)
    return {"message": "TrendText updated"}

@fast_api.delete("/trendtexts/{trendtext_id}")
def delete_trendtext(trendtext_id: str):
    crud.delete_trendtext(trendtext_id)
    return {"message": "TrendText deleted"}

# ---------- Keyword APIs ----------
@fast_api.post("/keywords/")
def create_keyword(keyword: Keyword):
    keyword_id = crud.create_keyword(keyword)
    return {"id": keyword_id}

@fast_api.get("/keywords/{keyword_id}")
def read_keyword(keyword_id: str):
    keyword = crud.get_keyword(keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    return keyword

@fast_api.put("/keywords/{keyword_id}")
def update_keyword(keyword_id: str, keyword: Keyword):
    crud.update_keyword(keyword_id, keyword)
    return {"message": "Keyword updated"}

@fast_api.delete("/keywords/{keyword_id}")
def delete_keyword(keyword_id: str):
    crud.delete_keyword(keyword_id)
    return {"message": "Keyword deleted"}

# ---------- TrendText-Keyword Link APIs ----------
@fast_api.post("/trendtext-keyword-links/")
def create_trendtext_keyword_link(link: TrendTextKeywordLink):
    link_id = crud.create_trendtext_keyword_link(link)
    return {"id": link_id}

@fast_api.get("/trendtext-keyword-links/{link_id}")
def read_trendtext_keyword_link(link_id: str):
    link = crud.get_trendtext_keyword_link(link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link

@fast_api.put("/trendtext-keyword-links/{link_id}")
def update_trendtext_keyword_link(link_id: str, link: TrendTextKeywordLink):
    crud.update_trendtext_keyword_link(link_id, link)
    return {"message": "Link updated"}

@fast_api.delete("/trendtext-keyword-links/{link_id}")
def delete_trendtext_keyword_link(link_id: str):
    crud.delete_trendtext_keyword_link(link_id)
    return {"message": "Link deleted"}



async def stream_generate(sentence: str, genre: str = "", sentiment: str = "", emotion: str = ""):
    # 1. Genre Prediction (only if not provided)
    if not genre:
        genre = await predict_genre(sentence)
        print(f"data: {json.dumps({'step': 'genre', 'value': genre})}\n\n")
        yield f"data: {json.dumps({'step': 'genre', 'value': genre})}\n\n"
        await asyncio.sleep(0.5)
    else:
        print(f"data: {json.dumps({'step': 'genre', 'value': genre, 'source': 'provided'})}\n\n")
        yield f"data: {json.dumps({'step': 'genre', 'value': genre, 'source': 'provided'})}\n\n"

    # 2. Sentiment Prediction (only if not provided)
    if not sentiment:
        sentiment = await predict_sentiment(sentence)
        print(f"data: {json.dumps({'step': 'sentiment', 'value': sentiment})}\n\n")
        yield f"data: {json.dumps({'step': 'sentiment', 'value': sentiment})}\n\n"
        await asyncio.sleep(0.5)
    else:
        print(f"data: {json.dumps({'step': 'sentiment', 'value': sentiment, 'source': 'provided'})}\n\n")
        yield f"data: {json.dumps({'step': 'sentiment', 'value': sentiment, 'source': 'provided'})}\n\n"

    # 3. Emotion Prediction (only if not provided)
    if not emotion:
        emotion = await predict_emotion(sentence)
        print(f"data: {json.dumps({'step': 'emotion', 'value': emotion})}\n\n")
        yield f"data: {json.dumps({'step': 'emotion', 'value': emotion})}\n\n"
        await asyncio.sleep(0.5)
    else:
        print(f"data: {json.dumps({'step': 'emotion', 'value': emotion, 'source': 'provided'})}\n\n")
        yield f"data: {json.dumps({'step': 'emotion', 'value': emotion, 'source': 'provided'})}\n\n"

    # 4. Keyword Extraction
    keywords = api.fetch_keywords(genre, sentiment, emotion, sentence)
    print(f"data: {json.dumps({'step': 'keywords', 'value': keywords})}\n\n")
    yield f"data: {json.dumps({'step': 'keywords', 'value': keywords})}\n\n"
    await asyncio.sleep(0.5)

    # 5. Trend Score
    trend_score = aggregate_trend_score(keywords)
    print(f"data: {json.dumps({'step': 'trend_score', 'value': trend_score})}\n\n")
    yield f"data: {json.dumps({'step': 'trend_score', 'value': trend_score})}\n\n"
    await asyncio.sleep(0.5)

    # 6. Final Processing
    results = api.process_sentence_with_keywords(original_sentence=sentence, original_keywords=keywords, genre=genre, sentiment=sentiment, emotion=emotion)
    print(f"data: {json.dumps({'step': 'results', 'value': results})}\n\n")

    yield f"data: {json.dumps({'step': 'results', 'value': results})}\n\n"


# ✅ Route using async generator
@fast_api.post("/stream-generate")
async def stream(request: Request):
    data = await request.json()
    sentence = data["sentence"]
    genre = data.get("genre", "")
    sentiment = data.get("sentiment", "")
    emotion = data.get("emotion", "")

    return StreamingResponse(
        stream_generate(sentence, genre, sentiment, emotion),
        media_type="text/event-stream"
    )


@fast_api.post("/generate/")
def generate_sentence(sentence: str):
    genre = predict_genre(sentence)
    sentiment = predict_sentiment(sentence)
    emotion = predict_emotion(sentence)
    keywords = api.fetch_keywords(genre, sentiment, emotion, sentence)
    results = api.process_sentence_with_keywords(sentence, keywords, genre=genre, sentiment=sentiment, emotion=emotion)
    return {"word": sentence, "keywords": keywords, 'results': results}

 


# Run the application
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
