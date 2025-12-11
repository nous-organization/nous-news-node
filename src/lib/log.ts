// server/src/server/log.ts

import { getRunningInstance, type NodeInstance } from "@/node";
import type { DebugLogEntry } from "@/types";

/**
 * Simple console log function for P2P backend code
 */
export function log(message: string, level: "info" | "warn" | "error" = "info") {
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
 * Allows us to broadcast an event 
 * @param event 
 */
export function broadcast(event: any) {
  try {
    if (broadcastFn) broadcastFn(event);
  } catch {}
}

/**
 * addDebugLog now just logs to console and optionally broadcasts
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
		meta: { ...(entry.meta ?? null), type: entry.type ?? "" },
	};

	// local console output
	const prefix = `[DEBUG] ${logEntry.timestamp} - ${logEntry.message}`;
	if (logEntry.level === "warn") console.warn(prefix);
	else if (logEntry.level === "error") console.error(prefix);
	else console.log(prefix);

	// Broadcast to any live WS clients
	try {
		if (broadcastFn) {
			broadcastFn({ type: "debug-log", payload: logEntry });
		}
	} catch (e) {
		// ignore broadcast failures
	}

	const runningInstance = getRunningInstance();
	if (!runningInstance) {
		return;
	}
	const { debugDB } = runningInstance;

	try {
		// Log the error to the debug db
		if (debugDB && save) {
			await debugDB.add(logEntry);
		} else {
			// Log the error asynchronously; failures are silently ignored
			log(entry.message, entry.level ?? "info");
		}
	} catch {}
}
