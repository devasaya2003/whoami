import { expect, it, vi } from "vitest";
import { createAppsRouter } from "./apps.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("covers app admin routes", async () => {
	const service = {
		list: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue({ id: "a1" }),
		create: vi.fn().mockResolvedValue({ id: "a1" }),
		update: vi.fn().mockResolvedValue({ id: "a1" }),
		remove: vi.fn().mockResolvedValue({ ok: true }),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createAppsRouter({ service: service as never, requireUser });

	expect(
		(await router.request(new Request("http://localhost/api/admin/apps"))).status,
	).toBe(200);
	expect(
		(await router.request(new Request("http://localhost/api/admin/apps/a1"))).status,
	).toBe(200);
	expect(
		(
			await router.request(
				new Request("http://localhost/api/admin/apps", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: "App", url: "https://a.com" }),
				}),
			)
		).status,
	).toBe(200);
	expect(
		(
			await router.request(
				new Request("http://localhost/api/admin/apps/a1", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: "N" }),
				}),
			)
		).status,
	).toBe(200);
	expect(
		(
			await router.request(
				new Request("http://localhost/api/admin/apps/a1", { method: "DELETE" }),
			)
		).status,
	).toBe(200);
	expect(service.remove).toHaveBeenCalledWith(user, "a1");
});
