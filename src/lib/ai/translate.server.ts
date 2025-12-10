/**
 * @file translation.ts
 * @description
 * Language detection + token-aware translation pipelines using ONNX Transformers.js,
 * with GPT-2 tokenizer truncation to prevent model overflow errors.
 */

import { getPipeline, MODEL_DIR } from "./models.server";
import { getTokenizer } from "./tokenizer.server";

//
// ---------------------------------------------------------
// Configurable Token Limits (adjust globally here)
// ---------------------------------------------------------
export const TRANSLATION_TOKEN_LIMIT = 128;
export const LANG_DETECTOR_BOUNDS = 128;

//
// ---------------------------------------------------------
// Language Maps
// ---------------------------------------------------------
const DEFAULT_LANG = "en_XX";

const LANG_MAP: Record<string, string> = {
	ar: "ar_AR",
	cs: "cs_CZ",
	de: "de_DE",
	en: "en_XX",
	es: "es_XX",
	et: "et_EE",
	fi: "fi_FI",
	fr: "fr_XX",
	gu: "gu_IN",
	hi: "hi_IN",
	it: "it_IT",
	ja: "ja_XX",
	kk: "kk_KZ",
	ko: "ko_KR",
	lt: "lt_LT",
	lv: "lv_LV",
	my: "my_MM",
	ne: "ne_NP",
	nl: "nl_XX",
	ro: "ro_RO",
	ru: "ru_RU",
	si: "si_LK",
	vi: "vi_VN",
	zh: "zh_CN",
	af: "af_ZA",
	az: "az_AZ",
	bn: "bn_IN",
	fa: "fa_IR",
	he: "he_IL",
	hr: "hr_HR",
	id: "id_ID",
	ka: "ka_GE",
	km: "km_KH",
	mk: "mk_MK",
	ml: "ml_IN",
	mn: "mn_MN",
	mr: "mr_IN",
	pl: "pl_PL",
	ps: "ps_AF",
	pt: "pt_XX",
	sv: "sv_SE",
	sw: "sw_KE",
	ta: "ta_IN",
	te: "te_IN",
	th: "th_TH",
	tr: "tr_TR",
	tl: "tl_XX",
	uk: "uk_UA",
	ur: "ur_PK",
	xh: "xh_ZA",
	gl: "gl_ES",
	sl: "sl_SI",
};

const DETECTOR_NAME_TO_ISO: Record<string, string> = {
	arabic: "ar",
	ar: "ar",
	czech: "cs",
	cs: "cs",
	german: "de",
	de: "de",
	english: "en",
	en: "en",
	spanish: "es",
	es: "es",
	estonian: "et",
	et: "et",
	finnish: "fi",
	fi: "fi",
	french: "fr",
	fr: "fr",
	gujarati: "gu",
	gu: "gu",
	hindi: "hi",
	hi: "hi",
	italian: "it",
	it: "it",
	japanese: "ja",
	ja: "ja",
	kazakh: "kk",
	kk: "kk",
	korean: "ko",
	ko: "ko",
	lithuanian: "lt",
	lt: "lt",
	latvian: "lv",
	lv: "lv",
	myanmar: "my",
	my: "my",
	nepali: "ne",
	ne: "ne",
	dutch: "nl",
	nl: "nl",
	romanian: "ro",
	ro: "ro",
	russian: "ru",
	ru: "ru",
	sinhala: "si",
	si: "si",
	vietnamese: "vi",
	vi: "vi",
	chinese: "zh",
	zh: "zh",
	afrikaans: "af",
	af: "af",
	azerbaijani: "az",
	az: "az",
	bengali: "bn",
	bn: "bn",
	persian: "fa",
	fa: "fa",
	hebrew: "he",
	he: "he",
	croatian: "hr",
	hr: "hr",
	indonesian: "id",
	id: "id",
	georgian: "ka",
	ka: "ka",
	khmer: "km",
	km: "km",
	macedonian: "mk",
	mk: "mk",
	malayalam: "ml",
	ml: "ml",
	mongolian: "mn",
	mn: "mn",
	marathi: "mr",
	mr: "mr",
	polish: "pl",
	pl: "pl",
	pashto: "ps",
	ps: "ps",
	portuguese: "pt",
	pt: "pt",
	swedish: "sv",
	sv: "sv",
	swahili: "sw",
	sw: "sw",
	tamil: "ta",
	ta: "ta",
	telugu: "te",
	te: "te",
	thai: "th",
	th: "th",
	turkish: "tr",
	tr: "tr",
	tagalog: "tl",
	tl: "tl",
	ukrainian: "uk",
	uk: "uk",
	urdu: "ur",
	ur: "ur",
	xhosa: "xh",
	xh: "xh",
	galician: "gl",
	gl: "gl",
	slovene: "sl",
	sl: "sl",
};

//
// ---------------------------------------------------------
// Pipeline Caches
// ---------------------------------------------------------
let detectorPipeline: any = null;
let translatorPipeline: any = null;

//
// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
export function getTranslatorLang(lang?: string): string {
	if (!lang) return DEFAULT_LANG;
	const iso = lang.toLowerCase().trim();
	return LANG_MAP[iso] ?? DEFAULT_LANG;
}

async function getDetectorPipeline() {
	if (!detectorPipeline) {
		console.log("[Pipeline] Loading language detector...");
		detectorPipeline = await getPipeline("text-classification", "xlm-lang-detector");
	}
	return detectorPipeline;
}

async function getTranslatorPipeline(srcLang: string, targetLang: string) {
	if (!translatorPipeline) {
		console.log("[Pipeline] Loading translator...");
		// English ↔ major European languages → MBART
		if (srcLang === "en" || targetLang === "en") {
			translatorPipeline = await getPipeline("translation", "mbart-translate", true);
		} else {
			// Non-English → M2M-100 or NLLB-200
			translatorPipeline = await getPipeline("translation", "m2m100", true);
		}
	}
	return translatorPipeline;
}

//
// ---------------------------------------------------------
// Language Detection
// ---------------------------------------------------------
export async function detectLanguage(content: string): Promise<string> {
	if (!content) return "en";
	try {
		const detector = await getDetectorPipeline();
		const cleanText = content
			.replace(/<[^>]+>/g, " ")
			.replace(/[\r\n]+/g, " ")
			.replace(/[^\p{L}\p{N}\s]+/gu, " ")
			.slice(0, LANG_DETECTOR_BOUNDS);

		const result = await detector(cleanText);
		const raw = result?.[0]?.label?.toLowerCase().trim();
		if (!raw || !DETECTOR_NAME_TO_ISO[raw]) {
			console.warn(`[Detect] Unknown label "${raw}", defaulting to "en"`);
			return "en";
		}

		return DETECTOR_NAME_TO_ISO[raw];
	} catch (err) {
		console.warn("[Detect] Failed:", (err as Error).message);
		return "en";
	}
}

//
// ---------------------------------------------------------
// Token-Aware Translation
// ---------------------------------------------------------
export async function translateContentAI(
	content: string,
	targetLanguage?: string,
): Promise<string> {
	if (!content?.trim()) return content;

	try {
		const iso = await detectLanguage(content);

		console.log("iso", iso);

		const srcLang = getTranslatorLang(iso);

		console.log("srcLang", srcLang);
		const tgtLang = getTranslatorLang(targetLanguage ?? "en");
		console.log("tgtLang", tgtLang);
		if (srcLang === tgtLang) return content;

		const tokenizer = await getTokenizer();
		const translator = await getTranslatorPipeline(srcLang, tgtLang);

		const sentences = content.match(/[^.!?]+[.!?]+/g) ?? [content];
		const translated: string[] = [];

		for (const sentence of sentences) {
			if (!sentence.trim()) {
				translated.push("");
				continue;
			}

			const tokens = tokenizer.encode(sentence);
			const truncated = tokens.slice(0, TRANSLATION_TOKEN_LIMIT);
			const safeText = tokenizer.decode(truncated);

			try {
				let result: { translation_text?: string }[];
				console.log("Translating", safeText);
				if (translator.modelId.includes("m2m100")) {
					result = await translator(safeText, {
						src_lang: srcLang,
						tgt_lang: tgtLang,
						use_cache: false,
					});
				} else {
					result = await translator(safeText, {
						src_lang: srcLang,
						tgt_lang: tgtLang,
						use_cache: false,
					});
				}

				console.log(`[translateContentAI] translated: ${result}`);
				translated.push(result[0]?.translation_text ?? safeText);
			} catch {
				translated.push(safeText);
			}
		}

		return translated.join(" ");
	} catch (err) {
		console.warn("[Translate] Failed:", (err as Error).message);
		return content;
	}
}

//
// ---------------------------------------------------------
// Batch Title Translation
// ---------------------------------------------------------
export async function translateMultipleTitlesAI(
	titles: string[],
	targetLanguage?: string,
	batchSize = 10,
): Promise<string[]> {
	if (!titles.length) return [];
	const results: string[] = [];

	for (let i = 0; i < titles.length; i += batchSize) {
		const batch = titles.slice(i, i + batchSize);
		const translated = await Promise.all(
			batch.map(async (title) => {
				try {
					return await translateContentAI(title, targetLanguage);
				} catch {
					return title;
				}
			}),
		);
		results.push(...translated);
	}

	return results;
}
