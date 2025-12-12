#!/bin/bash
# run_tests.sh — run Python AI tests with correct PYTHONPATH

# Exit immediately if a command fails
set -e

# Set PYTHONPATH for imports
export PYTHONPATH=$(pwd)/python-ai/src

# Activate virtual environment if exists
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

# Run pytest with verbose output
pytest python-ai/src/tests/ -v
