'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Save, Share2 } from 'lucide-react';
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
import { getLobbyStatus, shortId } from '@/lib/match-ux';
import { classifyAdvanceFailure, recoveryMessageForAdvanceFailure } from '@/lib/runtime-recovery';
import {
  buildCharacterLabel,
  DEFAULT_FRANCHISE_CATALOG_SOURCE,
  DEFAULT_CHARACTERS,
  DEFAULT_EVENT_PROFILE,
  DEFAULT_SIMULATION_SPEED,
  DEFAULT_SURPRISE_LEVEL,
  EMPTY_FEED,
  EVENT_TYPE_LABEL,
  FIRST_AUTOPLAY_DELAY_MS,
  SPEED_INTERVAL_MS,
  TRANSITION_FADE_OUT_MS,
  TRANSITION_LONG_WAIT_MS,
  TRANSITION_MIN_VISIBLE_MS,
  TRANSITION_STORAGE_KEY,
  countAlive,
  createBrowserUuid,
  feedFromAdvance,
  feedFromSnapshot,
  formatBytes,
  normalizeCatalogWithObservability,
  phaseLabel,
  relationDelta,
  relationTone,
  requestJson,
  sessionSizeTone,
  sessionToneBadgeVariant,
  statusLabel,
  waitMs,
  type PlaybackSpeed,
  type SimulationRuntime,
  type TransitionOverlayState
} from './match-studio-logic';
import { useRosterSelection } from './use-roster-selection';
import { CatalogSelection } from './components/catalog-selection';
import { RosterPreview } from './components/roster-preview';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { captureProductEvent } from '@/lib/product-analytics';
import type {
  AdvanceTurnResponse,
  CreateMatchResponse,
  EventType,
  GetMatchStateResponse,
  ParticipantState,
  SimulationSpeed,
  StartMatchResponse
} from '@/lib/domain/types';

const setupGridClassName = 'grid gap-[14px]';
const cardClassName = 'rounded-xl border bg-card px-6 py-[22px]';
const cardTitleClassName =
  'm-0 font-sans text-[22px] font-bold leading-tight tracking-[-0.005em] text-foreground';
const cardHintClassName = 'mb-3 mt-1 text-muted-foreground';
const controlLabelClassName = 'grid min-w-0 gap-1 text-[0.94rem]';
const selectClassName =
  'w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const speedButtonClassName =
  'grid min-h-11 w-full min-w-0 cursor-pointer place-items-center rounded-full border bg-card px-2.5 py-1.5 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60 md:w-auto';
const activeSpeedButtonClassName = 'border-primary/70 bg-primary text-primary-foreground';
const tagClassName = 'rounded-full bg-secondary px-2 py-[3px] text-[0.78rem] text-foreground';
const participantEventTagClassName: Record<'eliminated' | 'harmful' | 'beneficial' | 'neutral', string> = {
  eliminated: 'border border-[#ef4444]/35 bg-[#ef4444]/15 text-[#fca5a5]',
  harmful: 'border border-[#f97316]/35 bg-[#f97316]/15 text-[#fdba74]',
  beneficial: 'border border-[#22c55e]/35 bg-[#22c55e]/15 text-[#86efac]',
  neutral: 'border border-[#38bdf8]/35 bg-[#38bdf8]/15 text-[#7dd3fc]'
};
const eventTypeStyle: Record<EventType, { item: string; label: string }> = {
  combat: {
    item: 'border-[#ef4444]/30 bg-[#ef4444]/[0.07]',
    label: 'border-[#ef4444]/25 bg-[#2b171a] text-[#fca5a5]'
  },
  alliance: {
    item: 'border-[#22c55e]/30 bg-[#22c55e]/[0.07]',
    label: 'border-[#22c55e]/25 bg-[#10261a] text-[#86efac]'
  },
  betrayal: {
    item: 'border-[#f97316]/30 bg-[#f97316]/[0.08]',
    label: 'border-[#f97316]/25 bg-[#2d1d10] text-[#fdba74]'
  },
  resource: {
    item: 'border-[#38bdf8]/30 bg-[#38bdf8]/[0.07]',
    label: 'border-[#38bdf8]/25 bg-[#102431] text-[#7dd3fc]'
  },
  hazard: {
    item: 'border-[#facc15]/35 bg-[#facc15]/[0.08]',
    label: 'border-[#facc15]/25 bg-[#302812] text-[#fde047]'
  },
  surprise: {
    item: 'border-[#a78bfa]/30 bg-[#a78bfa]/[0.08]',
    label: 'border-[#a78bfa]/25 bg-[#211a35] text-[#c4b5fd]'
  }
};

function participantEventTone(
  event: { type: EventType; eliminated_character_ids?: string[] },
  characterId: string
): keyof typeof participantEventTagClassName {
  if (event.eliminated_character_ids?.includes(characterId)) {
    return 'eliminated';
  }

  if (event.type === 'combat' || event.type === 'betrayal' || event.type === 'hazard') {
    return 'harmful';
  }

  if (event.type === 'alliance' || event.type === 'resource') {
    return 'beneficial';
  }

  return 'neutral';
}

type MatchStudioPageProps = {
  sessionMatchId?: string | null;
  prefillMatchId?: string | null;
};

export function MatchStudioPage({
  sessionMatchId = null,
  prefillMatchId = null
}: MatchStudioPageProps) {
  const router = useRouter();
  const [catalogResult, setCatalogResult] = useState(() =>
    normalizeCatalogWithObservability(DEFAULT_FRANCHISE_CATALOG_SOURCE, 'default_catalog_bootstrap')
  );
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
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [latestFeedEventId, setLatestFeedEventId] = useState<string | null>(null);
  const [hasAutoResumed, setHasAutoResumed] = useState(false);
  const [hasAutoPrefilled, setHasAutoPrefilled] = useState(false);
  const [transitionOverlay, setTransitionOverlay] = useState<TransitionOverlayState | null>(null);
  const [autoplayReadyAt, setAutoplayReadyAt] = useState<number | null>(null);
  const isSessionView = sessionMatchId !== null;

  const catalogCharacters = catalogResult.catalog.characters;
  const {
    selectedFranchiseId,
    selectedMovieIds,
    franchiseOptions,
    moviesForSelectedFranchise,
    selectableCharacters,
    setupRosterPreview,
    hasEmptySelectionState,
    isCatalogEmpty,
    onSelectFranchise,
    toggleMovie,
    toggleCharacter,
    toggleAllCharacters,
    setSelectionFromRoster,
    resetSelection
  } = useRosterSelection({
    catalogResult,
    selectedCharacters,
    setSelectedCharacters
  });
  const characterById = useMemo(
    () =>
      new Map(
        catalogCharacters.map((character) => [character.character_key, character] as const)
      ),
    [catalogCharacters]
  );
  const characterName = useCallback(
    (characterId: string): string => {
      const character = characterById.get(characterId);
      if (!character) {
        return characterId;
      }
      return buildCharacterLabel(character);
    },
    [characterById]
  );
  const setupValidation = useMemo(
    () => getSetupValidation(selectedCharacters),
    [selectedCharacters]
  );
  const setupCanStart = setupValidation.is_valid && !isCatalogEmpty && !hasEmptySelectionState;

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
  const matchRunState = runtime?.phase === 'finished'
    ? 'finished'
    : playbackSpeed === 'pause'
      ? 'paused'
      : 'active';
  const matchRunLabel = matchRunState === 'finished'
    ? 'Simulacion finalizada'
    : matchRunState === 'paused'
      ? 'Simulacion pausada'
      : 'Simulacion activa';
  const matchRunSpeedLabel = matchRunState === 'finished'
    ? 'Final'
    : matchRunState === 'paused'
      ? 'Pausa'
      : playbackSpeed;
  const currentPhaseLabel = matchRunState === 'finished' ? 'Finalizada' : phaseLabel(currentPhase);
  const currentPhaseDetail = matchRunState === 'finished'
    ? 'La simulacion termino. No quedan acciones disponibles.'
    : 'La arena avanza turno a turno.';

  const feed = runtime?.feed ?? EMPTY_FEED;
  const currentSessionSizeBytes = runtime ? estimateLocalRuntimeSnapshotBytes(runtime) : 0;
  const currentSessionSizeLabel = formatBytes(currentSessionSizeBytes);
  const currentSessionSizeTone = sessionSizeTone(currentSessionSizeBytes);
  const isTransitioning = transitionOverlay !== null;
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
  }, [characterName, runtime, selectedCharacters]);

  const applySetupFromMatch = useCallback((match: LocalMatchSummary) => {
    setSelectedCharacters(match.roster_character_ids);
    setSelectionFromRoster(match.roster_character_ids);
    setSeed(match.settings.seed ?? '');
    setSimulationSpeed(match.settings.simulation_speed);
    setEventProfile(match.settings.event_profile);
    setSurpriseLevel(match.settings.surprise_level);
  }, [setSelectionFromRoster]);

  const resetSetupToDefaults = useCallback(() => {
    resetSelection();
    setSeed('');
    setSimulationSpeed(DEFAULT_SIMULATION_SPEED);
    setEventProfile(DEFAULT_EVENT_PROFILE);
    setSurpriseLevel(DEFAULT_SURPRISE_LEVEL);
  }, [resetSelection]);

  const clearEditorStateForNewMatch = useCallback(() => {
    setRuntime(null);
    setPlaybackSpeed(DEFAULT_SIMULATION_SPEED);
    setFilterCharacterId('all');
    setFilterEventType('all');
    setLatestFeedEventId(null);
    resetSetupToDefaults();
  }, [resetSetupToDefaults]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(TRANSITION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    let parsed: { direction?: string; startedAt?: number } | null = null;
    try {
      parsed = JSON.parse(raw) as { direction?: string; startedAt?: number };
    } catch {
      window.sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
      return;
    }

    if (parsed?.direction !== 'lobby_to_match' || typeof parsed.startedAt !== 'number') {
      return;
    }

    window.sessionStorage.removeItem(TRANSITION_STORAGE_KEY);

    const elapsedMs = Date.now() - parsed.startedAt;
    const remainingMinMs = Math.max(0, TRANSITION_MIN_VISIBLE_MS - elapsedMs);
    const remainingLongWaitMs = Math.max(0, TRANSITION_LONG_WAIT_MS - elapsedMs);
    let longWaitId = 0;

    setTransitionOverlay({
      direction: 'lobby_to_match',
      showLongWait: elapsedMs >= TRANSITION_LONG_WAIT_MS,
      isExiting: false
    });

    if (elapsedMs < TRANSITION_LONG_WAIT_MS) {
      longWaitId = window.setTimeout(() => {
        setTransitionOverlay((current) => {
          if (!current || current.direction !== 'lobby_to_match' || current.isExiting) {
            return current;
          }

          return { ...current, showLongWait: true };
        });
      }, remainingLongWaitMs);
    }

    void (async () => {
      if (remainingMinMs > 0) {
        await waitMs(remainingMinMs);
      }

      window.clearTimeout(longWaitId);
      setTransitionOverlay((current) =>
        current ? { ...current, isExiting: true } : current
      );
      await waitMs(TRANSITION_FADE_OUT_MS);
      setTransitionOverlay(null);
    })();

    return () => {
      window.clearTimeout(longWaitId);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setHasLoadedLocalState(false);

    const prefs = loadLocalPrefsFromStorage(window.localStorage);
    setAutosaveEnabled(prefs.autosave_enabled);

    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    const runtimeLoad = prefs.autosave_enabled
      ? loadLocalRuntimeFromStorage(window.localStorage)
      : { runtime: null, error: null };
    setLocalMatches(matches);

    if (sessionMatchId && runtimeLoad.runtime?.match_id === sessionMatchId) {
      setRuntime(runtimeLoad.runtime);
      setPlaybackSpeed(
        runtimeLoad.runtime.phase === 'running'
          ? runtimeLoad.runtime.settings.simulation_speed
          : 'pause'
      );
      setAutoplayReadyAt(
        runtimeLoad.runtime.phase === 'running' ? Date.now() + FIRST_AUTOPLAY_DELAY_MS : null
      );
      const runtimeMatch = matches.find((candidate) => candidate.id === runtimeLoad.runtime?.match_id);
      if (runtimeMatch) {
        applySetupFromMatch(runtimeMatch);
      }
    } else {
      setRuntime(null);
      setAutoplayReadyAt(null);
      if (!sessionMatchId) {
        clearEditorStateForNewMatch();
      }
    }

    if (error) {
      setInfoMessage(error);
      return;
    }

    if (runtimeLoad.error) {
      setInfoMessage(runtimeLoad.error);
    }

    setHasLoadedLocalState(true);
  }, [
    applySetupFromMatch,
    clearEditorStateForNewMatch,
    hasHydrated,
    sessionMatchId
  ]);

  useEffect(() => {
    if (!hasHydrated || isBusy || isSessionView) {
      return;
    }

    clearEditorStateForNewMatch();
  }, [clearEditorStateForNewMatch, hasHydrated, isBusy, isSessionView]);

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

  function generateSeed() {
    const generatedSeed = createBrowserUuid();
    if (!generatedSeed) {
      setInfoMessage('No fue posible generar seed automatica en este navegador.');
      return;
    }

    setSeed(generatedSeed.slice(0, 8));
  }

  async function onStartMatch() {
    if (!setupCanStart) {
      if (isCatalogEmpty) {
        setInfoMessage('No hay personajes disponibles en el catalogo.');
        return;
      }
      if (hasEmptySelectionState) {
        setInfoMessage('Selecciona una franquicia y al menos una pelicula para generar roster.');
        return;
      }
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

      setAutoplayReadyAt(Date.now() + FIRST_AUTOPLAY_DELAY_MS);
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
      captureProductEvent('match_started', {
        match_id: createResponse.match_id,
        franchise:
          franchiseOptions.find((franchise) => franchise.franchise_id === selectedFranchiseId)
            ?.franchise_name ?? null,
        movie_count: selectedMovieIds.length,
        roster_size: selectedCharacters.length,
        event_profile: eventProfile,
        surprise_level: surpriseLevel,
        autosave_enabled: autosaveEnabled
      });
      moviesForSelectedFranchise
        .filter((movie) => selectedMovieIds.includes(movie.movie_id))
        .forEach((movie) => {
          captureProductEvent('match_movie_used', {
            match_id: createResponse.match_id,
            movie: movie.movie_title,
            franchise:
              franchiseOptions.find((franchise) => franchise.franchise_id === selectedFranchiseId)
                ?.franchise_name ?? null
          });
        });
      selectedCharacters.forEach((characterId) => {
        const character = characterById.get(characterId);
        captureProductEvent('match_character_used', {
          match_id: createResponse.match_id,
          character: characterName(characterId),
          movie: character?.movie_title ?? null,
          franchise:
            franchiseOptions.find((franchise) => franchise.franchise_id === selectedFranchiseId)
              ?.franchise_name ?? null
        });
      });
      router.replace(`/sessions/${createResponse.match_id}`, { scroll: false });
      setInfoMessage(`Simulacion iniciada (${shortId(createResponse.match_id)}).`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No fue posible iniciar la simulacion.';
      setInfoMessage(errorMessage);
      setPlaybackSpeed('pause');
    } finally {
      setIsBusy(false);
    }
  }

  const onOpenMatch = useCallback(async (matchId: string) => {
    const match = localMatches.find((item) => item.id === matchId);
    if (!match) {
      setInfoMessage('No se encontro la partida seleccionada.');
      return;
    }

    applySetupFromMatch(match);
    setPlaybackSpeed(
      getLobbyStatus(match) === 'running' ? match.settings.simulation_speed : 'pause'
    );
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
      setPlaybackSpeed(
        nextRuntime.phase === 'running' ? nextRuntime.settings.simulation_speed : 'pause'
      );
      setAutoplayReadyAt(
        nextRuntime.phase === 'running' ? Date.now() + FIRST_AUTOPLAY_DELAY_MS : null
      );
      if (autosaveEnabled) {
        const saveRuntimeResult = saveLocalRuntimeToStorage(window.localStorage, nextRuntime);
        if (!saveRuntimeResult.ok) {
          setInfoMessage(saveRuntimeResult.error);
        }
      }
      router.replace(`/sessions/${match.id}`, { scroll: false });
      setInfoMessage(`Partida abierta en vivo (${shortId(match.id)}).`);
    } catch {
      if (autosaveEnabled && runtimeLoad.runtime?.match_id === match.id) {
        setRuntime(runtimeLoad.runtime);
        setPlaybackSpeed(
          runtimeLoad.runtime.phase === 'running'
            ? runtimeLoad.runtime.settings.simulation_speed
            : 'pause'
        );
        setAutoplayReadyAt(
          runtimeLoad.runtime.phase === 'running' ? Date.now() + FIRST_AUTOPLAY_DELAY_MS : null
        );
        router.replace(`/sessions/${match.id}`, { scroll: false });
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
  }, [applySetupFromMatch, autosaveEnabled, localMatches, router]);

  useEffect(() => {
    setHasAutoResumed(false);
  }, [sessionMatchId]);

  useEffect(() => {
    setHasAutoPrefilled(false);
  }, [prefillMatchId]);

  useEffect(() => {
    if (!hasHydrated || !hasLoadedLocalState || !sessionMatchId || hasAutoResumed || isBusy) {
      return;
    }

    if (runtime?.match_id === sessionMatchId) {
      if (!infoMessage && runtime.turn_number === 0 && runtime.feed.length === 0) {
        setInfoMessage(`Simulacion iniciada (${shortId(sessionMatchId)}).`);
      }
      setHasAutoResumed(true);
      return;
    }

    const targetMatch = localMatches.find((match) => match.id === sessionMatchId);
    if (!targetMatch) {
      setInfoMessage(`No se encontro la partida ${shortId(sessionMatchId)} para reanudar.`);
      setHasAutoResumed(true);
      return;
    }

    void onOpenMatch(targetMatch.id).finally(() => {
      setHasAutoResumed(true);
    });
  }, [
    hasAutoResumed,
    hasHydrated,
    hasLoadedLocalState,
    isBusy,
    localMatches,
    onOpenMatch,
    sessionMatchId,
    infoMessage,
    runtime?.match_id,
    runtime?.turn_number,
    runtime?.feed.length
  ]);

  useEffect(() => {
    if (!hasHydrated || !prefillMatchId || hasAutoPrefilled || isBusy || isSessionView) {
      return;
    }

    const sourceMatch = localMatches.find((match) => match.id === prefillMatchId);
    if (!sourceMatch) {
      setInfoMessage(`No se encontro la partida ${shortId(prefillMatchId)} para duplicar setup.`);
      setHasAutoPrefilled(true);
      return;
    }

    applySetupFromMatch(sourceMatch);
    setRuntime(null);
    setPlaybackSpeed(DEFAULT_SIMULATION_SPEED);
    clearLocalRuntimeFromStorage(window.localStorage);
    setInfoMessage(`Setup duplicado desde ${shortId(sourceMatch.id)}.`);
    setHasAutoPrefilled(true);
  }, [
    applySetupFromMatch,
    hasAutoPrefilled,
    hasHydrated,
    isBusy,
    localMatches,
    prefillMatchId,
    isSessionView
  ]);

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
      const event = feedFromAdvance(advance, state.participants, characterName);
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
        const winnerCharacterId =
          state.participants.find((participant) => participant.id === advance.winner_id)?.character_id ??
          null;
        captureProductEvent('match_finished', {
          match_id: runtime.match_id,
          winner: winnerCharacterId ? characterName(winnerCharacterId) : null,
          winner_movie: winnerCharacterId
            ? characterById.get(winnerCharacterId)?.movie_title ?? null
            : null,
          franchise:
            franchiseOptions.find((franchise) => franchise.franchise_id === selectedFranchiseId)
              ?.franchise_name ?? null,
          roster_size: state.participants.length,
          turn_count: state.turn_number,
          simulation_speed: runtime.settings.simulation_speed
        });
        setInfoMessage(
          winnerCharacterId
            ? `Partida finalizada. Ganador: ${characterName(winnerCharacterId)}.`
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
  }, [
    applySetupFromMatch,
    autosaveEnabled,
    characterById,
    characterName,
    franchiseOptions,
    isBusy,
    localMatches,
    persistLocalMatches,
    runtime,
    selectedFranchiseId
  ]);

  useEffect(() => {
    if (
      !runtime ||
      runtime.phase !== 'running' ||
      playbackSpeed === 'pause' ||
      isBusy ||
      autoplayReadyAt === null
    ) {
      return;
    }

    const remainingInitialDelayMs = autoplayReadyAt ? autoplayReadyAt - Date.now() : 0;
    const timeoutId = window.setTimeout(() => {
      void onAdvanceStep();
    }, Math.max(SPEED_INTERVAL_MS[playbackSpeed], remainingInitialDelayMs));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoplayReadyAt, isBusy, onAdvanceStep, playbackSpeed, runtime]);

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

  function onReturnToNewSetup(): void {
    const startedAt = Date.now();
    window.sessionStorage.setItem(
      TRANSITION_STORAGE_KEY,
      JSON.stringify({ direction: 'match_to_lobby', startedAt })
    );
    setTransitionOverlay({
      direction: 'match_to_lobby',
      showLongWait: false,
      isExiting: false
    });

    window.setTimeout(() => {
      setTransitionOverlay((current) => {
        if (!current || current.direction !== 'match_to_lobby' || current.isExiting) {
          return current;
        }

        return { ...current, showLongWait: true };
      });
    }, TRANSITION_LONG_WAIT_MS);
  }

  const setupSteps = [
    {
      id: 'franchise',
      label: 'Selecciona una franquicia',
      detail: selectedFranchiseId ? 'Franquicia lista' : 'Elige el universo base de la simulacion',
      isComplete: Boolean(selectedFranchiseId)
    },
    {
      id: 'movies',
      label: 'Activa peliculas',
      detail:
        selectedMovieIds.length > 0
          ? 'Peliculas listas'
          : 'Marca al menos una pelicula',
      isComplete: selectedMovieIds.length > 0
    },
    {
      id: 'roster',
      label: 'Completa el roster',
      detail:
        selectedCharacters.length >= 10
          ? `${selectedCharacters.length} personajes seleccionados`
          : `${selectedCharacters.length}/10 personajes seleccionados`,
      isComplete: selectedCharacters.length >= 10
    }
  ];

  return (
    <main
      className="min-h-screen bg-background px-3 pb-9 pt-4 text-foreground transition-colors sm:px-6 sm:pt-7"
      aria-busy={isTransitioning}
    >
      <div className="mx-auto grid max-w-[1180px] gap-5">
        <header className="grid border-b pb-7 transition-colors">
          <h1 className="m-0 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-7xl">
            {runtime ? 'Hunger Games Simulator' : 'Juegos del Hambre Simulador'}
          </h1>
          {!runtime ? (
            <p className="mt-3 max-w-[720px] text-[1rem] leading-6 text-muted-foreground">
              Simulador de Los Juegos del Hambre online para crear partidas de supervivencia con
              personajes por pelicula, eventos de arena y narracion automatica turno a turno.
            </p>
          ) : null}
        </header>

        {runtime ? (
          <section className="grid gap-4">
            <div
              className={cn(
                'grid gap-4 rounded-xl border px-6 py-[22px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center',
                matchRunState === 'finished'
                  ? 'border-[#262b3b] bg-[#14171f]'
                  : matchRunState === 'paused'
                    ? 'border-[#5f4a18] bg-[#211b0f]'
                    : 'border-[#164e3f] bg-[#10231d]'
              )}
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'w-fit',
                      matchRunState === 'finished'
                        ? 'bg-[rgba(139,148,173,0.18)] text-[#eaecf3]'
                        : matchRunState === 'paused'
                          ? 'bg-[rgba(251,191,36,0.15)] text-[#fbbf24]'
                          : 'bg-[rgba(110,231,183,0.15)] text-[#6ee7b7]'
                    )}
                  >
                    {matchRunLabel}
                  </Badge>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    <span data-testid="kpi-turn">
                      Turno <strong className="text-foreground">{currentTurn}</strong>
                    </span>{' '}
                    |{' '}
                    <span data-testid="kpi-alive">
                      Vivos <strong className="text-foreground">{aliveCount}</strong>
                    </span>{' '}
                    |{' '}
                    <span data-testid="kpi-eliminated">
                      Eliminados <strong className="text-foreground">{eliminatedCount}</strong>
                    </span>{' '}
                    |{' '}
                    <span data-testid="kpi-speed">
                      Ritmo{' '}
                      <strong className="text-foreground">{matchRunSpeedLabel}</strong>
                    </span>
                  </span>
                </div>

                <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
                  <li className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#6ee7b7] font-mono text-[11px] font-bold text-[#0c0e14]">
                      1
                    </span>
                    <span className="grid gap-0.5">
                      <strong className="text-sm text-foreground">
                        Fase actual: <span className="text-primary">{currentPhaseLabel}</span>
                      </strong>
                      <span className="text-sm text-muted-foreground">
                        {currentPhaseDetail}
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#6ee7b7] font-mono text-[11px] font-bold text-[#0c0e14]">
                      2
                    </span>
                    <span className="grid min-w-0 flex-1 gap-1">
                      <strong className="text-sm text-foreground">
                        Tension {Math.round(tensionValue)}%
                      </strong>
                      <Progress
                        className="h-2.5 overflow-hidden rounded-full border bg-secondary"
                        role="progressbar"
                        aria-label="Nivel de tension"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(Math.min(100, tensionValue))}
                        value={tensionValue}
                      />
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold',
                        autosaveEnabled
                          ? 'bg-[#6ee7b7] text-[#0c0e14]'
                          : 'bg-[rgba(251,191,36,0.18)] text-[#fbbf24]'
                      )}
                    >
                      3
                    </span>
                    <span className="grid gap-1">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Switch
                          data-analytics-control="autosave"
                          checked={autosaveEnabled}
                          onCheckedChange={onToggleAutosave}
                        />
                        Guardar local
                      </label>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Sesion: <strong className="text-foreground">{currentSessionSizeLabel}</strong>{' '}
                        <Badge variant={sessionToneBadgeVariant(currentSessionSizeTone)}>
                          {currentSessionSizeTone === 'critical'
                            ? 'Critico'
                            : currentSessionSizeTone === 'high'
                              ? 'Alto'
                              : 'OK'}
                        </Badge>
                      </span>
                    </span>
                  </li>
                </ol>

                {!autosaveEnabled ? (
                  <p className="m-0 font-bold text-destructive">
                    Guardado local OFF: cualquier refresh o reinicio borra esta partida.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={onSaveSnapshot}
                  disabled={isBusy || !autosaveEnabled}
                  aria-label="Guardar snapshot"
                  title="Guardar snapshot"
                >
                  <Save aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    void onShareSnapshot();
                  }}
                  aria-label="Compartir snapshot"
                  title="Compartir snapshot"
                >
                  <Share2 aria-hidden="true" />
                </Button>
                <Link
                  className={buttonVariants({ variant: 'outline' })}
                  href="/"
                  onClick={onReturnToNewSetup}
                >
                  Nueva partida
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5">
          {!runtime && !isSessionView ? (
            <>
              <div
                className={cn(
                  'grid gap-4 rounded-xl border px-6 py-[22px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center',
                  setupCanStart
                    ? 'border-[#164e3f] bg-[#10231d]'
                    : 'border-[#5f4a18] bg-[#211b0f]'
                )}
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'w-fit',
                        setupCanStart
                          ? 'bg-[rgba(110,231,183,0.15)] text-[#6ee7b7]'
                          : 'bg-[rgba(251,191,36,0.15)] text-[#fbbf24]'
                      )}
                    >
                      {setupCanStart ? 'Listo para iniciar' : 'Setup pendiente'}
                    </Badge>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Roster: {selectedCharacters.length} | Seed:{' '}
                      {seed.trim() === '' ? 'aleatoria al iniciar' : seed.trim()}
                    </span>
                  </div>

                  <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-3">
                    {setupSteps.map((step, index) => (
                      <li key={step.id} className="flex gap-3">
                        <span
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold',
                            step.isComplete
                              ? 'bg-[#6ee7b7] text-[#0c0e14]'
                              : 'bg-[rgba(251,191,36,0.18)] text-[#fbbf24]'
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="grid gap-0.5">
                          <strong className="text-sm text-foreground">{step.label}</strong>
                          <span className="text-sm text-muted-foreground">{step.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button
                    type="button"
                    aria-label="Iniciar simulacion"
                    disabled={!setupCanStart || isBusy}
                    onClick={() => {
                      void onStartMatch();
                    }}
                  >
                    Iniciar
                  </Button>
                </div>
              </div>

              <section className="grid gap-6">
                <div className="grid gap-3">
                  <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      01
                    </span>
                    <span>Setup de partida</span>
                  </h2>
                </div>

                <div className={setupGridClassName}>
                  {isCatalogEmpty ? (
                    <div className="rounded-xl border bg-card p-4">
                      <p>No hay personajes disponibles en el catalogo.</p>
                      <Button
                        type="button"
                        onClick={() => {
                          setCatalogResult(
                            normalizeCatalogWithObservability(
                              DEFAULT_FRANCHISE_CATALOG_SOURCE,
                              'default_catalog_retry'
                            )
                          );
                        }}
                      >
                        Reintentar carga
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(0,1.4fr)] md:items-start">
                      <CatalogSelection
                        franchiseOptions={franchiseOptions}
                        selectedFranchiseId={selectedFranchiseId}
                        onSelectFranchise={onSelectFranchise}
                        moviesForSelectedFranchise={moviesForSelectedFranchise}
                        selectedMovieIds={selectedMovieIds}
                        toggleMovie={toggleMovie}
                      />
                      <RosterPreview
                        hasEmptySelectionState={hasEmptySelectionState}
                        setupRosterPreview={setupRosterPreview}
                        selectableCharacters={selectableCharacters}
                        selectedCharacters={selectedCharacters}
                        toggleCharacter={toggleCharacter}
                        toggleAllCharacters={toggleAllCharacters}
                        characterName={characterName}
                      />
                    </div>
                  )}

                <div className="grid gap-4 rounded-xl border bg-card px-6 py-[22px] md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
                  <div className="grid gap-3">
                    <Label className="grid gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Seed (opcional)
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        data-analytics-control="match_seed"
                        value={seed}
                        onChange={(event) => setSeed(event.target.value)}
                        placeholder="manual o aleatoria"
                      />
                      <Button type="button" onClick={generateSeed}>
                        Aleatoria
                      </Button>
                      </div>
                    </Label>

                    {showAdvanced ? (
                      <>
                        <Label className="grid gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Perfil de eventos
                          <Select
                            data-analytics-control="event_profile"
                            value={eventProfile}
                            onChange={(event) =>
                              setEventProfile(event.target.value as 'balanced' | 'aggressive' | 'chaotic')
                            }
                          >
                            <option value="balanced">Balanced</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="chaotic">Chaotic</option>
                          </Select>
                        </Label>

                        <Label className="grid gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Nivel de sorpresa
                          <Select
                            data-analytics-control="surprise_level"
                            value={surpriseLevel}
                            onChange={(event) =>
                              setSurpriseLevel(event.target.value as 'low' | 'normal' | 'high')
                            }
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                          </Select>
                        </Label>
                      </>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    type="button"
                    className="self-end"
                    onClick={() => setShowAdvanced((current) => !current)}
                  >
                    {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
                  </Button>
                </div>
                </div>
              </section>
            </>
          ) : null}

          {runtime ? (
            <section className="grid gap-6">
              <div className="grid gap-3">
                <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    01
                  </span>
                  <span>Simulacion en progreso</span>
                </h2>
              </div>

              <div className="grid gap-[14px] lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
              <article className={cardClassName}>
                <h2 className={cardTitleClassName}>Feed narrativo</h2>
                <p className={cardHintClassName}>
                  Cada evento resume quien, que y su impacto directo en 1-2 lineas.
                </p>

              {runtime.phase === 'running' ? (
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap" aria-label="Controles de reproduccion">
                  <button
                    type="button"
                    aria-label="Pausar simulacion"
                    title="Pausar simulacion"
                    className={cn(
                      speedButtonClassName,
                      playbackSpeed === 'pause' && activeSpeedButtonClassName
                    )}
                    onClick={() => setPlaybackSpeed('pause')}
                  >
                    <Pause aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Reproducir a 1x"
                    title="Reproducir a 1x"
                    className={cn(
                      speedButtonClassName,
                      playbackSpeed === '1x' && activeSpeedButtonClassName
                    )}
                    onClick={() => {
                      setSimulationSpeed('1x');
                      setPlaybackSpeed('1x');
                    }}
                  >
                    <Play aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Reproducir a 2x"
                    title="Reproducir a 2x"
                    className={cn(
                      speedButtonClassName,
                      playbackSpeed === '2x' && activeSpeedButtonClassName
                    )}
                    onClick={() => {
                      setSimulationSpeed('2x');
                      setPlaybackSpeed('2x');
                    }}
                  >
                    <span aria-hidden="true" className="font-extrabold leading-none">
                      &gt;&gt;
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Reproducir a 4x"
                    title="Reproducir a 4x"
                    className={cn(
                      speedButtonClassName,
                      playbackSpeed === '4x' && activeSpeedButtonClassName
                    )}
                    onClick={() => {
                      setSimulationSpeed('4x');
                      setPlaybackSpeed('4x');
                    }}
                  >
                    <span aria-hidden="true" className="font-extrabold leading-none">
                      &gt;&gt;&gt;
                    </span>
                  </button>
                </div>
              ) : null}

              <div className="mb-5 grid gap-2 md:grid-cols-[repeat(2,minmax(0,1fr))]">
                <label className={controlLabelClassName}>
                  Filtro por personaje
                  <select
                    className={selectClassName}
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

                <label className={controlLabelClassName}>
                  Filtro por tipo
                  <select
                    className={selectClassName}
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
                <ul className="m-0 grid list-none gap-2.5 p-0" data-testid="feed-list">
                  {filteredFeed.map((event) => {
                    const typeStyle = eventTypeStyle[event.type];

                    return (
                      <li
                        key={event.id}
                        data-testid="feed-item"
                        className={cn(
                          'rounded-lg border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
                          typeStyle.item,
                          latestFeedEventId === event.id && 'animate-in fade-in slide-in-from-top-2 duration-500'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="m-0 text-[0.82rem] text-muted-foreground">
                            Turno {event.turn_number} · {phaseLabel(event.phase)}
                          </p>
                          <span
                            className={cn(
                              'shrink-0 rounded-md border px-2.5 py-1 font-mono text-[0.72rem] font-extrabold uppercase leading-none tracking-normal',
                              typeStyle.label
                            )}
                          >
                            {EVENT_TYPE_LABEL[event.type]}
                          </span>
                        </div>
                        <p className="mb-1 mt-2 font-bold">{event.headline}</p>
                        <p className="m-0 text-muted-foreground">{event.impact}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {event.character_ids.length === 0 ? (
                            <span className={tagClassName}>Sin participantes trazables</span>
                          ) : (
                            event.character_ids.map((characterId) => {
                              const tone = participantEventTone(event, characterId);

                              return (
                                <span
                                  key={`${event.id}-${characterId}`}
                                  className={cn(tagClassName, participantEventTagClassName[tone])}
                                >
                                  {characterName(characterId)}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              </article>

              <aside className="grid content-start gap-[14px]">
                <section className={cardClassName}>
                  <h3 className="mb-3 mt-0 font-mono text-[0.78rem] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
                    Participantes
                  </h3>
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {participantStatusList.map((participant) => {
                        const statusClassName =
                          participant.status === 'alive'
                            ? 'text-[#6ee7b7]'
                            : participant.status === 'injured'
                              ? 'text-[#fbbf24]'
                              : 'text-[#f87171]';

                        return (
                          <li
                            key={participant.id}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-secondary px-3 py-2.5 font-mono text-[0.86rem]"
                          >
                            <span className="truncate font-semibold text-foreground">
                              {characterName(participant.character_id)}
                            </span>
                            <span className={cn('text-right font-semibold', statusClassName)}>
                              {statusLabel(participant.status)} · {participant.current_health}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </section>

                <section className={cardClassName}>
                  <h3 className={cardTitleClassName}>Relaciones destacadas</h3>
                  <ul className="m-0 grid list-none overflow-hidden rounded-xl border p-0">
                    {relationHighlights.length === 0 ? (
                      <li className="rounded-[10px] border bg-card px-2.5 py-2">Todavia no hay relaciones significativas.</li>
                    ) : (
                      relationHighlights.map((relation) => (
                        <li key={`${relation.pair[0]}-${relation.pair[1]}`} className="rounded-[10px] border bg-card px-2.5 py-2">
                          <strong>
                            {characterName(relation.pair[0])} · {characterName(relation.pair[1])}
                          </strong>
                          <div
                            className={relation.score >= 0 ? 'text-[#1a6f57]' : 'text-[#9d2e20]'}
                          >
                            {relationTone(relation.score)}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

              </aside>
              </div>
            </section>
          ) : null}
        </div>

        {infoMessage ? (
          <p className="mt-2.5 font-semibold text-muted-foreground" data-testid="info-message">
            {infoMessage}
          </p>
        ) : null}
      </div>
      {transitionOverlay ? (
        <div
          className={cn(
            'fixed inset-0 z-[120] grid place-items-center bg-foreground/70 transition-opacity duration-200',
            transitionOverlay.isExiting ? 'opacity-0' : 'opacity-100'
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="w-[min(90vw,420px)] rounded-xl border bg-card px-5 py-5 text-center shadow-2xl">
            <div
              className="mx-auto mb-3 size-[46px] animate-spin rounded-full border-4 border-border/55 border-t-primary"
              aria-hidden="true"
            />
            <p className="m-0 text-lg font-bold text-foreground">
              {transitionOverlay.direction === 'match_to_lobby'
                ? 'Volviendo al setup...'
                : 'Preparando la arena...'}
            </p>
            <p className="mt-2 text-muted-foreground">
              {transitionOverlay.showLongWait
                ? 'Esto esta tardando mas de lo esperado. Espera un momento...'
                : 'Sincronizando estado de la partida.'}
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
