import type { IncomingMessage, ServerResponse } from "node:http";
import type { z } from "zod";
import type { NodeStatus } from "./";

/**
 * Generic route handler type for HTTP endpoints.
 *
 * @template BodySchema - Optional Zod schema for request body validation.
 */
export interface RouteHandler<BodySchema extends z.ZodTypeAny = z.ZodAny> {
	method: "GET" | "POST" | "DELETE" | "PUT";
	path: string;
	bodySchema?: BodySchema;
	handler: (context: {
		/** Incoming HTTP request */
		req: IncomingMessage;

		/** HTTP response object */
		res: ServerResponse;

		/** Optional node status for debugging */
		status?: NodeStatus;

		/** OrbitDB connection flag */
		orbitdbConnected?: boolean;

		/** Optional HTTP port */
		httpPort?: number;

		/** Optional DB functions, helpers, or other injected values */
		[handlerKey: string]: any;

		/** Validated request body */
		body?: z.infer<BodySchema>;
	}) => Promise<void> | void;
}
