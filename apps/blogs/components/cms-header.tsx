"use client";

import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import {
	CheckIcon,
	PencilIcon,
	PlusIcon,
	SettingsIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
	const [draft, setDraft] = useState("");
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

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

	async function saveName() {
		const next = draft.trim();
		if (!next) return;
		setSaving(true);
		try {
			const res = await fetch("/api/admin/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: next }),
			});
			if (!res.ok) throw new Error(await res.text());
			const parts = next.split(/\s+/);
			await user?.update({
				firstName: parts[0] ?? next,
				lastName: parts.slice(1).join(" ") || undefined,
			});
			setDisplayName(next);
			setEditing(false);
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	}

	return (
		<TooltipProvider>
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pb-6 pt-12">
				<div className="min-w-0 flex-1">
					{editing ? (
						<form
							className="flex max-w-md items-center gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								void saveName();
							}}
						>
							<Input
								autoFocus
								aria-label="Display name"
								className="text-xl font-medium tracking-tight"
								onChange={(e) => setDraft(e.target.value)}
								value={draft}
							/>
							<Button
								aria-label="Save name"
								disabled={saving || !draft.trim()}
								size="icon-sm"
								type="submit"
								variant="ghost"
							>
								<CheckIcon />
							</Button>
							<Button
								aria-label="Cancel"
								disabled={saving}
								onClick={() => setEditing(false)}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<XIcon />
							</Button>
						</form>
					) : (
						<div className="flex min-w-0 items-center gap-2">
							<p className="truncate text-2xl font-medium tracking-tight">
								{displayName || (isLoaded ? "User" : "…")}
							</p>
							<Button
								aria-label="Edit name"
								onClick={() => {
									setDraft(displayName);
									setEditing(true);
								}}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<PencilIcon />
							</Button>
						</div>
					)}
				</div>

				<nav className="flex shrink-0 items-center gap-2">
					<ThemeToggle />
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									nativeButton={false}
									aria-label="Settings"
									render={<Link href="/settings" />}
									size="icon"
									variant="ghost"
									className="rounded-full"
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
		</TooltipProvider>
	);
}
