import { redirect } from "next/navigation";

export default function BlogsRedirectPage() {
	redirect(process.env.NEXT_PUBLIC_BLOGS_URL ?? "http://localhost:3001/blogs");
}
