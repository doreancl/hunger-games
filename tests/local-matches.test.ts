import { describe, expect, it } from 'vitest';
import {
  createLocalMatchFromSetup,
  getSetupValidation,
  parseLocalMatches,
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
        cycle_phase: 'day',
        turn_number: 4,
        alive_count: 10,
        total_participants: 12,
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
        cycle_phase: 'night',
        turn_number: 7,
        alive_count: 7,
        total_participants: 12,
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
