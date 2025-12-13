README.md

Python AI Backend (python-ai)

Internal AI microservice for the Nous backend.

---

Table of Contents

- Features
- Getting Started
- Development
- Running Tests
- Docker
- Project Structure
- Dependencies
- API Endpoints

---

Features

- Article Analysis: Full pipeline for article sentiment, biases, philosophical insights, and summarization.
- Translation: Detect and translate text between languages.
- Tag Extraction: Extract relevant tags from text content.
- Normalization: Clean HTML, detect language, translate, summarize, and extract tags.
- Model Prefetching: Preload models on startup for fast inference.
- Extensible AI Services: Easily add new NLP pipelines or language models.

---

Getting Started

1. Clone the Repository
git clone <repo-url>
cd python-ai

2. Set Up Virtual Environment (Recommended)
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel

3. Install Dependencies
pip install -e .

4. Run the API
uvicorn src.ai.app:app --host 0.0.0.0 --port 8000

Visit: http://localhost:8000/docs to explore the Swagger/OpenAPI documentation.

---

Development

- Python >= 3.10
- Use the editable install (pip install -e .) to automatically pick up changes in src/ai.

---

Running Tests

We recommend using the provided `run_tests.sh` script, as it automatically sets `PYTHONPATH` and optionally activates a local virtual environment.

1. Using the run_tests.sh script (recommended)

# Make sure the script is executable
chmod +x scripts/run_tests.sh

# Run all tests
./scripts/run_tests.sh

This ensures all imports work correctly and simplifies test execution.

2. Using a local virtual environment

# Activate venv
python3 -m venv .venv
source .venv/bin/activate

# Install editable package
pip install -e .

# Run all tests
python -m pytest src/tests/ -v

# Run a specific test
python -m pytest src/tests/test_ai.py -k <test_name>

3. Using pipx-installed Python AI backend

If you installed python-ai via pipx:

# Ensure pipx binary path is in your PATH
pipx run python-ai python -m pytest src/tests/ -v

Note: With pipx, the package runs in an isolated environment. The editable install (-e .) is not used system-wide; `PYTHONPATH` must still point to `src/` for imports if you want to run tests manually.

---

Docker

Build the Docker image:
docker build -t python-ai .

Run the container:
docker run -p 8000:8000 python-ai

---

Project Structure

python-ai/
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── setup.py
├── src/
│   └── ai/
│       ├── app.py           # FastAPI entrypoint
│       ├── models.py        # Model loader / prefetch
│       ├── services/        # AI service modules
│       ├── prompts/         # Prompt templates for LLMs
│       ├── utils/           # Utility functions
│       └── constants/       # Static constants (e.g., languages)
└── tests/
    └── test_ai.py           # Unit tests

---

Dependencies

- fastapi – API framework
- uvicorn – ASGI server
- transformers – Hugging Face Transformers
- torch – PyTorch backend
- sentencepiece – Tokenizer support
- numpy – Numerical computations
- beautifulsoup4, lxml – HTML parsing
- pydantic – Data validation
- accelerate – Hugging Face model acceleration

---

API Endpoints

- /analyze – Full article analysis
- /sentiment – Sentiment analysis
- /political-bias – Detect political bias
- /cognitive-bias – Detect cognitive bias
- /antithesis – Generate antithesis
- /philosophical – Generate philosophical insight
- /summarize – Text summarization
- /detect-language – Language detection
- /translate – Translation
- /extract-tags – Tag extraction
- /normalize – Full normalization pipeline
- /prefetch – Trigger model prefetch

---

ARCHITECTURE.md

Python AI Backend Architecture

Overview

python-ai is a modular AI microservice built with FastAPI. It exposes REST endpoints for AI-driven NLP tasks. The architecture separates concerns into services, prompts, runners, and utility modules, making it scalable and maintainable.

---

Core Components

1. FastAPI App (app.py)
- Entry point of the microservice.
- Exposes all REST API endpoints.
- Uses Pydantic models for input validation (TextInput, ArticleInput, TranslationInput).
- Integrates AI services with HTTP routes.
- Uses a lifespan event handler to prefetch models on startup.

2. AI Services (services/)
Each AI service module implements a single responsibility:

- analyze_article.py – Full analysis pipeline for articles.
- sentiment.py – Sentiment analysis.
- political_bias.py – Political bias detection.
- cognitive_bias.py – Cognitive bias detection.
- antithesis.py – Generate antithesis for a given text.
- philosophical.py – Generate philosophical insight.
- summarization.py – Text summarization.
- translate.py – Language detection and translation.
- extract_tags.py – Extract tags and topics from text.
- normalize.py – Full pipeline combining multiple services.

Each service returns an AIResponse typed dictionary for standardized responses.

3. Prompts (prompts/)
- Stores templates for LLM-based services.
- Each module contains a single prompt template (e.g., sentiment_prompt.py).

4. Runners (runners/)
- Encapsulate low-level interaction with LLMs.
- Example: llm_json_runner.py runs LLM inference with structured JSON input/output.

5. Models (models.py)
- Loads and caches ML/NLP models (Hugging Face Transformers, DeBERTa, etc.).
- Provides prefetch_models() to load models during FastAPI startup for faster responses.

6. Utilities (utils/)
- Helper functions for tokenization, HTML cleaning, device management, and translation.

7. Constants (constants/)
- Static values such as language mappings used across the service.

---

Data Flow

1. Request arrives at FastAPI endpoint.
2. Pydantic validates and parses input.
3. Endpoint calls the appropriate service module.
4. Service module may:
   - Use a model runner
   - Fetch prompts
   - Call helper utilities
5. Service returns a standardized AIResponse object.
6. FastAPI returns JSON response to client.

---

Model Loading & Prefetching

- Models are loaded on first use.
- prefetch_models() is called at startup to ensure all models are available in memory.
- Hugging Face transformers pipelines are used with PyTorch backend.
- Supports accelerate for multi-device inference.

---

Testing

- Located in tests/ directory.
- Uses pytest.
- Tests validate service outputs, pipeline integration, and response structure.
- Example: test_ai.py contains unit tests for translation, sentiment, and article analysis.

---

Deployment

- Can run locally via uvicorn src.ai.app:app.
- Dockerized with system dependencies for PyTorch and Transformers.
- Exposes port 8000 for API requests.

---

Extensibility

- Add new AI services by creating modules in services/ and exposing via FastAPI routes.
- Add new LLM prompts in prompts/.
- Utilities and constants provide reusable support for new modules.
