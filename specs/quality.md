# Quality

## Performance

- Initial load: `<= 2.5s p75` en red 4G.
- Render de turno: `<= 100ms p95` por evento.
- Simulation tick server: `<= 50ms p95`.
- API de partida: `<= 250ms p95`.
- Roster soportado: 10-48 personajes.

## Reliability

- `>= 99.5%` partidas terminan sin error.
- `>= 99.9%` respuestas API 2xx/3xx.
- `>= 99%` reanudaciones exitosas con snapshot local valido.
- `>= 99%` rehidrataciones sin depender de estado previo en server.

## Game Quality

- Repeticion de tipo de evento: `<= 35%` del mismo tipo en ventana de 20 turnos.
- Probabilidad multi-actor: desviacion `<= 10%` en 100k simulaciones.
- Duracion: p80 entre 5 y 15 minutos en `1x`.
- Variedad minima: `>= 8` plantillas distintas en los primeros 20 turnos.

## Accessibility

- WCAG 2.1 AA en flujo principal.

## Security

- V1 sin cuentas de usuario.
- Sesion limitada al navegador/dispositivo local.
- Todo trafico bajo HTTPS.
- No exponer datos sensibles en payloads ni logs.
- No guardar secretos en `localStorage`.
- Rate limiting en creacion de partidas y avance de turnos.
- Validacion estricta de roster, parametros de simulacion y snapshot cliente.
- Snapshot con checksum/version para detectar corrupcion o incompatibilidad.
- Snapshot invalido o incompatible: rechazar con `partida no recuperable`.

## Testing

- Unit: reglas, probabilidades, transiciones, tension y relaciones.
- Integration: APIs de creacion, inicio, avance y rehidratacion.
- E2E: `setup -> simulacion -> ganador -> refresh -> resume`.
- Estadisticas: validar distribuciones esperadas sobre miles de simulaciones.
- Seed fija: escenarios deterministas de regresion.
- Property-based: nunca revivir eliminados, ganador unico, fin garantizado.
- Local state: autosave, refresh, continuidad exacta, corrupcion e incompatibilidad.
- Contract tests: payloads API y errores tipados.

## Release Gate

- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:coverage`
- `pnpm run test:e2e`
- `pnpm run build`
- Sin bloqueantes P0 abiertos.
