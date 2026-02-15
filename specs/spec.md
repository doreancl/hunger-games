# Spec de Producción (real-world)

## Objetivo
Tener una guía simple de operación real: deploy + estado + mantenimiento.

## Decisiones confirmadas
- Deploy en `Vercel`.
- Framework en producción: `Next.js`.
- Entornos: `preview` y `production`.
- Estado en curso: memoria del servidor.
- Sin persistencia duradera en servidor (sin DB, sin archivos).
- Estado cliente: `localStorage` para estado completo de la partida (no solo resumen).
- Modelo operativo: `server memory + local cache`.
- Continuidad de partida: si la instancia cambia/reinicia, el cliente intenta reanudar desde `localStorage`.
- Compatibilidad de continuidad: no garantizada entre versiones; si el formato cambia y rompe, no se recupera esa sesión.
- Comportamiento esperado en refresh: al recargar página, la partida continúa desde el último estado guardado en `localStorage`.
- Alcance de continuidad: la partida solo se puede continuar en el mismo navegador/dispositivo.
- Múltiples partidas locales: se guardan en `localStorage` con identificador único por partida.
- Autosave: guardar estado en `localStorage` en cada turno/evento.
- Corrupción de estado: mostrar `partida no recuperable` y permitir iniciar nueva partida.
- Export de recuperación: permitir descargar estado de partida en formato `JSON`.
- Entrada al juego: abrir siempre la última partida disponible.
- Navegación de partidas: incluir header + menú para cambiar entre partidas locales.
- Retención local: sin límite fijo de cantidad de partidas en `localStorage`.

## Sin acordar aún
- No hay más decisiones registradas hasta conversarlas explícitamente.
