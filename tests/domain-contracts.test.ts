import { describe, expect, it } from 'vitest';
import {
  createMatchRequestSchema,
  matchSnapshotSchema,
  rulesetVersionSchema
} from '@/lib/domain/schemas';

describe('ruleset and snapshot versioning', () => {
  it('accepts semantic ruleset version', () => {
    expect(rulesetVersionSchema.parse('v2.4.1')).toBe('v2.4.1');
  });

  it('rejects invalid ruleset version', () => {
    const result = rulesetVersionSchema.safeParse('2.4.1');
    expect(result.success).toBe(false);
  });

  it('requires known snapshot version shape', () => {
    const snapshot = {
      snapshot_version: 1,
      ruleset_version: 'v1.0.0',
      match: {
        id: 'match-1',
        seed: 'seed',
        ruleset_version: 'v1.0.0',
        phase: 'setup',
        cycle_phase: 'bloodbath',
        turn_number: 0,
        tension_level: 0,
        created_at: '2026-02-15T10:00:00.000Z',
        ended_at: null
      },
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: 'seed'
      },
      participants: [],
      recent_events: []
    };

    expect(matchSnapshotSchema.parse(snapshot).snapshot_version).toBe(1);
  });
});

describe('create_match request contract', () => {
  it('accepts payload with unambiguous required fields', () => {
    const payload = {
      roster_character_ids: ['char-1', 'char-2'],
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '2x',
        seed: null
      }
    };

    expect(createMatchRequestSchema.parse(payload)).toEqual(payload);
  });

  it('rejects payload with missing settings', () => {
    const payload = {
      roster_character_ids: ['char-1']
    };

    expect(createMatchRequestSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects payload with unexpected fields', () => {
    const payload = {
      roster_character_ids: ['char-1'],
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null,
        extra: 'unexpected'
      },
      extra_root: true
    };

    expect(createMatchRequestSchema.safeParse(payload).success).toBe(false);
  });
});
