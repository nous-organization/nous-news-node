// src/p2p/libp2p/index.ts
import type { Libp2p } from "libp2p";
import { log } from "@/lib/log";
import { createLibp2pNode } from "@/p2p/libp2p/libp2pNode";

let libp2pInstance: Libp2p | null = null;

export async function getLibp2p(
	listenAddr: string,
	relayAddresses: string[] = [],
) {
	if (libp2pInstance) return libp2pInstance;

	log("🔵 Creating libp2p instance...");

	libp2pInstance = await createLibp2pNode(listenAddr, relayAddresses);

	log("🔵 libp2p instance ready");

	return libp2pInstance;
}
