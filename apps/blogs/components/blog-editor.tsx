"use client";

import { $generateHtmlFromNodes } from "@lexical/html";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { Button } from "@repo/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import type { EditorState, LexicalEditor, SerializedEditorState } from "lexical";
import { ArrowLeftIcon, GlobeIcon, GlobeLockIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NotionEditor } from "@/components/lexical-editor/editor";
import { PublishedHtml } from "@/components/published-html";
import { SettingsDialog } from "@/components/settings-dialog";

type VersionPayload = {
	id: string;
	title: string;
	description: string;
	status: "draft" | "public";
	docSnapshot: string;
	contentHtml: string;
	blogId?: string;
	appId?: string;
};

type SnapshotEnvelope = {
	format?: string;
	json?: SerializedEditorState;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 800;

function parseInitialState(
	version: VersionPayload,
): SerializedEditorState | null {
	if (!version.docSnapshot) return null;
	try {
		const snap = JSON.parse(version.docSnapshot) as SnapshotEnvelope;
		if (snap.format === "lexical-json-v1" && snap.json) {
			return snap.json;
		}
	} catch {
		// ignore invalid snapshots / old formats
	}
	return null;
}

export function BlogEditor({ versionId }: { versionId: string }) {
	const editorRef = useRef<LexicalEditor | null>(null);
	const skipAutosave = useRef(true);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latest = useRef({
		title: "",
		description: "",
		status: "draft" as "draft" | "public",
	});

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "public">("draft");
	const [contentHtml, setContentHtml] = useState("");
	const [initialState, setInitialState] = useState<
		SerializedEditorState | null | undefined
	>(undefined);
	const [appId, setAppId] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [ready, setReady] = useState(false);
	const [statusBusy, setStatusBusy] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const isPublic = status === "public";

	useEffect(() => {
		let cancelled = false;
		skipAutosave.current = true;
		setReady(false);
		setInitialState(undefined);
		setSaveStatus("idle");

		async function load() {
			const res = await fetch(`/api/admin/versions/${versionId}`);
			if (!res.ok) throw new Error("Failed to load version");
			const version = (await res.json()) as VersionPayload;
			if (cancelled) return;

			setTitle(version.title);
			setDescription(version.description);
			setStatus(version.status);
			setContentHtml(version.contentHtml || "");
			latest.current = {
				title: version.title,
				description: version.description,
				status: version.status,
			};
			setInitialState(parseInitialState(version));
			if (version.appId) setAppId(version.appId);
		}

		load().catch((err: unknown) => {
			console.error(err);
			if (!cancelled) {
				setSaveStatus("error");
				setInitialState(null);
				toast.error("Failed to load version");
			}
		});

		return () => {
			cancelled = true;
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, [versionId]);

	const persistDraft = useCallback(async () => {
		const editor = editorRef.current;
		if (!editor) return;
		setSaveStatus("saving");
		try {
			const { title: t, description: d } = latest.current;
			const json = editor.getEditorState().toJSON();
			let html = "";
			editor.getEditorState().read(() => {
				html = $generateHtmlFromNodes(editor, null);
			});
			const docSnapshot = JSON.stringify({
				format: "lexical-json-v1",
				json,
			});

			const res = await fetch(`/api/admin/versions/${versionId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title: t,
					description: d,
					status: "draft",
					docSnapshot,
					contentHtml: html,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			setContentHtml(html);
			setSaveStatus("saved");
		} catch (err) {
			console.error(err);
			setSaveStatus("error");
			throw err;
		}
	}, [versionId]);

	const scheduleSave = useCallback(() => {
		if (skipAutosave.current || !editorRef.current) return;
		if (latest.current.status === "public") return;
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			void persistDraft().catch(() => {
				toast.error("Autosave failed");
			});
		}, AUTOSAVE_MS);
	}, [persistDraft]);

	const onReady = useCallback((editor: LexicalEditor) => {
		editorRef.current = editor;
		setReady(true);
		window.setTimeout(() => {
			skipAutosave.current = false;
		}, 150);
	}, []);

	const onEditorChange = useCallback(
		(_state: EditorState, _editor: LexicalEditor) => {
			scheduleSave();
		},
		[scheduleSave],
	);

	function onTitleChange(value: string) {
		if (latest.current.status === "public") return;
		setTitle(value);
		latest.current = { ...latest.current, title: value };
		scheduleSave();
	}

	function onDescriptionChange(value: string) {
		if (latest.current.status === "public") return;
		setDescription(value);
		latest.current = { ...latest.current, description: value };
		scheduleSave();
	}

	async function publish() {
		if (statusBusy) return;
		setStatusBusy(true);
		try {
			if (saveTimer.current) clearTimeout(saveTimer.current);
			await persistDraft();

			const editor = editorRef.current;
			let html = contentHtml;
			if (editor) {
				editor.getEditorState().read(() => {
					html = $generateHtmlFromNodes(editor, null);
				});
			}

			const res = await fetch(`/api/admin/versions/${versionId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					status: "public",
					contentHtml: html,
				}),
			});
			if (!res.ok) throw new Error(await res.text());

			setContentHtml(html);
			setStatus("public");
			latest.current = { ...latest.current, status: "public" };
			skipAutosave.current = true;
			toast.success("Published");
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : "Publish failed");
		} finally {
			setStatusBusy(false);
		}
	}

	async function unpublish() {
		if (statusBusy) return;
		setStatusBusy(true);
		try {
			const res = await fetch(`/api/admin/versions/${versionId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ status: "draft" }),
			});
			if (!res.ok) throw new Error(await res.text());

			setStatus("draft");
			latest.current = { ...latest.current, status: "draft" };
			setReady(false);
			skipAutosave.current = true;
			editorRef.current = null;
			toast.success("Unpublished — you can edit again");
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : "Unpublish failed");
		} finally {
			setStatusBusy(false);
		}
	}

	const backHref = appId ? `/apps/${appId}` : "/";

	const statusLabel =
		saveStatus === "saving"
			? "Saving…"
			: saveStatus === "saved"
				? "Saved"
				: saveStatus === "error"
					? "Save failed"
					: "";

	return (
		<TooltipProvider>
			<div className="flex min-h-dvh flex-col bg-background">
				<header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-sm sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Back to blogs"
										className="rounded-full"
										nativeButton={false}
										render={<Link href={backHref} />}
										size="icon"
										variant="outline"
									/>
								}
							>
								<ArrowLeftIcon />
							</TooltipTrigger>
							<TooltipContent>Back</TooltipContent>
						</Tooltip>
						<p className="truncate text-muted-foreground text-sm">
							{title.trim() || "Untitled"}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{!isPublic && statusLabel ? (
							<span
								className={`text-xs ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}
							>
								{statusLabel}
							</span>
						) : null}
						<ThemeToggle variant="outline" />
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Settings"
										className="rounded-full"
										onClick={() => setSettingsOpen(true)}
										size="icon"
										type="button"
										variant="outline"
									/>
								}
							>
								<SettingsIcon />
							</TooltipTrigger>
							<TooltipContent>Settings</TooltipContent>
						</Tooltip>
						{isPublic ? (
							<button
								className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:opacity-60 dark:text-emerald-400"
								disabled={statusBusy}
								onClick={() => void unpublish()}
								type="button"
							>
								<span className="inline-flex size-7 items-center justify-center rounded-full border border-emerald-500/50 bg-background">
									<GlobeIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
								</span>
								<span className="pr-1 text-xs font-medium">
									{statusBusy ? "Unpublishing…" : "Unpublish to edit"}
								</span>
							</button>
						) : (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											aria-label="Publish"
											className="rounded-full"
											disabled={!ready || statusBusy}
											onClick={() => void publish()}
											size="icon"
											type="button"
											variant="outline"
										/>
									}
								>
									<GlobeLockIcon />
								</TooltipTrigger>
								<TooltipContent>Publish</TooltipContent>
							</Tooltip>
						)}
					</div>
				</header>

				<main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-10 sm:px-8">
					{initialState === undefined ? (
						<p className="text-muted-foreground text-sm">Loading…</p>
					) : isPublic ? (
						<div className="px-14 max-[996px]:px-8">
							<h1 className="mb-2 font-bold text-4xl tracking-tight">
								{title.trim() || "Untitled"}
							</h1>
							{description.trim() ? (
								<p className="mb-8 text-lg text-muted-foreground">
									{description}
								</p>
							) : (
								<div className="mb-8" />
							)}
							{contentHtml.trim() ? (
								<PublishedHtml
									className="published-html space-y-3 text-[1rem] leading-[1.65] [&_a]:underline [&_blockquote]:border-l-3 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-zinc-500 [&_code]:rounded-[3px] [&_code]:bg-[rgba(135,131,120,0.15)] [&_code]:px-[0.3em] [&_code]:py-[0.1em] [&_code]:font-mono [&_code]:text-[0.875em] [&_h1]:text-[1.75rem] [&_h1]:font-bold [&_h2]:text-[1.3rem] [&_h2]:font-semibold [&_h3]:text-[1.1rem] [&_h3]:font-semibold [&_img]:my-3 [&_img]:max-h-[480px] [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[0.875rem] dark:[&_blockquote]:border-zinc-700 dark:[&_blockquote]:text-zinc-400 dark:[&_pre]:bg-zinc-900 [&_ul]:list-disc [&_ul]:pl-5"
									html={contentHtml}
								/>
							) : (
								<p className="text-muted-foreground text-sm">No content yet.</p>
							)}
						</div>
					) : (
						<>
							<div className="px-14 max-[996px]:px-8">
								<input
									aria-label="Title"
									className="mb-2 w-full border-0 bg-transparent font-bold text-4xl tracking-tight outline-none placeholder:text-muted-foreground/50"
									onChange={(e) => onTitleChange(e.target.value)}
									placeholder="Untitled"
									value={title}
								/>
								<input
									aria-label="Description"
									className="mb-6 w-full border-0 bg-transparent text-lg text-muted-foreground outline-none placeholder:text-muted-foreground/40"
									onChange={(e) => onDescriptionChange(e.target.value)}
									placeholder="Add a description…"
									value={description}
								/>
							</div>
							<NotionEditor
								initialState={initialState}
								key={`${versionId}-draft`}
								onChange={onEditorChange}
								onReady={onReady}
							/>
						</>
					)}
				</main>

				<SettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
			</div>
		</TooltipProvider>
	);
}
