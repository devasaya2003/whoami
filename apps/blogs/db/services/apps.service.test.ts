import { expect, it, vi } from "vitest";
import { createAppsService } from "./apps.service";
import { HttpError } from "./http-error.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

function setup(existing?: object | null) {
	const apps = {
		listForUser: vi.fn().mockResolvedValue([{ id: "a1" }]),
		findOwned: vi.fn().mockResolvedValue(
			existing === undefined
				? { id: "a1", userId: "u1", name: "App", url: "https://a.com" }
				: existing,
		),
		create: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
	};
	return {
		apps,
		service: createAppsService({
			apps: apps as never,
			now: () => 10,
			newId: () => "id1",
		}),
	};
}

it("lists and gets apps", async () => {
	const { service, apps } = setup();
	expect(await service.list(user)).toEqual([{ id: "a1" }]);
	expect(await service.get(user, "a1")).toMatchObject({ id: "a1" });
	apps.findOwned.mockResolvedValueOnce(null);
	await expect(service.get(user, "x")).rejects.toThrow(HttpError);
});

it("creates updates and removes apps with url validation", async () => {
	const { service, apps } = setup();
	const created = await service.create(user, {
		name: " N ",
		url: "https://example.com/path",
	});
	expect(created).toMatchObject({
		id: "id1",
		name: "N",
		url: "https://example.com/path",
	});
	await expect(
		service.create(user, { name: "x", url: "not-a-url" }),
	).rejects.toMatchObject({ status: 400 });
	await expect(
		service.create(user, { name: "x", url: "ftp://x.com" }),
	).rejects.toMatchObject({ status: 400 });

	expect(
		await service.update(user, "a1", { name: " Renamed ", url: "https://b.com" }),
	).toMatchObject({ name: "Renamed", url: "https://b.com/" });
	expect(await service.update(user, "a1", {})).toMatchObject({ id: "a1" });
	apps.findOwned.mockResolvedValueOnce(null);
	await expect(service.update(user, "x", { name: "n" })).rejects.toThrow(
		HttpError,
	);

	expect(await service.remove(user, "a1")).toEqual({ ok: true });
	apps.findOwned.mockResolvedValueOnce(null);
	await expect(service.remove(user, "x")).rejects.toThrow(HttpError);
	expect(apps.remove).toHaveBeenCalled();
});
