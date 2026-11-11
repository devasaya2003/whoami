"use client";

import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { Button } from "@repo/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsDialog } from "./settings-dialog";

type CmsHeaderProps = {
	createMode?: "app" | "blog";
	onCreate?: () => void;
	createBusy?: boolean;
};

export function CmsHeader({
	createMode,
	onCreate,
	createBusy = false,
}: CmsHeaderProps) {
	const { user, isLoaded } = useUser();
	const [displayName, setDisplayName] = useState("");
	const [settingsOpen, setSettingsOpen] = useState(false);

	const showCreate = Boolean(createMode && onCreate);
	const createLabel = createMode === "blog" ? "New blog" : "New app";

	useEffect(() => {
		if (!isLoaded) return;
		let cancelled = false;

		async function load() {
			try {
				const res = await fetch("/api/admin/me");
				if (res.ok) {
					const me = (await res.json()) as { name: string | null; email: string };
					const fromDb = me.name?.trim();
					if (!cancelled && fromDb) {
						setDisplayName(fromDb);
						return;
					}
				}
			} catch {
				// fall through to Clerk
			}

			if (cancelled) return;
			const fromClerk =
				user?.fullName?.trim() ||
				[user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
				user?.primaryEmailAddress?.emailAddress ||
				user?.emailAddresses[0]?.emailAddress ||
				"User";
			setDisplayName(fromClerk);
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [isLoaded, user]);

	return (
		<TooltipProvider>
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pb-6 pt-12">
				<div className="min-w-0 flex-1">
					<p className="truncate text-2xl font-medium tracking-tight">
						{displayName || (isLoaded ? "User" : "…")}
					</p>
				</div>

				<nav className="flex shrink-0 items-center gap-2">
					<ThemeToggle variant="outline" />
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Settings"
									className="rounded-full"
									onClick={() => setSettingsOpen(true)}
									size="icon"
									type="button"
									variant="outline"
								/>
							}
						>
							<SettingsIcon />
						</TooltipTrigger>
						<TooltipContent>Settings</TooltipContent>
					</Tooltip>
					{showCreate ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label={createLabel}
										className="rounded-full"
										disabled={createBusy}
										onClick={onCreate}
										size="icon"
										type="button"
										variant="outline"
									/>
								}
							>
								<PlusIcon />
							</TooltipTrigger>
							<TooltipContent>{createLabel}</TooltipContent>
						</Tooltip>
					) : null}
					<SignedIn>
						<UserButton afterSignOutUrl="/sign-in" />
					</SignedIn>
				</nav>
			</header>

			<SettingsDialog
				onDisplayNameChange={setDisplayName}
				onOpenChange={setSettingsOpen}
				open={settingsOpen}
			/>
		</TooltipProvider>
	);
}
