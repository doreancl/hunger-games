export const SNAPSHOT_VERSION = 1 as const;
export const RULESET_VERSION = 'v1.0.0' as const;

export type MatchPhase = 'setup' | 'running' | 'finished';
export type OperationalCyclePhase = 'bloodbath' | 'day' | 'night' | 'finale';
export type CyclePhase = OperationalCyclePhase | 'god_mode';
export type SurpriseLevel = 'low' | 'normal' | 'high';
export type SimulationSpeed = '1x' | '2x' | '4x';
export type EventProfile = 'balanced' | 'aggressive' | 'chaotic';
export type ParticipantStatus = 'alive' | 'injured' | 'eliminated';
export type EventOrigin = 'natural' | 'god_mode';
export type RelationshipState = 'ally' | 'neutral' | 'enemy';
export type EventType =
  | 'combat'
  | 'alliance'
  | 'betrayal'
  | 'resource'
  | 'hazard'
  | 'surprise';
export type EventParticipantRole = 'initiator' | 'target' | 'ally' | 'observer';
export type ValidationIssue = {
  path: Array<string | number>;
  code: string;
  message: string;
};

export type ErrorCode =
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_REQUEST_PAYLOAD'
  | 'INTERNAL_CONTRACT_ERROR'
  | 'SNAPSHOT_INVALID'
  | 'SNAPSHOT_VERSION_UNSUPPORTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MATCH_NOT_FOUND'
  | 'MATCH_STATE_CONFLICT';

export type MatchSettings = {
  surprise_level: SurpriseLevel;
  event_profile: EventProfile;
  simulation_speed: SimulationSpeed;
  seed: string | null;
};

export type Match = {
  id: string;
  seed: string | null;
  ruleset_version: string;
  phase: MatchPhase;
  cycle_phase: CyclePhase;
  turn_number: number;
  tension_level: number;
  created_at: string;
  ended_at: string | null;
};

export type ParticipantState = {
  id: string;
  match_id: string;
  character_id: string;
  display_name: string;
  current_health: number;
  status: ParticipantStatus;
  streak_score: number;
};

export type Event = {
  id: string;
  match_id: string;
  template_id: string;
  turn_number: number;
  type: EventType;
  phase: OperationalCyclePhase;
  participant_count: number;
  intensity: number;
  narrative_text: string;
  lethal: boolean;
  origin: EventOrigin;
  induced_by_action_ids: string[];
  created_at: string;
};

export type EventParticipant = {
  id: string;
  event_id: string;
  participant_id: string;
  role: EventParticipantRole;
};

export type MatchSnapshot = {
  snapshot_version: typeof SNAPSHOT_VERSION;
  ruleset_version: string;
  match: Match;
  settings: MatchSettings;
  participants: ParticipantState[];
  recent_events: Event[];
};

export type CreateMatchRequest = {
  roster_character_ids: string[];
  participant_names?: string[];
  settings: MatchSettings;
};

export type CreateMatchResponse = {
  match_id: string;
  phase: 'setup';
};

export type StartMatchResponse = {
  match_id: string;
  phase: 'running';
  cycle_phase: 'bloodbath';
  turn_number: 0;
};

export type AdvanceTurnEventResponse = {
  id: string;
  type: EventType;
  phase: OperationalCyclePhase;
  narrative_text: string;
  participant_ids: string[];
};

export type AdvanceTurnResponse = {
  turn_number: number;
  cycle_phase: CyclePhase;
  tension_level: number;
  event: AdvanceTurnEventResponse;
  survivors_count: number;
  eliminated_ids: string[];
  finished: boolean;
  winner_id: string | null;
};

export type GetMatchStateResponse = {
  match_id: string;
  phase: MatchPhase;
  cycle_phase: CyclePhase;
  turn_number: number;
  tension_level: number;
  settings: MatchSettings;
  participants: ParticipantState[];
  recent_events: Event[];
};

export type GodModeGlobalEventKind = 'extreme_weather' | 'toxic_fog' | 'cornucopia_resupply';

export type GodModeFireOutcome =
  | 'escape_success'
  | 'injured'
  | 'forced_encounter'
  | 'death_by_fire';

export type GodModeAction =
  | {
      id: string;
      kind: 'global_event';
      event_kind: GodModeGlobalEventKind;
    }
  | {
      id: string;
      kind: 'localized_fire';
      location: string;
      persistent_turns: number;
    }
  | {
      id: string;
      kind: 'force_encounter';
      participant_ids: string[];
    }
  | {
      id: string;
      kind: 'separate_tributes';
      participant_ids: string[];
    }
  | {
      id: string;
      kind: 'grant_resource';
      participant_id: string;
      resource: string;
    }
  | {
      id: string;
      kind: 'remove_resource';
      participant_id: string;
      resource: string;
    }
  | {
      id: string;
      kind: 'alter_hostility';
      participant_id: string;
      delta: number;
    }
  | {
      id: string;
      kind: 'revive_tribute';
      participant_id: string;
    }
  | {
      id: string;
      kind: 'set_enmity';
      source_participant_id: string;
      target_participant_id: string;
    };

export type GodModeQueueRequest = {
  actions: GodModeAction[];
};

export type GodModeQueueResponse = {
  match_id: string;
  phase: 'running';
  cycle_phase: 'god_mode';
  queued_actions: number;
};

export type ApiError = {
  error: {
    code: ErrorCode;
    message: string;
    details?: {
      issues: ValidationIssue[];
    };
  };
};
