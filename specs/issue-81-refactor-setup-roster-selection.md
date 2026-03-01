# Issue #81 - Refactor setup de seleccion de roster a modulo dedicado

## Estado
- Issue: #81
- Tipo: Refactor UX interno sin cambio de contrato API
- Prioridad: P1
- Ownership actual: implementation
- Next handoff: review-pr

## Contexto
`app/matches/new/page.tsx` concentra estado y sincronizacion de seleccion de franquicias/peliculas/roster, elevando complejidad ciclomatica y riesgo de regresion UX.

## Objetivo
Extraer estado/reglas de seleccion de roster a un hook dedicado y separar render de catalogo/roster en componentes chicos para reducir acoplamiento del page principal.

## Alcance
- Crear hook `useRosterSelection` con:
  - Estado de `selectedFranchiseId` y `selectedMovieIds`.
  - Derivados de catalogo (franquicias, peliculas, roster seleccionable).
  - Reglas de sincronizacion/limpieza y acciones (`toggleMovie`, `toggleCharacter`, `generateRosterFromSelection`, `setSelectionFromRoster`, `resetSelection`).
- Extraer UI de setup en:
  - `CatalogSelection`.
  - `RosterPreview`.
- Re-cablear `app/matches/new/page.tsx` para delegar al hook/componentes.

## Fuera de alcance
- Cambios de contratos de backend.
- Nuevos flujos UX fuera de setup roster.
- Cambios de persistencia en localStorage.

## Criterios de aceptacion
- `app/matches/new/page.tsx` reduce responsabilidades de setup roster.
- Logica de seleccion vive fuera del componente principal.
- Render de catalogo/roster queda separado en componentes chicos.
- Suite de validacion del repo se mantiene en verde.

## Riesgos
- Riesgo de regresion en sincronizacion de roster legacy.
- Riesgo de desalineacion entre selección de peliculas y prune de roster.

## Mitigaciones
- Reusar helpers existentes (`deriveCatalogSelectionFromRoster`, `pruneSelectedCharacters`, `getSetupRosterPreview`).
- Ejecutar lint, unit, coverage y build como gate previo a review-pr.

## SemVer
- Decision: `patch`.
- Motivo: refactor interno con mantenimiento de comportamiento funcional, sin cambios breaking en API/contratos.

## Handoff a review-pr
- Validar gates: checks locales, semver y riesgo P0/P1.
