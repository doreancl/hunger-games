# Layer 1 - Functional/Business

## Objetivo
Crear un simulador web de supervivencia social tipo battle royale narrativo, donde el jugador arma el roster y observa una simulación emergente emocionante hasta coronar un ganador.

## Alcance V1
- Simulación automática turno a turno (sin decisiones tácticas durante la partida).
- Foco en narrativa emergente, tensión progresiva y alta rejugabilidad.

## Usuario objetivo
- Jugador casual que disfruta drama emergente, sorpresas y decisiones de roster.
- Sesiones cortas (5-15 min) con alta rejugabilidad.

## Flujo principal
1. Seleccionar personajes participantes.
2. Presionar `Iniciar` para bloquear roster y arrancar simulación.
3. Ver eventos turno a turno con interacciones entre personajes hasta fin de partida.

## Reglas funcionales del juego

### Estructura de partida
- Inicio con roster de N personajes (10-48, default 24).
- Fases: `setup` -> `bloodbath` -> ciclos `day/night` -> `finale`.
- Cada turno/fase genera 1 evento narrativo principal.
- Fin cuando queda 1 personaje vivo.

### Reglas de interacción por cantidad de personajes
- Interacción base: 2 personajes.
- Para `k >= 3`, probabilidad: `P(k) = 1% * (0.5)^(k-3)`.
- `k` máximo por evento: `min(6, vivos actuales)`.
- La probabilidad restante se asigna a eventos de 2 personajes.

### Reglas de emoción, tensión y sorpresa
- Relaciones dinámicas por par: `neutral`, `alliance`, `rivalry`, `betrayal`.
- Memoria de eventos: un evento modifica afinidad/confianza/rivalidad futuras.
- Director de tensión global (0-100):
  - Sube cuando no hay eliminaciones seguidas.
  - En tensión alta suben eventos letales y traiciones.
  - En tramo final (`<= 6 vivos`) sube la frecuencia de eventos críticos.
- Eventos sorpresa globales (1-3% por turno): arena, clima extremo, escasez.
- Catálogo de eventos ponderado:
  - Cada plantilla tiene peso configurable.
  - Plantillas recientes bajan peso temporal para evitar repetición.
- Regla de remontada: personajes en desventaja tienen pequeña probabilidad de giro favorable.
- Regla anti-dominancia: personajes con racha alta reciben mayor probabilidad de ser objetivo.

### Estados de personaje
- Vivo, herido, eliminado.
- Atributos mínimos: salud, agresividad, astucia, carisma, suerte.

### Configuración de partida
- Seed opcional (manual o aleatoria).
- Velocidad de simulación (`1x`, `2x`, `4x`, `pausa`, paso a paso).
- Ajustes avanzados: perfil de pesos de eventos y nivel de sorpresa.

### Salidas visibles al jugador
- Feed narrativo cronológico por turnos.
- Contador de vivos/eliminados.
- Estado actualizado de cada personaje.
- Pantalla final con ganador y resumen de momentos clave.
- Código/link compartible de partida.
- Re-simulación con mismo roster y misma o nueva seed.

## Criterios de aceptación
- El usuario puede iniciar partida con 10-48 personajes.
- La simulación avanza automáticamente por turnos con eventos legibles.
- Se respetan probabilidades de interacciones de 3+ personajes.
- Las relaciones cambian y afectan eventos posteriores.
- La partida siempre termina con un único ganador.
- El jugador percibe variedad entre partidas con mismo roster.
- El jugador puede guardar/cargar/reanudar por código o enlace.
- Repetir con misma seed reproduce el mismo resultado en la misma versión de reglas.
