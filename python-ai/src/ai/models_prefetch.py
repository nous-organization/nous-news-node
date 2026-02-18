import logging
from pathlib import Path
import shutil

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForCausalLM,
)
from huggingface_hub import snapshot_download

from .config import MODEL_DIR
from .model_registry import MODELS
from .models import get_pipeline
from .config import PROFILE_CONFIG, CURRENT_PROFILE

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
# Utility: Download model if not found locally
# ---------------------------------------------------------------------
def download_model_if_not_found(model_key: str, model_path: Path, hf_id: str, task: str):
    if model_path.exists() and any(model_path.iterdir()):
        logger.info(f"Model already exists locally at {model_path}")
        return

    logger.info(f"Downloading {model_key} ({hf_id})...")
    repo_dir = snapshot_download(hf_id)
    model_path.mkdir(parents=True, exist_ok=True)

    # Load and save tokenizer & model locally
    if task == "text-classification":
        model = AutoModelForSequenceClassification.from_pretrained(repo_dir)
        tokenizer = AutoTokenizer.from_pretrained(repo_dir)
    elif task == "token-classification":
        model = AutoModelForTokenClassification.from_pretrained(repo_dir)
        tokenizer = AutoTokenizer.from_pretrained(repo_dir)
    elif task == "text-generation":
        model = AutoModelForCausalLM.from_pretrained(repo_dir)
        tokenizer = AutoTokenizer.from_pretrained(repo_dir)
    else:
        raise ValueError(f"Unsupported task: {task}")

    model.save_pretrained(model_path)
    tokenizer.save_pretrained(model_path)
    logger.info(f"Saved {model_key} to {model_path}")


# ---------------------------------------------------------------------
# Prefetch all models
# ---------------------------------------------------------------------
def prefetch_models():
    """
    Prefetch all registered models and ensure they are cached locally.
    Handles environment-specific fallbacks for large models (e.g., Mistral-7B → 3B).
    """
    try:
        for model_key, spec in MODELS.items():
            hf_id = spec.get("hf_id")
            task = spec.get("task")
            model_path = Path(MODEL_DIR) / model_key

            # Environment-aware fallback
            if model_key == "mistral-7b-instruct" and PROFILE_CONFIG.get("max_model_size") != "7b":
                # Use Mistral-3B instead
                logger.info(f"[prefetch] Falling back {model_key} → mistral-3b-instruct for {CURRENT_PROFILE}")
                model_key = "mistral-3b-instruct"
                hf_id = MODELS[model_key]["hf_id"]
                task = MODELS[model_key]["task"]
                model_path = Path(MODEL_DIR) / model_key

            if model_key == "political-leaning":
                snapshot_path = snapshot_download(hf_id, cache_dir=str(MODEL_DIR))
                tokenizer = AutoTokenizer.from_pretrained("microsoft/deberta-v3-large")
                model = AutoModelForSequenceClassification.from_pretrained(snapshot_path)
                model_path.mkdir(parents=True, exist_ok=True)
                model.save_pretrained(model_path)
                tokenizer.save_pretrained(model_path)
            else:
                download_model_if_not_found(model_key, model_path, hf_id, task)

            # Ensure pipeline can be created
            get_pipeline(task, model_key)

        logger.info("✅ All models prefetched successfully.")

    except Exception as e:
        logger.error(f"Error during model prefetching: {e}")
        raise
