"use client";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { useEffect, useRef, useState } from "react";

type VersionPayload = {
	id: string;
	title: string;
	description: string;
	status: "draft" | "public";
	docSnapshot: string;
	contentHtml: string;
};

/**
 * CMS editor for a blog version.
 *
 * BlockSuite 0.22 ships package exports that point at raw `.ts` sources, which
 * Next/Turbopack cannot load ("Unknown module type"). Until those packages
 * publish browser-ready ESM (or we run a custom webpack transpile of ~70
 * @blocksuite packages), we use a contenteditable surface and persist
 * `contentHtml` + a lightweight `docSnapshot` JSON envelope.
 */
export function BlockSuiteEditor({ versionId }: { versionId: string }) {
	const editorRef = useRef<HTMLDivElement>(null);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "public">("draft");
	const [initialHtml, setInitialHtml] = useState("");
	const [ready, setReady] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [uploadUrl, setUploadUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			const res = await fetch(`/api/admin/versions/${versionId}`);
			if (!res.ok) throw new Error("Failed to load version");
			const version = (await res.json()) as VersionPayload;
			if (cancelled) return;

			setTitle(version.title);
			setDescription(version.description);
			setStatus(version.status);

			let html = version.contentHtml || "";
			if (!html && version.docSnapshot) {
				try {
					const snap = JSON.parse(version.docSnapshot) as {
						html?: string;
						contentHtml?: string;
					};
					html = snap.html ?? snap.contentHtml ?? "";
				} catch {
					// ignore invalid snapshot
				}
			}
			setInitialHtml(html || "<p></p>");
			setReady(true);
		}

		load().catch((err: unknown) => {
			console.error(err);
			if (!cancelled) {
				setMessage(err instanceof Error ? err.message : "Failed to load");
				setInitialHtml("<p></p>");
				setReady(true);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [versionId]);

	useEffect(() => {
		if (!ready || !editorRef.current) return;
		if (!editorRef.current.innerHTML.trim()) {
			editorRef.current.innerHTML = initialHtml || "<p></p>";
		}
	}, [ready, initialHtml]);

	async function save() {
		setSaving(true);
		setMessage(null);
		try {
			const contentHtml = editorRef.current?.innerHTML ?? "";
			const docSnapshot = JSON.stringify({
				format: "html",
				html: contentHtml,
			});

			const res = await fetch(`/api/admin/versions/${versionId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title,
					description,
					status,
					docSnapshot,
					contentHtml,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			setMessage("Saved");
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Save failed");
		} finally {
			setSaving(false);
		}
	}

	async function onUpload(file: File | null) {
		if (!file) return;
		setMessage(null);
		try {
			const form = new FormData();
			form.set("file", file);
			const res = await fetch("/api/admin/uploads", {
				method: "POST",
				body: form,
			});
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { url: string };
			setUploadUrl(data.url);
			await navigator.clipboard?.writeText(data.url);

			if (editorRef.current) {
				const img = document.createElement("img");
				img.src = data.url;
				img.alt = file.name;
				editorRef.current.appendChild(img);
			}
			setMessage("Uploaded — image inserted and URL copied");
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Upload failed");
		}
	}

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-16">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Editor</h1>
					<p className="text-muted-foreground text-sm">Version {versionId}</p>
				</div>
				<Button disabled={saving || !ready} onClick={() => void save()} type="button">
					{saving ? "Saving…" : "Save"}
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
						onChange={(e) => setTitle(e.target.value)}
						value={title}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="status">Status</Label>
					<select
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
						id="status"
						onChange={(e) =>
							setStatus(e.target.value === "public" ? "public" : "draft")
						}
						value={status}
					>
						<option value="draft">draft</option>
						<option value="public">public</option>
					</select>
				</div>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					onChange={(e) => setDescription(e.target.value)}
					value={description}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Label className="text-sm" htmlFor="upload">
					Upload image
				</Label>
				<input
					accept="image/*"
					id="upload"
					onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
					type="file"
				/>
				{uploadUrl ? (
					<code className="break-all text-muted-foreground text-xs">{uploadUrl}</code>
				) : null}
			</div>

			{message ? <p className="text-muted-foreground text-sm">{message}</p> : null}

			{!ready ? (
				<p className="text-muted-foreground text-sm">Loading editor…</p>
			) : (
				<div
					className="prose min-h-[420px] max-w-none rounded-lg border border-border bg-background p-4 outline-none dark:prose-invert"
					contentEditable
					ref={editorRef}
					suppressContentEditableWarning
				/>
			)}
		</div>
	);
}
