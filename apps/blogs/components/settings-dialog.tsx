"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@repo/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/ui/table";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

type ApiKeyRow = {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
};

type SettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDisplayNameChange?: (name: string) => void;
};

export function SettingsDialog({
	open,
	onOpenChange,
	onDisplayNameChange,
}: SettingsDialogProps) {
	const { user } = useUser();
	const [displayName, setDisplayName] = useState("");
	const [nameDraft, setNameDraft] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [keys, setKeys] = useState<ApiKeyRow[]>([]);
	const [loadingKeys, setLoadingKeys] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);

	const refreshKeys = useCallback(async () => {
		setLoadingKeys(true);
		try {
			const rows = await api<ApiKeyRow[]>("/api/admin/apis");
			setKeys(rows);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to load API keys");
		} finally {
			setLoadingKeys(false);
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;

		async function load() {
			try {
				const res = await fetch("/api/admin/me");
				if (res.ok) {
					const me = (await res.json()) as { name: string | null };
					const fromDb = me.name?.trim();
					if (!cancelled && fromDb) {
						setDisplayName(fromDb);
						setNameDraft(fromDb);
						return;
					}
				}
			} catch {
				// fall through
			}
			if (cancelled) return;
			const fromClerk =
				user?.fullName?.trim() ||
				[user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
				user?.primaryEmailAddress?.emailAddress ||
				"User";
			setDisplayName(fromClerk);
			setNameDraft(fromClerk);
		}

		void load();
		void refreshKeys();
		return () => {
			cancelled = true;
		};
	}, [open, refreshKeys, user]);

	async function saveName() {
		const next = nameDraft.trim();
		if (!next || next === displayName) return;
		setSavingName(true);
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
			onDisplayNameChange?.(next);
			toast.success("Name updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save name");
		} finally {
			setSavingName(false);
		}
	}

	async function revoke(id: string) {
		setRevokingId(id);
		try {
			await api(`/api/admin/apis/${id}`, { method: "DELETE" });
			setKeys((rows) => rows.filter((row) => row.id !== id));
			toast.success("API key revoked");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to revoke key");
		} finally {
			setRevokingId(null);
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="flex h-[70vh] w-[min(70vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
					showCloseButton
				>
					<DialogHeader className="border-border border-b px-6 py-5 text-left">
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>
							Update your display name and manage API keys.
						</DialogDescription>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-5">
						<section className="space-y-3">
							<Label htmlFor="settings-display-name">Display name</Label>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Input
									id="settings-display-name"
									onChange={(e) => setNameDraft(e.target.value)}
									placeholder="Your name"
									value={nameDraft}
								/>
								<Button
									disabled={
										savingName ||
										!nameDraft.trim() ||
										nameDraft.trim() === displayName
									}
									onClick={() => void saveName()}
									type="button"
								>
									{savingName ? "Saving…" : "Save"}
								</Button>
							</div>
						</section>

						<section className="space-y-3">
							<div className="flex items-center justify-between gap-3">
								<div>
									<h3 className="font-medium text-sm">API keys</h3>
									<p className="text-muted-foreground text-xs">
										Keys for public blog access. Secrets are shown once.
									</p>
								</div>
								<Button
									aria-label="Add API key"
									className="rounded-full"
									onClick={() => setCreateOpen(true)}
									size="icon"
									type="button"
									variant="outline"
								>
									<PlusIcon />
								</Button>
							</div>

							<div className="overflow-hidden rounded-xl border border-border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Created</TableHead>
											<TableHead className="w-[1%] text-right">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loadingKeys ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													Loading…
												</TableCell>
											</TableRow>
										) : keys.length === 0 ? (
											<TableRow>
												<TableCell
													className="text-muted-foreground"
													colSpan={3}
												>
													No API keys yet.
												</TableCell>
											</TableRow>
										) : (
											keys.map((key) => (
												<TableRow key={key.id}>
													<TableCell className="font-medium">
														{key.name}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{new Date(key.createdAt).toLocaleString()}
													</TableCell>
													<TableCell className="text-right">
														<Button
															disabled={revokingId === key.id}
															onClick={() => void revoke(key.id)}
															size="sm"
															type="button"
															variant="destructive"
														>
															{revokingId === key.id ? "Revoking…" : "Revoke"}
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</section>
					</div>
				</DialogContent>
			</Dialog>

			<CreateApiKeyDialog
				onCreated={(row) => {
					setKeys((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
				}}
				onOpenChange={setCreateOpen}
				open={createOpen}
			/>
		</>
	);
}
