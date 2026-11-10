import { SiteHeader } from "@repo/ui/components/site-header";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import type { Metadata } from "next";
import "@repo/ui/globals.css";

export const metadata: Metadata = {
	title: "whoami",
	description: "A portfolio of tiny apps and blogs.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-dvh antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					disableTransitionOnChange
					enableSystem
				>
					<SiteHeader baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
