# models.py
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from .config import MODEL_DIR
from .model_registry import MODELS
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
# Caches - These persist across module imports
# ---------------------------------------------------------------------
_PIPELINE_CACHE: Dict[str, Any] = {}
_MANUAL_MODEL_CACHE: Dict[str, Any] = {}

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def get_pipeline(task: str, model_key: str):
    """
    Retrieve a pipeline or manual model bundle for a given task and model key.
    Uses aggressive caching to avoid reloading models.
    
    Args:
        task (str): The task for the model (e.g., "text-classification").
        model_key (str): The key for the model in the registry.
        
    Returns:
        Pipeline or Model Bundle: The loaded pipeline or model bundle.
        
    Raises:
        ValueError: If the model_key is unknown.
    """
    spec = MODELS.get(model_key)
    if spec is None:
        raise ValueError(f"Unknown model key: {model_key}")

    if spec.get("pipeline", True):
        return _load_pipeline(model_key, spec)

    return _load_manual_model(model_key, spec)


def clear_model_cache(model_key: Optional[str] = None):
    """
    Clear cached models from memory.
    
    Args:
        model_key: If provided, only clear this specific model.
                   If None, clear all cached models.
    """
    global _PIPELINE_CACHE, _MANUAL_MODEL_CACHE
    
    if model_key:
        # Clear specific model
        cache_keys_to_remove = [k for k in _PIPELINE_CACHE if model_key in k]
        for key in cache_keys_to_remove:
            del _PIPELINE_CACHE[key]
        
        if model_key in _MANUAL_MODEL_CACHE:
            del _MANUAL_MODEL_CACHE[model_key]
        
        logger.info(f"Cleared cache for model: {model_key}")
    else:
        # Clear all
        _PIPELINE_CACHE.clear()
        _MANUAL_MODEL_CACHE.clear()
        logger.info("Cleared all model caches")
    
    # Force garbage collection
    import gc
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ---------------------------------------------------------------------
# Pipeline Loader
# ---------------------------------------------------------------------
def _load_pipeline(model_key: str, spec: Dict[str, Any]):
    """
    Load a Hugging Face pipeline for a given model key.
    Implements aggressive caching to avoid reloading.
    """
    cache_key = f"{spec['task']}:{model_key}"
    
    # Return cached pipeline if available
    if cache_key in _PIPELINE_CACHE:
        logger.debug(f"[models] Using cached pipeline for {model_key}")
        return _PIPELINE_CACHE[cache_key]

    model_path = Path(spec.get("local_path") or spec["hf_id"])
    logger.info(f"[models] Loading pipeline → {model_path}")

    device_map = None
    dtype = torch.float32
    
    # Use mixed precision on GPU
    if DEVICE.type in ["cuda", "mps"]:
        device_map = "auto"
        dtype = torch.float16

    # Ensure model exists locally
    if not model_path.exists() and "hf_id" in spec:
        logger.warning(f"[models] Model not found locally, downloading from HF → {spec['hf_id']}")
        snapshot_download(repo_id=spec["hf_id"], local_dir=str(model_path))

    try:
        # Common pipeline kwargs
        pipeline_kwargs = {
            "task": spec["task"],
            "model": str(model_path),
            "tokenizer": str(model_path),
            "device_map": device_map,
            "torch_dtype": dtype,
            "cache_dir": str(MODEL_DIR),
            "local_files_only": True,  # Force local loading
        }
        
        # Handle Mistral-specific model loading logic
        if model_key == "mistral-7b-instruct":
            pipeline_kwargs["task"] = "text-generation"
            # Note: fix_mistral_regex is not a pipeline parameter
            # It needs to be set when loading the tokenizer separately
        
        pipe = pipeline(**pipeline_kwargs)
        
        # Cache the pipeline for future use
        _PIPELINE_CACHE[cache_key] = pipe
        logger.info(f"[models] ✓ Loaded and cached pipeline for {model_key}")
        
        return pipe
        
    except Exception as e:
        logger.error(f"Error loading pipeline for {model_key}: {e}")
        raise


# ---------------------------------------------------------------------
# Manual Model Loader
# ---------------------------------------------------------------------
def _load_manual_model(model_key: str, spec: Dict[str, Any]):
    """
    Load a manual model (non-pipeline) from local path.
    Implements aggressive caching to avoid reloading.
    """
    # Return cached model if available
    if model_key in _MANUAL_MODEL_CACHE:
        logger.debug(f"[models] Using cached model for {model_key}")
        return _MANUAL_MODEL_CACHE[model_key]
    
    task = spec["task"]
    model_path = Path(spec.get("local_path") or spec["hf_id"])

    # Determine the model class
    if task == "text-classification":
        model_class = AutoModelForSequenceClassification
    elif task == "text-generation":
        model_class = AutoModelForCausalLM
    elif task == "token-classification":
        model_class = AutoModelForTokenClassification
    else:
        raise ValueError(f"Unsupported task type: {task}")

    # Ensure model exists locally
    if not model_path.exists() and "hf_id" in spec:
        logger.warning(f"[models] Model not found locally, downloading from HF → {spec['hf_id']}")
        snapshot_download(repo_id=spec["hf_id"], local_dir=str(model_path))

    logger.info(f"[models] Loading manual model → {model_path}")

    # Load tokenizer with special handling for specific models
    tokenizer_kwargs = {"local_files_only": True}
    if model_key == "political-leaning":
        tokenizer_kwargs["fix_mistral_regex"] = True
    
    tokenizer = AutoTokenizer.from_pretrained(model_path, **tokenizer_kwargs)
    
    # Load model with optimizations
    model_kwargs = {"local_files_only": True}
    if DEVICE.type in ["cuda", "mps"]:
        model_kwargs["torch_dtype"] = torch.float16
    
    model = model_class.from_pretrained(model_path, **model_kwargs)
    model.to(DEVICE)
    model.eval()

    bundle = {"model": model, "tokenizer": tokenizer, "task": task}
    
    # Cache the model bundle for future use
    _MANUAL_MODEL_CACHE[model_key] = bundle
    logger.info(f"[models] ✓ Loaded and cached model for {model_key}")
    
    return bundle