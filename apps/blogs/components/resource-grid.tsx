"use client";

import { PencilIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ResourceCardItem = {
	id: string;
	title: string;
	subtitle?: string;
	description?: string;
	badge?: string;
};

type ResourceGridProps = {
	items: ResourceCardItem[];
	emptyTitle: string;
	emptyHint: string;
	onEmptyClick?: () => void;
	onOpen: (id: string) => void;
	onEdit?: (id: string) => void;
	editLabel?: string;
	trailing?: (id: string) => ReactNode;
};

export function ResourceGrid({
	items,
	emptyTitle,
	emptyHint,
	onEmptyClick,
	onOpen,
	onEdit,
	editLabel = "Edit",
}: ResourceGridProps) {
	if (items.length === 0) {
		return (
			<button
				className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 text-center transition-colors hover:bg-muted/40"
				onClick={onEmptyClick}
				type="button"
			>
				<p className="font-medium">{emptyTitle}</p>
				<p className="text-muted-foreground text-sm">{emptyHint}</p>
			</button>
		);
	}

	return (
		<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<li key={item.id}>
					<div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/25">
						<div className="mb-3 flex items-start justify-between gap-2">
							<button
								className="min-w-0 flex-1 text-left"
								onClick={() => onOpen(item.id)}
								type="button"
							>
								<p className="truncate font-medium tracking-tight">{item.title}</p>
								{item.subtitle ? (
									<p className="truncate text-muted-foreground text-xs">
										{item.subtitle}
									</p>
								) : null}
							</button>
							<button
								aria-label={`${editLabel} ${item.title}`}
								className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground"
								onClick={() => (onEdit ?? onOpen)(item.id)}
								type="button"
							>
								<PencilIcon className="size-4" />
							</button>
						</div>
						<p className="line-clamp-3 flex-1 text-muted-foreground text-sm">
							{item.description || "—"}
						</p>
						{item.badge ? (
							<p className="mt-4 text-muted-foreground text-xs">{item.badge}</p>
						) : null}
					</div>
				</li>
			))}
		</ul>
	);
}
