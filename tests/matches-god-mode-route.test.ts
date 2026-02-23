import { describe, expect, it } from 'vitest';
import { POST as createMatch } from '@/app/api/matches/route';
import { GET as getMatchState } from '@/app/api/matches/[matchId]/route';
import { POST as startMatch } from '@/app/api/matches/[matchId]/start/route';
import { POST as queueGodModeActions } from '@/app/api/matches/[matchId]/god-mode/actions/route';
import { POST as advanceTurn } from '@/app/api/matches/[matchId]/turns/advance/route';
import { resetMatchesForTests } from '@/lib/matches/lifecycle';
import { resetRateLimitsForTests } from '@/lib/api/rate-limit';
import { resetObservabilityForTests } from '@/lib/observability';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

describe('god mode actions route', () => {
  it('queues typed actions and reports pending phase', async () => {
    resetMatchesForTests();
    resetRateLimitsForTests();
    resetObservabilityForTests();

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

    const queueResponse = await queueGodModeActions(
      new Request(`http://localhost/api/matches/${matchId}/god-mode/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actions: [
            {
              kind: 'global_event',
              event: 'toxic_fog'
            },
            {
              kind: 'set_relationship',
              source_id: 'missing-a',
              target_id: 'missing-b',
              relation: 'enemy'
            }
          ]
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const queueBody = await queueResponse.json();

    expect(queueResponse.status).toBe(200);
    expect(queueBody).toMatchObject({
      match_id: matchId,
      phase: 'god_mode',
      accepted_actions: 2,
      pending_actions: 2
    });

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();
    expect(stateBody.god_mode).toEqual({
      phase: 'god_mode',
      pending_actions: 2
    });
  });

  it('applies queued actions before natural turn and records god_mode events', async () => {
    resetMatchesForTests();
    resetRateLimitsForTests();
    resetObservabilityForTests();

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
    const createBody = await createResponse.json();
    const matchId = createBody.match_id as string;

    await startMatch(
      new Request(`http://localhost/api/matches/${matchId}/start`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );

    const initialStateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const initialStateBody = await initialStateResponse.json();
    const firstParticipantId = initialStateBody.participants[0].id as string;

    await queueGodModeActions(
      new Request(`http://localhost/api/matches/${matchId}/god-mode/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actions: [
            {
              kind: 'resource_adjustment',
              target_id: firstParticipantId,
              resource: 'health',
              delta: -20
            },
            {
              kind: 'revive_tribute',
              target_id: firstParticipantId,
              revive_mode: 'standard'
            }
          ]
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );

    const advanceResponse = await advanceTurn(
      new Request(`http://localhost/api/matches/${matchId}/turns/advance`, { method: 'POST' }),
      { params: Promise.resolve({ matchId }) }
    );
    const advanceBody = await advanceResponse.json();

    expect(advanceResponse.status).toBe(200);
    expect(advanceBody.event.source_type).toBeDefined();

    const stateResponse = await getMatchState(
      new Request(`http://localhost/api/matches/${matchId}`, { method: 'GET' }),
      { params: Promise.resolve({ matchId }) }
    );
    const stateBody = await stateResponse.json();

    expect(stateBody.god_mode).toEqual({
      phase: 'idle',
      pending_actions: 0
    });
    expect(
      stateBody.recent_events.some(
        (event: { source_type: string; template_id: string }) =>
          event.source_type === 'god_mode' && event.template_id === 'god-revive-tribute'
      )
    ).toBe(true);
    expect(
      stateBody.recent_events.some((event: { source_type: string }) => event.source_type === 'natural')
    ).toBe(true);
  });

  it('rejects invalid actions payload', async () => {
    resetMatchesForTests();
    resetRateLimitsForTests();
    resetObservabilityForTests();

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

    const response = await queueGodModeActions(
      new Request(`http://localhost/api/matches/${matchId}/god-mode/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actions: [
            {
              kind: 'localized_fire',
              location_id: 'invalid-place'
            }
          ]
        })
      }),
      { params: Promise.resolve({ matchId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_REQUEST_PAYLOAD');
  });
});
