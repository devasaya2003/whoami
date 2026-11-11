import { expect, it, vi } from "vitest";
import { HttpError } from "../services/http-error.service";
import { createMediaRouter } from "./media.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("serves media and manages uploads", async () => {
	const service = {
		getObject: vi
			.fn()
			.mockResolvedValue(new Response("ok", { status: 200 })),
		upload: vi.fn().mockResolvedValue({ key: "k", url: "/u" }),
		remove: vi.fn().mockResolvedValue({ ok: true, key: "k" }),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createMediaRouter({ service: service as never, requireUser });

	expect(
		(
			await router.handle(new Request("http://localhost/api/media/uploads/a.png"))
		).status,
	).toBe(200);

	const form = new FormData();
	form.set("file", new File(["x"], "a.png", { type: "image/png" }));
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "POST",
					body: form,
				}),
			)
		).status,
	).toBe(200);

	const missing = new FormData();
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "POST",
					body: missing,
				}),
			)
		).status,
	).toBe(400);

	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "DELETE",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ key: "uploads/u1/a.png" }),
				}),
			)
		).status,
	).toBe(200);
});

it("maps unexpected errors to 500 and rethrows HttpError", async () => {
	const service = {
		getObject: vi
			.fn()
			.mockRejectedValueOnce(new Error("r2 down"))
			.mockRejectedValueOnce("boom")
			.mockRejectedValueOnce(new HttpError(404, { error: "Not found" })),
		upload: vi
			.fn()
			.mockRejectedValueOnce(new Error("upload err"))
			.mockRejectedValueOnce("boom")
			.mockRejectedValueOnce(new HttpError(400, { error: "bad" })),
		remove: vi
			.fn()
			.mockRejectedValueOnce(new Error("nope"))
			.mockRejectedValueOnce("boom")
			.mockRejectedValueOnce(new HttpError(403, { error: "no" })),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createMediaRouter({ service: service as never, requireUser });

	expect(
		(
			await router.handle(new Request("http://localhost/api/media/uploads/a.png"))
		).status,
	).toBe(500);
	expect(
		(
			await router.handle(new Request("http://localhost/api/media/uploads/a.png"))
		).status,
	).toBe(500);
	expect(
		(
			await router.handle(new Request("http://localhost/api/media/uploads/a.png"))
		).status,
	).toBe(404);

	const form = () => {
		const f = new FormData();
		f.set("file", new File(["x"], "a.png", { type: "image/png" }));
		return f;
	};
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "POST",
					body: form(),
				}),
			)
		).status,
	).toBe(500);
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "POST",
					body: form(),
				}),
			)
		).status,
	).toBe(500);
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/uploads", {
					method: "POST",
					body: form(),
				}),
			)
		).status,
	).toBe(400);

	const del = async () =>
		router.handle(
			new Request("http://localhost/api/admin/uploads", {
				method: "DELETE",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ key: "k" }),
			}),
		);
	expect((await del()).status).toBe(500);
	expect((await del()).status).toBe(500);
	expect((await del()).status).toBe(403);
});
