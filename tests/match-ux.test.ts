import { describe, expect, it } from 'vitest';
import { createLocalMatchFromSetup } from '@/lib/local-matches';
import {
  filterAndSortMatches,
  getLobbyStatus,
  parseMatchNavigationQuery,
  quickAccessMatches,
  shortId,
  sortByUpdatedAt,
  statusLabel,
  statusPriority
} from '@/lib/match-ux';

function buildMatch(
  id: string,
  overrides?: Partial<ReturnType<typeof createLocalMatchFromSetup>>
): ReturnType<typeof createLocalMatchFromSetup> {
  return {
    ...createLocalMatchFromSetup(
      {
        roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
        seed: null,
        simulation_speed: '1x',
        event_profile: 'balanced',
        surprise_level: 'normal'
      },
      '2026-02-16T10:00:00.000Z',
      id
    ),
    ...overrides
  };
}

describe('match ux helpers', () => {
  it('computes lobby status and labels', () => {
    const setup = buildMatch('m-setup');
    const running = buildMatch('m-running', {
      turn_number: 3,
      cycle_phase: 'day',
      alive_count: 5
    });
    const finished = buildMatch('m-finished', {
      turn_number: 7,
      cycle_phase: 'finale',
      alive_count: 1
    });

    expect(getLobbyStatus(setup)).toBe('setup');
    expect(getLobbyStatus(running)).toBe('running');
    expect(getLobbyStatus(finished)).toBe('finished');
    expect(statusLabel('setup')).toBe('Setup');
    expect(statusLabel('running')).toBe('En curso');
    expect(statusLabel('finished')).toBe('Finalizada');
  });

  it('sorts by status priority and updated_at when filtering', () => {
    const runningOlder = buildMatch('m-running-old', {
      turn_number: 3,
      cycle_phase: 'day',
      alive_count: 8,
      updated_at: '2026-02-16T10:05:00.000Z'
    });
    const runningNewer = buildMatch('m-running-new', {
      turn_number: 4,
      cycle_phase: 'night',
      alive_count: 7,
      updated_at: '2026-02-16T10:10:00.000Z'
    });
    const setup = buildMatch('m-setup', {
      updated_at: '2026-02-16T10:30:00.000Z'
    });
    const finished = buildMatch('m-finished', {
      turn_number: 9,
      cycle_phase: 'finale',
      alive_count: 1,
      updated_at: '2026-02-16T10:40:00.000Z'
    });

    const result = filterAndSortMatches(
      [finished, setup, runningOlder, runningNewer],
      '',
      'all'
    );

    expect(result.map((match) => match.id)).toEqual([
      'm-running-new',
      'm-running-old',
      'm-setup',
      'm-finished'
    ]);
    expect(statusPriority('running')).toBeLessThan(statusPriority('setup'));
    expect(statusPriority('setup')).toBeLessThan(statusPriority('finished'));
  });

  it('filters by status and search text (id/seed/short id)', () => {
    const running = buildMatch('abcdef1234567890', {
      turn_number: 2,
      cycle_phase: 'day',
      alive_count: 9,
      settings: {
        seed: 'seed-x',
        simulation_speed: '1x',
        event_profile: 'balanced',
        surprise_level: 'normal'
      }
    });
    const setup = buildMatch('setup-1');

    expect(filterAndSortMatches([running, setup], 'seed-x', 'all').map((m) => m.id)).toEqual([
      running.id
    ]);
    expect(filterAndSortMatches([running, setup], shortId(running.id), 'all').map((m) => m.id)).toEqual([
      running.id
    ]);
    expect(filterAndSortMatches([running, setup], '', 'setup').map((m) => m.id)).toEqual([
      setup.id
    ]);
  });

  it('supports quick access slicing and updated_at sorting', () => {
    const matches = Array.from({ length: 8 }, (_, index) =>
      buildMatch(`m-${index + 1}`, {
        updated_at: `2026-02-16T10:${String(index).padStart(2, '0')}:00.000Z`
      })
    );

    expect(quickAccessMatches(matches, 6)).toHaveLength(6);
    const shuffled = [matches[1], matches[7], matches[3]];
    expect(sortByUpdatedAt(shuffled).map((match) => match.id)).toEqual(['m-8', 'm-4', 'm-2']);
  });

  it('parses resume/prefill navigation query params', () => {
    expect(parseMatchNavigationQuery('?resume=abc&prefill=def')).toEqual({
      resumeMatchId: 'abc',
      prefillMatchId: 'def'
    });

    expect(parseMatchNavigationQuery('')).toEqual({
      resumeMatchId: null,
      prefillMatchId: null
    });
  });
});
