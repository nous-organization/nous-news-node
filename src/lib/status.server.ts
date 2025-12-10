// frontend/server/src/lib/status.server.ts
import fs from "node:fs";
import path from "node:path";
import { STATUS_FILE_PATH } from "@/constants";
import type { NodeStatus } from "@/types";

/**
 * Absolute file path used for persisting node status between server restarts.
 * A simple JSON file is used instead of a database to keep the Node P2P layer portable.
 */
const STATUS_PATH = path.resolve(process.cwd(), STATUS_FILE_PATH);

/**
 * The in-memory representation of the node's current status.
 * This value is authoritative during runtime, while `node-status.json`
 * is used as a persistence layer between launches.
 */
let status: NodeStatus = {
	running: false,
	connected: false,
	syncing: false,
	orbitConnected: false,
	modelsPrefetched: false,
	lastSync: null,
	peers: [],
	logs: [],
	port: 9001,
};

/** Ensure the parent directory exists before writing */
function ensureStatusDir() {
	const dir = path.dirname(STATUS_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Load the most recent node status from the filesystem.
 *
 * If the persistence file exists, its contents are merged with the default
 * in-memory status template. Missing fields are automatically filled with defaults.
 *
 * This function is idempotent and safe to call multiple times.
 *
 * @returns {NodeStatus} The fully hydrated status object.
 *
 * @example
 * ```ts
 * const current = loadStatus();
 * console.log(current.running); // false (if first launch)
 * ```
 */
export function loadStatus(): NodeStatus {
	if (fs.existsSync(STATUS_PATH)) {
		try {
			const data = JSON.parse(fs.readFileSync(STATUS_PATH, "utf-8"));
			status = { ...status, ...data };
		} catch {
			// Corrupted file → fallback to defaults
		}
	}
	return status;
}

/**
 * Update the current in-memory status and persist changes to disk.
 *
 * Only the fields provided in `newStatus` are updated. All others retain
 * their previous values. After merging, the full status object is written
 * to `node-status.json`.
 *
 * @param {Partial<NodeStatus>} newStatus - A subset of fields to update.
 * @returns {NodeStatus} The updated full status object.
 *
 * @example
 * ```ts
 * updateStatus({ connected: true });
 * ```
 */
export function updateStatus(newStatus: Partial<NodeStatus>): NodeStatus {
	status = { ...status, ...newStatus };
	ensureStatusDir();
	fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
	return status;
}

/**
 * Remove the persisted status file (if existing) and reset the in-memory
 * status object to its default template.
 *
 * This is typically called when shutting down the P2P node, or when the
 * frontend (Wails) requests a status wipe.
 *
 * @returns {NodeStatus} The freshly reset status object.
 *
 * @example
 * ```ts
 * deleteStatus();
 * ```
 */
export function deleteStatus(): NodeStatus {
	if (fs.existsSync(STATUS_PATH)) {
		fs.unlinkSync(STATUS_PATH);
	}

	status = {
		running: false,
		connected: false,
		syncing: false,
		modelsPrefetched: false,
		orbitConnected: false,
		lastSync: null,
		peers: [],
		logs: [],
		port: 9001,
	};

	return status;
}

/**
 * Return the current in-memory status without reading from disk.
 * Useful for APIs or in-memory-only consumers.
 *
 * @returns {NodeStatus} The current status object.
 *
 * @example
 * ```ts
 * const s = getStatus();
 * console.log(s.peers.length);
 * ```
 */
export function getStatus(): NodeStatus {
	return status;
}
