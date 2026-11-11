import { expect, it, vi } from "vitest";
import { createApisService } from "./apis.service";
import { HttpError } from "./http-error.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

it("lists creates and removes api keys", async () => {
	const apis = {
		listForUser: vi.fn().mockResolvedValue([{ id: "k1" }]),
		findOwned: vi.fn().mockResolvedValue({ id: "k1" }),
		create: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
	};
	const service = createApisService({
		apis: apis as never,
		now: () => 5,
		newId: () => "id1",
		generateApiKey: () => "whb_key",
		sha256Hex: async () => "hash",
	});

	expect(await service.list(user)).toEqual([{ id: "k1" }]);
	const created = await service.create(user, "  Dev  ");
	expect(created).toMatchObject({ id: "id1", name: "Dev", key: "whb_key" });
	expect(apis.create).toHaveBeenCalledWith(
		expect.objectContaining({ hash: "hash", name: "Dev" }),
	);
	expect(await service.remove(user, "k1")).toEqual({ ok: true });
	apis.findOwned.mockResolvedValueOnce(null);
	await expect(service.remove(user, "x")).rejects.toThrow(HttpError);
});
