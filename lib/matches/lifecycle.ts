import { RULESET_VERSION } from '@/lib/domain/types';
import type {
  CreateMatchRequest,
  CreateMatchResponse,
  GetMatchStateResponse,
  Match,
  ParticipantState,
  StartMatchResponse
} from '@/lib/domain/types';

type StoredMatch = {
  match: Match;
  settings: GetMatchStateResponse['settings'];
  participants: ParticipantState[];
  recent_events: GetMatchStateResponse['recent_events'];
};

const MATCHES_STORE_KEY = '__hunger_games_matches_store_v1__' as const;
type GlobalMatchesStore = typeof globalThis & {
  [MATCHES_STORE_KEY]?: Map<string, StoredMatch>;
};

function getMatchesStore() {
  const globalStore = globalThis as GlobalMatchesStore;
  if (!globalStore[MATCHES_STORE_KEY]) {
    globalStore[MATCHES_STORE_KEY] = new Map<string, StoredMatch>();
  }
  return globalStore[MATCHES_STORE_KEY];
}

const matches = getMatchesStore();

type StartMatchErrorCode = 'MATCH_NOT_FOUND' | 'MATCH_STATE_CONFLICT';

type StartMatchResult =
  | { ok: true; value: StartMatchResponse }
  | {
      ok: false;
      error: {
        code: StartMatchErrorCode;
        message: string;
      };
    };

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

export function resetMatchesForTests() {
  matches.clear();
}
