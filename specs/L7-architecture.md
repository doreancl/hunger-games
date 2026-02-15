# Layer 7 - Architecture

## Estilo
Arquitectura modular con separación de responsabilidades entre UI, orquestación de partida y motor de simulación.

## Módulos
- `Presentation`: setup, simulación en vivo, final, menú de partidas locales.
- `Application`: casos de uso (`createMatch`, `startMatch`, `advanceTurn`, `getMatchState`, `resumeFromLocalState`).
- `Domain Simulation Engine`: reglas de interacción, tensión, relaciones y resolución de eventos.
- `Simulation Director`: pacing por fases (`bloodbath/day/night/finale`) y tensión global.
- `Event Catalog`: plantillas narrativas + pesos + reglas anti-repetición.
- `Runtime State Store`: estado en memoria de servidor por partida activa.
- `Local Recovery`: serialización/lectura de estado en `localStorage` (cliente).

## Flujo abstracto
```mermaid
flowchart TD
  A[Usuario inicia o reanuda] --> B[Application Orchestrator]
  B --> C[Simulation Director]
  C --> D[Simulation Engine]
  D --> E[Event Catalog]
  D --> F[Runtime State Store memoria]
  F --> G[UI renderiza feed y panel]
  G --> H[Autosave localStorage]
```

## Reglas arquitectónicas
- Motor de simulación desacoplado de UI y de framework web.
- Contratos explícitos entre casos de uso y runtime state.
- Sin persistencia duradera de servidor en V1 (sin DB, sin filesystem).
- Recuperación de continuidad orientada a `localStorage` del cliente.
- Estado local versionado para manejo de incompatibilidades entre releases.
