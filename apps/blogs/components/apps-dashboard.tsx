"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { blogsApi, okJson } from "../lib/api";
import { CmsHeader } from "./cms-header";
import { CreateAppDialog } from "./create-app-dialog";
import { ResourceGrid, type ResourceCardItem } from "./resource-grid";

type AppRow = {
	id: string;
	name: string;
	url: string;
	updatedAt?: number;
};

export function AppsDashboard() {
	const router = useRouter();
	const [apps, setApps] = useState<AppRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);

	const refresh = useCallback(async () => {
		setError(null);
		const rows = await okJson<AppRow[]>(await blogsApi.api.admin.apps.$get());
		setApps(rows);
	}, []);

	useEffect(() => {
		refresh().catch((err: unknown) => {
			setError(err instanceof Error ? err.message : "Failed to load apps");
		});
	}, [refresh]);

	const items: ResourceCardItem[] = apps.map((app) => ({
		id: app.id,
		title: app.name,
		subtitle: app.url,
		description: "Open to manage blogs for this app.",
	}));

	return (
		<>
			<CmsHeader createMode="app" onCreate={() => setCreateOpen(true)} />

			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16">
				<div>
					<h1 className="text-lg font-medium tracking-tight">Apps</h1>
					<p className="text-muted-foreground text-sm">
						Each app owns a site URL and a collection of blogs.
					</p>
				</div>

				{error ? (
					<p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
						{error}
					</p>
				) : null}

				<ResourceGrid
					emptyHint="Click + in the header (or here) to create your first app."
					emptyTitle="No apps yet"
					items={items}
					onEdit={(id) => router.push(`/apps/${id}`)}
					onEmptyClick={() => setCreateOpen(true)}
					onOpen={(id) => router.push(`/apps/${id}`)}
					editLabel="Open"
				/>
			</main>

			<CreateAppDialog
				onCreated={(app) => {
					setApps((prev) => [app, ...prev]);
					router.push(`/apps/${app.id}`);
				}}
				onOpenChange={setCreateOpen}
				open={createOpen}
			/>
		</>
	);
}
