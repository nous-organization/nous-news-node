"""
Tokenizer utilities.

Provides thread-safe, cached access to HuggingFace tokenizers.
Used across services and runners.
"""

from transformers import AutoTokenizer
import threading
import logging

from ..config import MODEL_DIR

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Singleton instances keyed by model name
_tokenizer_instances: dict[str, AutoTokenizer] = {}
_tokenizer_lock = threading.Lock()

DEFAULT_MODEL = "distilbert-sst2"


def get_tokenizer(model_name: str = DEFAULT_MODEL, local_files_only: bool = False) -> AutoTokenizer:
    with _tokenizer_lock:
        if model_name in _tokenizer_instances:
            return _tokenizer_instances[model_name]

        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                local_files_only=local_files_only,  # <-- use local_only flag
            )
            _tokenizer_instances[model_name] = tokenizer
            logger.info(f"Tokenizer loaded for model '{model_name}'")
            return tokenizer
        except Exception as e:
            logger.exception(f"Failed to load tokenizer '{model_name}'")
            raise


# -----------------------------
# Convenience helpers
# -----------------------------
def encode(text: str, model_name: str = DEFAULT_MODEL) -> list[int]:
    """
    Encode text into token IDs.
    """
    tokenizer = get_tokenizer(model_name)
    return tokenizer.encode(
        text,
        truncation=True,
        max_length=512,
    )


def decode(token_ids: list[int], model_name: str = DEFAULT_MODEL) -> str:
    """
    Decode token IDs back into text.
    """
    tokenizer = get_tokenizer(model_name)
    return tokenizer.decode(token_ids, skip_special_tokens=True)


def tokenize_text(text: str, model_name: str = DEFAULT_MODEL) -> dict:
    """
    Tokenize input text into tokens, IDs, and attention mask.
    """
    tokenizer = get_tokenizer(model_name)
    encoded = tokenizer(
        text,
        truncation=True,
        max_length=512,
        return_tensors=None,
    )

    return {
        "tokens": tokenizer.convert_ids_to_tokens(encoded["input_ids"]),
        "token_ids": encoded["input_ids"],
        "attention_mask": encoded.get("attention_mask"),
    }


def count_tokens(text: str, model_name: str = DEFAULT_MODEL) -> int:
    """
    Return the number of tokens for a given text.
    """
    tokenizer = get_tokenizer(model_name)
    return len(tokenizer.encode(text, truncation=True, max_length=512))
