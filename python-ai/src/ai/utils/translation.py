"""
Translation-related utility helpers.

This module contains adapter functions that translate normalized
ISO-639-1 language codes (e.g. "en", "fr", "ko") into model-specific
language identifiers required by certain translation models.

Currently supported:
- mBART-style sequence-to-sequence translation models

Design notes:
- These helpers intentionally isolate model-specific concerns.
- Callers should always pass *normalized* ISO language codes.
- If an unsupported or unknown language is provided, a safe
  default language is returned to prevent runtime failures.
"""

from ai.constants.languages import MBART_LANG_MAP, DEFAULT_LANG


def get_mbart_lang(lang: str) -> str:
    """
    Resolve a normalized ISO-639-1 language code into an mBART
    language identifier.

    mBART models require internal language codes such as:
    - "en_XX" for English
    - "fr_XX" for French
    - "ko_KR" for Korean

    Parameters
    ----------
    lang : str
        Normalized ISO-639-1 language code (e.g. "en", "fr", "ko").

    Returns
    -------
    str
        mBART-compatible language code. Falls back to the default
        language if the input language is unsupported.

    Examples
    --------
    >>> get_mbart_lang("en")
    "en_XX"

    >>> get_mbart_lang("ko")
    "ko_KR"

    >>> get_mbart_lang("unknown")
    "en_XX"
    """
    if not lang:
        return MBART_LANG_MAP[DEFAULT_LANG]

    return MBART_LANG_MAP.get(lang, MBART_LANG_MAP[DEFAULT_LANG])
