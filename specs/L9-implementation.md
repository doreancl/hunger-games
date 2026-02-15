# Layer 9 - Implementation

## Stack
- Framework web: Next.js (App Router, versión estable más reciente al implementar).
- Lenguaje: TypeScript estricto.
- UI: shadcn/ui (última versión estable) + Tailwind CSS.
- Estado cliente: React state + `localStorage` para snapshot de partida.
- Backend app: Route Handlers de Next.js para contratos HTTP internos.
- Persistencia servidor: solo memoria en runtime (sin DB, sin filesystem).
- Validación: Zod para payloads de entrada/salida y parseo de estado local.
- Testing: Vitest/Jest para unit/integration, Playwright para E2E.
- Telemetría: eventos estructurados con OpenTelemetry compatible.

## Convenciones técnicas
- Motor de simulación en módulo aislado (`core/simulation`) sin dependencias de UI.
- RNG con seed inyectable para pruebas reproducibles.
- Tipos compartidos entre API y UI para eventos/estado de partida.
- Estado local versionado para control de compatibilidad best-effort.
- Organización sugerida: `core/simulation`, `core/catalog`, `core/director`, `app/api`, `core/local-state`.
