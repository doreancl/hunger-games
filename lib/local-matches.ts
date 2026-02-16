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
  roster_character_ids: string[];
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

export type LocalMatchesLoadResult = {
  matches: LocalMatchSummary[];
  error: string | null;
};

export type LocalMatchesSaveResult = {
  ok: boolean;
  error: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isValidIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString() === value;
}

function isRosterCharacterIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= MIN_ROSTER_SIZE &&
    value.length <= MAX_ROSTER_SIZE &&
    value.every((characterId) => isNonEmptyString(characterId))
  );
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
    !isNonEmptyString(raw.id) ||
    !isValidIsoDateString(raw.created_at) ||
    !isValidIsoDateString(raw.updated_at) ||
    !isRosterCharacterIds(raw.roster_character_ids) ||
    !isCyclePhaseOrSetup(raw.cycle_phase) ||
    !isNonNegativeInteger(raw.turn_number) ||
    !isNonNegativeInteger(raw.alive_count) ||
    !isNonNegativeInteger(raw.total_participants) ||
    raw.alive_count > raw.total_participants ||
    raw.total_participants !== raw.roster_character_ids.length ||
    !isObject(raw.settings)
  ) {
    return null;
  }

  const settings = raw.settings;
  const seed = settings.seed;
  if (
    (seed !== null && !isNonEmptyString(seed)) ||
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
    roster_character_ids: raw.roster_character_ids,
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
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
  } catch {
    return [];
  }
}

export function serializeLocalMatches(matches: LocalMatchSummary[]): string {
  return JSON.stringify(matches);
}

export function loadLocalMatchesFromStorage(
  storage: Pick<Storage, 'getItem'>
): LocalMatchesLoadResult {
  try {
    return {
      matches: parseLocalMatches(storage.getItem(LOCAL_MATCHES_STORAGE_KEY)),
      error: null
    };
  } catch {
    return {
      matches: [],
      error: 'No fue posible leer partidas locales en este navegador.'
    };
  }
}

export function saveLocalMatchesToStorage(
  storage: Pick<Storage, 'setItem'>,
  matches: LocalMatchSummary[]
): LocalMatchesSaveResult {
  try {
    storage.setItem(LOCAL_MATCHES_STORAGE_KEY, serializeLocalMatches(matches));
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: 'No fue posible guardar la partida en este navegador.'
    };
  }
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
    roster_character_ids: [...config.roster_character_ids],
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
