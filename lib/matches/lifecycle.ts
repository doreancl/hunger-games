import { RULESET_VERSION } from '@/lib/domain/types';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  AdvanceTurnResponse,
  CreateMatchRequest,
  CreateMatchResponse,
  GetMatchStateResponse,
  Match,
  ParticipantState,
  StartMatchResponse
} from '@/lib/domain/types';
import type { EventTemplate, SeededRng } from '@/lib/simulation-state';
import {
  advanceDirector,
  createSeededRng,
  sampleParticipantCount,
  selectCatalogEvent
} from '@/lib/simulation-state';

type StoredMatch = {
  match: Match;
  settings: GetMatchStateResponse['settings'];
  participants: ParticipantState[];
  recent_events: GetMatchStateResponse['recent_events'];
};

const matches = new Map<string, StoredMatch>();
const DEFAULT_MATCHES_STORE_FILE =
  process.env.NODE_ENV === 'test'
    ? null
    : `${process.cwd()}/.hunger-games/matches-store-v1.json`;
const MATCHES_STORE_FILE =
  process.env.MATCHES_STORE_FILE?.trim() || DEFAULT_MATCHES_STORE_FILE;

const MAX_RECENT_EVENTS = 12;

const TURN_EVENT_CATALOG: EventTemplate[] = [
  { id: 'combat-1', type: 'combat', base_weight: 10, phases: ['bloodbath', 'day', 'night'] },
  { id: 'combat-2', type: 'combat', base_weight: 8, phases: ['bloodbath', 'day', 'night'] },
  { id: 'alliance-1', type: 'alliance', base_weight: 6, phases: ['day', 'night', 'finale'] },
  { id: 'betrayal-1', type: 'betrayal', base_weight: 7, phases: ['day', 'night', 'finale'] },
  { id: 'resource-1', type: 'resource', base_weight: 5, phases: ['day', 'night'] },
  { id: 'hazard-1', type: 'hazard', base_weight: 6, phases: ['bloodbath', 'night', 'finale'] },
  { id: 'surprise-1', type: 'surprise', base_weight: 4, phases: ['day', 'night', 'finale'] }
];

function persistMatchesToDisk() {
  if (!MATCHES_STORE_FILE) {
    return;
  }

  try {
    mkdirSync(dirname(MATCHES_STORE_FILE), { recursive: true });
    writeFileSync(MATCHES_STORE_FILE, JSON.stringify([...matches.entries()]), 'utf8');
  } catch {
    // Persistence is best-effort for local continuity.
  }
}

function hydrateMatchesFromDisk() {
  if (!MATCHES_STORE_FILE || !existsSync(MATCHES_STORE_FILE)) {
    return;
  }

  try {
    const raw = readFileSync(MATCHES_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return;
    }

    matches.clear();
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 2) {
        continue;
      }
      const [id, value] = entry;
      if (typeof id !== 'string' || !value || typeof value !== 'object') {
        continue;
      }
      matches.set(id, value as StoredMatch);
    }
  } catch {
    // Ignore invalid persisted snapshots.
  }
}

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

function eventNarrative(
  templateId: string,
  cyclePhase: Match['cycle_phase'],
  participantCount: number,
  eliminatedCount: number
): string {
  const eliminationSuffix =
    eliminatedCount > 0
      ? ` Hubo ${eliminatedCount} eliminacion${eliminatedCount > 1 ? 'es' : ''}.`
      : ' Nadie fue eliminado.';
  return `Evento ${templateId} en fase ${cyclePhase} con ${participantCount} participante(s).${eliminationSuffix}`;
}

function resolveWinnerId(participants: ParticipantState[]): string | null {
  const alive = aliveParticipants(participants);
  if (alive.length !== 1) {
    return null;
  }

  return alive[0].id;
}

export function createMatch(input: CreateMatchRequest): CreateMatchResponse {
  const matchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const settings = input.settings;

  const participants: ParticipantState[] = input.roster_character_ids.map((characterId) => ({
    id: crypto.randomUUID(),
    match_id: matchId,
    character_id: characterId,
    current_health: 100,
    status: 'alive',
    streak_score: 0
  }));

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
  persistMatchesToDisk();

  return {
    match_id: matchId,
    phase: 'setup'
  };
}

export function startMatch(matchId: string): StartMatchResult {
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

  if (stored.match.phase !== 'setup') {
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
  persistMatchesToDisk();

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
        message: `Match cannot advance from phase "${stored.match.phase}".`
      }
    };
  }

  const alive = aliveParticipants(stored.participants);
  if (alive.length <= 1) {
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
  const hadElimination =
    alive.length > 1 &&
    (alive.length === 2 || rng() < eliminationChance(currentPhase, stored.match.tension_level, alive.length));

  const eliminatedIds: string[] = [];
  if (hadElimination) {
    const eliminatedIndex = Math.floor(rng() * selectedParticipants.length);
    const eliminatedParticipant = selectedParticipants[eliminatedIndex];
    eliminatedIds.push(eliminatedParticipant.id);

    const target = stored.participants.find((participant) => participant.id === eliminatedParticipant.id);
    if (target) {
      target.status = 'eliminated';
      target.current_health = 0;
    }
  }

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
    participant_count: selectedParticipants.length,
    intensity: clamp(
      Math.round(stored.match.tension_level + 15 + rng() * 40 + (eliminatedIds.length > 0 ? 20 : 0)),
      0,
      100
    ),
    narrative_text: eventNarrative(
      selectedTemplate.id,
      currentPhase,
      selectedParticipants.length,
      eliminatedIds.length
    ),
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
  persistMatchesToDisk();

  return {
    ok: true,
    value: {
      turn_number: stored.match.turn_number,
      cycle_phase: stored.match.cycle_phase,
      tension_level: stored.match.tension_level,
      event: {
        id: event.id,
        type: event.type,
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
  if (MATCHES_STORE_FILE) {
    try {
      rmSync(MATCHES_STORE_FILE, { force: true });
    } catch {
      // ignore cleanup errors in tests
    }
  }
}

hydrateMatchesFromDisk();
