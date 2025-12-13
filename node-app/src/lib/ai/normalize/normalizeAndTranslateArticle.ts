// src/lib/ai/normalize/normalizeAndTranslateArticle.ts
import { cleanHTML, callPythonAI } from "@/lib/ai/utils";
import type { NormalizedArticleResults } from "@/types";

/**
 * Normalize and optionally translate an article using the unified Python AI endpoint.
 */
export async function normalizeAndTranslateArticle(
  rawHTML: string,
  targetLanguage = "en"
): Promise<NormalizedArticleResults> {
  const content = cleanHTML(rawHTML);

  try {
    const resp = await callPythonAI("/normalize", {
      raw_html: rawHTML,
      target_language: targetLanguage,
    });

    // Expect the Python response to already include:
    // content, summary, tags, language, errors, status
    return resp as NormalizedArticleResults;

  } catch (err: any) {
    const msg = err?.message ?? "Unknown normalization error";
    console.warn("[normalizeAndTranslateArticle] normalize endpoint failed:", msg);

    // Fallback minimal result
    return {
      content,
      summary: content.split(/(?<=[.!?])\s+/).slice(0, 3).join(" "),
      tags: [],
      language: targetLanguage,
      errors: [msg],
      status: "error",
    };
  }
}

