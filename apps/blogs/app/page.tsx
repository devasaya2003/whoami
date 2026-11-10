import Link from "next/link";
import { getAllPosts } from "../lib/posts";

export default async function BlogsPage() {
	const posts = await getAllPosts();

	return (
		<main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 p-8">
			<h1 className="text-3xl font-bold tracking-tight">Blogs</h1>
			{posts.length === 0 ? (
				<p className="text-muted-foreground text-sm">No posts yet.</p>
			) : (
				<ul className="space-y-6">
					{posts.map((post) => (
						<li key={post.slug}>
							<Link className="group block" href={`/viewer/${post.slug}`}>
								<h2 className="text-xl font-medium group-hover:underline">
									{post.title}
								</h2>
								{post.date ? (
									<p className="mt-1 text-muted-foreground text-sm">{post.date}</p>
								) : null}
								{post.description ? (
									<p className="mt-2 text-muted-foreground text-sm">
										{post.description}
									</p>
								) : null}
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
