import { expect, it, vi } from "vitest";
import { HttpError } from "./http-error.service";
import {
	createPublicBlogsService,
	parseContentFormats,
} from "./public-blogs.service";

const user = {
	id: "u1",
	email: "a@b.c",
	name: "A",
	authId: "auth",
	createdAt: 1,
	updatedAt: 1,
};

function setup() {
	const blogs = {
		listPublicForApp: vi.fn().mockResolvedValue([
			{
				id: "b1",
				slug: "s",
				title: "T",
				desc: "D",
				createdAt: 1,
				updatedAt: 2,
				publishedAt: 3,
			},
		]),
		findPublicByIdOrSlug: vi.fn().mockResolvedValue({
			id: "b1",
			slug: "s",
			title: "T",
			desc: "D",
			content: "<p>Hi</p>",
			docSnapshot: JSON.stringify({
				format: "lexical-json-v1",
				json: { root: {} },
			}),
			createdAt: 1,
			updatedAt: 2,
			publishedAt: 3,
		}),
	};
	const htmlToMarkdown = vi.fn((html: string) => `md:${html}`);
	return {
		blogs,
		service: createPublicBlogsService({ blogs, htmlToMarkdown }),
		htmlToMarkdown,
	};
}

it("parses type headers", () => {
	expect(parseContentFormats(null)).toEqual(["html"]);
	expect(parseContentFormats('["html","md"]')).toEqual(["html", "md"]);
	expect(parseContentFormats('["html","html"]')).toEqual(["html"]);
	expect(() => parseContentFormats("{")).toThrow(HttpError);
	expect(() => parseContentFormats("[]")).toThrow(HttpError);
	expect(() => parseContentFormats('["pdf"]')).toThrow(HttpError);
});

it("lists published blogs for an app", async () => {
	const { service, blogs } = setup();
	await expect(service.list(user, null)).rejects.toMatchObject({
		status: 400,
	});
	const rows = await service.list(user, "a1");
	expect(blogs.listPublicForApp).toHaveBeenCalledWith("u1", "a1");
	expect(rows[0]).toMatchObject({
		id: "b1",
		published_at: expect.any(String),
	});
});

it("returns selected content formats", async () => {
	const { service, blogs, htmlToMarkdown } = setup();
	await expect(service.get(user, null, "s", null)).rejects.toMatchObject({
		status: 400,
	});
	blogs.findPublicByIdOrSlug.mockResolvedValueOnce(null);
	await expect(service.get(user, "a1", "s", null)).rejects.toMatchObject({
		status: 404,
	});

	const htmlOnly = await service.get(user, "a1", "s", null);
	expect(htmlOnly).toHaveProperty("content");
	expect(htmlOnly).not.toHaveProperty("content_json");
	expect(htmlOnly).not.toHaveProperty("content_md");

	const all = await service.get(user, "a1", "s", '["html","json","md"]');
	expect(all.content).toBe("<p>Hi</p>");
	expect(all.content_json).toEqual({ root: {} });
	expect(all.content_md).toBe("md:<p>Hi</p>");
	expect(htmlToMarkdown).toHaveBeenCalled();

	blogs.findPublicByIdOrSlug.mockResolvedValueOnce({
		id: "b1",
		slug: "s",
		title: "T",
		desc: "D",
		content: "",
		docSnapshot: "",
		createdAt: 0,
		updatedAt: 0,
		publishedAt: null,
	});
	const empty = await service.get(user, "a1", "s", '["json","md"]');
	expect(empty.content_json).toBeNull();
	expect(empty.content_md).toBe("md:");
	expect(empty.published_at).toBe("");

	blogs.findPublicByIdOrSlug.mockResolvedValueOnce({
		id: "b1",
		slug: "s",
		title: "T",
		desc: "D",
		content: "x",
		docSnapshot: "{not-json",
		createdAt: 1,
		updatedAt: 1,
		publishedAt: 1,
	});
	expect(
		(await service.get(user, "a1", "s", '["json"]')).content_json,
	).toBeNull();

	blogs.findPublicByIdOrSlug.mockResolvedValueOnce({
		id: "b1",
		slug: "s",
		title: "T",
		desc: "D",
		content: "x",
		docSnapshot: JSON.stringify({ root: { children: [] } }),
		createdAt: 1,
		updatedAt: 1,
		publishedAt: 1,
	});
	expect(
		(await service.get(user, "a1", "s", '["json"]')).content_json,
	).toEqual({ root: { children: [] } });
});
