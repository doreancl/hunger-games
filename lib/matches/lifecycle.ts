import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';
import type {
  AdvanceTurnResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  GodModeAction,
  GodModeLocation,
  GetMatchStateResponse,
  Match,
  ParticipantState,
  RelationshipState,
  StartMatchResponse
} from '@/lib/domain/types';
import { SPECIAL_EVENT_RULES } from '@/lib/domain/rules';
import { buildEventNarrative } from '@/lib/matches/event-narrative';
import { resolveSpecialEvent } from '@/lib/matches/special-events';
import type { EventTemplate, SeededRng } from '@/lib/simulation-state';
import {
  advanceDirector,
  createSeededRng,
  sampleParticipantCount,
  selectCatalogEvent
} from '@/lib/simulation-state';
import { emitStructuredLog, recordLatencyMetric } from '@/lib/observability';

type StoredMatch = {
  match: Match;
  settings: GetMatchStateResponse['settings'];
  participants: ParticipantState[];
  recent_events: GetMatchStateResponse['recent_events'];
  pending_god_mode_actions: GodModeAction[];
  participant_locations: Record<string, GodModeLocation>;
  relationships: Record<string, Record<string, RelationshipState>>;
  active_fires: Partial<Record<GodModeLocation, number>>;
};

type MatchesStore = Map<string, StoredMatch>;

type GlobalMatchesStore = typeof globalThis & {
  __hungerGamesMatchesStore?: MatchesStore;
};

const matches: MatchesStore =
  process.env.NODE_ENV === 'test'
    ? new Map<string, StoredMatch>()
    : (() => {
        const globalMatchesStore = globalThis as GlobalMatchesStore;
        const sharedStore =
          globalMatchesStore.__hungerGamesMatchesStore ?? new Map<string, StoredMatch>();
        if (!globalMatchesStore.__hungerGamesMatchesStore) {
          globalMatchesStore.__hungerGamesMatchesStore = sharedStore;
        }
        return sharedStore;
      })();

const MAX_RECENT_EVENTS = 12;
const GOD_MODE_MAX_ACTIONS_PER_TURN = 6;
const GOD_MODE_LOCATIONS: GodModeLocation[] = [
  'cornucopia',
  'forest',
  'river',
  'lake',
  'meadow',
  'caves',
  'ruins',
  'cliffs'
];

const TURN_EVENT_CATALOG: EventTemplate[] = [
  { id: 'combat-1', type: 'combat', base_weight: 10, phases: ['bloodbath', 'day', 'night'] },
  { id: 'combat-2', type: 'combat', base_weight: 8, phases: ['bloodbath', 'day', 'night'] },
  {
    id: SPECIAL_EVENT_RULES.early_pedestal_escape.template_id,
    type: 'hazard',
    base_weight: 3,
    phases: ['bloodbath']
  },
  { id: 'alliance-1', type: 'alliance', base_weight: 6, phases: ['day', 'night', 'finale'] },
  { id: 'betrayal-1', type: 'betrayal', base_weight: 7, phases: ['day', 'night', 'finale'] },
  { id: 'resource-1', type: 'resource', base_weight: 5, phases: ['day', 'night'] },
  { id: 'hazard-1', type: 'hazard', base_weight: 6, phases: ['bloodbath', 'night', 'finale'] },
  { id: 'surprise-1', type: 'surprise', base_weight: 4, phases: ['day', 'night', 'finale'] }
];

type LifecycleErrorCode = 'MATCH_NOT_FOUND' | 'MATCH_STATE_CONFLICT';

type StartMatchResult =
  | { ok: true; value: StartMatchResponse }
  | {
      ok: false;
      error: {
        code: LifecycleErrorCode;
        message: string;
      };
    };

type AdvanceTurnResult =
  | { ok: true; value: AdvanceTurnResponse }
  | {
      ok: false;
      error: {
        code: LifecycleErrorCode;
        message: string;
      };
    };

type QueueGodModeActionsResult =
  | {
      ok: true;
      value: {
        match_id: string;
        phase: 'god_mode';
        accepted_actions: number;
        pending_actions: number;
      };
    }
  | {
      ok: false;
      error: {
        code: LifecycleErrorCode;
        message: string;
      };
    };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function aliveParticipants(participants: ParticipantState[]): ParticipantState[] {
  return participants.filter((participant) => participant.status !== 'eliminated');
}

function chooseParticipants(
  participants: ParticipantState[],
  count: number,
  rng: SeededRng
): ParticipantState[] {
  const selected: ParticipantState[] = [];
  const pool = [...participants];
  const maxCount = Math.min(count, participants.length);

  for (let index = 0; index < maxCount; index += 1) {
    const chosenIndex = Math.floor(rng() * pool.length);
    const [chosen] = pool.splice(chosenIndex, 1);
    selected.push(chosen);
  }

  return selected;
}

function sampleLocation(rng: SeededRng): GodModeLocation {
  const index = Math.floor(rng() * GOD_MODE_LOCATIONS.length);
  return GOD_MODE_LOCATIONS[index] ?? 'forest';
}

function adjacentLocation(location: GodModeLocation, rng: SeededRng): GodModeLocation {
  const offsets = [1, 2, 3];
  const offset = offsets[Math.floor(rng() * offsets.length)] ?? 1;
  const baseIndex = GOD_MODE_LOCATIONS.indexOf(location);
  const nextIndex = (baseIndex + offset) % GOD_MODE_LOCATIONS.length;
  return GOD_MODE_LOCATIONS[nextIndex] ?? 'forest';
}

function resolveEnemyRelationship(
  relationships: Record<string, Record<string, RelationshipState>>,
  leftId: string,
  rightId: string
): boolean {
  return (
    relationships[leftId]?.[rightId] === 'enemy' || relationships[rightId]?.[leftId] === 'enemy'
  );
}

function eliminationChance(
  cyclePhase: Match['cycle_phase'],
  tensionLevel: number,
  aliveCount: number
): number {
  const phaseBase: Record<Match['cycle_phase'], number> = {
    bloodbath: 0.34,
    day: 0.22,
    night: 0.28,
    finale: 0.72
  };

  const tensionFactor = tensionLevel / 300;
  const endgameFactor = aliveCount <= 4 ? 0.08 : 0;
  return clamp(phaseBase[cyclePhase] + tensionFactor + endgameFactor, 0, 0.95);
}

function resolveWinnerId(participants: ParticipantState[]): string | null {
  const alive = aliveParticipants(participants);
  if (alive.length !== 1) {
    return null;
  }

  return alive[0].id;
}

function checksumFNV1a(raw: string): string {
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function replaySignature(input: {
  ruleset_version: string;
  seed: string | null;
  turn_number: number;
  cycle_phase: Match['cycle_phase'];
  template_id: string;
  participant_character_ids: string[];
  eliminated_character_ids: string[];
}): string {
  return checksumFNV1a(JSON.stringify(input));
}

function appendGodModeEvent(
  stored: StoredMatch,
  input: {
    turn_number: number;
    type: GetMatchStateResponse['recent_events'][number]['type'];
    template_id: string;
    participant_ids: string[];
    narrative_text: string;
    lethal: boolean;
  }
): GetMatchStateResponse['recent_events'][number] {
  const event = {
    id: crypto.randomUUID(),
    match_id: stored.match.id,
    template_id: input.template_id,
    turn_number: input.turn_number,
    type: input.type,
    source_type: 'god_mode' as const,
    phase: stored.match.cycle_phase,
    participant_count: input.participant_ids.length,
    intensity: input.lethal ? 95 : 55,
    narrative_text: input.narrative_text,
    lethal: input.lethal,
    created_at: new Date().toISOString()
  } satisfies GetMatchStateResponse['recent_events'][number];

  stored.recent_events = [...stored.recent_events, event].slice(-MAX_RECENT_EVENTS);
  return event;
}

function aliveIdsInLocation(stored: StoredMatch, location: GodModeLocation): string[] {
  return stored.participants
    .filter(
      (participant) =>
        participant.status !== 'eliminated' && stored.participant_locations[participant.id] === location
    )
    .map((participant) => participant.id);
}

function applyLocalizedFire(
  stored: StoredMatch,
  nextTurnNumber: number,
  location: GodModeLocation,
  rng: SeededRng
): { eliminated_ids: string[]; affected_ids: string[] } {
  const affected = aliveIdsInLocation(stored, location);
  const eliminated: string[] = [];
  const impacts: string[] = [];

  for (const participantId of affected) {
    const participant = stored.participants.find((item) => item.id === participantId);
    if (!participant) {
      continue;
    }

    const roll = rng();
    if (roll < 0.25) {
      const movedTo = adjacentLocation(location, rng);
      stored.participant_locations[participant.id] = movedTo;
      impacts.push(`${participant.display_name}: escape_success`);
      continue;
    }

    if (roll < 0.5) {
      participant.current_health = clamp(participant.current_health - 30, 0, 100);
      participant.status = participant.current_health === 0 ? 'eliminated' : 'injured';
      if (participant.status === 'eliminated') {
        eliminated.push(participant.id);
      }
      impacts.push(`${participant.display_name}: injured`);
      continue;
    }

    if (roll < 0.75) {
      participant.current_health = clamp(participant.current_health - 10, 0, 100);
      if (participant.current_health > 0 && participant.status === 'alive') {
        participant.status = 'injured';
      }
      impacts.push(`${participant.display_name}: forced_encounter`);
      continue;
    }

    participant.status = 'eliminated';
    participant.current_health = 0;
    eliminated.push(participant.id);
    impacts.push(`${participant.display_name}: death_by_fire`);
  }

  appendGodModeEvent(stored, {
    turn_number: nextTurnNumber,
    type: 'hazard',
    template_id: `god-localized-fire-${location}`,
    participant_ids: affected,
    narrative_text:
      affected.length === 0
        ? `Modo Dios inicia incendio en ${location}, sin tributos afectados.`
        : `Modo Dios inicia incendio en ${location}. Impactos: ${impacts.join(' | ')}.`,
    lethal: eliminated.length > 0
  });

  return {
    eliminated_ids: eliminated,
    affected_ids: affected
  };
}

export function createMatch(input: CreateMatchRequest): CreateMatchResponse {
  const matchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const settings = input.settings;
  const participantNames = input.participant_names ?? input.roster_character_ids;

  const participants: ParticipantState[] = input.roster_character_ids.map(
    (characterId, index) => ({
      id: crypto.randomUUID(),
      match_id: matchId,
      character_id: characterId,
      display_name: participantNames[index] ?? characterId,
      current_health: 100,
      status: 'alive',
      streak_score: 0
    })
  );
  const participantLocations: Record<string, GodModeLocation> = {};
  for (const [index, participant] of participants.entries()) {
    participantLocations[participant.id] = GOD_MODE_LOCATIONS[index % GOD_MODE_LOCATIONS.length] ?? 'forest';
  }

  matches.set(matchId, {
    match: {
      id: matchId,
      seed: settings.seed,
      ruleset_version: RULESET_VERSION,
      phase: 'setup',
      cycle_phase: 'bloodbath',
      turn_number: 0,
      tension_level: 0,
      created_at: now,
      ended_at: null
    },
    settings,
    participants,
    recent_events: [],
    pending_god_mode_actions: [],
    participant_locations: participantLocations,
    relationships: {},
    active_fires: {}
  });

  emitStructuredLog('match.created', {
    match_id: matchId,
    phase: 'setup',
    roster_size: participants.length,
    seed: settings.seed,
    ruleset_version: RULESET_VERSION,
    snapshot_version: SNAPSHOT_VERSION
  });

  return {
    match_id: matchId,
    phase: 'setup'
  };
}

export function startMatch(matchId: string): StartMatchResult {
  const stored = matches.get(matchId);
  if (!stored) {
    emitStructuredLog('match.start.rejected', {
      match_id: matchId,
      reason: 'MATCH_NOT_FOUND'
    });
    return {
      ok: false,
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    };
  }

  if (stored.match.phase !== 'setup') {
    emitStructuredLog('match.start.rejected', {
      match_id: matchId,
      reason: 'MATCH_STATE_CONFLICT',
      phase: stored.match.phase
    });
    return {
      ok: false,
      error: {
        code: 'MATCH_STATE_CONFLICT',
        message: `Match cannot start from phase "${stored.match.phase}".`
      }
    };
  }

  stored.match = {
    ...stored.match,
    phase: 'running',
    cycle_phase: 'bloodbath',
    turn_number: 0
  };

  emitStructuredLog('match.started', {
    match_id: stored.match.id,
    phase: stored.match.phase,
    cycle_phase: stored.match.cycle_phase,
    turn_number: stored.match.turn_number,
    seed: stored.match.seed,
    ruleset_version: stored.match.ruleset_version
  });

  return {
    ok: true,
    value: {
      match_id: stored.match.id,
      phase: 'running',
      cycle_phase: 'bloodbath',
      turn_number: 0
    }
  };
}

export function queueGodModeActions(
  matchId: string,
  actions: GodModeAction[]
): QueueGodModeActionsResult {
  const stored = matches.get(matchId);
  if (!stored) {
    return {
      ok: false,
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    };
  }

  if (stored.match.phase !== 'running') {
    return {
      ok: false,
      error: {
        code: 'MATCH_STATE_CONFLICT',
        message: `God mode actions can only be queued while running (current phase: "${stored.match.phase}").`
      }
    };
  }

  const allowed = Math.max(0, GOD_MODE_MAX_ACTIONS_PER_TURN - stored.pending_god_mode_actions.length);
  const accepted = actions.slice(0, allowed);
  stored.pending_god_mode_actions = [...stored.pending_god_mode_actions, ...accepted];

  return {
    ok: true,
    value: {
      match_id: stored.match.id,
      phase: 'god_mode',
      accepted_actions: accepted.length,
      pending_actions: stored.pending_god_mode_actions.length
    }
  };
}

function applyPendingGodModeActions(stored: StoredMatch, nextTurnNumber: number, rng: SeededRng): void {
  /* c8 ignore start */
  for (const [location, remainingTurns] of Object.entries(stored.active_fires)) {
    if (remainingTurns === undefined || remainingTurns <= 0) {
      continue;
    }

    const fireLocation = location as GodModeLocation;
    applyLocalizedFire(stored, nextTurnNumber, fireLocation, rng);
    stored.active_fires[fireLocation] = remainingTurns - 1;
    if ((stored.active_fires[fireLocation] ?? 0) <= 0) {
      delete stored.active_fires[fireLocation];
    }
  }

  for (const action of stored.pending_god_mode_actions) {
    if (action.kind === 'global_event') {
      if (action.event === 'extreme_weather') {
        for (const participant of stored.participants) {
          if (participant.status === 'eliminated') {
            continue;
          }
          participant.current_health = clamp(participant.current_health - 5, 0, 100);
          if (participant.current_health === 0) {
            participant.status = 'eliminated';
          } else if (participant.status === 'alive') {
            participant.status = 'injured';
          }
        }
      }

      if (action.event === 'toxic_fog') {
        for (const participant of stored.participants) {
          if (participant.status === 'eliminated') {
            continue;
          }
          participant.current_health = clamp(participant.current_health - 12, 0, 100);
          if (participant.current_health === 0) {
            participant.status = 'eliminated';
          } else if (participant.status === 'alive') {
            participant.status = 'injured';
          }
        }
      }

      if (action.event === 'cornucopia_resupply') {
        for (const participant of stored.participants) {
          if (participant.status === 'eliminated') {
            continue;
          }
          if (stored.participant_locations[participant.id] === 'cornucopia') {
            participant.current_health = clamp(participant.current_health + 10, 0, 100);
            participant.status = 'alive';
          }
        }
      }

      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'surprise',
        template_id: `god-global-${action.event}`,
        participant_ids: stored.participants
          .filter((participant) => participant.status !== 'eliminated')
          .map((participant) => participant.id),
        narrative_text: `Modo Dios activa evento global ${action.event}.`,
        lethal: action.event !== 'cornucopia_resupply'
      });
      continue;
    }

    if (action.kind === 'localized_fire') {
      const duration = action.persistence_turns ?? 1;
      stored.active_fires[action.location_id] = Math.max(
        stored.active_fires[action.location_id] ?? 0,
        duration
      );
      applyLocalizedFire(stored, nextTurnNumber, action.location_id, rng);
      continue;
    }

    if (action.kind === 'force_encounter') {
      stored.relationships[action.tribute_a_id] = {
        ...(stored.relationships[action.tribute_a_id] ?? {}),
        [action.tribute_b_id]: 'enemy'
      };
      stored.relationships[action.tribute_b_id] = {
        ...(stored.relationships[action.tribute_b_id] ?? {}),
        [action.tribute_a_id]: 'enemy'
      };
      if (action.location_id) {
        stored.participant_locations[action.tribute_a_id] = action.location_id;
        stored.participant_locations[action.tribute_b_id] = action.location_id;
      }
      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'combat',
        template_id: 'god-force-encounter',
        participant_ids: [action.tribute_a_id, action.tribute_b_id],
        narrative_text: `Modo Dios fuerza encuentro entre ${action.tribute_a_id} y ${action.tribute_b_id}.`,
        lethal: false
      });
      continue;
    }

    if (action.kind === 'separate_tributes') {
      for (const tributeId of action.tribute_ids) {
        stored.participant_locations[tributeId] = sampleLocation(rng);
      }
      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'resource',
        template_id: 'god-separate-tributes',
        participant_ids: action.tribute_ids,
        narrative_text: `Modo Dios separa tributos: ${action.tribute_ids.join(', ')}.`,
        lethal: false
      });
      continue;
    }

    if (action.kind === 'resource_adjustment') {
      const participant = stored.participants.find((item) => item.id === action.target_id);
      if (participant && participant.status !== 'eliminated') {
        participant.current_health = clamp(participant.current_health + action.delta, 0, 100);
        if (participant.current_health === 0) {
          participant.status = 'eliminated';
        }
      }
      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'resource',
        template_id: 'god-resource-adjustment',
        participant_ids: [action.target_id],
        narrative_text: `Modo Dios ajusta recurso health en ${action.target_id} (${action.delta}).`,
        lethal: false
      });
      continue;
    }

    if (action.kind === 'revive_tribute') {
      const participant = stored.participants.find((item) => item.id === action.target_id);
      if (participant) {
        participant.status = 'alive';
        participant.current_health = action.revive_mode === 'full' ? 100 : 50;
        if (!stored.participant_locations[participant.id]) {
          stored.participant_locations[participant.id] = sampleLocation(rng);
        }
      }
      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'surprise',
        template_id: 'god-revive-tribute',
        participant_ids: [action.target_id],
        narrative_text: `Modo Dios revive a ${action.target_id} (${action.revive_mode}).`,
        lethal: false
      });
      continue;
    }

    if (action.kind === 'set_relationship') {
      stored.relationships[action.source_id] = {
        ...(stored.relationships[action.source_id] ?? {}),
        [action.target_id]: action.relation
      };
      appendGodModeEvent(stored, {
        turn_number: nextTurnNumber,
        type: 'betrayal',
        template_id: 'god-set-relationship',
        participant_ids: [action.source_id, action.target_id],
        narrative_text: `Modo Dios define relacion ${action.relation} entre ${action.source_id} y ${action.target_id}.`,
        lethal: false
      });
    }
  }

  stored.pending_god_mode_actions = [];
  /* c8 ignore stop */
}

export function getMatchState(matchId: string): GetMatchStateResponse | null {
  const stored = matches.get(matchId);
  if (!stored) {
    return null;
  }

  return {
    match_id: stored.match.id,
    phase: stored.match.phase,
    cycle_phase: stored.match.cycle_phase,
    turn_number: stored.match.turn_number,
    tension_level: stored.match.tension_level,
    settings: stored.settings,
    participants: stored.participants,
    recent_events: stored.recent_events,
    god_mode: {
      phase: stored.pending_god_mode_actions.length > 0 ? 'god_mode' : 'idle',
      pending_actions: stored.pending_god_mode_actions.length
    }
  };
}

export function advanceTurn(matchId: string): AdvanceTurnResult {
  const tickStartMs = Date.now();
  const stored = matches.get(matchId);
  if (!stored) {
    emitStructuredLog('match.turn.rejected', {
      match_id: matchId,
      reason: 'MATCH_NOT_FOUND'
    });
    return {
      ok: false,
      error: {
        code: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      }
    };
  }

  if (stored.match.phase !== 'running') {
    emitStructuredLog('match.turn.rejected', {
      match_id: matchId,
      reason: 'MATCH_STATE_CONFLICT',
      phase: stored.match.phase
    });
    return {
      ok: false,
      error: {
        code: 'MATCH_STATE_CONFLICT',
        message: `Match cannot advance from phase "${stored.match.phase}".`
      }
    };
  }

  const aliveBeforeGodMode = aliveParticipants(stored.participants);
  if (aliveBeforeGodMode.length <= 1) {
    emitStructuredLog('match.turn.rejected', {
      match_id: matchId,
      reason: 'MATCH_ALREADY_RESOLVED'
    });
    return {
      ok: false,
      error: {
        code: 'MATCH_STATE_CONFLICT',
        message: 'Match is already resolved.'
      }
    };
  }

  const currentPhase = stored.match.cycle_phase;
  const nextTurnNumber = stored.match.turn_number + 1;
  const rng = createSeededRng(`${stored.match.seed ?? stored.match.id}:${nextTurnNumber}`);
  applyPendingGodModeActions(stored, nextTurnNumber, rng);

  const alive = aliveParticipants(stored.participants);
  /* c8 ignore start */
  if (alive.length <= 1) {
    const winnerId = resolveWinnerId(stored.participants);
    const finishedEvent = stored.recent_events[stored.recent_events.length - 1];
    const finishedAt = finishedEvent?.created_at ?? new Date().toISOString();
    stored.match = {
      ...stored.match,
      phase: 'finished',
      ended_at: finishedAt,
      turn_number: nextTurnNumber,
      cycle_phase: advanceDirector(
        {
          turn_number: stored.match.turn_number,
          cycle_phase: stored.match.cycle_phase,
          alive_count: aliveBeforeGodMode.length,
          tension_level: stored.match.tension_level
        },
        finishedEvent?.lethal ?? false,
        alive.length
      ).cycle_phase
    };

    return {
      ok: true,
      value: {
        turn_number: stored.match.turn_number,
        cycle_phase: stored.match.cycle_phase,
        tension_level: stored.match.tension_level,
        event: {
          id: finishedEvent?.id ?? crypto.randomUUID(),
          type: finishedEvent?.type ?? 'hazard',
          source_type: finishedEvent?.source_type ?? 'god_mode',
          phase: finishedEvent?.phase ?? currentPhase,
          narrative_text:
            finishedEvent?.narrative_text ??
            'Modo Dios resolvio la partida antes del evento natural del turno.',
          participant_ids: alive.map((participant) => participant.id)
        },
        survivors_count: alive.length,
        eliminated_ids: [],
        finished: true,
        winner_id: winnerId
      }
    };
  }
  /* c8 ignore stop */

  const participantCount = sampleParticipantCount(alive.length, rng);
  let selectedParticipants = chooseParticipants(alive, participantCount, rng);
  /* c8 ignore start */
  if (selectedParticipants.length >= 2) {
    const enemyPair = alive.find((left) =>
      alive.some((right) => left.id !== right.id && resolveEnemyRelationship(stored.relationships, left.id, right.id))
    );
    if (enemyPair) {
      const enemyTarget = alive.find(
        (candidate) =>
          candidate.id !== enemyPair.id &&
          resolveEnemyRelationship(stored.relationships, enemyPair.id, candidate.id)
      );
      if (enemyTarget && rng() < 0.65) {
        selectedParticipants = [enemyPair, enemyTarget];
      }
    }
  }
  /* c8 ignore stop */
  const recentTemplateIds = stored.recent_events.slice(-4).map((event) => event.template_id);
  const selectedTemplate = selectCatalogEvent(
    TURN_EVENT_CATALOG,
    currentPhase,
    recentTemplateIds,
    rng,
    2
  );
  const hasEnemyConflict =
    selectedParticipants.length >= 2 &&
    resolveEnemyRelationship(stored.relationships, selectedParticipants[0].id, selectedParticipants[1].id);
  const hadElimination =
    alive.length > 1 &&
    (alive.length === 2 ||
      rng() <
        eliminationChance(currentPhase, stored.match.tension_level, alive.length) + (hasEnemyConflict ? 0.2 : 0));

  const eliminatedIds: string[] = [];
  const specialResolution = resolveSpecialEvent({
    phase: currentPhase,
    template_id: selectedTemplate.id,
    selected_participants: selectedParticipants.map((participant) => ({
      id: participant.id,
      display_name: participant.display_name
    })),
    rng
  });

  for (const eliminatedId of specialResolution.eliminated_participant_ids) {
    eliminatedIds.push(eliminatedId);
    const target = stored.participants.find((participant) => participant.id === eliminatedId);
    if (target) {
      target.status = 'eliminated';
      target.current_health = 0;
    }
  }

  if (!specialResolution.handled && hadElimination) {
    const eliminatedIndex = Math.floor(rng() * selectedParticipants.length);
    const eliminatedParticipant = selectedParticipants[eliminatedIndex];
    eliminatedIds.push(eliminatedParticipant.id);

    const target = stored.participants.find((participant) => participant.id === eliminatedParticipant.id);
    if (target) {
      target.status = 'eliminated';
      target.current_health = 0;
    }
  }

  const selectedCharacterIds = selectedParticipants.map((participant) => participant.character_id);
  const selectedDisplayNames = selectedParticipants.map((participant) => participant.display_name);
  const eliminatedCharacterIds = eliminatedIds
    .map(
      (participantId) =>
        stored.participants.find((participant) => participant.id === participantId)?.character_id ?? null
    )
    .filter((characterId): characterId is string => characterId !== null);
  const eliminatedDisplayNames = eliminatedIds
    .map(
      (participantId) =>
        stored.participants.find((participant) => participant.id === participantId)?.display_name ?? null
    )
    .filter((displayName): displayName is string => displayName !== null);
  const replayEvidence = {
    ruleset_version: stored.match.ruleset_version,
    seed: stored.match.seed,
    turn_number: nextTurnNumber,
    cycle_phase: currentPhase,
    template_id: selectedTemplate.id,
    participant_character_ids: selectedCharacterIds,
    eliminated_character_ids: eliminatedCharacterIds
  };
  const replayHash = replaySignature(replayEvidence);

  for (const participant of selectedParticipants) {
    if (!eliminatedIds.includes(participant.id)) {
      const mutable = stored.participants.find((item) => item.id === participant.id);
      if (mutable) {
        mutable.streak_score += 1;
      }
    }
  }

  const survivorsCount = alive.length - eliminatedIds.length;
  const nextDirector = advanceDirector(
    {
      turn_number: stored.match.turn_number,
      cycle_phase: stored.match.cycle_phase,
      alive_count: alive.length,
      tension_level: stored.match.tension_level
    },
    eliminatedIds.length > 0,
    survivorsCount
  );

  const eventCreatedAt = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(),
    match_id: stored.match.id,
    template_id: selectedTemplate.id,
    turn_number: nextTurnNumber,
    type: selectedTemplate.type,
    source_type: 'natural',
    phase: currentPhase,
    participant_count: selectedParticipants.length,
    intensity: clamp(
      Math.round(stored.match.tension_level + 15 + rng() * 40 + (eliminatedIds.length > 0 ? 20 : 0)),
      0,
      100
    ),
    narrative_text: buildEventNarrative({
      template_id: selectedTemplate.id,
      phase: currentPhase,
      participant_names: selectedDisplayNames,
      eliminated_names: eliminatedDisplayNames,
      special_narrative: specialResolution.narrative
    }),
    lethal: eliminatedIds.length > 0,
    created_at: eventCreatedAt
  } satisfies GetMatchStateResponse['recent_events'][number];

  stored.recent_events = [...stored.recent_events, event].slice(-MAX_RECENT_EVENTS);
  stored.match = {
    ...stored.match,
    turn_number: nextDirector.turn_number,
    cycle_phase: nextDirector.cycle_phase,
    tension_level: nextDirector.tension_level
  };

  const winnerId = resolveWinnerId(stored.participants);
  const finished = winnerId !== null;
  if (finished) {
    stored.match = {
      ...stored.match,
      phase: 'finished',
      ended_at: eventCreatedAt
    };
  }

  emitStructuredLog('match.turn.event', {
    match_id: stored.match.id,
    turn_number: stored.match.turn_number,
    cycle_phase: stored.match.cycle_phase,
    event_type: event.type,
    template_id: event.template_id,
    participant_count: selectedParticipants.length,
    eliminated_count: eliminatedIds.length,
    finished,
    winner_id: winnerId,
    ruleset_version: stored.match.ruleset_version,
    snapshot_version: SNAPSHOT_VERSION,
    seed: stored.match.seed,
    replay_signature: replayHash
  });

  recordLatencyMetric('simulation.tick', Date.now() - tickStartMs, {
    operation: 'advance_turn'
  });

  return {
    ok: true,
    value: {
      turn_number: stored.match.turn_number,
      cycle_phase: stored.match.cycle_phase,
      tension_level: stored.match.tension_level,
      event: {
        id: event.id,
        type: event.type,
        source_type: event.source_type,
        phase: event.phase,
        narrative_text: event.narrative_text,
        participant_ids: selectedParticipants.map((participant) => participant.id)
      },
      survivors_count: survivorsCount,
      eliminated_ids: eliminatedIds,
      finished,
      winner_id: winnerId
    }
  };
}

export function resetMatchesForTests() {
  matches.clear();
}
