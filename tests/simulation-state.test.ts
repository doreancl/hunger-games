import { describe, expect, it } from 'vitest';
import {
  advanceDirector,
  canResumeFromLocalStorage,
  createSeededRng,
  nextTurn,
  sampleParticipantCount,
  selectCatalogEvent
} from '@/lib/simulation-state';
import type { EventTemplate } from '@/lib/simulation-state';

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
    const runSequence = (seed: string) => {
      const rng = createSeededRng(seed);
      return Array.from({ length: 12 }, () => Number(rng().toFixed(8)));
    };

    expect(runSequence('seed-123')).toEqual(runSequence('seed-123'));
    expect(runSequence('seed-123')).not.toEqual(runSequence('seed-456'));
  });
});

describe('director phases and tension', () => {
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
});

describe('multi-participant distribution', () => {
  it('keeps k>=3 in tolerance bands', () => {
    const rng = createSeededRng('stats');
    const samples = 150000;
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
    expect(toRatio(counts.k3)).toBeGreaterThan(0.0085);
    expect(toRatio(counts.k3)).toBeLessThan(0.0115);
    expect(toRatio(counts.k4)).toBeGreaterThan(0.004);
    expect(toRatio(counts.k4)).toBeLessThan(0.006);
    expect(toRatio(counts.k5)).toBeGreaterThan(0.0015);
    expect(toRatio(counts.k5)).toBeLessThan(0.0035);
    expect(toRatio(counts.k6)).toBeGreaterThan(0.0005);
    expect(toRatio(counts.k6)).toBeLessThan(0.002);
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
    const picked: string[] = [];

    for (let turn = 0; turn < 20; turn += 1) {
      const phase = turn % 2 === 0 ? 'day' : 'night';
      const recent = picked.slice(-4);
      const event = selectCatalogEvent(catalog, phase, recent, rng, 2);
      picked.push(event.id);
    }

    const byTemplate = picked.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});

    const maxRepeats = Math.max(...Object.values(byTemplate));
    expect(maxRepeats).toBeLessThanOrEqual(8);
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
