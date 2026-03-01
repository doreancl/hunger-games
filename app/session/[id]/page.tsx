import { MatchStudioPage } from '../../matches/new/page';

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const resolvedParams = await params;

  return <MatchStudioPage sessionMatchId={resolvedParams.id} />;
}
