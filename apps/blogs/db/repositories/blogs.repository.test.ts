import { beforeEach, expect, it, vi } from "vitest";
import { chain, createMockDb } from "@/lib/testing/mock-db";
import { createBlogsRepository } from "./blogs.repository";

const db = createMockDb();
let repo: ReturnType<typeof createBlogsRepository>;

beforeEach(() => {
	vi.clearAllMocks();
	repo = createBlogsRepository(db as never);
});

it("lists public blogs for an app", async () => {
	const rows = [{ id: "b1", slug: "s" }];
	db.select.mockReturnValueOnce(chain(rows));
	expect(await repo.listPublicForApp("u1", "a1")).toEqual(rows);
	expect(db.select).toHaveBeenCalled();
});

it("finds a public blog by id or slug", async () => {
	const row = { id: "b1", slug: "hello" };
	db.select.mockReturnValueOnce(chain([row]));
	expect(await repo.findPublicByIdOrSlug("u1", "a1", "hello")).toEqual(row);
	db.select.mockReturnValueOnce(chain([]));
	expect(await repo.findPublicByIdOrSlug("u1", "a1", "x")).toBeNull();
});

it("lists blogs for a user and an app", async () => {
	db.select.mockReturnValueOnce(chain([{ id: "b1" }]));
	expect(await repo.listForUser("u1")).toEqual([{ id: "b1" }]);
	db.select.mockReturnValueOnce(chain([{ id: "b2" }]));
	expect(await repo.listForApp("a1")).toEqual([{ id: "b2" }]);
});

it("finds owned blogs and mutates rows", async () => {
	const owned = { blog: { id: "b1" }, app: { id: "a1" } };
	db.select.mockReturnValueOnce(chain([owned]));
	expect(await repo.findOwned("u1", "b1")).toEqual(owned);
	db.select.mockReturnValueOnce(chain([]));
	expect(await repo.findOwned("u1", "missing")).toBeNull();

	const row = { id: "b1", appId: "a1", slug: "s" } as never;
	await repo.create(row);
	expect(db.insert).toHaveBeenCalled();
	await repo.update("b1", { title: "T" });
	expect(db.update).toHaveBeenCalled();
	await repo.remove("b1");
	expect(db.delete).toHaveBeenCalled();
});
