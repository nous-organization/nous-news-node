from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

# ---------------------------------------------------------------------
# Public AI service imports (STABLE API)
# ---------------------------------------------------------------------
from src.ai.services.analyze_article import analyze_article
from src.ai.services.sentiment import analyze_sentiment
from src.ai.services.political_bias import detect_political_bias
from src.ai.services.cognitive_bias import detect_cognitive_bias
from src.ai.services.antithesis import generate_antithesis
from src.ai.services.philosophical import generate_philosophical_insight
from src.ai.services.summarization import summarize
from src.ai.services.translate import detect_language, translate
from src.ai.services.extract_tags import extract_tags
from src.ai.services.normalize import normalize_and_translate_article

# Infrastructure
from src.ai.models import prefetch_models


# ---------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------
app = FastAPI(
    title="Nous AI Backend",
    version="0.1.0",
    description=(
        "Internal AI microservice for sentiment, bias detection "
        "(cognitive & political), philosophical insights, "
        "summarization, translation, and tagging."
    ),
)


# ---------------------------------------------------------------------
# Startup: Prefetch Models
# ---------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    print("🔥 Prefetching AI models...")
    try:
        prefetch_models()
        print("🔥 Model prefetch finished!")
    except Exception as e:
        print("⚠️ Prefetch failed:", e)


# ---------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------
class ArticleInput(BaseModel):
    id: Optional[str] = None
    content: str


class TextInput(BaseModel):
    text: str


class TranslationInput(BaseModel):
    text: str
    target_language: str


# ---------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------
@app.post("/analyze")
def route_analyze(payload: ArticleInput):
    """
    Full article analysis pipeline.
    """
    return analyze_article(payload.model_dump())


@app.post("/sentiment")
def route_sentiment(payload: TextInput):
    return analyze_sentiment(payload.text)


@app.post("/political-bias")
def route_political_bias(payload: TextInput):
    return detect_political_bias(payload.text)


@app.post("/cognitive-bias")
def route_cognitive_bias(payload: TextInput):
    return detect_cognitive_bias(payload.text)


@app.post("/antithesis")
def route_antithesis(payload: TextInput):
    return generate_antithesis(payload.text)


@app.post("/philosophical")
def route_philosophy(payload: TextInput):
    return generate_philosophical_insight(payload.text)


@app.post("/summarize")
def route_summarize(payload: TextInput):
    return summarize(payload.text)


@app.post("/detect-language")
def route_detect_language(payload: TextInput):
    """
    Detect language of input text.
    Returns an AIResponse.
    """
    return detect_language(payload.text)


@app.post("/translate")
def route_translate(payload: TranslationInput):
    return translate(
        content=payload.text,
        target_language=payload.target_language,
    )


@app.post("/extract-tags")
def route_extract_tags(payload: TextInput):
    return extract_tags(payload.text)


@app.post("/normalize")
def route_normalize(payload: ArticleInput):
    """
    Full normalization pipeline:
    - HTML cleaning
    - language detection
    - translation (optional)
    - summarization
    - tag extraction
    """
    return normalize_and_translate_article(
        raw_html=payload.content,
        target_language="en",
    )


@app.post("/prefetch")
def route_prefetch():
    prefetch_models()
    return {
        "status": "ok",
        "message": "Model prefetch triggered.",
    }
