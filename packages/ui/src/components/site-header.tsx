import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({
	baseUrl,
	children,
}: {
	baseUrl: string;
	children?: ReactNode;
}) {
	const origin = baseUrl.replace(/\/$/, "");

	return (
		<header className="mx-auto flex max-w-3xl items-baseline justify-between gap-4 px-6 pb-6 pt-16">
			<Link className="text-2xl tracking-tight" href={origin || "/"}>
				Devasaya Singh
			</Link>
			<nav className="flex items-center gap-5 text-sm">
				<ThemeToggle />
				<Link className="hover:underline" href={origin || "/"}>
					Home
				</Link>
				<Link className="hover:underline" href={`${origin}/blogs`}>
					Blogs
				</Link>
				{children}
			</nav>
		</header>
	);
}
