# Product Context - Random Movie-Inspired Arena Events (Issue #43)

## Executive Summary
Hunger Games es un simulador narrativo por turnos donde la tensión y la variedad determinan la calidad de la partida. El issue #43 introduce eventos aleatorios inspirados en las películas para incrementar sorpresa, riesgo y diferenciación entre partidas con el mismo roster. El alcance se centra en catálogo tipado, selección ponderada por turno e impactos explícitos sobre estado y narrativa.

## Problem Statement
La simulación actual tiene variedad limitada de eventos y pocos eventos globales con impacto dramático fuerte. Esto reduce rejugabilidad y percepción de "arena viva". Se necesita un sistema extensible de eventos aleatorios que preserve determinismo testeable y contratos API.

## Target Users/Market
- Usuario primario: jugador casual de sesiones cortas (5-15 min) que busca drama emergente y sorpresas.
- Usuario secundario: desarrollador del proyecto que requiere reglas claras, eventos tipados y pruebas deterministas.

## Strategic Goals
- Aumentar variabilidad narrativa turno a turno sin romper coherencia del simulador.
- Mantener determinismo controlable (RNG inyectable/seeded) para pruebas y depuración.
- Integrar eventos de alto impacto inspirados en películas dentro de contratos de dominio existentes.
- Evitar regresiones en endpoints y esquema de errores.
- Sostener cobertura >=90% en líneas/branches/functions/statements.

## Current State
Producto en evolución funcional con base técnica estable (Next.js + TypeScript + Zod + Vitest). Ya existe catálogo de eventos tipados en runtime (`TURN_EVENT_CATALOG`) y selección ponderada con antirrepetición en `lib/simulation-state.ts`, pero no existe modelado formal de eventos cinematográficos específicos de arena ni reglas avanzadas para Cornucopia refill y escape del límite.

## Vision & Roadmap
- Fase 1 (issue #43): modelado e integración de eventos cinematográficos base + pruebas.
- Fase 2: balance fino de pesos por fase/sorpresa/perfil de evento.
- Fase 3: telemetría de frecuencia y ajustes automáticos de tuning.

## Success Metrics
- En simulaciones de prueba de N turnos, aparece al menos un subconjunto esperado de eventos de arena según configuración.
- Distribución de eventos consistente con pesos configurados.
- 0 rupturas de contrato en `tests/domain-contracts.test.ts` y rutas API.
- Cobertura global y de módulos nuevos en umbral del proyecto (>=90%).

## Competitive Landscape
No se compite contra un producto SaaS externo; la comparación real es contra versiones previas del simulador. Diferencial buscado: narrativa inspirada en canon de películas con reglas reproducibles y contrato fuerte.

## Key Constraints
- No romper `lib/domain/schemas.ts` ni `lib/domain/types.ts` sin sincronización completa.
- Mantener server stateless y compatibilidad con rehidratación por snapshot.
- Evitar strings libres para tipos de evento.
- Conservar forma de errores (`error.code`, `error.message`, `details.issues?`).

## Key Stakeholders
- Product owner del repo (autor del issue #43).
- Equipo de desarrollo que mantiene simulación, API y tests.
- Jugadores que consumen la experiencia narrativa en frontend.

## Assumptions
- El issue #43 es prioridad alta para siguiente iteración.
- No hay dependencia externa (servicios terceros) para esta funcionalidad.
- El comportamiento deseado puede implementarse dentro del motor actual sin rediseño arquitectónico mayor.
- Los eventos cinematográficos se modelan como extensiones del catálogo actual y no como subsistema separado.

## Open Questions
- Definición exacta de condiciones para activar Cornucopia refill (turno, cantidad vivos, fase o umbral de escasez).
- Frecuencia máxima aceptable para eventos letales de arena en fase temprana.
- Si el intento de escape debe poder dispararse más de una vez por partida o limitarse por reglas de pacing.

