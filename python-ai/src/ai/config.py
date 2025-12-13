# ai/config.py
from pathlib import Path
import os

# ---------------------------------------------------------------------
# Cache directory
# ---------------------------------------------------------------------
MODEL_DIR = Path(os.environ.get("MODELS_PATH", ".models")).resolve()
MODEL_DIR.mkdir(parents=True, exist_ok=True)
