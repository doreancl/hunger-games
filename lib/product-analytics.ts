'use client';

import posthog from 'posthog-js';
import packageJson from '@/package.json';
import { RULESET_VERSION } from '@/lib/domain/types';

export function captureProductEvent(
  event: string,
  properties?: Record<string, boolean | number | string | null>
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  posthog.capture(event, {
    app_version: packageJson.version,
    ruleset_version: RULESET_VERSION,
    environment: process.env.NODE_ENV,
    ...properties
  });
}
