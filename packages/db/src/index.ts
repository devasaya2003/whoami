export * from "./schema";
export { createDb, type Db } from "./client";

export function now() {
	return Date.now();
}

export function newId() {
	return crypto.randomUUID();
}
