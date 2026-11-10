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

type StoreLike = {
	root: unknown;
	provider: unknown;
	addBlock: (flavour: string, props?: Record<string, unknown>, parent?: string) => string;
	getAllModels: () => Array<{ text?: { toString?: () => string } }>;
	getTransformer: () => {
		docToSnapshot: (store: StoreLike) => unknown;
		snapshotToDoc: (snapshot: unknown) => Promise<unknown>;
	};
};

async function loadBlocksuite() {
	// Non-literal import specifiers keep tsc from following BlockSuite source exports.
	const effectsPath = "@blocksuite/affine/effects";
	const storeExtPath = "@blocksuite/affine/extensions/store";
	const viewExtPath = "@blocksuite/affine/extensions/view";
	const extLoaderPath = "@blocksuite/affine/ext-loader";
	const testPath = "@blocksuite/affine/store/test";
	const stdPath = "@blocksuite/affine/std";
	const storePath = "@blocksuite/affine/store";
	const adaptersPath = "@blocksuite/affine/shared/adapters";

	await import(effectsPath);
	const { getInternalStoreExtensions } = await import(storeExtPath);
	const { getInternalViewExtensions } = await import(viewExtPath);
	const { StoreExtensionManager, ViewExtensionManager } = await import(extLoaderPath);
	const { TestWorkspace } = await import(testPath);
	const { BlockStdScope } = await import(stdPath);
	const { Text } = await import(storePath);
	const { HtmlAdapter } = await import(adaptersPath);

	return {
		getInternalStoreExtensions,
		getInternalViewExtensions,
		StoreExtensionManager,
		ViewExtensionManager,
		TestWorkspace,
		BlockStdScope,
		Text,
		HtmlAdapter,
	};
}

function initEmptyDoc(store: StoreLike, Text: new () => unknown) {
	const pageId = store.addBlock("affine:page", { title: new Text() });
	store.addBlock("affine:surface", {}, pageId);
	const noteId = store.addBlock("affine:note", {}, pageId);
	store.addBlock("affine:paragraph", {}, noteId);
}

async function snapshotToHtml(
	store: StoreLike,
	HtmlAdapter: new (job: unknown, provider: unknown) => {
		fromDocSnapshot: (payload: { snapshot: unknown }) => Promise<{ file?: string }>;
	},
	host?: HTMLElement | null,
) {
	try {
		const transformer = store.getTransformer();
		const snapshot = transformer.docToSnapshot(store);
		if (!snapshot) throw new Error("empty snapshot");
		const adapter = new HtmlAdapter(transformer, store.provider);
		const result = await adapter.fromDocSnapshot({ snapshot });
		if (result.file) return result.file;
	} catch {
		// fall through
	}

	if (host?.innerHTML) return host.innerHTML;

	const texts: string[] = [];
	for (const block of store.getAllModels()) {
		const text = block.text?.toString?.();
		if (text) texts.push(`<p>${text}</p>`);
	}
	return texts.join("\n") || "<p></p>";
}

export function BlockSuiteEditor({ versionId }: { versionId: string }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const storeRef = useRef<StoreLike | null>(null);
	const editorHostRef = useRef<HTMLElement | null>(null);
	const fallbackRef = useRef<HTMLDivElement>(null);
	const htmlAdapterRef = useRef<
		| (new (job: unknown, provider: unknown) => {
				fromDocSnapshot: (payload: { snapshot: unknown }) => Promise<{ file?: string }>;
		  })
		| null
	>(null);
	const unmountRef = useRef<(() => void) | null>(null);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "public">("draft");
	const [htmlFallback, setHtmlFallback] = useState("");
	const [mode, setMode] = useState<"loading" | "blocksuite" | "fallback">("loading");
	const [message, setMessage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [uploadUrl, setUploadUrl] = useState<string | null>(null);

	useEffect(() => {
		let disposed = false;

		async function boot() {
			const res = await fetch(`/api/admin/versions/${versionId}`);
			if (!res.ok) throw new Error("Failed to load version");
			const version = (await res.json()) as VersionPayload;
			if (disposed) return;

			setTitle(version.title);
			setDescription(version.description);
			setStatus(version.status);
			setHtmlFallback(version.contentHtml || "");

			try {
				const bs = await loadBlocksuite();
				htmlAdapterRef.current = bs.HtmlAdapter;

				const storeManager = new bs.StoreExtensionManager(
					bs.getInternalStoreExtensions(),
				);
				const viewManager = new bs.ViewExtensionManager(
					bs.getInternalViewExtensions(),
				);
				const collection = new bs.TestWorkspace({ id: "blogs-cms" });
				collection.storeExtensions = storeManager.get("store");
				collection.meta.initialize();

				const doc = collection.createDoc(versionId);
				const store = doc.getStore({
					extensions: storeManager.get("store"),
				}) as StoreLike;
				storeRef.current = store;

				doc.load();

				const raw = version.docSnapshot?.trim();
				if (raw && raw !== "{}" && raw !== "") {
					const snapshot = JSON.parse(raw) as unknown;
					await store.getTransformer().snapshotToDoc(snapshot);
				}

				if (!store.root) {
					initEmptyDoc(store, bs.Text);
				}

				const std = new bs.BlockStdScope({
					store,
					extensions: viewManager.get("page"),
				});
				const host = std.render() as HTMLElement;
				editorHostRef.current = host;
				unmountRef.current = () => std.unmount();

				if (hostRef.current) {
					hostRef.current.replaceChildren(host);
				}
				if (!disposed) setMode("blocksuite");
			} catch (err) {
				console.warn("BlockSuite host unavailable, using fallback editor", err);
				if (!disposed) setMode("fallback");
			}
		}

		boot().catch((err: unknown) => {
			console.error(err);
			if (!disposed) {
				setMode("fallback");
				setMessage(err instanceof Error ? err.message : "Editor failed to load");
			}
		});

		return () => {
			disposed = true;
			unmountRef.current?.();
			unmountRef.current = null;
			editorHostRef.current = null;
			storeRef.current = null;
		};
	}, [versionId]);

	useEffect(() => {
		if (mode !== "fallback" || !fallbackRef.current) return;
		if (!fallbackRef.current.innerHTML.trim()) {
			fallbackRef.current.innerHTML = htmlFallback || "<p></p>";
		}
	}, [mode, htmlFallback]);

	async function save() {
		setSaving(true);
		setMessage(null);
		try {
			let docSnapshot = "{}";
			let contentHtml = htmlFallback;

			const store = storeRef.current;
			if (store && mode === "blocksuite" && htmlAdapterRef.current) {
				const snapshot = store.getTransformer().docToSnapshot(store);
				docSnapshot = JSON.stringify(snapshot ?? {});
				contentHtml = await snapshotToHtml(
					store,
					htmlAdapterRef.current,
					editorHostRef.current ?? hostRef.current,
				);
			} else if (fallbackRef.current) {
				contentHtml = fallbackRef.current.innerHTML;
				docSnapshot = JSON.stringify({ contentHtml });
			}

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
			setMessage("Uploaded — URL copied to clipboard");

			if (mode === "fallback" && fallbackRef.current) {
				const img = document.createElement("img");
				img.src = data.url;
				img.alt = file.name;
				fallbackRef.current.appendChild(img);
			}
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
				<Button disabled={saving} onClick={() => void save()} type="button">
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
					<code className="break-all text-xs text-muted-foreground">{uploadUrl}</code>
				) : null}
			</div>

			{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

			{mode === "loading" ? (
				<p className="text-muted-foreground text-sm">Loading editor…</p>
			) : null}

			<div
				className="min-h-[420px] rounded-lg border border-border bg-background p-3"
				ref={hostRef}
				style={{ display: mode === "blocksuite" ? "block" : "none" }}
			/>

			{mode === "fallback" ? (
				<div
					className="prose min-h-[420px] max-w-none rounded-lg border border-border p-4 outline-none dark:prose-invert"
					contentEditable
					ref={fallbackRef}
					suppressContentEditableWarning
				/>
			) : null}
		</div>
	);
}
