import { z } from 'zod';
import { RULESET_VERSION, SNAPSHOT_VERSION } from '@/lib/domain/types';

export const surpriseLevelSchema = z.enum(['low', 'normal', 'high']);
export const simulationSpeedSchema = z.enum(['1x', '2x', '4x']);
export const eventProfileSchema = z.enum(['balanced', 'aggressive', 'chaotic']);
export const participantStatusSchema = z.enum(['alive', 'injured', 'eliminated']);
export const matchPhaseSchema = z.enum(['setup', 'running', 'finished']);
export const operationalCyclePhaseSchema = z.enum(['bloodbath', 'day', 'night', 'finale']);
export const cyclePhaseSchema = z.enum(['bloodbath', 'day', 'night', 'finale', 'god_mode']);
export const eventTypeSchema = z.enum([
  'combat',
  'alliance',
  'betrayal',
  'resource',
  'hazard',
  'surprise'
]);
export const eventOriginSchema = z.enum(['natural', 'god_mode']);
export const eventLocationSchema = z.enum([
  'cornucopia',
  'forest',
  'river',
  'lake',
  'meadow',
  'caves',
  'ruins',
  'cliffs'
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

export const matchSettingsSchema = z
  .object({
    surprise_level: surpriseLevelSchema,
    event_profile: eventProfileSchema,
    simulation_speed: simulationSpeedSchema,
    seed: z.string().min(1).nullable()
  })
  .strict();

export const participantStateSchema = z
  .object({
    id: z.string().min(1),
    match_id: z.string().min(1),
    character_id: z.string().min(1),
    display_name: z.string().trim().min(1).max(40),
    current_health: z.number().int().min(0),
    status: participantStatusSchema,
    streak_score: z.number().int().min(0)
  })
  .strict();

export const eventSchema = z
  .object({
    id: z.string().min(1),
    match_id: z.string().min(1),
    template_id: z.string().min(1),
    turn_number: z.number().int().min(0),
    type: eventTypeSchema,
    location: eventLocationSchema,
    phase: cyclePhaseSchema,
    participant_count: z.number().int().min(0),
    intensity: z.number().min(0),
    narrative_text: z.string().min(1),
    lethal: z.boolean(),
    origin: eventOriginSchema,
    induced_by_action_ids: z.array(z.string().min(1)),
    created_at: z.string().datetime()
  })
  .strict();

export const matchSchema = z
  .object({
    id: z.string().min(1),
    seed: z.string().min(1).nullable(),
    ruleset_version: rulesetVersionSchema,
    phase: matchPhaseSchema,
    cycle_phase: cyclePhaseSchema,
    turn_number: z.number().int().min(0),
    tension_level: z.number().min(0),
    created_at: z.string().datetime(),
    ended_at: z.string().datetime().nullable()
  })
  .strict();

export const matchSnapshotSchema = z
  .object({
    snapshot_version: z.literal(SNAPSHOT_VERSION),
    ruleset_version: rulesetVersionSchema,
    match: matchSchema,
    settings: matchSettingsSchema,
    participants: z.array(participantStateSchema).max(48),
    recent_events: z.array(eventSchema).max(200)
  })
  .strict();

const snapshotChecksumSchema = z.string().regex(/^[a-f0-9]{8}$/i, 'checksum must be 8 hex chars');

export const snapshotEnvelopeVersionSchema = z
  .object({
    snapshot_version: z.number().int().min(1)
  })
  .passthrough();

export const snapshotEnvelopeSchema = z
  .object({
    snapshot_version: z.literal(SNAPSHOT_VERSION),
    checksum: snapshotChecksumSchema,
    snapshot: matchSnapshotSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.snapshot.snapshot_version !== value.snapshot_version) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'snapshot version mismatch between envelope and snapshot payload',
        path: ['snapshot', 'snapshot_version']
      });
    }
  });

export const createMatchRequestSchema = z
  .object({
    roster_character_ids: z.array(z.string().min(1)).min(10).max(48),
    participant_names: z.array(z.string().trim().min(1).max(40)).min(10).max(48).optional(),
    settings: z
      .object({
        surprise_level: surpriseLevelSchema.default('normal'),
        event_profile: eventProfileSchema.default('balanced'),
        simulation_speed: simulationSpeedSchema.default('1x'),
        seed: z.string().min(1).nullable().default(null)
      })
      .strict()
      .default({
        surprise_level: 'normal',
        event_profile: 'balanced',
        simulation_speed: '1x',
        seed: null
      })
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.participant_names !== undefined &&
      value.participant_names.length !== value.roster_character_ids.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'participant_names length must match roster_character_ids length',
        path: ['participant_names']
      });
    }
  });

export const createMatchResponseSchema = z
  .object({
    match_id: z.string().min(1),
    phase: z.literal('setup')
  })
  .strict();

export const startMatchResponseSchema = z
  .object({
    match_id: z.string().min(1),
    phase: z.literal('running'),
    cycle_phase: z.literal('bloodbath'),
    turn_number: z.literal(0)
  })
  .strict();

export const advanceTurnResponseSchema = z
  .object({
    turn_number: z.number().int().min(1),
    cycle_phase: cyclePhaseSchema,
    tension_level: z.number().min(0),
    event: z
      .object({
        id: z.string().min(1),
        type: eventTypeSchema,
        location: eventLocationSchema,
        phase: cyclePhaseSchema,
        narrative_text: z.string().min(1),
        participant_ids: z.array(z.string().min(1)).min(1)
      })
      .strict(),
    survivors_count: z.number().int().min(1),
    eliminated_ids: z.array(z.string().min(1)),
    finished: z.boolean(),
    winner_id: z.string().min(1).nullable()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.finished && value.survivors_count !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'finished=true requires survivors_count=1',
        path: ['survivors_count']
      });
    }

    if (!value.finished && value.winner_id !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'winner_id must be null when finished=false',
        path: ['winner_id']
      });
    }

    if (value.finished && value.winner_id === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'winner_id is required when finished=true',
        path: ['winner_id']
      });
    }
  });

export const resumeMatchRequestSchema = snapshotEnvelopeSchema;
export const advanceTurnRequestSchema = snapshotEnvelopeSchema;

const godModeActionSchemaBase = z.object({
  id: z.string().min(1)
});

export const godModeActionSchema = z.discriminatedUnion('kind', [
  godModeActionSchemaBase.extend({
    kind: z.literal('global_event'),
    event_kind: z.enum(['extreme_weather', 'toxic_fog', 'cornucopia_resupply'])
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('localized_fire'),
    location: z.string().trim().min(1).max(40),
    persistent_turns: z.number().int().min(1).max(3).default(1)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('force_encounter'),
    participant_ids: z.array(z.string().min(1)).min(2).max(6)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('separate_tributes'),
    participant_ids: z.array(z.string().min(1)).min(2).max(6)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('grant_resource'),
    participant_id: z.string().min(1),
    resource: z.string().trim().min(1).max(40)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('remove_resource'),
    participant_id: z.string().min(1),
    resource: z.string().trim().min(1).max(40)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('alter_hostility'),
    participant_id: z.string().min(1),
    delta: z.number().int().min(-20).max(20)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('revive_tribute'),
    participant_id: z.string().min(1)
  }),
  godModeActionSchemaBase.extend({
    kind: z.literal('set_enmity'),
    source_participant_id: z.string().min(1),
    target_participant_id: z.string().min(1)
  })
]);

export const godModeQueueRequestSchema = z
  .object({
    actions: z.array(godModeActionSchema).min(1).max(8)
  })
  .strict();

export const godModeQueueResponseSchema = z
  .object({
    match_id: z.string().min(1),
    phase: z.literal('running'),
    cycle_phase: z.literal('god_mode'),
    queued_actions: z.number().int().min(0)
  })
  .strict();

export const getMatchStateResponseSchema = z
  .object({
    match_id: z.string().min(1),
    phase: matchPhaseSchema,
    cycle_phase: cyclePhaseSchema,
    turn_number: z.number().int().min(0),
    tension_level: z.number().min(0),
    settings: matchSettingsSchema,
    participants: z.array(participantStateSchema),
    recent_events: z.array(eventSchema)
  })
  .strict();

export const resumeMatchResponseSchema = getMatchStateResponseSchema;

const validationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    code: z.string(),
    message: z.string()
  })
  .strict();

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'UNSUPPORTED_MEDIA_TYPE',
          'INVALID_JSON',
          'PAYLOAD_TOO_LARGE',
          'INVALID_REQUEST_PAYLOAD',
          'INTERNAL_CONTRACT_ERROR',
          'SNAPSHOT_INVALID',
          'SNAPSHOT_VERSION_UNSUPPORTED',
          'RATE_LIMIT_EXCEEDED',
          'MATCH_NOT_FOUND',
          'MATCH_STATE_CONFLICT'
        ]),
        message: z.string(),
        details: z
          .object({
            issues: z.array(validationIssueSchema)
          })
          .strict()
          .optional()
      })
      .strict()
  })
  .strict();
