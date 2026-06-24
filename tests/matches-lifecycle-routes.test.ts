import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as createMatch } from '@/app/api/matches/route';
import { POST as startMatch } from '@/app/api/matches/[matchId]/start/route';
import { POST as advanceTurn } from '@/app/api/matches/[matchId]/turns/advance/route';
import { POST as queueGodMode } from '@/app/api/matches/[matchId]/god-mode/route';
import { POST as resumeMatch } from '@/app/api/matches/resume/route';
import { resetRateLimitsForTests } from '@/lib/api/rate-limit';
import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { UNRECOVERABLE_MATCH_MESSAGE } from '@/lib/domain/messages';
import {
  RULESET_VERSION,
  SNAPSHOT_VERSION,
  type CreateMatchResponse,
  type MatchSnapshot,
  type SnapshotEnvelope
} from '@/lib/domain/types';
import { advanceDirector } from '@/lib/simulation-state';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

function toCharacterIds(
  participantIds: string[],
  snapshot: MatchSnapshot
): string[] {
  const byId = new Map(snapshot.participants.map((participant) => [participant.id, participant.character_id]));
  return participantIds.map((id) => byId.get(id)).filter((characterId): characterId is string => characterId !== undefined)
    .sort();
}

async function startMatchFromCreate(createMatchResponse: CreateMatchResponse, matchId: string) {
  const response = await startMatch(
    new Request(`http://localhost/api/matches/${matchId}/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createMatchResponse.snapshot_envelope)
    }),
    { params: Promise.resolve({ matchId }) }
  );
  return response;
}

async function advanceMatch(matchId: string, snapshotEnvelope: SnapshotEnvelope) {
  const response = await advanceTurn(
    new Request(`http://localhost/api/matches/${matchId}/turns/advance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(snapshotEnvelope)
    }),
    { params: Promise.resolve({ matchId }) }
  );
  return response;
}

describe('match lifecycle routes (snapshot stateless)', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a setup match and returns running bloodbath', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;

    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    expect(startResponse.status).toBe(200);
    expect(startBody.snapshot_envelope.snapshot.match).toMatchObject({
      id: matchId,
      phase: 'running',
      cycle_phase: 'bloodbath',
      turn_number: 0
    });
  });

  it('returns conflict when starting a match outside setup phase', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;

    const firstStartResponse = await startMatchFromCreate(createBody, matchId);
    expect(firstStartResponse.status).toBe(200);
    const firstStartBody = (await firstStartResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    const secondStartResponse = await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(firstStartBody.snapshot_envelope)
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const secondStartBody = await secondStartResponse.json();

    expect(secondStartResponse.status).toBe(409);
    expect(secondStartBody.error.code).toBe('MATCH_STATE_CONFLICT');
  });

  it('returns snapshot-id mismatch error when route match id differs', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;

    const response = await startMatch(
      new Request('http://localhost/api/matches/missing/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createBody.snapshot_envelope)
      }),
      { params: Promise.resolve({ matchId: 'missing' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SNAPSHOT_INVALID');
    expect(body.error.message).toBe('Snapshot match id does not match route match id.');
  });

  it('advances one turn and updates runtime state consistently', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10),
          settings: {
            surprise_level: 'normal',
            event_profile: 'balanced',
            simulation_speed: '1x',
            seed: 'us-004-seed'
          }
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;

    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    const advanceResponse = await advanceMatch(matchId, startBody.snapshot_envelope);
    const advanceBody = (await advanceResponse.json()) as {
      turn_number: number;
      cycle_phase: string;
      tension_level: number;
      event: { id: string; type: string; phase: string; narrative_text: string; participant_ids: string[] };
      survivors_count: number;
      eliminated_ids: string[];
      finished: boolean;
      winner_id: string | null;
      snapshot_envelope: SnapshotEnvelope;
    };

    expect(advanceResponse.status).toBe(200);
    expect(advanceBody.event).toMatchObject({
      id: expect.any(String),
      type: expect.any(String),
      phase: 'bloodbath',
      narrative_text: expect.any(String),
      participant_ids: expect.any(Array)
    });
    expect(advanceBody.event.participant_ids.length).toBeGreaterThanOrEqual(1);
    expect(advanceBody.survivors_count).toBe(10 - advanceBody.eliminated_ids.length);
    expect(advanceBody.finished).toBe(false);
    expect(advanceBody.winner_id).toBeNull();
    expect(advanceBody.snapshot_envelope.snapshot.match.turn_number).toBe(advanceBody.turn_number);

    const expectedDirector = advanceDirector(
      {
        turn_number: 0,
        cycle_phase: 'bloodbath',
        alive_count: 10,
        tension_level: 0
      },
      advanceBody.eliminated_ids.length > 0,
      advanceBody.survivors_count
    );

    expect(advanceBody.turn_number).toBe(expectedDirector.turn_number);
    expect(advanceBody.cycle_phase).toBe('god_mode');
    expect(advanceBody.tension_level).toBe(expectedDirector.tension_level);
    expect(advanceBody.snapshot_envelope.snapshot.recent_events).toHaveLength(1);
    expect(advanceBody.snapshot_envelope.snapshot.recent_events[0].origin).toBe('natural');
    expect(advanceBody.snapshot_envelope.snapshot.recent_events[0].induced_by_action_ids).toEqual([]);
  });

  it('queues and applies god_mode actions between turns', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10),
          settings: {
            surprise_level: 'normal',
            event_profile: 'balanced',
            simulation_speed: '1x',
            seed: 'god-mode-seed'
          }
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;
    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };
    const firstAdvanceResponse = await advanceMatch(matchId, startBody.snapshot_envelope);
    const firstAdvanceBody = (await firstAdvanceResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    const stateSnapshot = firstAdvanceBody.snapshot_envelope.snapshot;
    const [firstParticipant, secondParticipant] = stateSnapshot.participants;
    const revivedCandidate = stateSnapshot.participants[0].id;

    const queueResponse = await queueGodMode(
      new Request(`http://localhost/api/matches/${matchId}/god-mode`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_envelope: firstAdvanceBody.snapshot_envelope,
          actions: [
            {
              id: 'act-fire',
              kind: 'localized_fire',
              location: 'cornucopia',
              persistent_turns: 2
            },
            {
              id: 'act-revive',
              kind: 'revive_tribute',
              participant_id: revivedCandidate
            },
            {
              id: 'act-enemy',
              kind: 'set_enmity',
              source_participant_id: firstParticipant.id,
              target_participant_id: secondParticipant.id
            }
          ]
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const queueBody = (await queueResponse.json()) as {
      cycle_phase: string;
      queued_actions: number;
      snapshot_envelope: SnapshotEnvelope;
    };

    expect(queueResponse.status).toBe(200);
    expect(queueBody.cycle_phase).toBe('god_mode');
    expect(queueBody.queued_actions).toBe(3);

    const advanceAfterQueueResponse = await advanceMatch(matchId, queueBody.snapshot_envelope);
    const advanceAfterQueueBody = (await advanceAfterQueueResponse.json()) as {
      cycle_phase: string;
      event: { narrative_text: string };
      snapshot_envelope: SnapshotEnvelope;
    };
    const lastEvent = advanceAfterQueueBody.snapshot_envelope.snapshot.recent_events.at(-1);
    const inducedByActions = lastEvent?.induced_by_action_ids ?? [];

    expect(advanceAfterQueueResponse.status).toBe(200);
    expect(advanceAfterQueueBody.cycle_phase).toBe('god_mode');
    expect(advanceAfterQueueBody.event.narrative_text).toContain('Incendio en cornucopia');
    expect(inducedByActions).toEqual(
      expect.arrayContaining(['act-fire', 'act-revive', 'act-enemy'])
    );
    expect(lastEvent?.origin).toBe('god_mode');
  });

  it('uses participant_names in snapshot and event narrative when provided', async () => {
    const customNames = Array.from({ length: 10 }, (_, index) => `Tributo ${index + 1}`);
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10),
          participant_names: customNames
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;
    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };
    const advanceResponse = await advanceMatch(matchId, startBody.snapshot_envelope);
    const advanceBody = (await advanceResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    const names = new Set(advanceBody.snapshot_envelope.snapshot.participants.map((participant) => participant.display_name));

    expect(advanceResponse.status).toBe(200);
    expect(advanceBody.snapshot_envelope.snapshot.participants).toHaveLength(10);
    expect(names.size).toBe(10);
    expect(names).toEqual(new Set(customNames));
    expect(advanceBody.snapshot_envelope.snapshot.recent_events[0].narrative_text).toMatch(/Tributo \d+/);
  });

  it('emits deterministic replay signature for same seed and ruleset version', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const createAndAdvance = async (seed: string) => {
      const createResponse = await createMatch(
        new Request('http://localhost/api/matches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            roster_character_ids: roster(10),
            settings: {
              surprise_level: 'normal',
              event_profile: 'balanced',
              simulation_speed: '1x',
              seed
            }
          })
        })
      );
      const createBody = (await createResponse.json()) as CreateMatchResponse;
      const matchId = createBody.snapshot_envelope.snapshot.match.id;
      const startResponse = await startMatchFromCreate(createBody, matchId);
      const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

      return advanceMatch(matchId, startBody.snapshot_envelope);
    };

    const advanceOneOne = await createAndAdvance('replay-seed');
    const advanceBodyOne = (await advanceOneOne.json()) as { snapshot_envelope: SnapshotEnvelope };
    expect(advanceOneOne.status).toBe(200);
    expect(advanceBodyOne.snapshot_envelope.snapshot.match.turn_number).toBe(1);

    const advanceOneTwo = await createAndAdvance('replay-seed');
    const advanceBodyTwo = (await advanceOneTwo.json()) as { snapshot_envelope: SnapshotEnvelope };
    expect(advanceOneTwo.status).toBe(200);
    expect(advanceBodyTwo.snapshot_envelope.snapshot.match.turn_number).toBe(1);

    const replayLogs = infoSpy.mock.calls
      .map((entry) => JSON.parse(entry[0] as string) as Record<string, unknown>)
      .filter((entry) => entry.event === 'match.turn.event');

    expect(replayLogs.length).toBeGreaterThanOrEqual(2);
    const firstReplay = replayLogs.at(-2) as Record<string, unknown>;
    const secondReplay = replayLogs.at(-1) as Record<string, unknown>;

    expect(firstReplay.seed).toBe('replay-seed');
    expect(secondReplay.seed).toBe('replay-seed');
    expect(firstReplay.ruleset_version).toBe(secondReplay.ruleset_version);
    expect(firstReplay.replay_signature).toBe(secondReplay.replay_signature);
  });

  it('returns conflict when advancing a match outside running phase', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;

    const response = await advanceMatch(matchId, createBody.snapshot_envelope);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('MATCH_STATE_CONFLICT');
  });

  it('finishes match with a unique winner when one survivor remains', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10),
          settings: {
            surprise_level: 'high',
            event_profile: 'aggressive',
            simulation_speed: '4x',
            seed: 'us-004-finish-seed'
          }
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;
    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    let lastAdvanceBody: {
      finished: boolean;
      winner_id: string | null;
      survivors_count: number;
      snapshot_envelope: SnapshotEnvelope;
      event: { narrative_text: string };
      cycle_phase: string;
    } | null = null;
    let snapshot = startBody.snapshot_envelope;

    for (let index = 0; index < 80; index += 1) {
      const advanceResponse = await advanceMatch(matchId, snapshot);
      expect(advanceResponse.status).toBe(200);
      lastAdvanceBody = (await advanceResponse.json()) as {
        finished: boolean;
        winner_id: string | null;
        survivors_count: number;
        snapshot_envelope: SnapshotEnvelope;
        event: { narrative_text: string };
        cycle_phase: string;
      };
      snapshot = lastAdvanceBody.snapshot_envelope;
      if (lastAdvanceBody.finished) {
        break;
      }
    }

    expect(lastAdvanceBody).not.toBeNull();
    if (lastAdvanceBody === null) {
      throw new Error('match did not finish in expected turn limit');
    }
    expect(lastAdvanceBody.finished).toBe(true);
    expect(lastAdvanceBody.survivors_count).toBe(1);
    expect(typeof lastAdvanceBody.winner_id).toBe('string');
    expect(lastAdvanceBody.snapshot_envelope.snapshot.match.phase).toBe('finished');

    const aliveParticipants = lastAdvanceBody.snapshot_envelope.snapshot.participants.filter(
      (participant) => participant.status !== 'eliminated'
    );
    expect(aliveParticipants).toHaveLength(1);
    expect(aliveParticipants[0].id).toBe(lastAdvanceBody.winner_id);
  });

  it('rejects advance snapshot with invalid checksum', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;
    const startResponse = await startMatchFromCreate(createBody, matchId);
    const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };

    const response = await advanceMatch(matchId, {
      ...startBody.snapshot_envelope,
      checksum: '00000000'
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SNAPSHOT_INVALID');
  });

  it('rejects advance snapshot with unsupported version', async () => {
    const matchId = 'match-id';
    const unsupportedSnapshotEnvelope = {
      snapshot_version: SNAPSHOT_VERSION + 1 as number,
      checksum: 'cafebabe',
      snapshot: {
        snapshot_version: SNAPSHOT_VERSION,
        ruleset_version: RULESET_VERSION,
        match: {
          id: matchId,
          seed: null,
          ruleset_version: RULESET_VERSION,
          phase: 'setup',
          cycle_phase: 'bloodbath',
          turn_number: 0,
          tension_level: 0,
          created_at: '2026-02-18T00:00:00.000Z',
          ended_at: null
        },
        settings: {
          surprise_level: 'normal',
          event_profile: 'balanced',
          simulation_speed: '1x',
          seed: null
        },
        participants: [],
        recent_events: [],
        engine_state: {
          next_cycle_phase: 'bloodbath',
          queued_god_mode_actions: [],
          persistent_fires: [],
          participant_locations: {},
          participant_resources: {},
          hostility: {}
        }
      }
    } as unknown as SnapshotEnvelope;
    const response = await advanceMatch(matchId, unsupportedSnapshotEnvelope);

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('SNAPSHOT_VERSION_UNSUPPORTED');
    expect(body.error.message).toBe(UNRECOVERABLE_MATCH_MESSAGE);
  });

  it('rate limits advance endpoint after threshold', async () => {
    const matchId = 'missing';
    let lastResponse: Response | null = null;
    const snapshotTemplate: MatchSnapshot = {
      snapshot_version: SNAPSHOT_VERSION,
      ruleset_version: RULESET_VERSION,
      match: {
        id: matchId,
        seed: null,
        ruleset_version: RULESET_VERSION,
        phase: 'setup',
        cycle_phase: 'bloodbath',
        turn_number: 0,
        tension_level: 0,
        created_at: '2026-02-18T00:00:00.000Z',
        ended_at: null
      },
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      },
      participants: [],
      recent_events: [],
      engine_state: {
        next_cycle_phase: 'bloodbath',
        queued_god_mode_actions: [],
        persistent_fires: [],
        participant_locations: {},
        participant_resources: {},
        hostility: {}
      }
    };
    const snapshotEnvelope: SnapshotEnvelope = {
      snapshot_version: SNAPSHOT_VERSION,
      checksum: buildSnapshotChecksum(snapshotTemplate),
      snapshot: snapshotTemplate
    };

    for (let index = 0; index < 121; index += 1) {
      lastResponse = await advanceMatch(matchId, {
        ...snapshotEnvelope
      });
    }

    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse?.json();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('resumes a match from snapshot envelope', async () => {
    const createResponse = await createMatch(
      new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roster_character_ids: roster(10)
        })
      })
    );
    const createBody = (await createResponse.json()) as CreateMatchResponse;
    const matchId = createBody.snapshot_envelope.snapshot.match.id;

    const response = await resumeMatch(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createBody.snapshot_envelope)
      })
  );
    const body = (await response.json()) as { snapshot_envelope: SnapshotEnvelope };

    expect(response.status).toBe(200);
    expect(body.snapshot_envelope.snapshot.match.id).toBe(matchId);
    expect(body.snapshot_envelope.snapshot.match.turn_number).toBe(0);
  });

  it('preserves settings and deterministic continuity after resume', async () => {
    const createAndReachTurn = async (
      seed: string,
      targetTurn: number
    ): Promise<{ snapshot: MatchSnapshot; snapshot_envelope: SnapshotEnvelope }> => {
      const createResponse = await createMatch(
        new Request('http://localhost/api/matches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            roster_character_ids: roster(10),
            settings: {
              surprise_level: 'normal',
              event_profile: 'balanced',
              simulation_speed: '1x',
              seed
            }
          })
        })
      );
      const createBody = (await createResponse.json()) as CreateMatchResponse;
      const matchId = createBody.snapshot_envelope.snapshot.match.id;
      const startResponse = await startMatchFromCreate(createBody, matchId);
      const startBody = (await startResponse.json()) as { snapshot_envelope: SnapshotEnvelope };
      let snapshotEnvelope = startBody.snapshot_envelope;
      let snapshot = startBody.snapshot_envelope.snapshot;

      for (let index = 0; index < targetTurn; index += 1) {
        const nextAdvanceResponse = await advanceMatch(matchId, snapshotEnvelope);
        expect(nextAdvanceResponse.status).toBe(200);
        const nextAdvanceBody = (await nextAdvanceResponse.json()) as { snapshot_envelope: SnapshotEnvelope };
        snapshotEnvelope = nextAdvanceBody.snapshot_envelope;
        snapshot = nextAdvanceBody.snapshot_envelope.snapshot;
      }

      return { snapshot, snapshot_envelope: snapshotEnvelope };
    };

    const { snapshot: snapshotA, snapshot_envelope: snapshotEnvelopeA } = await createAndReachTurn('resume-deterministic-seed', 4);
    const { snapshot: snapshotB, snapshot_envelope: snapshotEnvelopeB } = await createAndReachTurn('resume-deterministic-seed', 4);

    const resumeResponse = await resumeMatch(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION,
          checksum: buildSnapshotChecksum(snapshotB),
          snapshot: snapshotB
        })
      })
    );
    const resumeBody = (await resumeResponse.json()) as { snapshot_envelope: SnapshotEnvelope };
    expect(resumeResponse.status).toBe(200);
    expect(resumeBody.snapshot_envelope.snapshot.settings).toEqual(snapshotB.settings);
    expect(resumeBody.snapshot_envelope.snapshot.match.turn_number).toBe(snapshotB.match.turn_number);

    const advancedAfterResumeResponse = await advanceMatch(
      resumeBody.snapshot_envelope.snapshot.match.id,
      resumeBody.snapshot_envelope
    );
    const advancedControlResponse = await advanceMatch(snapshotA.match.id, snapshotEnvelopeA);

    const advancedAfterResume = (await advancedAfterResumeResponse.json()) as {
      turn_number: number;
      cycle_phase: string;
      tension_level: number;
      event: { type: string; narrative_text: string; participant_ids: string[] };
      survivors_count: number;
      eliminated_ids: string[];
    };
    const advancedControl = (await advancedControlResponse.json()) as {
      turn_number: number;
      cycle_phase: string;
      tension_level: number;
      event: { type: string; narrative_text: string; participant_ids: string[] };
      survivors_count: number;
      eliminated_ids: string[];
    };

    expect(advancedAfterResumeResponse.status).toBe(200);
    expect(advancedControlResponse.status).toBe(200);
    expect(advancedAfterResume.turn_number).toBe(advancedControl.turn_number);
    expect(advancedAfterResume.cycle_phase).toBe(advancedControl.cycle_phase);
    expect(advancedAfterResume.tension_level).toBe(advancedControl.tension_level);
    expect(advancedAfterResume.event.type).toBe(advancedControl.event.type);
    expect(advancedAfterResume.event.narrative_text).toBe(advancedControl.event.narrative_text);
    expect(toCharacterIds(advancedAfterResume.eliminated_ids, snapshotB)).toEqual(
      toCharacterIds(advancedControl.eliminated_ids, snapshotA)
    );
    expect(toCharacterIds(advancedAfterResume.event.participant_ids, snapshotB)).toEqual(
      toCharacterIds(advancedControl.event.participant_ids, snapshotA)
    );
  });
});
