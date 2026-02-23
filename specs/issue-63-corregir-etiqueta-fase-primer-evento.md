# Issue #63 - Corregir etiqueta de fase en primer evento (bloodbath vs day)

## Estado
- Issue: #63
- Tipo: Fix funcional de consistencia UI/API
- Prioridad: p2
- Ownership actual: review-spec
- Next handoff: implementation

## Contexto
Al iniciar una partida, el primer `advance_turn` ejecuta el evento en fase `bloodbath`, pero el feed/timeline de UI etiqueta ese evento como `Turno 1 · Dia`.

Causa actual:
- Backend guarda el evento con `event.phase = currentPhase` (fase real de ejecución).
- `AdvanceTurnResponse` no expone `event.phase`.
- Frontend (`feedFromAdvance`) usa `advance.cycle_phase`, que representa la fase global siguiente del director (`day` tras el primer avance).

## Objetivo
Mostrar en feed/timeline la fase real del evento, manteniendo `cycle_phase` como estado global posterior del motor.

## Decisiones mínimas cerradas
1. Contrato API: extender `AdvanceTurnResponse.event` con `phase: CyclePhase`.
2. Fuente de verdad UI: `feedFromAdvance` debe usar `advance.event.phase` para etiquetar el evento.
3. Compatibilidad: `advance.cycle_phase` se mantiene sin cambios semánticos (siguiente fase global).
4. Tipado y validación: sincronizar `lib/domain/types.ts` + `lib/domain/schemas.ts` + pruebas de contratos.

## Alcance
- Ajuste de contrato de `advance_turn` para incluir fase del evento.
- Actualización de mapeo de feed/timeline para usar la fase del evento.
- Pruebas de no regresión en API y UI para el caso del primer avance desde `bloodbath`.

## Fuera de alcance
- Cambios de balance/gameplay o reglas del motor.
- Rediseño visual del timeline/feed.
- Refactors amplios de arquitectura de frontend.

## Diseño propuesto

### 1) Backend / contrato `advance_turn`
- En `lib/matches/lifecycle.ts`, incluir `phase: event.phase` dentro de `value.event` de `AdvanceTurnResponse`.
- En `lib/domain/types.ts`, agregar `phase: CyclePhase` en `AdvanceTurnEventResponse`.
- En `lib/domain/schemas.ts`, agregar validación `phase: cyclePhaseSchema` en `advanceTurnResponseSchema.event`.

### 2) Frontend / feed
- En `app/matches/new/page.tsx`, `feedFromAdvance` debe mapear `phase: advance.event.phase` en lugar de `advance.cycle_phase`.
- Mantener el resto del comportamiento del feed sin cambios.

### 3) Testing
- `tests/domain-contracts.test.ts`: actualizar fixture de `advance_turn response` para incluir `event.phase`.
- `tests/matches-lifecycle-routes.test.ts`: validar que `event.phase` del primer avance sea `bloodbath` cuando corresponde y que `cycle_phase` siga en `day`.
- Agregar/ajustar prueba de UI mapping (o helper equivalente) para garantizar que el feed use la fase de `event.phase`.

## Criterios de aceptación verificables
1. Tras `start` + primer `advance`, la UI renderiza `Turno 1 · Bloodbath` cuando el evento ocurrió en bloodbath.
2. `cycle_phase` en `AdvanceTurnResponse` continúa representando la fase global siguiente (`day` en ese escenario).
3. `AdvanceTurnResponse.event.phase` existe y pasa validación de schemas/contratos.
4. Existen pruebas de no-regresión para evitar volver a etiquetar el evento con la fase posterior.

## Riesgos y mitigaciones
- Riesgo: consumidores que asuman shape anterior de `event`.
- Mitigación: actualizar contratos tipados/schemas y tests en el mismo cambio para fallar temprano.

- Riesgo: duplicidad semántica (`event.phase` vs `cycle_phase`) genere confusión futura.
- Mitigación: dejar explícita la semántica en tipos/tests (evento ejecutado vs estado global siguiente).

## Evidencia mínima esperada en PR de implementación
- Diff en contrato y schema (`types` + `schemas`) con `event.phase`.
- Diff en `feedFromAdvance` usando `advance.event.phase`.
- Tests verdes demostrando primer evento en bloodbath con `cycle_phase` siguiente intacto.

## Checklist de handoff a implementación
- [ ] Extender `AdvanceTurnResponse.event` con `phase` en tipos/schemas.
- [ ] Incluir `event.phase` en respuesta de `advanceTurn`.
- [ ] Ajustar `feedFromAdvance` para usar `advance.event.phase`.
- [ ] Actualizar pruebas de contrato/API/UI según nueva semántica.
- [ ] Ejecutar `pnpm run test:unit`.
- [ ] Ejecutar `pnpm run test:coverage`.
