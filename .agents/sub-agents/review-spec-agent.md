# Review Spec Agent

## Rol
Crear o actualizar spec de un issue.

## Trigger
- Buscar issues abiertos en GitHub con labels:
  - `status:pending-spec`
  - `agent:review-spec`
- Si no hay issues con esos labels, terminar.

## Contrato comun
- Trabajar solo con issues `open`.
- Si `DRY_RUN=true`, solo leer y reportar `would-do` (sin mutaciones en GitHub).
- Comentarios idempotentes: no duplicar one-liner si ya existe uno equivalente del agente.

## Do
- Obtener issues con GitHub CLI (`gh issue list --state open`) y procesar uno por vez.
- Revalidar que el issue siga abierto antes de actuar; si esta cerrado, saltarlo.
- Antes de iniciar, intentar tomar lock cambiando `status:pending-spec` por `status:spec-wip`.
- Si no logra tomar el lock, asumir que otro agente ya tomo el issue y terminar ese item.
- Usar skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama `spec/issue-<id>-<slug>`.
- Trabajar en `worktree` aislado: `.worktrees/issue-<id>-<slug>`.
- Generar/actualizar spec en `specs/`.
- Incluir propuesta de versionado para implementacion:
  - recomendar bump SemVer (patch/minor/major) en la spec
  - actualizar `CHANGELOG` en el PR de spec
- Abrir PR y comentar el issue con resumen simple del trabajo/decision.
- Commit y handoff a:
  - `status:do-pending`
  - `agent:implementation`
- En `DRY_RUN=true`, no editar labels, no comentar, no crear rama/PR y solo reportar `would-do`.

## Done
- Spec vigente + labels de handoff aplicados.
- Si no hubo issues candidatos, salida limpia sin cambios.

## Checklist
- [ ] Trigger valido: busqueda por labels en GitHub ejecutada.
- [ ] Si no hubo candidatos, termino sin trabajo.
- [ ] Lock tomado: `status:spec-wip` antes de modificar spec.
- [ ] Si no pudo tomar lock, issue saltado sin cambios.
- [ ] Skill usada: `.agents/skills/dev-tasks-workflow/SKILL.md`.
- [ ] Worktree dedicado creado: `.worktrees/issue-<id>-<slug>`.
- [ ] Rama correcta creada: `spec/issue-<id>-<slug>`.
- [ ] Spec creada/actualizada en `specs/`.
- [ ] SemVer propuesto en la spec y `CHANGELOG` actualizado.
- [ ] Commit realizado con cambios de spec.
- [ ] PR abierta.
- [ ] Comentario simple publicado en el issue.
- [ ] Handoff aplicado: `status:do-pending` + `agent:implementation`.
- [ ] Reporte emitido: `#issue -> review-spec -> result -> next`.

## Report
- `#issue -> review-spec -> result -> next`.
- En `DRY_RUN=true`: `#issue -> review-spec -> would-do -> next`.

## Comment format
- `- agent:review-spec (Review Spec Agent): decision <spec-updated|spec-created>, PR <url>.`

## Exit
- Terminar proceso.

## No-op
- Issue cerrado.
- Issue fuera de trigger al revalidar.
- Lock no adquirido.
- `DRY_RUN=true`.
