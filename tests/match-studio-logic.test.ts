import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RULESET_VERSION,
  SNAPSHOT_VERSION,
  type AdvanceTurnResponse,
  type MatchSnapshot,
  type ParticipantState
} from '@/lib/domain/types';
import {
  createBrowserUuid,
  countAlive,
  feedFromAdvance,
  feedFromSnapshot,
  formatBytes,
  normalizeCatalogWithObservability,
  relationDelta,
  relationTone,
  requestJson,
  sessionSizeTone,
  sessionToneBadgeVariant,
  waitMs
} from '@/app/new/match-studio-logic';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('match-studio logic helpers', () => {
  it('maps snapshot events newest-first and keeps event impact meaning', () => {
    const state: MatchSnapshot = {
      snapshot_version: 2,
      ruleset_version: 'v1.0.0',
      match: {
        id: 'match-1',
        seed: 'seed',
        ruleset_version: 'v1.0.0',
        phase: 'running',
        cycle_phase: 'day',
        turn_number: 2,
        tension_level: 30,
        created_at: '2026-06-20T00:00:00.000Z',
        ended_at: null
      },
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '2x',
        seed: null
      },
      participants: [
        {
          id: 'p-a',
          match_id: 'match-1',
          character_id: 'char-a',
          display_name: 'Atlas',
          current_health: 90,
          status: 'alive',
          streak_score: 2
        }
      ],
      recent_events: [
        {
          id: 'evt-1',
          match_id: 'match-1',
          template_id: 'template-1',
          turn_number: 1,
          type: 'combat',
          location: 'forest',
          phase: 'day',
          participant_count: 2,
          intensity: 3,
          narrative_text: 'Combate temprano.',
          lethal: false,
          origin: 'natural',
          induced_by_action_ids: [],
          created_at: '2026-06-20T00:00:00.000Z'
        },
        {
          id: 'evt-2',
          match_id: 'match-1',
          template_id: 'template-2',
          turn_number: 4,
          type: 'hazard',
          location: 'river',
          phase: 'night',
          participant_count: 1,
          intensity: 4,
          narrative_text: 'Tormenta en la montaña.',
          lethal: true,
          origin: 'natural',
          induced_by_action_ids: [],
          created_at: '2026-06-20T00:00:01.000Z'
        }
      ],
      engine_state: {
        next_cycle_phase: 'night',
        queued_god_mode_actions: [],
        persistent_fires: [],
        participant_locations: { 'p-a': 'forest' },
        participant_resources: { 'p-a': [] },
        hostility: {}
      }
    };

    const feed = feedFromSnapshot(state);

    expect(feed).toHaveLength(2);
    expect(feed.map((entry) => entry.turn_number)).toEqual([4, 1]);
    expect(feed[0].headline).toBe('Tormenta en la montaña.');
    expect(feed[0].impact).toBe('Impacto: evento letal en el ultimo intercambio.');
    expect(feed[1].impact).toBe('Impacto: tension sube sin bajas directas.');
    expect(feed[1].character_ids).toEqual([]);
  });

  it('maps advance participants by character-id and ignores unknown participant ids', () => {
    const participants: ParticipantState[] = [
      {
        id: 'p-1',
        match_id: 'match-1',
        character_id: 'char-1',
        display_name: 'Atlas',
        current_health: 88,
        status: 'alive',
        streak_score: 3
      },
      {
        id: 'p-2',
        match_id: 'match-1',
        character_id: 'char-2',
        display_name: 'Nexus',
        current_health: 44,
        status: 'injured',
        streak_score: -1
      }
    ];

    const advance: AdvanceTurnResponse = {
      turn_number: 8,
      cycle_phase: 'night',
      tension_level: 58,
      event: {
        id: 'event-1',
        type: 'combat',
        location: 'river',
        phase: 'night',
        narrative_text: 'Atlas y Nexus chocan directamente.',
        participant_ids: ['p-1', 'p-unknown', 'p-2']
      },
      survivors_count: 46,
      eliminated_ids: ['p-2', 'p-ghost'],
      finished: false,
      winner_id: null,
      snapshot_envelope: {
        snapshot_version: SNAPSHOT_VERSION,
        checksum: 'f7f3d6a1',
        snapshot: {
          snapshot_version: SNAPSHOT_VERSION,
          ruleset_version: RULESET_VERSION,
          match: {
            id: 'match-1',
            seed: 'seed',
            ruleset_version: RULESET_VERSION,
            phase: 'running',
            cycle_phase: 'night',
            turn_number: 8,
            tension_level: 58,
            created_at: '2026-06-20T00:00:00.000Z',
            ended_at: null
          },
          settings: {
            surprise_level: 'normal',
            event_profile: 'balanced',
            simulation_speed: '1x',
            seed: 'seed'
          },
          participants,
          recent_events: [],
          engine_state: {
            next_cycle_phase: 'night',
            queued_god_mode_actions: [],
            persistent_fires: [],
            participant_locations: {
              'p-1': 'forest',
              'p-2': 'forest'
            },
            participant_resources: {
              'p-1': [],
              'p-2': []
            },
            hostility: {}
          }
        }
      }
    };

    const feedEvent = feedFromAdvance(advance, participants);

    expect(feedEvent.character_ids).toEqual(['char-1', 'char-2']);
    expect(feedEvent.eliminated_character_ids).toEqual(['char-2']);
    expect(feedEvent.headline).toContain('Atlas');
    expect(feedEvent.headline).toContain('Nexus');
    expect(feedEvent.impact).toContain('Nexus queda fuera de la simulacion.');
  });

  it('maps relation tone and delta thresholds', () => {
    expect(relationDelta('alliance')).toBe(2);
    expect(relationDelta('resource')).toBe(2);
    expect(relationDelta('combat')).toBe(-1);
    expect(relationDelta('hazard')).toBe(-1);
    expect(relationDelta('betrayal')).toBe(-3);
    expect(relationDelta('surprise')).toBe(0);

    expect(relationTone(3)).toBe('Alianza fuerte');
    expect(relationTone(1)).toBe('Coordinacion estable');
    expect(relationTone(0)).toBe('Relacion neutra');
    expect(relationTone(-1)).toBe('Friccion activa');
    expect(relationTone(-3)).toBe('Rivalidad critica');
  });

  it('calculates runtime-boundary helpers', () => {
    expect(
      countAlive([
        { id: 'p1', match_id: 'match-1', character_id: 'char-1', display_name: 'Atlas', current_health: 90, status: 'alive', streak_score: 1 },
        { id: 'p2', match_id: 'match-1', character_id: 'char-2', display_name: 'Nexus', current_health: 0, status: 'eliminated', streak_score: 0 },
        { id: 'p3', match_id: 'match-1', character_id: 'char-3', display_name: 'Luna', current_health: 55, status: 'injured', streak_score: 0 }
      ])
    ).toBe(2);

    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');

    expect(sessionSizeTone(1024 * 1024 - 1)).toBe('ok');
    expect(sessionSizeTone(1024 * 1024)).toBe('high');
    expect(sessionSizeTone(1536 * 1024)).toBe('critical');

    expect(sessionToneBadgeVariant('ok')).toBe('success');
    expect(sessionToneBadgeVariant('high')).toBe('warning');
    expect(sessionToneBadgeVariant('critical')).toBe('destructive');
  });

  it('supports requestJson success and error extraction', async () => {
    const okResponse = new Response(JSON.stringify({ value: 12 }), { status: 200 });
    vi.spyOn(global, 'fetch').mockResolvedValue(okResponse);

    expect(await requestJson<{ value: number }>('/api/test')).toEqual({ value: 12 });
  });

  it('extracts typed API error messages when present', async () => {
    const errorResponse = new Response(
      JSON.stringify({ error: { code: 'INVALID_JSON', message: 'match payload inválido' } }),
      { status: 422 }
    );
    vi.spyOn(global, 'fetch').mockResolvedValue(errorResponse);

    await expect(requestJson('/api/error')).rejects.toThrow('match payload inválido');
  });

  it('falls back when error payload is not valid json', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('not-json', { status: 500 }));

    await expect(requestJson('/api/error')).rejects.toThrow('Request failed (500) for /api/error');
  });

  it('propagates network failures from fetch', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(requestJson('/api/network')).rejects.toThrow('network down');
  });

  it('creates browser uuid only when browser crypto.randomUUID exists', () => {
    const originalWindow = globalThis.window;
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    expect(createBrowserUuid()).toBeNull();

    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    expect(createBrowserUuid()).toBeNull();

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'uuid-123' }
    });
    expect(createBrowserUuid()).toBe('uuid-123');

    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
  });

  it('waits through setTimeout', async () => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setTimeout: globalThis.setTimeout }
    });
    const promise = waitMs(25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('builds non-lethal advance impacts across event types and actor counts', () => {
    const participants: ParticipantState[] = [
      {
        id: 'p-1',
        match_id: 'match-1',
        character_id: 'char-1',
        display_name: 'Atlas',
        current_health: 88,
        status: 'alive',
        streak_score: 3
      },
      {
        id: 'p-2',
        match_id: 'match-1',
        character_id: 'char-2',
        display_name: 'Nexus',
        current_health: 44,
        status: 'injured',
        streak_score: 0
      },
      {
        id: 'p-3',
        match_id: 'match-1',
        character_id: 'char-3',
        display_name: 'Luna',
        current_health: 76,
        status: 'alive',
        streak_score: 1
      }
    ];

    const cases = [
      ['alliance', ['p-1'], 'Impacto: cohesion tactica en aumento.', 'Atlas'],
      ['betrayal', ['p-1', 'p-2'], 'Impacto: confianza rota y riesgo social alto.', 'Atlas y Nexus'],
      ['resource', ['p-1', 'p-2', 'p-3'], 'Impacto: ventaja temporal de recursos.', 'Atlas, Nexus +1'],
      ['hazard', [], 'Impacto: presion ambiental sobre el roster.', 'La arena'],
      ['surprise', ['p-1'], 'Impacto: la tension global cambia sin previo aviso.', 'Atlas'],
      ['combat', ['p-1', 'p-2'], 'Impacto: intercambio agresivo entre participantes.', 'Atlas y Nexus']
    ] as const;

    for (const [type, participantIds, impact, headlineStart] of cases) {
      const event = feedFromAdvance(
        {
          turn_number: 9,
          cycle_phase: 'day',
          tension_level: 40,
          event: {
            id: `event-${type}`,
            type,
            location: 'river',
            phase: 'day',
            narrative_text: 'evento',
            participant_ids: participantIds
          },
          survivors_count: 3,
          eliminated_ids: [],
          finished: false,
          winner_id: null,
          snapshot_envelope: {
            snapshot_version: SNAPSHOT_VERSION,
            checksum: 'deadbeef',
            snapshot: {
              snapshot_version: SNAPSHOT_VERSION,
              ruleset_version: RULESET_VERSION,
              match: {
                id: 'match-1',
                seed: 'seed',
                ruleset_version: RULESET_VERSION,
                phase: 'running',
                cycle_phase: 'day',
                turn_number: 9,
                tension_level: 40,
                created_at: '2026-06-20T00:00:00.000Z',
                ended_at: null
              },
              settings: {
                surprise_level: 'normal',
                event_profile: 'balanced',
                simulation_speed: '1x',
                seed: 'seed'
              },
              participants,
              recent_events: [],
              engine_state: {
                next_cycle_phase: 'night',
                queued_god_mode_actions: [],
                persistent_fires: [],
                participant_locations: {
                  'p-1': 'forest',
                  'p-2': 'forest',
                  'p-3': 'river'
                },
                participant_resources: {
                  'p-1': [],
                  'p-2': [],
                  'p-3': []
                },
                hostility: {}
              }
            }
          }
        },
        participants
      );

      expect(event.impact).toBe(impact);
      expect(event.headline.startsWith(headlineStart)).toBe(true);
    }
  });

  it('normalizes catalog source and reports invalid version in diagnostics', () => {
    const source = {
      version: 1,
      franchises: [
        {
          franchise_id: 'sw',
          franchise_name: 'Star Wars'
        }
      ],
      characters: [
        {
          character_key: 'sw-luke',
          display_name: 'Luke Skywalker',
          franchise_id: 'sw',
          movie_id: 'sw-anh',
          movie_title: 'A New Hope'
        }
      ]
    };

    const result = normalizeCatalogWithObservability(source, 'test_source');

    expect(result.catalog.version).toBe(1);
    expect(result.catalog.franchises.length).toBeGreaterThan(0);
    expect(result.catalog.characters.length).toBeGreaterThan(0);
    expect(result.diagnostics.invalid_version_count).toBe(0);
  });
});
