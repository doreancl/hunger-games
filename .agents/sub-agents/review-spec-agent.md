# Review Spec Agent

## Rol
Crear o actualizar spec de un issue.

## Trigger
- `status:ready` + `agent:review-spec` + `ready:review-spec`.

## Do
- Usar skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama `spec/issue-<id>-<slug>`.
- Trabajar en `worktree` aislado: `.worktrees/issue-<id>-<slug>`.
- Generar/actualizar spec en `specs/`.
- Commit y handoff a:
  - `status:ready`
  - `agent:implementation`
  - `ready:implementation`

## Done
- Spec vigente + labels de handoff aplicados.

## Checklist
- Trigger valido: `status:ready` + `agent:review-spec` + `ready:review-spec`.
- Skill usada: `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Worktree dedicado creado: `.worktrees/issue-<id>-<slug>`.
- Rama correcta creada: `spec/issue-<id>-<slug>`.
- Spec creada/actualizada en `specs/`.
- Commit realizado con cambios de spec.
- Handoff aplicado: `status:ready` + `agent:implementation` + `ready:implementation`.
- Reporte emitido: `#issue -> review-spec -> result -> next`.

## Report
- `#issue -> review-spec -> result -> next`.

## Exit
- Terminar proceso.
