import { LOCATION_CATALOG } from '@/lib/domain/locations';
import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';
import type {
  AdvanceTurnResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  EventLocation,
  GetMatchStateResponse,
  Match,
  ParticipantState,
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

function selectEventLocation(input: {
  match_id: string;
  turn_number: number;
  phase: Match['cycle_phase'];
  template_id: string;
}): EventLocation {
  const signature = checksumFNV1a(JSON.stringify(input));
  const index = parseInt(signature, 16) % LOCATION_CATALOG.length;
  return LOCATION_CATALOG[index] ?? LOCATION_CATALOG[0];
}

function replaySignature(input: {
  ruleset_version: string;
  seed: string | null;
  turn_number: number;
  cycle_phase: Match['cycle_phase'];
  template_id: string;
  location: EventLocation;
  participant_character_ids: string[];
  eliminated_character_ids: string[];
}): string {
  return checksumFNV1a(JSON.stringify(input));
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
    recent_events: []
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

  const currentPhase = stored.match.cycle_phase;
  const nextTurnNumber = stored.match.turn_number + 1;
  const rng = createSeededRng(`${stored.match.seed ?? stored.match.id}:${nextTurnNumber}`);
  const participantCount = sampleParticipantCount(alive.length, rng);
  const selectedParticipants = chooseParticipants(alive, participantCount, rng);
  const recentTemplateIds = stored.recent_events.slice(-4).map((event) => event.template_id);
  const selectedTemplate = selectCatalogEvent(
    TURN_EVENT_CATALOG,
    currentPhase,
    recentTemplateIds,
    rng,
    2
  );
  const selectedLocation = selectEventLocation({
    match_id: stored.match.id,
    turn_number: nextTurnNumber,
    phase: currentPhase,
    template_id: selectedTemplate.id
  });
  const hadElimination =
    alive.length > 1 &&
    (alive.length === 2 || rng() < eliminationChance(currentPhase, stored.match.tension_level, alive.length));

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
    location: selectedLocation,
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
    phase: currentPhase,
    location: selectedLocation,
    participant_count: selectedParticipants.length,
    intensity: clamp(
      Math.round(stored.match.tension_level + 15 + rng() * 40 + (eliminatedIds.length > 0 ? 20 : 0)),
      0,
      100
    ),
    narrative_text: buildEventNarrative({
      template_id: selectedTemplate.id,
      phase: currentPhase,
      location: selectedLocation,
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
    location: event.location,
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
        phase: event.phase,
        location: event.location,
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
