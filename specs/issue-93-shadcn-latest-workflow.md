# Issue #93 — Asegurar uso de shadcn en última versión sin fijarlo en lockfile

## Contexto
El requerimiento indica usar **shadcn en su última versión**. En la implementación previa se agregó `shadcn` como dependencia de desarrollo fija, lo que incrementó significativamente el `pnpm-lock.yaml` y acopló el repo al grafo transitorio del CLI.

## Problema
- Fijar `shadcn` como `devDependency` no es necesario para el flujo habitual de scaffolding.
- El lockfile crece de forma considerable por una herramienta que normalmente se invoca de forma puntual.
- Se pierde el objetivo de “usar la última versión” en cada ejecución, porque queda condicionado a la versión instalada/lockeada.

## Propuesta
1. Remover `shadcn` de `devDependencies`.
2. Agregar script de conveniencia para ejecutar siempre la versión más reciente:
   - `pnpm run ui:shadcn` → `pnpm dlx shadcn@latest`
3. Mantener la trazabilidad de esta decisión en `specs/`.

## Criterios de aceptación
- [ ] `package.json` no contiene `shadcn` como dependencia.
- [ ] Existe un script para invocar `shadcn@latest` vía `pnpm dlx`.
- [ ] `pnpm-lock.yaml` queda actualizado sin el paquete `shadcn` fijado.
- [ ] Lint y tests unitarios pasan.

## Notas
Si se requiere reproducibilidad estricta del CLI en CI, evaluar una estrategia separada (p. ej. pin en workflow de CI), sin forzarla en el lockfile principal del producto.
