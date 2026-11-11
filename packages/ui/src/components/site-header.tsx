import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import type { ReactNode } from "react";

export function SiteHeader({
	baseUrl,
	brand = "whoami",
	children,
}: {
	baseUrl: string;
	brand?: string;
	children?: ReactNode;
}) {
	const origin = baseUrl.replace(/\/$/, "");

	return (
		<header className="mx-auto flex max-w-3xl items-baseline justify-between gap-4 px-6 pb-6 pt-16">
			<a className="text-2xl tracking-tight" href={origin || "/"}>
				{brand}
			</a>
			<nav className="flex items-center gap-5 text-sm">
				<ThemeToggle />
				<a className="hover:underline" href={origin || "/"}>
					Home
				</a>
				<a className="hover:underline" href={`${origin}/blogs`}>
					Blogs
				</a>
				{children}
			</nav>
		</header>
	);
}
