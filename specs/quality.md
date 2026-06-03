# Quality

## Gate

- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:coverage`
- `pnpm run test:e2e`
- `pnpm run build`

## Criteria

- Setup is usable without external instructions.
- Refresh does not show a white flash.
- A 10-48 character match ends with a single winner.
- Local resume preserves settings, RNG, and state.
- Invalid snapshot is rejected.
- Runtime does not depend on previous server state.
- Main flow meets WCAG 2.1 AA.

## Thresholds

- Initial load `<= 2.5s p75`.
- Turn render `<= 100ms p95`.
- Match API `<= 250ms p95`.
- Minimum variety: `>= 8` templates in first 20 turns.
- Event-type repetition: `<= 35%` in a 20-turn window.
