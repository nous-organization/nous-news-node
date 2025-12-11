// src/lib/sources.ts
import fs from "node:fs/promises";
import path from "node:path";
import type { Source } from "@/types";

const DATA_PATH = path.join(process.cwd(), "data");
const SOURCES_FILE = path.join(DATA_PATH, "sources.json");

/**
 * Load saved sources from disk, if exists
 */
export async function loadSources(): Promise<Source[] | null> {
	try {
		await fs.mkdir(DATA_PATH, { recursive: true });

		const file = await fs.readFile(SOURCES_FILE, "utf-8");
		return JSON.parse(file) as Source[];
	} catch (err: any) {
		if (err.code === "ENOENT") return null; // no file yet
		console.error("Failed to load sources.json:", err);
		return null;
	}
}

/**
 * Persist sources.json to disk
 */
export async function saveSources(sources: Source[]) {
	await fs.mkdir(DATA_PATH, { recursive: true });
	await fs.writeFile(SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
}
