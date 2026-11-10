export function publicObjectUrl(publicBase: string, key: string) {
	return `${publicBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export function uploadKey(userId: string, filename: string) {
	const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
	return `uploads/${userId}/${crypto.randomUUID()}-${safe}`;
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
