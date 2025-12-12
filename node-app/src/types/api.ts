// src/types/api.ts
import { z } from "zod";

/**
 * Generic API response wrapper returned by the Wails → Node backend.
 *
 * Structure:
 * - `success`: boolean indicating whether the backend call succeeded
 * - `error`: optional error message when `success` is false
 * - `data`: the actual response payload (type varies by endpoint)
 *
 * This wrapper ensures every API call returns valid JSON and is easy
 * to work with on the frontend.
 *
 * @template T - The expected data type of the response payload
 */
export interface ApiResponse<T> {
	success: boolean;
	error?: string;
	data: T;
}

/**
 * Base Zod schema for API responses (non-generic).
 *
 * This is used by the generic helper function below, because Zod cannot
 * directly define a fully generic schema. Instead, we compose it
 * dynamically for each API type.
 */
export const ApiResponseBaseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	data: z.any(),
});

/**
 * Create a typed Zod schema for a specific APIResponse<T>.
 *
 * Example:
 * ```ts
 * const DebugLogsResponseSchema = createApiResponseSchema(
 *     z.array(DebugLogEntrySchema)
 * );
 * ```
 *
 * @param dataSchema - A Zod schema representing the `data` type for this API response
 * @returns Zod schema for `ApiResponse<T>`
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return z.object({
		success: z.boolean(),
		error: z.string().optional(),
		data: dataSchema,
	});
}

/**
 * Helper to validate and parse an APIResponse<T> with correct typing.
 *
 * Example:
 * ```ts
 * const response = parseApiResponse(rawJson, z.array(DebugLogEntrySchema));
 * if (response.success) {
 *     console.log(response.data);
 * }
 * ```
 *
 * @param json - Raw JSON string or object
 * @param dataSchema - Zod schema describing the expected shape of `data`
 * @returns Parsed and validated ApiResponse<T>
 * @throws ZodError if the response or data shape is invalid
 */
export function parseApiResponse<T>(
	json: unknown,
	dataSchema: z.ZodType<T>,
): ApiResponse<T> {
	const schema = createApiResponseSchema(dataSchema);
	return schema.parse(json);
}
