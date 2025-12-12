from transformers import AutoTokenizer
from pathlib import Path
import threading
import logging

from .models import MODEL_DIR

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Singleton instances keyed by model name
_tokenizer_instances = {}
_tokenizer_lock = threading.Lock()


def get_tokenizer(model_name: str = "xlm-roberta-base") -> AutoTokenizer:
    """
    Retrieve a shared tokenizer instance for the given model.
    Lazy loads the tokenizer on first call, caches afterward.
    """
    global _tokenizer_instances

    with _tokenizer_lock:
        if model_name in _tokenizer_instances:
            return _tokenizer_instances[model_name]

        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=str(MODEL_DIR),
                local_files_only=False
            )
            _tokenizer_instances[model_name] = tokenizer
            logger.info(f"Tokenizer for '{model_name}' loaded successfully from {MODEL_DIR}")
            return tokenizer
        except Exception as e:
            logger.error(f"Failed to load tokenizer '{model_name}': {e}")
            raise


# -----------------------------
# Convenience wrapper functions
# -----------------------------
def encode(text: str, model_name: str = "xlm-roberta-base"):
    """
    Encode text into token IDs using the shared tokenizer.
    """
    tokenizer = get_tokenizer(model_name)
    return tokenizer.encode(text, truncation=True, max_length=512)


def decode(token_ids, model_name: str = "xlm-roberta-base"):
    """
    Decode token IDs back into text using the shared tokenizer.
    """
    tokenizer = get_tokenizer(model_name)
    return tokenizer.decode(token_ids, skip_special_tokens=True)


def tokenize_text(text: str, model_name: str = "xlm-roberta-base"):
    """
    Tokenize input text into tokens, IDs, and attention mask.
    """
    tokenizer = get_tokenizer(model_name)
    encoded = tokenizer(
        text,
        truncation=True,
        max_length=512,
        return_tensors=None
    )

    return {
        "tokens": tokenizer.convert_ids_to_tokens(encoded["input_ids"]),
        "token_ids": encoded["input_ids"],
        "attention_mask": encoded.get("attention_mask"),
    }
