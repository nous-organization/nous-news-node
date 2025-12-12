# python-ai/src/ai/types.py

from typing import TypedDict, List, Optional, Any


class AIResponse(TypedDict, total=False):
    status: str  # "ok" or "error"
    data: Optional[Any]  # The main result (e.g., summary, cognitive biases)
    errors: Optional[List[str]]  # Any errors or warnings encountered
    meta: Optional[dict]  # Extra info like token counts, truncated lengths, etc.
