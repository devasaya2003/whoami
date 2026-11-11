import { expect, it, vi } from "vitest";
import { chain, createMockDb } from "@/lib/testing/mock-db";
import { createUsersRepository } from "./users.repository";

it("updates a user name", async () => {
	const db = createMockDb();
	db.update.mockReturnValueOnce(chain(undefined));
	const repo = createUsersRepository(db as never);
	await repo.updateName("u1", "Ada", 99);
	expect(db.update).toHaveBeenCalled();
});
