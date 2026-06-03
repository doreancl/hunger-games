'use client';

import { useEffect, useState } from 'react';
import { MatchStudioPage } from './new/match-studio-page';

export default function Home() {
  const [prefillMatchId, setPrefillMatchId] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setPrefillMatchId(query.get('prefill'));
  }, []);

  return <MatchStudioPage prefillMatchId={prefillMatchId} />;
}
