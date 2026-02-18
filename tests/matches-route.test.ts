import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/matches/route';
import { resetRateLimitsForTests } from '@/lib/api/rate-limit';
import { resetMatchesForTests } from '@/lib/matches/lifecycle';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

describe('POST /api/matches', () => {
  beforeEach(() => {
    resetMatchesForTests();
    resetRateLimitsForTests();
  });

  it.each([
    {
      name: 'unsupported content type',
      request: new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'hello'
      }),
      status: 415,
      body: {
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json.'
        }
      }
    },
    {
      name: 'invalid JSON body',
      request: new Request('http://localhost/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid-json'
      }),
      status: 400,
      body: {
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON.'
        }
      }
    }
  ])('returns typed error for $name', async ({ request, status, body: expectedBody }) => {
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body).toEqual(expectedBody);
  });

  it('returns typed error for invalid payload', async () => {
    const request = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: [],
        settings: {
          surprise_level: 'normal',
          event_profile: 'balanced',
          simulation_speed: '1x',
          seed: null
        }
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_REQUEST_PAYLOAD');
    expect(Array.isArray(body.error.details.issues)).toBe(true);
  });

  it('returns typed error when roster size is below minimum', async () => {
    const request = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(9),
        settings: {
          surprise_level: 'normal',
          event_profile: 'balanced',
          simulation_speed: '1x',
          seed: null
        }
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_REQUEST_PAYLOAD');
  });

  it('creates setup match response with contract shape', async () => {
    const request = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10),
        settings: {
          surprise_level: 'normal',
          event_profile: 'balanced',
          simulation_speed: '1x',
          seed: 'seed-1'
        }
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phase).toBe('setup');
    expect(typeof body.match_id).toBe('string');
    expect(body.match_id.length).toBeGreaterThan(0);
  });

  it('accepts participant_names when creating a match', async () => {
    const request = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10),
        participant_names: Array.from({ length: 10 }, (_, index) => `Tributo ${index + 1}`)
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phase).toBe('setup');
    expect(typeof body.match_id).toBe('string');
  });

  it('applies defaults when settings are omitted', async () => {
    const request = new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roster_character_ids: roster(10)
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phase).toBe('setup');
    expect(typeof body.match_id).toBe('string');
  });

  it('rate limits create endpoint after threshold', async () => {
    let lastResponse: Response | null = null;

    for (let index = 0; index < 21; index += 1) {
      lastResponse = await POST(
        new Request('http://localhost/api/matches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            roster_character_ids: roster(10)
          })
        })
      );
    }

    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse?.json();
    expect(body).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for create_match.',
        details: {
          issues: [
            {
              path: ['request'],
              code: 'rate_limit_exceeded',
              message: expect.stringMatching(/^Retry after \d+ seconds\.$/)
            }
          ]
        }
      }
    });
  });
});
