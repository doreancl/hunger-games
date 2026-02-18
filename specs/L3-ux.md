# Layer 3 - UX

## Experiencia
Interfaz de "reality show de supervivencia": rápida, clara y dramática.

## Pantallas
1. `Setup`
- Lista/grid de personajes con búsqueda y selección.
- CTA primario: `Iniciar simulación`.
- Resumen en vivo: cantidad seleccionada, dificultad estimada.
- Opción de `seed` (manual o aleatoria) y selector de ritmo inicial.
- Panel `Opciones avanzadas` colapsable (sorpresas, perfil de eventos, tamaño de roster).

2. `Simulación`
- Header: vivos, eliminados, turno actual, control de velocidad (`1x`, `2x`, `4x`, `pausa`).
- Header incluye fase actual (`bloodbath`, `day`, `night`, `finale`) y barra de tensión.
- Header muestra tamaño de la sesión actual y estado visual (`ok`, `alto`, `crítico`).
- Header incluye toggle `Guardar local` (`ON/OFF`) con warning persistente cuando está en `OFF`.
- Feed central de eventos narrativos (más reciente arriba).
- Panel lateral de estados de personajes (vida, condición, relaciones destacadas).
- Indicador visual de tensión global.
- Controles: `avance paso a paso`, `auto`, `guardar`, `compartir`.
- Filtro rápido del feed por personaje y por tipo de evento.

3. `Final`
- Ganador destacado.
- Top momentos (muertes clave, traiciones, remontadas, sorpresas).
- Tabla final con orden de eliminación.
- CTA: `Jugar de nuevo` con mismo roster o nuevo roster.
- CTA secundario: `Repetir con misma seed` y `Compartir resultado`.

## Interacciones UX clave
- Cada evento aparece con animación breve y legible (<700ms).
- Eventos multi-personaje resaltan a todos los involucrados.
- Transiciones de estado críticas (herido/eliminado/traición) con feedback visual fuerte.
- Scroll automático al evento más reciente, permitiendo retrolectura.
- Línea de tiempo con hitos para volver a turnos clave.
- Turnos en pausa no deben perder contexto visual ni posición de lectura.

## Reglas de legibilidad
- Cada evento debe responder: `quién`, `qué pasó`, `impacto`.
- Texto por evento: 1-2 líneas.
- Colores semánticos consistentes para estado y riesgo.
- Eventos sorpresa y giros deben tener tratamiento visual distintivo.
- Contraste suficiente para lectura prolongada en desktop y móvil.

## Reglas de layout desktop
- La vista principal usa contenedor centrado con `max-width` para evitar vacío lateral desproporcionado.
- Si `Setup` no está visible (simulación activa), el bloque `Feed + panel lateral` debe ocupar el ancho completo disponible.
- El `Feed narrativo` siempre conserva prioridad visual frente a `Setup` y no puede quedar cubierto por paneles laterales.
- Los controles de ritmo (`1x/2x/4x/pausa/paso`) se mantienen visibles y clicables en breakpoints desktop.
- `Participantes`, `Relaciones destacadas` y `Partidas locales` mantienen orden vertical estable dentro del panel lateral.
