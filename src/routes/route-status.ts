// frontend/src/p2p/routes/route-status.ts
import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import { STATUS_FILE_PATH } from "@/constants";
import type { NodeStatus } from "@/types";
import { handleError } from "./helpers";

/**
 * Registers status routes on an Express app:
 * - GET /status: fetch current node status
 * - POST /status: update node status
 * - DELETE /status: delete persisted status file
 */
export function registerStatusRoutes(app: Express) {
	// GET /status
	app.get("/status", async (req: Request, res: Response) => {
		res.setHeader("Content-Type", "application/json");

		try {
			let persisted: Partial<NodeStatus> = {};
			if (fs.existsSync(STATUS_FILE_PATH)) {
				const raw = fs.readFileSync(STATUS_FILE_PATH, "utf-8");
				persisted = JSON.parse(raw) || {};
			}

			const status: NodeStatus = {
				running: false,
				connected: false,
				syncing: false,
				orbitConnected: false,
				peers: [],
				port: 9001,
				logs: [],
				...persisted,
				lastSync: persisted?.lastSync ?? null,
			};

			res.status(200).json(status);
		} catch (err) {
			await handleError(res, `Failed to load status file: ${(err as Error).message}`, 500, "error");
		}
	});

	// POST /status
	app.post("/status", async (req: Request, res: Response) => {
		res.setHeader("Content-Type", "application/json");

		try {
			const body = req.body;
			if (!body || typeof body !== "object") {
				await handleError(res, "Invalid body, expected JSON object", 400, "warn");
				return;
			}

			let persisted: Partial<NodeStatus> = {};
			if (fs.existsSync(STATUS_FILE_PATH)) {
				const raw = fs.readFileSync(STATUS_FILE_PATH, "utf-8");
				persisted = JSON.parse(raw) || {};
			}

			const updated: NodeStatus = {
				running: false,
				connected: false,
				syncing: false,
				orbitConnected: false,
				peers: [],
				port: 9001,
				logs: [],
				...persisted,
				...body,
				lastSync:
					body?.syncing === false
						? new Date().toISOString()
						: (persisted?.lastSync ?? body?.lastSync ?? null),
			};

			// Auto-update lastSync if syncing switched to false
			if (body.syncing === false) {
				updated.lastSync = new Date().toISOString();
			}

			const dir = path.dirname(STATUS_FILE_PATH);
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(updated, null, 2));

			res.status(200).json(updated);
		} catch (err) {
			await handleError(
				res,
				`Failed to update status file: ${(err as Error).message}`,
				500,
				"error",
			);
		}
	});

	// DELETE /status
	app.delete("/status", async (req: Request, res: Response) => {
		res.setHeader("Content-Type", "application/json");

		try {
			if (fs.existsSync(STATUS_FILE_PATH)) {
				fs.unlinkSync(STATUS_FILE_PATH);
			}
			res.status(200).json({ deleted: true });
		} catch (err) {
			await handleError(
				res,
				`Failed to delete status file: ${(err as Error).message}`,
				500,
				"error",
			);
		}
	});
}
