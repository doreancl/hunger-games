import { MatchStudioPage } from '../../new/match-studio-page';

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const resolvedParams = await params;

  return <MatchStudioPage sessionMatchId={resolvedParams.id} />;
}
