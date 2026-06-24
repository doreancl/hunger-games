import { afterEach, describe, expect, it, vi } from 'vitest';
import { RULESET_VERSION, SNAPSHOT_VERSION, type CreateMatchRequest, type MatchSnapshot } from '@/lib/domain/types';

async function loadLifecycleModule() {
  return import('@/lib/matches/lifecycle');
}

function buildSnapshotWithEngineState(): MatchSnapshot {
  return {
    snapshot_version: SNAPSHOT_VERSION,
    ruleset_version: RULESET_VERSION,
    match: {
      id: 'match-test',
      seed: 'seed-1',
      ruleset_version: RULESET_VERSION,
      phase: 'running',
      cycle_phase: 'day',
      turn_number: 4,
      tension_level: 31,
      created_at: '2026-02-18T00:00:00.000Z',
      ended_at: null
    },
    settings: {
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed: 'seed-1'
    },
    participants: [
      {
        id: 'p1',
        match_id: 'match-test',
        character_id: 'char-1',
        display_name: 'Atlas',
        current_health: 100,
        status: 'alive',
        streak_score: 0
      }
    ],
    recent_events: [
      {
        id: 'evt-1',
        match_id: 'match-test',
        template_id: 'template-1',
        turn_number: 1,
        type: 'combat',
        location: 'forest',
        phase: 'day',
        participant_count: 2,
        intensity: 1,
        narrative_text: 'Evento inicial',
        lethal: false,
        origin: 'natural',
        induced_by_action_ids: [],
        created_at: '2026-02-18T00:00:00.000Z'
      }
    ],
    engine_state: {
      next_cycle_phase: 'night',
      queued_god_mode_actions: [
        {
          id: 'act-1',
          kind: 'separate_tributes',
          participant_ids: ['p1', 'p2']
        },
        {
          id: 'act-2',
          kind: 'set_enmity',
          source_participant_id: 'p1',
          target_participant_id: 'p2'
        }
      ],
      persistent_fires: [
        {
          location: 'forest',
          remaining_turns: 1,
          source_action_id: 'act-1'
        }
      ],
      participant_locations: {
        p1: 'forest',
        p2: 'caves'
      },
      participant_resources: {
        p1: ['water'],
        p2: ['knife']
      },
      hostility: {
        p1: { p2: 'enemy' },
        p2: { p1: 'ally' }
      }
    }
  };
}

describe('lifecycle stateless runtime', () => {
  afterEach(async () => {
    vi.resetModules();
    delete process.env.MATCHES_STORE_FILE;
  });

  it('remains stateless across module reloads', async () => {
    let lifecycle = await loadLifecycleModule();
    const payload: CreateMatchRequest = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: 'stateless-seed'
      }
    };

    const createResponse = lifecycle.createMatch(payload);
    const startResult = lifecycle.startMatchFromSnapshot(createResponse.snapshot_envelope.snapshot);
    expect(startResult.ok).toBe(true);
    if (!startResult.ok) {
      throw new Error(startResult.error.message);
    }

    vi.resetModules();
    lifecycle = await loadLifecycleModule();

    const advanceResult = lifecycle.advanceTurnFromSnapshot(
      startResult.value.snapshot_envelope.snapshot
    );
    expect(advanceResult.ok).toBe(true);
  });

  it('ignores MATCHES_STORE_FILE env var and keeps runtime in memory only', async () => {
    process.env.MATCHES_STORE_FILE = '/tmp/should-not-be-used.json';
    vi.resetModules();
    const lifecycle = await loadLifecycleModule();

    const created = lifecycle.createMatch({
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      }
    });

    const startResult = lifecycle.startMatchFromSnapshot(created.snapshot_envelope.snapshot);
    expect(startResult.ok).toBe(true);
  });

  it('round-trips canonical snapshot through stored representation', async () => {
    const lifecycle = await loadLifecycleModule();
    const snapshot = buildSnapshotWithEngineState();
    const stored = lifecycle.snapshotToStoredMatch(snapshot);
    const restored = lifecycle.storedMatchToSnapshot(stored);

    expect(restored).toEqual(snapshot);
  });

  it('deep-copies snapshot data during round-trip conversions', async () => {
    const lifecycle = await loadLifecycleModule();
    const snapshot = buildSnapshotWithEngineState();
    const stored = lifecycle.snapshotToStoredMatch(snapshot);

    snapshot.engine_state.participant_locations.p1 = 'caves';
    snapshot.match.turn_number = 5;
    snapshot.engine_state.participant_resources.p1.push('medicine');
    const firstAction = snapshot.engine_state.queued_god_mode_actions[0];
    if (firstAction.kind === 'separate_tributes') {
      firstAction.participant_ids.push('p3');
    }

    expect(stored.participant_locations.p1).toBe('forest');
    expect(stored.match.turn_number).toBe(4);
    expect(stored.participant_resources.p1).toEqual(['water']);
    if (stored.queued_god_mode_actions[0].kind !== 'separate_tributes') {
      throw new Error('Expected stored first action to be separate_tributes.');
    }
    expect(stored.queued_god_mode_actions[0].participant_ids).toEqual(['p1', 'p2']);

    const roundTripSnapshot = lifecycle.storedMatchToSnapshot(stored);

    roundTripSnapshot.engine_state.participant_locations.p1 = 'night-camp';
    roundTripSnapshot.engine_state.participant_resources.p1.push('herb');
    roundTripSnapshot.engine_state.queued_god_mode_actions[0] = {
      ...roundTripSnapshot.engine_state.queued_god_mode_actions[0],
      id: 'act-changed'
    };

    expect(stored.participant_locations.p1).toBe('forest');
    expect(stored.participant_resources.p1).toEqual(['water']);
    expect(stored.queued_god_mode_actions[0].id).toBe('act-1');
  });
});
