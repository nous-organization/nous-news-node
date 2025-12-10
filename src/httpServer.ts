// frontend/src/p2p/httpServer.ts

import http from "node:http";
import cors from "cors";
import express, { type Express } from "express";
import type { Helia } from "helia";
import type { NodeStatus } from "@/types";
import { log } from "./lib/log.server";
import { registerFederatedArticleRoutes } from "./routes/route-articles-federated";
import { registerLocalArticleRoutes } from "./routes/route-articles-local";
// Import the new-style route registration functions
import { registerDebugLogRoutes } from "./routes/route-log";
import { registerStatusRoutes } from "./routes/route-status";

// Base URL for reference (useful for logging or generating URLs)
export const BASE_URL = "http://localhost";

// src/p2p/httpServer.ts
export interface BaseServerContext {
	status: NodeStatus;
	orbitdbConnected: boolean;
	httpPort?: number;
	helia: Helia;
}

// Context object passed to each route handler
export type HttpServerContext = BaseServerContext & { [key: string]: any };

/**
 * Create an Express-based HTTP server for the P2P node.
 * - Registers routes from all modules
 * - Adds CORS headers
 * - Parses JSON bodies
 * - Supports graceful shutdown
 */
export function createHttpServer(
	httpPort: number,
	context: HttpServerContext,
): { server: http.Server; shutdown: () => Promise<void>; app: Express } {
	const app = express();

	//------------------------------------------------------------
	// Middleware: JSON parsing
	//------------------------------------------------------------
	app.use(express.json());

	//------------------------------------------------------------
	// Middleware: CORS
	//------------------------------------------------------------
	app.use(
		cors({
			origin: "*", // allow any origin; change to specific domains if needed
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
			preflightContinue: false,
			optionsSuccessStatus: 204,
		}),
	);

	//------------------------------------------------------------
	// Register routes using the new registration functions
	//------------------------------------------------------------
	if (registerDebugLogRoutes && context.debugDB) {
		registerDebugLogRoutes(app, context.debugDB);
	}

	if (registerStatusRoutes) {
		registerStatusRoutes(app);
	}

	if (registerLocalArticleRoutes) {
		registerLocalArticleRoutes(app, context);
	}

	if (registerFederatedArticleRoutes) {
		registerFederatedArticleRoutes(app, context);
	}

	//------------------------------------------------------------
	// Express -> Node HTTP server
	//------------------------------------------------------------
	const server = http.createServer(app);

	server.listen(httpPort, () => {
		console.log(`P2P node HTTP API running on ${BASE_URL}:${httpPort}`);
	});

	//------------------------------------------------------------
	// Graceful shutdown helper
	//------------------------------------------------------------
	async function shutdown() {
		return new Promise<void>((resolve, reject) => {
			server.close((err) => {
				if (err) {
					log(`❌ Error closing HTTP server: ${err.message}`);
					return reject(err);
				}
				log("✅ HTTP server closed");
				resolve();
			});
			// Close all connections
			server.closeAllConnections?.();
		});
	}

	return { server, shutdown, app };
}
