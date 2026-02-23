export const SNAPSHOT_VERSION = 1 as const;
export const RULESET_VERSION = 'v1.0.0' as const;

export type MatchPhase = 'setup' | 'running' | 'finished';
export type CyclePhase = 'bloodbath' | 'day' | 'night' | 'finale';
export type SurpriseLevel = 'low' | 'normal' | 'high';
export type SimulationSpeed = '1x' | '2x' | '4x';
export type EventProfile = 'balanced' | 'aggressive' | 'chaotic';
export type ParticipantStatus = 'alive' | 'injured' | 'eliminated';
export type EventType =
  | 'combat'
  | 'alliance'
  | 'betrayal'
  | 'resource'
  | 'hazard'
  | 'surprise';
export type EventSourceType = 'natural' | 'god_mode';
export type RelationshipState = 'ally' | 'neutral' | 'enemy';
export type GodModeLocation =
  | 'cornucopia'
  | 'forest'
  | 'river'
  | 'lake'
  | 'meadow'
  | 'caves'
  | 'ruins'
  | 'cliffs';
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
  source_type: EventSourceType;
  phase: CyclePhase;
  participant_count: number;
  intensity: number;
  narrative_text: string;
  lethal: boolean;
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
  source_type: EventSourceType;
  phase: CyclePhase;
  narrative_text: string;
  participant_ids: string[];
};

export type GodModeAction =
  | {
      kind: 'global_event';
      event: 'extreme_weather' | 'toxic_fog' | 'cornucopia_resupply';
    }
  | {
      kind: 'localized_fire';
      location_id: GodModeLocation;
      persistence_turns?: number;
    }
  | {
      kind: 'force_encounter';
      tribute_a_id: string;
      tribute_b_id: string;
      location_id?: GodModeLocation;
    }
  | {
      kind: 'separate_tributes';
      tribute_ids: string[];
    }
  | {
      kind: 'resource_adjustment';
      target_id: string;
      resource: 'health';
      delta: number;
    }
  | {
      kind: 'revive_tribute';
      target_id: string;
      revive_mode: 'standard' | 'full';
      cost?: number;
    }
  | {
      kind: 'set_relationship';
      source_id: string;
      target_id: string;
      relation: 'enemy';
    };

export type SubmitGodModeActionsRequest = {
  actions: GodModeAction[];
};

export type SubmitGodModeActionsResponse = {
  match_id: string;
  phase: 'god_mode';
  accepted_actions: number;
  pending_actions: number;
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
  god_mode: {
    phase: 'idle' | 'god_mode';
    pending_actions: number;
  };
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
