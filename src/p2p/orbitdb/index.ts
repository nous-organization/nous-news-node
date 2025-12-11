// src/p2p/orbitdb/index.ts
import fs from "node:fs";
import {
	createOrbitDB,
	type IdentitiesType,
	type Identity,
	type KeyStoreType,
	type OrbitDB,
} from "@orbitdb/core";
import { log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";
import { getOrbitDBIdentity } from "./identity";

export type OrbitDBCore = {
	orbitdb: OrbitDB;
	identity: Identity;
	identities: IdentitiesType;
	keystore: KeyStoreType;
	orbitDBPath: string;
	orbitDBKeystorePath: string;
};

let coreInstance: OrbitDBCore | null = null;

/**
 * Initialize the OrbitDB core instance (singleton)
 */
export async function initOrbitDBCore(
	orbitDBPath: string,
	orbitDBKeystorePath: string,
	identityId: string = "nous-node-standalone",
): Promise<OrbitDBCore> {
	if (coreInstance) return coreInstance;

	// Ensure directories exist
	[orbitDBPath, orbitDBKeystorePath].forEach((dir) => {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	});

	log("🔵 Initializing Helia for OrbitDB...");
	const helia = await getHelia();

	log(`🔵 Setting up OrbitDB identity: ${identityId}...`);
	const { identity, identities, keystore } = await getOrbitDBIdentity({
		identityId,
		helia,
	});

	log("🔵 Creating OrbitDB instance...");
	const orbitdb = await createOrbitDB({
		ipfs: helia,
		id: identityId,
		identity,
		identities,
		directory: orbitDBPath,
	});

	coreInstance = {
		orbitdb,
		identity,
		identities,
		keystore,
		orbitDBPath,
		orbitDBKeystorePath,
	};
	log("✅ OrbitDB core initialized successfully");
	return coreInstance;
}

/**
 * Access the OrbitDB core instance
 */
export function getOrbitDBCore(): OrbitDBCore {
	if (!coreInstance)
		throw new Error(
			"OrbitDB core not initialized. Did you forget to call initOrbitDBCore()?",
		);
	return coreInstance;
}

/**
 * Reset core singleton — useful for hot reload or tests
 */
export function resetOrbitDBCore() {
	coreInstance = null;
}
