from firebase import db
from serpapi.core import search
from gradio_client import Client


SERPAPI_KEY = '791a3477f817e8948d0534b4eff5900c641b9e9cc8f36df41cb382c7fc212e20'


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
   

async def is_word_in_genre(word,genre):
    prediction = await predict_genre(word)
    res = {
        'genre' : prediction.strip().lower(),
        'is_belongs' : genre.strip().lower() == prediction.strip().lower()
    }
    return res


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
            
                latest_data_point = result['interest_over_time']['timeline_data'][-1]
                latest_score = latest_data_point['values'][0].get('extracted_value', latest_data_point['values'][0].get('value'))
                return latest_score

        return 0
    except Exception as e:
        print(f"[Trend Fetch Error] {word}: {e}")
        return 0
    


matches_ref =  db.collection("matches")  

def create_duel_room(player_1: str, player_2: str, turn: str):
    room_id = f"{player_1}_{player_2}"
    
    matches_ref.document(room_id).set({
        "player_1": player_1,
        "player_2": player_2,
        "chain": [],
        "player_1_score": 0,
        "player_2_score": 0,
        "turn": turn,
        "genre": None,
        "player_1_genre": None,
        "player_2_genre": None,
        "status": "waiting_for_genre"
    })

    return room_id





async def update_duel(room_id: str, player_id: str, word: str):
    match_doc = matches_ref.document(room_id).get()
    if not match_doc.exists:
        return {"error": "Room not found"}

    match = match_doc.to_dict()
    chain = match.get("chain", [])
    genre = match.get("genre")

    # Validate word genre
    res = await is_word_in_genre(word, genre)
    if not res['is_belongs']:
        return {
            "status": "invalid_genre",
            "word": word,
            "expected_genre": genre,
            "predicted_genre": res['genre']
        }

    current_score = fetch_trend_score(word)

    # Chain break check
    if chain:
        previous_score = chain[-1]["trend_score"]
        if current_score < previous_score:
            winner_id = match["player_2"] if player_id == match["player_1"] else match["player_1"]
            matches_ref.document(room_id).update({
                "chain": chain,
                "status": "ended",
                "winner": winner_id
            })
            return {
                "status": "chain_broken",
                "loser_id": player_id,
                "winner_id": winner_id,
                "broken_word": word,
                "previous_score": previous_score,
                "current_score": current_score
            }

    # Identify whose turn is next
    next_turn = match["player_2"] if player_id == match["player_1"] else match["player_1"]
    player_words_key = f"{player_id}_words"
    player_words = match.get(player_words_key, [])
    player_words.append({"word": word, "trend_score": current_score})

    chain.append({"word": word, "trend_score": current_score})

    # Update Firestore
    matches_ref.document(room_id).update({
        player_words_key: player_words,
        "chain": chain
    })

    # Score calculation
    def total_score(words):
        return sum(item["trend_score"] for item in words)

    player_1_id = match["player_1"]
    player_2_id = match["player_2"]

    p1_words = match.get(f"{player_1_id}_words", [])
    p2_words = match.get(f"{player_2_id}_words", [])

    # Use latest state if current player just updated
    if player_id == player_1_id:
        p1_words = player_words
    else:
        p2_words = player_words

    p1_score = total_score(p1_words)
    p2_score = total_score(p2_words)

    # End game if chain reaches 10
    if len(chain) >= 10:
        if p1_score > p2_score:
            winner = player_1_id
        elif p2_score > p1_score:
            winner = player_2_id
        else:
            winner = "draw"

        matches_ref.document(room_id).update({
            "status": "ended",
            "winner": winner
        })

        return {
            "status": "game_over",
            "winner": winner,
            "chain": chain,
            "player_scores": {
                player_1_id: p1_score,
                player_2_id: p2_score
            }
        }

    return {
        "status": "continue",
        "player_id": player_id,
        "word": word,
        "trend_score": current_score,
        "chain": chain,
        "turn": next_turn,
        "player_scores": {
            player_1_id: p1_score,
            player_2_id: p2_score
        }
    }












def get_duel_result(room_id: str, requesting_sid: str):
    match_doc = matches_ref.document(room_id).get()
    if not match_doc.exists:
        return {"error": "Room not found"}

    match = match_doc.to_dict()
    p1_words = match.get("player_1_words", [])
    p2_words = match.get("player_2_words", [])

    p1_score = len(p1_words)
    p2_score = len(p2_words)


    if p1_score > p2_score:
        winner = match["player_1"]
    elif p2_score > p1_score:
        winner = match["player_2"]
    else:
        winner = "draw"

    return {
        "player_1_words": p1_words,
        "player_2_words": p2_words,
        "player_1_score": p1_score,
        "player_2_score": p2_score,
        "winner": winner
    }










def start_new_game(room_id: str):
    match_doc = matches_ref.document(room_id).get()
    if not match_doc.exists:
        return {"error": "Invalid room."}

    room = match_doc.to_dict()
    matches_ref.document(room_id).update({
        "chain": [],
        "player_1_score": 0,
        "player_2_score": 0,
        "turn": room["player_1"],
        "genre": None,
        "player_1_genre": None,
        "player_2_genre": None,
        "status": "waiting_for_genre"
    })
    return {"message": "Game reset."}

