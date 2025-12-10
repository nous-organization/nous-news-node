// server/src/server/log.server.ts

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

/**
 * Stub function: addDebugLog now just logs to console
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
