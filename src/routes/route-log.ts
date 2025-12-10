// frontend/src/p2p/routes/route-log.ts
import type { Router } from "express";
import { log } from "@/lib/log.server";
import type { DebugLogEntry } from "@/types/log";

/**
 * Registers debug log routes on an Express router.
 *
 * @param router - Express Router instance
 * @param debugDB - DebugDB instance from setupDebugDB
 */
export function registerDebugLogRoutes(router: Router, debugDB: any) {
	/**
	 * GET /debug/logs
	 *
	 * Returns all debug logs from the OrbitDB debug DB.
	 */
	router.get("/debug/logs", async (req, res) => {
		if (!debugDB?.getAll) {
			log("❌ Debug DB getAll() not available", "error");
			return res.status(500).json({ error: "Debug DB getAll() not available" });
		}

		try {
			const logs = await debugDB.getAll();
			return res.status(200).json(logs);
		} catch (err) {
			const msg = (err as Error).message || "Unknown error reading debug logs";
			log(`❌ ${msg}`, "error");
			return res.status(500).json({ error: msg });
		}
	});

	/**
	 * POST /debug/log
	 *
	 * Adds a log entry to the OrbitDB debug DB.
	 */
	router.post("/debug/log", async (req, res) => {
		if (!debugDB?.add) {
			log("❌ Debug DB add() not available", "error");
			return res.status(500).json({ error: "Debug DB add() not available" });
		}

		const { _id, timestamp, message, level, meta } = req.body as Partial<DebugLogEntry>;

		if (!message) {
			return res.status(400).json({ error: "Missing log message" });
		}

		try {
			const entry: DebugLogEntry = {
				_id: _id || crypto.randomUUID(),
				timestamp: timestamp || new Date().toISOString(),
				message,
				level: level ?? "info",
				meta: meta ?? {},
			};

			await debugDB.add(entry);

			return res.status(201).json({ success: true, entry });
		} catch (err) {
			const msg = (err as Error).message || "Unknown error writing debug log";
			log(`❌ ${msg}`, "error");
			return res.status(500).json({ error: msg });
		}
	});
}
