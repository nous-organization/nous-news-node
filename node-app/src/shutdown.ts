import { log } from "@/lib/log";
import { deleteStatus } from "@/lib/status";
import { cleanLockFiles } from "@/lib/utils";
import { getInstance as getAnalyzedDB } from "@/p2p/orbitdb/stores/articles/analyzed/setup";
import { getInstance as getFederatedDB } from "@/p2p/orbitdb/stores/articles/federated/setup";
import { getInstance as getLocalDB } from "@/p2p/orbitdb/stores/articles/local/setup";
// Import DB singletons
import { getInstance as getDebugDB } from "@/p2p/orbitdb/stores/debug/setup";
import { getNodeServices, type NodeServices } from "./p2p/node";
import { BLOCKSTORE_PATH } from "./setup";

/**
 * Small helper for async delays
 */
function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Close all OrbitDB stores safely
 */
export async function closeDatabases() {
	// --- Debug DB ---
	try {
		const debugDB = getDebugDB();
		if (debugDB?.db) {
			await debugDB.db.close();
			log("✅ Debug DB closed");
		}
	} catch (err: any) {
		log(`⚠️ Debug DB close warning: ${err.message}`);
	}
	await sleep(10);

	// --- Local Articles DB ---
	try {
		const localDB = getLocalDB();
		if (localDB?.db) {
			await localDB.db.close();
			log("✅ Local Articles DB closed");
		}
	} catch (err: any) {
		log(`⚠️ Local Articles DB close warning: ${err.message}`);
	}
	await sleep(10);

	// --- Analyzed Articles DB ---
	try {
		const analyzedDB = getAnalyzedDB();
		if (analyzedDB?.db) {
			await analyzedDB.db.close();
			log("✅ Analyzed Articles DB closed");
		}
	} catch (err: any) {
		log(`⚠️ Analyzed Articles DB close warning: ${err.message}`);
	}
	await sleep(10);

	// --- Federated Articles DB ---
	try {
		const federatedDB = getFederatedDB();
		if (federatedDB?.db) {
			await federatedDB.db.close();
			log("✅ Federated Articles DB closed");
		} else {
			log("ℹ️ Federated Articles DB is in-memory; no close required");
		}
	} catch (err: any) {
		log(`⚠️ Federated Articles DB close warning: ${err.message}`);
	}
}

/**
 * Gracefully shuts down the P2P node and all services
 */
export async function shutdownP2PNode() {
	const node: NodeServices = getNodeServices();

	if (!node) {
		log("ℹ️ No running node instance to shut down");
		process.exit(0);
		return;
	}

	log("🔻 Starting P2P node shutdown...");

	// Close all DBs
	try {
		await closeDatabases();
		await sleep(150);
	} catch (err: any) {
		log(`❌ Error closing databases: ${err.message}`);
	}

	// Stop OrbitDB core
	try {
		if (node.orbitdbCore?.orbitdb) {
			await node.orbitdbCore.keystore.close();
			await node.orbitdbCore.orbitdb.stop();
			await node.orbitdbCore.orbitdb.ipfs.stop();
			log("✅ OrbitDB stopped");
		}
	} catch (err: any) {
		log(`❌ Error stopping OrbitDB: ${err.message}`);
	}

	// Stop Helia
	try {
		if (node.helia) await node.helia.stop();
		log("✅ Helia stopped");
	} catch (err: any) {
		log(`❌ Error stopping Helia: ${err.message}`);
	}

	// Stop Libp2p
	try {
		await node.libp2p.stop();
		log("✅ Libp2p stopped");
	} catch (err: any) {
		log(`❌ Error stopping Libp2p: ${err.message}`);
	}

	// Delete persisted status
	try {
		deleteStatus();
		log("✅ Status file deleted");
	} catch (err: any) {
		log(`❌ Error deleting status: ${err.message}`);
	}

	// Shutdown HTTP server
	if (node.shutdownHttpServer) {
		try {
			await node.shutdownHttpServer();
			log("✅ HTTP server shutdown complete");
		} catch (err: any) {
			log(`❌ Error shutting down HTTP server: ${err.message}`);
		}
	}

	// Clean lock files
	try {
		const { orbitDBKeystorePath, orbitDBPath } = node.orbitdbCore || {};
		if (orbitDBKeystorePath) await cleanLockFiles(orbitDBKeystorePath);
		if (orbitDBPath) await cleanLockFiles(orbitDBPath);
		//
		if (BLOCKSTORE_PATH) await cleanLockFiles(BLOCKSTORE_PATH);
		log("✅ Lock files cleaned");
	} catch (err: any) {
		log(`❌ Error cleaning lock files: ${err.message}`);
	}

	log("✅ Graceful shutdown complete");
	process.exit(0);
}

/**
 * Register shutdown signal handlers
 */
export function registerShutdownHandlers() {
	process.on("SIGINT", shutdownP2PNode);
	process.on("SIGTERM", shutdownP2PNode);
	process.on("uncaughtException", (err) => {
		log(`Uncaught Exception: ${err.message}`);
		shutdownP2PNode();
	});
	process.on("exit", shutdownP2PNode);
}
