/**
 * @file ai/sources/allsides.server.ts
 * @description
 * Provides functions to fetch AllSides media bias ratings using the official API.
 *
 * Features:
 * - Supports search by source name
 * - Supports pagination
 * - Normalizes bias titles to a consistent format
 *
 * Returns a partial source metadata object (`SourceMetaPartial`)
 */

import { SourceMetaPartial } from "@/types";
import { normalizeBias } from "./helpers";
import { z } from "zod";
import { smartFetch } from "@/lib/fetch.server";

const ALLSIDES_API_BASE = "https://www.allsides.com/api/media-bias-ratings";

/**
 * AllSides API node schema
 */
export const AllSidesNodeSchema = z.object({
  __typename: z.string(),
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  path: z.string(),
  newsSourceType: z
    .object({
      __typename: z.string(),
      id: z.union([z.string(), z.number()]),
      name: z.string(),
    })
    .nullable(),
  featuredBiasRating: z.boolean(),
  newsBias: z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(), // e.g., "Lean Left", "Left", "Center"
    path: z.string(),
    biasImage: z.object({
      url: z.string().url().optional(),
    }),
  }),
});

/**
 * AllSides API response schema
 */
export const AllSidesApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    results: z.array(AllSidesNodeSchema),
    pageInfo: z.object({
      total: z.number(),
      pageSize: z.number(),
      page: z.number(),
      offset: z.number(),
    }),
  }),
});

/**
 * Parse and validate the API response
 */
async function parseAllSidesApiResponse(data: unknown) {
  return AllSidesApiResponseSchema.parse(data);
}

/**
 * Options for fetching AllSides data
 */
export interface FetchAllSidesOptions {
  /** Search term for the news source (optional) */
  search?: string;
  /** Page number for paginated results (optional, default 0) */
  page?: number;
  /** Include only featured bias ratings (optional, default true) */
  featured?: boolean;
}

/**
 * Cache to avoid repeated API requests
 * Keyed by `search|page|featured` → table of source→bias
 */
let cache: Record<string, Record<string, string>> = {};

/**
 * Load AllSides data from API with optional search and paging
 */
async function loadAllSidesData(options: FetchAllSidesOptions = {}): Promise<Record<string, string>> {
  const page = options.page ?? 0;
  const search = options.search ?? "";
  const featured = options.featured !== undefined ? options.featured : true;

  const cacheKey = `${search.toLowerCase()}|${page}|${featured}`;
  if (cache[cacheKey]) return cache[cacheKey];

  try {
    const url = new URL(ALLSIDES_API_BASE);
    url.searchParams.set("pageNumber", page.toString());
    url.searchParams.set("search", search);
    url.searchParams.set("featured", String(featured));

    const res = await smartFetch(url.toString());
    const rawData = await res.json();
    const data = await parseAllSidesApiResponse(rawData);

    const table: Record<string, string> = {};
    for (const node of data.data.results) {
      table[node.title.trim()] = node.newsBias.title;
    }

    cache[cacheKey] = table;
    return table;
  } catch (err) {
    console.error("AllSides API fetch error:", err);
    return {};
  }
}

/**
 * Fetch AllSides bias metadata for a source
 *
 * @param name Source name
 * @param options Optional search/page/featured settings
 * @returns Partial source metadata (`SourceMetaPartial`) or {} if not found
 */
export async function fetchAllSides(
  name: string,
  options: FetchAllSidesOptions = {}
): Promise<SourceMetaPartial> {
  if (!name) return {};

  const table = await loadAllSidesData(options);
  const raw = table[name];
  if (!raw) return {};

  return { allSides: normalizeBias(raw) };
}