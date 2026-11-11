import { hc } from "hono/client";
import type { Api } from "./api-types";

// Compile-time type materialization (Hono RPC known-issues tip)
const _client = hc<Api>("");
export type BlogsClient = typeof _client;

export function createBlogsClient(
	...args: Parameters<typeof hc>
): BlogsClient {
	return hc<Api>(...args);
}

/** Browser admin client — same-origin cookies for Clerk session. */
export const blogsApi = createBlogsClient("/", {
	init: { credentials: "same-origin" },
});
