// frontend/server/src/shutdown.ts
import { log } from "@/lib/log.server";
import { deleteStatus } from "@/lib/status.server";
import { cleanLockFiles } from "@/lib/utils.server";
import { getRunningInstance } from "./node";
import type { P2PDatabases } from "./setup";

let shuttingDown = false;

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Closes all OrbitDB stores safely, with a small async delay
 * between each close to prevent LevelDB race conditions.
 */
export async function closeDatabases(databases: P2PDatabases) {
	if (!databases) return;

	// --- Debug DB ---
	if (databases.debugDB?.db) {
		try {
			await databases.debugDB.db.close();
			log("✅ Debug DB closed successfully");
		} catch (err: any) {
			log(`⚠️ Debug DB close warning: ${err.message}`);
		}
	} else {
		log("ℹ️  Debug DB not initialized or already null");
	}

	await sleep(10);

	// --- Sources DB ---
	if (databases.articleLocalDB?.articleLocalDB) {
		try {
			await databases.articleLocalDB.articleLocalDB.close();
			log("✅ Sources DB closed successfully");
		} catch (err: any) {
			log(`⚠️ Sources DB close warning: ${err.message}`);
		}
	} else {
		log("ℹ️  Local Articles DB not initialized or already null");
	}

	await sleep(10);

	// --- Analyzed DB ---
	if (databases.articleAnalyzedDB?.articleAnalyzedDB) {
		try {
			await databases.articleAnalyzedDB.articleAnalyzedDB.close();
			log("✅ Analyzed DB closed successfully");
		} catch (err: any) {
			log(`⚠️ Analyzed DB close warning: ${err.message}`);
		}
	} else {
		log("ℹ️  Analyzed Articles DB not initialized or already null");
	}

	await sleep(10);

	// --- Federated DB (in-memory) ---
	log("ℹ️  Federated Articles DB is in-memory; no close required");
}

/**
 * Gracefully shuts down the P2P node and all associated services.
 *
 * Performs the following in sequence with individual error handling:
 * 1. Stops the Libp2p networking node
 * 2. Stops OrbitDB instance
 * 3. Stops Helia (IPFS) instance
 * 4. Closes all database instances using `closeDatabases`
 * 5. Cleans lock files for keystore and database directories
 * 6. Deletes persisted node status file
 * 7. Logs the result and exits process
 */
export async function shutdownP2PNode() {
	if (shuttingDown) {
		log("🔁 Shutdown already in progress, ignoring duplicate request");
		return;
	}
	shuttingDown = true;

	const runningInstance = getRunningInstance();

	if (!runningInstance) {
		log("ℹ️ No running instance to shut down");
		process.exit(0);
		return;
	}

	const {
		keystore,
		libp2p,
		helia,
		orbitdb,
		debugDB,
		articleLocalDB,
		articleAnalyzedDB,
		articleFederatedDB,
		// httpServer,
		shutdownHttpServer,
		orbitDBKeystorePath,
		orbitDBPath,
		blockstorePath,
	} = runningInstance;

	log("🔻 Starting P2P node shutdown...");

	// Close all databases
	log("🔹 Closing individual databases before stopping OrbitDB...");
	if (debugDB || articleLocalDB || articleAnalyzedDB || articleFederatedDB) {
		try {
			const databases = {
				debugDB,
				articleLocalDB,
				articleAnalyzedDB,
				articleFederatedDB,
			} as P2PDatabases;
			await closeDatabases(databases);
			// small pause to allow underlying writes to flush
			await sleep(150);
		} catch (err: any) {
			log(`❌ Error closing databases: ${err.message}`);
		}
	}

	// Close OrbitDB identities / keystore safely
	// Stop OrbitDB
	try {
		if (orbitdb) {
			await orbitdb.keystore.close();
			await orbitdb.stop();
			await orbitdb.ipfs.stop();
		}
		log("✅ OrbitDB stopped");
	} catch (err: any) {
		log(`❌ Error stopping OrbitDB: ${err.message}`);
	}

	try {
		if (keystore?.close) {
			await keystore.close();
			log("✅ Keystore closed");
		}
	} catch (err: any) {
		log(`⚠️ Error closing identity/keystore: ${err.message}`);
	}

	// Stop Helia
	try {
		if (helia) await helia.stop();
		log("✅ Helia stopped");
	} catch (err: any) {
		log(`❌ Error stopping Helia: ${err.message}`);
	}

	// Stop networking
	try {
		await libp2p.stop();
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

	// Stop HTTP server first
	if (shutdownHttpServer) {
		try {
			await shutdownHttpServer();
			log("✅ Server shutdown complete");
		} catch (err: any) {
			log(`❌ Error shutting down HTTP server: ${err.message}`);
		}
	}

	// Clean lock files
	try {
		await cleanLockFiles(orbitDBKeystorePath);
		await cleanLockFiles(orbitDBPath);
		await cleanLockFiles(blockstorePath);
		log("✅ Lock files cleaned");
	} catch (err: any) {
		log(`❌ Error cleaning lock files: ${err.message}`);
	}

	log("✅ Graceful shutdown complete");
	process.exit(0);
}

/**
 * Registers process signal handlers to trigger graceful shutdown.
 * Handles:
 * - SIGINT (Ctrl+C)
 * - SIGTERM
 * - uncaughtException
 * - process exit
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
