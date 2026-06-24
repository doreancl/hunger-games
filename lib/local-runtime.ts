import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { snapshotEnvelopeSchema } from '@/lib/domain/schemas';
import { type MatchSnapshot, type SnapshotEnvelope } from '@/lib/domain/types';
import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';
import { UNRECOVERABLE_MATCH_MESSAGE } from '@/lib/domain/messages';
import { z } from 'zod';
import { emitStructuredLog } from '@/lib/observability';

export const LOCAL_RUNTIME_STORAGE_KEY = 'hunger-games.local-runtime.v1';
export const LOCAL_RUNTIME_SNAPSHOT_VERSION = 2 as const;

export type RuntimeFeedEvent = {
  id: string;
  turn_number: number;
  phase: 'bloodbath' | 'day' | 'night' | 'finale' | 'god_mode';
  type: 'combat' | 'alliance' | 'betrayal' | 'resource' | 'hazard' | 'surprise';
  headline: string;
  impact: string;
  character_ids: string[];
  eliminated_character_ids?: string[];
  created_at: string;
};

export type LocalRuntimeSnapshot = {
  snapshot_envelope: SnapshotEnvelope;
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
const phaseSchema = z.enum(['bloodbath', 'day', 'night', 'finale', 'god_mode']);
const eventTypeSchema = z.enum(['combat', 'alliance', 'betrayal', 'resource', 'hazard', 'surprise']);

const localRuntimeFeedEventSchema = z
  .object({
    id: nonEmptyStringSchema,
    turn_number: nonNegativeIntegerSchema,
    phase: phaseSchema,
    type: eventTypeSchema,
    headline: nonEmptyStringSchema,
    impact: nonEmptyStringSchema,
    character_ids: z.array(nonEmptyStringSchema),
    eliminated_character_ids: z.array(nonEmptyStringSchema).optional(),
    created_at: z.string().datetime()
  })
  .strict();

const localRuntimeSnapshotSchema = z
  .object({
    snapshot_envelope: snapshotEnvelopeSchema,
    feed: z.array(localRuntimeFeedEventSchema),
    winner_id: z.union([nonEmptyStringSchema, z.null()])
  })
  .strict();

const runtimeEnvelopeSchema = z
  .object({
    snapshot_version: z.literal(LOCAL_RUNTIME_SNAPSHOT_VERSION),
    checksum: z.string().regex(/^[a-f0-9]{8}$/i, 'checksum must be 8 hex chars'),
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

function canonicalSnapshotEnvelopeIsValid(envelope: SnapshotEnvelope): boolean {
  return buildSnapshotChecksum(envelope.snapshot) === envelope.checksum.toLowerCase();
}

export function buildLocalRuntimeEnvelope(
  snapshot: MatchSnapshot,
  winnerId: string | null = null
): LocalRuntimeSnapshot {
  return {
    snapshot_envelope: {
      snapshot_version: SNAPSHOT_VERSION,
      checksum: buildSnapshotChecksum(snapshot),
      snapshot
    },
    feed: [],
    winner_id: winnerId
  };
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
  | 'INVALID_ENVELOPE'
  | 'INVALID_CHECKSUM';

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

  if (!canonicalSnapshotEnvelopeIsValid(parsedEnvelope.data.runtime.snapshot_envelope)) {
    return {
      runtime: null,
      failure: 'INVALID_CHECKSUM',
      detected_snapshot_version: parsedVersion.data.snapshot_version
    };
  }

  const expectedChecksum = buildChecksum(parsedEnvelope.data.runtime);
  if (expectedChecksum !== parsedEnvelope.data.checksum.toLowerCase()) {
    return {
      runtime: null,
      failure: 'INVALID_CHECKSUM',
      detected_snapshot_version: parsedVersion.data.snapshot_version
    };
  }

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
        match_id: parsed.runtime.snapshot_envelope.snapshot.match.id
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
