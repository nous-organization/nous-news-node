import pytest
from ai.services import translate

# ------------------------------
# Parametrized test for multiple languages
# ------------------------------
@pytest.mark.parametrize(
    "text,target_language,expected_diff",
    [
        ("Hello world", "ko", True),  # Korean
        ("Good morning", "fr", True), # French
        ("I love programming", "es", True), # Spanish
        ("How are you?", "de", True), # German
        ("Welcome", "ja", True), # Japanese
        ("Hello world", "en", False), # English → English, no change
    ]
)
def test_translation_multiple_languages(text, target_language, expected_diff):
    """
    Test translating text into multiple target languages.
    Validates that translation occurs for different languages
    and remains unchanged for same-language translation.
    """
    result = translate.translate(text, target_language=target_language)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "translation" in result["data"]
    assert isinstance(result["data"]["translation"], str)
    assert result["data"]["language"] == target_language
    assert "errors" in result
    assert "meta" in result

    if expected_diff:
        assert result["data"]["translation"] != text, "Translation should differ from original text"
    else:
        assert result["data"]["translation"] == text, "Text should remain unchanged for same-language translation"


# ------------------------------
# Edge Case: Empty Input
# ------------------------------
def test_translation_empty_text():
    text = ""
    target_language = "ko"
    result = translate.translate(text, target_language=target_language)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "translation" in result["data"] and result["data"]["translation"] == ""
    assert result["data"]["language"] == target_language
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Edge Case: Unsupported Language
# ------------------------------
def test_translation_unsupported_language():
    text = "Hello world"
    target_language = "xx"  # invalid language code
    result = translate.translate(text, target_language=target_language)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"partial", "error", "ok"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "translation" in result["data"] and result["data"]["translation"] == text
    assert result["data"].get("language", target_language) == target_language
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Edge Case: Long Text
# ------------------------------
def test_translation_long_text():
    long_text = "This is a sentence. " * 5000  # ~100k characters
    target_language = "ko"
    result = translate.translate(long_text, target_language=target_language)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "translation" in result["data"]
    assert isinstance(result["data"]["translation"], str)
    assert len(result["data"]["translation"]) > 0
    assert result["data"]["language"] == target_language
    assert "errors" in result
    assert "meta" in result
