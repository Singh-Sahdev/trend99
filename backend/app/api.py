from sentence_transformers import SentenceTransformer, util
from serpapi.core import search
import google.generativeai as genai
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

from langchain.tools import tool
from langchain_core.runnables import RunnableLambda
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional
import torch
from functools import lru_cache
from keybert import KeyBERT
from keybert.llm import TextGeneration
from keybert import KeyLLM
from transformers import pipeline


sbert_model = SentenceTransformer("all-MiniLM-L6-v2")


# Configure Google Gemini API
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("[Warning] GOOGLE_API_KEY environment variable is not set.")



# @lru_cache()
# def load_key_llm():
#     generate_pipeline = pipeline(
#         "text-generation",
#         model="tiiuae/falcon-rw-1b",
#         device=0 if torch.cuda.is_available() else -1,
#         max_new_tokens=100,
#         temperature=0.7
#     )

#     textgen_llm = TextGeneration(generate_pipeline)
#     return KeyLLM(textgen_llm)

@lru_cache()
def load_llm():
    return genai.GenerativeModel("gemini-2.5-pro-preview-05-06")






# Load SentenceTransformer model for semantic similarity



# Utility function for fetching data from APIs
def fetch_api_data(params, api_key, engine='google_trends'):
    """General function to fetch data from SerpAPI and other APIs"""
    params['api_key'] = api_key
    try:
        search = search(params)
        results = search.get_json()
        return results
    except Exception as e:
        print(f"[Error] API request failed for '{params['q']}': {e}")
        return {}


keybert_model = KeyBERT(model="all-MiniLM-L6-v2")
keyllm_extractor = None

def fetch_keywords(genre, sentiment, emotion, text):
    
    enriched_text = f"Genre: {genre}\nSentiment: {sentiment}\nEmotion: {emotion}\nText: {text}"
    keywords = None
    print("\n=== 🔑 KeyBERT Keywords ===")
    try:
        keybert_keywords = keybert_model.extract_keywords(text, top_n=10)
        keywords = [kw[0] for kw in keybert_keywords]
        print(keywords)
    except Exception as e:
        print("❌ KeyBERT error:", e)

    # try:
    #     keyllm_extractor = load_llm()
    # except Exception as e:
    #     print("❌ Failed to load KeyLLM model:", e)
    #     keyllm_extractor = None

    if keyllm_extractor:
        print("\n=== 🧠 KeyLLM Keywords ===")
        try:
            keyllm_keywords = keyllm_extractor.extract_keywords(enriched_text)
            keywords = [kw[0] for kw in keyllm_keywords]
            print(keywords)
        except Exception as e:
            print("❌ KeyLLM error:", e)
    else:
        print("⚠️ Skipping KeyLLM – not available.")

    return keywords


# def fetch_keywords(sentence: str, genre: str, emotion: str, sentiment: str) -> List[str]:
#     prompt = (
#         f"Extract the 5 most important trending keywords from the following sentence"
#         f"(fetch the keywords only from the given sentence inside ''"
#         f"keeping the genre, sentiment and emotion in account, dont put them in the keywords).\n\n"
#         f"Sentence: '{sentence}'\n"
#         f"Genre: {genre}\nEmotion: {emotion}\nSentiment: {sentiment}\n\n"
#         f"Return the keywords as a Python list of strings."
#         f"return only the list without any additional text(exclude this also ```python...``` )."
#     )
#     try:
#         model = load_llm()
#         response = model.generate_content(prompt)
#         # Evaluate the response safely as a Python list
#         print(response.text.strip())
#         keywords = eval(response.text.strip())  # This assumes model returns a Python list
#         if isinstance(keywords, list) and all(isinstance(k, str) for k in keywords):
#             return keywords
#         else:
#             print("[Warning] Unexpected format in Gemini keyword output:", response.text)
#             return []
#     except Exception as e:
#         print(f"[Error] Gemini keyword extraction failed: {e}")
#         return []



# Function to fetch trend data from Serpapi
def fetch_trends_data(keyword):
    print(f"[SerpAPI] Fetching trends data for: {keyword}...")

    params = {
        "engine": "google_trends",
        "q": keyword,
        "date": "today 12-m",
        "output": "json",
        "geo": "IN"
    }
    
    results = fetch_api_data(params, SERPAPI_KEY)
    
    if "interest_over_time" in results and "timeline_data" in results["interest_over_time"]:
        timeline_data = results["interest_over_time"]["timeline_data"]
        trend_scores = [
            {"date": item["date"], "trend_value": item["values"][0]["extracted_value"]}
            for item in timeline_data if "values" in item and item["values"]
        ]
        return trend_scores
    
    return []


# Function to fetch related keywords from Serpapi
def fetch_related_keywords(keyword):
    print(f"[SerpAPI] Fetching related queries for: {keyword}...")

    params = {
        "engine": "google_trends",
        "q": keyword,
        "date": "today 12-m",
        "output": "json",
        "geo": "IN"
    }

    results = fetch_api_data(params, SERPAPI_KEY)

    if "related_queries" in results and "default" in results["related_queries"]:
        queries = results["related_queries"]["default"]["ranked_list"][0]["ranked_keyword"]
        related_terms = [q["query"] for q in queries if "query" in q]
        return related_terms

    return []


# Function to generate AI-powered search suggestions using Google Gemini API
def generate_ai_suggestions(keyword, genre, emotion, sentiment):
    print(f"[AI] Generating search suggestions for '{keyword}' in genre '{genre}' using Gemini API...")

    prompt = (
        f"Generate a list of popular search queries(Real time Trending queries) for '{keyword}' "
        f"focused on the '{genre}' category, incorporating the emotion '{emotion}' "
        f"and sentiment '{sentiment}'. Ensure suggestions are relevant to {genre} and "
        f"are trending topics."
    )

    try:
        model = load_llm()
        response = model.generate_content(prompt)

        ai_suggestions = response.text.split("\n")
        ai_suggestions = [s.strip("- ") for s in ai_suggestions if s]

        print(f"🤖 AI Suggestions: {ai_suggestions}")
        return ai_suggestions

    except Exception as e:
        print(f"[Error] Gemini API request failed: {e}")
        return []


# Function to find the most relevant keyword based on similarity
def find_best_matching_keywords(base_keyword, trend_keywords, ai_keywords):
    all_keywords = list(set(trend_keywords + ai_keywords))

    if not all_keywords:
        return []

    base_embedding = sbert_model.encode([base_keyword], convert_to_tensor=True)
    suggestion_embeddings = sbert_model.encode(all_keywords, convert_to_tensor=True)

    cosine_similarities = util.pytorch_cos_sim(base_embedding, suggestion_embeddings)

    similarity_scores = [
        {"keyword": all_keywords[idx], "similarity_score": cosine_similarities[0][idx].item()}
        for idx in range(len(all_keywords))
    ]

    similarity_scores.sort(key=lambda x: x["similarity_score"], reverse=True)
    return similarity_scores


# # Example LangChain tool structure with better state management
# @tool
def get_trend_data(keyword: str):
    return fetch_trends_data(keyword)


# @tool
def get_related_keywords(keyword: str):
    return fetch_related_keywords(keyword)


# @tool
def get_ai_suggestions(input: dict):
    return generate_ai_suggestions(input['keyword'], input['genre'], input['emotion'], input['sentiment'])


# @tool
def get_best_matches(input: dict):
    return find_best_matching_keywords(input["base_keyword"], input["trend_keywords"], input["ai_keywords"])


# LangGraph structure with streamlined steps
def trend_pipeline(input):
    original_keywords = input["original_keywords"]
    genre = input["genre"]
    emotion = input["emotion"]
    sentiment = input["sentiment"]

    all_trend_keywords = []
    for keyword in original_keywords:
        related = fetch_related_keywords(keyword)
        trends = fetch_trends_data(keyword)
        boosted = [item["date"] for item in trends if item["trend_value"] > 50] if trends else []
        all_trend_keywords.extend(related + boosted)

    ai_keywords = []
    for keyword in original_keywords:
        ai_keywords.extend(generate_ai_suggestions(keyword, genre, emotion, sentiment))

    ranked_keywords = []
    for keyword in original_keywords:
        matches = find_best_matching_keywords(keyword, all_trend_keywords, ai_keywords)
        ranked_keywords.extend(matches)

    # Remove duplicates and sort by similarity score
    unique_ranked = {kw['keyword']: kw for kw in ranked_keywords}
    sorted_keywords = sorted(unique_ranked.values(), key=lambda x: x['similarity_score'], reverse=True)
    top_keywords = [item["keyword"] for item in sorted_keywords[:5]]

    regenerated = regenerate_sentence(input, top_keywords)

    return {
        "input": input,
        "trend_data": trends,
        "ai_keywords": ai_keywords,
        "trend_keywords": all_trend_keywords,
        "ranked_keywords": sorted_keywords[:10],
        "regenerated_sentence": regenerated
    }

    # Fetch trend data
    # trend_keywords = fetch_related_keywords(keyword)
    # trend_data = fetch_trends_data(keyword)
    # trend_boost_keywords = [item["date"] for item in trend_data if item["trend_value"] > 50] if trend_data else []
    # trend_keywords += trend_boost_keywords

    # AI-powered keyword suggestions
    # ai_keywords = generate_ai_suggestions(keyword, genre, emotion, sentiment)

    # # Find best matching keywords using SBERT
    # ranked_keywords = find_best_matching_keywords(keyword, trend_keywords, ai_keywords)
    # top_keywords = [item["keyword"] for item in ranked_keywords[:5]]

    # regenerated = regenerate_sentence(input, top_keywords)

    # return {
    #     "input": input,
    #     "trend_data": trend_data,
    #     "ai_keywords": ai_keywords,
    #     "trend_keywords": trend_keywords,
    #     "ranked_keywords": ranked_keywords[:10],
    #     "regenerated_sentence": regenerated
    # }





# More robust error handling in regeneration
def regenerate_sentence(input_data, top_keywords):
    keyword_list = ", ".join(top_keywords)
    prompt = (
        f"Regenerate the following sentence using these trending keywords: {keyword_list}. "
        f"Ensure the new sentence conveys the same meaning as the original.\n\n"
        f"Original Sentence: '{input_data['original_sentence']}'\n"
        f"Genre: {input_data['genre']}, Emotion: {input_data['emotion']}, Sentiment: {input_data['sentiment']}"
        f"You are only required to return a  python list of regenerated sentences. Donot include any programming or markdown stuff and nothing else, just []"
    )

    try:
        model = load_llm()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Error] Sentence regeneration failed: {e}")
        return "[Failed to regenerate sentence]"





def wrap_related(state):
    keyword = state["original_keywords"]
    related = fetch_related_keywords(keyword)
    return {**state, "trend_keywords": related}

def wrap_trends(state):
    keywords = state["trend_keywords"]  # not original anymore
    trends = fetch_trends_data(keywords)

    # Filter trending keywords based on average trend value
    boosted = [
        item["keyword"]
        for item in trends
        if sum(item["interest_over_time"]) / len(item["interest_over_time"]) > 50
    ]

    return {**state, "trend_data": trends, "trend_keywords": boosted}


def wrap_ai_suggestions(state):
    keyword = state["original_keywords"]
    genre = state["genre"]
    emotion = state["emotion"]
    sentiment = state["sentiment"]
    ai_keywords = generate_ai_suggestions(keyword, genre, emotion, sentiment)
    return {**state, "ai_keywords": ai_keywords}

def wrap_similarity(state):
    base_keyword = state["original_keywords"]
    trend_keywords = state.get("trend_keywords", [])
    ai_keywords = state.get("ai_keywords", [])
    ranked = find_best_matching_keywords(base_keyword, trend_keywords, ai_keywords)
    top_keywords = [item["keyword"] for item in ranked[:5]]
    return {**state, "ranked_keywords": ranked[:10], "top_keywords": top_keywords}

def wrap_regeneration(state):
    regenerated = regenerate_sentence(state, state["top_keywords"])
    return {**state, "regenerated_sentence": regenerated}


# -- Build the LangGraph --

class TrendState(TypedDict):
    original_sentence: str
    original_keywords: List[str]
    genre: str
    emotion: str
    sentiment: str
    trend_keywords: Optional[List[str]]
    ai_keywords: Optional[List[str]]
    trend_data: Optional[List[dict]]
    ranked_keywords: Optional[List[dict]]
    top_keywords: Optional[List[str]]
    regenerated_sentence: Optional[str]



builder = StateGraph(TrendState)

# Step nodes
builder.add_node("fetch_related", RunnableLambda(wrap_related))
builder.add_node("fetch_trends", RunnableLambda(wrap_trends))
builder.add_node("generate_ai", RunnableLambda(wrap_ai_suggestions))
builder.add_node("match_keywords", RunnableLambda(wrap_similarity))
builder.add_node("regenerate", RunnableLambda(wrap_regeneration))

# Flow edges
builder.set_entry_point("fetch_related")
builder.add_edge("fetch_related", "fetch_trends")
builder.add_edge("fetch_trends", "generate_ai")
builder.add_edge("generate_ai", "match_keywords")
builder.add_edge("match_keywords", "regenerate")
builder.add_edge("regenerate", END)

# Compile graph
trend_graph = builder.compile()


# -- Process Multiple Keywords --

def process_sentence_with_keywords(original_sentence, original_keywords, genre, emotion, sentiment):
    user_input = {
        "original_sentence": original_sentence,
        "original_keywords": original_keywords,
        "genre": genre,
        "emotion": emotion,
        "sentiment": sentiment
    }

    result = trend_graph.invoke(user_input)
    return result


# if __name__ == "__main__":
#     user_input_keywords = "linkedin, software engineer, machine learning, neural networks"
#     genre = "media"
#     emotion = "sad"
#     sentiment = "negative"

#     results = process_multiple_keywords(user_input_keywords, genre, emotion, sentiment)

#     for idx, result in enumerate(results, 1):
#         print(f"\n✨ Regenerated Sentence for keyword {idx}:")
#         print(result.get("regenerated_sentence", "[No output generated]"))
# 
#         print("\n🔍 Top Keywords:")
#         for kw in result.get("top_keywords", []):
#             print(f" - {kw}")

#         print("\n🧠 Full Trace Available in LangSmith Dashboard (if configured).")