import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type Db } from "@repo/db";

export async function getEnv() {
	const { env } = await getCloudflareContext({ async: true });
	return env as CloudflareEnv & {
		R2_PUBLIC_URL?: string;
	};
}

export async function getDb(): Promise<Db> {
	const env = await getEnv();
	if (!env.DB) {
		throw new Error("D1 binding DB is not configured");
	}
	return createDb(env.DB);
}

export async function getR2(): Promise<R2Bucket> {
	const env = await getEnv();
	if (!env.R2) {
		throw new Error("R2 binding R2 is not configured");
	}
	return env.R2;
}

export async function getR2PublicUrl(): Promise<string> {
	const env = await getEnv();
	return (
		process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ||
		env.R2_PUBLIC_URL?.replace(/\/$/, "") ||
		""
	);
}
