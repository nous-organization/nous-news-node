"""
Tokenizer & Model Utilities

Provides thread-safe, cached access to HuggingFace tokenizers and causal LLMs.
Environment-aware for CPU, MPS (Apple Silicon), and CUDA. Supports quantization.
Handles Mistral 3B FP8 models automatically.
"""

import logging
import threading
from pathlib import Path
from typing import Dict, Any, Optional

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

from ..config import (
    PROFILE_CONFIG,
    CURRENT_PROFILE,
    DEFAULT_CLASSIFIER,
    DEVICE,
    TOKEN_THRESHOLD_FOR_LARGE_MODEL,
    DEFAULT_SHORT_MODEL,
    DEFAULT_LONG_MODEL,
    DEFAULT_MODEL,
)
from ..model_registry import MODELS

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.info(f"[models] Using profile '{CURRENT_PROFILE}' → device={DEVICE}")

# -----------------------------
# Thread-safe caches
# -----------------------------
_TOKENIZER_CACHE: Dict[str, AutoTokenizer] = {}
_MODEL_CACHE: Dict[str, Dict[str, Any]] = {}
_LOCK = threading.Lock()


# -----------------------------
# Helpers
# -----------------------------
def _resolve_model_path(model_key: str) -> str:
    """
    Resolve model key to local path, with automatic fallback
    for environment max_model_size.
    """
    if PROFILE_CONFIG.get("max_model_size"):
        max_size = PROFILE_CONFIG["max_model_size"]
        if "mistral-7b" in model_key and max_size != "7b":
            logger.info(
                f"[models] Model {model_key} too big for profile {CURRENT_PROFILE}, falling back to Mistral-{max_size}"
            )
            model_key = model_key.replace("7b", max_size)

    try:
        if model_key in MODELS:
            local_path = Path(MODELS[model_key].get("local_path", ""))
            if local_path.exists():
                return str(local_path)
    except ImportError:
        pass
    return model_key


# -----------------------------
# Tokenizer Loader
# -----------------------------
def get_tokenizer(
    model_name: str = DEFAULT_CLASSIFIER, local_files_only: bool = True
) -> AutoTokenizer:
    with _LOCK:
        if model_name in _TOKENIZER_CACHE:
            return _TOKENIZER_CACHE[model_name]

        model_path = _resolve_model_path(model_name)
        tokenizer = AutoTokenizer.from_pretrained(
            model_path, local_files_only=local_files_only
        )

        _TOKENIZER_CACHE[model_name] = tokenizer
        logger.info(f"Tokenizer loaded for {model_name} from {model_path}")
        return tokenizer


# -----------------------------
# Model Loader (Environment-Aware)
# -----------------------------
def get_model(model_name: str, force_cpu: bool = False) -> Dict[str, Any]:
    """
    Returns a dict with keys: {'model', 'tokenizer'}
    Automatically loads on the configured device, with safe fallbacks.
    Special handling for Mistral-3B FP8 and Mistral-8B Instruct.
    """
    with _LOCK:
        if model_name in _MODEL_CACHE:
            return _MODEL_CACHE[model_name]

        device = torch.device("cpu") if force_cpu else DEVICE
        logger.info(f"Loading model {model_name} → device={device}")

        # -----------------------------
        # Mistral-8B Instruct (mistral_inference)
        # -----------------------------
        if model_name.lower() in [
            "mistralai/minstral-8b-instruct-2410",
            "mistral-8b-instruct",
        ]:
            from mistral_inference.transformer import Transformer
            from mistral_common.tokens.tokenizers.mistral import MistralTokenizer

            mistral_models_path = Path(
                "/path/to/mistral-8b-instruct"
            )  # adjust as needed
            tokenizer = MistralTokenizer.from_file(mistral_models_path / "tekken.json")
            model = Transformer.from_folder(mistral_models_path, softmax_fp32=False)

        # -----------------------------
        # Mistral-3B FP8 (transformers)
        # -----------------------------
        elif "mistral-3b" in model_name.lower():
            from transformers import (
                Mistral3ForConditionalGeneration,
                FineGrainedFP8Config,
            )
            from transformers import AutoTokenizer

            tokenizer = AutoTokenizer.from_pretrained(
                "mistralai/Ministral-3-3B-Instruct-2512", local_files_only=True
            )
            model = Mistral3ForConditionalGeneration.from_pretrained(
                "mistralai/Ministral-3-3B-Instruct-2512",
                device_map="auto",
                quantization_config=FineGrainedFP8Config(dequantize=True),
            )
            model.to(device)
            model.eval()

        # -----------------------------
        # Standard HuggingFace LLMs
        # -----------------------------
        else:
            tokenizer = get_tokenizer(model_name)
            model_path = _resolve_model_path(model_name)
            model_kwargs = {"local_files_only": True}
            if device.type in ["cuda", "mps"]:
                model_kwargs["torch_dtype"] = torch.float16
                try:
                    import bitsandbytes

                    model_kwargs["load_in_8bit"] = PROFILE_CONFIG.get(
                        "use_quant", False
                    )
                except ImportError:
                    logger.info("bitsandbytes not installed, loading full precision")

            try:
                model = AutoModelForCausalLM.from_pretrained(model_path, **model_kwargs)
                model.to(device)
                model.eval()
            except RuntimeError as e:
                logger.warning(
                    f"Cannot load model on {device}: {e}. Falling back to CPU."
                )
                model = AutoModelForCausalLM.from_pretrained(model_path, **model_kwargs)
                model.to("cpu")
                model.eval()

        bundle = {"model": model, "tokenizer": tokenizer}
        _MODEL_CACHE[model_name] = bundle
        return bundle


# -----------------------------
# Text Encoding / Decoding
# -----------------------------
def encode(text: str, model_name: str = DEFAULT_CLASSIFIER) -> list[int]:
    return get_tokenizer(model_name).encode(text, truncation=True, max_length=512)


def decode(token_ids: list[int], model_name: str = DEFAULT_CLASSIFIER) -> str:
    return get_tokenizer(model_name).decode(token_ids, skip_special_tokens=True)


def tokenize_text(text: str, model_name: str = DEFAULT_CLASSIFIER) -> dict:
    tokenizer = get_tokenizer(model_name)
    encoded = tokenizer(text, truncation=True, max_length=512, return_tensors=None)
    return {
        "tokens": tokenizer.convert_ids_to_tokens(encoded["input_ids"]),
        "token_ids": encoded["input_ids"],
        "attention_mask": encoded.get("attention_mask"),
    }


def count_tokens(text: str, model_name: str = DEFAULT_CLASSIFIER) -> int:
    return len(get_tokenizer(model_name).encode(text, truncation=True, max_length=512))


# -----------------------------
# Text Generation
# -----------------------------
def generate_text(
    text: str,
    model_name: str | None = None,
    max_new_tokens: int = 256,
    do_sample: bool = True,
) -> str:
    if model_name is None or "mistral" in model_name.lower():
        model_name = select_mistral_model(text)  # your custom logic

    # load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto")

    # optionally enable xformers memory-efficient attention if available
    # if USE_XFORMERS:
    #     try:
    #         model.enable_xformers_memory_efficient_attention()
    #     except Exception:
    #         pass  # fallback if something fails

    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=do_sample,
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)


# -----------------------------
# Model Selection
# -----------------------------
def select_mistral_model(
    text: str, token_threshold: int = TOKEN_THRESHOLD_FOR_LARGE_MODEL
) -> str:
    tokens = count_tokens(text, model_name=DEFAULT_SHORT_MODEL)
    max_size = PROFILE_CONFIG.get("max_model_size", "8b")

    if tokens >= token_threshold:
        long_model = DEFAULT_LONG_MODEL
        if long_model in MODELS and long_model.endswith(max_size):
            return long_model
        if DEFAULT_MODEL in MODELS and DEFAULT_MODEL.endswith(max_size):
            return DEFAULT_MODEL
        return DEFAULT_SHORT_MODEL
    return DEFAULT_SHORT_MODEL


def select_mistral_model_by_tokens(text: str, token_threshold: int = 1024) -> str:
    tokens = count_tokens(text, model_name="mistral-3b-instruct")
    return "mistral-7b-instruct" if tokens >= token_threshold else "mistral-3b-instruct"
