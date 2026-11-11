import { expect, it, vi } from "vitest";
import { HttpError } from "../services/http-error.service";
import { createWorkerHono } from "./worker-hono.router";

it("maps HttpError to response status and body", async () => {
	const app = createWorkerHono("t").get("/boom", (c) => {
		throw new HttpError(418, { error: "teapot" });
		return c.json({});
	});
	const res = await app.request("http://localhost/boom");
	expect(res.status).toBe(418);
	expect(await res.json()).toEqual({ error: "teapot" });
});

it("maps duck-typed status/body errors", async () => {
	const app = createWorkerHono("t").get("/duck", (c) => {
		throw { status: 409, body: { error: "conflict" } };
		return c.json({});
	});
	const res = await app.request("http://localhost/duck");
	expect(res.status).toBe(409);
	expect(await res.json()).toEqual({ error: "conflict" });
});

it("maps unexpected errors to 500", async () => {
	const spy = vi.spyOn(console, "error").mockImplementation(() => {});
	const app = createWorkerHono("t")
		.get("/err", (c) => {
			throw new Error("nope");
			return c.json({});
		})
		.get("/raw", (c) => {
			throw "boom";
			return c.json({});
		});
	expect((await app.request("http://localhost/err")).status).toBe(500);
	expect((await app.request("http://localhost/raw")).status).toBe(500);
	spy.mockRestore();
});
