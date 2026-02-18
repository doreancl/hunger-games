import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/matches/resume/route';
import { resetRateLimitsForTests } from '@/lib/api/rate-limit';
import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { RULESET_VERSION, SNAPSHOT_VERSION, type MatchSnapshot } from '@/lib/domain/types';

function buildSnapshot(): MatchSnapshot {
  return {
    snapshot_version: SNAPSHOT_VERSION,
    ruleset_version: RULESET_VERSION,
    match: {
      id: 'match-1',
      seed: null,
      ruleset_version: RULESET_VERSION,
      phase: 'running',
      cycle_phase: 'day',
      turn_number: 3,
      tension_level: 41,
      created_at: '2026-02-18T00:00:00.000Z',
      ended_at: null
    },
    settings: {
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed: null
    },
    participants: [
      {
        id: 'p1',
        match_id: 'match-1',
        character_id: 'char-1',
        current_health: 100,
        status: 'alive',
        streak_score: 0
      }
    ],
    recent_events: []
  };
}

describe('POST /api/matches/resume', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it('returns typed error for unsupported content type', async () => {
    const response = await POST(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'x'
      })
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns typed error for invalid JSON body', async () => {
    const response = await POST(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json'
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('returns typed error for unsupported snapshot version', async () => {
    const response = await POST(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION + 1
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('SNAPSHOT_VERSION_UNSUPPORTED');
  });

  it('returns typed error for invalid checksum', async () => {
    const snapshot = buildSnapshot();
    const response = await POST(
      new Request('http://localhost/api/matches/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          snapshot_version: SNAPSHOT_VERSION,
          checksum: '00000000',
          snapshot
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SNAPSHOT_INVALID');
  });

  it('rate limits endpoint after threshold', async () => {
    const snapshot = buildSnapshot();
    const payload = JSON.stringify({
      snapshot_version: SNAPSHOT_VERSION,
      checksum: buildSnapshotChecksum(snapshot),
      snapshot
    });

    let lastResponse: Response | null = null;
    for (let index = 0; index < 61; index += 1) {
      lastResponse = await POST(
        new Request('http://localhost/api/matches/resume', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload
        })
      );
    }

    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse?.json();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
