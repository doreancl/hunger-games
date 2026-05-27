# UX

## Regla Visual

`Lobby`, `Nueva` e `Historial` usan el mismo lenguaje `Eng Runbook`: fondo oscuro, type scale grande para titulo, metadata mono, tablas compactas, bordes suaves y sombras minimas.

## Aha Moments UI

- Lobby: titulo simple `hunger-games`, accion secundaria solo donde aporte, tabla alineada y boton `Resumen` si la partida termino.
- Nueva: despues del titulo aparece una caja de inicio con pasos visibles; amarillo si falta setup, verde si esta listo.
- Nueva: el CTA visible es `Iniciar`; el resto de acciones no compiten.
- Setup: `Franquicia y catalogo` y `Roster generado` viven en 2 columnas desktop, apiladas en mobile.
- Historial: misma tabla, mismas columnas y misma jerarquia visual que Lobby.
- Runtime: feed primero, controles icon-first, tension y estado sin ocupar mas espacio que la narrativa.
- Final: ganador, momentos clave y orden de eliminacion.

## No Negociables

- Tailwind en componentes; no CSS modules para nuevas pantallas.
- Componentes presentacionales sin logica de negocio.
- El selector de tema vive en el footer.
- No mostrar secciones live-only antes de iniciar.
- Texto visible breve; si una explicacion no ayuda a actuar, se elimina.
- Estado de fase usa pastillas compactas estilo runbook.
