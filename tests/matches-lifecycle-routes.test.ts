import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createMatch } from '@/app/api/matches/route';
import { GET as getMatchState } from '@/app/api/matches/[matchId]/route';
import { POST as startMatch } from '@/app/api/matches/[matchId]/start/route';
import { resetMatchesForTests } from '@/lib/matches/lifecycle';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

describe('match lifecycle routes', () => {
  beforeEach(() => {
    resetMatchesForTests();
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
});
