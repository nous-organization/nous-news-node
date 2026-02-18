import pytest
from ai.services import cognitive_bias

# ------------------------------
# Basic cognitive bias detection
# ------------------------------
def test_cognitive_bias_basic():
    text = "The government always does the right thing."
    response = cognitive_bias.detect_cognitive_bias(text)

    # Validate TypedDict structure
    assert isinstance(response, dict)
    assert "status" in response and response["status"] in {"ok", "partial", "error"}
    assert "data" in response and isinstance(response["data"], list)
    assert "errors" in response
    assert "meta" in response

    # Each item in data should have bias_type and evidence
    for item in response["data"]:
        assert "bias_type" in item and isinstance(item["bias_type"], str)
        assert "evidence" in item and (isinstance(item["evidence"], str) or item["evidence"] is None)


# ------------------------------
# Cognitive bias detection with empty input
# ------------------------------
def test_cognitive_bias_empty():
    text = ""
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, dict)
    assert "status" in response and response["status"] in {"ok", "partial", "error"}
    assert "data" in response and isinstance(response["data"], list)
    assert response["data"] == []  # Should handle empty gracefully
    assert "errors" in response
    assert "meta" in response


# ------------------------------
# Cognitive bias detection with complex sentence
# ------------------------------
def test_cognitive_bias_complex():
    text = "People always prefer things they are familiar with, even if better options exist."
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, dict)
    assert "status" in response and response["status"] in {"ok", "partial", "error"}
    assert "data" in response and isinstance(response["data"], list)
    assert "errors" in response
    assert "meta" in response

    # Expect at least one bias type detected
    assert any("bias_type" in item for item in response["data"])
