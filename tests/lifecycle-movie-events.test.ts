import { describe, expect, it } from 'vitest';
import { buildContextualTurnCatalog, isCornucopiaRefillEligible } from '@/lib/matches/lifecycle';

describe('movie-inspired turn event catalog', () => {
  it('enables cornucopia refill only when configured turn/alive thresholds are met', () => {
    expect(isCornucopiaRefillEligible(3, 12)).toBe(false);
    expect(isCornucopiaRefillEligible(4, 13)).toBe(false);
    expect(isCornucopiaRefillEligible(4, 12)).toBe(true);
  });

  it('includes cinematic templates and gates cornucopia refill before threshold', () => {
    const earlyCatalog = buildContextualTurnCatalog(2, 20);
    const enabledCatalog = buildContextualTurnCatalog(6, 10);

    expect(earlyCatalog.some((template) => template.id === 'resource-cornucopia-refill-1')).toBe(false);
    expect(enabledCatalog.some((template) => template.id === 'resource-cornucopia-refill-1')).toBe(true);
    expect(enabledCatalog.some((template) => template.id === 'hazard-arena-escape-attempt-1')).toBe(true);
    expect(enabledCatalog.some((template) => template.id === 'hazard-toxic-fog-1')).toBe(true);
    expect(enabledCatalog.some((template) => template.id === 'surprise-muttation-hunt-1')).toBe(true);
  });
});
