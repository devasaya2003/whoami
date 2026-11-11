import { expect, it, vi } from "vitest";
import { HttpError } from "../services/http-error.service";
import { createPublicBlogsRouter } from "./public-blogs.router";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

function app(resolve: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(user)) {
	const service = {
		list: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue({ id: "b1" }),
	};
	return {
		service,
		resolve,
		router: createPublicBlogsRouter({
			service: service as never,
			resolveApiUser: resolve as never,
		}),
	};
}

it("lists and gets public blogs via api key", async () => {
	const { router, service, resolve } = app();
	const list = await router.handle(
		new Request("http://localhost/api/v1/blogs", {
			headers: { "app-id": "a1", "x-api-key": "k" },
		}),
	);
	expect(list.status).toBe(200);
	expect(service.list).toHaveBeenCalledWith(user, "a1");

	const get = await router.handle(
		new Request("http://localhost/api/v1/blogs/hello", {
			headers: { "app-id": "a1", type: '["html","md"]' },
		}),
	);
	expect(get.status).toBe(200);
	expect(service.get).toHaveBeenCalledWith(
		user,
		"a1",
		"hello",
		'["html","md"]',
	);

	resolve.mockResolvedValueOnce(null);
	const unauthorized = await router.handle(new Request("http://localhost/api/v1/blogs"));
	expect(unauthorized.status).toBe(401);

	resolve.mockResolvedValueOnce(null);
	const unauthorizedGet = await router.handle(
		new Request("http://localhost/api/v1/blogs/x"),
	);
	expect(unauthorizedGet.status).toBe(401);

	const noApp = await router.handle(
		new Request("http://localhost/api/v1/blogs/hello", {
			headers: { "x-api-key": "k" },
		}),
	);
	expect(noApp.status).toBe(200);
	expect(service.get).toHaveBeenCalledWith(user, null, "hello", null);
});

it("surfaces service http errors", async () => {
	const { router, service } = app();
	service.list.mockRejectedValueOnce(new HttpError(400, { error: "no app" }));
	const res = await router.handle(
		new Request("http://localhost/api/v1/blogs", { headers: { "x-api-key": "k" } }),
	);
	expect(res.status).toBe(400);
});
