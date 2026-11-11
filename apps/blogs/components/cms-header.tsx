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
import { PencilIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { resolvePersonName } from "../lib/display-name";
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
			let dbName: string | null = null;
			try {
				const res = await fetch("/api/admin/me");
				if (res.ok) {
					const me = (await res.json()) as { name: string | null; email: string };
					dbName = me.name;
				}
			} catch {
				// fall through to Clerk name fields only
			}

			if (cancelled) return;
			setDisplayName(
				resolvePersonName({
					dbName,
					fullName: user?.fullName,
					firstName: user?.firstName,
					lastName: user?.lastName,
				}),
			);
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [isLoaded, user]);

	return (
		<TooltipProvider>
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pb-6 pt-12">
				<div className="group flex min-w-0 flex-1 items-center gap-2">
					<p className="truncate text-2xl font-medium tracking-tight">
						{displayName || (isLoaded ? "User" : "…")}
					</p>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Edit profile settings"
									className="rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
									onClick={() => setSettingsOpen(true)}
									size="icon"
									type="button"
									variant="outline"
								/>
							}
						>
							<PencilIcon />
						</TooltipTrigger>
						<TooltipContent>Edit profile</TooltipContent>
					</Tooltip>
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
