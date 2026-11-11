import { expect, it, vi } from "vitest";
import { createBlogsService } from "./blogs.service";
import { HttpError } from "./http-error.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

function setup(opts: { createFails?: number; updateFails?: number } = {}) {
	let createAttempts = 0;
	let updateAttempts = 0;
	const blogs = {
		listForUser: vi.fn().mockResolvedValue([
			{
				id: "b1",
				slug: "s",
				appId: "a1",
				appName: "App",
				createdAt: 1,
				updatedAt: 2,
				title: "",
				description: "",
				status: "draft",
				publishedAt: null,
			},
		]),
		listForApp: vi.fn().mockResolvedValue([
			{
				id: "b1",
				slug: "s",
				appId: "a1",
				createdAt: 1,
				updatedAt: 2,
				title: "",
				description: "",
				status: "draft",
			},
		]),
		findOwned: vi.fn().mockResolvedValue({
			blog: {
				id: "b1",
				appId: "a1",
				slug: "old",
				title: "Old",
				description: "D",
				status: "draft",
				publishedAt: null,
				docSnapshot: "{}",
				contentHtml: "",
				createdAt: 1,
				updatedAt: 1,
			},
			app: { id: "a1" },
		}),
		create: vi.fn(async () => {
			createAttempts += 1;
			if (createAttempts <= (opts.createFails ?? 0)) throw new Error("dup");
		}),
		update: vi.fn(async () => {
			updateAttempts += 1;
			if (updateAttempts <= (opts.updateFails ?? 0)) throw new Error("dup");
		}),
		remove: vi.fn().mockResolvedValue(undefined),
	};
	const apps = {
		findOwned: vi.fn().mockResolvedValue({ id: "a1" }),
	};
	let slugN = 0;
	return {
		blogs,
		apps,
		service: createBlogsService({
			blogs: blogs as never,
			apps,
			now: () => 100,
			newId: () => "nid",
			makeBlogSlug: () => `slug-${(slugN += 1)}`,
		}),
	};
}

it("lists blogs for user and app", async () => {
	const { service, apps } = setup();
	expect((await service.listAll(user))[0]).toMatchObject({
		title: "s",
		description: "",
	});
	expect(await service.listForApp(user, "a1")).toHaveLength(1);
	apps.findOwned.mockResolvedValueOnce(null);
	await expect(service.listForApp(user, "x")).rejects.toThrow(HttpError);
});

it("creates gets and removes blogs", async () => {
	const { service, apps, blogs } = setup();
	apps.findOwned.mockResolvedValueOnce(null);
	await expect(service.create(user, "x", {})).rejects.toThrow(HttpError);
	const untitled = await service.create(user, "a1", {});
	expect(untitled.blog.title).toBe("Untitled");
	const created = await service.create(user, "a1", {
		title: " Hello ",
		description: " D ",
	});
	expect(created.blog.slug).toBe("slug-2");

	const fail = setup({ createFails: 8 });
	await expect(fail.service.create(user, "a1", { title: "T" })).rejects.toMatchObject(
		{ status: 500 },
	);

	expect(await service.get(user, "b1")).toMatchObject({ id: "b1", appId: "a1" });
	blogs.findOwned.mockResolvedValueOnce(null);
	await expect(service.get(user, "x")).rejects.toThrow(HttpError);

	expect(await service.remove(user, "b1")).toEqual({ ok: true });
	blogs.findOwned.mockResolvedValueOnce(null);
	await expect(service.remove(user, "x")).rejects.toThrow(HttpError);
});

it("updates blogs including publish and slug retries", async () => {
	const { service, blogs } = setup();
	blogs.findOwned.mockResolvedValueOnce(null);
	await expect(service.update(user, "x", { title: "n" })).rejects.toThrow(
		HttpError,
	);

	const published = await service.update(user, "b1", {
		status: "public",
		description: "x",
		docSnapshot: "{}",
		contentHtml: "<p>a</p>",
	});
	expect(published).toMatchObject({ status: "public", publishedAt: 100 });

	const renamed = await service.update(user, "b1", { title: " New " });
	expect(renamed.slug).toMatch(/^slug-/);
	const blankTitle = await service.update(user, "b1", { title: "   " });
	expect(blankTitle.slug).toMatch(/^slug-/);

	const failSlug = setup({ updateFails: 8 });
	await expect(
		failSlug.service.update(user, "b1", { title: "X" }),
	).rejects.toMatchObject({ status: 500 });

	blogs.findOwned.mockResolvedValueOnce({
		blog: {
			id: "b1",
			appId: "a1",
			slug: "old",
			title: "Old",
			description: "D",
			status: "public",
			publishedAt: 50,
			docSnapshot: "{}",
			contentHtml: "",
			createdAt: 1,
			updatedAt: 1,
		},
		app: { id: "a1" },
	});
	const keepPublished = await service.update(user, "b1", { status: "draft" });
	expect(keepPublished).toMatchObject({ status: "draft", publishedAt: 50 });
});
