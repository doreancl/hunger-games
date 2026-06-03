# Product

## North Star

Web social survival simulator: the user builds a roster, starts an automatic simulation, and quickly understands who wins, who falls, and why.

## Aha Moments

1. Clear setup: in under 30 seconds the user understands they must choose franchise, movies, roster, and press `Iniciar`.
2. First live match: after starting, a readable narrative event appears without extra configuration.
3. Emergent drama: relationships, betrayals, comebacks, and eliminations change the match outcome.
4. Obvious continuity: a local match can be resumed, duplicated, or summarized from history without explaining storage.
5. Shareable finale: the finished match shows winner, key moments, and `Resumen` action.

## V1 Scope

- Initial roster: 10-48 characters.
- Default speed: `2x`.
- Phases: `setup`, `bloodbath`, `day`, `night`, `finale`, `finished`.
- One primary narrative event per turn.
- Guaranteed single winner.
- Local continuity through snapshot in `localStorage`.
- Main setup entry at `/`; `/new` redirects to `/`.
- Server stateless.

## Core Rules

- RNG is seedable and reproducible.
- Base interaction uses 2 characters; 3+ participant events are rare and weighted.
- Global tension rises during elimination droughts and final stretch.
- Weighted catalog avoids recent repetition.
- Invalid or incompatible snapshots are rejected without fallback.
