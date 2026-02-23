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
      turn_number: 1,
      alive_count: 24,
      template_id: 'hazard-pedestal-early-exit-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0.02)
    });

    expect(result.handled).toBe(true);
    expect(result.allow_default_elimination).toBe(false);
    expect(result.elimination_chance_floor).toBe(0);
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
      turn_number: 1,
      alive_count: 24,
      template_id: 'hazard-pedestal-early-exit-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0.5)
    });

    expect(result.handled).toBe(true);
    expect(result.allow_default_elimination).toBe(false);
    expect(result.elimination_chance_floor).toBe(0);
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
      turn_number: 1,
      alive_count: 24,
      template_id: 'combat-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0)
    });

    expect(result).toEqual({
      handled: false,
      allow_default_elimination: true,
      eliminated_participant_ids: [],
      elimination_chance_floor: 0,
      narrative: undefined
    });
  });

  it('boosts elimination chance for cornucopia refill without forced kill', () => {
    const result = resolveSpecialEvent({
      phase: 'day',
      turn_number: 5,
      alive_count: 10,
      template_id: 'resource-cornucopia-refill-1',
      selected_participants: [{ id: 'p1', display_name: 'Tributo Uno' }],
      rng: rngWith(0.9)
    });

    expect(result).toEqual({
      handled: true,
      allow_default_elimination: true,
      eliminated_participant_ids: [],
      elimination_chance_floor: 0.55,
      narrative: {
        kind: 'cornucopia_refill'
      }
    });
  });

  it('eliminates tribute automatically on arena escape attempt', () => {
    const result = resolveSpecialEvent({
      phase: 'night',
      turn_number: 7,
      alive_count: 8,
      template_id: 'hazard-arena-escape-attempt-1',
      selected_participants: [{ id: 'p1', display_name: 'Katniss' }],
      rng: rngWith(0.5)
    });

    expect(result).toEqual({
      handled: true,
      allow_default_elimination: false,
      eliminated_participant_ids: ['p1'],
      elimination_chance_floor: 0,
      narrative: {
        kind: 'arena_escape_attempt',
        tribune_name: 'Katniss'
      }
    });
  });
});

describe('event narrative builder', () => {
  it('renders early pedestal narrative from metadata', () => {
    const narrative = buildEventNarrative({
      template_id: 'hazard-pedestal-early-exit-1',
      phase: 'bloodbath',
      location: 'cornucopia',
      participant_names: ['Tributo Uno'],
      eliminated_names: ['Tributo Uno'],
      special_narrative: {
        kind: 'early_pedestal_escape',
        leaver_name: 'Tributo Uno',
        exploded: true
      }
    });

    expect(narrative).toBe('Tributo Uno abandona el pedestal antes de tiempo en la Cornucopia y explota.');
  });

  it('renders generic narrative independently from special resolver', () => {
    const narrative = buildEventNarrative({
      template_id: 'combat-1',
      phase: 'day',
      location: 'forest',
      participant_names: ['A', 'B'],
      eliminated_names: ['B'],
      special_narrative: undefined
    });

    expect(narrative).toBe('Evento combat-1 en el bosque durante fase day con A, B. Eliminados: B.');
  });

  it('renders cornucopia refill narrative', () => {
    const narrative = buildEventNarrative({
      template_id: 'resource-cornucopia-refill-1',
      phase: 'day',
      participant_names: ['A', 'B'],
      eliminated_names: [],
      special_narrative: {
        kind: 'cornucopia_refill'
      }
    });

    expect(narrative).toContain('reabastecimiento en la Cornucopia');
  });

  it('renders arena escape narrative', () => {
    const narrative = buildEventNarrative({
      template_id: 'hazard-arena-escape-attempt-1',
      phase: 'night',
      participant_names: ['Katniss'],
      eliminated_names: ['Katniss'],
      special_narrative: {
        kind: 'arena_escape_attempt',
        tribune_name: 'Katniss'
      }
    });

    expect(narrative).toContain('intenta escapar del arena');
    expect(narrative).toContain('ejecutado automáticamente');
  });
});
