"use client";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { CmsHeader } from "./cms-header";

type ApiKeyRow = {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
};

type CreatedKey = ApiKeyRow & { key: string };

export function SettingsPage() {
	const [keys, setKeys] = useState<ApiKeyRow[]>([]);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [revealed, setRevealed] = useState<CreatedKey | null>(null);

	const refresh = useCallback(async () => {
		setError(null);
		const rows = await api<ApiKeyRow[]>("/api/admin/apis");
		setKeys(rows);
	}, []);

	useEffect(() => {
		refresh().catch((err: unknown) => {
			setError(err instanceof Error ? err.message : "Failed to load API keys");
		});
	}, [refresh]);

	async function createKey(event: FormEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		setBusy(true);
		setError(null);
		setRevealed(null);
		try {
			const created = await api<CreatedKey>("/api/admin/apis", {
				method: "POST",
				body: JSON.stringify({ name: trimmed }),
			});
			setName("");
			setRevealed(created);
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create key");
		} finally {
			setBusy(false);
		}
	}

	async function revoke(id: string) {
		setBusy(true);
		setError(null);
		try {
			await api(`/api/admin/apis/${id}`, { method: "DELETE" });
			if (revealed?.id === id) setRevealed(null);
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to revoke key");
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<CmsHeader />

			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="text-lg font-medium tracking-tight">Settings</h1>
						<p className="text-muted-foreground text-sm">
							API keys for public blog access. Raw keys are shown once.
						</p>
					</div>
					<Button nativeButton={false} render={<Link href="/" />} variant="outline">
						Back to apps
					</Button>
				</div>

				{error ? (
					<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
						{error}
					</p>
				) : null}

				<form
					className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end"
					onSubmit={(event) => void createKey(event)}
				>
					<div className="min-w-0 flex-1 space-y-1.5">
						<Label htmlFor="api-key-name">Key name</Label>
						<Input
							id="api-key-name"
							onChange={(e) => setName(e.target.value)}
							placeholder="portfolio-read"
							value={name}
						/>
					</div>
					<Button disabled={busy || !name.trim()} type="submit">
						{busy ? "Creating…" : "Create key"}
					</Button>
				</form>

				{revealed ? (
					<div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
						<p className="mb-1 font-medium text-sm">Copy this key now</p>
						<p className="mb-2 text-muted-foreground text-xs">
							It will not be shown again.
						</p>
						<code className="block break-all rounded-lg bg-background px-3 py-2 font-mono text-sm">
							{revealed.key}
						</code>
					</div>
				) : null}

				<ul className="divide-y divide-border rounded-2xl border border-border">
					{keys.length === 0 ? (
						<li className="px-4 py-8 text-center text-muted-foreground text-sm">
							No API keys yet.
						</li>
					) : (
						keys.map((key) => (
							<li
								className="flex items-center justify-between gap-3 px-4 py-3"
								key={key.id}
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-sm">{key.name}</p>
									<p className="text-muted-foreground text-xs">
										Created {new Date(key.createdAt).toLocaleString()}
									</p>
								</div>
								<Button
									disabled={busy}
									onClick={() => void revoke(key.id)}
									type="button"
									variant="destructive"
								>
									Revoke
								</Button>
							</li>
						))
					)}
				</ul>
			</main>
		</>
	);
}
