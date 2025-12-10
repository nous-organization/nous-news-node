// frontend/server/src/lib/utils.server.ts
import fs from "node:fs";
import path from "node:path";
import { dagCbor } from "@helia/dag-cbor";
import type { Helia } from "helia";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

/**
 * Recursively removes OrbitDB lock files from the specified directory.
 *
 * OrbitDB uses LevelDB under the hood, and LevelDB creates a file named `LOCK`
 * inside each database directory. These lock files prevent the database from
 * being opened by more than one process at the same time.
 *
 * In typical server environments, this is fine. But in development environments
 * — especially when using Wails + embedded Node + hot rebuilds — leftover `LOCK`
 * files can get stranded after a crash or forced reload.
 *
 * When these stale lock files remain, OrbitDB will refuse to open the database,
 * throwing errors such as:
 *
 *   "IO error: lock /orbitdb/.../LOCK: Resource temporarily unavailable"
 *
 * This helper safely removes stale LOCK files before initializing OrbitDB,
 * ensuring that the node can start cleanly.
 *
 * ⚠️ NOTE:
 * This function only removes files literally named `LOCK`. It does NOT touch
 * any database content or metadata. Lock files are safe to delete when the node
 * is not running.
 *
 * @param dir - The root directory to scan for OrbitDB lock files.
 *
 * @example
 * ```ts
 * await cleanLockFiles("/Users/me/orbitdb-databases");
 * ```
 */
export async function cleanLockFiles(dir: string): Promise<void> {
	if (!fs.existsSync(dir)) {
		console.log("cleanLockFiles: Unable to find the directory", dir);
		return;
	}

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.resolve(path.join(dir, entry.name));

		if (entry.isDirectory()) {
			// Only dive into relevant subdirectories
			if (
				["_heads", "_index"].includes(entry.name) ||
				(entry.name !== "_heads" && entry.name !== "_index")
			) {
				await cleanLockFiles(fullPath);
			}
		} else if (entry.name === "LOCK") {
			try {
				fs.unlinkSync(fullPath);
				console.log(`Removed lock file: ${fullPath}`);
			} catch (err) {
				console.warn(`Failed to remove lock file: ${fullPath}`, err);
			}
		}
	}
}


/**
 * Store arbitrary JSON in IPFS using DAG-CBOR and return the CID.
 */
export async function storeInIPFS<T extends Record<string, any>>(
	ipfs: Helia,
	content: T,
): Promise<string> {
	const dag = dagCbor(ipfs);
	const cid = await dag.add(content);
	return cid.toString();
}

/**
 * Generate a content-addressed CID for a JSON-serializable object.
 *
 * This is useful for creating unique, deterministic IDs for documents
 * that can be referenced across IPFS/OrbitDB/Helia.
 *
 * @template T - The type of object to generate a CID for
 * @param doc - Any JSON-serializable object
 * @returns A string representation of the CID
 *
 * @example
 * ```ts
 * const article = { title: "Hello", url: "https://..." };
 * const cid = await generateCID(article);
 * console.log(cid); // "bafy..."
 * ```
 */
export async function generateCID<T extends Record<string, any>>(doc: T): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(doc));
	const hash = await sha256.digest(bytes);
	const cid = CID.create(1, 0x55 /* raw */, hash); // 0x55 = raw
	return cid.toString();
}
