import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createMatch } from '@/app/api/matches/route';
import { GET as getMatchState } from '@/app/api/matches/[matchId]/route';
import { POST as startMatch } from '@/app/api/matches/[matchId]/start/route';
import { POST as advanceTurn } from '@/app/api/matches/[matchId]/turns/advance/route';
import { POST as resumeMatch } from '@/app/api/matches/resume/route';
import { resetRateLimitsForTests } from '@/lib/api/rate-limit';
import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { resetMatchesForTests } from '@/lib/matches/lifecycle';
import { advanceDirector } from '@/lib/simulation-state';
import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

describe('match lifecycle routes', () => {
  beforeEach(() => {
    resetMatchesForTests();
    resetRateLimitsForTests();
  });

  it('starts a setup match and returns running bloodbath', async () => {
    const createRequest = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10)
      })
    });

    const createResponse = await createMatch(createRequest);
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    const startResponse = await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );
    const startBody = await startResponse.json();

    expect(startResponse.status).toBe(200);
    expect(startBody).toEqual({
      match_id: matchId,
      phase: 'running',
      cycle_phase: 'bloodbath',
      turn_number: 0
    });
  });

  it('returns conflict when starting a match outside setup phase', async () => {
    const createRequest = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10)
      })
    });

    const createResponse = await createMatch(createRequest);
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );

    const secondStartResponse = await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );
    const secondStartBody = await secondStartResponse.json();

    expect(secondStartResponse.status).toBe(409);
    expect(secondStartBody.error.code).toBe('MATCH_STATE_CONFLICT');
  });

  it('returns not found when starting an unknown match', async () => {
    const response = await startMatch(
      new Request('http://localhost/api/matches/missing/start', { method: 'POST' }),
      { params: Promise.resolve({ matchId: 'missing' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    });
  });

  it('advances one turn and updates runtime state consistently', async () => {
    const createRequest = new Request('http://localhost/api/matches', {
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
    });

    const createResponse = await createMatch(createRequest);
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );

    const advanceResponse = await advanceTurn(
      new Request(`http://localhost/api/matches/${matchId}/turns/advance`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );
    const advanceBody = await advanceResponse.json();

    expect(advanceResponse.status).toBe(200);
    expect(advanceBody.event).toMatchObject({
      id: expect.any(String),
      type: expect.any(String),
      narrative_text: expect.any(String),
      participant_ids: expect.any(Array)
    });
    expect(advanceBody.event.participant_ids.length).toBeGreaterThanOrEqual(1);
    expect(advanceBody.survivors_count).toBe(10 - advanceBody.eliminated_ids.length);
    expect(advanceBody.finished).toBe(false);
    expect(advanceBody.winner_id).toBeNull();

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
    expect(advanceBody.cycle_phase).toBe(expectedDirector.cycle_phase);
    expect(advanceBody.tension_level).toBe(expectedDirector.tension_level);

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();

    expect(stateResponse.status).toBe(200);
    expect(stateBody.turn_number).toBe(advanceBody.turn_number);
    expect(stateBody.cycle_phase).toBe(advanceBody.cycle_phase);
    expect(stateBody.tension_level).toBe(advanceBody.tension_level);
    expect(stateBody.recent_events).toHaveLength(1);
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
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    const response = await advanceTurn(
      new Request(`http://localhost/api/matches/${matchId}/turns/advance`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('MATCH_STATE_CONFLICT');
  });

  it('returns not found when advancing unknown match', async () => {
    const response = await advanceTurn(
      new Request('http://localhost/api/matches/missing/turns/advance', { method: 'POST' }),
      { params: Promise.resolve({ matchId: 'missing' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    });
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
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );

    let lastAdvanceBody: Record<string, unknown> | null = null;
    for (let index = 0; index < 80; index += 1) {
      const advanceResponse = await advanceTurn(
        new Request(`http://localhost/api/matches/${matchId}/turns/advance`, { method: 'POST' }),
        { params: Promise.resolve({ matchId }) }
      );
      lastAdvanceBody = await advanceResponse.json();
      if (lastAdvanceBody.finished === true) {
        break;
      }
    }

    expect(lastAdvanceBody).not.toBeNull();
    expect(lastAdvanceBody?.finished).toBe(true);
    expect(lastAdvanceBody?.survivors_count).toBe(1);
    expect(typeof lastAdvanceBody?.winner_id).toBe('string');

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();
    const aliveParticipants = (stateBody.participants as Array<{ id: string; status: string }>).filter(
      (participant) => participant.status !== 'eliminated'
    );

    expect(stateBody.phase).toBe('finished');
    expect(aliveParticipants).toHaveLength(1);
    expect(aliveParticipants[0].id).toBe(lastAdvanceBody?.winner_id);
  });

  it('returns consistent state for existing match', async () => {
    const createRequest = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10)
      })
    });

    const createResponse = await createMatch(createRequest);
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();

    expect(stateResponse.status).toBe(200);
    expect(stateBody.match_id).toBe(matchId);
    expect(stateBody.phase).toBe('setup');
    expect(stateBody.cycle_phase).toBe('bloodbath');
    expect(stateBody.turn_number).toBe(0);
    expect(stateBody.tension_level).toBe(0);
    expect(stateBody.settings).toEqual({
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed: null
    });
    expect(stateBody.participants).toHaveLength(10);
    expect(stateBody.recent_events).toEqual([]);
  });

  it('returns not found when reading unknown match state', async () => {
    const response = await getMatchState(
      new Request('http://localhost/api/matches/missing', { method: 'GET' }),
      { params: Promise.resolve({ matchId: 'missing' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    });
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
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();
    const snapshot = {
      snapshot_version: SNAPSHOT_VERSION,
      ruleset_version: RULESET_VERSION,
      match: {
        id: matchId,
        seed: stateBody.settings.seed,
        ruleset_version: RULESET_VERSION,
        phase: stateBody.phase,
        cycle_phase: stateBody.cycle_phase,
        turn_number: stateBody.turn_number,
        tension_level: stateBody.tension_level,
        created_at: '2026-02-18T00:00:00.000Z',
        ended_at: null
      },
      settings: stateBody.settings,
      participants: stateBody.participants,
      recent_events: stateBody.recent_events
    };

    const response = await advanceTurn(
      new Request(`http://localhost/api/matches/${matchId}/turns/advance`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION,
          checksum: '00000000',
          snapshot
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SNAPSHOT_INVALID');
  });

  it('rejects advance snapshot with unsupported version', async () => {
    const matchId = 'match-id';
    const response = await advanceTurn(
      new Request(`http://localhost/api/matches/${matchId}/turns/advance`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION + 1
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('SNAPSHOT_VERSION_UNSUPPORTED');
  });

  it('rate limits advance endpoint after threshold', async () => {
    const matchId = 'missing';
    let lastResponse: Response | null = null;

    for (let index = 0; index < 121; index += 1) {
      lastResponse = await advanceTurn(
        new Request(`http://localhost/api/matches/${matchId}/turns/advance`, { method: 'POST' }),
        { params: Promise.resolve({ matchId }) }
      );
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
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;
    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();

    const snapshot = {
      snapshot_version: SNAPSHOT_VERSION,
      ruleset_version: RULESET_VERSION,
      match: {
        id: matchId,
        seed: stateBody.settings.seed,
        ruleset_version: RULESET_VERSION,
        phase: stateBody.phase,
        cycle_phase: stateBody.cycle_phase,
        turn_number: stateBody.turn_number,
        tension_level: stateBody.tension_level,
        created_at: '2026-02-18T00:00:00.000Z',
        ended_at: null
      },
      settings: stateBody.settings,
      participants: stateBody.participants,
      recent_events: stateBody.recent_events
    };

    const response = await resumeMatch(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION,
          checksum: buildSnapshotChecksum(snapshot),
          snapshot
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.match_id).toBe(matchId);
    expect(body.turn_number).toBe(0);
  });
});
