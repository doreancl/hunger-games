import { z } from 'zod';
import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';

export const surpriseLevelSchema = z.enum(['low', 'normal', 'high']);
export const simulationSpeedSchema = z.enum(['1x', '2x', '4x']);
export const eventProfileSchema = z.enum(['balanced', 'aggressive', 'chaotic']);
export const participantStatusSchema = z.enum(['alive', 'injured', 'eliminated']);
export const matchPhaseSchema = z.enum(['setup', 'running', 'finished']);
export const cyclePhaseSchema = z.enum(['bloodbath', 'day', 'night', 'finale']);
export const eventTypeSchema = z.enum([
  'combat',
  'alliance',
  'betrayal',
  'resource',
  'hazard',
  'surprise'
]);
export const eventParticipantRoleSchema = z.enum([
  'initiator',
  'target',
  'ally',
  'observer'
]);

export const rulesetVersionSchema = z
  .string()
  .regex(/^v\d+\.\d+\.\d+$/, 'ruleset_version must follow v<major>.<minor>.<patch>')
  .default(RULESET_VERSION);

export const matchSettingsSchema = z.object({
  surprise_level: surpriseLevelSchema,
  event_profile: eventProfileSchema,
  simulation_speed: simulationSpeedSchema,
  seed: z.string().min(1).nullable()
});

export const participantStateSchema = z.object({
  id: z.string().min(1),
  match_id: z.string().min(1),
  character_id: z.string().min(1),
  current_health: z.number().int().min(0),
  status: participantStatusSchema,
  streak_score: z.number().int().min(0)
});

export const eventSchema = z.object({
  id: z.string().min(1),
  match_id: z.string().min(1),
  template_id: z.string().min(1),
  turn_number: z.number().int().min(0),
  type: eventTypeSchema,
  phase: cyclePhaseSchema,
  participant_count: z.number().int().min(0),
  intensity: z.number().min(0),
  narrative_text: z.string().min(1),
  lethal: z.boolean(),
  created_at: z.string().datetime()
});

export const matchSchema = z.object({
  id: z.string().min(1),
  seed: z.string().min(1).nullable(),
  ruleset_version: rulesetVersionSchema,
  phase: matchPhaseSchema,
  cycle_phase: cyclePhaseSchema,
  turn_number: z.number().int().min(0),
  tension_level: z.number().min(0),
  created_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable()
});

export const matchSnapshotSchema = z.object({
  snapshot_version: z.literal(SNAPSHOT_VERSION),
  ruleset_version: rulesetVersionSchema,
  match: matchSchema,
  settings: matchSettingsSchema,
  participants: z.array(participantStateSchema),
  recent_events: z.array(eventSchema)
});

export const createMatchRequestSchema = z.object({
  roster_character_ids: z.array(z.string().min(1)).min(1),
  settings: matchSettingsSchema
});

export const createMatchResponseSchema = z.object({
  match_id: z.string().min(1),
  phase: z.literal('setup')
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(['INVALID_JSON', 'INVALID_REQUEST_PAYLOAD', 'INTERNAL_CONTRACT_ERROR']),
    message: z.string(),
    details: z.unknown().optional()
  })
});
