// src/libp2pNode.ts
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import {
	circuitRelayServer,
	circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { gossipsub } from "@libp2p/gossipsub";
import { identify, identifyPush } from "@libp2p/identify";
// import { mdns } from "@libp2p/mdns";
import { tcp } from "@libp2p/tcp";
// import { webRTC } from "@libp2p/webrtc";
// import { webTransport } from "@libp2p/webtransport";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { createLibp2p, type Libp2p } from "libp2p";
// import { kadDHT } from '@libp2p/kad-dht'

/**
 * Initializes a Libp2p node with common transports, relays, and PubSub logging.
 *
 * @param {string} libp2pListenAddr - The multiaddr for the node to listen on.
 * @param {string[]} [relayAddresses=[]] - Optional array of relay multiaddrs to connect to.
 * @returns {Promise<Libp2p>} The initialized Libp2p node instance.
 *
 * @example
 * const libp2p = await createLibp2pNode("/ip4/127.0.0.1/tcp/15003", ["/ip4/1.2.3.4/tcp/15003/p2p/12D3KooXYZ"]);
 */
export async function createLibp2pNode(
	libp2pListenAddr: string,
	relayAddresses: string[] = [],
): Promise<Libp2p> {
	let libp2p: Libp2p;
	try {
		const options = {
			// peerDiscovery: [mdns()],
			addresses: {
				listen: [
					libp2pListenAddr,
					// "/ip4/127.0.0.1/tcp/15005/ws/webrtc-direct",
					// "/ip4/127.0.0.1/udp/15004/quic-v1/webtransport",
					"/ip4/127.0.0.1/udp/15006/p2p-circuit",
				],
			},
			transports: [
				tcp(),
				// webRTC(),
				// webTransport(),
				circuitRelayTransport(),
			],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: {
				//  dht: kadDHT(),
				identify: identify(),
				identifyPush: identifyPush(),
				relay: circuitRelayServer(),
				pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
			},
		};
		libp2p = await createLibp2p(options);
	} catch (err) {
		console.error("🔻 LIBP2P CREATION ERROR:", err);
		throw new Error(`Error creating libP2P node: ${(err as Error).message}`);
	}

	// Log listening addresses (forEach callback should not return a value)
	libp2p.getMultiaddrs().forEach((addr: Multiaddr) => {
		console.log(`[P2P] 🚦 Listening on: ${addr.toString()}`);
	});

	// Peer discovery with mdns
	libp2p.addEventListener("peer:discovery", (evt) => {
		libp2p.dial(evt.detail.multiaddrs); // dial discovered peers
		console.log("[P2P] Found peer: ", evt.detail.toString());
	});

	// Connect to relays
	if (relayAddresses?.length) {
		for (const addr of relayAddresses) {
			try {
				await libp2p.dial(multiaddr(addr));
				console.log(`[P2P] Connected to relay ${addr.toString()}`);
			} catch (err) {
				console.log(
					`[P2P] Failed to connect to relay ${addr}: ${(err as Error).message}`,
				);
			}
		}
	}

	// PubSub logging
	(libp2p.services.pubsub as any).addEventListener("message", (evt: any) => {
		console.log(`[P2P] PubSub message received: ${JSON.stringify(evt.detail)}`);
	});

	return libp2p;
}
