"use client";

import type {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	EditorConfig,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";

export type SerializedImageNode = Spread<
	{
		altText: string;
		src: string;
		type: "image";
		version: 1;
	},
	SerializedLexicalNode
>;

function $convertImageElement(domNode: Node): DOMConversionOutput | null {
	const img = domNode as HTMLImageElement;
	if (!img.src) return null;
	return { node: $createImageNode({ altText: img.alt || "", src: img.src }) };
}

export class ImageNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__altText: string;

	static getType(): string {
		return "image";
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(node.__src, node.__altText, node.__key);
	}

	constructor(src: string, altText: string, key?: NodeKey) {
		super(key);
		this.__src = src;
		this.__altText = altText;
	}

	createDOM(_config: EditorConfig): HTMLElement {
		const span = document.createElement("span");
		span.className = "editor-image";
		return span;
	}

	updateDOM(): false {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const img = document.createElement("img");
		img.setAttribute("src", this.__src);
		img.setAttribute("alt", this.__altText);
		img.setAttribute("style", "max-width:100%;height:auto;");
		return { element: img };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: () => ({
				conversion: $convertImageElement,
				priority: 0,
			}),
		};
	}

	static importJSON(serializedNode: SerializedImageNode): ImageNode {
		return $createImageNode({
			altText: serializedNode.altText,
			src: serializedNode.src,
		});
	}

	exportJSON(): SerializedImageNode {
		return {
			altText: this.__altText,
			src: this.__src,
			type: "image",
			version: 1,
		};
	}

	getSrc(): string {
		return this.__src;
	}

	getAltText(): string {
		return this.__altText;
	}

	decorate(): JSX.Element {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				alt={this.__altText}
				className="my-2 max-h-[480px] max-w-full rounded-md"
				draggable="false"
				src={this.__src}
			/>
		);
	}

	isInline(): false {
		return false;
	}
}

export function $createImageNode({
	altText,
	src,
}: {
	altText: string;
	src: string;
}): ImageNode {
	return $applyNodeReplacement(new ImageNode(src, altText));
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}
