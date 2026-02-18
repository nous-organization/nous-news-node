# ai/config.py
import torch
from pathlib import Path
import os

# -----------------------------
# Environment Profiles
# -----------------------------
ENV_PROFILES = {
    "m1_max": {"device": "mps", "max_model_size": "3b", "use_quant": False},
    "macbook_cpu": {"device": "cpu", "max_model_size": "1b", "use_quant": False},
    "gpu_48gb": {"device": "cuda", "use_quant": True},
}

CURRENT_PROFILE = os.getenv("NOUS_ENV_PROFILE", "m1_max")
PROFILE_CONFIG = ENV_PROFILES.get(CURRENT_PROFILE, ENV_PROFILES["m1_max"])
DEVICE = torch.device(PROFILE_CONFIG["device"])

# Threshold for switching to a bigger model
TOKEN_THRESHOLD_FOR_LARGE_MODEL = 1024

# For GPU and powerful machines
DEFAULT_MODEL = "mistral-7b-instruct"
DEFAULT_CLASSIFIER = "distilbert-sst2"

# Lightweight vs. large model default fallbacks
DEFAULT_SHORT_MODEL = "mistral-3b-instruct"
DEFAULT_LONG_MODEL = "ministral-8b-instruct"

# Base directory of the python-ai folder
BASE_DIR = Path(__file__).parent.resolve()

# Cache directory for all models
MODEL_DIR = Path(os.environ.get("MODELS_PATH", BASE_DIR / ".models")).resolve()
MODEL_DIR.mkdir(parents=True, exist_ok=True)
