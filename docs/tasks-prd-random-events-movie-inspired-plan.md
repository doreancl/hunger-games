# Implementation Plan - PRD Random Movie-Inspired Arena Events

## Relevant Files

- `lib/matches/lifecycle.ts` - catálogo de eventos, reglas de disparo e impactos en estado.
- `lib/simulation-state.ts` - helpers de selección ponderada y RNG determinista.
- `lib/domain/types.ts` - contratos tipados para eventos y respuestas.
- `lib/domain/schemas.ts` - validación de contratos API/domino.
- `tests/simulation-state.test.ts` - pruebas de selección de eventos y determinismo.
- `tests/lifecycle-early-pedestal.test.ts` - pruebas de eventos especiales y eliminación.
- `tests/matches-lifecycle-routes.test.ts` - pruebas de rutas ligadas al ciclo de partida.
- `tests/matches-route.test.ts` - validación de comportamiento de endpoints.
- `tests/domain-contracts.test.ts` - protección de shape contractual.

## Tasks

- [ ] 1.0 Implement Story S-001: Expandir catálogo tipado de eventos cinematográficos
  - [ ] 1.1 Definir IDs tipados y metadata base para eventos inspirados en películas.
  - [ ] 1.2 Incorporar nuevos templates al catálogo con pesos iniciales por fase.
  - [ ] 1.3 Ajustar `EventTemplate` y helpers de selección si requieren metadata especial.
  - [ ] 1.4 Verificar alineación de tipos/schemas para evitar strings libres.
  - [ ] 1.5 Verify Acceptance Criterion: Existe catálogo tipado con templates cinematográficos.
  - [ ] 1.6 Verify Acceptance Criterion: Templates respetan fase y tipos válidos.
  - [ ] 1.7 Run Tests: `pnpm run test:unit -- tests/simulation-state.test.ts`

- [ ] 2.0 Implement Story S-002: Integrar disparo aleatorio de eventos de arena por turno
  - [ ] 2.1 Conectar templates nuevos al flujo de `advanceTurn`.
  - [ ] 2.2 Ajustar ponderación por fase/estado sin romper antirrepetición.
  - [ ] 2.3 Asegurar determinismo bajo seed fija.
  - [ ] 2.4 Verify Acceptance Criterion: Selección desde catálogo tipado.
  - [ ] 2.5 Verify Acceptance Criterion: Frecuencia coherente con pesos en simulaciones controladas.
  - [ ] 2.6 Run Tests: `pnpm run test:unit -- tests/simulation-state.test.ts tests/matches-lifecycle-routes.test.ts`

- [ ] 3.0 Implement Story S-003: Implementar evento Cornucopia Refill con riesgo elevado
  - [ ] 3.1 Agregar template `cornucopia-refill` con condición de activación configurable.
  - [ ] 3.2 Implementar efecto de aumento de riesgo de confrontación/eliminación.
  - [ ] 3.3 Generar narrativa específica de anuncio + concentración de tributos.
  - [ ] 3.4 Verify Acceptance Criterion: Activación bajo condición configurable.
  - [ ] 3.5 Verify Acceptance Criterion: Narrativa coherente y efecto de riesgo observable.
  - [ ] 3.6 Run Tests: `pnpm run test:unit -- tests/lifecycle-early-pedestal.test.ts`

- [ ] 4.0 Implement Story S-004: Implementar intento de escape del arena con muerte automática
  - [ ] 4.1 Agregar template `arena-escape-attempt` y regla de disparo.
  - [ ] 4.2 Forzar eliminación automática del participante transgresor.
  - [ ] 4.3 Añadir narrativa explícita de transgresión de límites.
  - [ ] 4.4 Verify Acceptance Criterion: Personaje queda eliminado (`status=eliminated`, `health=0`).
  - [ ] 4.5 Verify Acceptance Criterion: Endpoint mantiene contrato.
  - [ ] 4.6 Run Tests: `pnpm run test:unit -- tests/lifecycle-early-pedestal.test.ts tests/matches-route.test.ts`

- [ ] 5.0 Implement Story S-005: Garantizar contratos y pruebas para aleatoriedad controlada
  - [ ] 5.1 Extender pruebas unitarias para todos los eventos especiales del issue #43.
  - [ ] 5.2 Extender pruebas de contrato para rutas afectadas.
  - [ ] 5.3 Ajustar tipos/schemas ante cualquier cambio contractual requerido.
  - [ ] 5.4 Verify Acceptance Criterion: `pnpm run test:unit` pasa.
  - [ ] 5.5 Verify Acceptance Criterion: `pnpm run test:coverage` pasa con umbral >=90%.
  - [ ] 5.6 Run Tests: `pnpm run validate`

