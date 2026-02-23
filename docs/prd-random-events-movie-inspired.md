# PRD - Random Movie-Inspired Arena Events (Issue #43)

## 1. Executive Summary
Este PRD define la incorporación de eventos aleatorios inspirados en las películas de The Hunger Games para elevar variabilidad, tensión y narrativa emergente. La entrega incluye catálogo tipado, disparo por turno con pesos, eventos especiales (Cornucopia refill y escape del arena) y cobertura de pruebas deterministas.

## 2. Feature Overview
Se ampliará el motor de simulación con eventos de arena de alto impacto que afectan movimiento, riesgo y supervivencia. Cada evento debe producir un resultado claro en estado o narrativa y ser seleccionable bajo reglas reproducibles por seed.

## 3. Goals & Objectives
- Integrar catálogo tipado de eventos cinematográficos sin strings libres.
- Implementar disparo aleatorio configurable por turno/fase.
- Añadir impacto explícito de cada evento en el estado de partida.
- Implementar Cornucopia refill con narrativa de anuncio + concentración de riesgo.
- Implementar intento de escape con eliminación automática y causa narrativa.

## 4. Target Users
- Primario: jugador casual que valora sorpresa y drama.
- Secundario: equipo técnico que necesita trazabilidad y estabilidad contractual.

## 5. User Stories
- Como jugador, quiero que aparezcan eventos inesperados para sentir que cada partida es diferente.
- Como jugador, quiero eventos de arena inspirados en películas para que la narrativa sea más inmersiva.
- Como jugador, quiero que el reabastecimiento de Cornucopia genere conflicto para aumentar tensión.
- Como jugador, quiero que intentar escapar del límite sea mortal para mantener coherencia del lore.
- Como desarrollador, quiero RNG inyectable para poder validar comportamiento en tests deterministas.

## 6. Functional Requirements
1. El sistema debe incluir un catálogo tipado de eventos de arena con pesos/probabilidades.
2. El motor debe seleccionar eventos aleatorios por turno según fase/configuración.
3. Cada evento debe tener impacto definido en estado y/o narrativa.
4. Debe existir evento de Cornucopia refill con anuncio y aumento de riesgo por concentración.
5. Debe existir evento de intento de escape con eliminación inmediata del personaje afectado.
6. El endpoint de avance de turno debe mantener contrato de respuesta vigente.
7. La aleatoriedad debe ser determinista bajo seed fija para pruebas.

## 7. Business Rules
- Los tipos de evento deben ser tipados y validados por schema.
- Los eventos especiales no deben romper el ciclo de fases.
- Escape del arena implica muerte automática del participante transgresor.
- Cornucopia refill incrementa probabilidad de confrontación en turnos asociados.

## 8. Data Requirements
- Nuevos template IDs y metadata de eventos.
- Posible metadata adicional de causa de eliminación (si se modela en contrato).
- Registro de narrativa explícita para trazabilidad.

## 9. Non-Goals (Out of Scope)
- No se implementa UI nueva dedicada al editor de pesos.
- No se añaden servicios externos ni persistencia remota.
- No se rediseña todo el sistema de fases.

## 10. Design Considerations
- Mantener tono narrativo coherente con eventos actuales.
- Evitar ruido excesivo en feed; un evento principal por turno.
- Mantener mensajes claros cuando hay muerte por escape.

## 11. Technical Considerations
- Reusar `createSeededRng`, `selectCatalogEvent`, `advanceDirector`.
- Extender catálogo y resolución de eventos en lifecycle.
- Sincronizar tipos/schemas/tests de contrato en cambios de payload.

## 12. Acceptance Criteria
- En simulación de N turnos aparecen eventos según pesos configurados.
- Selección de evento proviene de catálogo tipado.
- Pruebas deterministas validan selección e impactos bajo seed fija.
- Cornucopia refill se puede activar bajo condición configurable y produce narrativa coherente.
- Escape del arena elimina personaje y registra causa narrativa explícita.
- No hay ruptura de contratos en endpoints de partidas.
- Pasan `pnpm run test:unit` y `pnpm run test:coverage`.

## 13. Success Metrics
- Incremento medible de diversidad de templates por partida.
- Validación de frecuencia esperada de eventos especiales en pruebas de distribución.
- Cobertura >=90% sostenida.

## 14. Assumptions
- Se acepta ajustar pesos sin configuración externa en esta primera entrega.
- El modelo actual de participantes permite representar los impactos requeridos.

## 15. Constraints & Dependencies
- Dependencia de mantener compatibilidad con schemas y tests existentes.
- Dependencia de disponibilidad de pruebas unitarias extensibles.

## 16. Security & Compliance
- No cambios de cumplimiento normativo.
- Mantener validaciones de payload e integridad de snapshot.

## 17. Open Questions
- Umbral exacto de activación de Cornucopia refill.
- Si la causa de muerte por escape debe formar parte de contrato público o solo narrativa/log.

