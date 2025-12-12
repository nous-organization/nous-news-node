from fastapi import FastAPI
from pydantic import BaseModel

# Import AI functions
from src.ai.analyze_article import analyze_article
from src.ai.sentiment import analyze_sentiment
from src.ai.political_bias import detect_political_bias
from src.ai.cognitive_bias import detect_cognitive_bias
from src.ai.antithesis import generate_antithesis
from src.ai.philosophy import generate_philosophical_insight
from src.ai.summarization import summarize as summarize_text
from src.ai.tokenizer import tokenize_text
from src.ai.translate import detect_language, translate
from src.ai.models import prefetch_models


# ----------------------------------------------------------------------------
# FastAPI App
# ----------------------------------------------------------------------------

app = FastAPI(
    title="Nous AI Backend",
    version="0.1.0",
    description="Internal AI microservice for sentiment, bias, philosophy, summarization, and translation."
)


# ----------------------------------------------------------------------------
# Prefetch Models on Startup
# ----------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    print("🔥 Prefetching AI models...")
    try:
        prefetch_models()
        print("🔥 Model prefetch finished!")
    except Exception as e:
        print("⚠️ Prefetch failed:", e)


# ----------------------------------------------------------------------------
# Request Models
# ----------------------------------------------------------------------------

class ArticleInput(BaseModel):
    id: str | None = None
    content: str


class TextInput(BaseModel):
    text: str


class TranslationInput(BaseModel):
    text: str
    target_language: str


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------

@app.post("/analyze")
def route_analyze(payload: ArticleInput):
    return analyze_article(payload.model_dump())


@app.post("/sentiment")
def route_sentiment(payload: TextInput):
    return analyze_sentiment(payload.text)


@app.post("/political_bias")
def route_political_bias(payload: TextInput):
    return detect_political_bias(payload.text)


@app.post("/cognitive_bias")
def route_cognitive_bias(payload: TextInput):
    return detect_cognitive_bias(payload.text)


@app.post("/antithesis")
def route_antithesis(payload: TextInput):
    return generate_antithesis(payload.text)


@app.post("/philosophy")
def route_philosophy(payload: TextInput):
    return generate_philosophical_insight(payload.text)


@app.post("/summarize")
def route_summarize(payload: TextInput):
    return summarize_text(payload.text)


@app.post("/tokenize")
def route_tokenize(payload: TextInput):
    return tokenize_text(payload.text)


@app.post("/detect_language")
def route_detect_language(payload: TextInput):
    return {"language": detect_language(payload.text)}


@app.post("/translate")
def route_translate(payload: TranslationInput):
    return translate(
        text=payload.text,
        target_language=payload.target_language
    )


@app.post("/prefetch")
def route_prefetch():
    """Manual trigger to re-run model downloads."""
    prefetch_models()
    return {"status": "ok", "message": "Model prefetch triggered."}
