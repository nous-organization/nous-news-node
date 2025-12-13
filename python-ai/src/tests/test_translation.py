import pytest
from src.ai.services import translate
from src.ai.types import AIResponse

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

    assert isinstance(result, AIResponse), "Result should be an AIResponse object"
    assert result.status in {"ok", "partial"}, "Status must be 'ok' or 'partial'"
    assert "translation" in result.data, "Response must contain 'translation'"
    assert isinstance(result.data["translation"], str), "'translation' must be a string"
    assert result.data["language"] == target_language, "Detected language must match target"

    if expected_diff:
        # Translation should differ from original for different languages
        assert result.data["translation"] != text, "Translation should differ from original text"
    else:
        # For same-language translation, text should remain unchanged
        assert result.data["translation"] == text, "Text should remain unchanged for same-language translation"


# ------------------------------
# Edge Case: Empty Input
# ------------------------------
def test_translation_empty_text():
    """
    Ensure translation handles empty input gracefully.
    """
    text = ""
    target_language = "ko"
    result = translate.translate(text, target_language=target_language)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}, "Status must be 'ok' or 'partial'"
    assert "translation" in result.data
    assert result.data["translation"] == "", "Empty input should return empty translation"
    assert result.data["language"] == target_language


# ------------------------------
# Edge Case: Unsupported Language
# ------------------------------
def test_translation_unsupported_language():
    """
    Test translation with unsupported target language.
    The service should return the original text or a partial response.
    """
    text = "Hello world"
    target_language = "xx"  # invalid language code
    result = translate.translate(text, target_language=target_language)

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "error"}, "Status must indicate partial or error"
    assert "translation" in result.data
    assert result.data["translation"] == text, "Original text should be returned for unsupported languages"
    assert result.data.get("language", target_language) == target_language


# ------------------------------
# Edge Case: Long Text
# ------------------------------
def test_translation_long_text():
    """
    Ensure translation handles very long inputs without crashing.
    """
    long_text = "This is a sentence. " * 5000  # ~100k characters
    target_language = "ko"
    result = translate.translate(long_text, target_language=target_language)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}, "Status must be 'ok' or 'partial'"
    assert "translation" in result.data
    assert isinstance(result.data["translation"], str)
    assert len(result.data["translation"]) > 0, "Translation should not be empty"
