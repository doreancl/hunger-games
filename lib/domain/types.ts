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
export type EventParticipantRole = 'initiator' | 'target' | 'ally' | 'observer';
export type ValidationIssue = {
  path: Array<string | number>;
  code: string;
  message: string;
};

export type ErrorCode =
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST_PAYLOAD'
  | 'INTERNAL_CONTRACT_ERROR';

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
  settings: MatchSettings;
};

export type CreateMatchResponse = {
  match_id: string;
  phase: 'setup';
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
