'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import {
  createLocalMatchFromSetup,
  getSetupValidation,
  loadLocalMatchesFromStorage,
  saveLocalMatchesToStorage,
  type LocalMatchSummary
} from '@/lib/local-matches';
import {
  clearLocalRuntimeFromStorage,
  estimateLocalRuntimeSnapshotBytes,
  loadLocalRuntimeFromStorage,
  saveLocalRuntimeToStorage
} from '@/lib/local-runtime';
import { loadLocalPrefsFromStorage, saveLocalPrefsToStorage } from '@/lib/local-prefs';
import { classifyAdvanceFailure, recoveryMessageForAdvanceFailure } from '@/lib/runtime-recovery';
import type {
  AdvanceTurnResponse,
  CreateMatchResponse,
  CyclePhase,
  EventType,
  GetMatchStateResponse,
  MatchPhase,
  ParticipantState,
  SimulationSpeed,
  StartMatchResponse
} from '@/lib/domain/types';

const CHARACTER_OPTIONS = [
  { id: 'char-01', name: 'Atlas' },
  { id: 'char-02', name: 'Nova' },
  { id: 'char-03', name: 'Kael' },
  { id: 'char-04', name: 'Mara' },
  { id: 'char-05', name: 'Orion' },
  { id: 'char-06', name: 'Luna' },
  { id: 'char-07', name: 'Ezra' },
  { id: 'char-08', name: 'Iris' },
  { id: 'char-09', name: 'Dax' },
  { id: 'char-10', name: 'Cora' },
  { id: 'char-11', name: 'Vex' },
  { id: 'char-12', name: 'Sage' }
];

const DEFAULT_CHARACTERS = CHARACTER_OPTIONS.slice(0, 10).map((character) => character.id);
const DEFAULT_SIMULATION_SPEED: SimulationSpeed = '1x';
const DEFAULT_EVENT_PROFILE = 'balanced' as const;
const DEFAULT_SURPRISE_LEVEL = 'normal' as const;

const EVENT_TYPE_LABEL: Record<EventType, string> = {
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

const SPEED_INTERVAL_MS: Record<SimulationSpeed, number> = {
  '1x': 1700,
  '2x': 980,
  '4x': 560
};

const SESSION_SIZE_HIGH_BYTES = 1024 * 1024;
const SESSION_SIZE_CRITICAL_BYTES = 1536 * 1024;

type PlaybackSpeed = SimulationSpeed | 'pause';

type FeedEvent = {
  id: string;
  turn_number: number;
  phase: CyclePhase;
  type: EventType;
  headline: string;
  impact: string;
  character_ids: string[];
  created_at: string;
};

type SimulationRuntime = {
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

const EMPTY_FEED: FeedEvent[] = [];

function createBrowserUuid(): string | null {
  if (typeof window === 'undefined' || typeof crypto === 'undefined') {
    return null;
  }

  if (typeof crypto.randomUUID !== 'function') {
    return null;
  }

  return crypto.randomUUID();
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`;
}

function sessionSizeTone(bytes: number): 'ok' | 'high' | 'critical' {
  if (bytes >= SESSION_SIZE_CRITICAL_BYTES) {
    return 'critical';
  }
  if (bytes >= SESSION_SIZE_HIGH_BYTES) {
    return 'high';
  }
  return 'ok';
}

function countAlive(participants: ParticipantState[]): number {
  return participants.filter((participant) => participant.status !== 'eliminated').length;
}

function characterName(characterId: string): string {
  return CHARACTER_OPTIONS.find((candidate) => candidate.id === characterId)?.name ?? characterId;
}

function phaseLabel(phase: CyclePhase | 'setup'): string {
  const labels: Record<CyclePhase | 'setup', string> = {
    setup: 'Setup',
    bloodbath: 'Bloodbath',
    day: 'Dia',
    night: 'Noche',
    finale: 'Finale'
  };

  return labels[phase];
}

function statusLabel(status: ParticipantState['status']): string {
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

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      extractErrorMessage(payload) ?? `Request failed (${response.status}) for ${input}`;
    throw new Error(message);
  }

  return payload as T;
}

function feedFromSnapshot(state: GetMatchStateResponse): FeedEvent[] {
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

function feedFromAdvance(
  advance: AdvanceTurnResponse,
  participants: ParticipantState[]
): FeedEvent {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const characterIds = advance.event.participant_ids
    .map((participantId) => participantsById.get(participantId)?.character_id)
    .filter((characterId): characterId is string => Boolean(characterId));
  const actorNames = characterIds.map((characterId) => characterName(characterId));
  const eliminatedNames = advance.eliminated_ids
    .map((participantId) => participantsById.get(participantId)?.character_id)
    .filter((characterId): characterId is string => Boolean(characterId))
    .map((characterId) => characterName(characterId));

  const impact =
    eliminatedNames.length > 0
      ? `Impacto: ${eliminatedNames.join(', ')} queda fuera de la simulacion.`
      : impactByType(advance.event.type);

  return {
    id: advance.event.id,
    turn_number: advance.turn_number,
    phase: advance.cycle_phase,
    type: advance.event.type,
    headline: `${summarizeActors(actorNames)} ${EVENT_ACTION[advance.event.type]}.`,
    impact,
    character_ids: characterIds,
    created_at: new Date().toISOString()
  };
}

function relationDelta(type: EventType): number {
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

function relationTone(score: number): string {
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

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(DEFAULT_CHARACTERS);
  const [seed, setSeed] = useState('');
  const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>(DEFAULT_SIMULATION_SPEED);
  const [eventProfile, setEventProfile] = useState<'balanced' | 'aggressive' | 'chaotic'>(
    DEFAULT_EVENT_PROFILE
  );
  const [surpriseLevel, setSurpriseLevel] = useState<'low' | 'normal' | 'high'>(
    DEFAULT_SURPRISE_LEVEL
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [runtime, setRuntime] = useState<SimulationRuntime | null>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('pause');
  const [filterCharacterId, setFilterCharacterId] = useState<'all' | string>('all');
  const [filterEventType, setFilterEventType] = useState<'all' | EventType>('all');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [latestFeedEventId, setLatestFeedEventId] = useState<string | null>(null);

  const setupValidation = useMemo(
    () => getSetupValidation(selectedCharacters),
    [selectedCharacters]
  );

  const aliveCount = runtime
    ? countAlive(runtime.participants)
    : selectedCharacters.length;
  const totalParticipants = runtime
    ? runtime.participants.length
    : selectedCharacters.length;
  const eliminatedCount = Math.max(0, totalParticipants - aliveCount);
  const currentPhase = runtime?.cycle_phase ?? 'setup';
  const currentTurn = runtime?.turn_number ?? 0;
  const tensionValue = runtime?.tension_level ?? Math.min(100, 10 + selectedCharacters.length * 4);

  const feed = runtime?.feed ?? EMPTY_FEED;
  const currentSessionSizeBytes = runtime ? estimateLocalRuntimeSnapshotBytes(runtime) : 0;
  const currentSessionSizeLabel = formatBytes(currentSessionSizeBytes);
  const currentSessionSizeTone = sessionSizeTone(currentSessionSizeBytes);
  const filteredFeed = useMemo(
    () =>
      feed.filter((event) => {
        const matchesType = filterEventType === 'all' || event.type === filterEventType;
        const matchesCharacter =
          filterCharacterId === 'all' || event.character_ids.includes(filterCharacterId);
        return matchesType && matchesCharacter;
      }),
    [feed, filterCharacterId, filterEventType]
  );

  const relationHighlights = useMemo(() => {
    const scoreByPair = new Map<string, { pair: [string, string]; score: number }>();

    for (const event of feed) {
      if (event.character_ids.length < 2) {
        continue;
      }

      const pair: [string, string] = [event.character_ids[0], event.character_ids[1]].sort(
        (left, right) => left.localeCompare(right)
      ) as [string, string];
      const key = `${pair[0]}|${pair[1]}`;
      const previous = scoreByPair.get(key);
      const nextScore = (previous?.score ?? 0) + relationDelta(event.type);

      scoreByPair.set(key, {
        pair,
        score: nextScore
      });
    }

    return [...scoreByPair.values()]
      .sort((left, right) => Math.abs(right.score) - Math.abs(left.score))
      .slice(0, 5);
  }, [feed]);

  const participantStatusList = useMemo(() => {
    if (!runtime) {
      return [];
    }

    return [...runtime.participants].sort((left, right) => {
      if (left.status === right.status) {
        return right.current_health - left.current_health;
      }

      const order: Record<ParticipantState['status'], number> = {
        alive: 0,
        injured: 1,
        eliminated: 2
      };
      return order[left.status] - order[right.status];
    });
  }, [runtime]);

  const characterFilterOptions = useMemo(() => {
    const source = runtime?.participants.map((participant) => participant.character_id) ?? selectedCharacters;
    const unique = [...new Set(source)];
    return unique.map((characterId) => ({ id: characterId, name: characterName(characterId) }));
  }, [runtime, selectedCharacters]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const prefs = loadLocalPrefsFromStorage(window.localStorage);
    setAutosaveEnabled(prefs.autosave_enabled);

    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    const runtimeLoad = prefs.autosave_enabled
      ? loadLocalRuntimeFromStorage(window.localStorage)
      : { runtime: null, error: null };
    setLocalMatches(matches);
    setRuntime(runtimeLoad.runtime);

    if (runtimeLoad.runtime) {
      const runtimeMatch = matches.find((candidate) => candidate.id === runtimeLoad.runtime?.match_id);
      if (runtimeMatch) {
        applySetupFromMatch(runtimeMatch);
      }
    } else if (matches[0]) {
      applySetupFromMatch(matches[0]);
    }

    if (error) {
      setInfoMessage(error);
      return;
    }

    if (runtimeLoad.error) {
      setInfoMessage(runtimeLoad.error);
    }
  }, [hasHydrated]);

  const persistLocalMatches = useCallback((nextMatches: LocalMatchSummary[]) => {
    setLocalMatches(nextMatches);

    const saveResult = saveLocalMatchesToStorage(window.localStorage, nextMatches);
    if (!saveResult.ok) {
      setInfoMessage(saveResult.error);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || !runtime || !autosaveEnabled) {
      return;
    }

    const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, runtime);
    if (!saveRuntimeResult.ok) {
      setInfoMessage(saveRuntimeResult.error);
    }
  }, [autosaveEnabled, hasHydrated, runtime]);

  function applySetupFromMatch(match: LocalMatchSummary) {
    setSelectedCharacters(match.roster_character_ids);
    setSeed(match.settings.seed ?? '');
    setSimulationSpeed(match.settings.simulation_speed);
    setEventProfile(match.settings.event_profile);
    setSurpriseLevel(match.settings.surprise_level);
  }

  function resetSetupToDefaults() {
    setSelectedCharacters(DEFAULT_CHARACTERS);
    setSeed('');
    setSimulationSpeed(DEFAULT_SIMULATION_SPEED);
    setEventProfile(DEFAULT_EVENT_PROFILE);
    setSurpriseLevel(DEFAULT_SURPRISE_LEVEL);
  }

  function onToggleAutosave(nextValue: boolean) {
    if (!nextValue) {
      const confirmed = window.confirm(
        'Si desactivas guardado local, cualquier refresh o reinicio perdera la partida actual. Continuar?'
      );
      if (!confirmed) {
        return;
      }
      clearLocalRuntimeFromStorage(window.localStorage);
      if (runtime) {
        const nextMatches = localMatches.filter((match) => match.id !== runtime.match_id);
        persistLocalMatches(nextMatches);
      }
      setInfoMessage('Guardado local desactivado para la sesion actual.');
    } else {
      setInfoMessage('Guardado local activado.');
      if (runtime) {
        const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, runtime);
        if (!saveRuntimeResult.ok) {
          setInfoMessage(saveRuntimeResult.error);
        }
      }
    }

    setAutosaveEnabled(nextValue);
    saveLocalPrefsToStorage(window.localStorage, { autosave_enabled: nextValue });
  }

  function toggleCharacter(characterId: string) {
    setSelectedCharacters((previous) => {
      if (previous.includes(characterId)) {
        return previous.filter((id) => id !== characterId);
      }

      return [...previous, characterId];
    });
  }

  function generateSeed() {
    const generatedSeed = createBrowserUuid();
    if (!generatedSeed) {
      setInfoMessage('No fue posible generar seed automatica en este navegador.');
      return;
    }

    setSeed(generatedSeed.slice(0, 8));
  }

  async function onStartMatch() {
    if (!setupValidation.is_valid) {
      setInfoMessage('Config invalida. Revisa el roster antes de iniciar.');
      return;
    }

    setIsBusy(true);
    setInfoMessage(null);

    try {
      const createResponse = await requestJson<CreateMatchResponse>('/api/matches', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          roster_character_ids: selectedCharacters,
          settings: {
            surprise_level: surpriseLevel,
            event_profile: eventProfile,
            simulation_speed: simulationSpeed,
            seed: seed.trim() === '' ? null : seed.trim()
          }
        })
      });

      await requestJson<StartMatchResponse>(`/api/matches/${createResponse.match_id}/start`, {
        method: 'POST'
      });

      const state = await requestJson<GetMatchStateResponse>(
        `/api/matches/${createResponse.match_id}`
      );

      const runtimeState: SimulationRuntime = {
        match_id: createResponse.match_id,
        phase: state.phase,
        cycle_phase: state.cycle_phase,
        turn_number: state.turn_number,
        tension_level: state.tension_level,
        settings: state.settings,
        participants: state.participants,
        feed: feedFromSnapshot(state),
        winner_id: null
      };

      setRuntime(runtimeState);
      if (autosaveEnabled) {
        const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, runtimeState);
        if (!saveRuntimeResult.ok) {
          setInfoMessage(saveRuntimeResult.error);
        }
      }
      setPlaybackSpeed(simulationSpeed);
      setFilterCharacterId('all');
      setFilterEventType('all');
      setLatestFeedEventId(null);

      const nowIso = new Date().toISOString();
      const newSummaryBase = createLocalMatchFromSetup(
        {
          roster_character_ids: selectedCharacters,
          seed: seed.trim() === '' ? null : seed.trim(),
          simulation_speed: simulationSpeed,
          event_profile: eventProfile,
          surprise_level: surpriseLevel
        },
        nowIso,
        createResponse.match_id
      );

      const newSummary: LocalMatchSummary = {
        ...newSummaryBase,
        cycle_phase: state.cycle_phase,
        turn_number: state.turn_number,
        alive_count: countAlive(state.participants),
        updated_at: nowIso
      };

      if (autosaveEnabled) {
        const nextMatches = [newSummary, ...localMatches.filter((match) => match.id !== newSummary.id)];
        persistLocalMatches(nextMatches);
      }
      setInfoMessage(`Simulacion iniciada (${shortId(createResponse.match_id)}).`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No fue posible iniciar la simulacion.';
      setInfoMessage(errorMessage);
      setPlaybackSpeed('pause');
    } finally {
      setIsBusy(false);
    }
  }

  async function onOpenMatch(matchId: string) {
    const match = localMatches.find((item) => item.id === matchId);
    if (!match) {
      setInfoMessage('No se encontro la partida seleccionada.');
      return;
    }

    applySetupFromMatch(match);
    setPlaybackSpeed('pause');
    setIsBusy(true);
    const runtimeLoad = autosaveEnabled
      ? loadLocalRuntimeFromStorage(window.localStorage)
      : { runtime: null, error: null };

    try {
      const state = await requestJson<GetMatchStateResponse>(`/api/matches/${match.id}`);
      const nextRuntime: SimulationRuntime = {
        match_id: match.id,
        phase: state.phase,
        cycle_phase: state.cycle_phase,
        turn_number: state.turn_number,
        tension_level: state.tension_level,
        settings: state.settings,
        participants: state.participants,
        feed: feedFromSnapshot(state),
        winner_id:
          state.phase === 'finished'
            ? state.participants.find((p) => p.status !== 'eliminated')?.id ?? null
            : null
      };
      setRuntime(nextRuntime);
      if (autosaveEnabled) {
        const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, nextRuntime);
        if (!saveRuntimeResult.ok) {
          setInfoMessage(saveRuntimeResult.error);
        }
      }
      setInfoMessage(`Partida abierta en vivo (${shortId(match.id)}).`);
    } catch {
      if (autosaveEnabled && runtimeLoad.runtime?.match_id === match.id) {
        setRuntime(runtimeLoad.runtime);
        setInfoMessage(`Partida recuperada localmente (${shortId(match.id)}).`);
      } else {
        setRuntime(null);
        clearLocalRuntimeFromStorage(window.localStorage);
        setInfoMessage(
          `Setup cargado (${shortId(match.id)}). Simulacion en vivo no disponible para ese id.`
        );
      }
    } finally {
      setIsBusy(false);
    }
  }

  const onAdvanceStep = useCallback(async () => {
    if (!runtime || runtime.phase !== 'running' || isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const advance = await requestJson<AdvanceTurnResponse>(
        `/api/matches/${runtime.match_id}/turns/advance`,
        {
          method: 'POST'
        }
      );
      const state = await requestJson<GetMatchStateResponse>(`/api/matches/${runtime.match_id}`);
      const event = feedFromAdvance(advance, state.participants);
      const nextFeed = [event, ...runtime.feed].slice(0, 100);

      const nextRuntime: SimulationRuntime = {
        ...runtime,
        phase: state.phase,
        cycle_phase: state.cycle_phase,
        turn_number: state.turn_number,
        tension_level: state.tension_level,
        settings: state.settings,
        participants: state.participants,
        feed: nextFeed,
        winner_id: advance.winner_id
      };

      setRuntime(nextRuntime);
      if (autosaveEnabled) {
        const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, nextRuntime);
        if (!saveRuntimeResult.ok) {
          setInfoMessage(saveRuntimeResult.error);
        }
      }
      setLatestFeedEventId(event.id);

      const summary = localMatches.find((match) => match.id === runtime.match_id);
      if (autosaveEnabled && summary) {
        const nowIso = new Date().toISOString();
        const updatedSummary: LocalMatchSummary = {
          ...summary,
          cycle_phase: state.cycle_phase,
          turn_number: state.turn_number,
          alive_count: countAlive(state.participants),
          updated_at: nowIso
        };
        const nextMatches = [
          updatedSummary,
          ...localMatches.filter((match) => match.id !== updatedSummary.id)
        ];
        persistLocalMatches(nextMatches);
      }

      if (advance.finished) {
        setPlaybackSpeed('pause');
        const winnerName =
          state.participants.find((participant) => participant.id === advance.winner_id)?.character_id ??
          null;
        setInfoMessage(
          winnerName
            ? `Partida finalizada. Ganador: ${characterName(winnerName)}.`
            : 'Partida finalizada.'
        );
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'No fue posible avanzar la simulacion.';
      const failureKind = classifyAdvanceFailure(rawMessage);
      setPlaybackSpeed('pause');
      if (failureKind === 'SESSION_LOST') {
        const summary = localMatches.find((match) => match.id === runtime.match_id);
        if (summary) {
          applySetupFromMatch(summary);
        }
        setRuntime(null);
        clearLocalRuntimeFromStorage(window.localStorage);
      }
      setInfoMessage(recoveryMessageForAdvanceFailure(failureKind, shortId(runtime.match_id)));
    } finally {
      setIsBusy(false);
    }
  }, [autosaveEnabled, isBusy, localMatches, persistLocalMatches, runtime]);

  useEffect(() => {
    if (!runtime || runtime.phase !== 'running' || playbackSpeed === 'pause' || isBusy) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void onAdvanceStep();
    }, SPEED_INTERVAL_MS[playbackSpeed]);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isBusy, onAdvanceStep, playbackSpeed, runtime]);

  async function onShareSnapshot() {
    if (!runtime) {
      setInfoMessage('Inicia una simulacion para compartir el estado.');
      return;
    }

    const shareText = `Hunger Games ${shortId(runtime.match_id)} | turno ${runtime.turn_number} | fase ${runtime.cycle_phase} | vivos ${countAlive(runtime.participants)}`;

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        setInfoMessage('Clipboard no disponible en este navegador.');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setInfoMessage('Resumen de simulacion copiado para compartir.');
    } catch {
      setInfoMessage('No fue posible copiar el resumen al portapapeles.');
    }
  }

  function onSaveSnapshot() {
    if (!runtime) {
      setInfoMessage('No hay simulacion activa para guardar.');
      return;
    }
    if (!autosaveEnabled) {
      setInfoMessage('Guardado local desactivado. Activalo para guardar esta partida.');
      return;
    }

    const existing = localMatches.find((match) => match.id === runtime.match_id);
    const nowIso = new Date().toISOString();
    const summary: LocalMatchSummary = {
      id: runtime.match_id,
      created_at: existing?.created_at ?? nowIso,
      updated_at: nowIso,
      roster_character_ids: runtime.participants.map((participant) => participant.character_id),
      cycle_phase: runtime.cycle_phase,
      turn_number: runtime.turn_number,
      alive_count: countAlive(runtime.participants),
      total_participants: runtime.participants.length,
      settings: runtime.settings
    };

    const nextMatches = [summary, ...localMatches.filter((match) => match.id !== summary.id)];
    persistLocalMatches(nextMatches);
    const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, runtime);
    if (!saveRuntimeResult.ok) {
      setInfoMessage(saveRuntimeResult.error);
      return;
    }
    setInfoMessage(`Progreso guardado (${shortId(summary.id)}).`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Hunger Games Simulator</h1>
            <strong>{runtime?.phase === 'finished' ? 'Partida cerrada' : 'Simulacion en vivo'}</strong>
          </div>
          <p className={styles.heroMeta}>
            Fase actual: <strong>{phaseLabel(currentPhase)}</strong>
          </p>
          <div className={styles.sessionBar}>
            <span>
              Sesion actual: <strong>{currentSessionSizeLabel}</strong>
            </span>
            <span
              className={`${styles.sessionTone} ${
                currentSessionSizeTone === 'critical'
                  ? styles.sessionToneCritical
                  : currentSessionSizeTone === 'high'
                    ? styles.sessionToneHigh
                    : styles.sessionToneOk
              }`}
            >
              {currentSessionSizeTone === 'critical'
                ? 'Critico'
                : currentSessionSizeTone === 'high'
                  ? 'Alto'
                  : 'OK'}
            </span>
          </div>
          <label className={styles.autosaveToggle}>
            <input
              type="checkbox"
              checked={autosaveEnabled}
              onChange={(event) => onToggleAutosave(event.target.checked)}
            />
            Guardar local
          </label>
          {!autosaveEnabled ? (
            <p className={styles.autosaveWarning}>
              Guardado local OFF: cualquier refresh o reinicio borra esta partida.
            </p>
          ) : null}

          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Turno</span>
              <div className={styles.kpiValue}>{currentTurn}</div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Vivos</span>
              <div className={styles.kpiValue}>{aliveCount}</div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Eliminados</span>
              <div className={styles.kpiValue}>{eliminatedCount}</div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Ritmo</span>
              <div className={styles.kpiValue}>{playbackSpeed === 'pause' ? 'Pausa' : playbackSpeed}</div>
            </div>
          </div>

          <div className={styles.tension} aria-label="barra de tension">
            <strong>Tension {Math.round(tensionValue)}%</strong>
            <div className={styles.tensionTrack}>
              <div className={styles.tensionBar} style={{ width: `${Math.min(100, tensionValue)}%` }} />
            </div>
          </div>
        </header>

        <div className={styles.columns}>
          {!runtime ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Setup de partida</h2>
              <p className={styles.cardHint}>Define roster, seed y perfil antes de iniciar.</p>

              <div className={styles.setupGrid}>
                <div className={styles.rosterGrid}>
                  {CHARACTER_OPTIONS.map((character) => {
                    const checkboxId = `roster-${character.id}`;
                    return (
                      <label key={character.id} htmlFor={checkboxId} className={styles.characterToggle}>
                        <input
                          id={checkboxId}
                          aria-label={`Seleccionar ${character.name}`}
                          type="checkbox"
                          checked={selectedCharacters.includes(character.id)}
                          onChange={() => toggleCharacter(character.id)}
                        />
                        {character.name}
                      </label>
                    );
                  })}
                </div>

                <div className={styles.controlsGrid}>
                  <label className={styles.controlLabel}>
                    Seed (opcional)
                    <div className={styles.inlineControls}>
                      <input
                        className={styles.input}
                        value={seed}
                        onChange={(event) => setSeed(event.target.value)}
                        placeholder="manual o aleatoria"
                      />
                      <button className={styles.button} type="button" onClick={generateSeed}>
                        Aleatoria
                      </button>
                    </div>
                  </label>

                  <label className={styles.controlLabel}>
                    Ritmo inicial
                    <select
                      className={styles.select}
                      value={simulationSpeed}
                      onChange={(event) => setSimulationSpeed(event.target.value as SimulationSpeed)}
                    >
                      <option value="1x">1x</option>
                      <option value="2x">2x</option>
                      <option value="4x">4x</option>
                    </select>
                  </label>

                  <button
                    className={`${styles.button} ${styles.buttonGhost}`}
                    type="button"
                    onClick={() => setShowAdvanced((current) => !current)}
                  >
                    {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
                  </button>

                  {showAdvanced ? (
                    <>
                      <label className={styles.controlLabel}>
                        Perfil de eventos
                        <select
                          className={styles.select}
                          value={eventProfile}
                          onChange={(event) =>
                            setEventProfile(event.target.value as 'balanced' | 'aggressive' | 'chaotic')
                          }
                        >
                          <option value="balanced">Balanced</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="chaotic">Chaotic</option>
                        </select>
                      </label>

                      <label className={styles.controlLabel}>
                        Nivel de sorpresa
                        <select
                          className={styles.select}
                          value={surpriseLevel}
                          onChange={(event) =>
                            setSurpriseLevel(event.target.value as 'low' | 'normal' | 'high')
                          }
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                    </>
                  ) : null}
                </div>

                <div>
                  <strong>
                    Roster: {selectedCharacters.length} | Seed:{' '}
                    {seed.trim() === '' ? 'aleatoria al iniciar' : seed.trim()}
                  </strong>
                  {setupValidation.issues.length > 0 ? (
                    <ul>
                      {setupValidation.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Configuracion valida para iniciar.</p>
                  )}

                  <div className={styles.inlineControls}>
                    <button
                      className={styles.button}
                      type="button"
                      disabled={!setupValidation.is_valid || isBusy}
                      onClick={() => {
                        void onStartMatch();
                      }}
                    >
                      Iniciar simulacion
                    </button>
                    <button className={styles.button} type="button" onClick={resetSetupToDefaults}>
                      Nuevo setup
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className={styles.eventShell}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Feed narrativo</h2>
              <p className={styles.cardHint}>
                Cada evento resume quien, que y su impacto directo en 1-2 lineas.
              </p>

              <div className={styles.speedControls}>
                {(['1x', '2x', '4x'] as SimulationSpeed[]).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={`${styles.speedButton} ${
                      playbackSpeed === speed ? styles.speedButtonActive : ''
                    }`}
                    onClick={() => {
                      setSimulationSpeed(speed);
                      setPlaybackSpeed(speed);
                    }}
                    disabled={!runtime || runtime.phase !== 'running'}
                  >
                    {speed}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.speedButton} ${
                    playbackSpeed === 'pause' ? styles.speedButtonActive : ''
                  }`}
                  onClick={() => setPlaybackSpeed('pause')}
                  disabled={!runtime || runtime.phase !== 'running'}
                >
                  Pausa
                </button>
                <button
                  type="button"
                  className={styles.speedButton}
                  onClick={() => {
                    setPlaybackSpeed('pause');
                    void onAdvanceStep();
                  }}
                  disabled={!runtime || runtime.phase !== 'running' || isBusy}
                >
                  Paso
                </button>
                <button
                  type="button"
                  className={styles.speedButton}
                  onClick={onSaveSnapshot}
                  disabled={!runtime || isBusy || !autosaveEnabled}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className={styles.speedButton}
                  onClick={() => {
                    void onShareSnapshot();
                  }}
                  disabled={!runtime}
                >
                  Compartir
                </button>
              </div>

              <div className={styles.feedFilters}>
                <label className={styles.controlLabel}>
                  Filtro por personaje
                  <select
                    className={styles.select}
                    value={filterCharacterId}
                    onChange={(event) => setFilterCharacterId(event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {characterFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.controlLabel}>
                  Filtro por tipo
                  <select
                    className={styles.select}
                    value={filterEventType}
                    onChange={(event) =>
                      setFilterEventType(event.target.value as 'all' | EventType)
                    }
                  >
                    <option value="all">Todos</option>
                    {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((eventType) => (
                      <option key={eventType} value={eventType}>
                        {EVENT_TYPE_LABEL[eventType]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredFeed.length === 0 ? (
                <p>
                  {runtime
                    ? 'Aun no hay eventos que coincidan con los filtros activos.'
                    : 'Inicia una simulacion para ver el feed en vivo.'}
                </p>
              ) : (
                <ul className={styles.feedList}>
                  {filteredFeed.map((event) => (
                    <li
                      key={event.id}
                      className={`${styles.feedItem} ${
                        latestFeedEventId === event.id ? styles.feedItemNew : ''
                      }`}
                    >
                      <p className={styles.feedMeta}>
                        <span>
                          Turno {event.turn_number} · {phaseLabel(event.phase)}
                        </span>
                        <span>{EVENT_TYPE_LABEL[event.type]}</span>
                      </p>
                      <p className={styles.feedHeadline}>{event.headline}</p>
                      <p className={styles.feedImpact}>{event.impact}</p>
                      <div className={styles.tagRow}>
                        {event.character_ids.length === 0 ? (
                          <span className={styles.tag}>Sin participantes trazables</span>
                        ) : (
                          event.character_ids.map((characterId) => (
                            <span key={`${event.id}-${characterId}`} className={styles.tag}>
                              {characterName(characterId)}
                            </span>
                          ))
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <aside className={styles.sideGrid}>
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Participantes</h3>
                <ul className={styles.participantList}>
                  {participantStatusList.length === 0 ? (
                    <li className={styles.participantItem}>Sin simulacion activa.</li>
                  ) : (
                    participantStatusList.map((participant) => {
                      const statusClassName =
                        participant.status === 'alive'
                          ? styles.statusAlive
                          : participant.status === 'injured'
                            ? styles.statusInjured
                            : styles.statusEliminated;

                      return (
                        <li key={participant.id} className={styles.participantItem}>
                          <strong>{characterName(participant.character_id)}</strong>
                          <div>
                            <span className={`${styles.status} ${statusClassName}`}>
                              {statusLabel(participant.status)}
                            </span>{' '}
                            · Salud {participant.current_health}
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Relaciones destacadas</h3>
                <ul className={styles.relationsList}>
                  {relationHighlights.length === 0 ? (
                    <li className={styles.relationItem}>Todavia no hay relaciones significativas.</li>
                  ) : (
                    relationHighlights.map((relation) => (
                      <li key={`${relation.pair[0]}-${relation.pair[1]}`} className={styles.relationItem}>
                        <strong>
                          {characterName(relation.pair[0])} · {characterName(relation.pair[1])}
                        </strong>
                        <div
                          className={
                            relation.score >= 0 ? styles.relationPositive : styles.relationNegative
                          }
                        >
                          {relationTone(relation.score)}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section id="partidas-locales" className={styles.card}>
                <h3 className={styles.cardTitle}>Partidas locales</h3>
                {localMatches.length === 0 ? (
                  <p>No hay partidas guardadas.</p>
                ) : (
                  <ul className={styles.matchList}>
                    {localMatches.map((match) => (
                      <li key={match.id} className={styles.matchItem}>
                        <p>
                          <strong>{shortId(match.id)}</strong> · {phaseLabel(match.cycle_phase)} · turno{' '}
                          {match.turn_number}
                        </p>
                        <p>
                          Vivos: {match.alive_count}/{match.total_participants} · Seed:{' '}
                          {match.settings.seed ?? 'sin seed'}
                        </p>
                        <button
                          className={styles.button}
                          type="button"
                          onClick={() => {
                            void onOpenMatch(match.id);
                          }}
                        >
                          Continuar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </section>
        </div>

        {infoMessage ? <p className={styles.info}>{infoMessage}</p> : null}
      </div>
    </main>
  );
}
