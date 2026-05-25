# Product

## Objetivo

Crear un simulador web de supervivencia social tipo battle royale narrativo, donde el jugador arma el roster y observa una simulacion emergente hasta coronar un ganador.

## Alcance V1

- Simulacion automatica turno a turno, sin decisiones tacticas durante la partida.
- Sesiones cortas de 5-15 minutos.
- Alta rejugabilidad por seed, roster, relaciones y eventos ponderados.
- Continuidad local en el mismo navegador/dispositivo usando snapshot completo en `localStorage`.
- Server stateless: la recuperacion no depende de memoria compartida, DB ni filesystem.

## Flujo principal

1. Seleccionar personajes participantes.
2. Configurar seed, ritmo y opciones avanzadas.
3. Iniciar partida para bloquear roster y arrancar simulacion.
4. Ver eventos turno a turno hasta que quede un ganador.
5. Rehidratar desde snapshot local al recargar.

## Reglas de partida

- Roster inicial: 10-48 personajes, default 24.
- Fases: `setup` -> `bloodbath` -> ciclos `day/night` -> `finale`.
- Cada turno genera 1 evento narrativo principal.
- La partida termina cuando queda 1 personaje vivo.
- Estados de personaje: `alive`, `injured`, `eliminated`.
- Atributos base: `health`, `aggression`, `cunning`, `charisma`, `luck`.

## Interacciones

- Interaccion base: 2 personajes.
- Para `k >= 3`, probabilidad: `P(k) = 1% * (0.5)^(k-3)`.
- `k` maximo por evento: `min(6, vivos actuales)`.
- La probabilidad restante se asigna a eventos de 2 personajes.

## Drama y variedad

- Relaciones dinamicas por par: `neutral`, `alliance`, `rivalry`, `betrayal`.
- La memoria de eventos modifica afinidad, confianza y rivalidad futuras.
- Tension global 0-100:
  - Sube cuando no hay eliminaciones seguidas.
  - En tension alta suben eventos letales y traiciones.
  - En tramo final (`<= 6 vivos`) sube la frecuencia de eventos criticos.
- Eventos sorpresa globales: 1-3% por turno.
- Catalogo de eventos ponderado con penalizacion temporal a plantillas recientes.
- Regla de remontada: personajes en desventaja tienen pequena probabilidad de giro favorable.
- Regla anti-dominancia: personajes con racha alta tienen mayor probabilidad de ser objetivo.

## Continuidad local

- El snapshot completo del cliente es la fuente de continuidad.
- Autosave en cada turno/evento cuando `Guardar local` esta `ON`.
- Al recargar, el cliente envia el ultimo snapshot local al server para continuar.
- La continuidad solo aplica al mismo navegador/dispositivo.
- No se garantiza compatibilidad entre versiones.
- Snapshot corrupto o incompatible: mostrar `partida no recuperable` y permitir iniciar nueva partida.
- Export de recuperacion: descargar snapshot como `JSON`.
- Entrada al juego: abrir la ultima partida disponible.
- Múltiples partidas locales: guardar por identificador unico.

## Criterios de aceptacion

- El usuario puede iniciar partida con 10-48 personajes.
- La simulacion avanza automaticamente con eventos legibles.
- Se respetan probabilidades de interacciones de 3+ personajes.
- Las relaciones cambian y afectan eventos posteriores.
- La partida siempre termina con un unico ganador.
- La reanudacion conserva settings y estado RNG.
- Si `Guardar local` esta `OFF`, la UI advierte perdida de continuidad.
- Si el estado local esta corrupto o es incompatible, se rechaza sin fallback.
