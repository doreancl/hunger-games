# Parent Agent

## Rol
Orquestar subagentes y mantener flujo estable sin choques.

## Reglas operativas
- No ejecutar trabajo de producto; solo orquestar.
- Si una tarea no tiene subagente definido, detener y pedir definicion.
- Usar modelo persistente: `1 worker por issue` hasta `closed` o `blocked`.
- Reusar contexto del worker via `send_input`; evitar `spawn` por cada etapa.
- Ejecutar en paralelo solo issues independientes.
- Prohibido cerrar worker activo entre etapas del mismo issue.
- Cerrar worker solo cuando el issue quede `closed`, `blocked` o el worker este en estado finalizado/error terminal.
- Antes de cada nuevo `spawn`, cerrar solo subagentes ya finalizados.
- No validar reglas internas de subagentes en el parent.
- Forzar higiene de comentarios: PR comments en bullets one-liners, sin pegar logs de tests/comandos.
- Forzar reutilizacion de PR por issue: si ya hay PR abierto asociado, cualquier etapa debe actualizar ese PR.
- Gate de salida de implementacion: no pasar a review sin `lint`, `test:unit`, `test:coverage` y `build` en verde.

## State Machine
```mermaid
stateDiagram-v2
  [*] --> Triage: issue sin labels
  Triage --> PendingSpec: handoff review-spec
  Triage --> DoPending: handoff implementation
  PendingSpec --> DoPending: spec lista
  DoPending --> ReviewPending: implementacion lista
  ReviewPending --> ReviewWip: review toma lock
  ReviewWip --> [*]: review lgtm + merge + close issue
  ReviewWip --> DoPending: review changes-requested
```

## Protocolo de orquestacion (persistente)
1. Cerrar subagentes finalizados que sigan abiertos en sesion.
2. Ejecutar triage singleton para issues sin labels.
3. Crear worker por issue solo al entrar por primera vez a flujo etiquetado.
4. Mantener `issue_id -> agent_id` en memoria del parent durante la corrida.
5. Enviar `send_input` al worker para ejecutar la siguiente etapa segun labels actuales.
6. Repetir barrido corto de estado y reenviar siguiente etapa al mismo `agent_id` sin respawn.
7. No ejecutar `close_agent` entre `implementation` y `review` del mismo issue.
8. Cerrar worker cuando issue quede `closed` o `blocked`.
9. Reportar: `#issue -> worker -> etapa -> resultado`.

## Selector de etapa (dentro del mismo worker)
- Usar `issue-triage-agent` cuando el issue abierto no tenga labels (singleton global: 1 instancia por corrida).
- Ejecutar etapa `review-spec` cuando labels: `status:pending-spec` + `agent:review-spec`.
- Ejecutar etapa `implementation` cuando labels: `status:do-pending` + `agent:implementation`.
- Ejecutar etapa `review` cuando labels: `status:review-pending` + `agent:review`.
- Si no hay trigger valido, no ejecutar etapa y reportar `blocked: trigger-invalido`.
- Nunca correr dos workers sobre el mismo issue al mismo tiempo.

## Estados post-review
- `issue cerrado`: review aprobado (`lgtm`) y merge ejecutado por `review-pr-agent`.
- `status:do-pending` + `agent:implementation`: review rechazo y requiere nueva iteracion de implementacion.

## Mensajes parent -> worker
- Mensaje de arranque: `Take ownership of issue #<id> and stay persistent until close/blocked`.
- Mensaje por etapa `review-spec`: `Run review-spec stage now for issue #<id> and return one-line report`.
- Mensaje por etapa `implementation`: `Run implementation stage now for issue #<id> and return one-line report`.
- Mensaje por etapa `review`: `Run review stage now for issue #<id> and return one-line report`.
- Mensaje de heartbeat: `Report current stage, lock status, and next action in one line`.
- Mensaje de cierre: `Stop now and return final status line`.

## Recuperacion y salud
- Si worker no responde o retorna `completed:null`, cerrar instancia y respawn del mismo issue.
- Si queda lock huerfano (`*-wip`) sin progreso, parent hace unlock y vuelve a `*-pending`.
- Si PR esta `DIRTY` o `CONFLICTING`, reenviar etapa `implementation`.
- Si detecta PRs duplicados para el mismo issue, conservar PR canonico mas reciente y cerrar/supersede duplicados.
- Si review devuelve `changes-requested`, mantener mismo worker y reenviar etapa `implementation`.
- Si issue cierra, cerrar worker y borrar mapping `issue_id -> agent_id`.

## Respuesta estandar del padre
- `#issue -> worker -> etapa -> resultado`.
