"""
Tests for philosophical insight generation.

These tests verify the philosophical service's ability to generate
insights for various types of questions.
"""
import pytest
from ai.services import philosophical

# ------------------------------
# Basic philosophical insight
# ------------------------------
@pytest.mark.slow
@pytest.mark.timeout(300)  # 5 minute timeout
def test_philosophy_analysis_basic():
    """
    Test generation of philosophical insight for a simple question.
    """
    print("\n[TEST] Starting test_philosophy_analysis_basic")
    print("[TEST] About to call philosophical.generate_philosophical_insight")
    
    text = "What is the meaning of life?"
    result = philosophical.generate_philosophical_insight(text)
    
    print(f"[TEST] Got result: {result}")

    # Validate TypedDict structure
    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "insight" in result["data"] or len(result["data"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Empty input
# ------------------------------
@pytest.mark.timeout(60)
def test_philosophy_analysis_empty():
    """
    Test handling of empty input.
    """
    print("\n[TEST] Starting test_philosophy_analysis_empty")
    
    text = ""
    result = philosophical.generate_philosophical_insight(text)
    
    print(f"[TEST] Got result: {result}")

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Complex question (slow)
# ------------------------------
@pytest.mark.slow
@pytest.mark.timeout(600)
def test_philosophy_analysis_complex():
    """
    Test generation of philosophical insight for a complex question.
    """
    print("\n[TEST] Starting test_philosophy_analysis_complex")
    
    text = "How does consciousness relate to free will?"
    result = philosophical.generate_philosophical_insight(text)
    
    print(f"[TEST] Got result: {result}")

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "insight" in result["data"] or len(result["data"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Fast test using lightweight model
# ------------------------------
@pytest.mark.slow
@pytest.mark.timeout(60)
def test_philosophy_analysis_lightweight():
    """
    Test philosophical insight with a shorter prompt suitable for lightweight models.
    """
    print("\n[TEST] Starting test_philosophy_analysis_lightweight")
    
    text = "What is truth?"
    result = philosophical.generate_philosophical_insight(text)
    
    print(f"[TEST] Got result: {result}")

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "insight" in result["data"] or len(result["data"]) > 0
    assert "errors" in result
    assert "meta" in result
