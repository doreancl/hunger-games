## Relevant Files

- `package.json` - Scripts y metadatos del gestor de paquetes para la migración a `pnpm`.
- `pnpm-lock.yaml` - Lockfile principal generado por `pnpm`.
- `package-lock.json` - Lockfile de `npm` a eliminar del repositorio.
- `.gitignore` - Reglas para evitar lockfiles o artefactos no deseados.
- `README.md` - Instrucciones de setup y comandos para contribuidores.
- `.npmrc` - Configuración para reforzar el uso de lockfile y políticas de instalación.
- `docs/prd-npm-to-pnpm-migration.md` - Documento de requisitos de la migración.
- `docs/tasks-prd-npm-to-pnpm-migration.md` - Seguimiento de implementación por tareas.

### Notes

- Ejecutar comandos con `pnpm` tras la migración para validar consistencia.
- Mantener cambios acotados al alcance del PRD.

## Tasks

- [x] 1.0 Establecer configuración base de `pnpm` en el repositorio.
  - [x] 1.1 Verificar disponibilidad de `pnpm` y activar `corepack` si aplica.
  - [x] 1.2 Definir `packageManager` en `package.json` con versión explícita de `pnpm`.
  - [x] 1.3 Crear/ajustar `.npmrc` con opciones de lockfile para instalación reproducible.
- [x] 2.0 Migrar lockfiles y actualizar scripts/comandos desde `npm` hacia `pnpm`.
  - [x] 2.1 Eliminar `package-lock.json`.
  - [x] 2.2 Ejecutar `pnpm install` para generar `pnpm-lock.yaml`.
  - [x] 2.3 Actualizar `validate` para no invocar `npm run`.
- [x] 3.0 Actualizar documentación y guardrails del repositorio para `pnpm`.
  - [x] 3.1 Actualizar `README.md` con comandos `pnpm`.
  - [x] 3.2 Ajustar `.gitignore` para no introducir lockfiles de `npm`.
  - [x] 3.3 Ejecutar `rg "npm "` y corregir referencias operativas residuales.
- [x] 4.0 Ejecutar validación completa post-migración y registrar resultados.
  - [x] 4.1 Ejecutar `pnpm run lint`.
  - [x] 4.2 Ejecutar `pnpm run test:unit`.
  - [x] 4.3 Ejecutar `pnpm run test:coverage`.
  - [x] 4.4 Verificar estado final (sin `package-lock.json`, con `pnpm-lock.yaml`, todo en verde).
