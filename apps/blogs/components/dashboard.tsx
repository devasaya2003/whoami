"use client";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AppRow = {
	id: string;
	name: string;
	url: string;
	createdAt: number;
};

type ApiRow = {
	id: string;
	name: string;
	createdAt: number;
};

type BlogRow = {
	id: string;
	slug: string;
	appId: string;
};

type VersionRow = {
	id: string;
	blogId: string;
	version: number;
	title: string;
	status: "draft" | "public";
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: {
			...(init?.body instanceof FormData
				? {}
				: { "content-type": "application/json" }),
			...init?.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || res.statusText);
	}
	return (await res.json()) as T;
}

export function Dashboard() {
	const [apps, setApps] = useState<AppRow[]>([]);
	const [apis, setApis] = useState<ApiRow[]>([]);
	const [blogsByApp, setBlogsByApp] = useState<Record<string, BlogRow[]>>({});
	const [versionsByBlog, setVersionsByBlog] = useState<
		Record<string, VersionRow[]>
	>({});
	const [error, setError] = useState<string | null>(null);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const [appName, setAppName] = useState("");
	const [appUrl, setAppUrl] = useState("");
	const [apiName, setApiName] = useState("");
	const [blogSlug, setBlogSlug] = useState<Record<string, string>>({});

	const loadVersions = useCallback(async (blogId: string) => {
		const versions = await api<VersionRow[]>(
			`/api/admin/blogs/${blogId}/versions`,
		);
		setVersionsByBlog((prev) => ({ ...prev, [blogId]: versions }));
	}, []);

	const loadBlogs = useCallback(
		async (appId: string) => {
			const blogs = await api<BlogRow[]>(`/api/admin/apps/${appId}/blogs`);
			setBlogsByApp((prev) => ({ ...prev, [appId]: blogs }));
			await Promise.all(blogs.map((blog) => loadVersions(blog.id)));
		},
		[loadVersions],
	);

	const refresh = useCallback(async () => {
		setError(null);
		const [nextApps, nextApis] = await Promise.all([
			api<AppRow[]>("/api/admin/apps"),
			api<ApiRow[]>("/api/admin/apis"),
		]);
		setApps(nextApps);
		setApis(nextApis);
		await Promise.all(nextApps.map((app) => loadBlogs(app.id)));
	}, [loadBlogs]);

	useEffect(() => {
		refresh().catch((err: unknown) => {
			setError(err instanceof Error ? err.message : "Failed to load");
		});
	}, [refresh]);

	async function createApp(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await api("/api/admin/apps", {
				method: "POST",
				body: JSON.stringify({ name: appName, url: appUrl }),
			});
			setAppName("");
			setAppUrl("");
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create app");
		} finally {
			setBusy(false);
		}
	}

	async function createApi(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const created = await api<ApiRow & { key: string }>("/api/admin/apis", {
				method: "POST",
				body: JSON.stringify({ name: apiName }),
			});
			setApiName("");
			setCreatedKey(created.key);
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create API key");
		} finally {
			setBusy(false);
		}
	}

	async function revokeApi(id: string) {
		setBusy(true);
		try {
			await api(`/api/admin/apis/${id}`, { method: "DELETE" });
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to revoke key");
		} finally {
			setBusy(false);
		}
	}

	async function createBlog(appId: string) {
		const slug = (blogSlug[appId] || "").trim();
		if (!slug) return;
		setBusy(true);
		try {
			await api(`/api/admin/apps/${appId}/blogs`, {
				method: "POST",
				body: JSON.stringify({ slug }),
			});
			setBlogSlug((prev) => ({ ...prev, [appId]: "" }));
			await loadBlogs(appId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create blog");
		} finally {
			setBusy(false);
		}
	}

	async function createVersion(blogId: string, appId: string) {
		setBusy(true);
		try {
			await api(`/api/admin/blogs/${blogId}/versions`, { method: "POST" });
			await loadBlogs(appId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create version");
		} finally {
			setBusy(false);
		}
	}

	async function publishVersion(versionId: string, appId: string) {
		setBusy(true);
		try {
			await api(`/api/admin/versions/${versionId}/publish`, { method: "POST" });
			await loadBlogs(appId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to publish");
		} finally {
			setBusy(false);
		}
	}

	async function deleteBlog(blogId: string, appId: string) {
		setBusy(true);
		try {
			await api(`/api/admin/blogs/${blogId}`, { method: "DELETE" });
			await loadBlogs(appId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete blog");
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pb-16">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">Blogs CMS</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Manage apps, API keys, and post versions for your sites.
				</p>
			</div>

			{error ? (
				<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
					{error}
				</p>
			) : null}

			{createdKey ? (
				<div className="rounded-lg border border-border px-3 py-3 text-sm">
					<p className="font-medium">API key created (copy now — shown once)</p>
					<code className="mt-2 block break-all text-xs">{createdKey}</code>
					<Button
						className="mt-3"
						onClick={() => setCreatedKey(null)}
						size="sm"
						type="button"
						variant="outline"
					>
						Dismiss
					</Button>
				</div>
			) : null}

			<section className="space-y-4">
				<h2 className="text-lg font-medium">Apps</h2>
				<form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createApp}>
					<div className="flex-1 space-y-1.5">
						<Label htmlFor="app-name">Name</Label>
						<Input
							id="app-name"
							onChange={(e) => setAppName(e.target.value)}
							placeholder="portfolio"
							required
							value={appName}
						/>
					</div>
					<div className="flex-1 space-y-1.5">
						<Label htmlFor="app-url">URL</Label>
						<Input
							id="app-url"
							onChange={(e) => setAppUrl(e.target.value)}
							placeholder="https://example.com"
							required
							value={appUrl}
						/>
					</div>
					<Button disabled={busy} type="submit">
						Create app
					</Button>
				</form>

				{apps.length === 0 ? (
					<p className="text-muted-foreground text-sm">No apps yet.</p>
				) : (
					<ul className="space-y-8">
						{apps.map((app) => (
							<li className="space-y-4 border-t border-border pt-6" key={app.id}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<div>
										<p className="font-medium">{app.name}</p>
										<p className="text-muted-foreground text-xs">{app.url}</p>
									</div>
									<p className="text-muted-foreground text-xs">id: {app.id}</p>
								</div>

								<form
									className="flex flex-col gap-2 sm:flex-row sm:items-end"
									onSubmit={(event) => {
										event.preventDefault();
										void createBlog(app.id);
									}}
								>
									<div className="flex-1 space-y-1.5">
										<Label htmlFor={`slug-${app.id}`}>New blog slug</Label>
										<Input
											id={`slug-${app.id}`}
											onChange={(e) =>
												setBlogSlug((prev) => ({
													...prev,
													[app.id]: e.target.value,
												}))
											}
											placeholder="hello-world"
											value={blogSlug[app.id] ?? ""}
										/>
									</div>
									<Button disabled={busy} type="submit" variant="outline">
										Create blog
									</Button>
								</form>

								<ul className="space-y-4">
									{(blogsByApp[app.id] ?? []).map((blog) => (
										<li className="space-y-2" key={blog.id}>
											<div className="flex flex-wrap items-center gap-3">
												<p className="font-medium text-sm">/{blog.slug}</p>
												<Button
													disabled={busy}
													onClick={() => void createVersion(blog.id, app.id)}
													size="sm"
													type="button"
													variant="outline"
												>
													New version
												</Button>
												<Button
													disabled={busy}
													onClick={() => void deleteBlog(blog.id, app.id)}
													size="sm"
													type="button"
													variant="ghost"
												>
													Delete
												</Button>
											</div>
											<ul className="space-y-1 pl-3 text-sm">
												{(versionsByBlog[blog.id] ?? []).map((version) => (
													<li
														className="flex flex-wrap items-center gap-3"
														key={version.id}
													>
														<span>
															v{version.version}{" "}
															{version.title ? `— ${version.title}` : ""}{" "}
															<span className="text-muted-foreground">
																({version.status})
															</span>
														</span>
														<Link
															className="underline"
															href={`/editor/${version.id}`}
														>
															Edit
														</Link>
														{version.status !== "public" ? (
															<button
																className="underline disabled:opacity-50"
																disabled={busy}
																onClick={() =>
																	void publishVersion(version.id, app.id)
																}
																type="button"
															>
																Publish
															</button>
														) : null}
													</li>
												))}
											</ul>
										</li>
									))}
								</ul>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-medium">API keys</h2>
				<form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createApi}>
					<div className="flex-1 space-y-1.5">
						<Label htmlFor="api-name">Name</Label>
						<Input
							id="api-name"
							onChange={(e) => setApiName(e.target.value)}
							placeholder="astro-web"
							required
							value={apiName}
						/>
					</div>
					<Button disabled={busy} type="submit">
						Create key
					</Button>
				</form>
				{apis.length === 0 ? (
					<p className="text-muted-foreground text-sm">No API keys yet.</p>
				) : (
					<ul className="space-y-2 text-sm">
						{apis.map((item) => (
							<li
								className="flex items-center justify-between gap-3 border-t border-border pt-2"
								key={item.id}
							>
								<span>{item.name}</span>
								<Button
									disabled={busy}
									onClick={() => void revokeApi(item.id)}
									size="sm"
									type="button"
									variant="ghost"
								>
									Revoke
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
