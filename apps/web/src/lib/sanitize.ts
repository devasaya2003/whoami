import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p",
	"br",
	"hr",
	"ul",
	"ol",
	"li",
	"blockquote",
	"pre",
	"code",
	"a",
	"img",
	"figure",
	"figcaption",
	"strong",
	"em",
	"b",
	"i",
	"u",
	"s",
	"del",
	"ins",
	"sub",
	"sup",
	"mark",
	"span",
	"div",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
	"video",
	"source",
];

export function sanitizeContentHtml(html: string): string {
	const cleaned = sanitizeHtml(html, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: {
			a: ["href", "name", "target", "rel", "title"],
			img: ["src", "alt", "title", "width", "height", "loading"],
			code: ["class"],
			pre: ["class"],
			span: ["class"],
			div: ["class"],
			th: ["colspan", "rowspan"],
			td: ["colspan", "rowspan"],
			video: ["src", "controls", "width", "height"],
			source: ["src", "type"],
			"*": ["id"],
		},
		allowedSchemes: ["http", "https", "mailto", "tel"],
		transformTags: {
			a: (tagName, attribs) => {
				const href = attribs.href ?? "";
				const isExternal = /^https?:\/\//i.test(href);
				return {
					tagName,
					attribs: {
						...attribs,
						...(isExternal
							? {
									target: "_blank",
									rel: "noopener noreferrer",
									"data-external": "true",
								}
							: {}),
					},
				};
			},
		},
	});

	return cleaned;
}
