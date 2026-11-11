"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	type NodeKey,
} from "lexical";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { $isImageNode } from "./ImageNode";

async function readApiError(res: Response): Promise<string> {
	const text = await res.text();
	if (!text) return `Delete failed (${res.status})`;
	try {
		const json = JSON.parse(text) as { error?: string };
		if (json.error) return json.error;
	} catch {
		// plain text
	}
	return text;
}

async function deleteUpload(src: string) {
	let res: Response;
	try {
		res = await fetch("/api/admin/uploads", {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url: src }),
		});
	} catch (error) {
		throw new Error(
			error instanceof Error
				? `Network error: ${error.message}`
				: "Network error while deleting",
		);
	}
	if (!res.ok) {
		throw new Error(await readApiError(res));
	}
}

export function ImageComponent({
	altText,
	nodeKey,
	src,
}: {
	altText: string;
	nodeKey: NodeKey;
	src: string;
}) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [failed, setFailed] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const removeNode = useCallback(() => {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if (!$isImageNode(node)) return;
			const parent = node.getParent();
			const next = node.getNextSibling();
			node.remove();
			if (next) {
				next.selectStart();
			} else if (parent) {
				const paragraph = $createParagraphNode();
				parent.append(paragraph);
				paragraph.selectEnd();
			}
		});
	}, [editor, nodeKey]);

	const deleteImage = useCallback(async () => {
		if (deleting) return;
		setDeleting(true);
		setError(null);
		const toastId = toast.loading("Deleting image…");
		try {
			if (src) {
				await deleteUpload(src);
			}
			removeNode();
			toast.success("Image deleted", { id: toastId });
		} catch (err) {
			console.error("[ImageComponent] delete failed", err);
			const message = err instanceof Error ? err.message : "Delete failed";
			setError(message);
			toast.error(message, { id: toastId });
			setDeleting(false);
		}
	}, [deleting, removeNode, src]);

	const onDeleteKey = useCallback(
		(event: KeyboardEvent) => {
			if (!isSelected || deleting) return false;
			const selection = $getSelection();
			if (!$isNodeSelection(selection)) return false;
			const nodes = selection.getNodes();
			if (!nodes.some((node) => node.getKey() === nodeKey)) return false;
			event.preventDefault();
			void deleteImage();
			return true;
		},
		[deleteImage, deleting, isSelected, nodeKey],
	);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				CLICK_COMMAND,
				(event: MouseEvent) => {
					const host = editor.getElementByKey(nodeKey);
					if (!host?.contains(event.target as Node)) return false;
					if ((event.target as HTMLElement | null)?.closest?.(
						"[data-image-delete]",
					)) {
						return true;
					}
					if (!event.shiftKey) clearSelection();
					setSelected(true);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_DELETE_COMMAND,
				onDeleteKey,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				onDeleteKey,
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [clearSelection, editor, nodeKey, onDeleteKey, setSelected]);

	useEffect(() => {
		return editor.registerUpdateListener(() => {
			editor.read(() => {
				if (!$getNodeByKey(nodeKey)) setSelected(false);
			});
		});
	}, [editor, nodeKey, setSelected]);

	const showControls = isSelected || deleting || Boolean(error);

	return (
		<span className="relative my-3 block max-w-full">
			{showControls ? (
				<span className="absolute top-2 right-2 z-10 flex items-center gap-1">
					{error ? (
						<span className="max-w-48 truncate rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow-sm dark:bg-red-950 dark:text-red-200">
							{error}
						</span>
					) : null}
					<button
						aria-label="Delete image"
						className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted disabled:opacity-60"
						data-image-delete
						disabled={deleting}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void deleteImage();
						}}
						onMouseDown={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
						title="Delete image"
						type="button"
					>
						{deleting ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : (
							<Trash2Icon className="size-3.5" />
						)}
					</button>
				</span>
			) : null}

			{!src || failed ? (
				<span
					className={`flex min-h-24 w-full max-w-full flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-muted-foreground text-sm ${
						isSelected
							? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
							: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50"
					}`}
				>
					{failed ? "Failed to load image" : "Missing image"}
					{altText ? (
						<span className="mt-1 max-w-full truncate text-xs opacity-70">
							{altText}
						</span>
					) : null}
				</span>
			) : (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					alt={altText}
					className={`block max-h-[480px] max-w-full rounded-md ${
						isSelected
							? "outline outline-2 outline-blue-500 outline-offset-2"
							: ""
					} ${deleting ? "opacity-50" : ""}`}
					draggable={false}
					onError={() => {
						setFailed((wasFailed) => {
							if (!wasFailed) {
								toast.error("Failed to load image from storage");
							}
							return true;
						});
					}}
					src={src}
				/>
			)}
		</span>
	);
}
