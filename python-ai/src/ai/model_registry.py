"""
Model Registry

Central registry for all ML models used across the application.
Defines model specifications including HF IDs, local paths, and tasks.
"""

from pathlib import Path
from typing import Dict, Any
from .config import MODEL_DIR

# ---------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------
# Each model has:
# - hf_id: Hugging Face repo ID (used for prefetching)
# - task: task type for transformers (text-classification, text-generation, token-classification)
# - pipeline: whether to load as a Hugging Face pipeline
# - local_path: path to local model for loading instead of HF repo
# ---------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------
MODELS: Dict[str, Dict[str, Any]] = {
    "distilbert-sst2": {
        "hf_id": "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
        "task": "text-classification",
        "pipeline": False,
        "local_path": str(MODEL_DIR / "distilbert-sst2"),
    },
    "bert-ner": {
        "hf_id": "dslim/bert-base-NER",
        "task": "token-classification",
        "pipeline": False,
        "local_path": str(MODEL_DIR / "bert-ner"),
    },
    "gpt2": {
        "hf_id": "gpt2",
        "task": "text-generation",
        "pipeline": False,
        "local_path": str(MODEL_DIR / "gpt2"),
    },
    "political-leaning": {
        "hf_id": "matous-volf/political-leaning-deberta-large",
        "task": "text-classification",
        "pipeline": False,
        "labels": ["left", "center", "right"],
        "local_path": str(MODEL_DIR / "political-leaning"),
    },
    "mistral-7b-instruct": {
        "hf_id": "mistralai/Mistral-7B-Instruct-v0.2",
        "task": "text-generation",
        "pipeline": True,
        "local_path": str(MODEL_DIR / "mistral-7b-instruct"),
    },
    "mistral-3b-instruct": {
        "hf_id": "mistralai/Ministral-3-3B-Instruct-2512",
        "task": "text-generation",
        "pipeline": True,
        "local_path": str(MODEL_DIR / "mistral-3b-instruct"),
    },
    "ministral-8b-instruct": {
        "hf_id": "mistralai/Ministral-8B-Instruct-2410",
        "task": "text-generation",
        "pipeline": True,
        "local_path": str(MODEL_DIR / "ministral-8b-instruct"),
    },
}


def get_model_path(model_key: str) -> str:
    """
    Get the local path for a model by its key.

    Args:
        model_key: The model key from the registry

    Returns:
        The local path as a string

    Raises:
        ValueError: If the model_key is not in the registry
    """
    if model_key not in MODELS:
        raise ValueError(f"Unknown model key: {model_key}")

    return MODELS[model_key]["local_path"]


def get_model_spec(model_key: str) -> Dict[str, Any]:
    """
    Get the full specification for a model by its key.

    Args:
        model_key: The model key from the registry

    Returns:
        The model specification dictionary

    Raises:
        ValueError: If the model_key is not in the registry
    """
    if model_key not in MODELS:
        raise ValueError(f"Unknown model key: {model_key}")

    return MODELS[model_key]
