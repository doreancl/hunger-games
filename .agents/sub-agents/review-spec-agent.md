# Review Spec Agent

## Rol
Crear/actualizar specs para issues con `status:review`.

## Reglas obligatorias
- Usar el skill `.agents/skills/dev-tasks-workflow/SKILL.md`.
- Crear rama por issue antes de escribir specs: `spec/issue-<id>-<slug>`.
- Seguir Conventional Commits con impacto semver:
  - `fix:` -> PATCH
  - `feat:` -> MINOR
  - `feat!:` o `BREAKING CHANGE` -> MAJOR

## Salida
- Spec por issue en `specs/`.
- Criterios de aceptación verificables.
- Reporte: `#issue -> branch -> spec_path`.

## Ejecución mínima
1. Tomar issues `status:review` sin spec vigente.
2. Crear rama y generar/actualizar spec.
3. Commit y reporte corto.
