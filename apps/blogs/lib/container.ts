import type { Db } from "@repo/db";
import { createApisService } from "@/db/services/apis.service";
import { createAppsService } from "@/db/services/apps.service";
import { createBlogsService } from "@/db/services/blogs.service";
import { createHttpErrorService } from "@/db/services/http-error.service";
import {
	createMediaService,
	type MediaStorage,
} from "@/db/services/media.service";
import { createMeService } from "@/db/services/me.service";
import { createPublicBlogsService } from "@/db/services/public-blogs.service";
import { createBlogsRepository } from "@/db/repositories/blogs.repository";
import { createUserApisRepository } from "@/db/repositories/user-apis.repository";
import { createUserAppsRepository } from "@/db/repositories/user-apps.repository";
import { createUsersRepository } from "@/db/repositories/users.repository";

export function createContainer(
	db: Db,
	deps: {
		now: () => number;
		newId: () => string;
		makeBlogSlug: (title: string) => string;
		generateApiKey: () => string;
		sha256Hex: (value: string) => Promise<string>;
		htmlToMarkdown: (html: string) => string;
		storage: MediaStorage;
	},
) {
	const blogs = createBlogsRepository(db);
	const apps = createUserAppsRepository(db);
	const apis = createUserApisRepository(db);
	const users = createUsersRepository(db);

	return {
		httpError: createHttpErrorService(),
		publicBlogs: createPublicBlogsService({
			blogs,
			htmlToMarkdown: deps.htmlToMarkdown,
		}),
		me: createMeService({ users, now: deps.now }),
		apps: createAppsService({
			apps,
			now: deps.now,
			newId: deps.newId,
		}),
		apis: createApisService({
			apis,
			now: deps.now,
			newId: deps.newId,
			generateApiKey: deps.generateApiKey,
			sha256Hex: deps.sha256Hex,
		}),
		blogs: createBlogsService({
			blogs,
			apps,
			now: deps.now,
			newId: deps.newId,
			makeBlogSlug: deps.makeBlogSlug,
		}),
		media: createMediaService({ storage: deps.storage }),
	};
}

export type Container = ReturnType<typeof createContainer>;
