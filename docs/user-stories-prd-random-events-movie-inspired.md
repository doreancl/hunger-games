# User Stories - PRD Random Movie-Inspired Arena Events

### Story S-001: Expandir catálogo tipado de eventos cinematográficos

**Priority:** Critical  
**Estimated Size:** M  
**Dependencies:** Ninguna

#### User Story
As a developer,  
I want a typed catalog of movie-inspired arena events,  
So that the simulation can add variability without contract drift.

#### Context
El motor actual usa un catálogo base; se requiere ampliarlo con eventos inspirados en películas y metadata suficiente para reglas especiales.

#### Acceptance Criteria
- [ ] Existe catálogo tipado con templates de eventos cinematográficos.
- [ ] No hay strings libres para IDs/tipos fuera del catálogo.
- [ ] Los templates respetan fase(s) válidas del ciclo.
- [ ] Se mantiene compatibilidad con contratos de dominio actuales.

#### Business Rules
- IDs de templates deben ser estables.
- Cada evento debe mapear a un `EventType` válido.

#### Technical Notes
- Extender `TURN_EVENT_CATALOG`.
- Reusar `EventTemplate` o ampliarlo con metadata opcional.

#### Testing Requirements
- **Unit Tests:** validación de inclusión por fase y selección.
- **Integration Tests:** N/A.
- **Manual Testing:** avance de varios turnos y revisión de `template_id`.
- **Edge Cases:** sin templates para fase no debe ocurrir.

#### Implementation Steps
1. Definir nuevos template IDs tipados para eventos cinematográficos.
2. Incorporar templates al catálogo con pesos iniciales.
3. Ajustar helpers de selección si necesitan metadata especial.
4. Revisar coherencia con tipos/schemas.

#### Files to Create/Modify
- `lib/matches/lifecycle.ts` - catálogo y metadata.
- `lib/simulation-state.ts` - lógica de selección si aplica.
- `tests/simulation-state.test.ts` - pruebas de selección.

#### Definition of Done Checklist
- [ ] Code implemented per technical guidelines
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Acceptance criteria verified
- [ ] Documentation updated (if applicable)
- [ ] Pull Request created and merged
- [ ] Story marked complete in tracking system

#### Open Questions
- Ninguna bloqueante.

### Story S-002: Integrar disparo aleatorio de eventos de arena por turno

**Priority:** High  
**Estimated Size:** M  
**Dependencies:** S-001

#### User Story
As a player,  
I want random arena events to trigger per turn,  
So that each match feels unpredictable.

#### Context
Los eventos nuevos deben entrar al flujo normal de `advanceTurn` con pesos por fase y reglas de antirrepetición existentes.

#### Acceptance Criteria
- [ ] Los nuevos eventos se seleccionan desde catálogo tipado.
- [ ] La frecuencia respeta pesos relativos en simulaciones controladas.
- [ ] La aleatoriedad es reproducible con seed fija.

#### Business Rules
- Un evento narrativo principal por turno.
- Antirrepetición se mantiene activa.

#### Technical Notes
- Reusar `selectCatalogEvent` y `createSeededRng`.
- No romper cálculo de tensión ni transición de fases.

#### Testing Requirements
- **Unit Tests:** distribución base y determinismo.
- **Integration Tests:** avance de turnos con seed fija.
- **Manual Testing:** ejecución de partida completa.
- **Edge Cases:** roster mínimo, fase finale.

#### Implementation Steps
1. Conectar nuevos templates al flujo de selección en `advanceTurn`.
2. Ajustar ponderación por fase/perfil si es necesario.
3. Verificar transición normal de turnos y tensión.

#### Files to Create/Modify
- `lib/matches/lifecycle.ts`
- `lib/simulation-state.ts`
- `tests/lifecycle-early-pedestal.test.ts`

#### Definition of Done Checklist
- [ ] Code implemented per technical guidelines
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Acceptance criteria verified
- [ ] Pull Request created and merged
- [ ] Story marked complete in tracking system

#### Open Questions
- Ninguna bloqueante.

### Story S-003: Implementar evento Cornucopia Refill con riesgo elevado

**Priority:** High  
**Estimated Size:** M  
**Dependencies:** S-001, S-002

#### User Story
As a player,  
I want Cornucopia refill events to attract tributes into conflict,  
So that late or mid-game tension spikes feel cinematic.

#### Context
Este evento debe combinar anuncio narrativo y efecto de mayor riesgo de confrontación/eliminación.

#### Acceptance Criteria
- [ ] Existe template específico de Cornucopia refill.
- [ ] El evento se activa bajo condiciones configurables.
- [ ] La narrativa refleja anuncio + atracción de tributos.
- [ ] El riesgo de confrontación aumenta cuando se activa.

#### Business Rules
- Cornucopia refill no debe disparar en todos los turnos.
- Debe ser coherente con fase/estado de vivos.

#### Technical Notes
- Resolver activación por helper explícito.
- Incrementar probabilidad letal en contexto de refill.

#### Testing Requirements
- **Unit Tests:** activación condicional y efecto de riesgo.
- **Integration Tests:** aparición en flujo de turnos.
- **Manual Testing:** inspección de narrativa y eliminaciones.
- **Edge Cases:** pocos vivos, fase finale.

#### Implementation Steps
1. Agregar template y regla de activación Cornucopia.
2. Implementar ajuste de riesgo cuando el evento está activo.
3. Generar narrativa específica.
4. Cubrir con tests deterministas.

#### Files to Create/Modify
- `lib/matches/lifecycle.ts`
- `tests/matches-lifecycle-routes.test.ts`
- `tests/simulation-state.test.ts`

#### Definition of Done Checklist
- [ ] Code implemented per technical guidelines
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Acceptance criteria verified
- [ ] Pull Request created and merged
- [ ] Story marked complete in tracking system

#### Open Questions
- Definir umbral final de activación por turno/vivos.

### Story S-004: Implementar intento de escape del arena con muerte automática

**Priority:** Critical  
**Estimated Size:** S  
**Dependencies:** S-001, S-002

#### User Story
As a player,  
I want escape-attempt violations to kill tributes automatically,  
So that arena boundary rules feel strict and canon-consistent.

#### Context
Debe existir evento explícito donde un tributo intenta escapar y es eliminado automáticamente por reglas del arena.

#### Acceptance Criteria
- [ ] Existe template de intento de escape.
- [ ] El personaje afectado queda eliminado automáticamente.
- [ ] La narrativa expresa transgresión del límite y muerte.
- [ ] El evento aparece en avance de turno sin romper contrato.

#### Business Rules
- Escape implica `status=eliminated` y `current_health=0`.
- Debe quedar trazable en `recent_events`.

#### Technical Notes
- Reusar camino de eliminación actual.
- Asegurar determinismo en selección del participante afectado.

#### Testing Requirements
- **Unit Tests:** muerte automática y narrativa.
- **Integration Tests:** response payload válido tras evento.
- **Manual Testing:** revisar feed de evento.
- **Edge Cases:** sólo 2 vivos, transición a final.

#### Implementation Steps
1. Crear template de escape y condición de disparo.
2. Forzar eliminación del participante seleccionado.
3. Añadir narrativa específica del evento.
4. Agregar pruebas unitarias y de ruta.

#### Files to Create/Modify
- `lib/matches/lifecycle.ts`
- `tests/lifecycle-early-pedestal.test.ts`
- `tests/matches-route.test.ts`

#### Definition of Done Checklist
- [ ] Code implemented per technical guidelines
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Acceptance criteria verified
- [ ] Pull Request created and merged
- [ ] Story marked complete in tracking system

#### Open Questions
- Ninguna bloqueante.

### Story S-005: Garantizar contratos y pruebas para aleatoriedad controlada

**Priority:** Critical  
**Estimated Size:** M  
**Dependencies:** S-001, S-002, S-003, S-004

#### User Story
As a developer,  
I want deterministic and contract-safe tests for new events,  
So that feature delivery is stable and regression-resistant.

#### Context
La feature requiere reforzar cobertura en dominio y rutas para garantizar estabilidad de schemas y respuestas.

#### Acceptance Criteria
- [ ] Pruebas unitarias cubren selección e impacto de nuevos eventos.
- [ ] Pruebas de contrato validan endpoints sin regresión.
- [ ] `pnpm run test:unit` y `pnpm run test:coverage` pasan.

#### Business Rules
- Cobertura mínima del proyecto se mantiene.
- Los errores API conservan shape actual.

#### Technical Notes
- Extender suites existentes en `tests/`.
- Evitar tests frágiles con seeds y asserts por invariantes.

#### Testing Requirements
- **Unit Tests:** `lifecycle`, `simulation-state`.
- **Integration Tests:** rutas de matches/advance.
- **Manual Testing:** smoke en UI opcional.
- **Edge Cases:** snapshots inválidos + eventos especiales.

#### Implementation Steps
1. Añadir tests unitarios de cada evento especial.
2. Añadir/ajustar tests de contrato de rutas.
3. Ejecutar coverage y corregir huecos.

#### Files to Create/Modify
- `tests/simulation-state.test.ts`
- `tests/lifecycle-early-pedestal.test.ts`
- `tests/domain-contracts.test.ts`
- `tests/matches-lifecycle-routes.test.ts`

#### Definition of Done Checklist
- [ ] Code implemented per technical guidelines
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Acceptance criteria verified
- [ ] Pull Request created and merged
- [ ] Story marked complete in tracking system

#### Open Questions
- Ninguna bloqueante.

## Story Summary
- Total stories: 5
- Secuencia recomendada: S-001 -> S-002 -> (S-003 + S-004) -> S-005
- Plan de ejecución: primero base de catálogo/selección, luego eventos especiales, finalmente hardening de contratos y cobertura.

