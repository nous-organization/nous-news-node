// src/types/results.ts
export interface NormalizedArticleResults {
	content: string;
	summary: string;
	tags: string[];
	language?: string;
	errors?: string[]; // Collect errors from translation, summarization, tags
	status: "success" | "partial" | "error"; // Added status
}
