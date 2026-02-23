# Issue #45 - Agregar Modo Dios entre turnos para influir en la simulación

## Estado
- Issue: #45
- Tipo: Feature
- Prioridad: p2
- Ownership actual: review-spec
- Next handoff: implementation

## Contexto
La simulación actual avanza de forma automática por turnos sin una fase explícita para intervención humana. El issue requiere una fase intermedia donde el usuario pueda aplicar acciones tipadas de control (eventos globales/localizados, relaciones, estado de personajes) y que esas decisiones impacten de forma verificable el turno siguiente.

## Objetivo
Introducir una fase `god_mode` entre turnos que permita aplicar intervenciones tipadas, auditables e idempotentes sobre el estado antes de resolver el próximo avance del motor.

## Alcance
- Añadir fase `god_mode` entre la resolución de un turno y el siguiente.
- Definir contrato tipado de acciones de intervención (sin strings libres).
- Soportar múltiples acciones por turno según reglas configurables.
- Aplicar intervenciones al estado previo al siguiente `advanceTurn`.
- Registrar historial estructurado de intervenciones e impacto.
- Mantener compatibilidad con la simulación automática cuando no se envían acciones.

## Fuera de alcance
- Rediseño completo del motor narrativo.
- UI final de authoring de acciones (solo contrato y comportamiento de dominio/API).
- Balance definitivo de probabilidades (se parametriza; no se cierra tuning final en esta entrega).

## Diseño propuesto

### 1) Modelo de fase y ciclo
- Extender el ciclo de partida para incluir estado/fase `god_mode`.
- Si no hay intervenciones, el flujo continúa equivalente al actual.
- Persistir metadatos de intervención por turno (`turn`, `actionId`, `origin=god_mode`).

### 2) Contratos tipados de intervención
Incorporar un discriminated union en `lib/domain/types.ts` + validación en `lib/domain/schemas.ts`:
- `global_event`: `extreme_weather | toxic_fog | cornucopia_resupply`
- `localized_fire`: requiere `locationId`, `persistenceTurns?`
- `force_encounter`: `tributeAId`, `tributeBId`, `locationId?`
- `separate_tributes`: `tributeIds[]`
- `resource_adjustment`: `targetId`, `resource`, `delta`
- `revive_tribute`: `targetId`, `reviveMode`, `cost?`
- `set_relationship`: `sourceId`, `targetId`, `relation=enemy`

### 3) Aplicación de acciones en pre-turno
- Crear paso `applyGodModeActions(state, actions, rng)` previo a `advanceTurn`.
- El paso devuelve:
  - `nextState`
  - `inducedEvents[]` (eventos generados por Modo Dios)
  - `impacts[]` por personaje
- `advanceTurn` consume `nextState` ya intervenido.

### 4) Reglas para incendio localizado
- Afecta exclusivamente tributos en `locationId` objetivo.
- Resolver por personaje uno de:
  - `escape_success` (mueve a ubicación adyacente válida)
  - `injured` (marca daño/penalización temporal)
  - `forced_encounter` (colisión en huida, dispara interacción)
  - `death_by_fire` (estado muerto)
- Permitir persistencia configurable por `persistenceTurns`.
- Registrar narrativa y evento estructurado con `locationId` + resultado por tributo.

### 5) Relaciones y hostilidad
- Modelar relaciones explícitas en estructura tipada (`ally | neutral | enemy`) con soporte mínimo requerido en esta entrega para `enemy`.
- Resolver impacto en probabilidad de interacción/combate en turnos posteriores usando modificadores configurables.

### 6) Trazabilidad de historial
- Cada evento guarda `sourceType: natural | god_mode`.
- Guardar payload de acción y resumen de impacto para auditoría/replay.

### 7) API y compatibilidad
- Mantener contrato existente de creación de partida.
- Exponer endpoint/operación intermedia para enviar acciones entre turnos sin romper consumers actuales.
- Acciones inválidas deben responder con error tipado consistente (`error.code`, `error.message`, `details`).

## Criterios de aceptación verificables
1. Existe una fase explícita `god_mode` entre turnos.
2. Las acciones de intervención son tipadas y validadas por schema (sin strings libres).
3. Las intervenciones modifican el estado usado por el siguiente turno de forma determinista bajo RNG controlado.
4. `revive_tribute` cambia estado muerto->vivo bajo reglas configurables y queda trazado en historial.
5. `set_relationship(..., relation=enemy)` impacta interacciones/combat chances en turnos siguientes.
6. `localized_fire` afecta solo la ubicación objetivo y produce outcomes coherentes por tributo.
7. Historial distingue eventos naturales vs inducidos por Modo Dios.
8. No hay breaking change en contratos existentes del endpoint de partidas.
9. Pasan `pnpm run test:unit` y `pnpm run test:coverage`.

## Estrategia de testing
- Unit tests de `applyGodModeActions` por tipo de acción.
- Casos deterministas para `localized_fire` con RNG inyectable (tabla de outcomes).
- Tests de integración del flujo: turno N -> `god_mode` -> turno N+1.
- Tests de contrato API para payload válido/invalidaciones y shape de error.
- Regresión de compatibilidad: flujo sin acciones mantiene comportamiento previo.

## Versionado propuesto para implementación
- Recomendación SemVer: **minor**.
- Propuesta: `0.2.0`.
- Justificación: se agrega capacidad funcional nueva y potencial endpoint adicional sin romper contratos existentes.

## Evidencia mínima esperada en PR de implementación
- Contratos actualizados en `lib/domain/schemas.ts` y `lib/domain/types.ts`.
- Paso de aplicación de acciones antes de `advanceTurn`.
- Persistencia/trazabilidad de eventos `god_mode` en historial.
- Pruebas unitarias + integración deterministas para acciones y fuego localizado.
- Nota explícita de compatibilidad retroactiva de API.

## Checklist de handoff a implementación
- [ ] Modelar tipos y schemas de acciones `god_mode`.
- [ ] Insertar fase `god_mode` en ciclo de turnos.
- [ ] Implementar `applyGodModeActions` con RNG inyectable.
- [ ] Implementar reglas de `localized_fire` por ubicación y outcomes tipados.
- [ ] Implementar `revive_tribute` y `set_relationship(enemy)`.
- [ ] Trazar `sourceType` y payload/impacto en historial.
- [ ] Exponer operación API intermedia para enviar acciones.
- [ ] Agregar tests unitarios, integración y contratos.
- [ ] Ejecutar `pnpm run test:unit` y `pnpm run test:coverage`.
