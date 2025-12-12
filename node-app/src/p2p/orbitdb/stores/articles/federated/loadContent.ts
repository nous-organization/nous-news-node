import { dagCbor } from "@helia/dag-cbor";
import { CID } from "multiformats/cid";
import { log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";
import type { ArticleFederated } from "@/types";

/**
 * Load content from IPFS/Helia using a CID.
 *
 * @param cid - The CID string or CID object pointing to the content
 * @returns The decoded content, or null if not found or on error
 */
export async function loadContent(
	cid: string | CID,
): Promise<ArticleFederated | null> {
	const helia = getHelia();
	if (!helia) {
		log("❌ Helia instance is not initialized", "error");
		return null;
	}

	try {
		const dag = dagCbor(helia);
		const cidObj: CID = typeof cid === "string" ? CID.parse(cid) : cid;
		const result = await dag.get(cidObj);
		return (result as ArticleFederated) ?? null; // return the content directly
	} catch (err) {
		log(
			`❌ Failed to load federated content for CID ${cid}: ${(err as Error).message}`,
			"error",
		);
		return null;
	}
}
