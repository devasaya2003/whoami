"use client";

import { Button } from "@repo/ui/components/ui/button";
import { cn } from "cn";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
	className?: string;
	/** Outline circular icon button (CMS header). */
	variant?: "ghost" | "outline";
};

export function ThemeToggle({
	className,
	variant = "ghost",
}: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<span
				aria-hidden
				className={cn(
					variant === "outline" ? "inline-flex size-9" : "inline-block size-4",
					className,
				)}
			/>
		);
	}

	const label =
		resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";

	if (variant === "outline") {
		return (
			<Button
				aria-label={label}
				className={cn("rounded-full", className)}
				onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
				size="icon"
				type="button"
				variant="outline"
			>
				{resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
			</Button>
		);
	}

	return (
		<button
			aria-label={label}
			className={cn("hover:opacity-70", className)}
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			type="button"
		>
			{resolvedTheme === "dark" ? (
				<SunIcon className="size-4" />
			) : (
				<MoonIcon className="size-4" />
			)}
		</button>
	);
}
