import { describe, expect, it } from 'vitest';
import {
  createLocalMatchFromSetup,
  getSetupValidation,
  LOCAL_MATCHES_SNAPSHOT_VERSION,
  LOCAL_MATCHES_STORAGE_KEY,
  loadLocalMatchesFromStorage,
  parseLocalMatches,
  saveLocalMatchesToStorage,
  serializeLocalMatches
} from '@/lib/local-matches';

const ROSTER = Array.from({ length: 10 }, (_, index) => `char-${index + 1}`);

function buildSummary(id: string, updatedAt: string) {
  return {
    ...createLocalMatchFromSetup(
      {
        roster_character_ids: ROSTER,
        seed: null,
        simulation_speed: '1x',
        event_profile: 'balanced',
        surprise_level: 'normal'
      },
      '2026-02-16T10:00:00.000Z',
      id
    ),
    updated_at: updatedAt
  };
}

describe('getSetupValidation', () => {
  it('fails when roster is below minimum', () => {
    const validation = getSetupValidation(['1', '2']);
    expect(validation.is_valid).toBe(false);
    expect(validation.issues[0]).toContain('al menos 10');
  });

  it('passes when roster size is valid', () => {
    const roster = Array.from({ length: 10 }, (_, index) => `char-${index}`);
    const validation = getSetupValidation(roster);
    expect(validation).toEqual({ is_valid: true, issues: [] });
  });

  it('enforces upper bound', () => {
    const validRoster = Array.from({ length: 48 }, (_, index) => `char-${index}`);
    const invalidRoster = Array.from({ length: 49 }, (_, index) => `char-${index}`);

    expect(getSetupValidation(validRoster)).toEqual({ is_valid: true, issues: [] });
    expect(getSetupValidation(invalidRoster)).toEqual({
      is_valid: false,
      issues: ['No puedes seleccionar mas de 48 personajes.']
    });
  });

  it('rejects duplicated characters in roster', () => {
    const roster = ['char-1', 'char-2', 'char-2', 'char-3', 'char-4', 'char-5', 'char-6', 'char-7', 'char-8', 'char-9'];

    expect(getSetupValidation(roster)).toEqual({
      is_valid: false,
      issues: ['No puedes repetir personajes en el roster.']
    });
  });
});

describe('parseLocalMatches', () => {
  it('returns empty list for invalid, corrupted or legacy payloads', () => {
    expect(parseLocalMatches(null)).toEqual([]);
    expect(parseLocalMatches('{bad-json')).toEqual([]);
    expect(parseLocalMatches('[]')).toEqual([]);
    expect(parseLocalMatches('{}')).toEqual([]);
  });

  it('parses versioned snapshots and sorts by updated_at desc', () => {
    const older = buildSummary('m1', '2026-02-16T10:01:00.000Z');
    const newer = buildSummary('m2', '2026-02-16T10:05:00.000Z');

    const parsed = parseLocalMatches(serializeLocalMatches([older, newer]));
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('m2');
    expect(parsed[1].id).toBe('m1');
  });

  it('returns empty list when checksum does not match payload contents', () => {
    const envelope = JSON.parse(serializeLocalMatches([buildSummary('m1', '2026-02-16T10:01:00.000Z')])) as {
      snapshot_version: number;
      checksum: string;
      matches: Array<{
        turn_number: number;
      }>;
    };
    envelope.matches[0].turn_number = 9;

    expect(parseLocalMatches(JSON.stringify(envelope))).toEqual([]);
  });

  it('returns empty list for incompatible snapshot version', () => {
    const envelope = JSON.parse(serializeLocalMatches([buildSummary('m1', '2026-02-16T10:01:00.000Z')])) as {
      snapshot_version: number;
    };
    envelope.snapshot_version = LOCAL_MATCHES_SNAPSHOT_VERSION + 1;

    expect(parseLocalMatches(JSON.stringify(envelope))).toEqual([]);
  });
});

describe('local match serialization helpers', () => {
  it('creates setup snapshot from config', () => {
    const match = createLocalMatchFromSetup(
      {
        roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        seed: 'seed-x',
        simulation_speed: '4x',
        event_profile: 'aggressive',
        surprise_level: 'high'
      },
      '2026-02-16T10:00:00.000Z',
      'match-1'
    );

    expect(match).toEqual({
      id: 'match-1',
      created_at: '2026-02-16T10:00:00.000Z',
      updated_at: '2026-02-16T10:00:00.000Z',
      roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      cycle_phase: 'setup',
      turn_number: 0,
      alive_count: 10,
      total_participants: 10,
      settings: {
        seed: 'seed-x',
        simulation_speed: '4x',
        event_profile: 'aggressive',
        surprise_level: 'high'
      }
    });
  });

  it('serializes without losing shape', () => {
    const payload = [buildSummary('match-2', '2026-02-16T10:00:00.000Z')];

    const serialized = serializeLocalMatches(payload);
    const parsedEnvelope = JSON.parse(serialized) as {
      snapshot_version: number;
      checksum: string;
      matches: unknown[];
    };
    expect(parsedEnvelope.snapshot_version).toBe(LOCAL_MATCHES_SNAPSHOT_VERSION);
    expect(typeof parsedEnvelope.checksum).toBe('string');
    expect(parsedEnvelope.checksum.length).toBeGreaterThan(0);
    expect(parsedEnvelope.matches).toHaveLength(1);

    expect(parseLocalMatches(serialized)).toEqual(payload);
  });
});

describe('local storage safety helpers', () => {
  it('handles read errors', () => {
    const storage = {
      getItem() {
        throw new Error('blocked');
      }
    };

    expect(loadLocalMatchesFromStorage(storage)).toEqual({
      matches: [],
      error: 'No fue posible leer partidas locales en este navegador.'
    });
  });

  it('handles write errors', () => {
    const storage = {
      setItem() {
        throw new Error('quota');
      }
    };
    const payload = [
      createLocalMatchFromSetup(
        {
          roster_character_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
          seed: null,
          simulation_speed: '1x',
          event_profile: 'balanced',
          surprise_level: 'normal'
        },
        '2026-02-16T10:00:00.000Z',
        'match-write'
      )
    ];

    expect(saveLocalMatchesToStorage(storage, payload)).toEqual({
      ok: false,
      error: 'No fue posible guardar la partida en este navegador.'
    });
  });

  it('returns unrecoverable message when snapshot is corrupted', () => {
    const storage = {
      getItem(key: string) {
        if (key === LOCAL_MATCHES_STORAGE_KEY) {
          return '{bad-json';
        }
        return null;
      }
    };

    expect(loadLocalMatchesFromStorage(storage)).toEqual({
      matches: [],
      error: 'partida no recuperable. Inicia una nueva partida.'
    });
  });

  it('returns unrecoverable message when snapshot version is incompatible', () => {
    const storage = {
      getItem(key: string) {
        if (key === LOCAL_MATCHES_STORAGE_KEY) {
          return JSON.stringify({
            snapshot_version: LOCAL_MATCHES_SNAPSHOT_VERSION + 1,
            checksum: '00000000',
            matches: []
          });
        }
        return null;
      }
    };

    expect(loadLocalMatchesFromStorage(storage)).toEqual({
      matches: [],
      error: 'partida no recuperable. Inicia una nueva partida.'
    });
  });

  it('loads valid snapshots from storage', () => {
    const newer = buildSummary('m2', '2026-02-16T10:05:00.000Z');
    const older = buildSummary('m1', '2026-02-16T10:01:00.000Z');
    const storage = {
      getItem(key: string) {
        if (key === LOCAL_MATCHES_STORAGE_KEY) {
          return serializeLocalMatches([older, newer]);
        }
        return null;
      }
    };

    expect(loadLocalMatchesFromStorage(storage)).toEqual({
      matches: [newer, older],
      error: null
    });
  });
});
