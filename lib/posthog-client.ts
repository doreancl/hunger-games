type PostHog = typeof import('posthog-js').default;

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let posthogPromise: Promise<PostHog> | undefined;

export function loadPostHog(): Promise<PostHog | null> {
  if (!posthogKey) {
    return Promise.resolve(null);
  }

  posthogPromise ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
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

    return posthog;
  });

  return posthogPromise;
}
