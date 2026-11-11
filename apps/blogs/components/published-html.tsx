"use client";

import { useEffect, useRef } from "react";

const WRAP_ATTR = "data-code-copy-wrap";

const COPY_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function plainTextFromPre(pre: HTMLElement): string {
	return (pre.innerText || pre.textContent || "").replace(/\n$/, "");
}

function enhance(root: HTMLElement) {
	const blocks = root.querySelectorAll<HTMLElement>(
		"pre.editor-code-block, pre[data-language]",
	);

	for (const pre of blocks) {
		if (pre.closest(`[${WRAP_ATTR}]`)) continue;

		const wrap = document.createElement("div");
		wrap.setAttribute(WRAP_ATTR, "");
		wrap.className = "relative my-2";

		pre.parentNode?.insertBefore(wrap, pre);
		wrap.appendChild(pre);

		const btn = document.createElement("button");
		btn.type = "button";
		btn.className =
			"absolute top-2 right-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
		btn.setAttribute("aria-label", "Copy code");
		btn.title = "Copy";
		btn.innerHTML = COPY_SVG;

		btn.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(plainTextFromPre(pre));
				btn.innerHTML = CHECK_SVG;
				window.setTimeout(() => {
					btn.innerHTML = COPY_SVG;
				}, 1200);
			} catch {
				// ignore
			}
		});

		wrap.appendChild(btn);
	}
}

type PublishedHtmlProps = {
	html: string;
	className?: string;
};

export function PublishedHtml({ html, className }: PublishedHtmlProps) {
	const ref = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!ref.current) return;
		enhance(ref.current);
	}, [html]);

	return (
		<article
			className={className}
			// Published HTML is authored in this CMS by the signed-in user.
			dangerouslySetInnerHTML={{ __html: html }}
			ref={ref}
		/>
	);
}
