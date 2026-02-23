import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';
import type {
  AdvanceTurnResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  GetMatchStateResponse,
  GodModeAction,
  GodModeQueueResponse,
  Match,
  OperationalCyclePhase,
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
  next_cycle_phase: OperationalCyclePhase;
  queued_god_mode_actions: GodModeAction[];
  persistent_fires: Array<{
    location: string;
    remaining_turns: number;
    source_action_id: string;
  }>;
  participant_locations: Record<string, string>;
  participant_resources: Record<string, string[]>;
  hostility: Record<string, Record<string, RelationshipState>>;
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
const ARENA_LOCATIONS = ['cornucopia', 'forest_north', 'forest_south', 'river', 'ridge', 'ruins'];

const TURN_EVENT_CATALOG: EventTemplate[] = [
  { id: 'combat-1', type: 'combat', base_weight: 10, phases: ['bloodbath', 'day', 'night'] },
  { id: 'combat-2', type: 'combat', base_weight: 8, phases: ['bloodbath', 'day', 'night'] },
  { id: 'hazard-cornucopia-mines-1', type: 'hazard', base_weight: 4, phases: ['bloodbath'] },
  {
    id: SPECIAL_EVENT_RULES.early_pedestal_escape.template_id,
    type: 'hazard',
    base_weight: 3,
    phases: ['bloodbath']
  },
  { id: 'hazard-fire-wave-1', type: 'hazard', base_weight: 5, phases: ['day', 'night'] },
  { id: 'hazard-toxic-fog-1', type: 'hazard', base_weight: 5, phases: ['day', 'night'] },
  { id: 'surprise-muttation-hunt-1', type: 'surprise', base_weight: 4, phases: ['day', 'night'] },
  { id: 'hazard-thunderstorm-1', type: 'hazard', base_weight: 4, phases: ['day', 'night'] },
  { id: 'hazard-rockslide-1', type: 'hazard', base_weight: 3, phases: ['day', 'night', 'finale'] },
  { id: 'resource-sponsor-pack-1', type: 'resource', base_weight: 5, phases: ['day', 'night'] },
  { id: 'hazard-quicksand-trap-1', type: 'hazard', base_weight: 3, phases: ['day', 'night'] },
  { id: 'combat-route-clash-1', type: 'combat', base_weight: 6, phases: ['day', 'night', 'finale'] },
  { id: 'surprise-risky-shelter-1', type: 'surprise', base_weight: 4, phases: ['night'] },
  {
    id: SPECIAL_EVENT_RULES.cornucopia_refill.template_id,
    type: 'resource',
    base_weight: 4,
    phases: ['day', 'night', 'finale']
  },
  {
    id: SPECIAL_EVENT_RULES.arena_escape_attempt.template_id,
    type: 'hazard',
    base_weight: 2,
    phases: ['day', 'night', 'finale']
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

type QueueGodModeResult =
  | { ok: true; value: GodModeQueueResponse }
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
  rng: SeededRng,
  forcedParticipantIds: string[] = []
): ParticipantState[] {
  const selectedById = new Map<string, ParticipantState>();
  for (const forcedId of forcedParticipantIds) {
    const forced = participants.find((participant) => participant.id === forcedId);
    if (forced) {
      selectedById.set(forced.id, forced);
    }
  }

  const remainingPool = participants.filter((participant) => !selectedById.has(participant.id));
  const targetCount = Math.max(Math.min(count, participants.length), selectedById.size);

  while (selectedById.size < targetCount && remainingPool.length > 0) {
    const chosenIndex = Math.floor(rng() * remainingPool.length);
    const [chosen] = remainingPool.splice(chosenIndex, 1);
    selectedById.set(chosen.id, chosen);
  }

  return [...selectedById.values()];
}

function eliminationChance(
  cyclePhase: OperationalCyclePhase,
  tensionLevel: number,
  aliveCount: number
): number {
  const phaseBase: Record<OperationalCyclePhase, number> = {
    bloodbath: 0.34,
    day: 0.22,
    night: 0.28,
    finale: 0.72
  };

  const tensionFactor = tensionLevel / 300;
  const endgameFactor = aliveCount <= 4 ? 0.08 : 0;
  return clamp(phaseBase[cyclePhase] + tensionFactor + endgameFactor, 0, 0.95);
}

export function isCornucopiaRefillEligible(turnNumber: number, aliveCount: number): boolean {
  return (
    turnNumber >= SPECIAL_EVENT_RULES.cornucopia_refill.min_turn_number &&
    aliveCount <= SPECIAL_EVENT_RULES.cornucopia_refill.max_alive_count
  );
}

export function buildContextualTurnCatalog(turnNumber: number, aliveCount: number): EventTemplate[] {
  return TURN_EVENT_CATALOG.map((template) => {
    if (template.id === SPECIAL_EVENT_RULES.cornucopia_refill.template_id) {
      if (!isCornucopiaRefillEligible(turnNumber, aliveCount)) {
        return {
          ...template,
          base_weight: 0
        };
      }

      return {
        ...template,
        base_weight:
          template.base_weight * SPECIAL_EVENT_RULES.cornucopia_refill.activation_weight_multiplier
      };
    }

    return template;
  }).filter((template) => template.base_weight > 0);
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
  cycle_phase: OperationalCyclePhase;
  template_id: string;
  participant_character_ids: string[];
  eliminated_character_ids: string[];
}): string {
  return checksumFNV1a(JSON.stringify(input));
}

function nextArenaLocation(current: string): string {
  const currentIndex = ARENA_LOCATIONS.indexOf(current);
  if (currentIndex < 0) {
    return ARENA_LOCATIONS[0];
  }
  return ARENA_LOCATIONS[(currentIndex + 1) % ARENA_LOCATIONS.length];
}

function setHostility(
  stored: StoredMatch,
  sourceId: string,
  targetId: string,
  value: RelationshipState
): void {
  if (!stored.hostility[sourceId]) {
    stored.hostility[sourceId] = {};
  }
  stored.hostility[sourceId][targetId] = value;
}

function getHostility(stored: StoredMatch, sourceId: string, targetId: string): RelationshipState {
  return stored.hostility[sourceId]?.[targetId] ?? 'neutral';
}

type GodModePreTurnEffect = {
  induced_action_ids: string[];
  narrative_lines: string[];
  forced_participant_ids: string[];
  protected_participant_ids: string[];
  pre_eliminated_ids: string[];
  elimination_chance_boost: number;
};

function applyGodModeActions(
  stored: StoredMatch,
  nextTurnNumber: number,
  rng: SeededRng
): GodModePreTurnEffect {
  const inducedActionIds: string[] = [];
  const narrativeLines: string[] = [];
  const forced = new Set<string>();
  const separated = new Set<string>();
  const preEliminated = new Set<string>();
  let eliminationChanceBoost = 0;

  const applyLocalizedFire = (location: string, sourceActionId: string) => {
    const aliveAtLocation = aliveParticipants(stored.participants).filter(
      (participant) => stored.participant_locations[participant.id] === location
    );

    if (aliveAtLocation.length === 0) {
      narrativeLines.push(`Incendio en ${location}: no habia tributos en la zona.`);
      return;
    }

    const outcomes: string[] = [];
    for (const participant of aliveAtLocation) {
      const roll = rng();
      if (roll < 0.4) {
        stored.participant_locations[participant.id] = nextArenaLocation(location);
        outcomes.push(`${participant.display_name}=escape_success`);
        continue;
      }
      if (roll < 0.7) {
        participant.status = 'injured';
        participant.current_health = Math.max(1, participant.current_health - 25);
        outcomes.push(`${participant.display_name}=injured`);
        continue;
      }
      if (roll < 0.9) {
        forced.add(participant.id);
        stored.participant_locations[participant.id] = nextArenaLocation(location);
        outcomes.push(`${participant.display_name}=forced_encounter`);
        continue;
      }

      participant.status = 'eliminated';
      participant.current_health = 0;
      preEliminated.add(participant.id);
      outcomes.push(`${participant.display_name}=death_by_fire`);
    }

    inducedActionIds.push(sourceActionId);
    eliminationChanceBoost += 0.1;
    narrativeLines.push(`Incendio en ${location}: ${outcomes.join(', ')}.`);
  };

  const carryOverFires: StoredMatch['persistent_fires'] = [];
  for (const persistentFire of stored.persistent_fires) {
    applyLocalizedFire(persistentFire.location, persistentFire.source_action_id);
    if (persistentFire.remaining_turns > 1) {
      carryOverFires.push({
        ...persistentFire,
        remaining_turns: persistentFire.remaining_turns - 1
      });
    }
  }
  stored.persistent_fires = carryOverFires;

  const queuedActions = [...stored.queued_god_mode_actions];
  stored.queued_god_mode_actions = [];

  for (const action of queuedActions) {
    if (action.kind === 'global_event') {
      inducedActionIds.push(action.id);
      if (action.event_kind === 'extreme_weather') {
        eliminationChanceBoost += 0.06;
        narrativeLines.push('Modo Dios: clima extremo reduce visibilidad y seguridad del arena.');
      }
      if (action.event_kind === 'toxic_fog') {
        eliminationChanceBoost += 0.08;
        narrativeLines.push('Modo Dios: niebla toxica expande zonas de riesgo para todos los tributos.');
      }
      if (action.event_kind === 'cornucopia_resupply') {
        eliminationChanceBoost += 0.04;
        narrativeLines.push('Modo Dios: reabastecimiento forzado en la Cornucopia provoca desplazamientos.');
      }
      continue;
    }

    if (action.kind === 'localized_fire') {
      applyLocalizedFire(action.location, action.id);
      if (action.persistent_turns > 1) {
        stored.persistent_fires.push({
          location: action.location,
          remaining_turns: action.persistent_turns - 1,
          source_action_id: action.id
        });
      }
      continue;
    }

    if (action.kind === 'force_encounter') {
      const aliveSet = new Set(aliveParticipants(stored.participants).map((participant) => participant.id));
      const applicable = action.participant_ids.filter((id) => aliveSet.has(id));
      for (const participantId of applicable) {
        forced.add(participantId);
      }
      inducedActionIds.push(action.id);
      narrativeLines.push(`Modo Dios: encuentro forzado entre ${applicable.length} tributos.`);
      continue;
    }

    if (action.kind === 'separate_tributes') {
      const aliveSet = new Set(aliveParticipants(stored.participants).map((participant) => participant.id));
      const applicable = action.participant_ids.filter((id) => aliveSet.has(id));
      for (const participantId of applicable) {
        separated.add(participantId);
      }
      inducedActionIds.push(action.id);
      narrativeLines.push(`Modo Dios: separacion aplicada a ${applicable.length} tributos.`);
      continue;
    }

    if (action.kind === 'grant_resource') {
      const participant = stored.participants.find((item) => item.id === action.participant_id);
      if (participant) {
        const currentResources = stored.participant_resources[action.participant_id] ?? [];
        stored.participant_resources[action.participant_id] = [...currentResources, action.resource];
      }
      inducedActionIds.push(action.id);
      narrativeLines.push(`Modo Dios: recurso "${action.resource}" otorgado a ${action.participant_id}.`);
      continue;
    }

    if (action.kind === 'remove_resource') {
      const currentResources = stored.participant_resources[action.participant_id] ?? [];
      stored.participant_resources[action.participant_id] = currentResources.filter(
        (resource) => resource !== action.resource
      );
      inducedActionIds.push(action.id);
      narrativeLines.push(`Modo Dios: recurso "${action.resource}" retirado a ${action.participant_id}.`);
      continue;
    }

    if (action.kind === 'alter_hostility') {
      eliminationChanceBoost += action.delta * 0.005;
      inducedActionIds.push(action.id);
      narrativeLines.push(`Modo Dios: hostilidad ajustada en ${action.delta} para ${action.participant_id}.`);
      continue;
    }

    if (action.kind === 'revive_tribute') {
      const participant = stored.participants.find((item) => item.id === action.participant_id);
      if (participant?.status === 'eliminated') {
        participant.status = 'alive';
        participant.current_health = 50;
        narrativeLines.push(`Modo Dios: ${participant.display_name} fue revivido por el Capitolio.`);
      }
      inducedActionIds.push(action.id);
      continue;
    }

    if (action.kind === 'set_enmity') {
      setHostility(stored, action.source_participant_id, action.target_participant_id, 'enemy');
      setHostility(stored, action.target_participant_id, action.source_participant_id, 'enemy');
      eliminationChanceBoost += 0.07;
      inducedActionIds.push(action.id);
      narrativeLines.push(
        `Modo Dios: enemistad declarada entre ${action.source_participant_id} y ${action.target_participant_id}.`
      );
    }
  }

  return {
    induced_action_ids: inducedActionIds,
    narrative_lines: narrativeLines,
    forced_participant_ids: [...forced],
    protected_participant_ids: [...separated],
    pre_eliminated_ids: [...preEliminated],
    elimination_chance_boost: eliminationChanceBoost
  };
}

export function createMatch(input: CreateMatchRequest): CreateMatchResponse {
  const matchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const settings = input.settings;
  const participantNames = input.participant_names ?? input.roster_character_ids;

  const participants: ParticipantState[] = input.roster_character_ids.map((characterId, index) => ({
    id: crypto.randomUUID(),
    match_id: matchId,
    character_id: characterId,
    display_name: participantNames[index] ?? characterId,
    current_health: 100,
    status: 'alive',
    streak_score: 0
  }));

  const participantLocations: Record<string, string> = {};
  const participantResources: Record<string, string[]> = {};
  for (let index = 0; index < participants.length; index += 1) {
    participantLocations[participants[index].id] = ARENA_LOCATIONS[index % ARENA_LOCATIONS.length];
    participantResources[participants[index].id] = [];
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
    next_cycle_phase: 'bloodbath',
    queued_god_mode_actions: [],
    persistent_fires: [],
    participant_locations: participantLocations,
    participant_resources: participantResources,
    hostility: {}
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
  stored.next_cycle_phase = 'bloodbath';

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

export function queueGodModeActions(matchId: string, actions: GodModeAction[]): QueueGodModeResult {
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
        message: `Match cannot queue god_mode actions from phase "${stored.match.phase}".`
      }
    };
  }

  if (stored.match.cycle_phase !== 'god_mode') {
    return {
      ok: false,
      error: {
        code: 'MATCH_STATE_CONFLICT',
        message: 'God mode actions can only be queued during cycle_phase "god_mode".'
      }
    };
  }

  stored.queued_god_mode_actions.push(...actions);

  return {
    ok: true,
    value: {
      match_id: stored.match.id,
      phase: 'running',
      cycle_phase: 'god_mode',
      queued_actions: stored.queued_god_mode_actions.length
    }
  };
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
    recent_events: stored.recent_events
  };
}

function effectiveOperationalPhase(stored: StoredMatch): OperationalCyclePhase {
  if (stored.match.cycle_phase === 'god_mode') {
    return stored.next_cycle_phase;
  }
  return stored.match.cycle_phase;
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

  const currentPhase = effectiveOperationalPhase(stored);
  const nextTurnNumber = stored.match.turn_number + 1;
  const rng = createSeededRng(`${stored.match.seed ?? stored.match.id}:${nextTurnNumber}`);

  const godModeEffects = applyGodModeActions(stored, nextTurnNumber, rng);
  const alive = aliveParticipants(stored.participants);

  if (alive.length <= 1) {
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

  const participantCount = sampleParticipantCount(alive.length, rng);
  const selectedParticipants = chooseParticipants(
    alive,
    participantCount,
    rng,
    godModeEffects.forced_participant_ids
  );
  const recentTemplateIds = stored.recent_events.slice(-4).map((event) => event.template_id);
  const contextualCatalog = buildContextualTurnCatalog(nextTurnNumber, alive.length);
  const selectedTemplate = selectCatalogEvent(contextualCatalog, currentPhase, recentTemplateIds, rng, 2);

  const eliminatedIds = [...godModeEffects.pre_eliminated_ids];
  const specialResolution = resolveSpecialEvent({
    phase: currentPhase,
    turn_number: nextTurnNumber,
    alive_count: alive.length,
    template_id: selectedTemplate.id,
    selected_participants: selectedParticipants.map((participant) => ({
      id: participant.id,
      display_name: participant.display_name
    })),
    rng
  });

  let hostilityBoost = 0;
  for (let left = 0; left < selectedParticipants.length; left += 1) {
    for (let right = left + 1; right < selectedParticipants.length; right += 1) {
      const leftId = selectedParticipants[left].id;
      const rightId = selectedParticipants[right].id;
      if (getHostility(stored, leftId, rightId) === 'enemy') {
        hostilityBoost += 0.03;
      }
    }
  }

  const protectedCount = selectedParticipants.filter((participant) =>
    godModeEffects.protected_participant_ids.includes(participant.id)
  ).length;

  const eliminationRollChance = clamp(
    Math.max(
      eliminationChance(currentPhase, stored.match.tension_level, alive.length),
      specialResolution.elimination_chance_floor
    ) +
      godModeEffects.elimination_chance_boost +
      hostilityBoost -
      protectedCount * 0.02,
    0,
    0.98
  );

  const hadElimination = alive.length > 1 && (alive.length === 2 || rng() < eliminationRollChance);

  for (const eliminatedId of specialResolution.eliminated_participant_ids) {
    if (!eliminatedIds.includes(eliminatedId)) {
      eliminatedIds.push(eliminatedId);
    }
    const target = stored.participants.find((participant) => participant.id === eliminatedId);
    if (target) {
      target.status = 'eliminated';
      target.current_health = 0;
    }
  }

  if (specialResolution.allow_default_elimination && hadElimination) {
    const candidates = selectedParticipants.filter((participant) => !eliminatedIds.includes(participant.id));
    if (candidates.length > 0) {
      const eliminatedIndex = Math.floor(rng() * candidates.length);
      const eliminatedParticipant = candidates[eliminatedIndex];
      eliminatedIds.push(eliminatedParticipant.id);

      const target = stored.participants.find((participant) => participant.id === eliminatedParticipant.id);
      if (target) {
        target.status = 'eliminated';
        target.current_health = 0;
      }
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

  const survivorsCount = aliveParticipants(stored.participants).length;
  const nextDirector = advanceDirector(
    {
      turn_number: stored.match.turn_number,
      cycle_phase: currentPhase,
      alive_count: alive.length,
      tension_level: stored.match.tension_level
    },
    eliminatedIds.length > 0,
    survivorsCount
  );

  const eventCreatedAt = new Date().toISOString();
  const baseNarrative = buildEventNarrative({
    template_id: selectedTemplate.id,
    phase: currentPhase,
    participant_names: selectedDisplayNames,
    eliminated_names: eliminatedDisplayNames,
    special_narrative: specialResolution.narrative
  });
  const interventionNarrative = godModeEffects.narrative_lines.join(' ');

  const event = {
    id: crypto.randomUUID(),
    match_id: stored.match.id,
    template_id: selectedTemplate.id,
    turn_number: nextTurnNumber,
    type: selectedTemplate.type,
    phase: currentPhase,
    participant_count: selectedParticipants.length,
    intensity: clamp(
      Math.round(stored.match.tension_level + 15 + rng() * 40 + (eliminatedIds.length > 0 ? 20 : 0)),
      0,
      100
    ),
    narrative_text: interventionNarrative === '' ? baseNarrative : `${interventionNarrative} ${baseNarrative}`,
    lethal: eliminatedIds.length > 0,
    origin: godModeEffects.induced_action_ids.length > 0 ? 'god_mode' : 'natural',
    induced_by_action_ids: godModeEffects.induced_action_ids,
    created_at: eventCreatedAt
  } satisfies GetMatchStateResponse['recent_events'][number];

  stored.recent_events = [...stored.recent_events, event].slice(-MAX_RECENT_EVENTS);
  stored.match = {
    ...stored.match,
    turn_number: nextDirector.turn_number,
    tension_level: nextDirector.tension_level,
    cycle_phase: 'god_mode'
  };
  stored.next_cycle_phase = nextDirector.cycle_phase;

  const winnerId = resolveWinnerId(stored.participants);
  const finished = winnerId !== null;
  if (finished) {
    stored.match = {
      ...stored.match,
      phase: 'finished',
      cycle_phase: nextDirector.cycle_phase,
      ended_at: eventCreatedAt
    };
  }

  emitStructuredLog('match.turn.event', {
    match_id: stored.match.id,
    turn_number: stored.match.turn_number,
    cycle_phase: currentPhase,
    event_type: event.type,
    template_id: event.template_id,
    participant_count: selectedParticipants.length,
    eliminated_count: eliminatedIds.length,
    event_origin: event.origin,
    induced_action_count: event.induced_by_action_ids.length,
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
