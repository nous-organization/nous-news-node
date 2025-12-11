// src/httpServer.ts
import http from "node:http";
import cors from "cors";
import express, { type Express } from "express";
import type { Helia } from "helia";
import { WebSocketServer } from "ws";
import type { NodeStatus } from "@/types";
import { log, setBroadcastFn } from "./lib/log";
// Route registration functions
import { registerArticleRoutes } from "./routes/route-articles";
import { registerFederatedArticleRoutes } from "./routes/route-articles-federated";
import { registerLocalArticleRoutes } from "./routes/route-articles-local";
import { registerDashboardRoutes } from "./routes/route-dashboard";
import { registerDebugLogRoutes } from "./routes/route-log";
import { registerSourceRoutes } from "./routes/route-sources";
import { registerStatusRoutes } from "./routes/route-status";

// Base URL for logging / generating links
export const BASE_URL = process.env.BASE_URL ?? "http://localhost";

/**
 * Base server context
 */
export interface BaseServerContext {
	status: NodeStatus;
	orbitdbConnected: boolean;
	httpPort?: number;
	helia: Helia;
}

/**
 * Extended context (arbitrary extra props)
 */
export type HttpServerContext = BaseServerContext & { [key: string]: any };

/**
 * Create an Express HTTP server
 */
export function createHttpServer(
	httpPort: number,
	context: HttpServerContext,
): { server: http.Server; shutdown: () => Promise<void>; app: Express } {
	const app = express();

	//------------------------------------------------------------
	// Middleware
	//------------------------------------------------------------
	app.use(express.json());
	app.use(
		cors({
			origin: "*",
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
			preflightContinue: false,
			optionsSuccessStatus: 204,
		}),
	);

	//------------------------------------------------------------
	// Register routes directly from modules
	//------------------------------------------------------------
	registerDebugLogRoutes(app);
	registerStatusRoutes?.(app);
	registerSourceRoutes?.(app);
	registerArticleRoutes?.(app);
	registerLocalArticleRoutes?.(app);
	registerFederatedArticleRoutes?.(app);
	registerDashboardRoutes?.(app);

	//------------------------------------------------------------
	// Create HTTP server
	//------------------------------------------------------------
	const server = http.createServer(app);

	//------------------------------------------------------------
	// WebSocket server for live events
	//------------------------------------------------------------
	try {
		const wss = new WebSocketServer({ server, path: "/ws" });

		const broadcastEvent = (event: any) => {
			const msg = JSON.stringify(event);
			for (const client of wss.clients) {
				if ((client as any).readyState === (client as any).OPEN) {
					(client as any).send(msg);
				}
			}
		};

		setBroadcastFn((ev: any) => {
			try {
				broadcastEvent(ev);
			} catch (_) {}
		});

		wss.on("connection", (socket: any) => {
			log("🔌 WS client connected");
			socket.on("close", () => log("🔌 WS client disconnected"));
		});
	} catch (e) {
		log(`⚠️ WebSocket server not started: ${(e as Error).message}`, "warn");
	}

	//------------------------------------------------------------
	// Start server
	//------------------------------------------------------------
	server.listen(httpPort, () => {
		console.log(`P2P node HTTP API running on ${BASE_URL}:${httpPort}`);
	});

	//------------------------------------------------------------
	// Graceful shutdown
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
			server.closeAllConnections?.();
		});
	}

	return { server, shutdown, app };
}
