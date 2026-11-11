import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import type { Metadata } from "next";
import "@repo/ui/globals.css";

export const metadata: Metadata = {
	title: "Blogs CMS",
	description: "Multi-tenant blogs CMS.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-dvh antialiased">
				<ClerkProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						disableTransitionOnChange
						enableSystem
					>
						{children}
					</ThemeProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
