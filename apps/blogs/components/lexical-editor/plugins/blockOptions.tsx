"use client";

import { $createCodeNode } from "@lexical/code";
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import type { LucideIcon } from "lucide-react";
import {
	Code2Icon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	ImageIcon,
	ListIcon,
	ListOrderedIcon,
	PilcrowIcon,
	QuoteIcon,
} from "lucide-react";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	type LexicalEditor,
} from "lexical";
import { OPEN_IMAGE_UPLOAD_COMMAND } from "./ImagesPlugin";

export type IconKey =
	| "paragraph"
	| "h1"
	| "h2"
	| "h3"
	| "bullet"
	| "number"
	| "quote"
	| "code"
	| "image";

export const BLOCK_ICONS: Record<IconKey, LucideIcon> = {
	paragraph: PilcrowIcon,
	h1: Heading1Icon,
	h2: Heading2Icon,
	h3: Heading3Icon,
	bullet: ListIcon,
	number: ListOrderedIcon,
	quote: QuoteIcon,
	code: Code2Icon,
	image: ImageIcon,
};

interface BlockOptionConfig {
	iconKey: IconKey;
	keywords?: string[];
	onSelect: () => void;
}

export class BlockOption extends MenuOption {
	title: string;
	iconKey: IconKey;
	keywords: string[];
	onSelect: () => void;

	constructor(
		title: string,
		{ iconKey, keywords = [], onSelect }: BlockOptionConfig,
	) {
		super(title);
		this.title = title;
		this.iconKey = iconKey;
		this.keywords = keywords;
		this.onSelect = onSelect;
	}
}

export function getBlockOptions(editor: LexicalEditor): BlockOption[] {
	return [
		new BlockOption("Text", {
			iconKey: "paragraph",
			keywords: ["paragraph", "text", "p", "normal"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createParagraphNode());
					}
				}),
		}),
		new BlockOption("Heading 1", {
			iconKey: "h1",
			keywords: ["heading", "title", "h1"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h1"));
					}
				}),
		}),
		new BlockOption("Heading 2", {
			iconKey: "h2",
			keywords: ["heading", "subtitle", "h2"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h2"));
					}
				}),
		}),
		new BlockOption("Heading 3", {
			iconKey: "h3",
			keywords: ["heading", "h3"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h3"));
					}
				}),
		}),
		new BlockOption("Bulleted List", {
			iconKey: "bullet",
			keywords: ["bulleted list", "unordered list", "ul"],
			onSelect: () =>
				editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
		}),
		new BlockOption("Numbered List", {
			iconKey: "number",
			keywords: ["numbered list", "ordered list", "ol"],
			onSelect: () =>
				editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
		}),
		new BlockOption("Quote", {
			iconKey: "quote",
			keywords: ["quote", "blockquote"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createQuoteNode());
					}
				}),
		}),
		new BlockOption("Code", {
			iconKey: "code",
			keywords: ["code", "codeblock", "pre", "snippet"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createCodeNode());
					}
				}),
		}),
		new BlockOption("Image", {
			iconKey: "image",
			keywords: ["image", "photo", "picture", "upload"],
			onSelect: () => {
				editor.dispatchCommand(OPEN_IMAGE_UPLOAD_COMMAND, undefined);
			},
		}),
	];
}
