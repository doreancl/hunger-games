# Technical Guidelines - Random Movie-Inspired Arena Events

## 1. Overview
La implementación de eventos aleatorios cinematográficos debe respetar el modelo actual: dominio tipado, selección determinista por seed, API con contratos Zod y servidor stateless. Se prioriza extensibilidad del catálogo y pruebas deterministas.

## 2. Technology Stack
- Runtime/backend: Next.js App Router (`app/api/**`) con TypeScript estricto.
- Dominio: `lib/domain/types.ts`, `lib/domain/schemas.ts`.
- Simulación: `lib/simulation-state.ts`, `lib/matches/lifecycle.ts`.
- Validación: Zod.
- Testing: Vitest + coverage V8.

## 3. Architecture Patterns
- Arquitectura modular por capas: API -> lifecycle/application -> simulation/domain.
- Motor desacoplado de UI.
- Snapshot de continuidad controlado por cliente.
- Nuevas reglas de eventos deben vivir en motor/lifecycle y no en capa de ruta.

## 4. API Design Standards
- Mantener endpoints actuales sin breaking changes.
- Reutilizar shape de respuesta `advanceTurnResponseSchema`.
- Errores deben seguir `ApiError` con códigos existentes.
- Si se agregan códigos nuevos, sincronizar types + schema + tests de contratos.

## 5. Authentication & Authorization
- No aplica autenticación para este feature (same as current system).
- Mantener aislamiento por `match_id` y validación de snapshot/ruta.

## 6. Security Requirements
- No introducir ejecución dinámica de strings narrativos.
- Validar inputs como hoy (Zod + checksum snapshot).
- No persistir datos sensibles.

## 7. Data & Domain Guidelines
- Definir catálogo tipado de eventos de arena con IDs estables.
- Evitar strings libres en tipo de evento y razón de eliminación.
- Si se agrega metadata de causa, modelarla en tipos y schema desde origen.
- Conservar límites de `recent_events`.

## 8. Integration Methods
- Sin integraciones externas.
- Integración interna con `selectCatalogEvent`, `advanceDirector` y construcción de narrativa.

## 9. Code Organization & Structure
- Nuevas estructuras de evento en `lib/matches/lifecycle.ts` o módulo de dominio dedicado dentro de `lib/`.
- Tipos compartidos en `lib/domain/types.ts`.
- Validaciones contractuales en `lib/domain/schemas.ts`.
- Pruebas en `tests/**/*.test.ts` agrupadas por comportamiento.

## 10. Design Patterns & Principles
- Funciones puras para lógica de selección/impacto siempre que sea posible.
- Inyección de RNG en funciones de decisión para testabilidad.
- Evitar duplicación de reglas entre catálogo y resolución de evento.

## 11. Testing Strategy
- Unit tests para:
  - Selección ponderada de nuevos eventos.
  - Condiciones de activación Cornucopia refill.
  - Evento escape con muerte automática.
- Contract tests para garantizar que endpoint no rompe schema.
- Cobertura objetivo >=90%.

## 12. Code Quality & Standards
- Mantener lint sin warnings relevantes.
- Mensajes narrativos deterministas bajo seed fija para assertions robustas.
- Convenciones existentes de nombres `snake_case` en payloads y `camelCase` interno según código actual.

## 13. Deployment & DevOps
- Sin cambios de infraestructura.
- Feature se despliega con pipeline actual (`pnpm run validate` como gate).

## 14. Monitoring, Logging & Observability
- Emitir logs estructurados existentes (`match.turn.event`) con template/evento seleccionado.
- Si se agrega causa explícita de muerte, incluirla en log para trazabilidad.
- Para normalización de catálogo de franquicias, emitir `metric.counter` con `metric=catalog.invalid_version_count` cuando `diagnostics.invalid_version_count > 0`.
- Incluir dimensiones mínimas `source` y `environment` para trazabilidad operativa.
- Emitir `alert.triggered` con `alert=catalog.invalid_version_count.threshold` cuando el total acumulado cruce umbral (dev: `3`, prod: `1`).

## 15. Performance & Scalability
- Selección de evento en O(n) sobre catálogo.
- No aumentar significativamente payload de `recent_events`.
- Evitar loops costosos por turno.

## 16. Dependency Management
- No agregar dependencias nuevas salvo necesidad técnica justificada.
- Reusar utilidades RNG actuales.

## 17. Development Workflow
- Commits convencionales.
- Ejecutar `pnpm run lint`, `pnpm run test:unit`, `pnpm run test:coverage`.
- Mantener cambios sincronizados entre contratos y pruebas.

## 18. Known Constraints & Trade-offs
- Mayor realismo narrativo vs simplicidad del modelo actual.
- Más eventos letales puede reducir duración media de partida; ajustar pesos para balance.
- Compatibilidad retroactiva de snapshots no garantizada entre ruleset versions.
