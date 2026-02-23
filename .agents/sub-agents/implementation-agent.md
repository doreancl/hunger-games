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
- Comentarios en PR minimos: solo bullets one-liners, sin logs crudos, sin stack traces, sin bloques largos.
- Reusar PR existente del issue si ya existe uno abierto asociado; no crear PR nuevo en ese caso.

## Do
- Obtener issues con GitHub CLI (`gh issue list --state open`) y procesar uno por vez.
- Revalidar que el issue siga abierto antes de actuar; si esta cerrado, saltarlo.
- Antes de iniciar, intentar tomar lock cambiando `status:do-pending` por `status:do-wip`.
- Si no logra tomar el lock, asumir que otro agente ya tomo el issue y terminar ese item.
- Usar skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama `feat/issue-<id>-<slug>` o `fix/issue-<id>-<slug>`.
- Trabajar en `worktree` aislado: `.worktrees/issue-<id>-<slug>`.
- Implementar + tests.
- Ejecutar validaciones obligatorias, especialmente despues de resolver conflictos:
  - `pnpm run lint`
  - `pnpm run test:unit`
  - `pnpm run test:coverage`
  - `pnpm run build`
- Si cualquiera falla, no hacer handoff a review; remover `status:do-wip` y volver a `status:do-pending` + `agent:implementation`.
- Preparar versionado para review:
  - actualizar `package.json` con bump SemVer propuesto (patch/minor/major)
  - actualizar `CHANGELOG` acorde al cambio implementado
- Buscar PR abierto asociado al issue (`Closes #<id>` o branch del issue) y reusarlo si existe.
- Crear PR con `Closes #<id>` solo si no existe PR asociado abierto.
- Revisar comentarios pendientes del PR (review/comments) y resolver cada bloqueante antes del handoff.
- Si comenta en PR, usar maximo 3 bullets one-liners con accion/estado; nunca pegar output completo de comandos o tests.
- Publicar comentario simple en el issue con resultado y PR.
- Dejar issue en `status:review-pending` + `agent:review` y remover `status:do-wip`.
- Al terminar en modo normal, borrar el worktree `.worktrees/issue-<id>-<slug>` (cleanup obligatorio).
- En `DRY_RUN=true`, no editar labels, no comentar, no crear rama/PR y solo reportar `would-do`.

## Done
- PR abierta + `lint`/`test:unit`/`test:coverage`/`build` en verde + `status:review-pending`.
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
- [ ] `pnpm run lint` ejecutado en verde.
- [ ] `pnpm run test:unit` ejecutado en verde.
- [ ] `pnpm run test:coverage` ejecutado en verde.
- [ ] `pnpm run build` ejecutado en verde.
- [ ] SemVer preparado para review (`package.json` + `CHANGELOG`).
- [ ] PR asociada reutilizada si ya existia; PR nueva creada solo si no habia asociada.
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
