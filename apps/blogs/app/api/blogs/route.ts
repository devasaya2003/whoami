import { getAllPosts } from "../../../lib/posts";

export async function GET() {
	const blogs = await getAllPosts();
	return Response.json({
		blogs: blogs.map((post) => ({
			id: post.slug,
			title: post.title,
			description: post.description,
			date: post.date,
		})),
	});
}
