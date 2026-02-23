# PRD: Lugares del mapa en eventos

## 1. Introduction/Overview
Los eventos actuales no indican en que lugar de la arena ocurren. Se requiere agregar un sistema tipado de lugares para que cada evento incluya `location` y que la narrativa mencione esa ubicacion de forma natural.

## 2. Goals
- Definir un catalogo tipado y cerrado de lugares de la arena.
- Incluir `location` en todos los eventos generados por simulacion.
- Ajustar narrativa para mencionar el lugar en cada evento.
- Mantener consistencia de contratos API y validaciones Zod.
- Actualizar pruebas unitarias y de contratos relacionadas.

## 3. User Stories
- Como consumidor del API, quiero recibir `location` en cada evento para contextualizar la accion.
- Como desarrollador, quiero un enum tipado de lugares para evitar strings libres.
- Como jugador, quiero que el texto del evento mencione el lugar para mejorar legibilidad de la narrativa.

## 4. Functional Requirements
1. El dominio debe exponer un catalogo tipado de lugares validos inspirado en locaciones de peliculas de Hunger Games.
2. Cada evento persistido en `recent_events` debe incluir un `location` valido del catalogo.
3. Cada respuesta de `advance_turn` debe incluir `location` en el objeto `event`.
4. La narrativa del evento debe incluir una referencia explicita al lugar.
5. Los schemas de validacion deben rechazar eventos sin `location` o con valores fuera del catalogo.
6. Los tests de contratos y lifecycle deben cubrir la presencia y consistencia de `location`.

### Acceptance Criteria
- AC-1: Todos los eventos creados incluyen `location` tipado y valido.
- AC-2: `location` no acepta valores fuera del catalogo.
- AC-3: El texto narrativo de cada evento menciona la ubicacion.
- AC-4: `tests/domain-contracts.test.ts` refleja el nuevo contrato.
- AC-5: Pasan `pnpm run test:unit` y `pnpm run test:coverage`.

## 5. Non-Goals (Out of Scope)
- Rebalancear probabilidades de tipos de evento.
- Agregar un sistema de mapa visual en UI.
- Persistencia externa de mapas o regiones dinamicas.

## 6. Design Considerations
El cambio es de contrato y narrativa; la UI solo debe consumir el texto actualizado sin rediseño de layout.

## 7. Technical Considerations
- Centralizar contrato en `lib/domain/types.ts` y `lib/domain/schemas.ts`.
- Mantener respuesta API estrictamente validada con Zod.
- Preservar determinismo de simulacion para pruebas de replay.

## 8. Success Metrics
- 100% de eventos generados con `location` valido.
- 0 fallas de contrato por `location` faltante o invalido.
- Suite de tests de unidad y cobertura en verde.

## 9. Open Questions
- Ninguna bloqueante para esta iteracion.
