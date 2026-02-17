import { describe, expect, it } from 'vitest';
import {
  advanceDirector,
  canResumeFromLocalStorage,
  createSeededRng,
  nextCyclePhase,
  nextTensionLevel,
  nextTurn,
  sampleParticipantCount,
  selectCatalogEvent
} from '@/lib/simulation-state';
import type { DirectorState, EventTemplate } from '@/lib/simulation-state';

describe('nextTurn', () => {
  it('increments turn when match is active', () => {
    const result = nextTurn({ id: 'm1', turn: 2, active: true });

    expect(result.turn).toBe(3);
    expect(result.id).toBe('m1');
    expect(result.active).toBe(true);
  });

  it('returns same state when match is not active', () => {
    const state = { id: 'm1', turn: 2, active: false };
    const result = nextTurn(state);

    expect(result).toEqual(state);
  });
});

describe('canResumeFromLocalStorage', () => {
  it('returns false for null', () => {
    expect(canResumeFromLocalStorage(null)).toBe(false);
  });

  it('returns false for invalid json', () => {
    expect(canResumeFromLocalStorage('{bad-json')).toBe(false);
  });

  it('returns false for incomplete state', () => {
    expect(canResumeFromLocalStorage(JSON.stringify({ id: 'm1', turn: 1 }))).toBe(false);
  });

  it('returns true for valid serialized state', () => {
    expect(
      canResumeFromLocalStorage(
        JSON.stringify({ id: 'm1', turn: 1, active: true })
      )
    ).toBe(true);
  });
});

describe('seeded RNG reproducibility', () => {
  it('creates same sequence for the same seed', () => {
    const runSequence = (seed: string | null | undefined) => {
      const rng = createSeededRng(seed);
      return Array.from({ length: 12 }, () => Number(rng().toFixed(8)));
    };

    expect(runSequence('seed-123')).toEqual(runSequence('seed-123'));
    expect(runSequence('seed-123')).not.toEqual(runSequence('seed-456'));
  });

  it('sanitizes empty and null seeds into a deterministic fallback', () => {
    const runSequence = (seed: string | null | undefined) => {
      const rng = createSeededRng(seed);
      return Array.from({ length: 8 }, () => Number(rng().toFixed(8)));
    };

    expect(runSequence('')).toEqual(runSequence('   '));
    expect(runSequence('')).toEqual(runSequence(null));
    expect(runSequence('')).toEqual(runSequence(undefined));
    expect(runSequence('')).not.toEqual(runSequence('seed-123'));
  });

  it('keeps full simulation flow reproducible for the same seed', () => {
    const catalog: EventTemplate[] = [
      { id: 'combat-1', type: 'combat', base_weight: 10, phases: ['bloodbath', 'day', 'night'] },
      { id: 'resource-1', type: 'resource', base_weight: 8, phases: ['bloodbath', 'day', 'night'] },
      { id: 'hazard-1', type: 'hazard', base_weight: 6, phases: ['bloodbath', 'day', 'night'] }
    ];

    const runSimulation = (seed: string) => {
      const rng = createSeededRng(seed);
      const selectedIds: string[] = [];
      let director: DirectorState = {
        turn_number: 0,
        cycle_phase: 'bloodbath',
        alive_count: 24,
        tension_level: 20
      };
      const trace: string[] = [];

      for (let turn = 0; turn < 20; turn += 1) {
        const participantCount = sampleParticipantCount(director.alive_count, rng);
        const selected = selectCatalogEvent(
          catalog,
          director.cycle_phase,
          selectedIds.slice(-4),
          rng,
          2
        );
        selectedIds.push(selected.id);

        const hadElimination = rng() < 0.25;
        const nextAliveCount = Math.max(1, director.alive_count - (hadElimination ? 1 : 0));
        director = advanceDirector(director, hadElimination, nextAliveCount);

        trace.push(
          `${participantCount}|${selected.id}|${director.turn_number}|${director.cycle_phase}|${director.tension_level}|${director.alive_count}`
        );
      }

      return trace;
    };

    expect(runSimulation('seeded-flow')).toEqual(runSimulation('seeded-flow'));
    expect(runSimulation('seeded-flow')).not.toEqual(runSimulation('seeded-flow-2'));
  });
});

describe('director phases and tension', () => {
  it('keeps bloodbath at turn 0 and enters finale with <=2 alive', () => {
    expect(nextCyclePhase(0, 24)).toBe('bloodbath');
    expect(nextCyclePhase(0, 2)).toBe('bloodbath');
    expect(nextCyclePhase(7, 2)).toBe('finale');
  });

  it('starts bloodbath and alternates day/night before finale', () => {
    const state1 = advanceDirector(
      { turn_number: 0, cycle_phase: 'bloodbath', alive_count: 24, tension_level: 10 },
      false,
      24
    );
    const state2 = advanceDirector(state1, false, 23);
    const state3 = advanceDirector(state2, true, 2);

    expect(state1.cycle_phase).toBe('day');
    expect(state2.cycle_phase).toBe('night');
    expect(state3.cycle_phase).toBe('finale');
  });

  it('raises tension when there is no elimination and lowers it otherwise', () => {
    const calmState = advanceDirector(
      { turn_number: 2, cycle_phase: 'night', alive_count: 12, tension_level: 40 },
      false,
      12
    );
    const lethalState = advanceDirector(
      { turn_number: 2, cycle_phase: 'night', alive_count: 12, tension_level: 40 },
      true,
      11
    );

    expect(calmState.tension_level).toBeGreaterThan(40);
    expect(lethalState.tension_level).toBeLessThan(40);
  });

  it('clamps tension level within [0, 100]', () => {
    expect(nextTensionLevel(99, false, 24)).toBe(100);
    expect(nextTensionLevel(3, true, 24)).toBe(0);
  });
});

describe('multi-participant distribution', () => {
  it('matches target probabilities for k>=3 within 10% deviation', () => {
    const rng = createSeededRng('stats');
    const samples = 500000;
    const counts = { k2: 0, k3: 0, k4: 0, k5: 0, k6: 0 };

    for (let index = 0; index < samples; index += 1) {
      const k = sampleParticipantCount(24, rng);
      if (k === 2) counts.k2 += 1;
      if (k === 3) counts.k3 += 1;
      if (k === 4) counts.k4 += 1;
      if (k === 5) counts.k5 += 1;
      if (k === 6) counts.k6 += 1;
    }

    const toRatio = (value: number) => value / samples;
    const expected = { k3: 0.01, k4: 0.005, k5: 0.0025, k6: 0.00125 };

    expect(toRatio(counts.k3)).toBeGreaterThan(expected.k3 * 0.9);
    expect(toRatio(counts.k3)).toBeLessThan(expected.k3 * 1.1);
    expect(toRatio(counts.k4)).toBeGreaterThan(expected.k4 * 0.9);
    expect(toRatio(counts.k4)).toBeLessThan(expected.k4 * 1.1);
    expect(toRatio(counts.k5)).toBeGreaterThan(expected.k5 * 0.9);
    expect(toRatio(counts.k5)).toBeLessThan(expected.k5 * 1.1);
    expect(toRatio(counts.k6)).toBeGreaterThan(expected.k6 * 0.9);
    expect(toRatio(counts.k6)).toBeLessThan(expected.k6 * 1.1);
  });

  it('respects alive-count bounds for low survivor counts', () => {
    const rng = createSeededRng('low-alive');
    const samples = 10000;

    for (let index = 0; index < samples; index += 1) {
      const k3 = sampleParticipantCount(3, rng);
      expect([2, 3]).toContain(k3);
    }

    expect(sampleParticipantCount(2, rng)).toBe(2);
    expect(sampleParticipantCount(1, rng)).toBe(1);
  });
});

describe('catalog anti-repetition', () => {
  const catalog: EventTemplate[] = [
    { id: 'combat-1', type: 'combat', base_weight: 10, phases: ['day', 'night'] },
    { id: 'combat-2', type: 'combat', base_weight: 8, phases: ['day', 'night'] },
    { id: 'resource-1', type: 'resource', base_weight: 6, phases: ['day'] },
    { id: 'hazard-1', type: 'hazard', base_weight: 6, phases: ['night'] },
    { id: 'surprise-1', type: 'surprise', base_weight: 5, phases: ['day', 'night'] }
  ];

  it('caps repetition pressure across 20 turns', () => {
    const rng = createSeededRng('anti-repeat');
    const picked: EventTemplate[] = [];

    for (let turn = 0; turn < 20; turn += 1) {
      const phase = turn % 2 === 0 ? 'day' : 'night';
      const recent = picked.map((event) => event.id).slice(-4);
      const event = selectCatalogEvent(catalog, phase, recent, rng, 2);
      picked.push(event);
    }

    const pickedIds = picked.map((event) => event.id);
    const byTemplate = pickedIds.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
    const byType = picked.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] ?? 0) + 1;
      return acc;
    }, {});

    const maxRepeats = Math.max(...Object.values(byTemplate));
    expect(maxRepeats).toBeLessThanOrEqual(8);

    const maxTypeShare = Math.max(...Object.values(byType)) / picked.length;
    expect(maxTypeShare).toBeLessThanOrEqual(0.4);

    for (let start = 0; start <= pickedIds.length - 4; start += 1) {
      const window = pickedIds.slice(start, start + 4);
      const counts = window.reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      }, {});
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
    }
  });

  it('falls back to phase candidates when anti-repetition fully saturates', () => {
    const selected = selectCatalogEvent(
      [{ id: 'day-only', type: 'resource', base_weight: 1, phases: ['day'] }],
      'day',
      ['day-only', 'day-only'],
      createSeededRng('saturated'),
      2
    );

    expect(selected.id).toBe('day-only');
  });

  it('throws when no template can run in the current phase', () => {
    const rng = createSeededRng('no-candidate');

    expect(() =>
      selectCatalogEvent(
        [{ id: 'resource-only', type: 'resource', base_weight: 1, phases: ['day'] }],
        'night',
        [],
        rng
      )
    ).toThrow('No event templates available');
  });

  it('uses safe fallback when rng returns an invalid number', () => {
    const selected = selectCatalogEvent(
      [
        { id: 'combat-a', type: 'combat', base_weight: 1, phases: ['day'] },
        { id: 'combat-b', type: 'combat', base_weight: 1, phases: ['day'] }
      ],
      'day',
      [],
      () => Number.NaN
    );

    expect(selected.id).toBe('combat-b');
  });
});
