"""
Model registry and pipeline cache for Nous backend.

Responsibilities:
- Device selection
- Hugging Face pipeline loading
- Manual model loading (LLMs or broken pipelines)
- Centralized model registry
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any
from .config import MODEL_DIR

import torch
from transformers import (
    pipeline,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
)

from .utils.device import get_device
from .utils.tokenizer import get_tokenizer

# ---------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
    logger.addHandler(handler)

# ---------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------
DEVICE = get_device()
logger.info(f"[models] Using device: {DEVICE}")

# ---------------------------------------------------------------------
# Model registry
# ---------------------------------------------------------------------
MODELS: Dict[str, Dict[str, Any]] = {
    "distilbert-sst2": {
        "hf_id": "distilbert-base-uncased-finetuned-sst-2-english",
        "task": "text-classification",
        "pipeline": True,
    },
    "bert-ner": {
        "hf_id": "dslim/bert-base-NER",
        "task": "token-classification",
        "pipeline": True,
    },
    "gpt2": {
        "hf_id": "gpt2",
        "task": "text-generation",
        "pipeline": True,
    },
    "political-leaning": {
        "hf_id": "matous-volf/political-leaning-deberta-large",
        "task": "text-classification",
        "pipeline": False,
        "model_class": AutoModelForSequenceClassification,
        "labels": ["left", "center", "right"],
    },
    "mistral-7b-instruct": {
        "hf_id": "mistralai/Mistral-7B-Instruct-v0.2",
        "task": "text-generation",
        "pipeline": False,
        "model_class": AutoModelForCausalLM,
    },
}

# ---------------------------------------------------------------------
# Caches
# ---------------------------------------------------------------------
_PIPELINE_CACHE: Dict[str, Any] = {}
_MANUAL_MODEL_CACHE: Dict[str, Any] = {}

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def get_pipeline(task: str, model_key: str):
    """
    Retrieve a pipeline or manual model bundle for a given task + model key.
    """
    spec = MODELS.get(model_key)
    if spec is None:
        raise ValueError(f"Unknown model key: {model_key}")

    if spec.get("pipeline", True):
        return _load_pipeline(model_key, spec)

    return _load_manual_model(model_key, spec)

# ---------------------------------------------------------------------
# Pipeline loader
# ---------------------------------------------------------------------
def _load_pipeline(model_key: str, spec: Dict[str, Any]):
    cache_key = f"{spec['task']}:{model_key}"
    if cache_key in _PIPELINE_CACHE:
        return _PIPELINE_CACHE[cache_key]

    logger.info(f"[models] Loading pipeline → {spec['hf_id']}")

    device_opt = -1
    device_map = None
    dtype = torch.float32

    if DEVICE.type == "cuda":
        device_opt = 0
        dtype = torch.float16
    elif DEVICE.type == "mps":
        device_map = "auto"
        dtype = torch.float16

    pipe = pipeline(
        task=spec["task"],
        model=spec["hf_id"],
        tokenizer=spec["hf_id"],
        device=device_opt,
        device_map=device_map,
        torch_dtype=dtype,
        cache_dir=str(MODEL_DIR),
    )

    _PIPELINE_CACHE[cache_key] = pipe
    return pipe

# ---------------------------------------------------------------------
# Manual / LLM loader
# ---------------------------------------------------------------------
def _load_manual_model(model_key: str, spec: Dict[str, Any]):
    if model_key in _MANUAL_MODEL_CACHE:
        return _MANUAL_MODEL_CACHE[model_key]

    # For local-only loading, override hf_id with absolute path if Mistral
    hf_id = spec["hf_id"]
    if model_key == "mistral-7b-instruct":
        hf_id = "/absolute/path/to/local/mistral-7b-instruct"  # <- set absolute path
        local_files_only = True
    else:
        local_files_only = False

    model_class = spec["model_class"]

    logger.info(f"[models] Loading manual model → {hf_id}")

    # Load tokenizer
    tokenizer = get_tokenizer(hf_id, local_files_only=local_files_only)

    # Load model
    model = model_class.from_pretrained(
        hf_id,
        cache_dir=str(MODEL_DIR),
        torch_dtype=torch.float16 if DEVICE.type != "cpu" else torch.float32,
        device_map="auto" if DEVICE.type != "cpu" else None,
        local_files_only=local_files_only,
    )
    model.eval()

    # If text-generation, wrap a generate helper
    if spec["task"] == "text-generation":

        def generate(
            prompt: str,
            max_new_tokens: int = 256,
            temperature: float = 0.7,
            do_sample: bool = True,
        ) -> str:
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            with torch.no_grad():
                output = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=do_sample,
                    pad_token_id=tokenizer.eos_token_id,
                )
            return tokenizer.decode(output[0], skip_special_tokens=True)

        bundle = {
            "model": model,
            "tokenizer": tokenizer,
            "generate": generate,
            "task": spec["task"],
        }
    else:
        bundle = {
            "model": model,
            "tokenizer": tokenizer,
            "labels": spec.get("labels"),
            "task": spec["task"],
        }

    _MANUAL_MODEL_CACHE[model_key] = bundle
    return bundle
