// src/p2p/orbitdb/db-paths.ts
import fs from "node:fs";
import path from "node:path";
import { DB_PATH_FILE_PATH } from "@/constants";

/** OrbitDB paths persisted between restarts */
export interface DBPaths {
	articles?: string;
	analyzed?: string;
	debug?: string;
	federated?: string;
}

/** Absolute file for persisting DB paths */
const DB_REFERENCE_PATH = path.resolve(process.cwd(), DB_PATH_FILE_PATH);

/** Load saved DB paths from disk */
export function loadDBPaths(): DBPaths | null {
	if (!fs.existsSync(DB_REFERENCE_PATH)) {
		return null;
	}

	try {
		const data = fs.readFileSync(DB_REFERENCE_PATH, "utf8");
		return JSON.parse(data) as DBPaths;
	} catch (err) {
		console.error("Failed to load DB paths file:", err);
		return null;
	}
}

/** Save DB paths to disk */
export function saveDBPaths(paths: DBPaths) {
	try {
		const dir = path.dirname(DB_REFERENCE_PATH);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

		fs.writeFileSync(DB_REFERENCE_PATH, JSON.stringify(paths, null, 2), "utf8");
	} catch (err) {
		console.error("Failed to save DB paths file:", err);
	}
}
