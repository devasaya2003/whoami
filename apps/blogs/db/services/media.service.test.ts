import { expect, it, vi } from "vitest";
import { HttpError } from "./http-error.service";
import { createMediaService, type MediaStorage } from "./media.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

function storage(overrides: Partial<MediaStorage> = {}): MediaStorage {
	return {
		get: vi.fn().mockResolvedValue({
			body: null,
			httpMetadata: { contentType: "image/png" },
			httpEtag: '"e"',
		}),
		put: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		publicBase: vi.fn().mockResolvedValue("https://cdn.example.com"),
		uploadKey: vi.fn(() => "uploads/u1/f.png"),
		resolveUploadKey: vi.fn((raw) => (raw ? raw : null)),
		userUploadPrefix: vi.fn(() => "uploads/u1/"),
		publicObjectUrl: vi.fn((base, key) => `${base}/${key}`),
		mediaProxyPath: vi.fn((key) => `/api/media/${key}`),
		blogsOrigin: vi.fn(() => "https://blogs.local"),
		...overrides,
	};
}

it("loads media objects", async () => {
	const s = storage();
	const service = createMediaService({ storage: s });
	await expect(service.getObject("../x")).rejects.toMatchObject({ status: 400 });
	const res = await service.getObject("uploads/u1/a.png");
	expect(res.headers.get("content-type")).toBe("image/png");
	expect(res.headers.get("etag")).toBe('"e"');

	s.get = vi.fn().mockResolvedValue(null);
	await expect(
		createMediaService({ storage: s }).getObject("uploads/x"),
	).rejects.toThrow(HttpError);

	const bare = storage({
		get: vi.fn().mockResolvedValue({ body: null }),
	});
	const res2 = await createMediaService({ storage: bare }).getObject(
		"uploads/x",
	);
	expect(res2.headers.get("content-type")).toBe("application/octet-stream");
	expect(res2.headers.get("etag")).toBeNull();
});

it("uploads and deletes with ownership checks", async () => {
	const s = storage();
	const service = createMediaService({ storage: s });
	const file = new File(["x"], "a.png", { type: "image/png" });
	expect(await service.upload(user, file)).toEqual({
		key: "uploads/u1/f.png",
		url: "https://cdn.example.com/uploads/u1/f.png",
	});

	const emptyType = new File(["x"], "a.bin", { type: "" });
	await service.upload(user, emptyType);
	const noName = new File(["x"], "", { type: "image/png" });
	Object.defineProperty(noName, "name", { value: "" });
	await service.upload(user, noName);
	expect(s.uploadKey).toHaveBeenCalledWith("u1", "upload.bin");

	await expect(
		service.upload(user, new File(["x"], "a.txt", { type: "text/plain" })),
	).rejects.toMatchObject({ status: 400 });

	const r2Base = storage({
		publicBase: vi
			.fn()
			.mockResolvedValue("https://account.r2.cloudflarestorage.com"),
	});
	expect(
		(
			await createMediaService({ storage: r2Base }).upload(
				user,
				new File(["x"], "a.png", { type: "image/png" }),
			)
		).url,
	).toBe("https://blogs.local/api/media/uploads/u1/f.png");

	const badBase = storage({
		publicBase: vi.fn().mockResolvedValue("::not-a-url"),
	});
	expect(
		(
			await createMediaService({ storage: badBase }).upload(
				user,
				new File(["x"], "a.png", { type: "image/png" }),
			)
		).url,
	).toBe("https://blogs.local/api/media/uploads/u1/f.png");

	const noOrigin = storage({
		publicBase: vi.fn().mockResolvedValue(""),
		blogsOrigin: vi.fn(() => ""),
	});
	expect(
		(
			await createMediaService({ storage: noOrigin }).upload(
				user,
				new File(["x"], "a.png", { type: "image/png" }),
			)
		).url,
	).toBe("/api/media/uploads/u1/f.png");

	expect(await service.remove(user, { key: "uploads/u1/f.png" })).toEqual({
		ok: true,
		key: "uploads/u1/f.png",
	});
	expect(await service.remove(user, { url: "uploads/u1/f.png" })).toEqual({
		ok: true,
		key: "uploads/u1/f.png",
	});
	s.resolveUploadKey = vi.fn(() => null);
	s.publicBase = vi.fn().mockResolvedValue("");
	await expect(service.remove(user, { key: "x" })).rejects.toMatchObject({
		status: 400,
	});
	await expect(service.remove(user, {})).rejects.toMatchObject({ status: 400 });
	s.resolveUploadKey = vi.fn(() => "uploads/other/f.png");
	await expect(
		service.remove(user, { url: "https://cdn/x" }),
	).rejects.toMatchObject({ status: 403 });
});
