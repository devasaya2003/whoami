import { expect, it, vi } from "vitest";
import { createMeRouter } from "./me.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("gets and patches the current user", async () => {
	const service = {
		get: vi.fn().mockReturnValue({ id: "u1" }),
		update: vi.fn().mockResolvedValue({ id: "u1", name: "Ada" }),
	};
	const requireUser = vi.fn().mockResolvedValue(user);
	const router = createMeRouter({ service: service as never, requireUser });

	expect((await router.handle(new Request("http://localhost/api/admin/me"))).status).toBe(
		200,
	);
	expect(service.get).toHaveBeenCalledWith(user);

	const patch = await router.handle(
		new Request("http://localhost/api/admin/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "Ada" }),
		}),
	);
	expect(patch.status).toBe(200);
	expect(service.update).toHaveBeenCalledWith(user, "Ada");
});
