# Issue #78 - Catalogo de franquicias con anti-duplicado y UX de estado vacio

## Estado
- Issue: #78
- Tipo: Feature funcional con ajuste de dominio liviano
- Prioridad: P1
- Ownership actual: review-spec
- Next handoff: implementation

## Contexto
Se requiere habilitar seleccion de roster basada en franquicias (pelicula/personaje) sin introducir duplicados ni ambiguedad para el usuario.

Riesgo principal identificado en triage:
- Ambiguedad pelicula/personaje (mismo nombre de personaje en peliculas distintas o misma franquicia con multiples entregas).

Condicion de entrega del triage:
- Contrato interno `FranchiseCatalog` cerrado.
- Reglas anti-duplicado cerradas.
- UX definida para estado vacio del catalogo.
- Compatibilidad con snapshots actuales de `localStorage`.
- Matriz minima de pruebas para no-regresion.

## Objetivo
Introducir seleccion de roster por catalogo de franquicias con identidad canonica por personaje, evitando duplicados ambiguos y manteniendo continuidad con datos locales ya guardados.

## Decisiones cerradas
1. **Contrato interno obligatorio**: toda fuente de personajes se normaliza a `FranchiseCatalog` antes de llegar a UI.
2. **Identidad canonica**: un personaje se identifica por `character_key` (global) y siempre declara `franchise_id`; `movie_id` es obligatorio para desambiguacion visual, no para identidad.
3. **Regla anti-duplicado principal**: el roster no permite repetir `character_key`.
4. **Regla anti-duplicado de ingestion**: si el catalogo trae entradas repetidas con mismo `character_key`, se conserva la primera y se registran colisiones en diagnostico.
5. **Ambiguedad visible**: si dos personajes comparten `display_name`, la UI muestra etiqueta extendida `display_name · movie_title`.
6. **Persistencia sin ruptura**: `roster_character_ids` en `localStorage` se mantiene como `string[]`; no cambia key/version de snapshots existentes.
7. **Compatibilidad legacy**: ids historicos no presentes en catalogo siguen cargando como seleccion valida y se renderizan con fallback (`character_id` crudo).
8. **Estado vacio bloqueante**: si el catalogo normalizado no tiene personajes seleccionables, se deshabilita iniciar partida y se muestra estado vacio con accion de reintento.

## Contrato interno `FranchiseCatalog` (v1)
```ts
export type FranchiseCatalog = {
  version: 1;
  franchises: FranchiseEntry[];
  characters: FranchiseCharacter[];
};

export type FranchiseEntry = {
  franchise_id: string;
  franchise_name: string;
};

export type FranchiseCharacter = {
  character_key: string;      // identidad canonica global, usado en roster_character_ids
  display_name: string;       // nombre principal visible
  franchise_id: string;       // referencia a FranchiseEntry
  movie_id: string;           // obligatorio para desambiguacion
  movie_title: string;        // obligatorio para etiqueta UX
  aliases?: string[];         // opcional para busqueda
};
```

Reglas de validez del contrato:
- `version` debe ser `1`.
- `franchise_id` debe existir en `franchises`.
- `character_key` unico global en `characters`.
- `display_name`, `movie_id`, `movie_title` no vacios.

## Alcance
- Nuevo modulo de dominio liviano para contrato/normalizacion de `FranchiseCatalog`.
- Integracion en setup frontend para renderizar opciones de personaje desde catalogo normalizado.
- Aplicacion de reglas anti-duplicado en seleccion y validacion local.
- UX de estado vacio cuando no hay personajes disponibles.
- Compatibilidad con `localStorage` existente en carga/edicion de setups.
- Pruebas unitarias y de contratos minimas para cubrir rutas criticas.

## Fuera de alcance
- Cambios de contratos API de backend (`/api/matches`).
- Migracion masiva de snapshots viejos a nuevo formato persistido.
- Buscador avanzado/filtros complejos por franquicia fuera de la vista actual.
- Resolucion semantica de variantes de un mismo personaje (skins, edades, timelines).

## Diseno propuesto

### 1) Dominio liviano
- Crear `lib/domain/franchise-catalog.ts` con:
  - Tipos `FranchiseCatalog`, `FranchiseEntry`, `FranchiseCharacter`.
  - `normalizeFranchiseCatalog(input)` con salida `{ catalog, diagnostics }`.
  - `buildCharacterLabel(character, hasNameCollision)` para resolver ambiguedad visual.
- Crear schema zod en `lib/domain/schemas.ts` para validar contrato v1.

### 2) Reglas anti-duplicado
- En normalizacion:
  - Deduplicar `characters` por `character_key`.
  - Reportar `duplicate_character_key_count` en `diagnostics`.
- En setup:
  - `toggleCharacter` no agrega ids repetidos.
  - `getSetupValidation` agrega issue si detecta duplicados en `roster_character_ids`.
  - Mensaje de issue obligatorio: `No puedes repetir personajes en el roster.`

### 3) UX estado vacio
Condicion de activacion:
- `catalog.characters.length === 0` luego de normalizar.

Comportamiento:
- Mostrar bloque vacio en area de roster con texto: `No hay personajes disponibles en el catalogo.`
- Mostrar accion `Reintentar carga`.
- Deshabilitar `Iniciar simulacion`.
- Mantener accesibles controles no destructivos (`Volver al Lobby`, `Nuevo setup`).

### 4) Compatibilidad `localStorage`
- `LOCAL_MATCHES_STORAGE_KEY` y `LOCAL_MATCHES_SNAPSHOT_VERSION` permanecen sin cambios.
- `roster_character_ids` sigue siendo `string[]` con ids canonicos o legacy.
- `characterName()` retorna:
  1. `display_name` desde catalogo si existe id.
  2. `character_id` crudo como fallback legacy.
- Carga de matches previos no debe fallar por ids inexistentes en catalogo actual.

## Matriz minima de tests
1. **Contrato dominio** (`tests/domain-contracts.test.ts` o nuevo `tests/franchise-catalog.test.ts`):
- Acepta catalogo v1 valido.
- Rechaza `character_key` duplicado.
- Rechaza personaje con `franchise_id` inexistente.

2. **Normalizacion anti-duplicado** (`tests/franchise-catalog.test.ts`):
- Deduplica entradas repetidas por `character_key` conservando primera ocurrencia.
- Emite diagnostico de colisiones.

3. **Validacion setup** (`tests/local-matches.test.ts`):
- Falla cuando `roster_character_ids` contiene ids repetidos.
- Mantiene reglas existentes de min/max roster.

4. **Compatibilidad legacy localStorage** (`tests/local-matches.test.ts` o `tests/match-ux.test.ts`):
- Parsea snapshot v1 con ids antiguos no presentes en catalogo.
- Render/fallback de nombre usa id crudo sin romper flujo.

5. **UX estado vacio** (`tests/match-ux.test.ts` o test de helper extraido):
- Cuando catalogo esta vacio, `canStart` es `false` y mensaje vacio coincide con spec.

## Criterios de aceptacion verificables
1. Existe contrato `FranchiseCatalog` v1 tipado y validado por schema.
2. El roster no permite personajes duplicados por `character_key`.
3. Personajes con mismo `display_name` se muestran desambiguados con `movie_title`.
4. Con catalogo vacio, UI bloquea inicio y muestra estado vacio con reintento.
5. Snapshots existentes en `localStorage` siguen cargando sin romper por ids legacy.
6. La suite minima de pruebas de esta spec queda en verde.

## Evidencia minima esperada en PR
- Diff en `lib/domain/*` con contrato + normalizacion + schema.
- Diff en `app/matches/new/page.tsx` aplicando catalogo, anti-duplicado y estado vacio.
- Tests nuevos/ajustados en `tests/` cubriendo matriz minima.
- Resultado de `pnpm run test:unit` incluido en descripcion del PR.

## Checklist de handoff a implementacion
- [ ] Definir tipos `FranchiseCatalog` v1 en dominio.
- [ ] Agregar validacion zod del catalogo y referencias internas.
- [ ] Implementar normalizacion con diagnostico de duplicados.
- [ ] Integrar catalogo en setup frontend y desambiguacion visual pelicula/personaje.
- [ ] Bloquear inicio y mostrar UX de estado vacio cuando no haya personajes.
- [ ] Forzar regla anti-duplicado en seleccion + validacion de setup.
- [ ] Mantener compatibilidad de snapshots `localStorage` sin bump de version.
- [ ] Cubrir matriz minima de tests definida en esta spec.
- [ ] Ejecutar `pnpm run test:unit`.
