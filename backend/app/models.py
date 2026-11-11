from pydantic import BaseModel
from typing import Optional

# TrendText Model
class TrendText(BaseModel):
    text: str
    trendingText: Optional[str] = None
    score_aggregate: Optional[float] = None


# Keyword Model
class Keyword(BaseModel):
    keyword: str

# TrendText-Keyword Link Model
class TrendTextKeywordLink(BaseModel):
    trendtext_id: str
    keyword_id: str
    genre: Optional[str] = None
    sentiment: Optional[str] = None
    emotion: Optional[str] = None
    score: Optional[float] = None
