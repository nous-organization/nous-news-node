# Python-AI Architecture

## Overview

`python-ai` is an internal AI microservice for the Nous backend. It provides modular services for:

- Article analysis
- Sentiment detection
- Cognitive & political bias detection
- Philosophical insight generation
- Summarization
- Translation & language detection
- Tag extraction
- Full article normalization

The system is built with **FastAPI** for the API layer, **Pydantic** for request validation, and **Hugging Face Transformers** / **PyTorch** for AI model inference. The architecture emphasizes modularity and ease of adding new AI services.

---

## Project Layout

```
python-ai/
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── setup.py
├── scripts/
│   └── run_tests.sh
└── src/
    ├── ai/
    │   ├── __init__.py
    │   ├── app.py               # FastAPI application entrypoint
    │   ├── config.py            # Global configuration for AI services
    │   ├── constants/           # Language constants, enumerations
    │   ├── models.py            # Model prefetching, loading, and caching
    │   ├── prompts/             # Prompt templates for various AI tasks
    │   ├── runners/             # Helpers to execute AI inference pipelines
    │   ├── services/            # Individual AI service implementations
    │   ├── types.py             # TypedDicts and shared type definitions
    │   └── utils/               # Helper functions (HTML cleaning, tokenization, etc.)
    └── tests/
        └── test_ai.py           # Pytest tests for AI services
```

---

## Component Breakdown

### 1. **FastAPI App (`app.py`)**
- Defines all public API routes under `/analyze`, `/sentiment`, `/translate`, etc.
- Uses **Pydantic models** for request validation.
- Uses a **lifespan event handler** to prefetch models on startup.
- Decouples request handling from AI logic (services are imported from `services/`).

### 2. **AI Services (`services/`)**
Each file implements a specific AI service:

- `analyze_article.py` – Full article analysis pipeline.
- `sentiment.py` – Sentiment detection (distilbert-sst2 model).
- `political_bias.py` – Political leaning detection.
- `cognitive_bias.py` – Cognitive bias identification.
- `philosophical.py` – Generate philosophical insights.
- `antithesis.py` – Generate antithesis of input text.
- `summarization.py` – Summarizes input text.
- `translate.py` – Detects language and translates text.
- `extract_tags.py` – Extracts keywords and tags from text.
- `normalize.py` – Full normalization pipeline (HTML cleaning, translation, summarization, tagging).

Services typically return a shared **`AIResponse` typed dict** defined in `types.py`.

### 3. **Models (`models.py`)**
- Centralized model loading and caching logic.
- Prefetches models at startup to reduce inference latency.
- Supports loading Hugging Face pipelines with `transformers` and `accelerate`.
- Includes helper functions for device management (`cpu`, `cuda`) and tokenizer initialization.

### 4. **Prompts (`prompts/`)**
- Contains prompt templates for AI models (LLMs, classification models, and translation pipelines).
- Allows for easy modification and experimentation without touching service logic.
- Examples: `sentiment_prompt.py`, `translation_prompt.py`, `philosophical_prompt.py`.

### 5. **Runners (`runners/`)**
- Provides helper classes to run LLM pipelines and manage tokenization, truncation, and model output.
- Example: `llm_json_runner.py` handles structured JSON output from LLMs.

### 6. **Utils (`utils/`)**
- Helpers for preprocessing and postprocessing tasks:
  - `clean_html.py` – Strips and normalizes HTML content.
  - `device.py` – Device selection for PyTorch/Transformers.
  - `tokenizer.py` – Tokenization helpers for various NLP pipelines.
  - `translation.py` – Translation-specific utilities.

### 7. **Constants (`constants/`)**
- Enumerations for languages, default configurations, and other static values.
- Example: `languages.py` defines ISO codes and mapping for translation pipelines.

### 8. **Types (`types.py`)**
- Shared TypedDicts for consistent service responses.
- Defines `AIResponse` and other structured types for API responses.

---

## Dependency Management

- Uses **pyproject.toml** with `setuptools` build backend.
- Dependencies include:
  - FastAPI
  - Pydantic
  - PyTorch
  - Transformers
  - HuggingFace Hub
  - SentencePiece
  - Accelerate
  - BeautifulSoup4 / lxml / protobuf
- Optional dev dependencies:
  - Pytest
  - Pytest-asyncio

---

## Docker Setup

- Base image: `python:3.12-slim`
- Installs system libraries required for PyTorch and Transformers:
  - `build-essential`, `git`, `wget`, `libglib2.0-0`, `libsndfile1`
- Installs Python dependencies via editable install (`pip install -e .`)
- Exposes port `8000` for FastAPI.
- Entrypoint: `uvicorn src.ai.app:app --host 0.0.0.0 --port 8000`

---

## Testing

- Tests live under `src/tests/test_ai.py`.
- Can be run with pytest in project root:

```bash
pytest -k test_translation_noop_same_language
```

- Test helpers use the same AI services and TypedDicts to validate functionality.

---

## Lifespan & Startup

- Uses FastAPI **lifespan handler** (modern replacement for `on_event`) to prefetch all AI models at startup.
- Reduces latency for first requests.
- Handles exceptions in prefetch gracefully.

---

## Key Design Principles

1. **Modularity** – Each AI service is self-contained and imported into the FastAPI app.
2. **Reusability** – Prompt templates and runners can be reused across services.
3. **Performance** – Models are prefetched and cached to minimize first-request latency.
4. **Extensibility** – New AI pipelines or models can be added without modifying core FastAPI routes.
5. **Typed Responses** – `AIResponse` ensures consistent API output and reduces runtime errors.
6. **Clean Separation** – Utilities, constants, and types are separated from service logic.

---

## Future Considerations

- Add async support for AI pipelines to handle high concurrency.
- Introduce a centralized logging and metrics system.
- Support multi-GPU and distributed inference for heavy models.
- Add Swagger/OpenAPI documentation for all endpoints.
- Implement request/response validation and rate limiting.
