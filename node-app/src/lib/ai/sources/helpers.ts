/**
 * @file ai/sources/helpers.ts
 * @description
 * Utilities for converting external political bias labels into our
 * internal `PoliticalBias` enum and computing a unified bias rating
 * from multiple providers (Ad Fontes, AllSides, MBFC).
 */

import { PoliticalBias } from "@/types";

/**
 * Normalize an external textual bias label into our internal `PoliticalBias` type.
 *
 * This function handles noisy or inconsistent provider formats:
 * - "Left-Center", "Lean Left", "Left-Centre" → "lean-left"
 * - "Extreme Right", "Far Right" → "right"
 * - "Center", "Centrist" → "center"
 * - Otherwise → "unknown"
 *
 * @param raw - Freeform text label from a provider
 * @returns A normalized `PoliticalBias` value
 *
 * @example
 * normalizeBias("Left-Center") // → "lean-left"
 *
 * @example
 * normalizeBias("Extreme Right") // → "right"
 */
export function normalizeBias(raw: string): PoliticalBias {
  const str = raw.trim().toLowerCase();

  // Strong/extreme cases
  if (str.includes("extreme left") || str.includes("far-left"))
    return "left";
  if (str.includes("extreme right") || str.includes("far-right"))
    return "right";

  // Leaning categories
  if (str.includes("lean left") || str.includes("left-center") || str.includes("left centre"))
    return "lean-left";
  if (str.includes("lean right") || str.includes("right-center") || str.includes("right centre"))
    return "lean-right";

  // Center
  if (str.includes("center") || str.includes("centre"))
    return "center";

  return "unknown";
}

/**
 * Compute a unified political bias rating from multiple provider ratings.
 *
 * Providers include (but are not limited to):
 * - Ad Fontes
 * - AllSides
 * - Media Bias / Fact Check (MBFC)
 *
 * Strategy:
 * 1. Collect all non-null provider values
 * 2. Count occurrences
 * 3. Return the majority bias
 * 4. On a tie, the first in alphabetical order **does NOT** matter — the majority reducer picks consistently
 * 5. If all are missing → "unknown"
 *
 * @param adf - Bias rating from Ad Fontes
 * @param alls - Bias rating from AllSides
 * @param mbfc - Bias rating from MBFC
 *
 * @returns A unified `PoliticalBias` value
 *
 * @example
 * computeUnifiedBias("lean-left", "left", "lean-left") // → "lean-left"
 *
 * @example
 * computeUnifiedBias(undefined, "center", "center") // → "center"
 *
 * @example
 * computeUnifiedBias(undefined, undefined, undefined) // → "unknown"
 */
export function computeUnifiedBias(
  adf?: PoliticalBias,
  alls?: PoliticalBias,
  mbfc?: PoliticalBias
): PoliticalBias {
  const votes = [adf, alls, mbfc].filter(Boolean) as PoliticalBias[];

  if (!votes.length) return "unknown";

  const counts: Record<PoliticalBias, number> = {
    left: 0,
    "lean-left": 0,
    center: 0,
    "lean-right": 0,
    right: 0,
    unknown: 0,
  };

  for (const v of votes) counts[v]++;

  // Pick the category with the highest vote count
  return (
    Object.entries(counts).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] as PoliticalBias
  );
}