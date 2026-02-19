import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalRuntimeFromStorage,
  estimateLocalRuntimeSnapshotBytes,
  LOCAL_RUNTIME_SNAPSHOT_VERSION,
  LOCAL_RUNTIME_STORAGE_KEY,
  loadLocalRuntimeFromStorage,
  saveLocalRuntimeToStorage,
  type LocalRuntimeSnapshot
} from '@/lib/local-runtime';

function buildRuntime(): LocalRuntimeSnapshot {
  return {
    match_id: 'match-1',
    phase: 'running',
    cycle_phase: 'day',
    turn_number: 3,
    tension_level: 40,
    settings: {
      seed: 'seed-1',
      simulation_speed: '2x',
      event_profile: 'balanced',
      surprise_level: 'normal'
    },
    participants: [
      {
        id: 'p1',
        match_id: 'match-1',
        character_id: 'char-01',
        display_name: 'Atlas',
        current_health: 92,
        status: 'alive',
        streak_score: 1
      }
    ],
    feed: [
      {
        id: 'evt-1',
        turn_number: 3,
        phase: 'day',
        type: 'combat',
        headline: 'Atlas y Nova chocan',
        impact: 'Impacto alto',
        character_ids: ['char-01', 'char-02'],
        created_at: '2026-02-18T12:00:00.000Z'
      }
    ],
    winner_id: null
  };
}

describe('local runtime storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and loads runtime snapshot', () => {
    let persisted: string | null = null;
    const runtime = buildRuntime();
    const storage = {
      setItem(_key: string, value: string) {
        persisted = value;
      },
      getItem(_key: string) {
        return persisted;
      }
    };

    expect(saveLocalRuntimeToStorage(storage, runtime)).toEqual({ ok: true, error: null });
    expect(loadLocalRuntimeFromStorage(storage)).toEqual({ runtime, error: null });
  });

  it('returns unrecoverable message for corrupted payload', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const storage = {
      getItem(key: string) {
        if (key === LOCAL_RUNTIME_STORAGE_KEY) {
          return '{bad-json';
        }
        return null;
      }
    };

    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime: null,
      error: 'partida no recuperable. Inicia una nueva partida.'
    });
    const lastLog = JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string) as Record<string, unknown>;
    expect(lastLog.event).toBe('runtime.resume');
    expect(lastLog.result).toBe('rejected');
    expect(lastLog.reason).toBe('INVALID_JSON');
  });

  it('returns unrecoverable message for incompatible version', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const storage = {
      getItem() {
        return JSON.stringify({
          snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION + 1,
          checksum: 'x',
          runtime: {}
        });
      }
    };

    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime: null,
      error: 'partida no recuperable. Inicia una nueva partida.'
    });
    const lastLog = JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string) as Record<string, unknown>;
    expect(lastLog.event).toBe('runtime.resume');
    expect(lastLog.result).toBe('rejected');
    expect(lastLog.reason).toBe('SNAPSHOT_VERSION_MISMATCH');
    expect(lastLog.snapshot_version).toBe(LOCAL_RUNTIME_SNAPSHOT_VERSION + 1);
  });

  it('loads snapshot when tension_level is above 100 for compatibility', () => {
    const runtime: LocalRuntimeSnapshot = {
      ...buildRuntime(),
      tension_level: 130
    };
    let persisted: string | null = null;
    const storage = {
      setItem(_key: string, value: string) {
        persisted = value;
      },
      getItem() {
        return persisted;
      }
    };

    saveLocalRuntimeToStorage(storage, runtime);
    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime,
      error: null
    });
  });

  it('loads runtime saved with non-canonical settings key order', () => {
    const runtime = {
      ...buildRuntime(),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '2x',
        seed: 'seed-1'
      }
    } as LocalRuntimeSnapshot;
    let persisted: string | null = null;
    const storage = {
      setItem(_key: string, value: string) {
        persisted = value;
      },
      getItem() {
        return persisted;
      }
    };

    saveLocalRuntimeToStorage(storage, runtime);
    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime,
      error: null
    });
  });

  it('loads runtime when checksum is invalid but payload shape is valid', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const runtime = buildRuntime();
    const storage = {
      getItem() {
        return JSON.stringify({
          snapshot_version: LOCAL_RUNTIME_SNAPSHOT_VERSION,
          checksum: '00000000',
          runtime
        });
      }
    };

    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime,
      error: null
    });
    const lastLog = JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string) as Record<string, unknown>;
    expect(lastLog.event).toBe('runtime.resume');
    expect(lastLog.result).toBe('ok');
    expect(lastLog.snapshot_version).toBe(LOCAL_RUNTIME_SNAPSHOT_VERSION);
  });

  it('loads runtime with replay elimination trace metadata', () => {
    const runtime: LocalRuntimeSnapshot = {
      ...buildRuntime(),
      feed: [
        {
          ...buildRuntime().feed[0],
          eliminated_character_ids: ['char-02']
        }
      ]
    };
    let persisted: string | null = null;
    const storage = {
      setItem(_key: string, value: string) {
        persisted = value;
      },
      getItem() {
        return persisted;
      }
    };

    saveLocalRuntimeToStorage(storage, runtime);
    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime,
      error: null
    });
  });

  it('returns read error when storage throws', () => {
    const storage = {
      getItem() {
        throw new Error('blocked');
      }
    };

    expect(loadLocalRuntimeFromStorage(storage)).toEqual({
      runtime: null,
      error: 'No fue posible leer el estado local de simulacion.'
    });
  });

  it('returns save error when storage throws', () => {
    const storage = {
      setItem() {
        throw new Error('quota');
      }
    };

    expect(saveLocalRuntimeToStorage(storage, buildRuntime())).toEqual({
      ok: false,
      error: 'No fue posible guardar el estado local de simulacion.'
    });
  });

  it('clears stored runtime key', () => {
    let removedKey = '';
    clearLocalRuntimeFromStorage({
      removeItem(key: string) {
        removedKey = key;
      }
    });

    expect(removedKey).toBe(LOCAL_RUNTIME_STORAGE_KEY);
  });

  it('does not throw when clear fails', () => {
    expect(() =>
      clearLocalRuntimeFromStorage({
        removeItem() {
          throw new Error('blocked');
        }
      })
    ).not.toThrow();
  });

  it('estimates snapshot size in bytes', () => {
    const bytes = estimateLocalRuntimeSnapshotBytes(buildRuntime());
    expect(bytes).toBeGreaterThan(100);
  });
});
