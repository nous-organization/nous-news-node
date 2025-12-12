import { z } from "zod";

/* -------------------------------------------------------------
 * Node Configuration
 * ------------------------------------------------------------- */

/**
 * Zod schema for NodeConfig
 */
export const NodeConfigSchema = z.object({
	httpPort: z.number(),
	libp2pListenAddr: z.string(),
	relayAddresses: z.array(z.string()).optional(),
	identityId: z.string().optional(),
	orbitDBKeystorePath: z.string(), // For OrbitDB keystore
	orbitDBPath: z.string(), // For OrbitDB databases
	blockstorePath: z.string(), // For Helia blockstore
});

export type NodeConfig = z.infer<typeof NodeConfigSchema> | null;

/* -------------------------------------------------------------
 * Peer Connection Info
 * ------------------------------------------------------------- */

/**
 * Zod schema for ConnectionInfo
 */
export const ConnectionInfoSchema = z.object({
	peerId: z.string(),
	addresses: z.array(z.string()),
	connected: z.boolean(),
});

export type ConnectionInfo = z.infer<typeof ConnectionInfoSchema>;

/* -------------------------------------------------------------
 * Canonical Node Status (from backend)
 * ------------------------------------------------------------- */

/**
 * Zod schema for NodeStatus
 */
export const NodeStatusSchema = z.object({
	running: z.boolean(),
	connected: z.boolean(),
	orbitConnected: z.boolean(),
	syncing: z.boolean(),
	modelsPrefetched: z.boolean(),
	lastSync: z.string().nullable(),
	port: z.number().optional(),
	peers: z.array(ConnectionInfoSchema).optional(),
	logs: z.array(z.string()).optional(),
});

export type NodeStatus = z.infer<typeof NodeStatusSchema>;

/* -------------------------------------------------------------
 * Debug Status (frontend-only extension)
 * ------------------------------------------------------------- */

/**
 * Zod schema for DebugStatus
 *
 * Extends canonical NodeStatus from backend, making `logs` and `peers`
 * required and adding `fetchStatus` for client-side tracking of UI events.
 */
export const DebugStatusSchema = NodeStatusSchema.extend({
	/**
	 * Guaranteed array of log strings
	 */
	logs: z.array(z.string()),

	/**
	 * Guaranteed array of peer connection info
	 */
	peers: z.array(ConnectionInfoSchema),

	/**
	 * UI-only status strings for tracking client-side events like:
	 * - "Loaded X articles"
	 * - "Retrying connection…"
	 */
	fetchStatus: z.array(z.string()),
});

export type DebugStatus = z.infer<typeof DebugStatusSchema>;
