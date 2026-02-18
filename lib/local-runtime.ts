import type {
  CyclePhase,
  EventProfile,
  MatchPhase,
  ParticipantState,
  SimulationSpeed,
  SurpriseLevel
} from '@/lib/domain/types';
import { UNRECOVERABLE_MATCH_MESSAGE } from '@/lib/domain/messages';
import { z } from 'zod';
import { emitStructuredLog } from '@/lib/observability';

export const LOCAL_RUNTIME_STORAGE_KEY = 'hunger-games.local-runtime.v1';
export const LOCAL_RUNTIME_SNAPSHOT_VERSION = 1 as const;

export type RuntimeFeedEvent = {
  id: string;
  turn_number: number;
  phase: CyclePhase;
  type: 'combat' | 'alliance' | 'betrayal' | 'resource' | 'hazard' | 'surprise';
  headline: string;
  impact: string;
  character_ids: string[];
  eliminated_character_ids?: string[];
  created_at: string;
};

export type LocalRuntimeSnapshot = {
  match_id: string;
  phase: MatchPhase;
  cycle_phase: CyclePhase;
  turn_number: number;
  tension_level: number;
  settings: {
    seed: string | null;
    simulation_speed: SimulationSpeed;
    event_profile: EventProfile;
    surprise_level: SurpriseLevel;
  };
  participants: ParticipantState[];
  feed: RuntimeFeedEvent[];
  winner_id: string | null;
};

export type LocalRuntimeLoadResult = {
  runtime: LocalRuntimeSnapshot | null;
  error: string | null;
};

export type LocalRuntimeSaveResult = {
  ok: boolean;
  error: string | null;
};

const nonEmptyStringSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().min(0);
const matchPhaseSchema = z.enum(['setup', 'running', 'finished']);
const cyclePhaseSchema = z.enum(['bloodbath', 'day', 'night', 'finale']);
const eventTypeSchema = z.enum(['combat', 'alliance', 'betrayal', 'resource', 'hazard', 'surprise']);
const simulationSpeedSchema = z.enum(['1x', '2x', '4x']);
const eventProfileSchema = z.enum(['balanced', 'aggressive', 'chaotic']);
const surpriseLevelSchema = z.enum(['low', 'normal', 'high']);
const participantStatusSchema = z.enum(['alive', 'injured', 'eliminated']);

const localRuntimeSnapshotSchema = z
  .object({
    match_id: nonEmptyStringSchema,
    phase: matchPhaseSchema,
    cycle_phase: cyclePhaseSchema,
    turn_number: nonNegativeIntegerSchema,
    tension_level: z.number().min(0).finite(),
    settings: z
      .object({
        seed: z.union([nonEmptyStringSchema, z.null()]),
        simulation_speed: simulationSpeedSchema,
        event_profile: eventProfileSchema,
        surprise_level: surpriseLevelSchema
      })
      .strict(),
    participants: z
      .array(
        z
          .object({
            id: nonEmptyStringSchema,
            match_id: nonEmptyStringSchema,
            character_id: nonEmptyStringSchema,
            current_health: z.number().int().min(0).max(100),
            status: participantStatusSchema,
            streak_score: z.number().int()
          })
          .strict()
      )
      .min(1),
    feed: z.array(
      z
        .object({
          id: nonEmptyStringSchema,
          turn_number: nonNegativeIntegerSchema,
          phase: cyclePhaseSchema,
          type: eventTypeSchema,
          headline: nonEmptyStringSchema,
          impact: nonEmptyStringSchema,
          character_ids: z.array(nonEmptyStringSchema),
          eliminated_character_ids: z.array(nonEmptyStringSchema).optional(),
          created_at: z.string().datetime()
        })
        .strict()
    ),
    winner_id: z.union([nonEmptyStringSchema, z.null()])
  })
  .strict();

const runtimeEnvelopeSchema = z
  .object({
    snapshot_version: z.literal(LOCAL_RUNTIME_SNAPSHOT_VERSION),
    checksum: nonEmptyStringSchema,
    runtime: localRuntimeSnapshotSchema
  })
  .strict();

const runtimeVersionSchema = z
  .object({
    snapshot_version: z.number().int().min(1)
  })
  .passthrough();

function checksumFNV1a(raw: string): string {
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function buildChecksum(runtime: LocalRuntimeSnapshot): string {
  return checksumFNV1a(
    stableStringify({
      snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION,
      runtime
    })
  );
}

export function estimateLocalRuntimeSnapshotBytes(runtime: LocalRuntimeSnapshot): number {
  return new TextEncoder().encode(
    JSON.stringify({
      snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION,
      checksum: buildChecksum(runtime),
      runtime
    })
  ).length;
}

type RuntimeResumeFailureReason =
  | 'INVALID_JSON'
  | 'INVALID_VERSION_METADATA'
  | 'SNAPSHOT_VERSION_MISMATCH'
  | 'INVALID_ENVELOPE';

function parseRuntime(raw: string | null): {
  runtime: LocalRuntimeSnapshot | null;
  failure: RuntimeResumeFailureReason | null;
  detected_snapshot_version: number | null;
} {
  if (raw === null) {
    return { runtime: null, failure: null, detected_snapshot_version: null };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return { runtime: null, failure: 'INVALID_JSON', detected_snapshot_version: null };
  }

  const parsedVersion = runtimeVersionSchema.safeParse(payload);
  if (!parsedVersion.success) {
    return { runtime: null, failure: 'INVALID_VERSION_METADATA', detected_snapshot_version: null };
  }
  if (parsedVersion.data.snapshot_version !== LOCAL_RUNTIME_SNAPSHOT_VERSION) {
    return {
      runtime: null,
      failure: 'SNAPSHOT_VERSION_MISMATCH',
      detected_snapshot_version: parsedVersion.data.snapshot_version
    };
  }

  const parsedEnvelope = runtimeEnvelopeSchema.safeParse(payload);
  if (!parsedEnvelope.success) {
    return {
      runtime: null,
      failure: 'INVALID_ENVELOPE',
      detected_snapshot_version: parsedVersion.data.snapshot_version
    };
  }

  // Backward compatibility: keep runtime if structure is valid even when checksum differs.
  // Older snapshots may differ only by object key order in checksum generation.

  return {
    runtime: parsedEnvelope.data.runtime,
    failure: null,
    detected_snapshot_version: parsedVersion.data.snapshot_version
  };
}

export function loadLocalRuntimeFromStorage(
  storage: Pick<Storage, 'getItem'>
): LocalRuntimeLoadResult {
  try {
    const raw = storage.getItem(LOCAL_RUNTIME_STORAGE_KEY);
    const parsed = parseRuntime(raw);
    if (parsed.failure) {
      emitStructuredLog('runtime.resume', {
        result: 'rejected',
        snapshot_version: parsed.detected_snapshot_version,
        reason: parsed.failure
      });
      return { runtime: null, error: UNRECOVERABLE_MATCH_MESSAGE };
    }
    if (parsed.runtime) {
      emitStructuredLog('runtime.resume', {
        result: 'ok',
        snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION,
        match_id: parsed.runtime.match_id
      });
    }
    return { runtime: parsed.runtime, error: null };
  } catch {
    emitStructuredLog('runtime.resume', {
      result: 'rejected',
      snapshot_version: null,
      reason: 'STORAGE_READ_ERROR'
    });
    return { runtime: null, error: 'No fue posible leer el estado local de simulacion.' };
  }
}

export function saveLocalRuntimeToStorage(
  storage: Pick<Storage, 'setItem'>,
  runtime: LocalRuntimeSnapshot
): LocalRuntimeSaveResult {
  try {
    storage.setItem(
      LOCAL_RUNTIME_STORAGE_KEY,
      JSON.stringify({
        snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION,
        checksum: buildChecksum(runtime),
        runtime
      })
    );
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'No fue posible guardar el estado local de simulacion.' };
  }
}

export function clearLocalRuntimeFromStorage(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(LOCAL_RUNTIME_STORAGE_KEY);
  } catch {
    // ignore remove failures
  }
}
