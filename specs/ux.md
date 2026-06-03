# UX

## Visual Rule

`Nueva`, `Historial`, and runtime use the same `Eng Runbook` language: dark background, large title type scale, mono metadata, compact tables, soft borders, and minimal shadows.

## Aha Moments UI

- New match: lives at `/`; `/new` redirects to `/` and is not an accessible screen.
- New match: after the title, show an onboarding box with visible steps; yellow when setup is incomplete, green when ready.
- New match: visible CTA is `Iniciar`; other actions do not compete.
- Setup: `Franquicia y catalogo` and `Roster generado` live in 2 desktop columns, stacked on mobile.
- History: compact table with filters and `Reanudar`/`Resumen`, `Duplicar`, and `Eliminar` actions.
- Runtime: feed first, icon-first controls, tension and state without taking more space than the narrative.
- Final: winner, key moments, and elimination order.

## Non-Negotiables

- Tailwind in components; no CSS modules for new screens.
- Presentational components contain no business logic.
- Theme selector lives in the footer.
- Do not show live-only sections before starting.
- Visible text stays brief; if an explanation does not help action, remove it.
- Phase state uses compact runbook-style badges.
