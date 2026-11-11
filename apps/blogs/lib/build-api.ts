import { createApisRouter } from "@/db/routers/apis.router";
import { createAppsRouter } from "@/db/routers/apps.router";
import { createBlogsRouter } from "@/db/routers/blogs.router";
import { createMediaRouter } from "@/db/routers/media.router";
import { createMeRouter } from "@/db/routers/me.router";
import { createPublicBlogsRouter } from "@/db/routers/public-blogs.router";
import { createWorkerHono } from "@/db/routers/worker-hono.router";
import type { UserRow } from "@/db/repositories/users.repository";
import type { Container } from "./container";

export function buildApi(
	services: Container,
	auth: {
		requireUser: () => Promise<UserRow>;
		resolveApiUser: (request: Request) => Promise<UserRow | null>;
	},
) {
	return createWorkerHono("blogs-api")
		.route(
			"/",
			createPublicBlogsRouter({
				service: services.publicBlogs,
				resolveApiUser: auth.resolveApiUser,
			}),
		)
		.route(
			"/",
			createMeRouter({
				service: services.me,
				requireUser: auth.requireUser,
			}),
		)
		.route(
			"/",
			createAppsRouter({
				service: services.apps,
				requireUser: auth.requireUser,
			}),
		)
		.route(
			"/",
			createApisRouter({
				service: services.apis,
				requireUser: auth.requireUser,
			}),
		)
		.route(
			"/",
			createBlogsRouter({
				service: services.blogs,
				requireUser: auth.requireUser,
			}),
		)
		.route(
			"/",
			createMediaRouter({
				service: services.media,
				requireUser: auth.requireUser,
			}),
		);
}

export type { Api } from "./api-types";
