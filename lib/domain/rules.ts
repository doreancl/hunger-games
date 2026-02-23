import { RULESET_VERSION } from '@/lib/domain/types';

export type SpecialEventRules = {
  version: string;
  early_pedestal_escape: {
    template_id: string;
    explosion_chance: number;
  };
};

export const SPECIAL_EVENT_RULES: SpecialEventRules = {
  version: RULESET_VERSION,
  early_pedestal_escape: {
    template_id: 'hazard-pedestal-early-exit-1',
    explosion_chance: 0.08
  }
};
