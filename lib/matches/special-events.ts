import { SPECIAL_EVENT_RULES } from '@/lib/domain/rules';
import type { Match } from '@/lib/domain/types';
import type { SeededRng } from '@/lib/simulation-state';

export type SpecialEventNarrative =
  | {
      kind: 'early_pedestal_escape';
      leaver_name: string;
      exploded: boolean;
    }
  | undefined;

export type ResolveSpecialEventInput = {
  phase: Match['cycle_phase'];
  template_id: string;
  selected_participants: Array<{
    id: string;
    display_name: string;
  }>;
  rng: SeededRng;
};

export type ResolveSpecialEventResult = {
  handled: boolean;
  eliminated_participant_ids: string[];
  narrative: SpecialEventNarrative;
};

export function resolveSpecialEvent(input: ResolveSpecialEventInput): ResolveSpecialEventResult {
  const isEarlyPedestalEscape =
    input.phase === 'bloodbath' &&
    input.template_id === SPECIAL_EVENT_RULES.early_pedestal_escape.template_id &&
    input.selected_participants.length > 0;

  if (!isEarlyPedestalEscape) {
    return {
      handled: false,
      eliminated_participant_ids: [],
      narrative: undefined
    };
  }

  const leaver = input.selected_participants[0];
  const exploded = input.rng() < SPECIAL_EVENT_RULES.early_pedestal_escape.explosion_chance;
  return {
    handled: true,
    eliminated_participant_ids: exploded ? [leaver.id] : [],
    narrative: {
      kind: 'early_pedestal_escape',
      leaver_name: leaver.display_name,
      exploded
    }
  };
}
