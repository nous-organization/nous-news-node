// frontend/src/p2p/networkStatus.ts
import type { Helia } from "helia";
import { addDebugLog, log } from "@/lib/log.server";
import { updateStatus } from "@/lib/status.server";
import type { ConnectionInfo, NodeStatus } from "@/types";

export function startNetworkStatusPoll(helia: Helia, status: NodeStatus, interval = 5000) {
	async function updateNetworkStatus() {
		try {
			const peers: ConnectionInfo[] = helia.libp2p
				? helia.libp2p.getPeers().map((peerId: any) => {
						const conns: any[] = helia.libp2p.getConnections(peerId);
						return {
							peerId: peerId.toString(),
							connected: conns.length > 0,
							addresses: conns.map((c: any) => c.remoteAddr.toString()),
						};
					})
				: [];

			if (peers?.length) {
				// ---- Merge Status ----
				updateStatus({
					peers,
					connected: peers.some((p) => p.connected),
				});
			}

			// Log each peer individually
			for (const peer of peers) {
				await addDebugLog({
					message: `Peer status: ${peer.peerId} — ${peer.connected ? "Connected" : "Disconnected"}`,
					level: "info",
					meta: { ...peer, type: "peers" }, // <-- include peerId here
				});
			}

			// Optional: log overall network summary
			// await addDebugLog({
			// 	message: `Network summary: ${peers.length} peers, syncing=${status.syncing}`,
			// 	level: "info",
			// 	meta: {
			// 		peerCount: peers.length,
			// 		connected: peers.length > 0,
			// 		syncing: status.syncing,
			// 		type: "network",
			// 	},
			// });
		} catch (err) {
			const msg = (err as Error).message;

			log(`Network status error: ${msg}`);

			updateStatus({
				peers: [],
				connected: false,
			});

			await addDebugLog({
				message: `Network status error: ${(err as Error).message}`,
				level: "error",
				meta: { error: msg, type: "peers" },
			});
			status.peers = [];
		}
	}

	updateNetworkStatus();
	const id = setInterval(updateNetworkStatus, interval);
	return () => clearInterval(id); // returns a cleanup function
}
