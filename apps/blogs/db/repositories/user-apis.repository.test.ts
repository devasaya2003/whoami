import { beforeEach, expect, it, vi } from "vitest";
import { chain, createMockDb } from "@/lib/testing/mock-db";
import { createUserApisRepository } from "./user-apis.repository";

const db = createMockDb();
let repo: ReturnType<typeof createUserApisRepository>;

beforeEach(() => {
	vi.clearAllMocks();
	repo = createUserApisRepository(db as never);
});

it("lists, finds, creates and removes api keys", async () => {
	db.select.mockReturnValueOnce(chain([{ id: "k1", name: "dev" }]));
	expect(await repo.listForUser("u1")).toEqual([{ id: "k1", name: "dev" }]);

	db.select.mockReturnValueOnce(chain([{ id: "k1", userId: "u1" }]));
	expect(await repo.findOwned("u1", "k1")).toMatchObject({ id: "k1" });
	db.select.mockReturnValueOnce(chain([]));
	expect(await repo.findOwned("u1", "x")).toBeNull();

	await repo.create({
		id: "k1",
		userId: "u1",
		hash: "h",
		name: "dev",
		createdAt: 1,
		updatedAt: 1,
	});
	expect(db.insert).toHaveBeenCalled();
	await repo.remove("k1");
	expect(db.delete).toHaveBeenCalled();
});
