import {
  buildCharacterLabel,
  DEFAULT_FRANCHISE_CATALOG_SOURCE,
  normalizeFranchiseCatalog,
  type NormalizeFranchiseCatalogResult
} from '@/lib/domain/franchise-catalog';
import { recordCounterMetric, recordThresholdAlert } from '@/lib/observability';
import type {
  AdvanceTurnResponse,
  CyclePhase,
  EventType,
  GetMatchStateResponse,
  MatchPhase,
  ParticipantState,
  SimulationSpeed
} from '@/lib/domain/types';

export const DEFAULT_CHARACTERS: string[] = [];
export const DEFAULT_SIMULATION_SPEED: SimulationSpeed = '2x';
export const DEFAULT_EVENT_PROFILE = 'balanced' as const;
export const DEFAULT_SURPRISE_LEVEL = 'normal' as const;

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  combat: 'Combate',
  alliance: 'Alianza',
  betrayal: 'Traicion',
  resource: 'Recursos',
  hazard: 'Peligro',
  surprise: 'Sorpresa'
};

const EVENT_ACTION: Record<EventType, string> = {
  combat: 'chocan en combate directo',
  alliance: 'sellan una alianza estrategica',
  betrayal: 'rompen la confianza con una traicion',
  resource: 'aseguran recursos criticos',
  hazard: 'resisten una amenaza del entorno',
  surprise: 'quedan atrapados en un giro inesperado'
};

export const SPEED_INTERVAL_MS: Record<SimulationSpeed, number> = {
  '1x': 1700,
  '2x': 980,
  '4x': 560
};

const SESSION_SIZE_HIGH_BYTES = 1024 * 1024;
const SESSION_SIZE_CRITICAL_BYTES = 1536 * 1024;
const INVALID_CATALOG_VERSION_ALERT_THRESHOLD = process.env.NODE_ENV === 'production' ? 1 : 3;

export const TRANSITION_STORAGE_KEY = 'hg_transition';
export const TRANSITION_MIN_VISIBLE_MS = 700;
export const TRANSITION_LONG_WAIT_MS = 3000;
export const TRANSITION_FADE_OUT_MS = 180;
export const FIRST_AUTOPLAY_DELAY_MS = 1200;
export { DEFAULT_FRANCHISE_CATALOG_SOURCE, buildCharacterLabel };

export type PlaybackSpeed = SimulationSpeed | 'pause';
export type TransitionDirection = 'lobby_to_match' | 'match_to_lobby';

export type TransitionOverlayState = {
  direction: TransitionDirection;
  showLongWait: boolean;
  isExiting: boolean;
};

export type FeedEvent = {
  id: string;
  turn_number: number;
  phase: CyclePhase;
  type: EventType;
  headline: string;
  impact: string;
  character_ids: string[];
  created_at: string;
};

export type SimulationRuntime = {
  match_id: string;
  phase: MatchPhase;
  cycle_phase: CyclePhase;
  turn_number: number;
  tension_level: number;
  settings: GetMatchStateResponse['settings'];
  participants: ParticipantState[];
  feed: FeedEvent[];
  winner_id: string | null;
};

export const EMPTY_FEED: FeedEvent[] = [];

export function normalizeCatalogWithObservability(
  source: unknown,
  sourceLabel: string
): NormalizeFranchiseCatalogResult {
  const result = normalizeFranchiseCatalog(source);
  const invalidVersionCount = result.diagnostics.invalid_version_count;

  if (invalidVersionCount > 0) {
    const dimensions = {
      source: sourceLabel,
      environment: process.env.NODE_ENV ?? 'development'
    };
    const metric = recordCounterMetric(
      'catalog.invalid_version_count',
      invalidVersionCount,
      dimensions
    );
    recordThresholdAlert(
      'catalog.invalid_version_count.threshold',
      metric.total,
      INVALID_CATALOG_VERSION_ALERT_THRESHOLD,
      dimensions
    );
  }

  return result;
}

export function createBrowserUuid(): string | null {
  if (typeof window === 'undefined' || typeof crypto === 'undefined') {
    return null;
  }

  if (typeof crypto.randomUUID !== 'function') {
    return null;
  }

  return crypto.randomUUID();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`;
}

export function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function sessionSizeTone(bytes: number): 'ok' | 'high' | 'critical' {
  if (bytes >= SESSION_SIZE_CRITICAL_BYTES) {
    return 'critical';
  }
  if (bytes >= SESSION_SIZE_HIGH_BYTES) {
    return 'high';
  }
  return 'ok';
}

export function sessionToneBadgeVariant(
  tone: ReturnType<typeof sessionSizeTone>
): 'success' | 'warning' | 'destructive' {
  if (tone === 'critical') {
    return 'destructive';
  }

  if (tone === 'high') {
    return 'warning';
  }

  return 'success';
}

export function countAlive(participants: ParticipantState[]): number {
  return participants.filter((participant) => participant.status !== 'eliminated').length;
}

export function phaseLabel(phase: CyclePhase | 'setup'): string {
  const labels: Record<CyclePhase | 'setup', string> = {
    setup: 'Setup',
    bloodbath: 'Bloodbath',
    day: 'Dia',
    night: 'Noche',
    finale: 'Finale',
    god_mode: 'Modo Dios'
  };

  return labels[phase];
}

export function statusLabel(status: ParticipantState['status']): string {
  if (status === 'alive') {
    return 'Vivo';
  }
  if (status === 'injured') {
    return 'Herido';
  }

  return 'Eliminado';
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (!('error' in payload)) {
    return null;
  }

  const errorValue = (payload as { error?: unknown }).error;
  if (!errorValue || typeof errorValue !== 'object') {
    return null;
  }

  if (!('message' in errorValue)) {
    return null;
  }

  const message = (errorValue as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      extractErrorMessage(payload) ?? `Request failed (${response.status}) for ${input}`;
    throw new Error(message);
  }

  return payload as T;
}

export function feedFromSnapshot(state: GetMatchStateResponse): FeedEvent[] {
  return [...state.recent_events]
    .sort((left, right) => right.turn_number - left.turn_number)
    .map((event) => ({
      id: event.id,
      turn_number: event.turn_number,
      phase: event.phase,
      type: event.type,
      headline: event.narrative_text,
      impact: event.lethal
        ? 'Impacto: evento letal en el ultimo intercambio.'
        : 'Impacto: tension sube sin bajas directas.',
      character_ids: [],
      created_at: event.created_at
    }));
}

function summarizeActors(characterNames: string[]): string {
  if (characterNames.length === 0) {
    return 'La arena';
  }

  if (characterNames.length === 1) {
    return characterNames[0];
  }

  if (characterNames.length === 2) {
    return `${characterNames[0]} y ${characterNames[1]}`;
  }

  return `${characterNames[0]}, ${characterNames[1]} +${characterNames.length - 2}`;
}

function impactByType(type: EventType): string {
  if (type === 'alliance') {
    return 'Impacto: cohesion tactica en aumento.';
  }

  if (type === 'betrayal') {
    return 'Impacto: confianza rota y riesgo social alto.';
  }

  if (type === 'resource') {
    return 'Impacto: ventaja temporal de recursos.';
  }

  if (type === 'hazard') {
    return 'Impacto: presion ambiental sobre el roster.';
  }

  if (type === 'surprise') {
    return 'Impacto: la tension global cambia sin previo aviso.';
  }

  return 'Impacto: intercambio agresivo entre participantes.';
}

export function feedFromAdvance(
  advance: AdvanceTurnResponse,
  participants: ParticipantState[],
  getCharacterName: (characterId: string) => string
): FeedEvent {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const characterIds = advance.event.participant_ids
    .map((participantId) => participantsById.get(participantId)?.character_id)
    .filter((characterId): characterId is string => Boolean(characterId));
  const actorNames = characterIds.map((characterId) => getCharacterName(characterId));
  const eliminatedNames = advance.eliminated_ids
    .map((participantId) => participantsById.get(participantId)?.character_id)
    .filter((characterId): characterId is string => Boolean(characterId))
    .map((characterId) => getCharacterName(characterId));

  const impact =
    eliminatedNames.length > 0
      ? `Impacto: ${eliminatedNames.join(', ')} queda fuera de la simulacion.`
      : impactByType(advance.event.type);

  return {
    id: advance.event.id,
    turn_number: advance.turn_number,
    phase: advance.event.phase,
    type: advance.event.type,
    headline: `${summarizeActors(actorNames)} ${EVENT_ACTION[advance.event.type]}.`,
    impact,
    character_ids: characterIds,
    created_at: new Date().toISOString()
  };
}

export function relationDelta(type: EventType): number {
  if (type === 'alliance' || type === 'resource') {
    return 2;
  }

  if (type === 'betrayal') {
    return -3;
  }

  if (type === 'combat' || type === 'hazard') {
    return -1;
  }

  return 0;
}

export function relationTone(score: number): string {
  if (score >= 3) {
    return 'Alianza fuerte';
  }

  if (score >= 1) {
    return 'Coordinacion estable';
  }

  if (score <= -3) {
    return 'Rivalidad critica';
  }

  if (score <= -1) {
    return 'Friccion activa';
  }

  return 'Relacion neutra';
}
