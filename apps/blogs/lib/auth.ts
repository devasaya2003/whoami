import { auth, currentUser } from "@clerk/nextjs/server";
import { newId, now, userApis, users } from "@repo/db";
import type { Db } from "@repo/db";
import { eq } from "drizzle-orm";
import { sha256Hex } from "./hash";

export type UserRow = typeof users.$inferSelect;

export class HttpError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, body: unknown) {
		super(typeof body === "string" ? body : JSON.stringify(body));
		this.status = status;
		this.body = body;
	}
}

export async function requireClerkUser(db: Db): Promise<UserRow> {
	const session = await auth();
	if (!session.userId) {
		throw new HttpError(401, { error: "Unauthorized" });
	}

	const existing = await db
		.select()
		.from(users)
		.where(eq(users.authId, session.userId))
		.limit(1);
	if (existing[0]) return existing[0];

	const clerkUser = await currentUser();
	const email =
		clerkUser?.primaryEmailAddress?.emailAddress ||
		clerkUser?.emailAddresses?.[0]?.emailAddress ||
		`${session.userId}@users.clerk`;
	const name =
		clerkUser?.fullName ||
		[clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
		null;
	const ts = now();
	const row: UserRow = {
		id: newId(),
		authId: session.userId,
		email,
		name,
		createdAt: ts,
		updatedAt: ts,
	};
	await db.insert(users).values(row);
	return row;
}

export async function resolveUserFromApiKey(
	db: Db,
	request: Request,
): Promise<UserRow | null> {
	const header =
		request.headers.get("authorization") ||
		request.headers.get("x-api-key") ||
		"";
	const raw = header.toLowerCase().startsWith("bearer ")
		? header.slice(7).trim()
		: header.trim();
	if (!raw) return null;

	const hash = await sha256Hex(raw);
	const apiRows = await db
		.select()
		.from(userApis)
		.where(eq(userApis.hash, hash))
		.limit(1);
	const api = apiRows[0];
	if (!api) return null;

	const userRows = await db
		.select()
		.from(users)
		.where(eq(users.id, api.userId))
		.limit(1);
	return userRows[0] ?? null;
}
