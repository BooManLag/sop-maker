import { Published } from '@/features/processes/published';

export default async function PublishedPage(props: PageProps<'/processes/[processId]/published'>) {
  const { processId } = await props.params;
  return <Published processId={processId} />;
}
