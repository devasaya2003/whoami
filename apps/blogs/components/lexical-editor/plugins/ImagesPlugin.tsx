"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$insertNodes,
	$isNodeSelection,
	$isParagraphNode,
	$isRangeSelection,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	DRAGOVER_COMMAND,
	DROP_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_LEFT_COMMAND,
	KEY_ARROW_RIGHT_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_ENTER_COMMAND,
	PASTE_COMMAND,
	createCommand,
	type LexicalCommand,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { blogsApi, readApiError } from "@/lib/api";
import { $createImageNode, $isImageNode, ImageNode } from "../nodes/ImageNode";

export type InsertImagePayload = {
	altText: string;
	src: string;
};

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
	createCommand("INSERT_IMAGE_COMMAND");

export const OPEN_IMAGE_UPLOAD_COMMAND: LexicalCommand<void> = createCommand(
	"OPEN_IMAGE_UPLOAD_COMMAND",
);

async function uploadImage(file: File): Promise<{ key?: string; url: string }> {
	let res: Awaited<ReturnType<typeof blogsApi.api.admin.uploads.$post>>;
	try {
		res = await blogsApi.api.admin.uploads.$post({
			form: { file },
		});
	} catch (error) {
		throw new Error(
			error instanceof Error
				? `Network error: ${error.message}`
				: "Network error while uploading",
		);
	}

	if (!res.ok) {
		throw new Error(await readApiError(res));
	}

	let data: { key?: string; url?: string };
	try {
		data = (await res.json()) as { key?: string; url?: string };
	} catch {
		throw new Error("Upload succeeded but returned invalid JSON");
	}

	if (!data.url) throw new Error("Upload response missing url");
	return { key: data.key, url: data.url };
}

function $getSelectedImageNode(): ImageNode | null {
	const selection = $getSelection();
	if (!$isNodeSelection(selection)) return null;
	const nodes = selection.getNodes();
	if (nodes.length !== 1) return null;
	const node = nodes[0];
	return $isImageNode(node) ? node : null;
}

function $selectOrCreateParagraphAfter(imageNode: ImageNode) {
	const next = imageNode.getNextSibling();
	if ($isParagraphNode(next)) {
		next.selectEnd();
		return;
	}
	const paragraph = $createParagraphNode();
	imageNode.insertAfter(paragraph);
	paragraph.selectEnd();
}

function $selectOrCreateParagraphBefore(imageNode: ImageNode) {
	const prev = imageNode.getPreviousSibling();
	if ($isParagraphNode(prev)) {
		prev.selectEnd();
		return;
	}
	const paragraph = $createParagraphNode();
	imageNode.insertBefore(paragraph);
	paragraph.selectEnd();
}

function $insertBlockImage(payload: InsertImagePayload) {
	const imageNode = $createImageNode(payload);
	const selection = $getSelection();

	if ($isRangeSelection(selection)) {
		const anchorNode = selection.anchor.getNode();
		const topLevel =
			anchorNode.getKey() === "root"
				? anchorNode
				: anchorNode.getTopLevelElementOrThrow();

		if ($isParagraphNode(topLevel) && topLevel.getTextContentSize() === 0) {
			topLevel.replace(imageNode);
		} else {
			topLevel.insertAfter(imageNode);
		}
	} else if ($isNodeSelection(selection)) {
		const nodes = selection.getNodes();
		const last = nodes[nodes.length - 1];
		if (last) {
			last.insertAfter(imageNode);
		} else {
			$insertNodes([imageNode]);
		}
	} else {
		$insertNodes([imageNode]);
	}

	$selectOrCreateParagraphAfter(imageNode);
}

function getImageFilesFromDataTransfer(
	dataTransfer: DataTransfer | null | undefined,
): File[] {
	if (!dataTransfer) return [];
	const files: File[] = [];
	for (const item of Array.from(dataTransfer.items ?? [])) {
		if (item.kind === "file" && item.type.startsWith("image/")) {
			const file = item.getAsFile();
			if (file) files.push(file);
		}
	}
	if (files.length === 0) {
		for (const file of Array.from(dataTransfer.files ?? [])) {
			if (file.type.startsWith("image/")) files.push(file);
		}
	}
	return files;
}

export function ImagesPlugin() {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const dragDepthRef = useRef(0);

	useEffect(() => {
		const root = editor.getRootElement();
		if (!root) return;

		const hasImageFiles = (dt: DataTransfer | null) =>
			getImageFilesFromDataTransfer(dt).length > 0;

		const onDragEnter = (event: DragEvent) => {
			if (!hasImageFiles(event.dataTransfer)) return;
			event.preventDefault();
			dragDepthRef.current += 1;
			setIsDragging(true);
		};

		const onDragLeave = (event: DragEvent) => {
			if (!hasImageFiles(event.dataTransfer)) return;
			dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
			if (dragDepthRef.current === 0) setIsDragging(false);
		};

		const onDragOver = (event: DragEvent) => {
			if (!hasImageFiles(event.dataTransfer)) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
			setIsDragging(true);
		};

		const clearDrag = () => {
			dragDepthRef.current = 0;
			setIsDragging(false);
		};

		root.addEventListener("dragenter", onDragEnter);
		root.addEventListener("dragleave", onDragLeave);
		root.addEventListener("dragover", onDragOver);
		root.addEventListener("drop", clearDrag);
		root.addEventListener("dragend", clearDrag);

		return () => {
			root.removeEventListener("dragenter", onDragEnter);
			root.removeEventListener("dragleave", onDragLeave);
			root.removeEventListener("dragover", onDragOver);
			root.removeEventListener("drop", clearDrag);
			root.removeEventListener("dragend", clearDrag);
		};
	}, [editor]);

	const insertUploadedFile = useCallback(
		(file: File) => {
			const toastId = toast.loading(`Uploading ${file.name}…`);
			void uploadImage(file)
				.then(({ url }) => {
					editor.focus();
					editor.update(() => {
						$insertBlockImage({
							altText: file.name.replace(/\.[^.]+$/, "") || "Image",
							src: url,
						});
					});
					toast.success("Image uploaded", { id: toastId });
				})
				.catch((err: unknown) => {
					console.error("[ImagesPlugin] upload failed", err);
					toast.error(
						err instanceof Error ? err.message : "Image upload failed",
						{ id: toastId },
					);
				});
		},
		[editor],
	);

	useEffect(() => {
		if (!editor.hasNodes([ImageNode])) {
			throw new Error("ImagesPlugin: ImageNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand(
				INSERT_IMAGE_COMMAND,
				(payload) => {
					$insertBlockImage(payload);
					queueMicrotask(() => editor.focus());
					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
			editor.registerCommand(
				OPEN_IMAGE_UPLOAD_COMMAND,
				() => {
					inputRef.current?.click();
					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
			editor.registerCommand(
				KEY_ENTER_COMMAND,
				(event) => {
					const imageNode = $getSelectedImageNode();
					if (!imageNode) return false;
					event?.preventDefault();
					if (event?.shiftKey) {
						$selectOrCreateParagraphBefore(imageNode);
					} else {
						$selectOrCreateParagraphAfter(imageNode);
					}
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_DOWN_COMMAND,
				(event) => {
					const imageNode = $getSelectedImageNode();
					if (!imageNode) return false;
					event?.preventDefault();
					$selectOrCreateParagraphAfter(imageNode);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_RIGHT_COMMAND,
				(event) => {
					const imageNode = $getSelectedImageNode();
					if (!imageNode) return false;
					event?.preventDefault();
					$selectOrCreateParagraphAfter(imageNode);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_UP_COMMAND,
				(event) => {
					const imageNode = $getSelectedImageNode();
					if (!imageNode) return false;
					event?.preventDefault();
					$selectOrCreateParagraphBefore(imageNode);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_LEFT_COMMAND,
				(event) => {
					const imageNode = $getSelectedImageNode();
					if (!imageNode) return false;
					event?.preventDefault();
					$selectOrCreateParagraphBefore(imageNode);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					const clipboard =
						event instanceof ClipboardEvent ? event.clipboardData : null;
					const files = getImageFilesFromDataTransfer(clipboard);
					if (files.length === 0) return false;
					event.preventDefault();
					for (const file of files) insertUploadedFile(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				DRAGOVER_COMMAND,
				(event) => {
					const dragEvent = event as DragEvent;
					const files = getImageFilesFromDataTransfer(dragEvent.dataTransfer);
					if (files.length === 0) return false;
					dragEvent.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				DROP_COMMAND,
				(event) => {
					const dragEvent = event as DragEvent;
					const files = getImageFilesFromDataTransfer(dragEvent.dataTransfer);
					dragDepthRef.current = 0;
					setIsDragging(false);
					if (files.length === 0) return false;
					dragEvent.preventDefault();
					for (const file of files) insertUploadedFile(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, [editor, insertUploadedFile]);

	return (
		<>
			{isDragging ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-blue-500 border-dashed bg-blue-500/10"
				>
					<p className="rounded-full bg-blue-500 px-3 py-1.5 font-medium text-sm text-white shadow-sm">
						Drop image to upload
					</p>
				</div>
			) : null}
			<input
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (!file) return;
					insertUploadedFile(file);
				}}
				ref={inputRef}
				type="file"
			/>
		</>
	);
}
