# Quality

## Gate

- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:coverage`
- `pnpm run test:e2e`
- `pnpm run build`

## Criterios

- Setup usable sin instrucciones externas.
- Refresh no muestra flash blanco.
- Partida de 10-48 personajes termina con ganador unico.
- Reanudacion local conserva settings, RNG y estado.
- Snapshot invalido se rechaza.
- Runtime no depende de estado server previo.
- Flujo principal cumple WCAG 2.1 AA.

## Umbrales

- Initial load `<= 2.5s p75`.
- Render de turno `<= 100ms p95`.
- API partida `<= 250ms p95`.
- Variedad minima: `>= 8` plantillas en primeros 20 turnos.
- Repeticion de tipo de evento: `<= 35%` en ventana de 20 turnos.
