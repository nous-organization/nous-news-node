import { z } from "zod";

/**
 * Represents a single debug log entry stored in the P2P node.
 */
export const DebugLogEntrySchema = z.object({
	/** Unique ID for this log entry */
	_id: z.string(),

	/** ISO timestamp when the log was created */
	timestamp: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
		message: "Invalid timestamp",
	}),

	/** Human-readable log message */
	message: z.string(),

	/** Log severity level */
	level: z.enum(["info", "warn", "error"]),

	/**
	 * Optional metadata object.
	 * Can include extra details like:
	 * - lastSync: ISO string of last sync time
	 * - port: HTTP server port
	 * - type: category/type of log (e.g., "fetch", "peers")
	 */
	meta: z.record(z.string(), z.any()).optional(),
});

/** TypeScript type for a DebugLogEntry */
export type DebugLogEntry = z.infer<typeof DebugLogEntrySchema>;

/**
 * Helper to validate an object as a DebugLogEntry at runtime
 * @param obj Any object
 * @returns DebugLogEntry if valid, throws ZodError if invalid
 */
export function validateDebugLogEntry(obj: unknown): DebugLogEntry {
	return DebugLogEntrySchema.parse(obj);
}
