import { AppBlogsDashboard } from "../../../components/app-blogs-dashboard";

type PageProps = {
	params: Promise<{ appId: string }>;
};

export default async function AppBlogsPage({ params }: PageProps) {
	const { appId } = await params;
	return <AppBlogsDashboard appId={appId} />;
}
