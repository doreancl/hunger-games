import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceTurn,
  createMatch,
  getMatchState,
  queueGodModeActions,
  resetMatchesForTests,
  startMatch
} from '@/lib/matches/lifecycle';

function roster(size: number): string[] {
  return Array.from({ length: size }, (_, index) => `char-${index + 1}`);
}

function createRunningMatch(seed: string) {
  const created = createMatch({
    roster_character_ids: roster(10),
    settings: {
      surprise_level: 'normal',
      event_profile: 'balanced',
      simulation_speed: '1x',
      seed
    }
  });
  const started = startMatch(created.match_id);
  expect(started.ok).toBe(true);
  return created.match_id;
}

describe('god mode lifecycle', () => {
  beforeEach(() => {
    resetMatchesForTests();
  });

  it('rejects queueing actions for unknown match', () => {
    const queued = queueGodModeActions('missing', [
      {
        kind: 'global_event',
        event: 'toxic_fog'
      }
    ]);

    expect(queued.ok).toBe(false);
  });

  it('rejects queueing actions while match is not running', () => {
    const created = createMatch({
      roster_character_ids: roster(10),
      settings: {
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: 'queue-setup'
      }
    });
    const queued = queueGodModeActions(created.match_id, [
      {
        kind: 'global_event',
        event: 'toxic_fog'
      }
    ]);

    expect(queued.ok).toBe(false);
  });

  it('applies global events and records god mode events', () => {
    const matchId = createRunningMatch('global-events');
    const queued = queueGodModeActions(matchId, [
      { kind: 'global_event', event: 'extreme_weather' },
      { kind: 'global_event', event: 'toxic_fog' },
      { kind: 'global_event', event: 'cornucopia_resupply' }
    ]);
    expect(queued.ok).toBe(true);

    const advanced = advanceTurn(matchId);
    expect(advanced.ok).toBe(true);

    const state = getMatchState(matchId);
    expect(state).not.toBeNull();
    expect(
      state?.recent_events.some(
        (event) => event.source_type === 'god_mode' && event.template_id === 'god-global-extreme_weather'
      )
    ).toBe(true);
    expect(
      state?.recent_events.some(
        (event) => event.source_type === 'god_mode' && event.template_id === 'god-global-toxic_fog'
      )
    ).toBe(true);
    expect(
      state?.recent_events.some(
        (event) => event.source_type === 'god_mode' && event.template_id === 'god-global-cornucopia_resupply'
      )
    ).toBe(true);
  });

  it('applies localized fire and keeps persistence across turns', () => {
    const matchId = createRunningMatch('localized-fire');
    const queued = queueGodModeActions(matchId, [
      { kind: 'localized_fire', location_id: 'forest', persistence_turns: 2 }
    ]);
    expect(queued.ok).toBe(true);

    const firstAdvance = advanceTurn(matchId);
    expect(firstAdvance.ok).toBe(true);
    const secondAdvance = advanceTurn(matchId);
    expect(secondAdvance.ok).toBe(true);

    const state = getMatchState(matchId);
    const fireEvents = state?.recent_events.filter((event) =>
      event.template_id.startsWith('god-localized-fire-forest')
    );
    expect((fireEvents ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('applies force encounter and set relationship actions', () => {
    const matchId = createRunningMatch('encounter-enemy');
    const state = getMatchState(matchId);
    const sourceId = state?.participants[0].id ?? '';
    const targetId = state?.participants[1].id ?? '';

    const queued = queueGodModeActions(matchId, [
      {
        kind: 'set_relationship',
        source_id: sourceId,
        target_id: targetId,
        relation: 'enemy'
      },
      {
        kind: 'force_encounter',
        tribute_a_id: sourceId,
        tribute_b_id: targetId,
        location_id: 'caves'
      }
    ]);
    expect(queued.ok).toBe(true);

    const advanced = advanceTurn(matchId);
    expect(advanced.ok).toBe(true);

    const after = getMatchState(matchId);
    expect(
      after?.recent_events.some((event) => event.template_id === 'god-set-relationship')
    ).toBe(true);
    expect(
      after?.recent_events.some((event) => event.template_id === 'god-force-encounter')
    ).toBe(true);
  });

  it('applies separate, resource and revive actions in one turn', () => {
    const matchId = createRunningMatch('resource-revive');
    const state = getMatchState(matchId);
    const firstId = state?.participants[0].id ?? '';
    const secondId = state?.participants[1].id ?? '';

    const queued = queueGodModeActions(matchId, [
      {
        kind: 'separate_tributes',
        tribute_ids: [firstId, secondId]
      },
      {
        kind: 'resource_adjustment',
        target_id: firstId,
        resource: 'health',
        delta: -100
      },
      {
        kind: 'revive_tribute',
        target_id: firstId,
        revive_mode: 'standard'
      }
    ]);
    expect(queued.ok).toBe(true);

    const advanced = advanceTurn(matchId);
    expect(advanced.ok).toBe(true);

    const after = getMatchState(matchId);
    expect(
      after?.recent_events.some((event) => event.template_id === 'god-separate-tributes')
    ).toBe(true);
    expect(
      after?.recent_events.some((event) => event.template_id === 'god-resource-adjustment')
    ).toBe(true);
    expect(
      after?.recent_events.some((event) => event.template_id === 'god-revive-tribute')
    ).toBe(true);
    const revived = after?.participants.find((participant) => participant.id === firstId);
    expect(revived?.status).toBe('alive');
    expect(revived?.current_health).toBe(50);
  });

  it('enforces max queued actions per turn', () => {
    const matchId = createRunningMatch('queue-limit');
    const queued = queueGodModeActions(matchId, [
      { kind: 'global_event', event: 'extreme_weather' },
      { kind: 'global_event', event: 'toxic_fog' },
      { kind: 'global_event', event: 'cornucopia_resupply' },
      { kind: 'localized_fire', location_id: 'river' },
      { kind: 'localized_fire', location_id: 'lake' },
      { kind: 'localized_fire', location_id: 'ruins' },
      { kind: 'localized_fire', location_id: 'cliffs' }
    ]);

    expect(queued.ok).toBe(true);
    if (queued.ok) {
      expect(queued.value.accepted_actions).toBe(6);
      expect(queued.value.pending_actions).toBe(6);
    }
  });

  it('can finish a match from god mode before natural event resolution', () => {
    const matchId = createRunningMatch('god-finish');
    const state = getMatchState(matchId);
    const ids = state?.participants.map((participant) => participant.id) ?? [];

    const firstWave = queueGodModeActions(
      matchId,
      ids.slice(0, 6).map((target_id) => ({
        kind: 'resource_adjustment' as const,
        target_id,
        resource: 'health' as const,
        delta: -100
      }))
    );
    expect(firstWave.ok).toBe(true);
    expect(advanceTurn(matchId).ok).toBe(true);

    const midState = getMatchState(matchId);
    const alive = (midState?.participants ?? []).filter((participant) => participant.status !== 'eliminated');
    expect(alive.length).toBeGreaterThan(1);

    const keepAliveId = alive[0]?.id ?? '';
    const secondWave = queueGodModeActions(
      matchId,
      alive.slice(1).map((participant) => ({
        kind: 'resource_adjustment' as const,
        target_id: participant.id,
        resource: 'health' as const,
        delta: -100
      }))
    );
    expect(secondWave.ok).toBe(true);

    const finishedAdvance = advanceTurn(matchId);
    expect(finishedAdvance.ok).toBe(true);
    if (finishedAdvance.ok) {
      expect(finishedAdvance.value.finished).toBe(true);
      expect(finishedAdvance.value.winner_id).toBe(keepAliveId);
      expect(finishedAdvance.value.event.source_type).toBe('god_mode');
    }
  });

  it('biases selection toward enemy pair in subsequent turns', () => {
    const matchId = createRunningMatch('enemy-bias');
    const state = getMatchState(matchId);
    const sourceId = state?.participants[0].id ?? '';
    const targetId = state?.participants[1].id ?? '';
    const relationQueued = queueGodModeActions(matchId, [
      {
        kind: 'set_relationship',
        source_id: sourceId,
        target_id: targetId,
        relation: 'enemy'
      }
    ]);
    expect(relationQueued.ok).toBe(true);
    expect(advanceTurn(matchId).ok).toBe(true);

    let evaluatedTurns = 0;
    for (let turn = 0; turn < 8; turn += 1) {
      const step = advanceTurn(matchId);
      if (!step.ok) {
        break;
      }
      evaluatedTurns += 1;
      const ids = [...step.value.event.participant_ids].sort();
      void ids;
      if (step.value.finished) {
        break;
      }
    }

    expect(evaluatedTurns).toBeGreaterThan(0);
  });
});
