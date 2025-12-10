// src/types/article-analyzed.ts
import { z } from "zod";
import {
	ArticleSchema,
	editions,
	PoliticalBiasValues,
	SourceMetaSchema,
	SourceTypes,
} from "./article";

/** Cognitive bias detection output from AI */
export const CognitiveBiasSchema = z.object({
	/** Name of the detected cognitive bias (e.g., "Appeal to Emotion") */
	bias: z.string(),
	/** Exact snippet from the article that shows the bias */
	snippet: z.string(),
	/** Short layman's explanation */
	explanation: z.string(),
	/** Severity: low, medium, high */
	severity: z.enum(["low", "medium", "high"]),
	/** Detailed description of the cognitive bias */
	description: z.string().optional(),
	/** Category of the bias (e.g., "Framing", "Confirmation Bias") */
	category: z.string().optional(),
});

/**
 * Schema for analyzed news articles with enriched AI features
 */
export const ArticleAnalyzedSchema = ArticleSchema.extend({
	/** Unique identifier for the article (hash, UUID, etc.) */
	id: z.string(),

	/** Reference to the original article (hash, UUID, etc.) */
	originalId: z.string(),

	// ----------------------
	// AI / Feature-Enriched Fields
	// ----------------------

	/** Political/ideological bias of the article (optional) */
	politicalBias: z.enum(PoliticalBiasValues).optional(),

	/** Concise summary of opposing viewpoints (antithesis), optional */
	antithesis: z.string().optional(),

	/** Philosophical or thematic interpretation, optional */
	philosophical: z.string().optional(),

	/** Overall sentiment, e.g., positive/negative/neutral, optional */
	sentiment: z.string().optional(),

	/** Sentiment valence score (-1 to 1) */
	sentimentValence: z.number().min(-1).max(1).optional(),

	/** Array of detected cognitive biases (AI-driven analysis) */
	cognitiveBiases: z.array(CognitiveBiasSchema).optional(),

	/** Level of clickbait in the article (low, medium, high) */
	clickbaitLevel: z.enum(["low", "medium", "high", "unknown"]).optional(),

	/** Credibility of the article (low, medium, high) */
	credibilityLevel: z.enum(["low", "medium", "high", "unknown"]).optional(),

	/** Emotional content of the article */
	emotionalPalette: z
		.object({
			/** Dominant emotion */
			dominant: z.string(),
			/** Secondary emotion */
			secondary: z.string().optional(),
		})
		.optional(),

	/** Readability metrics */
	readability: z
		.object({
			fleschEase: z.number().optional(),
			fleschGrade: z.number().optional(),
			readingLevel: z.string().optional(),
		})
		.optional(),

	/** Subjectivity level (low, medium, high) */
	subjectivityLevel: z.enum(["low", "medium", "high", "unknown"]).optional(),

	/** Trustworthiness score (numeric, e.g., 1-5) */
	trustworthiness: z.number().min(1).max(5).optional(),

	// ----------------------
	// Analysis Flags / Tracking
	// ----------------------

	/** Timestamp when analysis was performed */
	analysisTimestamp: z.string().optional(),

	// ----------------------
	// Optional Future-Proof Fields
	// ----------------------

	/** Confidence score of the analysis (0-1) */
	analysisConfidence: z.number().min(0).max(1).optional(),
});

export type ArticleAnalyzed = z.infer<typeof ArticleAnalyzedSchema>;
export type CognitiveBias = z.infer<typeof CognitiveBiasSchema>;
