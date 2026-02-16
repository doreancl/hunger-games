export type MatchState = {
  id: string;
  turn: number;
  active: boolean;
};

import type { CyclePhase, EventType } from '@/lib/domain/types';

const MAX_MULTI_PARTICIPANT_CHANCE = 0.02;

export type SeededRng = () => number;

export type DirectorState = {
  turn_number: number;
  cycle_phase: CyclePhase;
  alive_count: number;
  tension_level: number;
};

export type EventTemplate = {
  id: string;
  type: EventType;
  base_weight: number;
  phases: CyclePhase[];
};

export function createSeededRng(seed: string): SeededRng {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
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

export function nextCyclePhase(turnNumber: number, aliveCount: number): CyclePhase {
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

export function selectCatalogEvent(
  templates: EventTemplate[],
  phase: CyclePhase,
  recentTemplateIds: string[],
  rng: SeededRng,
  repeatCap = 2
): EventTemplate {
  const weightedCandidates = templates
    .filter((template) => template.phases.includes(phase))
    .map((template) => {
      const recentAppearances = countRecentAppearances(recentTemplateIds, template.id);
      const allowedWeight =
        recentAppearances >= repeatCap
          ? 0
          : template.base_weight / (1 + recentAppearances * 2);
      return { template, weight: allowedWeight };
    })
    .filter((candidate) => candidate.weight > 0);

  if (weightedCandidates.length === 0) {
    throw new Error(`No event templates available for phase "${phase}"`);
  }

  const totalWeight = weightedCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = rng() * totalWeight;
  let cumulative = 0;

  for (const candidate of weightedCandidates) {
    cumulative += candidate.weight;
    if (roll <= cumulative) {
      return candidate.template;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].template;
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
    return (
      typeof parsed.id === 'string' &&
      typeof parsed.turn === 'number' &&
      typeof parsed.active === 'boolean'
    );
  } catch {
    return false;
  }
}
