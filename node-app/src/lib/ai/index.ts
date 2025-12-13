// src/lib/ai/index.ts
import { setJobStatus } from "@/lib/jobs";
import { addDebugLog, broadcast } from "@/lib/log";
import type { Article } from "@/types/article";
import type { ArticleAnalyzed } from "@/types/article-analyzed";
import { callPythonAI } from "@/lib/ai/utils"

/**
 * Analyze a single article using the Python backend
 */
export async function analyzeArticle(
  article: Article,
  jobId?: string,
): Promise<ArticleAnalyzed | null> {
  const content = typeof article.content === "string" ? article.content : "";

  if (!content.trim()) {
    if (jobId)
      setJobStatus(jobId, "error", article.source || "unknown", "No content to analyze");
    return null;
  }

  const results: Record<string, any> = {};

  const steps: [string, string][] = [
    ["politicalBias", "/political-bias"],
    ["sentiment", "/sentiment"],
    ["cognitiveBiases", "/cognitive-bias"],
    ["antithesis", "/antithesis"],
    ["philosophical", "/philosophical"],
    // ["tags", "/extract-tags"],
  ];

  for (const [key, endpoint] of steps) {
    try {
      if (jobId)
        setJobStatus(jobId, "running", article.source || "unknown", `Running ${key}`);

      broadcast({
        type: "ai-status",
        payload: { jobId, step: key, status: "running" },
      });

      const resp = await callPythonAI(endpoint, { content });

      results[key] =
        resp.data ??
        (key === "tags"
          ? []
          : key === "antithesis" || key === "philosophical"
          ? ""
          : null);

      broadcast({
        type: "ai-status",
        payload: { jobId, step: key, status: "done" },
      });

      if (jobId)
        setJobStatus(jobId, "running", article.source || "unknown", `${key} done`);
    } catch (err: any) {
      await addDebugLog({
        message: `${key} analysis failed: ${err.message}`,
        level: "warn",
      });

      results[key] =
        key === "tags"
          ? []
          : key === "antithesis" || key === "philosophical"
          ? ""
          : null;

      if (jobId)
        setJobStatus(jobId, "running", article.source || "unknown", `${key} failed`);
    }
  }

  if (jobId)
    setJobStatus(jobId, "done", article.source || "unknown", "Analysis completed");

  return {
    ...article,
    id: crypto.randomUUID(),
    originalId: article.id,
    title: article.title ?? "Untitled",
    url: article.url,
    content,
    analyzed: true,
    politicalBias: results.politicalBias,
    sentiment: results.sentiment,
    cognitiveBiases: results.cognitiveBiases,
    antithesis: results.antithesis,
    philosophical: results.philosophical,
    tags: results.tags,
    source: article.source ?? undefined,
    sourceType: article.sourceType ?? undefined,
    category: article.categories?.[0] ?? undefined,
    author: article.author ?? undefined,
    publishedAt: article.publishedAt ?? undefined,
    edition: article.edition ?? undefined,
    sourceMeta: article.sourceMeta ?? undefined,
    fetchedAt: article.fetchedAt ?? undefined,
    ipfsHash: article.ipfsHash ?? undefined,
    analysisTimestamp: new Date().toISOString(),
  } as ArticleAnalyzed;
}


/**
 * Restore + update background job queue
 * Client calls this → server schedules analysis → returns jobId
 */
export async function analyzeArticleJob(article: Article) {
  const jobId = crypto.randomUUID();

  setJobStatus(jobId, "queued", article.source || "unknown", "Queued");

  // Equivalent to old Node code — queue microtask
  setTimeout(async () => {
    setJobStatus(jobId, "running", article.source || "unknown", "Analysis started");

    try {
      await analyzeArticle(article, jobId);
    } catch (err: any) {
      setJobStatus(
        jobId,
        "error",
        article.source || "unknown",
        err.message || "Analysis failed",
      );
    }
  }, 0);

  return jobId;
}
