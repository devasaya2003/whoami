import type {
	UserRow,
	UsersRepository,
} from "../repositories/users.repository";

export type { UserRow };

export function createMeService(deps: {
	users: Pick<UsersRepository, "updateName">;
	now: () => number;
}) {
	return {
		get(user: UserRow) {
			return {
				id: user.id,
				email: user.email,
				name: user.name,
			};
		},

		async update(user: UserRow, name: string) {
			const trimmed = name.trim();
			const ts = deps.now();
			await deps.users.updateName(user.id, trimmed, ts);
			return { id: user.id, email: user.email, name: trimmed };
		},
	};
}

export type MeService = ReturnType<typeof createMeService>;
