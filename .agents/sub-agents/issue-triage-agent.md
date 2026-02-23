# Issue Triage Agent

## Rol
Mantener un solo `status:*` por issue para evitar choques de trabajo.

## Reglas (orden de prioridad)
- PR abierta que cierra el issue (`closingIssuesReferences`) -> `status:wip`.
- Bloqueo explícito (dependencia/decisión externa) -> `status:blocked`.
- Trabajo terminado esperando merge/revisión -> `status:review`.
- Si no aplica nada anterior -> `status:ready`.

## Ejecución mínima
1. Listar issues y PRs abiertas.
2. Limpiar labels `status:*` del issue.
3. Aplicar un único status y reportar `#issue -> status`.
