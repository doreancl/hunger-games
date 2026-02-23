# Issue #42 - Agregar lugares del mapa y mencionarlos en los eventos

## Estado
- Issue: #42
- Tipo: Feature
- Prioridad: p2
- Ownership actual: review-spec
- Next handoff: implementation

## Contexto
Actualmente los eventos del simulador no incluyen ubicación explícita, lo que reduce trazabilidad y calidad narrativa. Se requiere incorporar un catálogo tipado de lugares y propagarlo en todos los eventos y contratos.

## Objetivo
Introducir un sistema tipado de `location` para que cada evento generado tenga ubicación válida del mapa y narrativa contextualizada con ese lugar.

## Alcance
- Definir catálogo tipado de lugares en dominio.
- Incluir `location` en todos los eventos generados.
- Ajustar narrativa para mencionar ubicación de forma natural.
- Actualizar schemas/tipos/contratos para validar el nuevo campo.
- Mantener coherencia de errores tipados en límites API.

## Fuera de alcance
- Sistema de navegación/pathfinding completo entre lugares.
- Diseño visual de mapa interactivo.
- Balance avanzado por biome/clima (se deja parametrizable para iteraciones futuras).

## Diseño propuesto

### 1) Catálogo tipado de lugares
Agregar enum/unión tipada canónica (dominio + schema):
- `cornucopia`
- `forest`
- `river`
- `lake`
- `meadow`
- `caves`
- `ruins`
- `cliffs`

Definir etiqueta legible para narrativa desde mapeo controlado (`location -> displayName`).

### 2) Contrato de evento con `location`
- Extender estructura de evento para requerir `location` tipado.
- El generador de eventos debe asignar ubicación válida en todos los paths (incluyendo eventos especiales).
- Prohibir strings libres fuera del catálogo.

### 3) Integración con motor
- Resolver ubicación antes de construir narrativa final del evento.
- Cuando aplique interacción entre múltiples tributos, usar una única ubicación del evento o una regla explícita de resolución para colisión.
- Mantener consistencia en eventos encadenados del mismo turno.

### 4) Narrativa contextualizada
- Plantillas de texto deben interpolar lugar en español natural.
- La narrativa no debe omitir `location` cuando exista evento.

### 5) Compatibilidad y contratos
- Actualizar validaciones en `lib/domain/schemas.ts` y tipos en `lib/domain/types.ts`.
- Actualizar `tests/domain-contracts.test.ts` para exigir `location`.
- Mantener shape de errores API (`error.code`, `error.message`, `details`).

## Criterios de aceptación verificables
1. Todos los eventos incluyen `location` válido.
2. `location` pertenece al catálogo tipado (sin strings libres).
3. La narrativa de cada evento menciona el lugar asociado.
4. Se actualizan y pasan pruebas de unidad y contratos, incluyendo `tests/domain-contracts.test.ts`.
5. Pasan `pnpm run test:unit` y `pnpm run test:coverage`.

## Estrategia de testing
- Unit tests del selector/asignador de `location` por tipo de evento.
- Tests de integración para verificar presencia consistente de `location` en turnos completos.
- Tests narrativos para garantizar mención del lugar en templates.
- Tests de contratos para validar campo requerido y enum permitido.

## Versionado propuesto para implementación
- Recomendación SemVer: **minor**.
- Propuesta: `0.2.0`.
- Justificación: nuevo dato funcional en eventos (`location`) y expansión de capacidades sin remover contratos existentes.

## Evidencia mínima esperada en PR de implementación
- Tipos/schemas de `location` incorporados en dominio.
- Generación de `location` en todos los eventos.
- Narrativa con lugar en templates relevantes.
- Pruebas unitarias + contratos actualizadas y en verde.

## Checklist de handoff a implementación
- [ ] Definir catálogo tipado de lugares en dominio.
- [ ] Extender evento para incluir `location` obligatorio.
- [ ] Asignar `location` en todos los flujos de generación de eventos.
- [ ] Ajustar narrativa para mencionar lugar.
- [ ] Actualizar `tests/domain-contracts.test.ts` y tests unitarios/integración.
- [ ] Ejecutar `pnpm run test:unit` y `pnpm run test:coverage`.
