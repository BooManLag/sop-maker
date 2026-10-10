import { LivingSop } from '@/features/processes/living-sop';

export default async function ProcessPage(props: PageProps<'/processes/[processId]'>) {
  const { processId } = await props.params;
  return <LivingSop processId={processId} />;
}
