import pytest
from src.ai.services import cognitive_bias
from src.ai.types import AIResponse

# ------------------------------
# Basic cognitive bias detection
# ------------------------------
def test_cognitive_bias_basic():
    text = "The government always does the right thing."
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, AIResponse)
    assert isinstance(response.data, list)
    # Each item should have a bias_type and evidence (if any)
    if response.data:
        for item in response.data:
            assert "bias_type" in item
            assert isinstance(item["bias_type"], str)
            assert "evidence" in item
            # Evidence can be empty
            assert isinstance(item["evidence"], str) or item["evidence"] is None

# ------------------------------
# Cognitive bias detection with empty input
# ------------------------------
def test_cognitive_bias_empty():
    text = ""
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, AIResponse)
    assert isinstance(response.data, list)
    # Should handle empty gracefully (no biases detected)
    assert response.data == []

# ------------------------------
# Cognitive bias detection with complex sentence
# ------------------------------
def test_cognitive_bias_complex():
    text = "People always prefer things they are familiar with, even if better options exist."
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, AIResponse)
    assert isinstance(response.data, list)
    # Expect at least one bias type detected
    assert any("bias_type" in item for item in response.data)
