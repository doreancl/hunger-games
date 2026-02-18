# Release Gate V1

- Fecha: `2026-02-18`
- Story: `US-008`
- Issue: `https://github.com/doreancl/hunger-games/issues/13`

## Checklist de salida

- [x] Validacion final de calidad: `npm run validate` (lint + unit + coverage >= 90%).
- [x] Continuidad stateless por snapshot local valida en flujo `resume`.
- [x] Snapshot incompatible rechazado de forma explicita con `partida no recuperable`.
- [x] Sin persistencia de estado en filesystem de servidor (arquitectura stateless por request).
- [ ] Preview en Vercel operativo.
- [ ] Production en Vercel operativo.
- [x] Sin bloqueantes P0 en alcance tecnico de release gate.

## Evidencia tecnica

- Workflow CI: `.github/workflows/ci.yml`.
- Contratos y validaciones de snapshot: `lib/api/snapshot-request.ts`.
- Mensaje unico de snapshot incompatible:
  - `lib/domain/messages.ts`
  - `app/api/matches/resume/route.ts`
  - `app/api/matches/[matchId]/turns/advance/route.ts`
  - `lib/local-runtime.ts`
  - `lib/local-matches.ts`
- Tests de regresion:
  - `tests/matches-resume-route.test.ts`
  - `tests/matches-lifecycle-routes.test.ts`
  - `tests/local-runtime.test.ts`
  - `tests/local-matches.test.ts`
