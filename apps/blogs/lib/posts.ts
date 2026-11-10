import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type PostMeta = {
	slug: string;
	title: string;
	description: string;
	date: string;
};

export type Post = PostMeta & {
	content: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	if (!raw.startsWith("---")) {
		return { data: {}, body: raw };
	}
	const end = raw.indexOf("\n---", 3);
	if (end === -1) {
		return { data: {}, body: raw };
	}
	const matter = raw.slice(4, end).trim();
	const body = raw.slice(end + 4).replace(/^\s*\n/, "");
	const data: Record<string, string> = {};
	for (const line of matter.split("\n")) {
		const sep = line.indexOf(":");
		if (sep === -1) continue;
		const key = line.slice(0, sep).trim();
		const value = line.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
		data[key] = value;
	}
	return { data, body };
}

async function readPostFile(filename: string): Promise<Post> {
	const slug = filename.replace(/\.md$/, "");
	const raw = await readFile(path.join(CONTENT_DIR, filename), "utf8");
	const { data, body } = parseFrontmatter(raw);
	return {
		slug,
		title: data.title ?? slug,
		description: data.description ?? "",
		date: data.date ?? "",
		content: body,
	};
}

export async function getAllPosts(): Promise<PostMeta[]> {
	const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".md"));
	const posts = await Promise.all(files.map(readPostFile));
	return posts
		.map(({ slug, title, description, date }) => ({ slug, title, description, date }))
		.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
	try {
		return await readPostFile(`${slug}.md`);
	} catch {
		return null;
	}
}
