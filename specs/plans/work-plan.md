# Plan: V1 master implementation

## Scope
- Implementar flujo completo `setup -> simulacion -> final` con continuidad local.
- Implementar motor de simulacion desacoplado y reproducible por seed.
- Implementar contratos API internos definidos en `specs/L8-integrations.yaml`.
- Cubrir seguridad base, observabilidad y pruebas (unit/integration/e2e/estocasticas).
- Validar NFRs para release en Vercel (`preview` y `production`).

## Estado global
- Estado del plan: `IN_PROGRESS`
- Convencion de estado por historia:
  - `TODO` = pendiente
  - `IN_PROGRESS` = en curso
  - `BLOCKED` = bloqueada
  - `DONE` = terminada

## User stories

### 01 - US-001 - Contratos y modelo base de dominio
- Estado: `DONE`
- As a jugador, I want un modelo consistente de partida/eventos/participantes, so that la simulacion y la UI hablen el mismo idioma.
- Acceptance criteria:
  - Given entidades de L4, when se define dominio, then existen tipos unicos para estado y eventos.
  - Given contratos L8, when se tipan requests/responses, then no hay campos ambiguos ni faltantes.
  - Given payload invalido, when llega a API, then se rechaza con error tipado.
- Spec traceability: `specs/L4-data.yaml`, `specs/L8-integrations.yaml`, `specs/L9-implementation.md`
- Dependencies: `none`
- Priority: `P0`
- Story file: `specs/plans/stories/01-US-001.md`

### 02 - US-002 - Ciclo de vida base de partida
- Estado: `TODO`
- As a jugador, I want crear y arrancar una partida valida, so that pueda iniciar la simulacion.
- Acceptance criteria:
  - Given roster 10-48, when `POST /api/matches`, then crea match en `setup`.
  - Given match en `setup`, when `POST /start`, then pasa a `running` en `bloodbath`.
  - Given match creado, when `GET /api/matches/{id}`, then retorna estado consistente.
- Spec traceability: `specs/L1-functional.md`, `specs/L7-architecture.md`, `specs/L8-integrations.yaml`
- Dependencies: `US-001`
- Priority: `P0`
- Story file: `specs/plans/stories/02-US-002.md`

### 03 - US-003A - Motor + director + catalogo
- Estado: `TODO`
- As a jugador, I want eventos variados y coherentes, so that la partida sea dramatica y rejugable.
- Acceptance criteria:
  - Given seed fija, when corro misma partida en misma version, then resultado reproducible.
  - Given reglas k>=3, when corro validacion estadistica, then desviacion en tolerancia objetivo.
  - Given anti-repeticion, when mido 20 turnos, then respeta cap de repeticion.
- Spec traceability: `specs/L1-functional.md`, `specs/L2-non-functional.yaml`, `specs/L7-architecture.md`, `specs/L9-implementation.md`
- Dependencies: `US-002`
- Priority: `P0`
- Story file: `specs/plans/stories/03-US-003A.md`

### 03 - US-003B - Setup UX + menu partidas locales
- Estado: `TODO`
- As a jugador, I want configurar roster/seed/ritmo y elegir partidas locales, so that pueda iniciar o retomar rapido.
- Acceptance criteria:
  - Given Setup, when selecciono roster y ajustes, then muestra resumen y validaciones.
  - Given partidas en localStorage, when abro menu, then puedo abrir una partida.
  - Given config valida, when inicio, then arranca sin errores.
- Spec traceability: `specs/L1-functional.md`, `specs/L3-ux.md`, `specs/spec.md`
- Dependencies: `US-002`
- Priority: `P0`
- Story file: `specs/plans/stories/03-US-003B.md`

### 04 - US-004 - Avance de turnos server-authoritative
- Estado: `TODO`
- As a jugador, I want avance consistente por turno, so that la partida termine con ganador unico.
- Acceptance criteria:
  - Given partida running, when `POST /turns/advance`, then genera 1 evento y actualiza estado.
  - Given cambios de vivos, when avanza, then fase/tension se actualizan correctamente.
  - Given 1 vivo restante, when termina, then `finished=true` y ganador unico.
- Spec traceability: `specs/L1-functional.md`, `specs/L7-architecture.md`, `specs/L8-integrations.yaml`
- Dependencies: `US-003A`, `US-003B`
- Priority: `P0`
- Story file: `specs/plans/stories/04-US-004.md`

### 05 - US-005A - UX simulacion en vivo
- Estado: `TODO`
- As a jugador, I want feed + estados + controles, so that pueda seguir la historia en tiempo real.
- Acceptance criteria:
  - Given evento nuevo, when renderiza, then muestra quien/que/impacto en 1-2 lineas.
  - Given controles 1x/2x/4x/pausa/paso, when interactuo, then mantiene contexto visual.
  - Given filtros, when aplico, then feed responde sin perder legibilidad.
- Spec traceability: `specs/L3-ux.md`, `specs/L1-functional.md`
- Dependencies: `US-004`
- Priority: `P0`
- Story file: `specs/plans/stories/05-US-005A.md`

### 05 - US-005B - Continuidad local y recuperacion
- Estado: `TODO`
- As a jugador, I want continuar tras refresh desde localStorage, so that no pierda progreso.
- Acceptance criteria:
  - Given turno/evento, when ocurre, then guarda snapshot versionado en localStorage.
  - Given refresh, when reabre app, then carga ultima partida disponible.
  - Given snapshot corrupto/incompatible, when recupero, then muestra `partida no recuperable` y nueva partida.
- Spec traceability: `specs/spec.md`, `specs/L1-functional.md`, `specs/L5-security.yaml`, `specs/L6-testing.yaml`
- Dependencies: `US-004`
- Priority: `P0`
- Story file: `specs/plans/stories/05-US-005B.md`

### 06 - US-006A - Pantalla final + replay
- Estado: `TODO`
- As a jugador, I want ver ganador/momentos clave y rejugar, so that cierre y repita sesion.
- Acceptance criteria:
  - Given partida finalizada, when entro a final, then veo ganador, momentos clave y orden de eliminacion.
  - Given replay, when elijo misma/nueva seed, then inicia nueva simulacion.
- Spec traceability: `specs/L1-functional.md`, `specs/L3-ux.md`
- Dependencies: `US-005A`, `US-005B`
- Priority: `P1`
- Story file: `specs/plans/stories/06-US-006A.md`

### 06 - US-006B - Seguridad y hardening API
- Estado: `TODO`
- As a plataforma, I want validacion estricta y rate limiting, so that protegemos integridad/disponibilidad.
- Acceptance criteria:
  - Given input fuera de rango, when llega, then se rechaza consistentemente.
  - Given abuso en create/advance, when supera umbral, then aplica rate limiting.
  - Given logs/estado local, when inspecciono, then no hay secretos expuestos.
- Spec traceability: `specs/L5-security.yaml`, `specs/L8-integrations.yaml`, `specs/spec.md`
- Dependencies: `US-004`, `US-005B`
- Priority: `P0`
- Story file: `specs/plans/stories/06-US-006B.md`

### 06 - US-006C - Observabilidad y reproducibilidad operativa
- Estado: `TODO`
- As a ingenieria, I want telemetria estructurada por evento, so that pueda diagnosticar y medir calidad.
- Acceptance criteria:
  - Given evento de partida, when ocurre, then emite log estructurado obligatorio.
  - Given replay por seed, when comparo misma version, then verifico reproducibilidad.
  - Given NFRs, when mido p95, then hay evidencia para validacion.
- Spec traceability: `specs/L2-non-functional.yaml`, `specs/L9-implementation.md`
- Dependencies: `US-004`
- Priority: `P1`
- Story file: `specs/plans/stories/06-US-006C.md`

### 07 - US-007 - Suite de pruebas integral
- Estado: `TODO`
- As a QA/engineering, I want cobertura de reglas y contratos, so that evitemos regresiones.
- Acceptance criteria:
  - Given motor, when corro unit + property-based, then invariantes criticos pasan.
  - Given APIs, when corro integration/contract, then contratos L8 estables.
  - Given flujo E2E, when corro setup->final + refresh/recovery, then escenarios nominal/error pasan.
- Spec traceability: `specs/L6-testing.yaml`, `specs/L2-non-functional.yaml`, `specs/L8-integrations.yaml`
- Dependencies: `US-006A`, `US-006B`, `US-006C`
- Priority: `P0`
- Story file: `specs/plans/stories/07-US-007.md`

### 08 - US-008 - Gate final de release
- Estado: `TODO`
- As a product owner, I want validar readiness antes de liberar, so that V1 salga estable.
- Acceptance criteria:
  - Given metricas objetivo, when ejecuto validacion final, then cumple performance/reliability/accessibility.
  - Given build final, when despliego en Vercel, then queda operativo en preview y production.
  - Given checklist release, when cierro, then no hay bloqueantes P0.
- Spec traceability: `specs/spec.md`, `specs/L2-non-functional.yaml`, `specs/L9-implementation.md`
- Dependencies: `US-007`
- Priority: `P0`
- Story file: `specs/plans/stories/08-US-008.md`

## Delivery order
1. `01 - US-001`
2. `02 - US-002`
3. `03 - US-003A`
4. `03 - US-003B`
5. `04 - US-004`
6. `05 - US-005A`
7. `05 - US-005B`
8. `06 - US-006A`
9. `06 - US-006B`
10. `06 - US-006C`
11. `07 - US-007`
12. `08 - US-008`

## Kanban simple
- Ver: `specs/plans/kanban.md`

## Riesgos y supuestos
- Riesgos:
  - Concurrencia objetivo (`>=500`) puede requerir tuning de runtime/plataforma.
  - Balance narrativo requerira iteraciones de pesos.
  - Sin persistencia server-side, continuidad depende de recuperacion local.
- Supuestos:
  - V1 sin cuentas ni sync multi-dispositivo.
  - Compatibilidad entre versiones de snapshot es best-effort.
  - Compartir en V1 se limita a export local JSON.
