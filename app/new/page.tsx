import { MatchStudioPage } from '../matches/new/page';

type NewMatchPageProps = {
  searchParams?: Promise<{ prefill?: string }>;
};

export default async function NewMatchPage({ searchParams }: NewMatchPageProps) {
  const resolvedSearchParams = await searchParams;

  return <MatchStudioPage prefillMatchId={resolvedSearchParams?.prefill ?? null} />;
}

