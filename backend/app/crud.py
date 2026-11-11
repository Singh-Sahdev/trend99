from firebase import db
from models import TrendText, Keyword, TrendTextKeywordLink

# ---------- TRENDTEXT CRUD ----------
def create_trendtext(trendtext: TrendText):
    doc_ref = db.collection('trendtexts').document()
    doc_ref.set(trendtext.model_dump())
    return doc_ref.id

def get_trendtext(trendtext_id: str):
    doc = db.collection('trendtexts').document(trendtext_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def update_trendtext(trendtext_id: str, trendtext: TrendText):
    db.collection('trendtexts').document(trendtext_id).update(trendtext.model_dump(exclude_unset=True))

def delete_trendtext(trendtext_id: str):
    db.collection('trendtexts').document(trendtext_id).delete()

# ---------- KEYWORD CRUD ----------
def create_keyword(keyword: Keyword):
    doc_ref = db.collection('keywords').document()
    doc_ref.set(keyword.model_dump())
    return doc_ref.id

def get_keyword(keyword_id: str):
    doc = db.collection('keywords').document(keyword_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def update_keyword(keyword_id: str, keyword: Keyword):
    db.collection('keywords').document(keyword_id).update(keyword.model_dump(exclude_unset=True))

def delete_keyword(keyword_id: str):
    db.collection('keywords').document(keyword_id).delete()

# ---------- TREND-TEXT-KEYWORD LINK CRUD ----------
def create_trendtext_keyword_link(link: TrendTextKeywordLink):
    doc_ref = db.collection('trendtext_keyword_links').document()
    doc_ref.set(link.model_dump())
    return doc_ref.id

def get_trendtext_keyword_link(link_id: str):
    doc = db.collection('trendtext_keyword_links').document(link_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def update_trendtext_keyword_link(link_id: str, link: TrendTextKeywordLink):
    db.collection('trendtext_keyword_links').document(link_id).update(link.model_dump(exclude_unset=True))

def delete_trendtext_keyword_link(link_id: str):
    db.collection('trendtext_keyword_links').document(link_id).delete()
