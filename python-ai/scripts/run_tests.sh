#!/bin/bash
# run_tests.sh — Fully automated test runner for Python AI with bug-report helper

set -e

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}⚡ Python AI: Automated Test Runner ⚡${NC}"
echo -e "${GREEN}==============================================${NC}"

# ------------------------------
# Bug-report template function
# ------------------------------
function bug_report_template() {
    echo
    echo -e "${YELLOW}⚠️ If you encounter an error, please copy the following template and create an issue:${NC}"
    echo
    echo "---- COPY BELOW THIS LINE ----"
    echo "### Description"
    echo "<Describe the problem here>"
    echo
    echo "### Steps to Reproduce"
    echo "1. Clone repo"
    echo "2. Run ./scripts/run_tests.sh"
    echo
    echo "### Environment"
    echo "- OS: $(uname -a)"
    echo "- Python: $($PYTHON --version 2>&1 || echo 'Not found')"
    echo "- Pip: $($PYTHON -m pip --version 2>&1 || echo 'Not found')"
    echo "- PYTHONPATH: $PYTHONPATH"
    echo "- Virtualenv active: $( [ -n "$VIRTUAL_ENV" ] && echo yes || echo no )"
    echo
    echo "### Output / Error"
    echo "<Paste the full error log here>"
    echo "---- END COPY ----"
    echo
}

# ------------------------------
# 1️⃣ Check Python installation
# ------------------------------
REQUIRED_PYTHON="3.10"
PYTHON=$(command -v python3 || command -v python || true)
if [[ -z "$PYTHON" ]]; then
    echo -e "${RED}❌ Python3 not found. Please install Python ≥ $REQUIRED_PYTHON.${NC}"
    bug_report_template
    exit 1
fi

PYTHON_VERSION=$($PYTHON -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if [[ "$(printf '%s\n' "$REQUIRED_PYTHON" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_PYTHON" ]]; then
    echo -e "${RED}❌ Python version must be ≥ $REQUIRED_PYTHON. Found $PYTHON_VERSION.${NC}"
    bug_report_template
    exit 1
fi
echo -e "${GREEN}✅ Python $PYTHON_VERSION detected.${NC}"

# ------------------------------
# 2️⃣ Set PYTHONPATH
# ------------------------------
export PYTHONPATH=$(pwd)/src
echo -e "${GREEN}✅ PYTHONPATH set to $PYTHONPATH${NC}"

# ------------------------------
# 3️⃣ Create virtual environment if missing
# ------------------------------
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚡ Creating virtual environment...${NC}"
    $PYTHON -m venv .venv
fi

# ------------------------------
# 4️⃣ Activate virtual environment
# ------------------------------
echo -e "${YELLOW}⚡ Activating virtual environment...${NC}"
source .venv/bin/activate

# ------------------------------
# 5️⃣ Upgrade pip and install dependencies
# ------------------------------
echo -e "${YELLOW}⚡ Installing dependencies...${NC}"
pip install --upgrade pip setuptools wheel || {
    echo -e "${RED}❌ Failed to upgrade pip/setuptools/wheel${NC}"
    bug_report_template
    exit 1
}
pip install -e . || {
    echo -e "${RED}❌ Failed to install python-ai package${NC}"
    bug_report_template
    exit 1
}
pip install pytest pytest-asyncio --upgrade || {
    echo -e "${RED}❌ Failed to install pytest${NC}"
    bug_report_template
    exit 1
}

# ------------------------------
# 6️⃣ Prefetch Models with retry
# ------------------------------
echo -e "${YELLOW}⚡ Prefetching AI models...${NC}"

# Retry function
retry_count=0
max_retries=3

while [ $retry_count -lt $max_retries ]; do
    echo -e "${YELLOW}⚡ Attempting to prefetch models (Attempt $((retry_count+1))/$max_retries)...${NC}"
    if python -c "from ai.models_prefetch import prefetch_models; prefetch_models()"; then
        echo -e "${GREEN}✅ Model prefetch finished.${NC}"
        break
    else
        echo -e "${RED}❌ Model prefetch failed. Retrying...${NC}"
        ((retry_count++))
        if [ $retry_count -eq $max_retries ]; then
            echo -e "${RED}❌ Max retries reached. Exiting...${NC}"
            bug_report_template
            exit 1
        fi
        sleep 5  # Wait for 5 seconds before retrying
    fi
done

# ------------------------------
# 7️⃣ Run tests
# ------------------------------
TEST_PATH=${1:-src/tests/}  # Optional argument to run specific tests

# Check if a specific test function is provided
if [[ "$2" != "" ]]; then
    echo -e "${YELLOW}⚡ Running specific test: $2 in $TEST_PATH...${NC}"
    if ! python -m pytest "$TEST_PATH" -k "$2" -v; then
        echo -e "${RED}❌ Tests failed!${NC}"
        bug_report_template
        exit 1
    fi
else
    echo -e "${YELLOW}⚡ Running all tests in $TEST_PATH...${NC}"
    if ! python -m pytest "$TEST_PATH" -v; then
        echo -e "${RED}❌ Tests failed!${NC}"
        bug_report_template
        exit 1
    fi
fi

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
echo -e "${GREEN}==============================================${NC}"
