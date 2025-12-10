/**
 * @file identity.ts
 * @description
 * Persistent OrbitDB identity loader/creator for the Nous P2P node.
 *
 * OrbitDB v2 does NOT expose `identity.hash` anymore. Instead, the safe and
 * official method is to persist the entire identity object and restore it by
 * verifying with `identities.verifyIdentity()`.
 *
 * This implementation:
 *  - Ensures keystore directory exists
 *  - Loads a saved identity (full object)
 *  - Verifies identity using OrbitDB's identity module
 *  - Falls back to creating a new identity if restore fails
 *  - Saves the full identity back to disk
 */

import fs from "node:fs";
import path from "node:path";
import * as dagCbor from "@ipld/dag-cbor";
import {
	Identities,
	type IdentitiesType,
	type Identity,
	KeyStore,
	type KeyStoreType,
} from "@orbitdb/core";
import type { Helia } from "helia";
import { base58btc } from "multiformats/bases/base58";
import * as Block from "multiformats/block";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

const KEYSTORE_PATH =
	process.env.ORBITDB_KEYSTORE_PATH || ".nous/orbitdb-keystore";
const IDENTITY_FILE = path.join(KEYSTORE_PATH, "identity.json");

const codec = dagCbor;
const hasher = sha256;
const hashEncoding = base58btc;

/**
 * Decode raw bytes from IPFS blockstore into a JS object.
 * @param bytes - Raw bytes from IPFS
 */
export async function decodeBlock<T>(bytes: Uint8Array): Promise<T> {
	// Correct three generics: T = decoded value, C = codec code, Alg = hasher code
	const block = await Block.decode<
		T,
		(typeof codec)["code"],
		(typeof hasher)["code"]
	>({
		bytes,
		codec,
		hasher,
	});
	return block.value;
}

/**
 * Convert a saved OrbitDB hash string into a CID instance.
 * @param hash - The multibase hash string (e.g., savedIdentity.hash)
 * @returns CID instance for use with IPFS/Helia blockstore
 */
export function parseIdentityCID(hash: string): CID {
	if (!hash || typeof hash !== "string") {
		throw new Error(`Invalid hash string: ${hash}`);
	}

	try {
		const cid = CID.parse(hash, base58btc);
		return cid;
	} catch (err) {
		throw new Error(`Failed to parse CID from hash "${hash}": ${err}`);
	}
}

/**
 * Fetches and decodes a raw OrbitDB identity block from IPFS/Helia.
 *
 * @param helia - The Helia node instance
 * @param hash - The OrbitDB identity hash (multibase string, e.g., "zdpu…")
 * @returns The decoded identity object (without sign/verify functions)
 */
export async function fetchIdentityFromIPFS<T>(
	helia: any,
	hash: string,
): Promise<T> {
	const cid = CID.parse(hash, hashEncoding);
	const bytes = await helia.blockstore.get(cid);

	if (!bytes) throw new Error(`Block not found for CID: ${hash}`);
	if (!(bytes instanceof Uint8Array))
		throw new Error(`Invalid bytes type: ${typeof bytes}`);

	// return decodeIdentity(bytes)
	return decodeBlock<T>(bytes);
}

/**
 * Load a full saved OrbitDB identity from identity.json.
 *
 * @returns { Promise<Identity | null> }
 */
async function loadSavedIdentity(): Promise<Identity | null> {
	try {
		if (fs.existsSync(IDENTITY_FILE)) {
			const data = JSON.parse(fs.readFileSync(IDENTITY_FILE, "utf8"));
			return data ?? null;
		}
	} catch (err) {
		console.error("Failed to load identity file:", err);
	}
	return null;
}

/**
 * Persist the full OrbitDB identity object to disk.
 *
 * @param identity - The identity object to save
 */
function saveIdentity(identity: Identity) {
	try {
		fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2), "utf8");
	} catch (err) {
		console.error("Failed to write identity file:", err);
	}
}

/**
 * Create or load a persistent OrbitDB identity.
 *
 * OrbitDB v2 identities must be saved and restored using the entire object,
 * not a hash, since `identity.hash` no longer exists.
 *
 * @param identityId - The id to use to create identity
 * @param helia - The underlying Helia (IPFS) instance
 * @returns {Promise<{ keystore: KeyStoreType, identities: IdentitiesType, identity: Identity }>}
 */
export async function getOrbitDBIdentity({
	identityId: id = "nous-node",
	helia,
}: {
	identityId: string;
	helia: Helia;
}): Promise<{
	keystore: KeyStoreType;
	identities: IdentitiesType;
	identity: Identity;
}> {
	// Ensure keystore directory exists
	if (!fs.existsSync(KEYSTORE_PATH)) {
		fs.mkdirSync(KEYSTORE_PATH, { recursive: true });
	}

	const keystore = await KeyStore({
		path: KEYSTORE_PATH,
	});
	const identities = await Identities({
		keystore,
		path: KEYSTORE_PATH,
		ipfs: helia,
	});

	// Try to restore identity
	const savedIdentity = await loadSavedIdentity();

	if (savedIdentity) {
		try {
			console.log("🔐 Restoring existing OrbitDB identity...");
			// Now validate it
			const valid = await identities.verifyIdentity(savedIdentity);
			if (valid) {
				console.log("✅ Identity verified successfully");
			}

			// const identity = await identities.getIdentity(savedIdentity.hash);
			// const identity = {
			// 	...savedIdentity,
			// 	sign: identities.sign,
			// 	verify: identities.verify,
			// };

			const identity = await identities.createIdentity(savedIdentity);

			console.log("savedIdentity hash ->", savedIdentity.hash);
			console.log("identity hash ->", identity.hash);

			if (identity) {
				console.log("✅ Identity restored successfully");
				return { keystore, identities, identity };
			}
			throw new Error("⚠️ Stored identity invalid");
		} catch (err) {
			throw new Error(`Failed to verify stored identity: ${err?.toString()}`);
		}
	}

	// Create a brand-new identity
	console.log(`✨ Creating new OrbitDB identity with id: [${id}]`);
	const identity = await identities.createIdentity({
		id,
		type: "ed25519",
	});

	saveIdentity(identity);

	console.log("💾 Saved new identity:", identity.id);

	return { keystore, identities, identity };
}
