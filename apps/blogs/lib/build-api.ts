import { Elysia } from "elysia";
import { createApisRouter } from "@/db/routers/apis.router";
import { createAppsRouter } from "@/db/routers/apps.router";
import { createBlogsRouter } from "@/db/routers/blogs.router";
import { createMediaRouter } from "@/db/routers/media.router";
import { createMeRouter } from "@/db/routers/me.router";
import { createPublicBlogsRouter } from "@/db/routers/public-blogs.router";
import { HttpError } from "@/db/services/http-error.service";
import type { UserRow } from "@/db/repositories/users.repository";
import type { Container } from "./container";

export function buildApi(
	services: Container,
	auth: {
		requireUser: () => Promise<UserRow>;
		resolveApiUser: (request: Request) => Promise<UserRow | null>;
	},
) {
	return new Elysia({ name: "blogs-api" })
		.onError(({ error, set }) => {
			const http =
				error instanceof HttpError
					? error
					: typeof error === "object" &&
							error !== null &&
							"status" in error &&
							"body" in error &&
							typeof (error as { status: unknown }).status === "number"
						? (error as { status: number; body: unknown })
						: null;
			if (http) {
				set.status = http.status;
				return http.body;
			}
			console.error(
				"[blogs-api]",
				error instanceof Error ? error.stack || error.message : error,
			);
			set.status = 500;
			return { error: "Internal Server Error" };
		})
		.use(
			createPublicBlogsRouter({
				service: services.publicBlogs,
				resolveApiUser: auth.resolveApiUser,
			}),
		)
		.use(
			createMeRouter({
				service: services.me,
				requireUser: auth.requireUser,
			}),
		)
		.use(
			createAppsRouter({
				service: services.apps,
				requireUser: auth.requireUser,
			}),
		)
		.use(
			createApisRouter({
				service: services.apis,
				requireUser: auth.requireUser,
			}),
		)
		.use(
			createBlogsRouter({
				service: services.blogs,
				requireUser: auth.requireUser,
			}),
		)
		.use(
			createMediaRouter({
				service: services.media,
				requireUser: auth.requireUser,
			}),
		);
}

export type Api = ReturnType<typeof buildApi>;
