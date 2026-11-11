"use client";

import { Button } from "@repo/ui/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { blogsApi, okJson } from "../lib/api";
import { CmsHeader } from "./cms-header";
import { ResourceGrid, type ResourceCardItem } from "./resource-grid";

type AppRow = {
	id: string;
	name: string;
	url: string;
};

type BlogCard = {
	id: string;
	slug: string;
	appId: string;
	title: string;
	description: string;
	status: "draft" | "public";
	updatedAt: number;
};

type AppBlogsDashboardProps = {
	appId: string;
};

export function AppBlogsDashboard({ appId }: AppBlogsDashboardProps) {
	const router = useRouter();
	const [app, setApp] = useState<AppRow | null>(null);
	const [blogs, setBlogs] = useState<BlogCard[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		setError(null);
		const [appRow, blogRows] = await Promise.all([
			okJson<AppRow>(
				await blogsApi.api.admin.apps[":appId"].$get({
					param: { appId },
				}),
			),
			okJson<BlogCard[]>(
				await blogsApi.api.admin.apps[":appId"].blogs.$get({
					param: { appId },
				}),
			),
		]);
		setApp(appRow);
		setBlogs(blogRows);
	}, [appId]);

	useEffect(() => {
		refresh().catch((err: unknown) => {
			setError(err instanceof Error ? err.message : "Failed to load blogs");
		});
	}, [refresh]);

	async function createBlog() {
		setBusy(true);
		setError(null);
		try {
			const created = await okJson<{
				blog: { id: string };
			}>(
				await blogsApi.api.admin.apps[":appId"].blogs.$post({
					param: { appId },
					json: { title: "Untitled" },
				}),
			);
			router.push(`/editor/${created.blog.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create blog");
			setBusy(false);
		}
	}

	async function openEditor(blog: BlogCard) {
		router.push(`/editor/${blog.id}`);
	}

	const items: ResourceCardItem[] = blogs.map((blog) => ({
		id: blog.id,
		title: blog.title || blog.slug,
		subtitle: `/${blog.slug}`,
		description: blog.description || "No description yet.",
		badge: blog.status,
	}));

	const byId = new Map(blogs.map((b) => [b.id, b]));

	return (
		<>
			<CmsHeader
				createBusy={busy}
				createMode="blog"
				onCreate={() => void createBlog()}
			/>

			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="text-lg font-medium tracking-tight">
							{app?.name ?? "Blogs"}
						</h1>
						<p className="text-muted-foreground text-sm">
							{app?.url
								? `Posts for ${app.url}`
								: "Write, edit, and publish posts for this app."}
						</p>
					</div>
					<Button nativeButton={false} render={<Link href="/" />} variant="outline">
						Back to apps
					</Button>
				</div>

				{error ? (
					<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
						{error}
					</p>
				) : null}

				<ResourceGrid
					emptyHint="Click + in the header (or here) to create a draft."
					emptyTitle="No blogs yet"
					items={items}
					onEdit={(id) => {
						const blog = byId.get(id);
						if (blog) void openEditor(blog);
					}}
					onEmptyClick={() => void createBlog()}
					onOpen={(id) => {
						const blog = byId.get(id);
						if (blog) void openEditor(blog);
					}}
					editLabel="Edit"
				/>
			</main>
		</>
	);
}
