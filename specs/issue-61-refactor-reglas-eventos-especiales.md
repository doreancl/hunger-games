# Issue #61 - Refactor high-priority: aislar reglas de eventos especiales y pruebas determinísticas del motor

## Estado
- Issue: #61
- Tipo: Refactor interno sin cambios de contrato externo
- Prioridad: high (contexto del issue)
- Ownership actual: review-spec
- Next handoff: implementation

## Contexto
`advanceTurn` concentra orquestación, aplicación de reglas especiales, consumo de RNG y construcción narrativa en un mismo flujo. Esto dificulta mantener reglas de dominio, aumenta el costo de cambios y vuelve frágiles los tests probabilísticos por dependencia de búsqueda de seeds.

## Objetivo
Separar responsabilidades del motor para que:
1. Las reglas de eventos especiales sean puras y testeables en aislamiento.
2. La aleatoriedad de puntos críticos sea controlable para tests determinísticos.
3. La narrativa quede desacoplada de la aplicación de efectos.
4. No se rompan contratos API existentes.

## Alcance
- Refactor de la lógica interna del motor de turnos asociada a eventos especiales.
- Extracción de constantes/reglas a módulo de configuración de dominio versionable.
- Introducción/estandarización de control de RNG inyectable en resolución de eventos especiales.
- Reorganización de tests para validar outcomes por control de rolls.

## Fuera de alcance
- Nuevos eventos de producto o cambios funcionales de gameplay.
- Cambios de shape en request/response de endpoints públicos.
- Reescritura total del motor; solo separación de responsabilidades del flujo actual.

## Diseño propuesto

### 1) Orquestación de `advanceTurn`
`advanceTurn` debe quedar como coordinador:
- Preparar contexto del turno.
- Delegar resolución de eventos especiales a funciones puras.
- Delegar narrativa a builder/formatter dedicado.
- Consolidar estado final y logs estructurados.

### 2) Módulo de reglas de dominio
Crear/usar módulo dedicado de reglas/eventos especiales con:
- Constantes de probabilidades, thresholds, template ids y toggles.
- Tipos explícitos para configuración.
- Defaults versionados y punto único de lectura.

### 3) Resolver de eventos especiales (puro)
La resolución de eventos especiales debe:
- Recibir snapshot mínimo + dependencias explícitas (incluyendo RNG).
- Devolver resultado estructurado (efectos de estado + metadata de evento).
- No emitir narrativa ni mutar estado global fuera de su retorno.

### 4) Narrativa desacoplada
La narrativa debe construirse desde el resultado del resolver:
- Entrada: metadata de evento + estado relevante post-resolución.
- Salida: mensajes/lista de narrativas deterministas dado mismo input.

### 5) Estrategia de tests determinísticos
- Evitar tests que dependen de búsqueda de seeds para cubrir ramas.
- Inyectar secuencias de rolls/valores RNG controlados.
- Validar por tabla de casos (inputs/rolls -> outcome esperado).

## Criterios de aceptación verificables
1. Complejidad y responsabilidad:
- `advanceTurn` no contiene ramas de negocio detalladas de eventos especiales; estas están delegadas.
- Existe al menos un resolver puro dedicado a eventos especiales.

2. Reglas desacopladas:
- Probabilidades, thresholds y template ids de eventos especiales no están hardcodeados en el cuerpo de `advanceTurn`.
- Existe módulo de configuración/reglas de dominio referenciado por el motor.

3. Determinismo de pruebas:
- Tests de eventos especiales cubren rutas principales sin búsqueda brute-force de seeds.
- Los casos probabilísticos se prueban con RNG controlado/inyección explícita.

4. Narrativa separada:
- La construcción de narrativa se invoca como paso posterior a la resolución de efectos.
- El resolver puro puede ejecutarse en test sin requerir assertions de texto narrativo.

5. Compatibilidad externa:
- No hay cambios en contratos públicos API (shape de payloads/responses esperadas).
- Suite de contratos existente permanece en verde.

## Evidencia mínima esperada en PR de implementación
- Diff con módulo(s) nuevos de reglas/resolvers.
- Tests unitarios del resolver puro y tests de integración del turno ajustados.
- Nota breve de compatibilidad indicando que no hubo breaking changes de API.

## Riesgos y mitigaciones
- Riesgo: regresiones por mover lógica acoplada.
- Mitigación: snapshot tests/tabla de casos sobre escenarios clave y validación de contratos.

- Riesgo: falsa sensación de determinismo si RNG queda parcialmente acoplado.
- Mitigación: interfaz RNG única para puntos críticos y tests que fallen si no se usa.

## Checklist de handoff a implementación
- [ ] Extraer resolver puro de eventos especiales.
- [ ] Centralizar reglas en módulo de dominio.
- [ ] Inyectar/controlar RNG en flujo crítico.
- [ ] Separar construcción narrativa de efectos.
- [ ] Reescribir tests probabilísticos a estrategia determinística.
- [ ] Ejecutar `pnpm run test:unit` y `pnpm run test:coverage`.
- [ ] Confirmar sin cambios de contrato API.
