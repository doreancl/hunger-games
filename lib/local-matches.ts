import type { CyclePhase, EventProfile, SimulationSpeed, SurpriseLevel } from '@/lib/domain/types';
import { UNRECOVERABLE_MATCH_MESSAGE } from '@/lib/domain/messages';
import { z } from 'zod';

export const LOCAL_MATCHES_STORAGE_KEY = 'hunger-games.local-matches.v1';
export const LOCAL_MATCHES_SNAPSHOT_VERSION = 1 as const;
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

type LocalMatchesParseFailure = 'corrupted' | 'incompatible';

type LocalMatchesParseResult = {
  matches: LocalMatchSummary[];
  failure: LocalMatchesParseFailure | null;
};

const nonEmptyStringSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().min(0);
const cyclePhaseOrSetupSchema = z.enum(['setup', 'bloodbath', 'day', 'night', 'finale']);
const simulationSpeedSchema = z.enum(['1x', '2x', '4x']);
const eventProfileSchema = z.enum(['balanced', 'aggressive', 'chaotic']);
const surpriseLevelSchema = z.enum(['low', 'normal', 'high']);
const localMatchSettingsSchema = z
  .object({
    seed: z.union([nonEmptyStringSchema, z.null()]),
    simulation_speed: simulationSpeedSchema,
    event_profile: eventProfileSchema,
    surprise_level: surpriseLevelSchema
  })
  .strict();
const localMatchSummarySchema = z
  .object({
    id: nonEmptyStringSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    roster_character_ids: z.array(nonEmptyStringSchema).min(MIN_ROSTER_SIZE).max(MAX_ROSTER_SIZE),
    cycle_phase: cyclePhaseOrSetupSchema,
    turn_number: nonNegativeIntegerSchema,
    alive_count: nonNegativeIntegerSchema,
    total_participants: nonNegativeIntegerSchema,
    settings: localMatchSettingsSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.alive_count > value.total_participants) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'alive_count must be <= total_participants',
        path: ['alive_count']
      });
    }
    if (value.total_participants !== value.roster_character_ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'total_participants must match roster_character_ids length',
        path: ['total_participants']
      });
    }
  });

const localMatchesSnapshotEnvelopeSchema = z
  .object({
    snapshot_version: z.literal(LOCAL_MATCHES_SNAPSHOT_VERSION),
    checksum: nonEmptyStringSchema,
    matches: z.array(localMatchSummarySchema)
  })
  .strict();

const localMatchesSnapshotVersionSchema = z
  .object({
    snapshot_version: z.number().int().min(1)
  })
  .passthrough();

type LocalMatchesSnapshotEnvelope = z.infer<typeof localMatchesSnapshotEnvelopeSchema>;

function sortMatchesByUpdatedAt(matches: LocalMatchSummary[]): LocalMatchSummary[] {
  return matches.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
}

function checksumFNV1a(raw: string): string {
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildSnapshotChecksum(
  snapshotVersion: typeof LOCAL_MATCHES_SNAPSHOT_VERSION,
  matches: LocalMatchSummary[]
): string {
  return checksumFNV1a(
    JSON.stringify({
      snapshot_version: snapshotVersion,
      matches
    })
  );
}

function buildSnapshotEnvelope(matches: LocalMatchSummary[]): LocalMatchesSnapshotEnvelope {
  const checksum = buildSnapshotChecksum(LOCAL_MATCHES_SNAPSHOT_VERSION, matches);
  return {
    snapshot_version: LOCAL_MATCHES_SNAPSHOT_VERSION,
    checksum,
    matches
  };
}

function parseLocalMatchesWithDiagnostics(raw: string | null): LocalMatchesParseResult {
  if (raw === null) {
    return {
      matches: [],
      failure: null
    };
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return {
      matches: [],
      failure: 'corrupted'
    };
  }

  const parsedVersion = localMatchesSnapshotVersionSchema.safeParse(payload);
  if (!parsedVersion.success) {
    return {
      matches: [],
      failure: 'incompatible'
    };
  }

  if (parsedVersion.data.snapshot_version !== LOCAL_MATCHES_SNAPSHOT_VERSION) {
    return {
      matches: [],
      failure: 'incompatible'
    };
  }

  const parsedEnvelope = localMatchesSnapshotEnvelopeSchema.safeParse(payload);
  if (!parsedEnvelope.success) {
    return {
      matches: [],
      failure: 'corrupted'
    };
  }

  const expectedChecksum = buildSnapshotChecksum(
    parsedEnvelope.data.snapshot_version,
    parsedEnvelope.data.matches
  );
  if (expectedChecksum !== parsedEnvelope.data.checksum) {
    return {
      matches: [],
      failure: 'corrupted'
    };
  }

  return {
    matches: sortMatchesByUpdatedAt([...parsedEnvelope.data.matches]),
    failure: null
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
  return parseLocalMatchesWithDiagnostics(raw).matches;
}

export function serializeLocalMatches(matches: LocalMatchSummary[]): string {
  return JSON.stringify(buildSnapshotEnvelope(matches));
}

export function loadLocalMatchesFromStorage(
  storage: Pick<Storage, 'getItem'>
): LocalMatchesLoadResult {
  try {
    const parsed = parseLocalMatchesWithDiagnostics(storage.getItem(LOCAL_MATCHES_STORAGE_KEY));
    if (parsed.failure) {
      return {
        matches: [],
        error: UNRECOVERABLE_MATCH_MESSAGE
      };
    }

    return {
      matches: parsed.matches,
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
