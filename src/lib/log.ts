import { add as addDebugDBEntry } from "@/p2p/orbitdb/stores/debug";
import type { DebugLogEntry } from "@/types";

/**
 * Simple console log function for P2P backend code
 */
export function log(
	message: string,
	level: "info" | "warn" | "error" = "info",
) {
	const timestamp = new Date().toISOString();
	const formatted = `${timestamp} - ${message}`;

	switch (level) {
		case "warn":
			console.warn(formatted);
			break;
		case "error":
			console.error(formatted);
			break;
		default:
			console.log(formatted);
	}
}

// Optional broadcaster callback for live events (set by HTTP server)
let broadcastFn: ((ev: any) => void) | null = null;
export function setBroadcastFn(fn: (ev: any) => void) {
	broadcastFn = fn;
}

/**
 * Allows broadcasting an event to any registered listener
 */
export function broadcast(event: any) {
	try {
		if (broadcastFn) broadcastFn(event);
	} catch {}
}

/**
 * Adds a debug log entry
 * @param entry - log message + optional metadata
 * @param save - whether to persist to OrbitDB (default true)
 */
export async function addDebugLog(
	entry: {
		message: string;
		level?: "info" | "warn" | "error";
		meta?: Record<string, any>;
		type?: string;
	},
	save = true,
) {
	const logEntry: DebugLogEntry = {
		_id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		message: entry.message,
		level: entry.level ?? "info",
		meta: { ...(entry.meta ?? {}), type: entry.type ?? "" },
	};

	// local console output
	const prefix = `[DEBUG] ${logEntry.timestamp} - ${logEntry.message}`;
	switch (logEntry.level) {
		case "warn":
			console.warn(prefix);
			break;
		case "error":
			console.error(prefix);
			break;
		default:
			console.log(prefix);
	}

	// Broadcast to any live WS clients
	if (broadcastFn) {
		try {
			broadcastFn({ type: "debug-log", payload: logEntry });
		} catch {
			// ignore broadcast errors
		}
	}

	// Persist to OrbitDB if requested
	if (save) {
		try {
			await addDebugDBEntry(logEntry);
		} catch (err) {
			console.error("❌ Failed to persist debug log:", (err as Error).message);
		}
	}
}
