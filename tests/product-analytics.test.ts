import { afterEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  init: vi.fn()
}));

vi.mock('posthog-js', () => ({ default: posthog }));

const originalPostHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const originalPostHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

afterEach(() => {
  if (originalPostHogKey === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = originalPostHogKey;
  }

  if (originalPostHogHost === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = originalPostHogHost;
  }

  posthog.capture.mockReset();
  posthog.init.mockReset();
  vi.resetModules();
});

describe('product analytics', () => {
  it('initializes PostHog once and captures events emitted before the SDK resolves', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://analytics.example.test';

    const { captureProductEvent } = await import('@/lib/product-analytics');
    captureProductEvent('match_started', { match_id: 'match-123' });
    captureProductEvent('match_finished', { match_id: 'match-123' });

    await vi.waitFor(() => {
      expect(posthog.init).toHaveBeenCalledTimes(1);
      expect(posthog.capture).toHaveBeenCalledTimes(2);
    });

    expect(posthog.init).toHaveBeenCalledWith('test-key', {
      api_host: 'https://analytics.example.test',
      autocapture: {
        dom_event_allowlist: ['click', 'change', 'submit'],
        element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
        capture_copied_text: false
      },
      capture_pageleave: true,
      capture_pageview: true,
      capture_performance: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]'
      },
      defaults: '2026-01-30'
    });
    expect(posthog.capture).toHaveBeenCalledWith(
      'match_started',
      expect.objectContaining({ match_id: 'match-123' })
    );
  });

  it('does not load or capture analytics without a configured key', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    const { captureProductEvent } = await import('@/lib/product-analytics');
    captureProductEvent('match_started', { match_id: 'match-123' });
    await Promise.resolve();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
