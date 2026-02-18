import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CreateMatchRequest } from '@/lib/domain/types';

async function loadLifecycleModule() {
  return import('@/lib/matches/lifecycle');
}

describe('lifecycle persistence', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'hg-matches-'));
  const storeFile = join(tempRoot, 'matches-store.json');

  afterEach(async () => {
    vi.resetModules();
    delete process.env.MATCHES_STORE_FILE;
    const lifecycle = await loadLifecycleModule();
    lifecycle.resetMatchesForTests();
  });

  it('keeps match state after module reload when store file is configured', async () => {
    process.env.MATCHES_STORE_FILE = storeFile;
    vi.resetModules();
    let lifecycle = await loadLifecycleModule();

    const createPayload: CreateMatchRequest = {
      roster_character_ids: Array.from({ length: 10 }, (_, index) => `char-${index + 1}`),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: 'persist-seed'
      }
    };

    const created = lifecycle.createMatch(createPayload);
    const started = lifecycle.startMatch(created.match_id);
    expect(started.ok).toBe(true);

    const advanced = lifecycle.advanceTurn(created.match_id);
    expect(advanced.ok).toBe(true);
    expect(existsSync(storeFile)).toBe(true);

    vi.resetModules();
    lifecycle = await loadLifecycleModule();
    const hydrated = lifecycle.getMatchState(created.match_id);

    expect(hydrated).not.toBeNull();
    expect(hydrated?.turn_number).toBe(1);
    expect(hydrated?.phase).toBe('running');
    expect(hydrated?.recent_events.length).toBe(1);
  });

  it('ignores invalid persisted payloads without crashing', async () => {
    process.env.MATCHES_STORE_FILE = storeFile;
    writeFileSync(storeFile, '{bad-json', 'utf8');
    vi.resetModules();
    const lifecycle = await loadLifecycleModule();

    expect(lifecycle.getMatchState('missing')).toBeNull();
  });

  it('hydrates only valid entries from disk snapshot', async () => {
    process.env.MATCHES_STORE_FILE = storeFile;
    writeFileSync(
      storeFile,
      JSON.stringify([
        ['match-ok', { match: { id: 'match-ok', phase: 'setup', cycle_phase: 'bloodbath', turn_number: 0, tension_level: 0, seed: null, ruleset_version: 'v1.0.0', created_at: '2026-02-18T00:00:00.000Z', ended_at: null }, settings: { surprise_level: 'normal', event_profile: 'balanced', simulation_speed: '1x', seed: null }, participants: [], recent_events: [] }],
        ['bad'],
        [13, {}]
      ]),
      'utf8'
    );
    vi.resetModules();
    const lifecycle = await loadLifecycleModule();

    expect(lifecycle.getMatchState('match-ok')).not.toBeNull();
    expect(lifecycle.getMatchState('missing')).toBeNull();
  });

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });
});
