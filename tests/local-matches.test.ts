import { describe, expect, it } from 'vitest';
import {
  createLocalMatchFromSetup,
  getSetupValidation,
  loadLocalMatchesFromStorage,
  parseLocalMatches,
  saveLocalMatchesToStorage,
  serializeLocalMatches
} from '@/lib/local-matches';

describe('getSetupValidation', () => {
  it('fails when roster is below minimum', () => {
    const validation = getSetupValidation(['1', '2']);
    expect(validation.is_valid).toBe(false);
    expect(validation.issues[0]).toContain('al menos 10');
  });

  it('passes when roster size is valid', () => {
    const roster = Array.from({ length: 10 }, (_, index) => `char-${index}`);
    const validation = getSetupValidation(roster);
    expect(validation).toEqual({ is_valid: true, issues: [] });
  });

  it('enforces upper bound', () => {
    const validRoster = Array.from({ length: 48 }, (_, index) => `char-${index}`);
    const invalidRoster = Array.from({ length: 49 }, (_, index) => `char-${index}`);

    expect(getSetupValidation(validRoster)).toEqual({ is_valid: true, issues: [] });
    expect(getSetupValidation(invalidRoster)).toEqual({
      is_valid: false,
      issues: ['No puedes seleccionar mas de 48 personajes.']
    });
  });
});

describe('parseLocalMatches', () => {
  it('returns empty list for invalid source', () => {
    expect(parseLocalMatches(null)).toEqual([]);
    expect(parseLocalMatches('{bad-json')).toEqual([]);
    expect(parseLocalMatches('{}')).toEqual([]);
  });

  it('filters malformed entries and sorts by updated_at desc', () => {
    const raw = JSON.stringify([
      {
        id: 'm1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        roster_character_ids: [
          'char-01',
          'char-02',
          'char-03',
          'char-04',
          'char-05',
          'char-06',
          'char-07',
          'char-08',
          'char-09',
          'char-10'
        ],
        cycle_phase: 'day',
        turn_number: 4,
        alive_count: 10,
        total_participants: 10,
        settings: {
          seed: 'seed-1',
          simulation_speed: '2x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        }
      },
      {
        id: 'invalid',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-03T00:00:00.000Z'
      },
      {
        id: 'm2',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-05T00:00:00.000Z',
        roster_character_ids: [
          'char-01',
          'char-02',
          'char-03',
          'char-04',
          'char-05',
          'char-06',
          'char-07',
          'char-08',
          'char-09',
          'char-10'
        ],
        cycle_phase: 'night',
        turn_number: 7,
        alive_count: 8,
        total_participants: 10,
        settings: {
          seed: null,
          simulation_speed: '1x',
          event_profile: 'chaotic',
          surprise_level: 'high'
        }
      }
    ]);

    const parsed = parseLocalMatches(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('m2');
    expect(parsed[1].id).toBe('m1');
  });

  it('drops entries with semantically invalid shape', () => {
    const raw = JSON.stringify([
      {
        id: 'bad-date',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: 'not-an-iso-date',
        roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index}`),
        cycle_phase: 'setup',
        turn_number: 0,
        alive_count: 10,
        total_participants: 10,
        settings: {
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        }
      },
      {
        id: 'bad-counts',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index}`),
        cycle_phase: 'setup',
        turn_number: -1,
        alive_count: 9.5,
        total_participants: 10,
        settings: {
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        }
      },
      {
        id: 'bad-total',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-03T00:00:00.000Z',
        roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index}`),
        cycle_phase: 'setup',
        turn_number: 1,
        alive_count: 11,
        total_participants: 10,
        settings: {
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        }
      }
    ]);

    expect(parseLocalMatches(raw)).toEqual([]);
  });
});

describe('local match serialization helpers', () => {
  it('creates setup snapshot from config', () => {
    const match = createLocalMatchFromSetup(
      {
        roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        seed: 'seed-x',
        simulation_speed: '4x',
        event_profile: 'aggressive',
        surprise_level: 'high'
      },
      '2026-02-16T10:00:00.000Z',
      'match-1'
    );

    expect(match).toEqual({
      id: 'match-1',
      created_at: '2026-02-16T10:00:00.000Z',
      updated_at: '2026-02-16T10:00:00.000Z',
      roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      cycle_phase: 'setup',
      turn_number: 0,
      alive_count: 10,
      total_participants: 10,
      settings: {
        seed: 'seed-x',
        simulation_speed: '4x',
        event_profile: 'aggressive',
        surprise_level: 'high'
      }
    });
  });

  it('serializes without losing shape', () => {
    const payload = [
      createLocalMatchFromSetup(
        {
          roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'low'
        },
        '2026-02-16T10:00:00.000Z',
        'match-2'
      )
    ];

    const serialized = serializeLocalMatches(payload);
    expect(parseLocalMatches(serialized)).toEqual(payload);
  });
});

describe('local storage safety helpers', () => {
  it('handles read errors', () => {
    const storage = {
      getItem() {
        throw new Error('blocked');
      }
    };

    expect(loadLocalMatchesFromStorage(storage)).toEqual({
      matches: [],
      error: 'No fue posible leer partidas locales en este navegador.'
    });
  });

  it('handles write errors', () => {
    const storage = {
      setItem() {
        throw new Error('quota');
      }
    };
    const payload = [
      createLocalMatchFromSetup(
        {
          roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        },
        '2026-02-16T10:00:00.000Z',
        'match-write'
      )
    ];

    expect(saveLocalMatchesToStorage(storage, payload)).toEqual({
      ok: false,
      error: 'No fue posible guardar la partida en este navegador.'
    });
  });
});
