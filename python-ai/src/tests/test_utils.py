import pytest
import re
from src.ai.utils import (
    clean_html,
    get_device,
    get_tokenizer,
    encode,
    decode,
    tokenize_text,
    count_tokens,
    get_mbart_lang,
)

# ------------------------------
# 1. clean_html tests
# ------------------------------
@pytest.mark.parametrize(
    "html,expected",
    [
        ("<p>Hello world!</p>", "Hello world!"),
        ("<div><strong>Bold</strong> and <em>italic</em></div>", "Bold and italic"),
        ("Text without HTML", "Text without HTML"),
        ("", ""),
        ("<p>Nested <span>tags</span> here</p>", "Nested tags here"),
        ("<p>Malformed <b>HTML", "Malformed HTML"),
    ]
)
def test_clean_html_basic(html, expected):
    """Ensure HTML is stripped correctly and text is preserved."""
    cleaned = clean_html(html)
    assert isinstance(cleaned, str)
    # Remove excess whitespace for comparison
    assert re.sub(r"\s+", " ", cleaned.strip()) == expected

# ------------------------------
# 2. get_device tests
# ------------------------------
def test_get_device_returns_valid_device():
    """Check that get_device returns a valid torch device string."""
    device = get_device()
    assert isinstance(device, str)
    assert device.startswith("cpu") or device.startswith("cuda")

# ------------------------------
# 3. Tokenizer tests
# ------------------------------
# Basic encode/decode
def test_tokenizer_encode_decode():
    text = "Hello world!"
    tokens = encode(text)
    decoded = decode(tokens)

    assert isinstance(tokens, list)
    assert isinstance(decoded, str)
    assert "hello" in decoded.lower()
    assert "world" in decoded.lower()

# Multi-language
@pytest.mark.parametrize(
    "text",
    [
        "안녕하세요 세계!",      # Korean
        "Bonjour le monde!",  # French
        "Hola mundo!",        # Spanish
        "Hallo Welt!",        # German
        "こんにちは世界！",      # Japanese
    ]
)
def test_tokenizer_multilanguage(text):
    tokens = encode(text)
    decoded = decode(tokens)

    assert isinstance(tokens, list)
    assert isinstance(decoded, str)
    assert len(decoded) > 0

# Empty string
def test_tokenizer_empty_string():
    tokens = encode("")
    decoded = decode(tokens)

    assert tokens == []
    assert decoded == ""

# Very long string
def test_tokenizer_long_string():
    long_text = "This is a sentence. " * 10_000
    tokens = encode(long_text)
    decoded = decode(tokens)

    assert isinstance(tokens, list)
    assert isinstance(decoded, str)
    assert "sentence" in decoded.lower()

# tokenize_text
def test_tokenize_text_matches_encode():
    text = "Check tokenize_text"
    tokens_direct = encode(text)
    tokens_helper = tokenize_text(text)

    assert tokens_direct == tokens_helper
    assert isinstance(tokens_helper, list)

# count_tokens
def test_count_tokens_matches_length():
    text = "Count these tokens please"
    tokens = encode(text)
    count = count_tokens(text)
    assert count == len(tokens)

# get_tokenizer returns callable
def test_get_tokenizer_callable():
    tok = get_tokenizer()
    assert callable(tok.encode)
    assert callable(tok.decode)

# ------------------------------
# 4. get_mbart_lang tests
# ------------------------------
@pytest.mark.parametrize(
    "lang,expected",
    [
        ("english", "en_XX"),
        ("korean", "ko_KR"),
        ("spanish", "es_XX"),
        ("french", "fr_XX"),
    ]
)
def test_get_mbart_lang_valid(lang, expected):
    code = get_mbart_lang(lang)
    assert code == expected

def test_get_mbart_lang_unsupported():
    with pytest.raises(ValueError):
        get_mbart_lang("unsupported_language")

# Edge cases: non-string input
def test_get_mbart_lang_invalid_type():
    with pytest.raises(TypeError):
        get_mbart_lang(123)

# ------------------------------
# 5. Tokenizer robustness with invalid input
# ------------------------------
@pytest.mark.parametrize(
    "invalid_input",
    [None, 123, 45.6, [], {}]
)
def test_tokenizer_invalid_input_raises(invalid_input):
    with pytest.raises(Exception):
        encode(invalid_input)
    with pytest.raises(Exception):
        decode(invalid_input)

