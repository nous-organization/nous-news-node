# Use official Python slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by PyTorch, Transformers, SentencePiece, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  git \
  wget \
  libglib2.0-0 \
  libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

# Install huggingface-cli and other necessary libraries
RUN pip install huggingface_hub transformers torch

# Copy pyproject.toml for dependency installation
COPY pyproject.toml .

# Copy source code
COPY src ./src

# Upgrade pip, setuptools, wheel
RUN python -m pip install --upgrade pip setuptools wheel

# Install dependencies and editable package so src.ai modules are importable
RUN pip install --no-cache-dir -e .

# Expose FastAPI port
EXPOSE 8000

# Run Python script to pre-download Hugging Face models (before starting FastAPI app)
RUN python -c "from src.ai.models import prefetch_models; prefetch_models()"

# Run FastAPI app using uvicorn
CMD ["uvicorn", "src.ai.app:app", "--host", "0.0.0.0", "--port", "8000"]
