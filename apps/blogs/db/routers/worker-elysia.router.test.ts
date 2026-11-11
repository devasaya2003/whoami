import { expect, it, vi } from "vitest";
import { HttpError } from "../services/http-error.service";
import { createWorkerElysia } from "./worker-elysia.router";

it("maps HttpError to response status and body", async () => {
	const app = createWorkerElysia("t").get("/boom", () => {
		throw new HttpError(418, { error: "teapot" });
	});
	const res = await app.handle(new Request("http://localhost/boom"));
	expect(res.status).toBe(418);
	expect(await res.json()).toEqual({ error: "teapot" });
});

it("maps duck-typed status/body errors", async () => {
	const app = createWorkerElysia("t").get("/duck", () => {
		throw { status: 409, body: { error: "conflict" } };
	});
	const res = await app.handle(new Request("http://localhost/duck"));
	expect(res.status).toBe(409);
	expect(await res.json()).toEqual({ error: "conflict" });
});

it("maps unexpected errors to 500", async () => {
	const spy = vi.spyOn(console, "error").mockImplementation(() => {});
	const app = createWorkerElysia("t")
		.get("/err", () => {
			throw new Error("nope");
		})
		.get("/nostack", () => {
			const err = new Error("msg-only");
			Object.defineProperty(err, "stack", { value: undefined });
			throw err;
		})
		.get("/raw", () => {
			throw "boom";
		});
	expect((await app.handle(new Request("http://localhost/err"))).status).toBe(
		500,
	);
	expect(
		(await app.handle(new Request("http://localhost/nostack"))).status,
	).toBe(500);
	expect((await app.handle(new Request("http://localhost/raw"))).status).toBe(
		500,
	);
	spy.mockRestore();
});
