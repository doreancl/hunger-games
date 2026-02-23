import { describe, expect, it } from 'vitest';
import {
  advanceTurnResponseSchema,
  advanceTurnRequestSchema,
  createMatchRequestSchema,
  getMatchStateResponseSchema,
  matchSnapshotSchema,
  resumeMatchRequestSchema,
  rulesetVersionSchema,
  snapshotEnvelopeVersionSchema,
  submitGodModeActionsRequestSchema,
  submitGodModeActionsResponseSchema,
  startMatchResponseSchema
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

  it('accepts snapshot envelope for resume/advance requests', () => {
    const snapshot = {
      snapshot_version: 1,
      ruleset_version: 'v1.0.0',
      match: {
        id: 'match-1',
        seed: null,
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
        seed: null
      },
      participants: [],
      recent_events: []
    };

    const envelope = {
      snapshot_version: 1,
      checksum: '0badc0de',
      snapshot
    };

    const resumeResult = resumeMatchRequestSchema.safeParse(envelope);
    const advanceResult = advanceTurnRequestSchema.safeParse(envelope);
    expect(resumeResult.success, JSON.stringify(resumeResult.success ? null : resumeResult.error.issues)).toBe(
      true
    );
    expect(
      advanceResult.success,
      JSON.stringify(advanceResult.success ? null : advanceResult.error.issues)
    ).toBe(true);
  });

  it('accepts version-only payload for compatibility checks', () => {
    expect(snapshotEnvelopeVersionSchema.parse({ snapshot_version: 1 }).snapshot_version).toBe(1);
  });
});

describe('create_match request contract', () => {
  it('accepts payload with unambiguous required fields', () => {
    const payload = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      participant_names: Array.from({ length: 10 }, (_, index) => `Tributo ${index + 1}`),
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
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`)
    };

    const result = createMatchRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings).toEqual({
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      });
    }
  });

  it('rejects payload below minimum roster size', () => {
    const payload = {
      roster_character_ids: ['char-1', 'char-2']
    };

    expect(createMatchRequestSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects payload with unexpected fields', () => {
    const payload = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
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

  it('rejects payload when participant_names length does not match roster', () => {
    const payload = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      participant_names: ['Solo uno']
    };

    expect(createMatchRequestSchema.safeParse(payload).success).toBe(false);
  });
});

describe('match lifecycle response contracts', () => {
  it('accepts start_match response contract', () => {
    const payload = {
      match_id: 'match-1',
      phase: 'running',
      cycle_phase: 'bloodbath',
      turn_number: 0
    };

    expect(startMatchResponseSchema.parse(payload)).toEqual(payload);
  });

  it('accepts get_match_state response contract', () => {
    const payload = {
      match_id: 'match-1',
      phase: 'setup',
      cycle_phase: 'bloodbath',
      turn_number: 0,
      tension_level: 0,
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      },
      participants: [],
      recent_events: [],
      god_mode: {
        phase: 'idle',
        pending_actions: 0
      }
    };

    expect(getMatchStateResponseSchema.parse(payload)).toEqual(payload);
  });

  it('accepts advance_turn response contract', () => {
    const payload = {
      turn_number: 1,
      cycle_phase: 'day',
      tension_level: 12,
      event: {
        id: 'event-1',
        type: 'combat',
        source_type: 'natural',
        phase: 'bloodbath',
        narrative_text: 'Evento combat-1 en fase bloodbath con 2 participante(s). Hubo 1 eliminacion.',
        participant_ids: ['participant-1', 'participant-2']
      },
      survivors_count: 9,
      eliminated_ids: ['participant-2'],
      finished: false,
      winner_id: null
    };

    expect(advanceTurnResponseSchema.parse(payload)).toEqual(payload);
  });

  it('accepts god_mode actions payload and response contracts', () => {
    const requestPayload = {
      actions: [
        {
          kind: 'localized_fire',
          location_id: 'forest',
          persistence_turns: 2
        },
        {
          kind: 'set_relationship',
          source_id: 'participant-1',
          target_id: 'participant-2',
          relation: 'enemy'
        }
      ]
    };
    const responsePayload = {
      match_id: 'match-1',
      phase: 'god_mode',
      accepted_actions: 2,
      pending_actions: 2
    };

    expect(submitGodModeActionsRequestSchema.parse(requestPayload)).toEqual(requestPayload);
    expect(submitGodModeActionsResponseSchema.parse(responsePayload)).toEqual(responsePayload);
  });
});
