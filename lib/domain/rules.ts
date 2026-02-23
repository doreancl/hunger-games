import { RULESET_VERSION } from '@/lib/domain/types';

export type SpecialEventRules = {
  version: string;
  early_pedestal_escape: {
    template_id: string;
    explosion_chance: number;
  };
  cornucopia_refill: {
    template_id: string;
    min_turn_number: number;
    max_alive_count: number;
    activation_weight_multiplier: number;
    elimination_chance_floor: number;
  };
  arena_escape_attempt: {
    template_id: string;
  };
};

export const SPECIAL_EVENT_RULES: SpecialEventRules = {
  version: RULESET_VERSION,
  early_pedestal_escape: {
    template_id: 'hazard-pedestal-early-exit-1',
    explosion_chance: 0.08
  },
  cornucopia_refill: {
    template_id: 'resource-cornucopia-refill-1',
    min_turn_number: 4,
    max_alive_count: 12,
    activation_weight_multiplier: 1.7,
    elimination_chance_floor: 0.55
  },
  arena_escape_attempt: {
    template_id: 'hazard-arena-escape-attempt-1'
  }
};
