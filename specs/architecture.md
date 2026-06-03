# Architecture

## Stack

- Next.js App Router + strict TypeScript.
- shadcn/ui + Tailwind CSS.
- React state + `localStorage`.
- Route Handlers stateless.
- Zod in API and snapshots.
- Vitest + Playwright.

## Boundaries

- `app/*`: UI and screen orchestration.
- `app/**/components`: presentational; receives data and callbacks.
- `lib/*`: domain, simulation, snapshots, storage, and contracts.
- `tests/*`: contracts, rules, and flows.

## Rules

- UI contains no business rules.
- Engine does not know React, Next, or browser APIs.
- RNG always receives a seed.
- Versioned snapshot includes settings, RNG, and match state.
- Server does not recover from DB, memory, or filesystem.
- Contract changes update `schemas.ts`, `types.ts`, and `domain-contracts.test.ts`.
