import type { Metadata } from 'next';
import { MatchStudioPage } from '../../new/match-studio-page';

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Partida guardada',
  robots: {
    index: false,
    follow: false
  }
};

export default async function SessionPage({ params }: SessionPageProps) {
  const resolvedParams = await params;

  return <MatchStudioPage sessionMatchId={resolvedParams.id} />;
}
