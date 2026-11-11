"use client";

import { $generateHtmlFromNodes } from "@lexical/html";
import { Button } from "@repo/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import type { EditorState, LexicalEditor, SerializedEditorState } from "lexical";
import { ArrowLeftIcon, GlobeIcon, GlobeLockIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotionEditor } from "@/components/lexical-editor/editor";

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
	const [initialState, setInitialState] = useState<
		SerializedEditorState | null | undefined
	>(undefined);
	const [appId, setAppId] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [ready, setReady] = useState(false);

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
			}
		});

		return () => {
			cancelled = true;
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, [versionId]);

	const persist = useCallback(async () => {
		const editor = editorRef.current;
		if (!editor) return;
		setSaveStatus("saving");
		try {
			const { title: t, description: d, status: s } = latest.current;
			const json = editor.getEditorState().toJSON();
			let contentHtml = "";
			editor.getEditorState().read(() => {
				contentHtml = $generateHtmlFromNodes(editor, null);
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
					status: s,
					docSnapshot,
					contentHtml,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			setSaveStatus("saved");
		} catch (err) {
			console.error(err);
			setSaveStatus("error");
		}
	}, [versionId]);

	const scheduleSave = useCallback(() => {
		if (skipAutosave.current || !editorRef.current) return;
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			void persist();
		}, AUTOSAVE_MS);
	}, [persist]);

	const onReady = useCallback((editor: LexicalEditor) => {
		editorRef.current = editor;
		setReady(true);
		// skip hydrate / initial OnChange before enabling autosave
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
		setTitle(value);
		latest.current = { ...latest.current, title: value };
		scheduleSave();
	}

	function onDescriptionChange(value: string) {
		setDescription(value);
		latest.current = { ...latest.current, description: value };
		scheduleSave();
	}

	function togglePublish() {
		const next = status === "public" ? "draft" : "public";
		setStatus(next);
		latest.current = { ...latest.current, status: next };
		if (saveTimer.current) clearTimeout(saveTimer.current);
		void persist();
	}

	const backHref = appId ? `/apps/${appId}` : "/";
	const isPublic = status === "public";

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
						{statusLabel ? (
							<span
								className={`text-xs ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}
							>
								{statusLabel}
							</span>
						) : null}
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label={isPublic ? "Unpublish" : "Publish"}
										className="rounded-full"
										disabled={!ready}
										onClick={togglePublish}
										size="icon"
										type="button"
										variant="outline"
									/>
								}
							>
								{isPublic ? <GlobeLockIcon /> : <GlobeIcon />}
							</TooltipTrigger>
							<TooltipContent>
								{isPublic ? "Unpublish" : "Publish"}
							</TooltipContent>
						</Tooltip>
					</div>
				</header>

				<main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-10 sm:px-8">
					{initialState === undefined ? (
						<p className="text-muted-foreground text-sm">Loading…</p>
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
									className="mb-6 w-full border-0 bg-transparent text-muted-foreground text-lg outline-none placeholder:text-muted-foreground/40"
									onChange={(e) => onDescriptionChange(e.target.value)}
									placeholder="Add a description…"
									value={description}
								/>
							</div>
							<NotionEditor
								initialState={initialState}
								key={versionId}
								onChange={onEditorChange}
								onReady={onReady}
							/>
						</>
					)}
				</main>
			</div>
		</TooltipProvider>
	);
}
