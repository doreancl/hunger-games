import { beforeEach, describe, expect, it, vi } from 'vitest';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

describe('match store persistence', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { resetMatchesForTests } = await import('@/lib/matches/lifecycle');
    resetMatchesForTests();
  });

  it('keeps created matches available after module reload', async () => {
    const lifecycleBeforeReload = await import('@/lib/matches/lifecycle');
    const created = lifecycleBeforeReload.createMatch({
      roster_character_ids: roster(10),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      }
    });

    vi.resetModules();
    const lifecycleAfterReload = await import('@/lib/matches/lifecycle');
    const state = lifecycleAfterReload.getMatchState(created.match_id);

    expect(state?.match_id).toBe(created.match_id);
  });
});
