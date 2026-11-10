import Link from "next/link";

type Blog = {
	id: string;
	title: string;
};

function blogsUrl() {
	return process.env.NEXT_PUBLIC_BLOGS_URL ?? "http://localhost:3001/blogs";
}

async function getRecentBlogs(): Promise<Blog[]> {
	try {
		const res = await fetch(`${blogsUrl()}/api/blogs`, { cache: "no-store" });
		if (!res.ok) return [];
		const data = (await res.json()) as { blogs?: Blog[] };
		return data.blogs ?? [];
	} catch {
		return [];
	}
}

export default async function Home() {
	const blogs = await getRecentBlogs();

	return (
		<main className="mx-auto max-w-3xl px-6 pb-16">
			<h1 className="mt-12 mb-10 text-3xl font-medium tracking-tight">
				The Unexpected CTO
			</h1>

			<div className="max-w-2xl space-y-4">
				<p>
					I became a CTO at an unexpected stage of my life. From then onwards I
					became the dumbest person I&apos;ve ever been!
				</p>
				<p>And I&apos;m glad that I was (still am)</p>
				<p>Because I can keep learning and become less dumber!</p>
				<p>
					Everything here is a collection of my cringe, interesting and
					sacriligious projects, feel free to critisize the hell out of this
					stuff!
				</p>
				<ul className="list-disc space-y-1 pl-6">
					<li>
						<Link className="hover:underline" href={blogsUrl()}>
							Blogs
						</Link>{" "}
						- Some things I wrote...
					</li>
				</ul>
				<p className="italic">
					Last updated in November 2026. The code for everything here lives in a
					monorepo, and more apps are on the way.
				</p>
			</div>

			<section className="mt-16">
				<h2 className="mb-4 text-xl font-medium">Blog posts</h2>
				{blogs.length === 0 ? (
					<p className="text-muted-foreground text-sm">No posts yet.</p>
				) : (
					<ul className="max-w-2xl space-y-3">
						{blogs.map((blog) => (
							<li key={blog.id}>
								<Link
									className="hover:underline"
									href={`${blogsUrl()}/viewer/${blog.id}`}
								>
									{blog.title}
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<footer className="mt-16 text-center text-muted-foreground text-sm">
				&copy; 2026 whoami
			</footer>
		</main>
	);
}
