import { SPECIAL_EVENT_RULES } from '@/lib/domain/rules';
import type { Match } from '@/lib/domain/types';
import type { SeededRng } from '@/lib/simulation-state';

export type SpecialEventNarrative =
  | {
      kind: 'early_pedestal_escape';
      leaver_name: string;
      exploded: boolean;
    }
  | {
      kind: 'cornucopia_refill';
    }
  | {
      kind: 'arena_escape_attempt';
      tribune_name: string;
    }
  | undefined;

export type ResolveSpecialEventInput = {
  phase: Match['cycle_phase'];
  turn_number: number;
  alive_count: number;
  template_id: string;
  selected_participants: Array<{
    id: string;
    display_name: string;
  }>;
  rng: SeededRng;
};

export type ResolveSpecialEventResult = {
  handled: boolean;
  allow_default_elimination: boolean;
  eliminated_participant_ids: string[];
  elimination_chance_floor: number;
  narrative: SpecialEventNarrative;
};

export function resolveSpecialEvent(input: ResolveSpecialEventInput): ResolveSpecialEventResult {
  const isEarlyPedestalEscape =
    input.phase === 'bloodbath' &&
    input.template_id === SPECIAL_EVENT_RULES.early_pedestal_escape.template_id &&
    input.selected_participants.length > 0;

  if (!isEarlyPedestalEscape) {
    const isCornucopiaRefill = input.template_id === SPECIAL_EVENT_RULES.cornucopia_refill.template_id;
    if (isCornucopiaRefill) {
      return {
        handled: true,
        allow_default_elimination: true,
        eliminated_participant_ids: [],
        elimination_chance_floor: SPECIAL_EVENT_RULES.cornucopia_refill.elimination_chance_floor,
        narrative: {
          kind: 'cornucopia_refill'
        }
      };
    }

    const isArenaEscapeAttempt =
      input.template_id === SPECIAL_EVENT_RULES.arena_escape_attempt.template_id &&
      input.selected_participants.length > 0;
    if (isArenaEscapeAttempt) {
      const escapingTribute = input.selected_participants[0];
      return {
        handled: true,
        allow_default_elimination: false,
        eliminated_participant_ids: [escapingTribute.id],
        elimination_chance_floor: 0,
        narrative: {
          kind: 'arena_escape_attempt',
          tribune_name: escapingTribute.display_name
        }
      };
    }

    return {
      handled: false,
      allow_default_elimination: true,
      eliminated_participant_ids: [],
      elimination_chance_floor: 0,
      narrative: undefined
    };
  }

  const leaver = input.selected_participants[0];
  const exploded = input.rng() < SPECIAL_EVENT_RULES.early_pedestal_escape.explosion_chance;
  return {
    handled: true,
    allow_default_elimination: false,
    eliminated_participant_ids: exploded ? [leaver.id] : [],
    elimination_chance_floor: 0,
    narrative: {
      kind: 'early_pedestal_escape',
      leaver_name: leaver.display_name,
      exploded
    }
  };
}
