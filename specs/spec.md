# Spec de Producción (real-world)

## Objetivo
Tener una guía simple de operación real: deploy + estado + mantenimiento.

## Decisiones confirmadas
- Deploy en `Vercel`.
- Framework en producción: `Next.js`.
- Entornos: `preview` y `production`.
- Estado fuente de continuidad: snapshot completo del cliente.
- Server stateless para recuperación (sin memoria compartida, sin DB, sin archivos).
- Estado cliente: `localStorage` para estado completo de la partida (no solo resumen).
- Modelo operativo: `client snapshot + stateless server`.
- Continuidad de partida: el cliente reanuda enviando snapshot desde `localStorage`.
- Compatibilidad de continuidad: no garantizada entre versiones; si el formato cambia y rompe, no se recupera esa sesión.
- Comportamiento esperado en refresh: al recargar página, la partida continúa tras rehidratación desde el último snapshot local.
- Alcance de continuidad: la partida solo se puede continuar en el mismo navegador/dispositivo.
- Múltiples partidas locales: se guardan en `localStorage` con identificador único por partida.
- Autosave: guardar estado en `localStorage` en cada turno/evento.
- Corrupción de estado: mostrar `partida no recuperable` y permitir iniciar nueva partida.
- Snapshot incompatible: rechazar recuperación sin fallback adicional.
- Export de recuperación: permitir descargar estado de partida en formato `JSON`.
- Entrada al juego: abrir siempre la última partida disponible.
- Navegación de partidas: incluir header + menú para cambiar entre partidas locales.
- Retención local: sin límite fijo de cantidad de partidas en `localStorage`.

## Sin acordar aún
- No hay más decisiones registradas hasta conversarlas explícitamente.
