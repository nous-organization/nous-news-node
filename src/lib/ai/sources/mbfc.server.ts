/**
 * @file ai/sources/mbfc.server.ts
 * @description
 * Fetch + normalize bias and factuality ratings from Media Bias/Fact Check (MBFC)
 * using the official RapidAPI service.
 *
 * Instructions for users:
 * 1️⃣ Sign up for a RapidAPI account: https://rapidapi.com
 * 2️⃣ Subscribe to the Media Bias Fact Check Ratings API:
 *    https://rapidapi.com/mbfcnews/api/media-bias-fact-check-ratings-api2
 * 3️⃣ Obtain your RapidAPI key.
 * 4️⃣ Set your credentials either as environment variables or constants below:
 *    - Environment variables (preferred):
 *      MBFC_RAPIDAPI_KEY=your_api_key
 *      MBFC_RAPIDAPI_HOST=media-bias-fact-check-ratings-api2.p.rapidapi.com
 *    - Constants (if env vars are not set, for testing/development):
 *      const RAPIDAPI_KEY = "your_api_key";
 *      const RAPIDAPI_HOST = "media-bias-fact-check-ratings-api2.p.rapidapi.com";
 *
 * Notes:
 * - Returns a partial source metadata object (`SourceMetaPartial`)
 * - If the API key or source name is missing, returns `{}`.
 */

import { SourceMetaPartial, Factuality } from "@/types";
import { normalizeBias } from "./helpers";
import { z } from "zod";
import { smartFetch } from "@/lib/fetch.server";

const MBFC_API_BASE = "https://media-bias-fact-check-ratings-api2.p.rapidapi.com/fetch-data";

// Constants fallback if environment variables are not set
const RAPIDAPI_KEY = ""; // Replace with default/test key if needed
const RAPIDAPI_HOST = "media-bias-fact-check-ratings-api2.p.rapidapi.com";

/**
 * MBFC API response object (full structure)
 */
export interface MBFCApiRow {
  Source: string;
  "MBFC URL": string;
  Bias: string;
  Country: string;
  "Factual Reporting": string;
  "Media Type": string;
  "Source URL": string;
  Credibility: string;
  "Source ID#": number;
}

/**
 * Zod schema for MBFC API row validation
 */
export const MBFCApiRowSchema = z.object({
  Source: z.string(),
  "MBFC URL": z.string().url(),
  Bias: z.string(),
  Country: z.string(),
  "Factual Reporting": z.string(),
  "Media Type": z.string(),
  "Source URL": z.string(),
  Credibility: z.string(),
  "Source ID#": z.number(),
});

/**
 * Validate raw MBFC API response using Zod
 * @param data Raw response from MBFC API
 * @returns Parsed array of MBFCApiRow objects
 */
async function parseMbfcApiResponse(data: unknown): Promise<MBFCApiRow[]> {
  return z.array(MBFCApiRowSchema).parse(data);
}

/**
 * In-memory cache for MBFC source metadata
 */
let cache: Record<string, SourceMetaPartial> = {};

/**
 * Normalize MBFC factuality strings to `Factuality` type.
 * @param raw Raw factuality string from MBFC API
 * @returns Normalized `Factuality` value
 */
function normalizeFactuality(raw: string): Factuality {
  const f = raw.toLowerCase();
  if (f.includes("high")) return "high";
  if (f.includes("mostly factual") || f.includes("medium")) return "medium";
  if (f.includes("mixed")) return "medium";
  if (f.includes("low")) return "low";
  return "unknown";
}

/**
 * Fetch MBFC bias metadata for a source via RapidAPI.
 *
 * Uses `smartFetch` to inject a randomized User-Agent and enforce timeouts.
 *
 * @param name Name of the news source
 * @returns Partial source metadata (`SourceMetaPartial`) or `{}` if not found
 *
 * @example
 * fetchMBFC("CNN Digital")
 *   → { mbfc: "lean-left", mbfcFactuality: "high" }
 */
export async function fetchMBFC(name: string): Promise<SourceMetaPartial> {
  if (!name) return {};
  if (cache[name]) return cache[name];

  // Use environment variables if available, otherwise fall back to constants
  const apiKey = process.env.MBFC_RAPIDAPI_KEY || RAPIDAPI_KEY;
  const apiHost = process.env.MBFC_RAPIDAPI_HOST || RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    console.warn("MBFC RapidAPI key or host not provided. Returning empty result.");
    return {};
  }

  try {
    const res = await smartFetch(MBFC_API_BASE, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": apiHost,
        Accept: "application/json",
      },
    });

    const rawData = await res.json();
    const data = await parseMbfcApiResponse(rawData); // ✅ Validate and parse response

    // Find the source (case-insensitive match)
    const row = data.find(
      (s) => s.Source.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (!row) return {};

    const result: SourceMetaPartial = {
      mbfc: normalizeBias(row.Bias),
      mbfcFactuality: normalizeFactuality(row["Factual Reporting"]),
    };

    cache[name] = result;
    return result;
  } catch (err) {
    console.error("MBFC API fetch error:", err);
    return {};
  }
}