import os
import logging
from pathlib import Path
from typing import Dict, Any
from .config import MODEL_DIR
from huggingface_hub import snapshot_download

import torch
from transformers import (
    pipeline,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForTokenClassification,
)

from .utils.device import get_device
from .utils.tokenizer import get_tokenizer

# ---------------------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
    logger.addHandler(handler)

# ---------------------------------------------------------------------
# Device Setup
# ---------------------------------------------------------------------
DEVICE = get_device()
logger.info(f"[models] Using device: {DEVICE}")

# ---------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------
# The registry of models, their tasks, and the model classes to be used.
MODELS: Dict[str, Dict[str, Any]] = {
    "distilbert-sst2": {
        "hf_id": "distilbert/distilbert-base-uncased-finetuned-sst-2-english",  # Hugging Face Model ID
        "task": "text-classification",
        "pipeline": False,
        "model_class": "modelForSequenceClassification",  # Correct model class for PyTorch Hub
    },
    "bert-ner": {
        "hf_id": "dslim/bert-base-NER",  # Hugging Face Model ID
        "task": "token-classification",
        "pipeline": False,
        "model_class": "modelForTokenClassification",  # Correct model class for PyTorch Hub
    },
    "gpt2": {
        "hf_id": "gpt2",  # Hugging Face Model ID
        "task": "text-generation",
        "pipeline": False,
        "model_class": "modelForCausalLM",  # Correct model class for PyTorch Hub
    },
    "political-leaning": {
        "hf_id": "matous-volf/political-leaning-deberta-large",
        "task": "text-classification",
        "pipeline": False,
        "model_class": "modelForSequenceClassification",
        "labels": ["left", "center", "right"],
    },
    "mistral-7b-instruct": {
        "hf_id": "mistralai/Mistral-7B-Instruct-v0.2",  # UpdatPed model ID for simplicity
        "task": "text-generation",
        "pipeline": False,
        "model_class": "modelForCausalLM",  # Correct model class for PyTorch Hub
    }
}

# ---------------------------------------------------------------------
# Caches
# ---------------------------------------------------------------------
# Caches for storing loaded pipelines and models to avoid re-loading
_PIPELINE_CACHE: Dict[str, Any] = {}
_MANUAL_MODEL_CACHE: Dict[str, Any] = {}

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def get_pipeline(task: str, model_key: str):
    """
    Retrieve a pipeline or manual model bundle for a given task and model key.
    
    Args:
        task (str): The task for the model (e.g., "text-classification").
        model_key (str): The key for the model in the registry.
        
    Returns:
        Pipeline or Model Bundle: The loaded pipeline or model bundle (depending on the task).
        
    Raises:
        ValueError: If the model_key is unknown or not registered.
    """
    spec = MODELS.get(model_key)
    if spec is None:
        raise ValueError(f"Unknown model key: {model_key}")

    if spec.get("pipeline", True):
        return _load_pipeline(model_key, spec)

    return _load_manual_model(model_key, spec)

# ---------------------------------------------------------------------
# Pipeline Loader
# ---------------------------------------------------------------------
def _load_pipeline(model_key: str, spec: Dict[str, Any]):
    """
    Loads the model pipeline for a given task.
    
    Args:
        model_key (str): The key for the model in the registry.
        spec (dict): The model specifications including task, model class, and other properties.
        
    Returns:
        Pipeline: The model pipeline for the specified task.
        
    Raises:
        Exception: If the pipeline cannot be loaded.
    """
    cache_key = f"{spec['task']}:{model_key}"
    if cache_key in _PIPELINE_CACHE:
        return _PIPELINE_CACHE[cache_key]

    logger.info(f"[models] Loading pipeline → {spec['hf_id']}")

    device_map = None
    dtype = torch.float32

    if DEVICE.type == "cuda":
        device_map = "auto"
        dtype = torch.float16
    elif DEVICE.type == "mps":
        device_map = "auto"
        dtype = torch.float16

    try:
        pipe = pipeline(
            task=spec["task"],
            model=spec["hf_id"],
            tokenizer=spec["hf_id"],
            device_map=device_map,
            dtype=dtype,
            cache_dir=str(MODEL_DIR),  # Cache directory updated here
        )
        _PIPELINE_CACHE[cache_key] = pipe
        return pipe
    except Exception as e:
        logger.error(f"Error loading pipeline for {model_key}: {e}")
        raise

# ---------------------------------------------------------------------
# Manual Model Loader
# ---------------------------------------------------------------------
def _load_manual_model(model_key: str, spec: Dict[str, Any]):
    hf_id = spec["hf_id"]
    task = spec["task"]

    if task == "text-classification":
        model_class = AutoModelForSequenceClassification
    elif task == "text-generation":
        model_class = AutoModelForCausalLM
    elif task == "token-classification":
        model_class = AutoModelForTokenClassification
    else:
        raise ValueError(f"Unsupported task type: {task}")

    local_model_path = Path(MODEL_DIR) / model_key

    # Prefetch using snapshot_download if missing
    if not local_model_path.exists():
        logger.warning(f"Model not found locally at {local_model_path}. Downloading...")
        snapshot_download(repo_id=hf_id, local_dir=str(local_model_path))

    logger.info(f"Loading model from local path: {local_model_path}")
    # Always load from local_model_path after prefetch
    tokenizer = AutoTokenizer.from_pretrained(local_model_path)
    model = model_class.from_pretrained(local_model_path)
    model.eval()


    bundle = {
        "model": model,
        "tokenizer": tokenizer,
        "task": task,
    }

    _MANUAL_MODEL_CACHE[model_key] = bundle
    return bundle

