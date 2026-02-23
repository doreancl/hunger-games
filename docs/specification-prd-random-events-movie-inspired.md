# Technical Specification - PRD Random Movie-Inspired Arena Events

## 1. Executive Summary
Se implementará una extensión del motor de turnos para soportar eventos de arena cinematográficos con selección ponderada determinista y efectos explícitos en estado/narrativa. La solución conserva contratos API y se integra con el catálogo existente en lifecycle/simulation-state.

## 2. Reference Documents
- `docs/product-context.md`
- `docs/technical-guidelines.md`
- `docs/prd-random-events-movie-inspired.md`

## 3. System Architecture
Flujo de turno:
1. `advanceTurn(matchId)` obtiene participantes vivos y estado de fase.
2. Selecciona template desde catálogo tipado por fase + pesos + antirrepetición.
3. Resuelve lógica específica de evento (incluyendo eventos especiales).
4. Actualiza participantes, match state, tensión y `recent_events`.
5. Devuelve `AdvanceTurnResponse` validado por schema en ruta API.

## 4. Data Model & Domain Design
- Extender `EventTemplate` con metadata opcional para reglas especiales.
- Añadir templates:
  - `hazard-cornucopia-refill-1`
  - `hazard-arena-escape-attempt-1`
  - y templates de minas/fuego/niebla/mutts/tormenta/derrumbe/trampa/refugio.
- Mantener `EventType` existente cuando aplique (`hazard`, `surprise`, `resource`, `combat`).
- Para escape: usar narrativa explícita de transgresión y eliminación.

## 5. API Design
- No nuevos endpoints.
- `POST /api/matches/[matchId]/turns/advance` mantiene shape actual.
- Si se agrega metadata de causa de muerte pública, se hará con cambio sincronizado de schema + types + tests.

## 6. Authentication & Authorization
- Sin cambios (no auth).
- Mantener validaciones snapshot/route id ya existentes.

## 7. Business Logic Implementation
- Nuevas reglas:
  - Cornucopia refill:
    - activable por condición configurable interna (ej. turn >= 4 y vivos <= 12).
    - al activarse, elevar probabilidad de conflicto en ese turno o siguiente.
  - Arena escape attempt:
    - selecciona participante afectado.
    - fuerza eliminación automática (health=0, status=eliminated).
    - narrativa: intento de salir de límites + ejecución automática.
- El resto de eventos conserva modelo actual de resolución.

## 8. Integration Details
- Integración principal en:
  - `lib/matches/lifecycle.ts`
  - `lib/simulation-state.ts` (si requiere helper de ponderación adicional)
- Contratos:
  - `lib/domain/types.ts`
  - `lib/domain/schemas.ts`

## 9. UI & Client Behavior
- Sin cambios estructurales de UI requeridos.
- Feed narrativo recibe nuevos textos desde `event.narrative_text`.

## 10. Performance & Scalability
- Mantener selección O(n) sobre catálogo.
- Limitar impacto de nuevas reglas a cálculos por turno constantes.

## 11. Security Implementation
- Mantener validación estricta de payloads y schema checks.
- No interpolar inputs externos sin control en narrativa.

## 12. Error Handling & Logging
- Reusar códigos existentes para errores de flujo de turno.
- Incluir `template_id` y señales de eventos especiales en `emitStructuredLog`.

## 13. Testing Strategy for This Feature
- Unit tests nuevos:
  - selección de templates de nuevos eventos por fase.
  - activación de Cornucopia refill bajo condición.
  - eliminación automática por escape.
  - determinismo con seed fija.
- Contract tests:
  - verificar que respuestas API siguen schemas vigentes.

## 14. Deployment & Rollout
- Entrega directa detrás de reglas internas de activación.
- Sin migraciones ni flags remotas obligatorias.

## 15. Dependencies & Risks
- Riesgo: sobre-frecuencia de eventos letales reduce pacing.
- Mitigación: pesos conservadores y pruebas de distribución.
- Riesgo: flakiness en tests por aleatoriedad.
- Mitigación: RNG inyectable y seeds fijas.

## 16. Implementation Phases
- Fase A: catálogo tipado + helpers de activación.
- Fase B: resolución de eventos especiales.
- Fase C: contratos/tests/ajustes de balance.

## 17. Open Questions & Pending Decisions
- Exponer o no causa de muerte en contrato público.
- Valores finales de peso por cada template cinematográfico.

