import { vi } from "vitest";

type QueryChain = Promise<unknown> & {
	from: ReturnType<typeof vi.fn>;
	where: ReturnType<typeof vi.fn>;
	orderBy: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
	innerJoin: ReturnType<typeof vi.fn>;
	leftJoin: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
	values: ReturnType<typeof vi.fn>;
	returning: ReturnType<typeof vi.fn>;
};

/** Fluent drizzle-like query builder that resolves to `result` when awaited. */
export function chain(result: unknown = undefined): QueryChain {
	const api = Promise.resolve(result) as QueryChain;
	const methods = [
		"from",
		"where",
		"orderBy",
		"limit",
		"innerJoin",
		"leftJoin",
		"set",
		"values",
		"returning",
	] as const;
	for (const method of methods) {
		api[method] = vi.fn(() => api);
	}
	return api;
}

export function createMockDb() {
	return {
		select: vi.fn(() => chain([])),
		insert: vi.fn(() => chain(undefined)),
		update: vi.fn(() => chain(undefined)),
		delete: vi.fn(() => chain(undefined)),
	};
}
