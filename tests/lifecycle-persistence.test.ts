import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CreateMatchRequest } from '@/lib/domain/types';

async function loadLifecycleModule() {
  return import('@/lib/matches/lifecycle');
}

describe('lifecycle stateless runtime', () => {
  afterEach(async () => {
    vi.resetModules();
    delete process.env.MATCHES_STORE_FILE;
    const lifecycle = await loadLifecycleModule();
    lifecycle.resetMatchesForTests();
  });

  it('does not keep match state after module reload', async () => {
    let lifecycle = await loadLifecycleModule();

    const createPayload: CreateMatchRequest = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: 'stateless-seed'
      }
    };

    const created = lifecycle.createMatch(createPayload);
    expect(lifecycle.startMatch(created.match_id).ok).toBe(true);
    expect(lifecycle.advanceTurn(created.match_id).ok).toBe(true);

    vi.resetModules();
    lifecycle = await loadLifecycleModule();

    expect(lifecycle.getMatchState(created.match_id)).toBeNull();
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

    expect(lifecycle.getMatchState(created.match_id)).not.toBeNull();
  });
});
