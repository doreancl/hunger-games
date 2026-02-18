import {
  snapshotEnvelopeSchema,
  snapshotEnvelopeVersionSchema
} from '@/lib/domain/schemas';
import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { SNAPSHOT_VERSION } from '@/lib/domain/types';
import type { MatchSnapshot } from '@/lib/domain/types';
import type { ZodIssue } from 'zod';

export const MAX_SNAPSHOT_REQUEST_BYTES = 262_144;

type SnapshotRequestValidation =
  | { ok: true; snapshot: MatchSnapshot }
  | {
      ok: false;
      reason:
        | 'INVALID_JSON'
        | 'SNAPSHOT_VERSION_UNSUPPORTED'
        | 'SNAPSHOT_INVALID'
        | 'INVALID_REQUEST_PAYLOAD';
      issues?: ZodIssue[];
    };

export function validateSnapshotEnvelopeFromRawBody(rawBody: string): SnapshotRequestValidation {
  if (new TextEncoder().encode(rawBody).length > MAX_SNAPSHOT_REQUEST_BYTES) {
    return { ok: false, reason: 'SNAPSHOT_INVALID' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return { ok: false, reason: 'INVALID_JSON' };
  }

  const parsedVersion = snapshotEnvelopeVersionSchema.safeParse(payload);
  if (!parsedVersion.success || parsedVersion.data.snapshot_version !== SNAPSHOT_VERSION) {
    return { ok: false, reason: 'SNAPSHOT_VERSION_UNSUPPORTED' };
  }

  const parsed = snapshotEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, reason: 'INVALID_REQUEST_PAYLOAD', issues: parsed.error.issues };
  }

  if (buildSnapshotChecksum(parsed.data.snapshot) !== parsed.data.checksum.toLowerCase()) {
    return { ok: false, reason: 'SNAPSHOT_INVALID' };
  }

  return { ok: true, snapshot: parsed.data.snapshot };
}
