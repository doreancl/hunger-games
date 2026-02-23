# Implementation Agent

## Rol
Implementar issues asignados y dejarlos listos para merge.

## Trigger
`status:ready` + `agent:implementation`.

## Reglas obligatorias
- Usar el skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama por issue: `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Crear y usar `worktree` exclusivo por issue: `.worktrees/issue-<id>-<slug>`.
- Si el `worktree` ya existe y esta sucio/en uso, no reutilizarlo; crear uno nuevo con sufijo.
- No ejecutar dos issues en paralelo dentro del mismo `worktree`.
- Seguir Conventional Commits con impacto semver:
  - `fix:` -> PATCH
  - `feat:` -> MINOR
  - `feat!:` o `BREAKING CHANGE` -> MAJOR

## Salida
- Codigo + tests actualizados.
- Validacion ejecutada: `pnpm run validate`.
- PR abierta con `Closes #<id>`.

## Done Criteria
PR abierta + validacion verde + issue en `status:wip`.

## Ejecucion minima
1. Crear `worktree` del issue y trabajar solo ahi.
2. Implementar el issue en su rama.
3. Ejecutar validacion y corregir fallas.
4. Abrir PR y dejar issue en `status:wip`.
