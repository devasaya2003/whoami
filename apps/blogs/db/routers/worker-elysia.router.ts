import { Elysia } from "elysia";
import { HttpError } from "../services/http-error.service";
import { workerElysiaOptions } from "../services/worker-elysia.service";

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

/** Worker-safe Elysia app (CloudflareAdapter + aot:false) with HttpError mapping. */
export function createWorkerElysia(name: string) {
	return new Elysia(workerElysiaOptions(name)).onError(({ error, set }) => {
		if (isHttpError(error)) {
			set.status = error.status;
			return error.body;
		}
		console.error(
			`[${name}]`,
			error instanceof Error ? error.stack || error.message : error,
		);
		set.status = 500;
		return { error: "Internal Server Error" };
	});
}
