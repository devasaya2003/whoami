import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getAllPosts, getPostBySlug } from "../../../lib/posts";

export async function generateStaticParams() {
	const posts = await getAllPosts();
	return posts.map((post) => ({ id: post.slug }));
}

export default async function ViewerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const post = await getPostBySlug(id);
	if (!post) notFound();

	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-8">
			<div>
				<Link className="text-muted-foreground text-sm hover:underline" href="/">
					← All posts
				</Link>
			</div>
			<header className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
				{post.date ? (
					<p className="text-muted-foreground text-sm">{post.date}</p>
				) : null}
			</header>
			<article className="prose prose-neutral dark:prose-invert max-w-none">
				<ReactMarkdown>{post.content}</ReactMarkdown>
			</article>
		</main>
	);
}
