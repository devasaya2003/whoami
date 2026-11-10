import dynamic from "next/dynamic";

const BlockSuiteEditor = dynamic(
	() =>
		import("../../../components/blocksuite-editor").then(
			(mod) => mod.BlockSuiteEditor,
		),
	{
		ssr: false,
		loading: () => (
			<main className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground text-sm">
				Loading editor…
			</main>
		),
	},
);

export default async function EditorPage({
	params,
}: {
	params: Promise<{ versionId: string }>;
}) {
	const { versionId } = await params;
	return <BlockSuiteEditor versionId={versionId} />;
}
