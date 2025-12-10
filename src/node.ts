// frontend/src/p2p/node.ts
import fs from "node:fs";
import type { Server } from "node:http";
import {
	createOrbitDB,
	type IdentitiesType,
	type Identity,
	type KeyStoreType,
	type OrbitDB,
} from "@orbitdb/core";
import { LevelBlockstore } from "blockstore-level";
import type { Helia } from "helia";
import { createHelia } from "helia";
import type { Libp2p } from "libp2p";
import { log } from "@/lib/log.server";
import { updateStatus } from "@/lib/status.server";
// import { cleanLockFiles } from "@/lib/utils.server";
import { createEmptyNodeStatus, type NodeConfig, type NodeStatus } from "@/types";
import { type ArticleAnalyzedDB, setupArticleAnalyzedDB } from "./db-articles-analyzed";
import { type ArticleFederatedDB, setupArticleFederatedDB } from "./db-articles-federated";
import { type ArticleLocalDB, setupArticleLocalDB } from "./db-articles-local";
import { type DebugDB, setupDebugDB } from "./db-debug";
import { getOrbitDBIdentity } from "./identity";
import { createLibp2pNode } from "./libp2pNode";

export type NodeInstance = {
	// Databases
	debugDB: DebugDB;
	articleLocalDB: ArticleLocalDB;
	articleAnalyzedDB: ArticleAnalyzedDB;
	articleFederatedDB: ArticleFederatedDB;

	// Core node
	keystore: KeyStoreType;
	identity: Identity;
	identities: IdentitiesType;
	libp2p: Libp2p;
	helia: Helia;
	orbitdb: OrbitDB;
	status: NodeStatus;

	// HTTP server
	httpServer?: Server; // http server
	shutdownHttpServer?: () => Promise<void>; // http server shutdown method
	stopNetworkPoll?: () => void;

	// Paths
	orbitDBKeystorePath: string;
	orbitDBPath: string;
	blockstorePath: string;
};

let runningInstance: NodeInstance | null = null;

/**
 * Sets the currently running P2P node instance.
 * Useful for centralizing shutdown logic.
 * @param instance - The running P2P node instance
 */
export function setRunningInstance(instance: NodeInstance) {
	runningInstance = instance;
}

/**
 * Returns the currently running P2P node instance.
 * Useful for centralizing shutdown logic.
 * @return NodeInstance - The running P2P node instance
 */
export function getRunningInstance(): NodeInstance | null {
	if (!runningInstance) {
		return null;
	}
	return runningInstance;
}

/**
 * Start or return the running P2P node instances
 */
export async function getP2PNode(config?: NodeConfig): Promise<NodeInstance> {
	if (runningInstance) {
		log("🟢 P2P node already running, returning existing instance");
		return runningInstance;
	}

	const nodeConfig: NodeConfig = config || null;
	if (!nodeConfig) {
		throw new Error("[Node] Unable to load node NodeConfig.");
	}

	[nodeConfig.orbitDBKeystorePath, nodeConfig.orbitDBPath, nodeConfig.blockstorePath].forEach(
		(dir) => {
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		},
	);
	console.log("✅ Verified storage directories exist");

	console.log(`[Node] Starting p2p node with config: ${JSON.stringify(nodeConfig, null, 2)}`);

	// Ensure directories exist
	[nodeConfig.orbitDBKeystorePath, nodeConfig.orbitDBPath].forEach((dir) => {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	});

	const status: NodeStatus = createEmptyNodeStatus();

	log("Starting P2P node...");

	// --- Libp2p ---
	const libp2p = await createLibp2pNode(nodeConfig.libp2pListenAddr, nodeConfig.relayAddresses);

	// Libp2p Connected Status
	status.connected = true;

	// --- Helia ---
	// @see https://github.com/orbitdb/orbitdb/blob/main/docs/GETTING_STARTED.md
	// const blockstore = new LevelBlockstore(nodeConfig.blockstorePath);
	// await blockstore.open();
	const helia = await createHelia({
		libp2p,
		// blockstore,
	});

	// TODO: Figure out if we really need to start this here.
	await helia.start();

	// --- OrbitDB ---
	const identityId = nodeConfig?.identityId?.toString() || "nous-node";
	const { identity, identities, keystore } = await getOrbitDBIdentity({
		identityId,
		helia,
	});
	const orbitdb = await createOrbitDB({
		ipfs: helia,
		id: identityId,
		identity,
		identities,
		directory: nodeConfig.orbitDBPath,
	});

	let debugDB: DebugDB;
	let articleLocalDB: ArticleLocalDB;
	let articleAnalyzedDB: ArticleAnalyzedDB;
	let articleFederatedDB: ArticleFederatedDB;
	try {
		// --- Setup DBs ---
		debugDB = await setupDebugDB(orbitdb, nodeConfig.orbitDBPath);

		await new Promise((res) => setTimeout(res, 10));

		articleLocalDB = await setupArticleLocalDB(orbitdb, nodeConfig.orbitDBPath);

		await new Promise((res) => setTimeout(res, 10));

		articleAnalyzedDB = await setupArticleAnalyzedDB(orbitdb, nodeConfig.orbitDBPath);

		await new Promise((res) => setTimeout(res, 10));

		articleFederatedDB = await setupArticleFederatedDB();

		status.orbitConnected = true;
	} catch (err: any) {
		log(`Critical error initializing OrbitDB databases: ${err.message}`, "error");

		status.orbitConnected = false;
		throw new Error("Failed to initialize databases. Node cannot start.");
	}

	const { orbitDBKeystorePath, orbitDBPath, blockstorePath } = nodeConfig;
	runningInstance = {
		// Core node
		libp2p,
		helia,
		orbitdb,
		status,

		// Databases
		debugDB,
		articleLocalDB,
		articleAnalyzedDB,
		articleFederatedDB,
		keystore,
		identity,
		identities,

		// Paths
		orbitDBKeystorePath,
		orbitDBPath,
		blockstorePath,
	};

	log("✅ P2P node initialized successfully");

	updateStatus(status);
	return runningInstance;
}
