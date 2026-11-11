/**
 * Site content + identity.
 *
 * Clone this repo? Edit this object — homepage and header are driven from here.
 * Starter defaults use `whoami` (see `siteDefaults`).
 */

export type SiteLink = {
	href: string;
	label: string;
	blurb: string;
};

export type SiteConfig = {
	/** Brand in the header / footer. Default starter: `"whoami"`. */
	name: string;
	/** `<title>` and meta when not overridden by a page. */
	title: string;
	description: string;
	themeStorageKey: string;
	home: {
		headline: string;
		paragraphs: string[];
		links: SiteLink[];
		note: string;
		postsHeading: string;
		emptyPosts: string;
	};
};

/** Template defaults — clone-friendly baseline. */
export const siteDefaults: SiteConfig = {
	name: "whoami",
	title: "whoami",
	description: "A portfolio of tiny apps and blogs.",
	themeStorageKey: "whoami-theme",
	home: {
		headline: "Hello",
		paragraphs: [
			"This is a starter portfolio. Edit `src/config/site.ts` to make it yours.",
		],
		links: [
			{
				href: "/blogs",
				label: "Blogs",
				blurb: "Writing from the CMS.",
			},
		],
		note: "Last updated in November 2026. The code lives in a monorepo.",
		postsHeading: "Blog posts",
		emptyPosts: "No posts yet.",
	},
};

/**
 * Your site. Override any field from `siteDefaults`.
 * Header brand + homepage copy come from here.
 */
export const site: SiteConfig = {
	...siteDefaults,
	name: "Devasaya Singh",
	title: "Devasaya Singh",
	description:
		"The Unexpected CTO — a portfolio of cringe, interesting, and sacrilegious projects.",
	home: {
		...siteDefaults.home,
		headline: "The Unexpected CTO",
		paragraphs: [
			"I became a CTO at an unexpected stage of my life. From then onwards I became the dumbest person I've ever been!",
			"And I'm glad that I was (still am)",
			"Because I can keep learning and become less dumber!",
			"Everything here is a collection of my cringe, interesting and sacriligious projects, feel free to critisize the hell out of this stuff!",
		],
		links: [
			{
				href: "/blogs",
				label: "Blogs",
				blurb: "Some things I wrote...",
			},
		],
		note: "Last updated in November 2026. The code for everything here lives in a monorepo, and more apps are on the way.",
	},
};
