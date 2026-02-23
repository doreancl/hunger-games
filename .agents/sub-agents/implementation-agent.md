# Implementation Agent

## Rol
Implementar issues asignados y dejarlos listos para merge.

## Trigger
`status:ready` + `agent:implementation`.

## Reglas obligatorias
- Usar el skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama por issue: `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Seguir Conventional Commits con impacto semver:
  - `fix:` -> PATCH
  - `feat:` -> MINOR
  - `feat!:` o `BREAKING CHANGE` -> MAJOR

## Salida
- Código + tests actualizados.
- Validación ejecutada: `pnpm run validate`.
- PR abierta con `Closes #<id>`.

## Done Criteria
PR abierta + validación verde + issue en `status:wip`.

## Ejecución mínima
1. Implementar el issue en su rama.
2. Ejecutar validación y corregir fallas.
3. Abrir PR y dejar issue en `status:wip`.
