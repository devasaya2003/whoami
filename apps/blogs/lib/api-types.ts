import type { buildApi } from "./build-api";

/** Shared AppType for Hono RPC (`hc<Api>`). Type-only — safe for client imports. */
export type Api = ReturnType<typeof buildApi>;
