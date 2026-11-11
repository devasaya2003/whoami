import { Hono } from "hono";
import { HttpError } from "../services/http-error.service";

function isHttpError(
	error: unknown,
): error is { status: number; body: unknown } {
	return (
		error instanceof HttpError ||
		(typeof error === "object" &&
			error !== null &&
			"status" in error &&
			"body" in error &&
			typeof (error as { status: unknown }).status === "number")
	);
}

/** Shared Hono app with HttpError → JSON status mapping. */
export function createWorkerHono(name: string) {
	const app = new Hono();
	// Non-Error throws reject next(); Error/HttpError are handled via onError.
	app.use("*", async (c, next) => {
		try {
			await next();
		} catch (error) {
			if (isHttpError(error)) {
				return c.json(error.body as never, error.status as never);
			}
			console.error(`[${name}]`, error);
			return c.json({ error: "Internal Server Error" }, 500);
		}
	});
	app.onError((error, c) => {
		if (isHttpError(error)) {
			return c.json(error.body as never, error.status as never);
		}
		console.error(`[${name}]`, error);
		return c.json({ error: "Internal Server Error" }, 500);
	});
	return app;
}
