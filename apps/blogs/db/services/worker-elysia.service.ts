import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

/**
 * Cloudflare Worker options per https://elysiajs.com/integrations/cloudflare-worker
 *
 * - `adapter: CloudflareAdapter` is required.
 * - `aot: false` is still required here: the app is built inside OpenNext's
 *   request `fetch`, not at worker module export. Startup AOT (`new Function`)
 *   is only allowed at isolate init; during a request it throws EvalError.
 * - Call `.compile()` on the root app after routes are mounted.
 */
export function workerElysiaOptions(name: string) {
	return {
		name,
		aot: false as const,
		adapter: CloudflareAdapter,
	};
}

export function createWorkerElysiaService() {
	return { workerElysiaOptions };
}
