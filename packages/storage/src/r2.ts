export function publicObjectUrl(publicBase: string, key: string) {
	return `${publicBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export function uploadKey(userId: string, filename: string) {
	const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
	return `uploads/${userId}/${crypto.randomUUID()}-${safe}`;
}

export function userUploadPrefix(userId: string) {
	return `uploads/${userId}/`;
}

export function mediaProxyPath(key: string) {
	return `/api/media/${key.replace(/^\//, "")}`;
}

export function keyFromMediaUrl(urlOrPath: string): string | null {
	try {
		const path = urlOrPath.startsWith("http")
			? new URL(urlOrPath).pathname
			: urlOrPath.split("?")[0] || "";
		const prefix = "/api/media/";
		if (!path.startsWith(prefix)) return null;
		return decodeURIComponent(path.slice(prefix.length));
	} catch {
		return null;
	}
}

/** Resolve an object key from a public CDN URL when it is under our public base. */
export function keyFromPublicUrl(
	publicBase: string,
	url: string,
): string | null {
	const base = publicBase.replace(/\/$/, "");
	try {
		const parsed = new URL(url);
		const baseUrl = new URL(base);
		if (parsed.origin !== baseUrl.origin) return null;
		const basePath = baseUrl.pathname.replace(/\/$/, "");
		const path = parsed.pathname;
		if (basePath && path.startsWith(`${basePath}/`)) {
			return decodeURIComponent(path.slice(basePath.length + 1));
		}
		if (!basePath || basePath === "") {
			return decodeURIComponent(path.replace(/^\//, ""));
		}
		return null;
	} catch {
		return null;
	}
}

export function resolveUploadKey(
	urlOrKey: string,
	publicBase?: string,
): string | null {
	const value = urlOrKey.trim();
	if (!value) return null;
	if (value.startsWith("uploads/")) return value;
	const fromMedia = keyFromMediaUrl(value);
	if (fromMedia) return fromMedia;
	if (publicBase) {
		const fromPublic = keyFromPublicUrl(publicBase, value);
		if (fromPublic) return fromPublic;
	}
	return null;
}

export async function putObject(
	bucket: R2Bucket,
	key: string,
	body: ArrayBuffer | ReadableStream | string | Blob,
	contentType?: string,
) {
	await bucket.put(key, body, {
		httpMetadata: contentType ? { contentType } : undefined,
	});
	return key;
}

export async function deleteObject(bucket: R2Bucket, key: string) {
	await bucket.delete(key);
}
