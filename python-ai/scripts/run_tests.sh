#!/bin/bash
# run_tests.sh — Optimized test runner for Python AI with model caching
cd "$(dirname "$0")/.."  # Move to python-ai root

set -e

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
NC="\033[0m"

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}⚡ Python AI: Optimized Test Runner ⚡${NC}"
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
pip install --upgrade pip setuptools wheel -q || {
    echo -e "${RED}❌ Failed to upgrade pip/setuptools/wheel${NC}"
    bug_report_template
    exit 1
}
pip install -e . -q || {
    echo -e "${RED}❌ Failed to install python-ai package${NC}"
    bug_report_template
    exit 1
}
pip install pytest pytest-asyncio pytest-timeout -q --upgrade || {
    echo -e "${RED}❌ Failed to install pytest${NC}"
    bug_report_template
    exit 1
}

# ------------------------------
# 6️⃣ Prefetch Models (auto-select lightweight for M1/CPU)
# ------------------------------
echo -e "${YELLOW}⚡ Checking if models need to be downloaded...${NC}"

MODELS_DIR="src/ai/.models"

# Device detection
CPU_ONLY=false
if [[ "$(uname -m)" == "arm64" ]] || ! command -v nvidia-smi &>/dev/null; then
    CPU_ONLY=true
    echo -e "${YELLOW}⚡ Lightweight environment detected. Will use Mistral-3B instead of 7B.${NC}"
fi

# List of models to prefetch
PREFETCH_MODELS=(
    "distilbert-sst2"
    "bert-ner"
    "gpt2"
    "political-leaning"
)

# Conditional Mistral model
if $CPU_ONLY; then
    PREFETCH_MODELS+=("mistral-3b-instruct")
else
    PREFETCH_MODELS+=("mistral-7b-instruct")
fi

# Download missing models
for model_key in "${PREFETCH_MODELS[@]}"; do
    model_path="$MODELS_DIR/$model_key"
    if [ -d "$model_path" ]; then
        echo "✅ $model_key already cached."
        continue
    fi

    echo "⚡ Downloading $model_key..."
    python -c "
        from pathlib import Path
        from ai.models_prefetch import download_model_if_not_found
        MODELS_HF = {
            'mistral-3b-instruct': ('mistralai/mistral-3b-instruct', 'text-generation'),
            'ministral-8b-instruct': ('mistralai/Ministral-8B-Instruct-2410', 'text-generation'),
            'political-leaning': ('microsoft/deberta-v3-large', 'text-classification')
        }
        hf_id, task = MODELS_HF['$model_key']
        download_model_if_not_found('$model_key', Path('$MODELS_DIR/$model_key'), hf_id, task)
        "
done


# ------------------------------
# 7️⃣ Parse command line arguments
# ------------------------------
RUN_SLOW=false
TEST_PATH="src/tests/"
SPECIFIC_TEST=""
VERBOSE="-v"

# Old-style positional arguments
if [[ $# -gt 0 ]] && [[ ! "$1" =~ ^-- ]] && [[ ! "$1" =~ ^- ]]; then
    if [[ -n "$1" ]]; then
        TEST_PATH="$1"
        shift
    fi
    if [[ -n "$1" ]]; then
        SPECIFIC_TEST="$1"
        shift
    fi
fi

# Flags parsing
while [[ $# -gt 0 ]]; do
    case $1 in
        --slow)
            RUN_SLOW=true
            shift
            ;;
        --path)
            TEST_PATH="$2"
            shift 2
            ;;
        -k)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --quiet)
            VERBOSE=""
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--slow] [--path <path>] [-k <test_name>] [--quiet]"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# ------------------------------
# 8️⃣ Run tests
# ------------------------------
echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}🚀 Running Tests (Models will be cached)${NC}"
echo -e "${CYAN}==============================================${NC}"

PYTEST_CMD="python -m pytest $TEST_PATH"
[ -n "$VERBOSE" ] && PYTEST_CMD="$PYTEST_CMD $VERBOSE"
[ -n "$SPECIFIC_TEST" ] && echo -e "${YELLOW}⚡ Running specific test: $SPECIFIC_TEST${NC}" && PYTEST_CMD="$PYTEST_CMD -k $SPECIFIC_TEST"
$RUN_SLOW && PYTEST_CMD="$PYTEST_CMD --run-slow"

echo -e "${CYAN}ℹ️ Models will be loaded once and cached.${NC}"
echo -e "${CYAN}ℹ️ First test may be slow, subsequent tests will be fast.${NC}"
echo

if ! eval $PYTEST_CMD; then
    echo -e "${RED}❌ Tests failed!${NC}"
    bug_report_template
    exit 1
fi

echo -e "${GREEN}✅ All tests completed successfully!${NC}"
