import { HttpError } from "../schema/http-error";
import type { UserApisRepository } from "../repositories/user-apis.repository";
import type { UserRow } from "../repositories/users.repository";

export function createApisService(deps: {
	apis: UserApisRepository;
	now: () => number;
	newId: () => string;
	generateApiKey: () => string;
	sha256Hex: (value: string) => Promise<string>;
}) {
	return {
		list(user: UserRow) {
			return deps.apis.listForUser(user.id);
		},

		async create(user: UserRow, name: string) {
			const key = deps.generateApiKey();
			const hash = await deps.sha256Hex(key);
			const ts = deps.now();
			const row = {
				id: deps.newId(),
				userId: user.id,
				hash,
				name: name.trim(),
				createdAt: ts,
				updatedAt: ts,
			};
			await deps.apis.create(row);
			return {
				id: row.id,
				name: row.name,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				key,
			};
		},

		async remove(user: UserRow, apiId: string) {
			const existing = await deps.apis.findOwned(user.id, apiId);
			if (!existing) throw new HttpError(404, { error: "API key not found" });
			await deps.apis.remove(apiId);
			return { ok: true as const };
		},
	};
}

export type ApisService = ReturnType<typeof createApisService>;
