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
import { useMemo, useState, type FormEvent } from "react";
import { blogsApi, okJson } from "../lib/api";

type CreateAppDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (app: { id: string; name: string; url: string }) => void;
};

function validateUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return "URL is required";
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return "URL must start with http:// or https://";
		}
		return null;
	} catch {
		return "Enter a valid URL";
	}
}

export function CreateAppDialog({
	open,
	onOpenChange,
	onCreated,
}: CreateAppDialogProps) {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [touched, setTouched] = useState({ name: false, url: false });
	const [busy, setBusy] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const nameError = useMemo(() => {
		if (!touched.name) return null;
		return name.trim() ? null : "Name is required";
	}, [name, touched.name]);

	const urlError = useMemo(() => {
		if (!touched.url) return null;
		return validateUrl(url);
	}, [url, touched.url]);

	const canSubmit =
		Boolean(name.trim()) && validateUrl(url) === null && !busy;

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setTouched({ name: true, url: true });
		if (!name.trim() || validateUrl(url)) return;
		setBusy(true);
		setSubmitError(null);
		try {
			const app = await okJson<{ id: string; name: string; url: string }>(
				await blogsApi.api.admin.apps.$post({
					json: { name: name.trim(), url: url.trim() },
				}),
			);
			setName("");
			setUrl("");
			setTouched({ name: false, url: false });
			onOpenChange(false);
			onCreated(app);
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : "Failed to create app");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) {
					setSubmitError(null);
					setTouched({ name: false, url: false });
				}
			}}
		>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={(event) => void onSubmit(event)}>
					<DialogHeader>
						<DialogTitle>New app</DialogTitle>
						<DialogDescription>
							Apps group blogs and hold the public site URL for API consumers.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="app-name">Name</Label>
							<Input
								aria-invalid={Boolean(nameError)}
								id="app-name"
								onBlur={() => setTouched((t) => ({ ...t, name: true }))}
								onChange={(e) => setName(e.target.value)}
								placeholder="portfolio"
								value={name}
							/>
							{nameError ? (
								<p className="text-destructive text-xs">{nameError}</p>
							) : null}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="app-url">URL</Label>
							<Input
								aria-invalid={Boolean(urlError)}
								id="app-url"
								onBlur={() => setTouched((t) => ({ ...t, url: true }))}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="https://example.com"
								value={url}
							/>
							{urlError ? (
								<p className="text-destructive text-xs">{urlError}</p>
							) : null}
						</div>
						{submitError ? (
							<p className="text-destructive text-xs">{submitError}</p>
						) : null}
					</div>
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={!canSubmit} type="submit">
							{busy ? "Creating…" : "Create app"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
