# ai/config.py
from pathlib import Path
import os

# Base directory of the python-ai folder
BASE_DIR = Path(__file__).parent.resolve()

# Cache directory for all models
MODEL_DIR = Path(os.environ.get("MODELS_PATH", BASE_DIR / ".models")).resolve()
MODEL_DIR.mkdir(parents=True, exist_ok=True)
