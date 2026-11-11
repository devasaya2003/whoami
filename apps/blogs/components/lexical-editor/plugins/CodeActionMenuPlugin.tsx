"use client";

import { $isCodeNode, CodeNode, DEFAULT_CODE_LANGUAGE } from "@lexical/code";
import {
	getCodeLanguageOptions,
	getLanguageFriendlyName,
	loadCodeLanguage,
	normalizeCodeLanguage,
} from "@lexical/code-prism";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getNearestNodeFromDOMNode,
	$getSelection,
	$setSelection,
} from "lexical";
import {
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	WrapTextIcon,
} from "lucide-react";
import {
	type JSX,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

const CODE_PADDING = 8;
const CODE_BLOCK_SELECTOR = "code.editor-code-block";

type Position = {
	top: string;
	right: string;
};

function useDebouncedCallback<T extends (...args: never[]) => void>(
	callback: T,
	delay: number,
) {
	const callbackRef = useRef(callback);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return useMemo(() => {
		const fn = ((...args: Parameters<T>) => {
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				callbackRef.current(...args);
			}, delay);
		}) as T & { cancel: () => void };

		fn.cancel = () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};

		return fn;
	}, [delay]);
}

function CopyButton({
	getCodeDOMNode,
}: {
	getCodeDOMNode: () => HTMLElement | null;
}) {
	const [editor] = useLexicalComposerContext();
	const [copied, setCopied] = useState(false);
	const reset = useDebouncedCallback(() => setCopied(false), 1200);

	async function handleClick() {
		const codeDOMNode = getCodeDOMNode();
		if (!codeDOMNode) return;

		let content = "";
		editor.update(() => {
			const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
			if ($isCodeNode(codeNode)) {
				content = codeNode.getTextContent();
			}
			const selection = $getSelection();
			$setSelection(selection);
		});

		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			reset();
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	}

	return (
		<button
			aria-label="Copy code"
			className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
			onClick={() => void handleClick()}
			title="Copy"
			type="button"
		>
			{copied ? (
				<CheckIcon className="size-3.5" />
			) : (
				<CopyIcon className="size-3.5" />
			)}
		</button>
	);
}

/** Always-visible copy control anchored to a single code block. */
function PersistentCopyButton({
	codeDOMNode,
	anchorElem,
}: {
	codeDOMNode: HTMLElement;
	anchorElem: HTMLElement;
}) {
	const [editor] = useLexicalComposerContext();
	const [copied, setCopied] = useState(false);
	const [pos, setPos] = useState<Position | null>(null);
	const reset = useDebouncedCallback(() => setCopied(false), 1200);

	const updatePos = useCallback(() => {
		const { y: editorElemY, right: editorElemRight } =
			anchorElem.getBoundingClientRect();
		const { y, right } = codeDOMNode.getBoundingClientRect();
		if (y === 0 && right === 0) {
			setPos(null);
			return;
		}
		setPos({
			right: `${editorElemRight - right + CODE_PADDING}px`,
			top: `${y - editorElemY + CODE_PADDING}px`,
		});
	}, [anchorElem, codeDOMNode]);

	useEffect(() => {
		updatePos();
		const ro = new ResizeObserver(() => updatePos());
		ro.observe(codeDOMNode);
		ro.observe(anchorElem);
		window.addEventListener("scroll", updatePos, true);
		return () => {
			ro.disconnect();
			window.removeEventListener("scroll", updatePos, true);
		};
	}, [anchorElem, codeDOMNode, updatePos]);

	async function handleClick() {
		let content = "";
		editor.update(() => {
			const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
			if ($isCodeNode(codeNode)) {
				content = codeNode.getTextContent();
			}
			const selection = $getSelection();
			$setSelection(selection);
		});
		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			reset();
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	}

	if (!pos) return null;

	return (
		<button
			aria-label="Copy code"
			className="absolute z-[9] inline-flex size-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
			onClick={() => void handleClick()}
			style={{ right: pos.right, top: pos.top }}
			title="Copy"
			type="button"
		>
			{copied ? (
				<CheckIcon className="size-3.5" />
			) : (
				<CopyIcon className="size-3.5" />
			)}
		</button>
	);
}

function CodeActionMenuContainer({
	anchorElem,
}: {
	anchorElem: HTMLElement;
}): JSX.Element {
	const [editor] = useLexicalComposerContext();
	const [lang, setLang] = useState("");
	const [isShown, setShown] = useState(false);
	const [shouldListenMouseMove, setShouldListenMouseMove] = useState(false);
	const [position, setPosition] = useState<Position>({
		right: "0",
		top: "0",
	});
	const [wrap, setWrap] = useState(false);
	const [langOpen, setLangOpen] = useState(false);
	const [codeElements, setCodeElements] = useState<HTMLElement[]>([]);
	const codeSetRef = useRef(new Set<string>());
	const codeDOMNodeRef = useRef<HTMLElement | null>(null);
	const languageOptions = useMemo(() => getCodeLanguageOptions(), []);

	const getCodeDOMNode = useCallback(() => codeDOMNodeRef.current, []);

	const refreshCodeElements = useCallback(() => {
		const nodes = Array.from(
			anchorElem.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR),
		);
		setCodeElements(nodes);
	}, [anchorElem]);

	const debouncedOnMouseMove = useDebouncedCallback((event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			setShown(false);
			setLangOpen(false);
			return;
		}

		const codeDOMNode = target.closest(
			CODE_BLOCK_SELECTOR,
		) as HTMLElement | null;
		const inMenu = Boolean(target.closest("[data-code-action-menu]"));

		if (!codeDOMNode && !inMenu) {
			setShown(false);
			setLangOpen(false);
			return;
		}

		if (!codeDOMNode) return;

		codeDOMNodeRef.current = codeDOMNode;

		let codeNode: CodeNode | null = null;
		let nextLang = "";

		editor.read(() => {
			const maybeCodeNode = $getNearestNodeFromDOMNode(codeDOMNode);
			if ($isCodeNode(maybeCodeNode)) {
				codeNode = maybeCodeNode;
				nextLang = maybeCodeNode.getLanguage() || "";
			}
		});

		if (!codeNode) return;

		const { y: editorElemY, right: editorElemRight } =
			anchorElem.getBoundingClientRect();
		const { y, right } = codeDOMNode.getBoundingClientRect();
		setLang(nextLang);
		setWrap(codeDOMNode.classList.contains("editor-code-wrap"));
		setShown(true);
		setPosition({
			right: `${editorElemRight - right + CODE_PADDING}px`,
			top: `${y - editorElemY}px`,
		});
	}, 40);

	useEffect(() => {
		if (!shouldListenMouseMove) return;

		document.addEventListener("mousemove", debouncedOnMouseMove);
		return () => {
			document.removeEventListener("mousemove", debouncedOnMouseMove);
			setShown(false);
			debouncedOnMouseMove.cancel();
		};
	}, [debouncedOnMouseMove, shouldListenMouseMove]);

	useEffect(() => {
		return editor.registerMutationListener(
			CodeNode,
			(mutations) => {
				for (const [key, type] of mutations) {
					if (type === "created") codeSetRef.current.add(key);
					else if (type === "destroyed") codeSetRef.current.delete(key);
				}
				setShouldListenMouseMove(codeSetRef.current.size > 0);
				requestAnimationFrame(refreshCodeElements);
			},
			{ skipInitialization: false },
		);
	}, [editor, refreshCodeElements]);

	useEffect(() => {
		refreshCodeElements();
	}, [refreshCodeElements]);

	function onLanguageChange(next: string) {
		const codeDOMNode = getCodeDOMNode();
		if (!codeDOMNode) return;

		void loadCodeLanguage(next).then(() => {
			editor.update(() => {
				const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
				if ($isCodeNode(codeNode)) {
					codeNode.setLanguage(normalizeCodeLanguage(next));
				}
			});
			setLang(next);
			setLangOpen(false);
		});
	}

	function toggleWrap() {
		const codeDOMNode = getCodeDOMNode();
		if (!codeDOMNode) return;
		const next = !codeDOMNode.classList.contains("editor-code-wrap");
		codeDOMNode.classList.toggle("editor-code-wrap", next);
		setWrap(next);
	}

	const label = lang
		? getLanguageFriendlyName(lang)
		: getLanguageFriendlyName(DEFAULT_CODE_LANGUAGE);

	return (
		<>
			{!isShown
				? codeElements.map((el, index) => (
						<PersistentCopyButton
							anchorElem={anchorElem}
							codeDOMNode={el}
							key={`code-copy-${index}-${el.getAttribute("data-highlight-language") || el.getAttribute("data-language") || "plain"}`}
						/>
					))
				: null}
			{isShown ? (
				<div
					className="absolute z-10 flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
					data-code-action-menu
					style={{
						position: "absolute",
						right: position.right,
						top: position.top,
					}}
				>
					<div className="relative">
						<button
							aria-expanded={langOpen}
							aria-label="Code language"
							className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
							onClick={() => setLangOpen((open) => !open)}
							type="button"
						>
							{label}
							<ChevronDownIcon className="size-3 opacity-70" />
						</button>
						{langOpen ? (
							<ul className="absolute top-full right-0 z-20 mt-1 max-h-56 w-44 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
								{languageOptions.map(([value, name]) => (
									<li key={value}>
										<button
											className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
												normalizeCodeLanguage(lang || DEFAULT_CODE_LANGUAGE) ===
												value
													? "font-medium text-zinc-900 dark:text-zinc-100"
													: "text-zinc-600 dark:text-zinc-300"
											}`}
											onClick={() => onLanguageChange(value)}
											type="button"
										>
											{name}
										</button>
									</li>
								))}
							</ul>
						) : null}
					</div>
					<div className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
					<CopyButton getCodeDOMNode={getCodeDOMNode} />
					<button
						aria-label={wrap ? "Disable wrap" : "Enable wrap"}
						aria-pressed={wrap}
						className={`inline-flex size-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
							wrap
								? "text-zinc-900 dark:text-zinc-100"
								: "text-zinc-500 dark:text-zinc-400"
						}`}
						onClick={toggleWrap}
						title="Wrap"
						type="button"
					>
						<WrapTextIcon className="size-3.5" />
					</button>
				</div>
			) : null}
		</>
	);
}

export function CodeActionMenuPlugin({
	anchorElem,
}: {
	anchorElem: HTMLElement;
}): JSX.Element | null {
	return createPortal(
		<CodeActionMenuContainer anchorElem={anchorElem} />,
		anchorElem,
	);
}
