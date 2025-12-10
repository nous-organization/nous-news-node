/**
 * @file topicCoverage.server.ts
 * @description Track topic coverage per source and detect blindspots.
 */

import type { ArticleAnalyzed } from "@/types/article-analyzed";

/** Topic coverage per source */
export interface TopicCoverage {
	source: string;
	topics: Record<string, number>; // topic name => number of articles
	totalArticles: number;
}

/** Blindspot report per user */
export interface BlindspotReport {
	topic: string;
	underrepresentedBias: "left" | "right" | "center";
	coveragePercent: number;
}

/**
 * Aggregate topics per source from analyzed articles
 * @param articles Array of analyzed articles
 * @returns Map source => TopicCoverage
 */
export function aggregateTopics(articles: ArticleAnalyzed[]): Record<string, TopicCoverage> {
	const coverage: Record<string, TopicCoverage> = {};
	for (const art of articles) {
		const source = art.source ?? "unknown";
		if (!coverage[source]) coverage[source] = { source, topics: {}, totalArticles: 0 };
		coverage[source].totalArticles += 1;
		if (art.tags) {
			for (const t of art.tags) {
				coverage[source].topics[t] = (coverage[source].topics[t] || 0) + 1;
			}
		}
	}
	return coverage;
}

/**
 * Detect blindspots: topics underreported from a political bias perspective.
 * @param articles Array of analyzed articles
 * @param threshold Percent threshold to flag a blindspot (0-100)
 */
export function detectBlindspots(articles: ArticleAnalyzed[], threshold = 20): BlindspotReport[] {
	const topicBiasMap: Record<string, Record<string, number>> = {};
	const totalPerTopic: Record<string, number> = {};

	for (const art of articles) {
		const topics = art.tags ?? ["unknown"];
		const bias = art.politicalBias ?? "center";
		for (const t of topics) {
			topicBiasMap[t] ??= {};
			topicBiasMap[t][bias] = (topicBiasMap[t][bias] || 0) + 1;
			totalPerTopic[t] = (totalPerTopic[t] || 0) + 1;
		}
	}

	const blindspots: BlindspotReport[] = [];
	for (const t of Object.keys(topicBiasMap)) {
		for (const bias of ["left", "center", "right"]) {
			const percent = ((topicBiasMap[t][bias] ?? 0) / totalPerTopic[t]) * 100;
			if (percent < threshold) {
				blindspots.push({
					topic: t,
					underrepresentedBias: bias as "left" | "center" | "right",
					coveragePercent: percent,
				});
			}
		}
	}
	return blindspots;
}
