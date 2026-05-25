# UX

## Principio

Interfaz de reality show de supervivencia: rapida, clara y dramatica.

## Setup

- Lista/grid de personajes con busqueda y seleccion.
- CTA primario: `Iniciar simulacion`.
- Resumen en vivo: cantidad seleccionada y dificultad estimada.
- Seed manual o aleatoria.
- Ritmo inicial.
- Opciones avanzadas colapsables: sorpresas, perfil de eventos, tamano de roster.
- Una pelicula seleccionada selecciona por defecto sus personajes.
- El select-all de roster se comporta como checkbox de Gmail.
- Ocultar secciones live-only hasta que empiece la partida:
  - `Feed narrativo`
  - `Participantes`
  - `Relaciones destacadas`

## Simulacion

- Header con vivos, eliminados, turno, fase y barra de tension.
- La partida empieza reproduciendose a `2x` por defecto.
- Controles icon-first: `1x`, `2x`, `4x`, `pausa`.
- El avance manual esta oculto.
- Feed central con eventos narrativos, mas reciente arriba.
- Panel lateral con estado de personajes y relaciones destacadas.
- Toggle `Guardar local` con warning persistente cuando esta `OFF`.
- Filtro rapido por personaje y tipo de evento.
- Menu local para reabrir partidas guardadas.

## Final

- Ganador destacado.
- Momentos clave: muertes, traiciones, remontadas y sorpresas.
- Tabla final con orden de eliminacion.
- CTAs:
  - `Jugar de nuevo` con mismo roster.
  - `Nuevo roster`.
  - `Repetir con misma seed`.
  - `Compartir resultado`.

## Legibilidad

- Cada evento responde: quien, que paso, impacto.
- Texto por evento: 1-2 lineas.
- Eventos multi-personaje resaltan a todos los involucrados.
- Transiciones criticas tienen feedback visual fuerte.
- Animaciones breves y legibles, menores a 700ms.
- Colores semanticos consistentes para estado y riesgo.
- Contraste suficiente en desktop y movil.

## Layout

- `Lobby`, `Nueva` e `Historial` deben mantenerse visualmente alineados.
- El selector de tema vive en el footer como dropdown.
- `Eng Runbook` mantiene paleta tecnica oscura, escala compacta, metadata mono y sombras minimas.
- La vista principal usa contenedor centrado con `max-width`.
- En simulacion activa, `Feed + panel lateral` ocupa el ancho disponible.
- El feed mantiene prioridad visual y no puede quedar cubierto por paneles laterales.
- Los controles de ritmo se mantienen visibles y clicables en desktop.
- `Participantes`, `Relaciones destacadas` y `Partidas locales` mantienen orden vertical estable.
