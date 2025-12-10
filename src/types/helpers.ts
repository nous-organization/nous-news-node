/* -------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

import type { DebugStatus, NodeStatus } from "./p2p";

/**
 * Returns a new NodeStatus object with default empty values.
 * Useful for initializing state or fallback values.
 */
export const createEmptyNodeStatus = (): NodeStatus => ({
	running: false,
	connected: false,
	orbitConnected: false,
	modelsPrefetched: false,
	syncing: false,
	lastSync: null,
	port: 0,
	peers: [],
	logs: [],
});

/**
 * Returns a new DebugStatus object with all fields initialized.
 * Combines empty NodeStatus defaults with guaranteed arrays and fetchStatus.
 */
export const createEmptyDebugStatus = (): DebugStatus => ({
	...createEmptyNodeStatus(),
	logs: [], // guarantee array
	peers: [], // guarantee array
	fetchStatus: [], // UI-only field
});
