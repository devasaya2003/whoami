"use client";

import { CodeExtension } from "@lexical/code";
import {
	ClickAfterLastBlockExtension,
	SelectBlockExtension,
	TabIndentationExtension,
} from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextExtension } from "@lexical/rich-text";
import {
	defineExtension,
	type EditorState,
	type LexicalEditor,
	type SerializedEditorState,
} from "lexical";
import { useEffect, useRef, useState } from "react";
import { ImageNode } from "./nodes/ImageNode";
import { DragPlugin } from "./plugins/DragPlugin";
import { ImagesPlugin } from "./plugins/ImagesPlugin";
import { SlashMenuPlugin } from "./plugins/SlashMenuPlugin";

const theme = {
	code: "my-2 overflow-x-auto rounded-md bg-zinc-100 p-3 font-mono text-[0.875rem] dark:bg-zinc-900",
	codeHighlight: {
		atrule: "text-purple-600 dark:text-purple-300",
		attr: "text-sky-700 dark:text-sky-300",
		boolean: "text-orange-600 dark:text-orange-300",
		builtin: "text-emerald-700 dark:text-emerald-300",
		cdata: "text-zinc-500",
		char: "text-emerald-700 dark:text-emerald-300",
		class: "text-amber-700 dark:text-amber-300",
		"class-name": "text-amber-700 dark:text-amber-300",
		comment: "text-zinc-500 italic",
		constant: "text-orange-600 dark:text-orange-300",
		deleted: "text-red-600",
		doctype: "text-zinc-500",
		entity: "text-orange-600",
		function: "text-blue-700 dark:text-blue-300",
		important: "font-bold text-red-600",
		inserted: "text-emerald-700",
		keyword: "text-purple-700 dark:text-purple-300",
		namespace: "text-sky-700",
		number: "text-orange-600 dark:text-orange-300",
		operator: "text-zinc-700 dark:text-zinc-300",
		prolog: "text-zinc-500",
		property: "text-sky-700 dark:text-sky-300",
		punctuation: "text-zinc-500",
		regex: "text-red-600",
		selector: "text-emerald-700",
		string: "text-emerald-700 dark:text-emerald-300",
		symbol: "text-orange-600",
		tag: "text-red-600 dark:text-red-300",
		url: "text-sky-700 underline",
		variable: "text-orange-600",
	},
	heading: {
		h1: "mt-2 mb-1 text-[1.75rem] font-bold leading-[1.25]",
		h2: "mt-2 mb-[0.15rem] text-[1.3rem] font-semibold leading-[1.3]",
		h3: "mt-[0.4rem] mb-[0.1rem] text-[1.1rem] font-semibold leading-[1.35]",
	},
	list: {
		listitem: "my-[0.1rem] leading-[1.6]",
		ol: "my-[0.2rem] list-decimal pl-5",
		ul: "my-[0.2rem] list-disc pl-5",
	},
	paragraph: "my-0 py-0.5 leading-[1.6]",
	quote:
		"my-[0.4rem] border-l-[3px] [border-left-style:solid] border-zinc-300 pl-3.5 italic text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
	text: {
		bold: "font-bold",
		code: "rounded-[3px] bg-[rgba(135,131,120,0.15)] px-[0.3em] py-[0.1em] font-mono text-[0.875em] dark:bg-white/10",
		italic: "italic",
	},
};

const ImageExtension = defineExtension({
	name: "cms-image",
	nodes: [ImageNode],
});

const editorExtension = defineExtension({
	dependencies: [
		RichTextExtension,
		HistoryExtension,
		ListExtension,
		CodeExtension,
		ImageExtension,
		TabIndentationExtension,
		ClickAfterLastBlockExtension,
		SelectBlockExtension,
	],
	name: "@lexical/website/notion-like-editor",
	namespace: "@lexical/website/notion-like-editor",
	theme,
});

function InitialStatePlugin({
	initialState,
}: {
	initialState?: SerializedEditorState | null;
}) {
	const [editor] = useLexicalComposerContext();
	const applied = useRef(false);

	useEffect(() => {
		if (applied.current || !initialState) return;
		applied.current = true;
		const parsed = editor.parseEditorState(initialState);
		editor.setEditorState(parsed);
	}, [editor, initialState]);

	return null;
}

function ReadyPlugin({ onReady }: { onReady?: (editor: LexicalEditor) => void }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		onReady?.(editor);
	}, [editor, onReady]);

	return null;
}

export type NotionEditorProps = {
	initialState?: SerializedEditorState | null;
	onReady?: (editor: LexicalEditor) => void;
	onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
	className?: string;
};

export function NotionEditor({
	initialState,
	onReady,
	onChange,
	className,
}: NotionEditorProps) {
	const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);

	return (
		<LexicalExtensionComposer
			contentEditable={null}
			extension={editorExtension}
		>
			<div className={className ?? "relative w-full"}>
				<div className="relative" ref={setAnchorElem}>
					<ContentEditable
						aria-label="Rich text editor"
						aria-placeholder="Type '/' for commands..."
						className="min-h-[50vh] overflow-y-auto px-14 py-2 outline-none dark:text-zinc-200 max-[996px]:px-8"
						placeholder={
							<div className="pointer-events-none absolute top-2.5 left-14 select-none text-[0.95rem] text-zinc-400 max-[996px]:left-8">
								Type &apos;/&apos; for commands...
							</div>
						}
					/>
					<SlashMenuPlugin />
					<ImagesPlugin />
					<InitialStatePlugin initialState={initialState} />
					<ReadyPlugin onReady={onReady} />
					{onChange ? (
						<OnChangePlugin
							ignoreSelectionChange
							onChange={(editorState, editor) => {
								onChange(editorState, editor);
							}}
						/>
					) : null}
					{anchorElem ? <DragPlugin anchorElem={anchorElem} /> : null}
				</div>
			</div>
		</LexicalExtensionComposer>
	);
}

export default NotionEditor;
