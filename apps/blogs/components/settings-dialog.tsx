"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@repo/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/ui/table";
import { CopyIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { blogsApi, okJson } from "../lib/api";
import { resolvePersonName } from "../lib/display-name";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

type ApiKeyRow = {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
};

type AppRow = {
	id: string;
	name: string;
};

type SettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDisplayNameChange?: (name: string) => void;
};

function CodeBlock({ children }: { children: string }) {
	return (
		<pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
			{children}
		</pre>
	);
}

export function SettingsDialog({
	open,
	onOpenChange,
	onDisplayNameChange,
}: SettingsDialogProps) {
	const { user } = useUser();
	const [displayName, setDisplayName] = useState("");
	const [nameDraft, setNameDraft] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [keys, setKeys] = useState<ApiKeyRow[]>([]);
	const [apps, setApps] = useState<AppRow[]>([]);
	const [loadingKeys, setLoadingKeys] = useState(false);
	const [loadingApps, setLoadingApps] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);

	const host =
		typeof window !== "undefined" ? window.location.origin : "{host-name}";

	const refreshKeys = useCallback(async () => {
		setLoadingKeys(true);
		try {
			const rows = await okJson<ApiKeyRow[]>(
				await blogsApi.api.admin.apis.$get(),
			);
			setKeys(rows);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to load API keys");
		} finally {
			setLoadingKeys(false);
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;

		async function load() {
			let dbName: string | null = null;
			try {
				const res = await blogsApi.api.admin.me.$get();
				if (res.ok) {
					const me = (await res.json()) as { name: string | null };
					dbName = me.name;
				}
			} catch {
				// fall through to Clerk name fields only
			}
			if (cancelled) return;
			const resolved = resolvePersonName({
				dbName,
				fullName: user?.fullName,
				firstName: user?.firstName,
				lastName: user?.lastName,
			});
			setDisplayName(resolved);
			setNameDraft(resolved);
		}

		async function loadApps() {
			setLoadingApps(true);
			try {
				const rows = await okJson<AppRow[]>(
					await blogsApi.api.admin.apps.$get(),
				);
				if (!cancelled) setApps(rows);
			} catch {
				if (!cancelled) setApps([]);
			} finally {
				if (!cancelled) setLoadingApps(false);
			}
		}

		void load();
		void loadApps();
		void refreshKeys();
		return () => {
			cancelled = true;
		};
	}, [open, refreshKeys, user]);

	async function saveName() {
		const next = nameDraft.trim();
		if (!next || next === displayName) return;
		if (next.includes("@")) {
			toast.error("Enter a display name, not an email address");
			return;
		}
		setSavingName(true);
		try {
			await okJson(
				await blogsApi.api.admin.me.$patch({ json: { name: next } }),
			);
			// Best-effort Clerk profile sync — DB is source of truth.
			try {
				const parts = next.split(/\s+/);
				await user?.update({
					firstName: parts[0] ?? next,
					lastName: parts.slice(1).join(" ") || undefined,
				});
			} catch (clerkErr) {
				console.warn("Clerk profile name sync skipped", clerkErr);
			}
			setDisplayName(next);
			onDisplayNameChange?.(next);
			toast.success("Name updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save name");
		} finally {
			setSavingName(false);
		}
	}

	async function revoke(id: string) {
		setRevokingId(id);
		try {
			await okJson(
				await blogsApi.api.admin.apis[":apiId"].$delete({
					param: { apiId: id },
				}),
			);
			setKeys((rows) => rows.filter((row) => row.id !== id));
			toast.success("API key revoked");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to revoke key");
		} finally {
			setRevokingId(null);
		}
	}

	async function copyAppId(id: string) {
		try {
			await navigator.clipboard.writeText(id);
			toast.success("App id copied");
		} catch {
			toast.error("Failed to copy app id");
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="flex h-[70vh] w-[min(70vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
					showCloseButton
				>
					<DialogHeader className="border-border border-b px-6 py-5 text-left">
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>
							Update your display name, manage API keys, and review public API
							usage.
						</DialogDescription>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-5">
						<section className="space-y-3">
							<Label htmlFor="settings-display-name">Display name</Label>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Input
									id="settings-display-name"
									onChange={(e) => setNameDraft(e.target.value)}
									placeholder="Your name"
									value={nameDraft}
								/>
								<Button
									disabled={
										savingName ||
										!nameDraft.trim() ||
										nameDraft.trim() === displayName
									}
									onClick={() => void saveName()}
									type="button"
								>
									{savingName ? "Saving…" : "Save"}
								</Button>
							</div>
						</section>

						<section className="space-y-3">
							<div>
								<h3 className="font-medium text-sm">Apps</h3>
								<p className="text-muted-foreground text-xs">
									Use these app ids in the <code>app-id</code> header.
								</p>
							</div>

							<div className="overflow-hidden rounded-xl border border-border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>App id</TableHead>
											<TableHead className="w-[1%] text-right">
												Copy
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loadingApps ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													Loading…
												</TableCell>
											</TableRow>
										) : apps.length === 0 ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													No apps yet.
												</TableCell>
											</TableRow>
										) : (
											apps.map((app) => (
												<TableRow key={app.id}>
													<TableCell className="font-medium">
														{app.name}
													</TableCell>
													<TableCell className="font-mono text-muted-foreground text-xs">
														{app.id}
													</TableCell>
													<TableCell className="text-right">
														<Button
															aria-label={`Copy app id for ${app.name}`}
															onClick={() => void copyAppId(app.id)}
															size="icon-sm"
															type="button"
															variant="ghost"
														>
															<CopyIcon />
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</section>

						<section className="space-y-3">
							<div className="flex items-center justify-between gap-3">
								<div>
									<h3 className="font-medium text-sm">API keys</h3>
									<p className="text-muted-foreground text-xs">
										Keys for public blog access. Secrets are shown once.
									</p>
								</div>
								<Button
									aria-label="Add API key"
									className="rounded-full"
									onClick={() => setCreateOpen(true)}
									size="icon"
									type="button"
									variant="outline"
								>
									<PlusIcon />
								</Button>
							</div>

							<div className="overflow-hidden rounded-xl border border-border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Created</TableHead>
											<TableHead className="w-[1%] text-right">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loadingKeys ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													Loading…
												</TableCell>
											</TableRow>
										) : keys.length === 0 ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													No API keys yet.
												</TableCell>
											</TableRow>
										) : (
											keys.map((key) => (
												<TableRow key={key.id}>
													<TableCell className="font-medium">
														{key.name}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{new Date(key.createdAt).toLocaleString()}
													</TableCell>
													<TableCell className="text-right">
														<Button
															disabled={revokingId === key.id}
															onClick={() => void revoke(key.id)}
															size="sm"
															type="button"
															variant="destructive"
														>
															{revokingId === key.id ? "Revoking…" : "Revoke"}
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</section>

						<section className="space-y-4">
							<div>
								<h3 className="font-medium text-sm">Public API</h3>
								<p className="text-muted-foreground text-xs">
									Authenticate with headers on every request. Only published
									blogs (latest version) are returned.
								</p>
							</div>

							<div className="space-y-2">
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Headers
								</p>
								<CodeBlock>{`x-api-key: YOUR-API-KEY
app-id: YOUR-APP-ID`}</CodeBlock>
							</div>

							<div className="space-y-2">
								<p className="font-medium text-sm">
									GET {host}/api/v1/blogs
								</p>
								<p className="text-muted-foreground text-xs">
									Lists published blogs (latest versions only).
								</p>
								<CodeBlock>{`[
  {
    "id": "...",
    "slug": "...",
    "title": "...",
    "desc": "...",
    "published_at": "...",
    "created_at": "...",
    "updated_at": "..."
  }
]`}</CodeBlock>
							</div>

							<div className="space-y-2">
								<p className="font-medium text-sm">
									GET {host}/api/v1/blogs/{"{blog-id-or-slug}"}
								</p>
								<p className="text-muted-foreground text-xs">
									Returns a published blog. Pass optional header{" "}
									<code>type</code> as a JSON array of formats:{" "}
									<code>html</code>, <code>json</code>, <code>md</code>. Defaults
									to <code>["html"]</code>. Unpublished blogs respond with 404.
								</p>
								<CodeBlock>{`type: ["html","json","md"]`}</CodeBlock>
								<CodeBlock>{`{
  "id": "...",
  "slug": "...",
  "title": "...",
  "desc": "...",
  "content": "<p>...</p>",
  "content_json": { "root": { "...": "Lexical editor state" } },
  "content_md": "# ...",
  "published_at": "...",
  "created_at": "...",
  "updated_at": "..."
}`}</CodeBlock>
							</div>

							<div className="space-y-2">
								<p className="font-medium text-sm">Rendering</p>
								<p className="text-muted-foreground text-xs">
									Use <code>content</code> for static sites (recommended). Use{" "}
									<code>content_json</code> for a Lexical client renderer, or{" "}
									<code>content_md</code> for Markdown consumers. Only formats
									listed in <code>type</code> are included.
								</p>
								<ul className="list-disc space-y-1.5 pl-4 text-muted-foreground text-xs">
									<li>
										<strong className="text-foreground">HTML:</strong> inject{" "}
										<code>content</code> into a container with class{" "}
										<code>published-html</code>. Match CMS typography: ~1rem /
										1.65 line-height, bold h1 1.75rem, semibold h2 1.3rem, h3
										1.1rem, disc/decimal lists with pl-5, blockquotes with a 3px
										left border, mono inline code + pre blocks, images max-width
										100% / max-height 480px / rounded.
									</li>
									<li>
										<strong className="text-foreground">Sanitize:</strong> treat{" "}
										<code>content</code> as untrusted at the edge and sanitize
										before <code>dangerouslySetInnerHTML</code> /{" "}
										<code>set:html</code>.
									</li>
									<li>
										<strong className="text-foreground">Lexical JSON:</strong>{" "}
										<code>content_json</code> is a Lexical{" "}
										<code>SerializedEditorState</code>. Example:{" "}
										<code>
											{`editor.setEditorState(editor.parseEditorState(content_json))`}
										</code>{" "}
										in a read-only composer (same nodes as the CMS: rich text,
										lists, code, images).
									</li>
									<li>
										<strong className="text-foreground">Markdown:</strong>{" "}
										<code>content_md</code> is derived from the published HTML
										(headings, lists, links, code, images).
									</li>
									<li>
										<strong className="text-foreground">Media:</strong> image{" "}
										<code>src</code> values may be absolute CDN URLs or{" "}
										<code>/api/media/…</code> paths on this host — resolve
										relative URLs against {host}.
									</li>
								</ul>
								<CodeBlock>{`<!-- HTML (static) -->
<article class="published-html">
  <!-- sanitized content HTML here -->
</article>

/* Lexical (client) */
editor.setEditable(false);
editor.setEditorState(editor.parseEditorState(content_json));`}</CodeBlock>
							</div>
						</section>
					</div>
				</DialogContent>
			</Dialog>

			<CreateApiKeyDialog
				onCreated={(row) => {
					setKeys((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
				}}
				onOpenChange={setCreateOpen}
				open={createOpen}
			/>
		</>
	);
}
