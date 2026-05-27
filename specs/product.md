# Product

## Norte

Simulador web de supervivencia social: el usuario arma un roster, inicia una simulacion automatica y entiende rapido quien gana, quien cae y por que.

## Aha Moments

1. Setup claro: en menos de 30 segundos el usuario entiende que debe elegir franquicia, peliculas, roster y presionar `Iniciar`.
2. Primera partida viva: al iniciar, aparece un evento narrativo legible sin configurar nada extra.
3. Drama emergente: las relaciones, traiciones, remontadas y eliminaciones cambian el curso de la partida.
4. Continuidad obvia: al volver al lobby, una partida local se puede retomar o resumir sin explicar storage.
5. Final compartible: la partida terminada muestra ganador, momentos clave y accion `Resumen`.

## Alcance V1

- Roster inicial: 10-48 personajes.
- Ritmo default: `2x`.
- Fases: `setup`, `bloodbath`, `day`, `night`, `finale`, `finished`.
- Un evento narrativo principal por turno.
- Ganador unico garantizado.
- Continuidad local por snapshot en `localStorage`.
- Server stateless.

## Reglas Core

- RNG seedable y reproducible.
- Interaccion base de 2 personajes; eventos de 3+ son raros y ponderados.
- Tension global sube con sequia de eliminaciones y tramo final.
- Catalogo ponderado evita repeticion reciente.
- Snapshot invalido o incompatible se rechaza sin fallback.
