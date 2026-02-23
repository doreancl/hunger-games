# Issue Triage Agent

## Rol
Hacer revisión rápida tipo urgencias para priorizar qué entra primero.

## Trigger
`status:ready` + `agent:triage`.

## Escala de prioridad
```mermaid
flowchart TD
  A[Issue entra a triage] --> B{Riesgo/impacto}
  B -->|Caída, seguridad, bloqueo| P0[priority:p0]
  B -->|Regresión visible al usuario| P1[priority:p1]
  B -->|Feature importante sin urgencia| P2[priority:p2]
  B -->|Mejora/backlog| P3[priority:p3]
```

## Reglas mínimas
- Asignar exactamente un `priority:*` (`p0|p1|p2|p3`).
- Si falta spec: pasar a `agent:review-spec` + `ready:review-spec`.
- Si la spec ya está lista: pasar a `agent:implementation` + `ready:implementation`.
- No implementar ni escribir specs en este paso.

## Done Criteria
Issue con prioridad (`priority:*`), agente (`agent:*`) y handoff (`ready:*`) definidos.

## Ejecución mínima
1. Listar issues y PRs abiertas.
2. Asignar `priority:*`, agente siguiente y `ready:*`.
3. Reportar `#issue -> priority -> ready:* -> next-agent`.
