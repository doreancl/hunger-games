import { describe, expect, it } from 'vitest';
import {
  MAX_SNAPSHOT_REQUEST_BYTES,
  validateSnapshotEnvelopeFromRawBody
} from '@/lib/api/snapshot-request';
import { buildSnapshotChecksum } from '@/lib/domain/snapshot-checksum';
import { RULESET_VERSION, SNAPSHOT_VERSION, type MatchSnapshot } from '@/lib/domain/types';

function buildSnapshot(): MatchSnapshot {
  return {
    snapshot_version: SNAPSHOT_VERSION,
    ruleset_version: RULESET_VERSION,
    match: {
      id: 'match-1',
      seed: 'seed-1',
      ruleset_version: RULESET_VERSION,
      phase: 'running',
      cycle_phase: 'day',
      turn_number: 3,
      tension_level: 40,
      created_at: '2026-02-18T00:00:00.000Z',
      ended_at: null
    },
    settings: {
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed: 'seed-1'
    },
    participants: [
      {
        id: 'p1',
        match_id: 'match-1',
        character_id: 'char-1',
        display_name: 'char-1',
        current_health: 100,
        status: 'alive',
        streak_score: 0
      }
    ],
    recent_events: []
  };
}

describe('validateSnapshotEnvelopeFromRawBody', () => {
  it('rejects invalid JSON payloads', () => {
    const result = validateSnapshotEnvelopeFromRawBody('{invalid-json');

    expect(result).toEqual({ ok: false, reason: 'INVALID_JSON' });
  });

  it('rejects unsupported snapshot version before deep payload parsing', () => {
    const result = validateSnapshotEnvelopeFromRawBody(
      JSON.stringify({ snapshot_version: SNAPSHOT_VERSION + 1 })
    );

    expect(result).toEqual({ ok: false, reason: 'SNAPSHOT_VERSION_UNSUPPORTED' });
  });

  it('returns validation issues for malformed envelope payload', () => {
    const result = validateSnapshotEnvelopeFromRawBody(
      JSON.stringify({
        snapshot_version: SNAPSHOT_VERSION,
        checksum: 'abcd1234'
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID_REQUEST_PAYLOAD');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.issues?.some((issue) => issue.path.join('.') === 'snapshot')).toBe(true);
    }
  });

  it('returns validation issues when envelope and snapshot versions mismatch', () => {
    const snapshot = buildSnapshot();
    const result = validateSnapshotEnvelopeFromRawBody(
      JSON.stringify({
        snapshot_version: SNAPSHOT_VERSION,
        checksum: buildSnapshotChecksum(snapshot),
        snapshot: {
          ...snapshot,
          snapshot_version: SNAPSHOT_VERSION + 1
        }
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID_REQUEST_PAYLOAD');
      expect(
        result.issues?.some((issue) => issue.path.join('.') === 'snapshot.snapshot_version')
      ).toBe(true);
    }
  });

  it('rejects checksum mismatches', () => {
    const snapshot = buildSnapshot();
    const result = validateSnapshotEnvelopeFromRawBody(
      JSON.stringify({
        snapshot_version: SNAPSHOT_VERSION,
        checksum: '00000000',
        snapshot
      })
    );

    expect(result).toEqual({ ok: false, reason: 'SNAPSHOT_INVALID' });
  });

  it('accepts uppercase checksum values when checksum content is valid', () => {
    const snapshot = buildSnapshot();
    const checksum = buildSnapshotChecksum(snapshot).toUpperCase();
    const result = validateSnapshotEnvelopeFromRawBody(
      JSON.stringify({
        snapshot_version: SNAPSHOT_VERSION,
        checksum,
        snapshot
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.match.id).toBe('match-1');
    }
  });

  it('rejects payload larger than max request bytes', () => {
    const oversizedBody = 'x'.repeat(MAX_SNAPSHOT_REQUEST_BYTES + 1);
    const result = validateSnapshotEnvelopeFromRawBody(oversizedBody);

    expect(result).toEqual({ ok: false, reason: 'SNAPSHOT_INVALID' });
  });
});
