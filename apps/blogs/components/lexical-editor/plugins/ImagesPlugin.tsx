"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$insertNodes,
	$isRootOrShadowRoot,
	COMMAND_PRIORITY_EDITOR,
	createCommand,
	type LexicalCommand,
} from "lexical";
import { useEffect, useRef } from "react";
import { $createImageNode, ImageNode } from "../nodes/ImageNode";

export type InsertImagePayload = {
	altText: string;
	src: string;
};

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
	createCommand("INSERT_IMAGE_COMMAND");

export const OPEN_IMAGE_UPLOAD_COMMAND: LexicalCommand<void> = createCommand(
	"OPEN_IMAGE_UPLOAD_COMMAND",
);

async function uploadImage(file: File): Promise<string> {
	const form = new FormData();
	form.set("file", file);
	const res = await fetch("/api/admin/uploads", {
		method: "POST",
		body: form,
	});
	if (!res.ok) throw new Error((await res.text()) || "Upload failed");
	const data = (await res.json()) as { url: string };
	if (!data.url) throw new Error("Upload response missing url");
	return data.url;
}

export function ImagesPlugin() {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!editor.hasNodes([ImageNode])) {
			throw new Error("ImagesPlugin: ImageNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand(
				INSERT_IMAGE_COMMAND,
				(payload) => {
					const imageNode = $createImageNode(payload);
					$insertNodes([imageNode]);
					if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
						$wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
					}
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
		);
	}, [editor]);

	return (
		<input
			accept="image/*"
			className="hidden"
			onChange={(event) => {
				const file = event.target.files?.[0];
				event.target.value = "";
				if (!file) return;
				void uploadImage(file)
					.then((src) => {
						editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
							altText: file.name,
							src,
						});
					})
					.catch((err) => {
						console.error(err);
					});
			}}
			ref={inputRef}
			type="file"
		/>
	);
}
