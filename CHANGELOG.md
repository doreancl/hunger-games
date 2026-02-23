# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-02-23

### Added

- Add typed event locations (`cornucopia`, `forest`, `river`, `lake`, `meadow`, `caves`, `ruins`, `cliffs`) to domain contracts.
- Include `location` in turn events and match state events, and enforce it in Zod schemas.
- Extend event narratives to mention the resolved event location, including special pedestal events.
- Expand movie-inspired arena event catalog with typed templates for mines, fire waves, toxic fog, muttation hunts, storms, rockslides, sponsor packs, traps, route clashes, risky shelters, Cornucopia refill, and arena escape attempts.
- Add configurable domain rules for Cornucopia refill activation and elimination-risk boost.
- Add deterministic tests for movie-event catalog gating, Cornucopia refill, and arena-escape automatic elimination narratives.
 
### Changed

- Update turn lifecycle to use contextual weighted catalogs and special-event elimination policy (`allow_default_elimination` + `elimination_chance_floor`).
- Extend special-event resolution to support Cornucopia refill and arena escape events while preserving deterministic RNG behavior.
- Make event location deterministic per seeded RNG flow and pin early-pedestal special event to Cornucopia.
- Update lifecycle and contract tests to validate required `location` propagation and schema compatibility.

## [0.1.2] - 2026-02-23

### Fixed

- Refactor `advanceTurn` to delegate special event resolution and narrative generation to dedicated modules.
- Centralize early-pedestal special-event rules in `lib/domain/rules.ts` as versioned domain config.
- Replace seed brute-force tests with deterministic unit tests driven by controlled RNG rolls.

## [0.1.1] - 2026-02-23

### Fixed

- Use the resolved event phase (`event.phase`) in feed/timeline labeling so the first advance can render as `Turno 1 · Bloodbath` when applicable.
- Keep `cycle_phase` as the post-advance global phase while exposing event-phase context for UI correctness.
- Add regression coverage in API contract and lifecycle tests for first-turn phase labeling.
