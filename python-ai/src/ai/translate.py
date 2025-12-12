# python-ai/src/ai/translate.py
"""
translate.py

Language detection and translation using Nous Python backend pipelines.
GPU/MPS/CPU-aware via shared get_pipeline() helper.
"""

import re
from typing import List, Optional, Dict, Any
from .models import get_pipeline, get_device  # ← NEW: device-aware pipelines
from .tokenizer import get_tokenizer

# ------------------------------
# Configurable Token Limits
# ------------------------------
TRANSLATION_TOKEN_LIMIT = 128
LANG_DETECTOR_BOUNDS = 128
DEFAULT_LANG = "en"

# ------------------------------
# Language maps
# ------------------------------
LANG_MAP = {
  "ar": "ar_AR",
	"cs": "cs_CZ",
	"de": "de_DE",
	"en": "en_XX",
	"es": "es_XX",
	"et": "et_EE",
	"fi": "fi_FI",
	"fr": "fr_XX",
	"gu": "gu_IN",
	"hi": "hi_IN",
	"it": "it_IT",
	"ja": "ja_XX",
	"kk": "kk_KZ",
	"ko": "ko_KR",
	"lt": "lt_LT",
	"lv": "lv_LV",
	"my": "my_MM",
	"ne": "ne_NP",
	"nl": "nl_XX",
	"ro": "ro_RO",
	"ru": "ru_RU",
	"si": "si_LK",
	"vi": "vi_VN",
	"zh": "zh_CN",
	"af": "af_ZA",
	"az": "az_AZ",
	"bn": "bn_IN",
	"fa": "fa_IR",
	"he": "he_IL",
	"hr": "hr_HR",
	"id": "id_ID",
	"ka": "ka_GE",
	"km": "km_KH",
	"mk": "mk_MK",
	"ml": "ml_IN",
	"mn": "mn_MN",
	"mr": "mr_IN",
	"pl": "pl_PL",
	"ps": "ps_AF",
	"pt": "pt_XX",
	"sv": "sv_SE",
	"sw": "sw_KE",
	"ta": "ta_IN",
	"te": "te_IN",
	"th": "th_TH",
	"tr": "tr_TR",
	"tl": "tl_XX",
	"uk": "uk_UA",
	"ur": "ur_PK",
	"xh": "xh_ZA",
	"gl": "gl_ES",
	"sl": "sl_SI"
}

DETECTOR_NAME_TO_ISO = {
	"arabic": "ar",
	"ar": "ar",
	"czech": "cs",
	"cs": "cs",
	"german": "de",
	"de": "de",
	"english": "en",
	"en": "en",
	"spanish": "es",
	"es": "es",
	"estonian": "et",
	"et": "et",
	"finnish": "fi",
	"fi": "fi",
	"french": "fr",
	"fr": "fr",
	"gujarati": "gu",
	"gu": "gu",
	"hindi": "hi",
	"hi": "hi",
	"italian": "it",
	"it": "it",
	"japanese": "ja",
	"ja": "ja",
	"kazakh": "kk",
	"kk": "kk",
	"korean": "ko",
	"ko": "ko",
	"lithuanian": "lt",
	"lt": "lt",
	"latvian": "lv",
	"lv": "lv",
	"myanmar": "my",
	"my": "my",
	"nepali": "ne",
	"ne": "ne",
	"dutch": "nl",
	"nl": "nl",
	"romanian": "ro",
	"ro": "ro",
	"russian": "ru",
	"ru": "ru",
	"sinhala": "si",
	"si": "si",
	"vietnamese": "vi",
	"vi": "vi",
	"chinese": "zh",
	"zh": "zh",
	"afrikaans": "af",
	"af": "af",
	"azerbaijani": "az",
	"az": "az",
	"bengali": "bn",
	"bn": "bn",
	"persian": "fa",
	"fa": "fa",
	"hebrew": "he",
	"he": "he",
	"croatian": "hr",
	"hr": "hr",
	"indonesian": "id",
	"id": "id",
	"georgian": "ka",
	"ka": "ka",
	"khmer": "km",
	"km": "km",
	"macedonian": "mk",
	"mk": "mk",
	"malayalam": "ml",
	"ml": "ml",
	"mongolian": "mn",
	"mn": "mn",
	"marathi": "mr",
	"mr": "mr",
	"polish": "pl",
	"pl": "pl",
	"pashto": "ps",
	"ps": "ps",
	"portuguese": "pt",
	"pt": "pt",
	"swedish": "sv",
	"sv": "sv",
	"swahili": "sw",
	"sw": "sw",
	"tamil": "ta",
	"ta": "ta",
	"telugu": "te",
	"te": "te",
	"thai": "th",
	"th": "th",
	"turkish": "tr",
	"tr": "tr",
	"tagalog": "tl",
	"tl": "tl",
	"ukrainian": "uk",
	"uk": "uk",
	"urdu": "ur",
	"ur": "ur",
	"xhosa": "xh",
	"xh": "xh",
	"galician": "gl",
	"gl": "gl",
	"slovene": "sl",
	"sl": "sl",
}

# ------------------------------
# Helpers
# ------------------------------
def get_translator_lang(lang: Optional[str]) -> str:
    if not lang:
        return DEFAULT_LANG
    iso = lang.lower().strip()
    return LANG_MAP.get(iso, DEFAULT_LANG)

def get_detector():
    # Returns a GPU/MPS-aware language detection pipeline
    return get_pipeline("text-classification", "bert-ner")  # use appropriate detection model key

def get_translator():
    # Returns a GPU/MPS-aware translation pipeline
    return get_pipeline("translation", "mbart-translate")

# ------------------------------
# Language Detection
# ------------------------------
def detect_language(content: str) -> str:
    if not content.strip():
        return "en"
    try:
        detector = get_detector()
        clean_text = re.sub(r"<[^>]+>", " ", content)
        clean_text = re.sub(r"[\r\n]+", " ", clean_text)
        clean_text = re.sub(r"[^\w\s]+", " ", clean_text)[:LANG_DETECTOR_BOUNDS]
        result = detector(clean_text)
        raw = result[0]["label"].lower().strip()
        return DETECTOR_NAME_TO_ISO.get(raw, "en")
    except Exception as e:
        print("[detect_language] Failed:", e)
        return "en"

# ------------------------------
# Token-aware translation
# ------------------------------
def translate(content: str, target_language: Optional[str] = None) -> Dict[str, Any]:
    if not content.strip():
        return {"status": "fallback", "translation": content, "language": target_language or "en"}

    errors: List[str] = []
    try:
        src_iso = detect_language(content)
        tgt_lang = get_translator_lang(target_language or "en")

        if src_iso == tgt_lang:
            return {"status": "success", "translation": content, "language": tgt_lang, "content": content}

        tokenizer = get_tokenizer()
        translator = get_translator()

        sentences = re.findall(r"[^.!?]+[.!?]*", content) or [content]
        translated: List[str] = []

        for sentence in sentences:
            if not sentence.strip():
                translated.append("")
                continue
            try:
                tokens = tokenizer.encode(sentence, truncation=True, max_length=TRANSLATION_TOKEN_LIMIT)
                safe_text = tokenizer.decode(tokens, skip_special_tokens=True)
                result = translator(safe_text, src_lang=src_iso, tgt_lang=tgt_lang)
                translated.append(result[0].get("translation_text", safe_text))
            except Exception as e:
                print("[translate] sentence failed:", e)
                errors.append(str(e))
                translated.append(sentence)

        return {
            "status": "fallback" if errors else "success",
            "translation": " ".join(translated),
            "language": src_iso,
            "content": content,
            "errors": errors if errors else None,
        }

    except Exception as e:
        return {
            "status": "error",
            "translation": content,
            "language": target_language or "en",
            "content": content,
            "errors": [str(e)],
        }

# ------------------------------
# Batch translation helpers
# ------------------------------
def translate_multiple_titles_ai(titles: List[str], target_language: Optional[str] = None, batch_size: int = 10) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for i in range(0, len(titles), batch_size):
        batch = titles[i:i+batch_size]
        for title in batch:
            results.append(translate(title, target_language))
    return results

def translate_multiple_titles_strings(titles: List[str], target_language: Optional[str] = None, batch_size: int = 10) -> List[str]:
    results = translate_multiple_titles_ai(titles, target_language, batch_size)
    return [r.get("translation") or r.get("content") for r in results]