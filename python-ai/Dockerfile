FROM python:3.12-slim

WORKDIR /app

# Basic deps required by PyTorch, Transformers, SentencePiece, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  git \
  wget \
  libglib2.0-0 \
  libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
