'use client';

import { Agentation } from 'agentation';

export function AgentationDevtools() {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.NEXT_PUBLIC_DISABLE_AGENTATION === '1'
  ) {
    return null;
  }

  return <Agentation />;
}
