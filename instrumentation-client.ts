import posthog from 'posthog-js';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
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
}
