/**
 * Coming soon
 * @file sourceManager.server.ts
 * @description Library for managing sources, including user-added sources with validation.
 */

import { z } from "zod";
import { type Source, SourceSchema } from "@/types/source";

/** Simple in-memory storage for demo; can persist in DB */
const USER_SOURCES: Source[] = [];

/**
 * Add a new source with full validation
 * @param newSource Partial source data
 * @returns Source object validated
 */
export function addSource(newSource: Partial<Source>): Source {
	const validated = SourceSchema.parse(newSource);
	USER_SOURCES.push(validated);
	return validated;
}

/**
 * List all sources
 */
export function listSources(): Source[] {
	return USER_SOURCES;
}
