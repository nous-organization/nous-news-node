import { addDebugLog, log } from "@/lib/log";
import { getInstance } from "./setup";

export async function deleteByUrl(url: string) {
	const { articleLocalDB: db } = getInstance();
	await db.del(url);
	const msg = `Deleted article: ${url}`;
	log(msg);
	await addDebugLog({ message: msg, level: "info" });
}
