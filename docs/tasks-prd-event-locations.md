## Relevant Files

- `docs/prd-event-locations.md` - Requisitos funcionales y criterios de aceptacion del cambio.
- `docs/tasks-prd-event-locations.md` - Seguimiento de implementacion por tareas y subtareas.
- `lib/domain/types.ts` - Catalogo tipado de `location` y contratos de eventos/respuestas.
- `lib/domain/schemas.ts` - Validaciones Zod para `location` en eventos y respuestas API.
- `lib/matches/lifecycle.ts` - Generacion de `location` por evento y narrativa con ubicacion.
- `app/matches/new/page.tsx` - Consumo de narrativa del API para mostrar ubicacion en feed.
- `tests/domain-contracts.test.ts` - Cobertura del contrato actualizado con `location`.
- `tests/matches-lifecycle-routes.test.ts` - Validacion de `location` en respuestas y consistencia de replay.

### Notes

- Mantener `location` como enum cerrado para evitar strings libres.
- Verificar que narrativa siempre incluya el lugar.
- Validar toda la suite para confirmar que no hay regresiones.

## Tasks

- [x] 1.0 Definir catalogo tipado de lugares en el dominio.
  - [x] 1.1 Crear enum/union de lugares en `lib/domain/types.ts`.
  - [x] 1.2 Extender tipos `Event` y `AdvanceTurnEventResponse` para incluir `location`.
- [x] 2.0 Alinear contratos y validaciones API con `location`.
  - [x] 2.1 Agregar `eventLocationSchema` en `lib/domain/schemas.ts`.
  - [x] 2.2 Exigir `location` en `eventSchema` y en `advanceTurnResponseSchema`.
- [x] 3.0 Inyectar `location` en la simulacion y narrativa de eventos.
  - [x] 3.1 Seleccionar una ubicacion valida por evento dentro de `advanceTurn`.
  - [x] 3.2 Persistir `location` en `recent_events` y retornarla en `advance_turn`.
  - [x] 3.3 Actualizar narrativa para mencionar explicitamente la ubicacion.
- [x] 4.0 Actualizar pruebas y ejecutar validacion final.
  - [x] 4.1 Actualizar pruebas de contrato con el nuevo campo `location`.
  - [x] 4.2 Ajustar pruebas de lifecycle/rutas que validan respuesta de `advance_turn`.
  - [x] 4.3 Ejecutar `pnpm run test:unit` y `pnpm run test:coverage`.
