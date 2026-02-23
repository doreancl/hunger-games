import { describe, expect, it } from 'vitest';
import { buildEventNarrative } from '@/lib/matches/event-narrative';
import { resolveSpecialEvent } from '@/lib/matches/special-events';

function rngWith(...rolls: number[]) {
  let index = 0;
  return () => {
    const roll = rolls[Math.min(index, rolls.length - 1)] ?? 0;
    index += 1;
    return roll;
  };
}

describe('early pedestal special event resolver', () => {
  it('eliminates the leaver when explosion roll is below threshold', () => {
    const result = resolveSpecialEvent({
      phase: 'bloodbath',
      template_id: 'hazard-pedestal-early-exit-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0.02)
    });

    expect(result.handled).toBe(true);
    expect(result.eliminated_participant_ids).toEqual(['p1']);
    expect(result.narrative).toEqual({
      kind: 'early_pedestal_escape',
      leaver_name: 'Tributo Uno',
      exploded: true
    });
  });

  it('keeps the leaver alive when explosion roll is above threshold', () => {
    const result = resolveSpecialEvent({
      phase: 'bloodbath',
      template_id: 'hazard-pedestal-early-exit-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0.5)
    });

    expect(result.handled).toBe(true);
    expect(result.eliminated_participant_ids).toEqual([]);
    expect(result.narrative).toEqual({
      kind: 'early_pedestal_escape',
      leaver_name: 'Tributo Uno',
      exploded: false
    });
  });

  it('returns unhandled for non-special templates', () => {
    const result = resolveSpecialEvent({
      phase: 'bloodbath',
      template_id: 'combat-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0)
    });

    expect(result).toEqual({
      handled: false,
      eliminated_participant_ids: [],
      narrative: undefined
    });
  });
});

describe('event narrative builder', () => {
  it('renders early pedestal narrative from metadata', () => {
    const narrative = buildEventNarrative({
      template_id: 'hazard-pedestal-early-exit-1',
      phase: 'bloodbath',
      participant_names: ['Tributo Uno'],
      eliminated_names: ['Tributo Uno'],
      special_narrative: {
        kind: 'early_pedestal_escape',
        leaver_name: 'Tributo Uno',
        exploded: true
      }
    });

    expect(narrative).toBe('Tributo Uno abandona el pedestal antes de tiempo y explota.');
  });

  it('renders generic narrative independently from special resolver', () => {
    const narrative = buildEventNarrative({
      template_id: 'combat-1',
      phase: 'day',
      participant_names: ['A', 'B'],
      eliminated_names: ['B'],
      special_narrative: undefined
    });

    expect(narrative).toBe('Evento combat-1 en fase day con A, B. Eliminados: B.');
  });
});
