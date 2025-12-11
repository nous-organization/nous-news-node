// libp2pInstance.ts
import type { Libp2p } from "libp2p";

declare global {
	// Allow hot-reload safe global variable
	var __LIBP2P_NODE__: Libp2p | null | undefined;
}

export const getExistingLibp2pNode = () => globalThis.__LIBP2P_NODE__;
export const setExistingLibp2pNode = (node: Libp2p | null) => {
	globalThis.__LIBP2P_NODE__ = node;
};
