import { beforeEach, expect, it, vi } from "vitest";
import { chain, createMockDb } from "@/lib/testing/mock-db";
import { createUserAppsRepository } from "./user-apps.repository";

const db = createMockDb();
let repo: ReturnType<typeof createUserAppsRepository>;

beforeEach(() => {
	vi.clearAllMocks();
	repo = createUserAppsRepository(db as never);
});

it("lists, finds, creates, updates and removes apps", async () => {
	db.select.mockReturnValueOnce(chain([{ id: "a1" }]));
	expect(await repo.listForUser("u1")).toEqual([{ id: "a1" }]);

	db.select.mockReturnValueOnce(chain([{ id: "a1", userId: "u1" }]));
	expect(await repo.findOwned("u1", "a1")).toMatchObject({ id: "a1" });
	db.select.mockReturnValueOnce(chain([]));
	expect(await repo.findOwned("u1", "x")).toBeNull();

	const row = {
		id: "a1",
		userId: "u1",
		name: "App",
		url: "https://x.com",
		createdAt: 1,
		updatedAt: 1,
	};
	await repo.create(row);
	expect(db.insert).toHaveBeenCalled();
	await repo.update("a1", { name: "N" });
	expect(db.update).toHaveBeenCalled();
	await repo.remove("a1");
	expect(db.delete).toHaveBeenCalled();
});
