const COPY_ATTR = "data-code-copy";

function plainTextFromPre(pre: HTMLElement): string {
	return (pre.innerText || pre.textContent || "").replace(/\n$/, "");
}

function ensureCopyButton(pre: HTMLElement): void {
	if (pre.closest(`[${COPY_ATTR}-wrap]`)) return;

	const wrap = document.createElement("div");
	wrap.setAttribute(`${COPY_ATTR}-wrap`, "");
	wrap.className = "code-block";

	pre.parentNode?.insertBefore(wrap, pre);
	wrap.appendChild(pre);

	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "code-block-copy";
	btn.setAttribute(COPY_ATTR, "");
	btn.setAttribute("aria-label", "Copy code");
	btn.title = "Copy";
	btn.textContent = "Copy";

	btn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(plainTextFromPre(pre));
			btn.textContent = "Copied";
			btn.dataset.copied = "true";
			window.setTimeout(() => {
				btn.textContent = "Copy";
				delete btn.dataset.copied;
			}, 1200);
		} catch {
			btn.textContent = "Failed";
			window.setTimeout(() => {
				btn.textContent = "Copy";
			}, 1200);
		}
	});

	wrap.appendChild(btn);
}

/** Attach copy buttons to published Lexical code blocks (`pre.editor-code-block`). */
export function enhanceCodeBlocks(root: ParentNode = document): void {
	const blocks = root.querySelectorAll<HTMLElement>(
		"pre.editor-code-block, pre[data-language]",
	);
	for (const pre of blocks) {
		ensureCopyButton(pre);
	}
}
