import { Elysia, t } from "elysia";
import type { MeService } from "../services/me.service";
import type { UserRow } from "../services/me.service";

export function createMeRouter(deps: {
	service: MeService;
	requireUser: () => Promise<UserRow>;
}) {
	return new Elysia({ name: "me" })
		.get("/api/admin/me", async () => {
			const user = await deps.requireUser();
			return deps.service.get(user);
		})
		.patch(
			"/api/admin/me",
			async ({ body }) => {
				const user = await deps.requireUser();
				return deps.service.update(user, body.name);
			},
			{
				body: t.Object({
					name: t.String({ minLength: 1, maxLength: 120 }),
				}),
			},
		);
}
