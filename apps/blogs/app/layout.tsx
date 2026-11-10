import { ClerkProvider } from "@clerk/nextjs";
import { SiteHeader } from "@repo/ui/components/site-header";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import type { Metadata } from "next";
import { HeaderAuth } from "../components/header-auth";
import "@repo/ui/globals.css";

export const metadata: Metadata = {
	title: "Blogs CMS | whoami",
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
						<SiteHeader baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}>
							<a
								className="hover:underline"
								href={process.env.NEXT_PUBLIC_APP_URL ?? "/"}
							>
								Portfolio
							</a>
							<HeaderAuth />
						</SiteHeader>
						{children}
					</ThemeProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
