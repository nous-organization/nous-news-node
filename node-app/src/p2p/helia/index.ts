// src/p2p/helia/index.ts
import type { Helia } from "helia";
import { createHelia } from "helia";
import { log } from "@/lib/log";
import { getLibp2p } from "@/p2p/libp2p";

let heliaInstance: Helia | null = null;

/**
 * Initializes Helia only once.
 * Uses the singleton Libp2p instance internally.
 */
export async function initHelia(
	listenAddr: string = "/ip4/127.0.0.1/tcp/15003",
	relayAddresses: string[] = [],
): Promise<Helia> {
	if (heliaInstance) return heliaInstance;

	log("🔵 Creating Helia instance using Libp2p singleton...");
	const libp2p = await getLibp2p(listenAddr, relayAddresses);

	heliaInstance = await createHelia({
		libp2p,
		// Add blockstore or other config here if needed
	});

	// Start Helia immediately to match old behavior
	await heliaInstance.start();

	log("🔵 Helia instance ready");
	return heliaInstance;
}

/**
 * Accessor for Helia after initialization.
 * Throws meaningful warning if accessed too early.
 */
export function getHelia(): Helia {
	if (!heliaInstance) {
		throw new Error(
			"[heliaInstance] Helia not initialized. Did you forget to call initHelia() in node startup?",
		);
	}
	return heliaInstance;
}

/**
 * Optional reset — useful for tests or hot reload environments.
 */
export function resetHelia() {
	heliaInstance = null;
}
