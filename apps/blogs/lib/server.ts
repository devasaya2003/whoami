import { newId, now } from "@repo/db";
import {
	deleteObject,
	mediaProxyPath,
	publicObjectUrl,
	putObject,
	resolveUploadKey,
	uploadKey,
	userUploadPrefix,
} from "@repo/storage";
import { HttpError, requireClerkUser, resolveUserFromApiKey } from "./auth";
import { buildApi } from "./build-api";
import { getDb, getR2, getR2PublicUrl } from "./cf";
import { createContainer } from "./container";
import { generateApiKey, sha256Hex } from "./hash";
import { htmlToMarkdown } from "./html-to-markdown";
import { makeBlogSlug } from "./slug";

function blogsOrigin() {
	return (process.env.NEXT_PUBLIC_BLOGS_URL || "").replace(/\/$/, "");
}

function errorResponse(error: unknown) {
	if (error instanceof HttpError) {
		return new Response(JSON.stringify(error.body), {
			status: error.status,
			headers: { "content-type": "application/json" },
		});
	}
	console.error(error);
	return new Response(JSON.stringify({ error: "Internal Server Error" }), {
		status: 500,
		headers: { "content-type": "application/json" },
	});
}

async function getServices() {
	const db = await getDb();
	const services = createContainer(db, {
		now,
		newId,
		makeBlogSlug,
		generateApiKey,
		sha256Hex,
		htmlToMarkdown,
		storage: {
			get: async (key) => {
				const r2 = await getR2();
				return r2.get(key);
			},
			put: async (key, body, contentType) => {
				const r2 = await getR2();
				await putObject(r2, key, body, contentType);
			},
			delete: async (key) => {
				const r2 = await getR2();
				await deleteObject(r2, key);
			},
			publicBase: getR2PublicUrl,
			uploadKey,
			resolveUploadKey,
			userUploadPrefix,
			publicObjectUrl,
			mediaProxyPath,
			blogsOrigin,
		},
	});
	return { db, services };
}

export async function handle(request: Request): Promise<Response> {
	try {
		const { db, services } = await getServices();
		const api = buildApi(services, {
			requireUser: () => requireClerkUser(db),
			resolveApiUser: (req) => resolveUserFromApiKey(db, req),
		});
		return await api.fetch(request);
	} catch (error) {
		return errorResponse(error);
	}
}
