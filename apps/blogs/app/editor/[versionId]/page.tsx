import { BlockSuiteEditor } from "../../../components/blocksuite-editor";

export default async function EditorPage({
	params,
}: {
	params: Promise<{ versionId: string }>;
}) {
	const { versionId } = await params;
	return <BlockSuiteEditor versionId={versionId} />;
}
