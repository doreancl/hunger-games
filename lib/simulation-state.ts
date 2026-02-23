export type MatchState = {
  id: string;
  turn: number;
  active: boolean;
};

import type { EventType, OperationalCyclePhase } from '@/lib/domain/types';

const MAX_MULTI_PARTICIPANT_CHANCE = 0.02;
const DEFAULT_SEEDED_RNG_SEED = 'hunger-games-default-seed';

export type SeededRng = () => number;

export type DirectorState = {
  turn_number: number;
  cycle_phase: OperationalCyclePhase;
  alive_count: number;
  tension_level: number;
};

export type EventTemplate = {
  id: string;
  type: EventType;
  base_weight: number;
  phases: OperationalCyclePhase[];
};

function normalizeSeed(seed: string | null | undefined): string {
  if (typeof seed !== 'string') {
    return DEFAULT_SEEDED_RNG_SEED;
  }

  const normalizedSeed = seed.trim();
  return normalizedSeed === '' ? DEFAULT_SEEDED_RNG_SEED : normalizedSeed;
}

export function createSeededRng(seed: string | null | undefined): SeededRng {
  const normalizedSeed = normalizeSeed(seed);
  let hash = 1779033703 ^ normalizedSeed.length;
  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = Math.imul(hash ^ normalizedSeed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function nextCyclePhase(turnNumber: number, aliveCount: number): OperationalCyclePhase {
  if (turnNumber === 0) {
    return 'bloodbath';
  }

  if (aliveCount <= 2) {
    return 'finale';
  }

  return turnNumber % 2 === 1 ? 'day' : 'night';
}

export function nextTensionLevel(
  currentTension: number,
  hadElimination: boolean,
  aliveCount: number
): number {
  const baseDelta = hadElimination ? -8 : 7;
  const finalePressure = aliveCount <= 6 ? 5 : 0;
  return clamp(currentTension + baseDelta + finalePressure, 0, 100);
}

export function advanceDirector(
  state: DirectorState,
  hadElimination: boolean,
  nextAliveCount: number
): DirectorState {
  const nextTurnNumber = state.turn_number + 1;
  return {
    turn_number: nextTurnNumber,
    cycle_phase: nextCyclePhase(nextTurnNumber, nextAliveCount),
    alive_count: nextAliveCount,
    tension_level: nextTensionLevel(state.tension_level, hadElimination, nextAliveCount)
  };
}

export function sampleParticipantCount(aliveCount: number, rng: SeededRng): number {
  if (aliveCount <= 2) {
    return aliveCount;
  }

  const maxK = Math.min(6, aliveCount);
  const chancePerK: Record<number, number> = {};
  let usedChance = 0;

  for (let k = 3; k <= maxK; k += 1) {
    const chance = 0.01 * Math.pow(0.5, k - 3);
    chancePerK[k] = chance;
    usedChance += chance;
  }

  const roll = rng();
  if (roll >= usedChance || usedChance > MAX_MULTI_PARTICIPANT_CHANCE) {
    return 2;
  }

  let cumulative = 0;
  for (let k = 3; k <= maxK; k += 1) {
    cumulative += chancePerK[k];
    if (roll < cumulative) {
      return k;
    }
  }

  return 2;
}

function countRecentAppearances(recentTemplateIds: string[], templateId: string): number {
  return recentTemplateIds.filter((id) => id === templateId).length;
}

function countRecentTypeAppearances(
  recentTemplateIds: string[],
  templateType: EventType,
  templateById: Map<string, EventTemplate>
): number {
  let typeCount = 0;
  for (const templateId of recentTemplateIds) {
    const template = templateById.get(templateId);
    if (template?.type === templateType) {
      typeCount += 1;
    }
  }

  return typeCount;
}

export function selectCatalogEvent(
  templates: EventTemplate[],
  phase: OperationalCyclePhase,
  recentTemplateIds: string[],
  rng: SeededRng,
  repeatCap = 2
): EventTemplate {
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const phaseCandidates = templates.filter((template) => template.phases.includes(phase));
  if (phaseCandidates.length === 0) {
    throw new Error(`No event templates available for phase "${phase}"`);
  }

  const scoredCandidates = phaseCandidates
    .map((template) => {
      const recentAppearances = countRecentAppearances(recentTemplateIds, template.id);
      const recentTypeAppearances = countRecentTypeAppearances(
        recentTemplateIds,
        template.type,
        templateById
      );
      const weight =
        recentAppearances >= repeatCap || recentTypeAppearances >= repeatCap
          ? 0
          : template.base_weight / ((1 + recentAppearances * 2) * (1 + recentTypeAppearances * 3));

      return { template, weight, recentAppearances, recentTypeAppearances };
    });

  const weightedCandidates = scoredCandidates
    .filter((candidate) => candidate.weight > 0)
    .map((candidate) => ({ template: candidate.template, weight: candidate.weight }));

  let selectableCandidates = weightedCandidates;
  if (selectableCandidates.length === 0) {
    const minTypeAppearances = Math.min(
      ...scoredCandidates.map((candidate) => candidate.recentTypeAppearances)
    );
    const leastRepeatedTypes = scoredCandidates.filter(
      (candidate) => candidate.recentTypeAppearances === minTypeAppearances
    );
    const minTemplateAppearances = Math.min(
      ...leastRepeatedTypes.map((candidate) => candidate.recentAppearances)
    );
    const leastRepeatedTemplates = leastRepeatedTypes.filter(
      (candidate) => candidate.recentAppearances === minTemplateAppearances
    );

    selectableCandidates = leastRepeatedTemplates.map((candidate) => ({
      template: candidate.template,
      weight: candidate.template.base_weight > 0 ? candidate.template.base_weight : 1
    }));
  }

  const totalWeight = selectableCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = rng() * totalWeight;
  let cumulative = 0;

  for (const candidate of selectableCandidates) {
    cumulative += candidate.weight;
    if (roll <= cumulative) {
      return candidate.template;
    }
  }

  return selectableCandidates[selectableCandidates.length - 1].template;
}

export function nextTurn(state: MatchState): MatchState {
  if (!state.active) {
    return state;
  }

  return {
    ...state,
    turn: state.turn + 1
  };
}

export function canResumeFromLocalStorage(raw: string | null): boolean {
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MatchState>;
    const hasValidId = typeof parsed.id === 'string' && parsed.id.trim().length > 0;
    const hasValidTurn =
      typeof parsed.turn === 'number' &&
      Number.isInteger(parsed.turn) &&
      Number.isFinite(parsed.turn) &&
      parsed.turn >= 0;

    return (
      hasValidId &&
      hasValidTurn &&
      typeof parsed.active === 'boolean'
    );
  } catch {
    return false;
  }
}
