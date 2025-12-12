import type { PoliticalBias } from "./article";
import type { Factuality, Ownership } from "./source";

/**
 * A minimal partial metadata record holding raw values fetched from
 * individual rating providers (Ad Fontes, AllSides, MBFC) before any
 * normalization, merging, or transformation into `SourceMetaFull`.
 *
 * This structure is used by:
 *  - provider adapters (adfontes, allsides, mbfc)
 *  - merge/normalization functions
 *  - caching layers that temporarily store partial results
 */
export interface SourceMetaPartial {
	/**
	 * Political bias rating from Ad Fontes Media.
	 * This represents the *political bias* dimension only, not reliability.
	 */
	adFontes?: PoliticalBias;

	/**
	 * Reliability score from Ad Fontes Media.
	 * Typically 0–64 in their content reliability scale.
	 */
	adFontesReliability?: number;

	/**
	 * Political bias rating from AllSides.
	 * Values follow the unified `PoliticalBias` enum.
	 */
	allSides?: PoliticalBias;

	/**
	 * Political bias rating from Media Bias/Fact Check.
	 * Represents MBFC’s ideological classification.
	 */
	mbfc?: PoliticalBias;

	/**
	 * Factuality score from Media Bias/Fact Check.
	 * One of: "high" | "medium" | "low" | "unknown".
	 */
	mbfcFactuality?: Factuality;
}

/**
 * Aggregated, normalized metadata for a news source.
 *
 * Combines bias scores, factuality ratings, and structured ownership
 * information from multiple third-party classification providers.
 *
 * This is the final unified representation used throughout the app.
 */
export interface SourceMetaFull {
	/**
	 * Name of the news source (e.g., "BBC News", "Fox News").
	 * This serves as the primary key for lookup.
	 */
	name: string;

	/**
	 * Bias rating according to Ad Fontes Media.
	 * Normalized into your internal PoliticalBias enum.
	 */
	adFontes?: PoliticalBias;

	/**
	 * Reliability score from Ad Fontes Media.
	 * Typically a number ranging from 0–64 (higher = more reliable).
	 * Not all sources include this data.
	 */
	adFontesReliability?: number;

	/**
	 * Bias rating according to AllSides Media.
	 * Derived from AllSides' bias table (scraped or via dataset).
	 */
	allSides?: PoliticalBias;

	/**
	 * Bias rating according to Media Bias / Fact Check.
	 * Normalized into your internal PoliticalBias enum.
	 */
	mbfc?: PoliticalBias;

	/**
	 * Factuality rating from Media Bias / Fact Check.
	 * Values include: "high", "medium", "low", "unknown".
	 */
	mbfcFactuality?: Factuality;

	/**
	 * Unified majority-vote bias after combining
	 * Ad Fontes, AllSides, and MBFC bias results.
	 */
	unifiedBias?: PoliticalBias;

	/**
	 * Overall factuality rating.
	 * Used when MBFC factuality is unavailable or overridden by your own data.
	 */
	factuality?: Factuality;

	/**
	 * Structured ownership information (company, type, country).
	 * Follows the OwnershipSchema (private, government, NGO, etc.).
	 */
	ownership?: Ownership;

	/**
	 * ISO8601 timestamp indicating when this metadata was last updated.
	 * Example: "2025-11-28T14:32:10.123Z"
	 */
	lastUpdated?: string;
}
