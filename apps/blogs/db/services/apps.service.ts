import { HttpError } from "../schema/http-error";
import type { UserAppsRepository } from "../repositories/user-apps.repository";
import type { UserRow } from "../repositories/users.repository";

function assertHttpUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new HttpError(400, { error: "Invalid URL" });
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new HttpError(400, { error: "URL must use http or https" });
	}
	return url.toString();
}

export function createAppsService(deps: {
	apps: UserAppsRepository;
	now: () => number;
	newId: () => string;
}) {
	return {
		list(user: UserRow) {
			return deps.apps.listForUser(user.id);
		},

		async get(user: UserRow, appId: string) {
			const row = await deps.apps.findOwned(user.id, appId);
			if (!row) throw new HttpError(404, { error: "App not found" });
			return row;
		},

		async create(user: UserRow, input: { name: string; url: string }) {
			const ts = deps.now();
			const row = {
				id: deps.newId(),
				userId: user.id,
				name: input.name.trim(),
				url: assertHttpUrl(input.url.trim()),
				createdAt: ts,
				updatedAt: ts,
			};
			await deps.apps.create(row);
			return row;
		},

		async update(
			user: UserRow,
			appId: string,
			input: { name?: string; url?: string },
		) {
			const existing = await deps.apps.findOwned(user.id, appId);
			if (!existing) throw new HttpError(404, { error: "App not found" });
			const ts = deps.now();
			const patch = {
				...(input.name !== undefined ? { name: input.name.trim() } : {}),
				...(input.url !== undefined
					? { url: assertHttpUrl(input.url.trim()) }
					: {}),
				updatedAt: ts,
			};
			await deps.apps.update(existing.id, patch);
			return { ...existing, ...patch };
		},

		async remove(user: UserRow, appId: string) {
			const existing = await deps.apps.findOwned(user.id, appId);
			if (!existing) throw new HttpError(404, { error: "App not found" });
			await deps.apps.remove(existing.id);
			return { ok: true as const };
		},
	};
}

export type AppsService = ReturnType<typeof createAppsService>;
