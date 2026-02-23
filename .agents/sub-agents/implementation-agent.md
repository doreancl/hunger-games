# Implementation Agent

## Rol
Implementar issue y dejarlo listo para merge.

## Trigger
- `status:ready` + `agent:implementation` + `ready:implementation`.

## Do
- Usar skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Trabajar en `worktree` aislado: `.worktrees/issue-<id>-<slug>`.
- Implementar + tests.
- Ejecutar `pnpm run validate`.
- Abrir PR con `Closes #<id>`.
- Dejar issue en `status:wip`.

## Done
- PR abierta + validacion verde + `status:wip`.

## Checklist
- Trigger valido: `status:ready` + `agent:implementation` + `ready:implementation`.
- Skill usada: `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Worktree dedicado creado: `.worktrees/issue-<id>-<slug>`.
- Rama correcta creada: `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Implementacion y tests completados.
- `pnpm run validate` ejecutado en verde.
- PR abierta con `Closes #<id>`.
- Issue actualizado a `status:wip`.
- Reporte emitido: `#issue -> implementation -> result -> next`.

## Report
- `#issue -> implementation -> result -> next`.

## Exit
- Terminar proceso.
