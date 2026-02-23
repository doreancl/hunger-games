# Implementation Agent

## Rol
Implementar issue y dejarlo listo para merge.

## Trigger
- Buscar issues abiertos en GitHub con labels:
  - `status:do-pending`
  - `agent:implementation`
- Si no hay issues con esos labels, terminar.

## Contrato comun
- Trabajar solo con issues `open`.
- Si `DRY_RUN=true`, solo leer y reportar `would-do` (sin mutaciones en GitHub).
- Comentarios idempotentes: no duplicar one-liner si ya existe uno equivalente del agente.

## Do
- Obtener issues con GitHub CLI (`gh issue list --state open`) y procesar uno por vez.
- Revalidar que el issue siga abierto antes de actuar; si esta cerrado, saltarlo.
- Antes de iniciar, intentar tomar lock cambiando `status:do-pending` por `status:do-wip`.
- Si no logra tomar el lock, asumir que otro agente ya tomo el issue y terminar ese item.
- Usar skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Trabajar en `worktree` aislado: `.worktrees/issue-<id>-<slug>`.
- Implementar + tests.
- Ejecutar `pnpm run validate`.
- Preparar versionado para review:
  - actualizar `package.json` con bump SemVer propuesto (patch/minor/major)
  - actualizar `CHANGELOG` acorde al cambio implementado
- Abrir PR con `Closes #<id>`.
- Revisar comentarios pendientes del PR (review/comments) y resolver cada bloqueante antes del handoff.
- Publicar comentario simple en el issue con resultado y PR.
- Dejar issue en `status:review-pending` + `agent:review` y remover `status:do-wip`.
- Al terminar en modo normal, borrar el worktree `.worktrees/issue-<id>-<slug>` (cleanup obligatorio).
- En `DRY_RUN=true`, no editar labels, no comentar, no crear rama/PR y solo reportar `would-do`.

## Done
- PR abierta + validacion verde + `status:review-pending`.
- Si no hubo issues candidatos, salida limpia sin cambios.

## Checklist (Sin candidatos)
- [ ] Trigger valido: busqueda por labels en GitHub ejecutada.
- [ ] Si no hubo candidatos, termino sin trabajo.

## Checklist (Con ejecucion)
- [ ] Trigger valido: busqueda por labels en GitHub ejecutada.
- [ ] Se selecciono un issue abierto candidato.
- [ ] Lock tomado: `status:do-wip` antes de modificar codigo.
- [ ] Si no pudo tomar lock, issue saltado sin cambios.
- [ ] Skill usada: `.agents/skills/dev-tasks-workflow/SKILL.md`.
- [ ] Worktree dedicado creado: `.worktrees/issue-<id>-<slug>`.
- [ ] Rama correcta creada: `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- [ ] Implementacion y tests completados.
- [ ] `pnpm run validate` ejecutado en verde.
- [ ] SemVer preparado para review (`package.json` + `CHANGELOG`).
- [ ] PR abierta con `Closes #<id>`.
- [ ] Comentarios pendientes del PR revisados y bloqueantes resueltos o respondidos.
- [ ] Comentario simple publicado en el issue.
- [ ] Issue actualizado a `status:review-pending` + `agent:review` sin lock remanente.
- [ ] Worktree eliminado al finalizar (no aplica en `DRY_RUN=true`).
- [ ] Reporte emitido: `#issue -> implementation -> result -> next`.

## Tooling
- Fuente de issues: GitHub CLI (`gh issue list --state open`, `gh issue view`).
- Fuente de PR: GitHub CLI (`gh pr view`, `gh pr comment`).
- Comentarios: GitHub CLI (`gh issue comment`).

## Report
- `#issue -> implementation -> result -> next`.
- En `DRY_RUN=true`: `#issue -> implementation -> would-do -> next`.

## Comment format
- `- agent:implementation (Implementation Agent): decision <implemented>, PR <url>.`

## Exit
- Terminar proceso.

## No-op
- Issue cerrado.
- Issue fuera de trigger al revalidar.
- Lock no adquirido.
- `DRY_RUN=true`.
