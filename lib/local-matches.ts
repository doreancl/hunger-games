import type { CyclePhase, EventProfile, SimulationSpeed, SurpriseLevel } from '@/lib/domain/types';

export const LOCAL_MATCHES_STORAGE_KEY = 'hunger-games.local-matches.v1';
export const MIN_ROSTER_SIZE = 10;
export const MAX_ROSTER_SIZE = 48;

export type SetupConfig = {
  roster_character_ids: string[];
  seed: string | null;
  simulation_speed: SimulationSpeed;
  event_profile: EventProfile;
  surprise_level: SurpriseLevel;
};

export type LocalMatchSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  cycle_phase: CyclePhase | 'setup';
  turn_number: number;
  alive_count: number;
  total_participants: number;
  settings: {
    seed: string | null;
    simulation_speed: SimulationSpeed;
    event_profile: EventProfile;
    surprise_level: SurpriseLevel;
  };
};

export type SetupValidation = {
  is_valid: boolean;
  issues: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCyclePhaseOrSetup(phase: unknown): phase is LocalMatchSummary['cycle_phase'] {
  return (
    phase === 'setup' ||
    phase === 'bloodbath' ||
    phase === 'day' ||
    phase === 'night' ||
    phase === 'finale'
  );
}

function isSimulationSpeed(value: unknown): value is SimulationSpeed {
  return value === '1x' || value === '2x' || value === '4x';
}

function isEventProfile(value: unknown): value is EventProfile {
  return value === 'balanced' || value === 'aggressive' || value === 'chaotic';
}

function isSurpriseLevel(value: unknown): value is SurpriseLevel {
  return value === 'low' || value === 'normal' || value === 'high';
}

function toLocalMatchSummary(raw: unknown): LocalMatchSummary | null {
  if (!isObject(raw)) {
    return null;
  }

  if (
    typeof raw.id !== 'string' ||
    typeof raw.created_at !== 'string' ||
    typeof raw.updated_at !== 'string' ||
    !isCyclePhaseOrSetup(raw.cycle_phase) ||
    typeof raw.turn_number !== 'number' ||
    typeof raw.alive_count !== 'number' ||
    typeof raw.total_participants !== 'number' ||
    !isObject(raw.settings)
  ) {
    return null;
  }

  const settings = raw.settings;
  const seed = settings.seed;
  if (
    (seed !== null && typeof seed !== 'string') ||
    !isSimulationSpeed(settings.simulation_speed) ||
    !isEventProfile(settings.event_profile) ||
    !isSurpriseLevel(settings.surprise_level)
  ) {
    return null;
  }

  return {
    id: raw.id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    cycle_phase: raw.cycle_phase,
    turn_number: raw.turn_number,
    alive_count: raw.alive_count,
    total_participants: raw.total_participants,
    settings: {
      seed,
      simulation_speed: settings.simulation_speed,
      event_profile: settings.event_profile,
      surprise_level: settings.surprise_level
    }
  };
}

export function getSetupValidation(rosterCharacterIds: string[]): SetupValidation {
  const issues: string[] = [];

  if (rosterCharacterIds.length < MIN_ROSTER_SIZE) {
    issues.push(`Selecciona al menos ${MIN_ROSTER_SIZE} personajes.`);
  }

  if (rosterCharacterIds.length > MAX_ROSTER_SIZE) {
    issues.push(`No puedes seleccionar mas de ${MAX_ROSTER_SIZE} personajes.`);
  }

  return {
    is_valid: issues.length === 0,
    issues
  };
}

export function parseLocalMatches(raw: string | null): LocalMatchSummary[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(toLocalMatchSummary)
      .filter((match): match is LocalMatchSummary => match !== null)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  } catch {
    return [];
  }
}

export function serializeLocalMatches(matches: LocalMatchSummary[]): string {
  return JSON.stringify(matches);
}

export function createLocalMatchFromSetup(
  config: SetupConfig,
  nowIso: string,
  id: string
): LocalMatchSummary {
  return {
    id,
    created_at: nowIso,
    updated_at: nowIso,
    cycle_phase: 'setup',
    turn_number: 0,
    alive_count: config.roster_character_ids.length,
    total_participants: config.roster_character_ids.length,
    settings: {
      seed: config.seed,
      simulation_speed: config.simulation_speed,
      event_profile: config.event_profile,
      surprise_level: config.surprise_level
    }
  };
}
