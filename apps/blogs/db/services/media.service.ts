import { HttpError } from "../schema/http-error";
import type { UserRow } from "../repositories/users.repository";

export type MediaStorage = {
	get: (key: string) => Promise<{
		body: ReadableStream | null;
		httpMetadata?: { contentType?: string };
		httpEtag?: string;
	} | null>;
	put: (
		key: string,
		body: ArrayBuffer,
		contentType: string,
	) => Promise<void>;
	delete: (key: string) => Promise<void>;
	publicBase: () => Promise<string>;
	uploadKey: (userId: string, fileName: string) => string;
	resolveUploadKey: (raw: string, publicBase?: string) => string | null;
	userUploadPrefix: (userId: string) => string;
	publicObjectUrl: (publicBase: string, key: string) => string;
	mediaProxyPath: (key: string) => string;
	blogsOrigin: () => string;
};

function usablePublicBase(publicBase: string): string {
	const base = publicBase.trim();
	if (!base) return "";
	try {
		const host = new URL(base).hostname;
		if (host.endsWith(".r2.cloudflarestorage.com")) return "";
		return base.replace(/\/$/, "");
	} catch {
		return "";
	}
}

function publicOrProxyUrl(
	storage: MediaStorage,
	publicBase: string,
	key: string,
) {
	const usable = usablePublicBase(publicBase);
	if (usable) return storage.publicObjectUrl(usable, key);
	const origin = storage.blogsOrigin();
	const path = storage.mediaProxyPath(key);
	return origin ? `${origin}${path}` : path;
}

export function createMediaService(deps: { storage: MediaStorage }) {
	return {
		async getObject(keyRaw: string) {
			const key = decodeURIComponent(keyRaw).replace(/^\/+/, "");
			if (!key.startsWith("uploads/")) {
				throw new HttpError(400, { error: "Invalid media key" });
			}
			const object = await deps.storage.get(key);
			if (!object) throw new HttpError(404, { error: "Not found" });
			const headers = new Headers();
			headers.set(
				"content-type",
				object.httpMetadata?.contentType || "application/octet-stream",
			);
			headers.set("cache-control", "public, max-age=31536000, immutable");
			if (object.httpEtag) headers.set("etag", object.httpEtag);
			return new Response(object.body, { headers });
		},

		async upload(user: UserRow, file: File) {
			if (!file.type.startsWith("image/") && file.type !== "") {
				throw new HttpError(400, {
					error: "Only image uploads are supported",
				});
			}
			const publicBase = await deps.storage.publicBase();
			const key = deps.storage.uploadKey(user.id, file.name || "upload.bin");
			const buffer = await file.arrayBuffer();
			await deps.storage.put(
				key,
				buffer,
				file.type || "application/octet-stream",
			);
			return {
				key,
				url: publicOrProxyUrl(deps.storage, publicBase, key),
			};
		},

		async remove(user: UserRow, body: { url?: string; key?: string }) {
			const publicBase = await deps.storage.publicBase();
			const raw =
				(typeof body.key === "string" && body.key.trim()) ||
				(typeof body.url === "string" && body.url.trim()) ||
				"";
			const key =
				deps.storage.resolveUploadKey(raw, publicBase || undefined) ?? "";
			if (!key) {
				throw new HttpError(400, { error: "url or key is required" });
			}
			const prefix = deps.storage.userUploadPrefix(user.id);
			if (!key.startsWith(prefix)) {
				throw new HttpError(403, {
					error: "Not allowed to delete this object",
				});
			}
			await deps.storage.delete(key);
			return { ok: true as const, key };
		},
	};
}

export type MediaService = ReturnType<typeof createMediaService>;
