// src/setup.ts
import fs from "node:fs";
import path from "node:path";
import { prefetchModels } from "@/lib/ai/models";
import { log } from "@/lib/log";
import { updateStatus } from "@/lib/status";
import { startNetworkStatusPoll } from "@/networkStatus";
import { initNode } from "@/p2p/node";
import { registerShutdownHandlers } from "@/shutdown";
import type { NodeConfig } from "@/types";
import { createHttpServer, type HttpServerContext } from "./httpServer";

// Default environment paths
export const IDENTITY_ID = process.env.IDENTITY_ID ?? "nous-node";
export const ORBITDB_KEYSTORE_PATH =
	process.env.ORBITDB_KEYSTORE_PATH ||
	path.join(process.cwd(), ".nous/orbitdb-keystore");
export const ORBITDB_DB_PATH =
	process.env.ORBITDB_DB_PATH ||
	path.join(process.cwd(), ".nous/orbitdb-databases");
export const BLOCKSTORE_PATH =
	process.env.BLOCKSTORE_PATH ||
	path.join(process.cwd(), ".nous/helia-blockstore");
export const RELAYS: string[] = process.env.RELAYS?.split(",") || [];

// Hot-reload safe state
let modelsPrefetched = false;
let httpServerInstance: { server: any; shutdown: () => Promise<void> } | null =
	null;
let stopNetworkPollFn: (() => void) | null = null;

function ensureDirs(paths: string[]) {
	paths.forEach((dir) => {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	});
}

/**
 * Start P2P node safely for hot reload
 */
export async function startP2PNode(config: NodeConfig) {
	log("⚡ Starting P2P node...");

	// Ensure storage directories exist
	ensureDirs([ORBITDB_KEYSTORE_PATH, ORBITDB_DB_PATH, BLOCKSTORE_PATH]);

	// Initialize core node (Libp2p, Helia, OrbitDB)
	const node = await initNode(config);

	node.status.connected = true; // libp2p
	node.status.orbitConnected = true; // orbitdb

	// Hot reload: stop previous network polling if any
	if (stopNetworkPollFn) stopNetworkPollFn();
	stopNetworkPollFn = startNetworkStatusPoll(node.helia, node.status);

	const httpPort = config?.httpPort || 9001;

	// Hot reload: reuse HTTP server if already running
	if (!httpServerInstance) {
		const httpContext: HttpServerContext = {
			status: node.status,
			orbitdbConnected: Boolean(node.orbitdbCore.orbitdb),
			httpPort,
			port: httpPort,
			helia: node.helia,
			orbitdb: node.orbitdbCore.orbitdb,
		};

		httpServerInstance = createHttpServer(httpPort, httpContext);
		node.status.running = true;
		node.status.port = httpPort;
	} else {
		// Attach HTTP server info to node services
		Object.assign(node, {
			httpServer: httpServerInstance.server,
			shutdownHttpServer: httpServerInstance.shutdown,
		});
	}

	// Prefetch AI models only once
	if (!modelsPrefetched) {
		try {
			log("Prefetching AI models...");
			await prefetchModels();
			modelsPrefetched = true;
			node.status.modelsPrefetched = true;
			log("✅ AI models prefetched successfully");
		} catch (err) {
			console.error("Failed to prefetch AI models:", err);
			node.status.modelsPrefetched = false;
		}
	}

	updateStatus(node.status);
	return node;
}

// Auto-start the node on import
registerShutdownHandlers();

const config: NodeConfig = {
	httpPort: Number(process.env.HTTP_PORT) || 9001,
	libp2pListenAddr: process.env.LIBP2P_ADDR || "/ip4/127.0.0.1/tcp/15003",
	relayAddresses: RELAYS,
	identityId: IDENTITY_ID,
	orbitDBKeystorePath: ORBITDB_KEYSTORE_PATH,
	orbitDBPath: ORBITDB_DB_PATH,
	blockstorePath: BLOCKSTORE_PATH,
};

startP2PNode(config).catch((err) => {
	console.error("Failed to start P2P node:", err);
	process.exit(1);
});
