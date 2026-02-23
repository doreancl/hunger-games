# PRD: Migración de npm a pnpm

## 1. Introduction/Overview
Este proyecto usa `npm` actualmente y necesita migrar a `pnpm` para mejorar velocidad de instalación, consistencia del lockfile y eficiencia de almacenamiento. El objetivo es reemplazar `npm` por `pnpm` como gestor único de paquetes, manteniendo el mismo comportamiento de build, lint y pruebas.

## 2. Goals
- Establecer `pnpm` como gestor oficial del repositorio.
- Eliminar `package-lock.json` y evitar su regeneración.
- Mantener comandos de desarrollo, build y validación funcionales.
- Validar que `lint`, `test:unit` y `test:coverage` sigan pasando tras la migración.
- Documentar el nuevo flujo para contribuidores.

## 3. User Stories
- Como desarrollador del proyecto, quiero instalar dependencias con `pnpm` para reducir tiempo de setup.
- Como mantenedor, quiero un lockfile único (`pnpm-lock.yaml`) para evitar drift entre entornos.
- Como contribuidor, quiero instrucciones claras en `README.md` para usar los comandos correctos.

## 4. Functional Requirements
1. El sistema debe generar y versionar `pnpm-lock.yaml`.
2. El repositorio no debe conservar `package-lock.json`.
3. Los scripts de `package.json` deben ejecutarse correctamente con `pnpm`.
4. El comando de validación debe dejar de invocar `npm` internamente.
5. La documentación del proyecto debe reflejar `pnpm` como gestor por defecto.
6. La configuración del repositorio debe prevenir commits accidentales de lockfiles de `npm`.
7. Debe ejecutarse una validación final de `lint`, `test:unit` y `test:coverage` usando `pnpm`.

### Acceptance Criteria
- AC-1: Al ejecutar `pnpm install`, se genera `pnpm-lock.yaml` y no se crea `package-lock.json`.
- AC-2: `package-lock.json` no existe en el árbol versionado tras la migración.
- AC-3: El script `validate` en `package.json` no contiene llamadas a `npm run`.
- AC-4: La búsqueda global `rg "npm "` no devuelve referencias operativas en scripts o documentación principal.
- AC-5: `README.md` muestra `pnpm install` y `pnpm run <script>` como comandos base.
- AC-6: `pnpm run lint`, `pnpm run test:unit` y `pnpm run test:coverage` terminan exitosamente.
- AC-7: El campo `packageManager` queda fijado en `package.json` con versión explícita de `pnpm`.

## 5. Non-Goals (Out of Scope)
- Migrar a un monorepo o introducir workspaces nuevos.
- Cambiar versiones de dependencias por motivos no relacionados a la migración.
- Refactorizar módulos de aplicación sin relación con package management.

## 6. Design Considerations
No aplica cambio visual de producto; la migración es de tooling de desarrollo.

## 7. Technical Considerations
- Mantener compatibilidad con `Next.js`, `Vitest`, `ESLint` y `Husky` actuales.
- Preferir cambios mínimos para reducir riesgo de regresiones.
- Alinear `.gitignore` y documentación para flujos con `pnpm`.

## 8. Success Metrics
- `pnpm install` completa sin errores.
- `pnpm run lint` pasa.
- `pnpm run test:unit` pasa.
- `pnpm run test:coverage` pasa.
- No existe `package-lock.json` en el repositorio final.

## 9. Open Questions
- Se fija `packageManager` en `package.json` dentro de esta iteración.
- La alineación de pipelines externos de CI queda fuera de alcance de esta iteración y se documenta como seguimiento.
