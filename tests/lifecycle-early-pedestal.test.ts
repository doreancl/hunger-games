import { describe, expect, it } from 'vitest';
import {
  advanceTurn,
  createMatch,
  getMatchState,
  resetMatchesForTests,
  startMatch
} from '@/lib/matches/lifecycle';

const EARLY_EXIT_TEXT = 'abandona el pedestal antes de tiempo';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

function simulateFirstTurn(seed: string) {
  resetMatchesForTests();
  const created = createMatch({
    roster_character_ids: roster(10),
    settings: {
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed
    }
  });

  const started = startMatch(created.match_id);
  if (!started.ok) {
    throw new Error(`Failed to start match for seed "${seed}"`);
  }

  const advanced = advanceTurn(created.match_id);
  if (!advanced.ok) {
    throw new Error(`Failed to advance match for seed "${seed}"`);
  }

  const state = getMatchState(created.match_id);
  if (!state) {
    throw new Error(`Missing state for seed "${seed}"`);
  }

  const event = state.recent_events[0];
  return {
    advanced: advanced.value,
    event,
    state
  };
}

function findSeedWithOutcome(predicate: (result: ReturnType<typeof simulateFirstTurn>) => boolean): string {
  for (let index = 1; index <= 5000; index += 1) {
    const seed = `issue-56-seed-${index}`;
    const result = simulateFirstTurn(seed);
    if (predicate(result)) {
      return seed;
    }
  }

  throw new Error('No seed found for expected outcome within search window.');
}

describe('early pedestal explosion rule', () => {
  it('eliminates the early leaver when explosion triggers', () => {
    const seed = findSeedWithOutcome(
      (result) =>
        result.event.narrative_text.includes(EARLY_EXIT_TEXT) && result.advanced.eliminated_ids.length === 1
    );
    const result = simulateFirstTurn(seed);

    expect(result.event.narrative_text).toContain(EARLY_EXIT_TEXT);
    expect(result.advanced.eliminated_ids).toHaveLength(1);
    expect(result.advanced.survivors_count).toBe(9);
    expect(result.event.lethal).toBe(true);
    expect(result.state.participants.find((participant) => participant.id === result.advanced.eliminated_ids[0]))
      .toMatchObject({ status: 'eliminated', current_health: 0 });
  });

  it('keeps the leaver alive when explosion does not trigger', () => {
    const seed = findSeedWithOutcome(
      (result) =>
        result.event.narrative_text.includes(EARLY_EXIT_TEXT) && result.advanced.eliminated_ids.length === 0
    );
    const result = simulateFirstTurn(seed);

    expect(result.event.narrative_text).toContain(EARLY_EXIT_TEXT);
    expect(result.advanced.eliminated_ids).toEqual([]);
    expect(result.advanced.survivors_count).toBe(10);
    expect(result.event.lethal).toBe(false);
  });

  it('keeps normal bloodbath flow unchanged when event is not early exit', () => {
    const seed = findSeedWithOutcome(
      (result) =>
        !result.event.narrative_text.includes(EARLY_EXIT_TEXT) &&
        result.event.phase === 'bloodbath' &&
        result.advanced.turn_number === 1
    );
    const result = simulateFirstTurn(seed);

    expect(result.event.narrative_text).not.toContain(EARLY_EXIT_TEXT);
    expect(result.advanced.turn_number).toBe(1);
    expect(result.advanced.cycle_phase).toBe('day');
    expect(result.advanced.survivors_count).toBe(10 - result.advanced.eliminated_ids.length);
  });
});
