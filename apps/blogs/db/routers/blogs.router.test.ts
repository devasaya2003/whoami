import { expect, it, vi } from "vitest";
import { createBlogsRouter } from "./blogs.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("covers blog admin routes", async () => {
	const service = {
		listAll: vi.fn().mockResolvedValue([]),
		listForApp: vi.fn().mockResolvedValue([]),
		create: vi.fn().mockResolvedValue({ blog: { id: "b1" } }),
		get: vi.fn().mockResolvedValue({ id: "b1" }),
		remove: vi.fn().mockResolvedValue({ ok: true }),
		update: vi.fn().mockResolvedValue({ id: "b1" }),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createBlogsRouter({ service: service as never, requireUser });

	expect(
		(await router.handle(new Request("http://localhost/api/admin/blogs"))).status,
	).toBe(200);
	expect(
		(
			await router.handle(new Request("http://localhost/api/admin/apps/a1/blogs"))
		).status,
	).toBe(200);
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/apps/a1/blogs", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ title: "T" }),
				}),
			)
		).status,
	).toBe(200);
	expect(
		(await router.handle(new Request("http://localhost/api/admin/blogs/b1"))).status,
	).toBe(200);
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/blogs/b1", { method: "DELETE" }),
			)
		).status,
	).toBe(200);
	expect(
		(
			await router.handle(
				new Request("http://localhost/api/admin/blogs/b1", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ status: "public" }),
				}),
			)
		).status,
	).toBe(200);
	expect(service.update).toHaveBeenCalledWith(user, "b1", { status: "public" });
});
