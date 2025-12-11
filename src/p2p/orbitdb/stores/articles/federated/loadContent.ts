import { dagCbor } from "@helia/dag-cbor";
import { CID } from "multiformats/cid";
import { log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";

export async function loadContent(cid: string | CID): Promise<any | null> {
	const helia = getHelia();
	try {
		const dag = dagCbor(helia);
		const cidObj: CID = typeof cid === "string" ? CID.parse(cid) : cid;
		return await dag.get(cidObj);
	} catch (err) {
		log(
			`❌ Failed to load federated content for CID ${cid}: ${(err as Error).message}`,
		);
		return null;
	}
}
