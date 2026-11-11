import { expect, it, vi } from "vitest";
import { createMeService } from "./me.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "Old",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("returns and updates the current user", async () => {
	const users = { updateName: vi.fn().mockResolvedValue(undefined) };
	const service = createMeService({ users, now: () => 42 });
	expect(service.get(user)).toEqual({
		id: "u1",
		email: "a@b.c",
		name: "Old",
	});
	expect(await service.update(user, "  Ada  ")).toEqual({
		id: "u1",
		email: "a@b.c",
		name: "Ada",
	});
	expect(users.updateName).toHaveBeenCalledWith("u1", "Ada", 42);
});
