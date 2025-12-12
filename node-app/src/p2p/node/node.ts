// src/p2p/node/node.ts
import fs from "node:fs";
import type { Server } from "node:http";
import type { Libp2p } from "libp2p";
import { log } from "@/lib/log";
import { updateStatus } from "@/lib/status";
import { type getHelia, initHelia } from "@/p2p/helia";
import { getLibp2p } from "@/p2p/libp2p";
import { initOrbitDBCore, type OrbitDBCore } from "@/p2p/orbitdb";
import { setupAllDBs } from "@/p2p/orbitdb/stores";
import {
	createEmptyNodeStatus,
	type NodeConfig,
	type NodeStatus,
} from "@/types";

export type NodeServices = {
	orbitdbCore: OrbitDBCore;
	helia: ReturnType<typeof getHelia>;
	libp2p: Libp2p;
	status: NodeStatus;
	dbs?: Awaited<ReturnType<typeof setupAllDBs>>;
	httpServer?: Server;
	shutdownHttpServer?: () => Promise<void>;
	stopNetworkPoll?: () => void;
};

let nodeServices: NodeServices | null = null;

function ensureDirs(paths: string[]) {
	paths.forEach((dir) => {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	});
}

/**
 * Initialize core node services and all OrbitDB stores.
 */
export async function initNode(config: NodeConfig): Promise<NodeServices> {
	if (nodeServices) return nodeServices;

	if (!config) throw new Error("[Node] NodeConfig is required");

	ensureDirs([
		config.orbitDBPath,
		config.orbitDBKeystorePath,
		config.blockstorePath,
	]);

	const status: NodeStatus = createEmptyNodeStatus();

	// ----------------------
	// Libp2p + Helia
	// ----------------------
	log(`[Node] Initializing Libp2p & Helia...`);
	const libp2p = await getLibp2p(
		config.libp2pListenAddr,
		config.relayAddresses,
	);
	status.connected = true;

	const helia = await initHelia(config.libp2pListenAddr, config.relayAddresses);

	// ----------------------
	// OrbitDB Core
	// ----------------------
	log(`[Node] Initializing OrbitDB core...`);
	const identityId = config.identityId ?? "nous-node-standalone";
	const orbitdbCore = await initOrbitDBCore(
		config.orbitDBPath,
		config.orbitDBKeystorePath,
		identityId,
	);

	// ----------------------
	// Setup all OrbitDB stores
	// ----------------------
	log(`[Node] Initializing all OrbitDB stores...`);
	const dbs = await setupAllDBs(orbitdbCore.orbitdb, config.orbitDBPath);
	log(`✅ All OrbitDB stores ready`);

	nodeServices = { libp2p, helia, orbitdbCore, status, dbs };

	updateStatus(status);
	log("✅ Core node services + DB stores ready");

	return nodeServices;
}

/**
 * Optional reset for hot reload or tests
 */
export function resetNode() {
	nodeServices = null;
}

export function getNodeServices(): NodeServices {
	if (!nodeServices) throw new Error("[Node] Node services not initialized");
	return nodeServices;
}
