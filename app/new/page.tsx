'use client';

import { useEffect, useState } from 'react';
import { MatchStudioPage } from './match-studio-page';

export default function NewMatchPage() {
  const [prefillMatchId, setPrefillMatchId] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setPrefillMatchId(query.get('prefill'));
  }, []);

  return <MatchStudioPage prefillMatchId={prefillMatchId} />;
}
