"use client";

import { Button } from "@repo/ui/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";

type CreatedKey = {
	id: string;
	name: string;
	key: string;
	createdAt: number;
	updatedAt: number;
};

type CreateApiKeyDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (row: Omit<CreatedKey, "key">) => void;
};

export function CreateApiKeyDialog({
	open,
	onOpenChange,
	onCreated,
}: CreateApiKeyDialogProps) {
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [created, setCreated] = useState<CreatedKey | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!open) {
			setName("");
			setBusy(false);
			setCreated(null);
			setCopied(false);
		}
	}, [open]);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || busy) return;
		setBusy(true);
		try {
			const row = await api<CreatedKey>("/api/admin/apis", {
				method: "POST",
				body: JSON.stringify({ name: trimmed }),
			});
			setCreated(row);
			onCreated({
				id: row.id,
				name: row.name,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			});
			toast.success("API key created");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create key");
		} finally {
			setBusy(false);
		}
	}

	async function copyKey() {
		if (!created?.key) return;
		try {
			await navigator.clipboard.writeText(created.key);
			setCopied(true);
			toast.success("API key copied");
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error("Could not copy API key");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" showCloseButton>
				{created ? (
					<>
						<DialogHeader>
							<DialogTitle>API key created</DialogTitle>
							<DialogDescription>
								Copy this key now. It will not be shown again.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-3">
							<p className="font-medium text-sm">{created.name}</p>
							<code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
								{created.key}
							</code>
						</div>
						<DialogFooter>
							<Button onClick={() => void copyKey()} type="button" variant="outline">
								{copied ? <CheckIcon /> : <CopyIcon />}
								{copied ? "Copied" : "Copy key"}
							</Button>
							<DialogClose
								render={<Button type="button" />}
							>
								Done
							</DialogClose>
						</DialogFooter>
					</>
				) : (
					<form onSubmit={(event) => void onSubmit(event)}>
						<DialogHeader>
							<DialogTitle>New API key</DialogTitle>
							<DialogDescription>
								Give this key a name. The secret is shown only once.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-2 py-2">
							<Label htmlFor="create-api-key-name">Name</Label>
							<Input
								autoFocus
								id="create-api-key-name"
								onChange={(e) => setName(e.target.value)}
								placeholder="portfolio-read"
								value={name}
							/>
						</div>
						<DialogFooter>
							<DialogClose
								render={<Button type="button" variant="outline" />}
							>
								Cancel
							</DialogClose>
							<Button disabled={busy || !name.trim()} type="submit">
								{busy ? "Creating…" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
