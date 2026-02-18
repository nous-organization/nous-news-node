"""
Pytest configuration for optimized test execution.

This file configures pytest to keep models loaded in memory between tests,
significantly reducing test execution time by avoiding repeated model loading.

Place this file at: src/tests/conftest.py
"""

import pytest
import logging
import sys
from pathlib import Path

# Add src to Python path if not already there
src_path = Path(__file__).parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Session-scoped fixture to keep models in memory
# ---------------------------------------------------------------------
@pytest.fixture(scope="session")
def preload_models():
    """
    Pre-load commonly used models at the start of the test session.
    Models remain in memory for all tests in the session.
    """
    import sys
    
    print("\n" + "=" * 60, file=sys.stderr)
    print("⚡ Pre-loading models for test session...", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    # Import here to avoid circular imports
    from ai.models import get_pipeline
    from ai.model_registry import MODELS
    
    # Pre-load lightweight models that are used in tests
    # Skip Mistral-7B as it's very large and slow to load
    lightweight_models = [
        ("distilbert-sst2", "text-classification"),
        ("bert-ner", "token-classification"),
        ("gpt2", "text-generation"),
    ]
    
    loaded_count = 0
    for model_key, task in lightweight_models:
        if model_key in MODELS:
            try:
                print(f"⚡ Pre-loading {model_key}...", file=sys.stderr, flush=True)
                get_pipeline(task, model_key)
                print(f"✓ {model_key} loaded and cached", file=sys.stderr, flush=True)
                loaded_count += 1
            except Exception as e:
                print(f"⚠️  Could not pre-load {model_key}: {e}", file=sys.stderr, flush=True)
    
    print("=" * 60, file=sys.stderr)
    print(f"✓ Pre-loaded {loaded_count} models successfully", file=sys.stderr)
    print("Models will remain in memory for all tests", file=sys.stderr)
    print("=" * 60 + "\n", file=sys.stderr, flush=True)
    
    yield  # Tests run here
    
    # Optional: Clean up models after all tests
    # Uncomment if you want to free memory after test session
    # from ai.models import clear_model_cache
    # print("Cleaning up model cache...", file=sys.stderr)
    # clear_model_cache()


@pytest.fixture(scope="session", autouse=True)
def configure_logging():
    """
    Configure logging for test session.
    """
    logging.basicConfig(
        level=logging.INFO,
        format='[%(levelname)s] %(message)s'
    )


# ---------------------------------------------------------------------
# Fixture to ensure models are available for individual tests
# ---------------------------------------------------------------------
@pytest.fixture(autouse=True)
def ensure_models_loaded(preload_models):
    """
    Ensure models are loaded before each test.
    This fixture depends on preload_models but doesn't reload them.
    """
    pass  # Models are already loaded by session fixture


# ---------------------------------------------------------------------
# Optional: Skip slow tests by default
# ---------------------------------------------------------------------
def pytest_addoption(parser):
    """
    Add custom command line options.
    """
    parser.addoption(
        "--run-slow",
        action="store_true",
        default=False,
        help="Run slow tests (like those using Mistral-7B)"
    )


def pytest_configure(config):
    """
    Register custom markers.
    """
    config.addinivalue_line(
        "markers", "slow: mark test as slow (deselect with '-m \"not slow\"')"
    )


def pytest_collection_modifyitems(config, items):
    """
    Skip slow tests unless --run-slow is passed.
    """
    if config.getoption("--run-slow"):
        return  # Don't skip any tests
    
    skip_slow = pytest.mark.skip(reason="need --run-slow option to run")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip_slow)


# ---------------------------------------------------------------------
# Helpful fixtures for common test operations
# ---------------------------------------------------------------------
@pytest.fixture
def sample_text():
    """Provide sample text for testing."""
    return "This is a sample text for testing purposes."


@pytest.fixture
def sample_philosophical_question():
    """Provide a sample philosophical question."""
    return "What is the nature of reality?"