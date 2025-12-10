import fs from "node:fs";
import path from "node:path";
import { env, type PipelineType, pipeline } from "@xenova/transformers";
import * as ort from "onnxruntime-node";

const MODELS_PATH = path.join(process.cwd(), process.env.MODELS_PATH ?? ".models");

// ------------------------------------------------------
// Transformer Model Loader (Node.js)
// Uses Transformers.js for local inference (WASM / ONNX / WebGPU).
// ------------------------------------------------------
// Set logging level
if (ort.env) {
  ort.env.ORT_LOGGING_LEVEL = 'WARNING'; // VERBOSE, INFO, WARNING, ERROR, FATAL
} else {
  console.warn('onnxruntime-node env object not available, skipping ORT_LOGGING_LEVEL');
}
// Allow local and remote model loading
env.allowLocalModels = true;
env.allowRemoteModels = true;

// Base directory: where downloaded model files are cached
export const MODEL_DIR = path.resolve("./.models");

/**
 * Map of human‑readable model keys → HuggingFace repo IDs
 */
export const MODELS: Record<string, string> = {
	// Sentiment / NER / Summarization / Embeddings
	"distilbert-sst2": "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
	"bert-ner": "Xenova/bert-base-multilingual-cased-ner-hrl",
	"distilbart-cnn": "Xenova/distilbart-cnn-6-6",
	"minilm-embed": "Xenova/all-MiniLM-L6-v2",

	// Language detection
	"xlm-lang-detector": "dnouv/xlm-roberta-base-language-detection-tfjs",

	// Catch-all translation
	"mbart-translate": "Xenova/mbart-large-50-many-to-many-mmt",

	m2m100: "facebook/m2m100_418M",
	nllb200: "facebook/nllb-200-distilled-600M",

	// Language-specific MarianMT models for English ↔ target
	// "opus-mt-fr-en": "Helsinki-NLP/opus-mt-fr-en",
	// "opus-mt-es-en": "Helsinki-NLP/opus-mt-es-en",
	// "opus-mt-de-en": "Helsinki-NLP/opus-mt-de-en",
	// "opus-mt-it-en": "Helsinki-NLP/opus-mt-it-en",
	// "opus-mt-pt-en": "Helsinki-NLP/opus-mt-pt-en",
	// "opus-mt-nl-en": "Helsinki-NLP/opus-mt-nl-en",
	// "opus-mt-ru-en": "Helsinki-NLP/opus-mt-ru-en",
	// "opus-mt-pl-en": "Helsinki-NLP/opus-mt-pl-en",
	// "opus-mt-sv-en": "Helsinki-NLP/opus-mt-sv-en",
	// "opus-mt-ja-en": "Helsinki-NLP/opus-mt-ja-en",
	// "opus-mt-zh-en": "Helsinki-NLP/opus-mt-zh-en",
	// "opus-mt-hi-en": "Helsinki-NLP/opus-mt-hi-en",
	// "opus-mt-vi-en": "Helsinki-NLP/opus-mt-vi-en",
	// "opus-mt-th-en": "Helsinki-NLP/opus-mt-th-en",
	// "opus-mt-ar-en": "Helsinki-NLP/opus-mt-ar-en",
	// "opus-mt-tr-en": "Helsinki-NLP/opus-mt-tr-en",
	// "opus-mt-fa-en": "Helsinki-NLP/opus-mt-fa-en",
	// "opus-mt-ko-en": "Helsinki-NLP/opus-mt-ko-en",

	// English → target
	// "opus-mt-en-fr": "Helsinki-NLP/opus-mt-en-fr",
	// "opus-mt-en-es": "Helsinki-NLP/opus-mt-en-es",
	// "opus-mt-en-de": "Helsinki-NLP/opus-mt-en-de",
	// "opus-mt-en-it": "Helsinki-NLP/opus-mt-en-it",
	// "opus-mt-en-pt": "Helsinki-NLP/opus-mt-en-pt",
	// "opus-mt-en-nl": "Helsinki-NLP/opus-mt-en-nl",
	// "opus-mt-en-ru": "Helsinki-NLP/opus-mt-en-ru",
	// "opus-mt-en-pl": "Helsinki-NLP/opus-mt-en-pl",
	// "opus-mt-en-sv": "Helsinki-NLP/opus-mt-en-sv",
	// "opus-mt-en-ja": "Helsinki-NLP/opus-mt-en-ja",
	// "opus-mt-en-zh": "Helsinki-NLP/opus-mt-en-zh",
	// "opus-mt-en-hi": "Helsinki-NLP/opus-mt-en-hi",
	// "opus-mt-en-vi": "Helsinki-NLP/opus-mt-en-vi",
	// "opus-mt-en-th": "Helsinki-NLP/opus-mt-en-th",
	// "opus-mt-en-ar": "Helsinki-NLP/opus-mt-en-ar",
	// "opus-mt-en-tr": "Helsinki-NLP/opus-mt-en-tr",
	// "opus-mt-en-fa": "Helsinki-NLP/opus-mt-en-fa",
	// "opus-mt-en-ko": "Helsinki-NLP/opus-mt-tc-big-en-ko",

	// Text generation fallback
	gpt2: "Xenova/gpt2",
};

/**
 * Cache for loaded pipelines (task + modelKey → Promise<pipeline instance>)
 */
const PIPELINE_CACHE: Record<string, Promise<any> | undefined> = {};

/**
 * Check if local model folder exists.
 * Resolves the actual folder from the MODELS map.
 *
 * @param modelKey Key from MODELS
 * @returns True if local folder exists
 */
function localModelExists(modelKey: string): boolean {
	const modelRepo = MODELS[modelKey] ?? modelKey;
	const modelPath = path.join(MODEL_DIR, modelRepo);
	return fs.existsSync(modelPath) && fs.statSync(modelPath).isDirectory();
}

/**
 * Load or retrieve a cached pipeline.
 *
 * @param task Pipeline task (e.g. "text-classification", "feature-extraction", "text-generation", ...)
 * @param modelKey Key from MODELS, or a full repo string
 * @param localFilesOnly Whether to use local model files only (default: true)
 * @returns A ready-to-use pipeline instance
 * @throws Error if localFilesOnly=true and model folder is missing
 */
export async function getPipeline(
	task: PipelineType,
	modelKey: string,
	localFilesOnly = false,
	modelPath?: string,
): Promise<any> {
	const cacheKey = `${task}:${modelKey}`;
	if (PIPELINE_CACHE[cacheKey]) return await PIPELINE_CACHE[cacheKey];

	const modelRepo = MODELS[modelKey] ?? modelKey;

	// Only check local folder for warning/logging
	if (localFilesOnly) {
		const localPath = path.join(MODEL_DIR, modelRepo);
		if (!fs.existsSync(localPath)) {
			throw new Error(
				`Local model for '${modelKey}' not found in ${localPath}.`,
			);
		}
	}

	const _modelPath = path.join(MODEL_DIR, modelRepo);

	const pipelinePromise = pipeline(task, modelRepo, {
		local_files_only: localFilesOnly,
		cache_dir: modelPath ? modelPath : _modelPath,
	});

	PIPELINE_CACHE[cacheKey] = pipelinePromise;
	return await pipelinePromise;
}

/**
 * Prefetch all known models into memory at startup.
 * Skips models that already exist on disk.
 */
export async function prefetchModels(): Promise<void> {
  if (!fs.existsSync(MODELS_PATH)) fs.mkdirSync(MODELS_PATH, { recursive: true });

  for (const key of Object.keys(MODELS)) {
    const modelPath = path.join(MODELS_PATH, key);

    // Skip prefetch if model already exists
    if (fs.existsSync(modelPath)) {
      console.log(`Model '${key}' already exists. Skipping prefetch.`);
      continue;
    }

    try {
      console.log(`Prefetching model '${key}'...`);

      let task: PipelineType = "feature-extraction";
      if (key.includes("sst2")) task = "text-classification";
      else if (key.includes("ner")) task = "token-classification";
      else if (key.includes("bart") || key.includes("cnn"))
        task = "summarization";
      else if (key.includes("translate") || key.includes("mbart"))
        task = "translation";
      else if (key === "gpt2") task = "text-generation";

      await getPipeline(task, key, false); // fetch if missing
      console.log(`Model '${key}' prefetched successfully.`);
    } catch (err) {
      console.error(`Failed to prefetch model '${key}':`, err);
    }
  }
}