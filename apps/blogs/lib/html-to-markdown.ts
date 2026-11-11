/** Minimal HTML → Markdown for published Lexical HTML. */
export function htmlToMarkdown(html: string): string {
	const input = html.trim();
	if (!input) return "";

	let text = input;
	text = text.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
		return `\n\`\`\`\n${decodeEntities(stripTags(code)).trimEnd()}\n\`\`\`\n`;
	});
	text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
		const hashes = "#".repeat(Number(level));
		return `\n${hashes} ${inline(inner)}\n`;
	});
	text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
		const body = inline(inner)
			.split("\n")
			.map((line) => `> ${line}`)
			.join("\n");
		return `\n${body}\n`;
	});
	text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${inline(inner)}`);
	text = text.replace(/<\/?ul[^>]*>/gi, "\n");
	text = text.replace(/<\/?ol[^>]*>/gi, "\n");
	text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `\n${inline(inner)}\n`);
	text = text.replace(/<br\s*\/?>/gi, "\n");
	text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, "![$1]($2)");
	text = text.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "![$2]($1)");
	text = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)");
	text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
	text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
	text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
	text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
	text = stripTags(text);
	text = decodeEntities(text);
	return text
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function inline(html: string): string {
	let text = html;
	text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
	text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
	text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
	text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
	text = text.replace(/<br\s*\/?>/gi, "\n");
	return decodeEntities(stripTags(text)).trim();
}

function stripTags(value: string): string {
	return value.replace(/<[^>]+>/g, "");
}

function decodeEntities(value: string): string {
	return value
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}
