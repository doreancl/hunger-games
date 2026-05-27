# Architecture

## Stack

- Next.js App Router + TypeScript estricto.
- shadcn/ui + Tailwind CSS.
- React state + `localStorage`.
- Route Handlers stateless.
- Zod en API y snapshots.
- Vitest + Playwright.

## Limites

- `app/*`: UI y orquestacion de pantalla.
- `app/**/components`: presentacional; recibe datos y callbacks.
- `lib/*`: dominio, simulacion, snapshots, storage y contratos.
- `tests/*`: contratos, reglas y flujos.

## Reglas

- UI no contiene reglas de negocio.
- Motor no conoce React, Next ni browser APIs.
- RNG siempre recibe seed.
- Snapshot versionado incluye settings, RNG y estado de partida.
- Server no recupera desde DB, memoria ni filesystem.
- Cambios de contrato actualizan `schemas.ts`, `types.ts` y `domain-contracts.test.ts`.
