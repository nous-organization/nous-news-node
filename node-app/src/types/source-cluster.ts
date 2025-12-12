// frontend/src/types/source-cluster.ts
import { z } from "zod";
import { type PoliticalBias, PoliticalBiasValues } from "./article";

/**
 * Represents a single source's contribution to a story cluster.
 */
export const SourceClusterSchema = z.object({
	/** Name of the source (e.g., "BBC News") */
	name: z.string(),

	/** Political bias of the source, using our existing PoliticalBias type */
	bias: z.enum(PoliticalBiasValues),

	/** Optional URL of the article contributing to the story */
	articleUrl: z.string().url().optional(),
});

export type SourceCluster = z.infer<typeof SourceClusterSchema>;

/**
 * Coverage percentages per political bias for the story cluster.
 * Values are 0-100 (percentage of sources covering this story by bias).
 */
export const CoverageSchema = z.object({
	left: z.number().min(0).max(100),
	"lean-left": z.number().min(0).max(100),
	center: z.number().min(0).max(100),
	"lean-right": z.number().min(0).max(100),
	right: z.number().min(0).max(100),
	unknown: z.number().min(0).max(100),
});

export type Coverage = z.infer<typeof CoverageSchema>;

/**
 * Represents a cluster of articles covering the same story.
 * This allows for cross-source analytics, bias distribution, and blindspot detection.
 */
export const StoryClusterSchema = z.object({
	/** Unique identifier for the story cluster (hash, UUID, etc.) */
	storyId: z.string(),

	/** List of sources contributing to this story */
	sources: z.array(SourceClusterSchema),

	/** Coverage metrics by political bias */
	coverage: CoverageSchema,

	/** Optional canonical title for the story */
	title: z.string().optional(),

	/** Optional summary/abstract representing the cluster */
	summary: z.string().optional(),

	/** Optional timestamp for when the cluster was created or updated */
	lastUpdated: z.string().optional(),
});

export type StoryCluster = z.infer<typeof StoryClusterSchema>;

/**
 * Utility function to compute coverage percentages from a list of sources.
 */
export function computeCoverage(sources: SourceCluster[]): Coverage {
	const counts: Record<PoliticalBias, number> = {
		left: 0,
		"lean-left": 0,
		center: 0,
		"lean-right": 0,
		right: 0,
		unknown: 0,
	};

	sources.forEach((s) => {
		counts[s.bias] = (counts[s.bias] || 0) + 1;
	});

	const total = sources.length || 1; // avoid division by zero

	return {
		left: (counts.left / total) * 100,
		"lean-left": (counts["lean-left"] / total) * 100,
		center: (counts.center / total) * 100,
		"lean-right": (counts["lean-right"] / total) * 100,
		right: (counts.right / total) * 100,
		unknown: (counts.unknown / total) * 100,
	};
}
