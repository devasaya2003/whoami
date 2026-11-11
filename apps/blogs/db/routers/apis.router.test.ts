import { expect, it, vi } from "vitest";
import { createApisRouter } from "./apis.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("covers api key admin routes", async () => {
	const service = {
		list: vi.fn().mockResolvedValue([]),
		create: vi.fn().mockResolvedValue({ id: "k1", key: "secret" }),
		remove: vi.fn().mockResolvedValue({ ok: true }),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createApisRouter({ service: service as never, requireUser });

	expect(
		(await router.request(new Request("http://localhost/api/admin/apis"))).status,
	).toBe(200);
	expect(
		(
			await router.request(
				new Request("http://localhost/api/admin/apis", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: "Dev" }),
				}),
			)
		).status,
	).toBe(200);
	expect(service.create).toHaveBeenCalledWith(user, "Dev");
	expect(
		(
			await router.request(
				new Request("http://localhost/api/admin/apis/k1", { method: "DELETE" }),
			)
		).status,
	).toBe(200);
});
