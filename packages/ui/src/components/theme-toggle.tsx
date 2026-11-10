"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <span className="inline-block size-4" />;
	}

	return (
		<button
			aria-label="Toggle theme"
			className="hover:opacity-70"
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
