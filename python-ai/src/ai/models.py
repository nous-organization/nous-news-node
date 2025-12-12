"""
Model prefetch + pipeline cache for Nous Python backend.
Uses shared get_device() helper for CUDA / MPS / CPU.
"""

import os
from pathlib import Path
import torch
from transformers import pipeline

# -----------------------------------------------------
# Import device detection helper
# -----------------------------------------------------
from .utils.device import get_device

DEVICE = get_device()
DEVICE_NAME = str(DEVICE)

print(f"[models] Using device: {DEVICE_NAME}")


# -----------------------------------------------------
# Model registry + cache directory
# -----------------------------------------------------
MODEL_DIR = Path(os.environ.get("MODELS_PATH", ".models")).resolve()
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODELS = {
    "distilbert-sst2": "distilbert-base-uncased-finetuned-sst-2-english",
    "bert-ner": "dslim/bert-base-NER",
    "gpt2": "gpt2",
    # "distilbart-cnn": "sshleifer/distilbart-cnn-6-6",
    # "mbart-translate": "facebook/mbart-large-50-many-to-many-mmt",
    # "minilm-embed": "sentence-transformers/all-MiniLM-L6-v2",
}


# -----------------------------------------------------
# Pipeline + tokenizer cache
# -----------------------------------------------------
_PIPELINE_CACHE = {}
_TOKENIZER_CACHE = {}


# -----------------------------------------------------
# Pipeline loader using GPU/MPS/CPU via helper
# -----------------------------------------------------
def get_pipeline(task: str, model_key: str):
    cache_key = f"{task}:{model_key}"

    if cache_key in _PIPELINE_CACHE:
        return _PIPELINE_CACHE[cache_key]

    model_name = MODELS.get(model_key, model_key)

    print(f"[models] Loading pipeline: {task} → {model_name} on {DEVICE_NAME}")

    # Determine pipeline device options
    if DEVICE.type == "cuda":
        device_opt = 0
        device_map = None
        torch_dtype = torch.float16
    elif DEVICE.type == "mps":
        # HF pipeline does not support "device" index for MPS
        device_opt = -1
        device_map = "auto"
        torch_dtype = torch.float16
    else:
        device_opt = -1
        device_map = None
        torch_dtype = torch.float32

    pipe = pipeline(
        task,
        model=model_name,
        tokenizer=model_name,
        cache_dir=str(MODEL_DIR),
        device=device_opt,
        device_map=device_map,
        torch_dtype=torch_dtype,
    )

    _PIPELINE_CACHE[cache_key] = pipe
    return pipe


# -----------------------------------------------------
# Prefetch all models
# -----------------------------------------------------
def prefetch_models():
    print("[models] Prefetching all models…")

    for key, model_name in MODELS.items():
        print(f"→ Checking {key} ({model_name})")

        if "sst2" in key:
            task = "text-classification"
        elif "ner" in key:
            task = "token-classification"
        elif key == "gpt2":
            task = "text-generation"
        else:
            task = "feature-extraction"

        try:
            get_pipeline(task, key)
            print(f"✓ Prefetched {key}")
        except Exception as e:
            print(f"✗ Failed to prefetch {key}: {e}")

    print("[models] Prefetch complete.")


# -----------------------------------------------------
# Auto-prefetch
# -----------------------------------------------------
AUTO_PREFETCH = os.environ.get("PREFETCH_MODELS", "false").lower() == "true"

if AUTO_PREFETCH:
    try:
        prefetch_models()
    except Exception as e:
        print("[models] Prefetch failed:", e)
