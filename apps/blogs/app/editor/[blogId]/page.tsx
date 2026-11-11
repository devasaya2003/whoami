"use client";

import dynamic from "next/dynamic";
import { use } from "react";

const BlogEditor = dynamic(
	() =>
		import("../../../components/blog-editor").then((m) => m.BlogEditor),
	{
		ssr: false,
		loading: () => (
			<p className="p-6 text-muted-foreground text-sm">Loading editor…</p>
		),
	},
);

export default function EditorPage({
	params,
}: {
	params: Promise<{ blogId: string }>;
}) {
	const { blogId } = use(params);
	return <BlogEditor blogId={blogId} />;
}
