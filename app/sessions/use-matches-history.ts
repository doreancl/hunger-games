'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadLocalMatchesFromStorage, saveLocalMatchesToStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { clearLocalRuntimeFromStorage, loadLocalRuntimeFromStorage } from '@/lib/local-runtime';
import {
  dateLabel,
  filterAndSortMatches,
  getLobbyStatus,
  type LobbyStatus,
  phaseLabel,
  shortId,
  sortByUpdatedAt,
  statusLabel
} from '@/lib/match-ux';

export type HistoryRow = {
  id: string;
  code: string;
  phase: string;
  turn: string;
  status: string;
  roster: string;
  seed: string;
  updatedAt: string;
  settings: string;
  primaryActionLabel: string;
  sessionHref: string;
  duplicateHref: string;
};

export type HistoryFilter = 'all' | LobbyStatus;

export function useMatchesHistory() {
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<HistoryFilter>('all');
  const [undoMatch, setUndoMatch] = useState<LocalMatchSummary | null>(null);

  useEffect(() => {
    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    setLocalMatches(matches);
    if (error) {
      setInfoMessage(error);
    }
  }, []);

  useEffect(() => {
    if (!undoMatch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUndoMatch(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [undoMatch]);

  function persistMatches(nextMatches: LocalMatchSummary[]) {
    setLocalMatches(nextMatches);
    const saveResult = saveLocalMatchesToStorage(window.localStorage, nextMatches);
    if (!saveResult.ok) {
      setInfoMessage(saveResult.error);
    }
  }

  function deleteMatch(matchId: string) {
    const match = localMatches.find((candidate) => candidate.id === matchId);
    if (!match) {
      return;
    }

    const confirmed = window.confirm(`Eliminar partida ${shortId(match.id)}?`);
    if (!confirmed) {
      return;
    }

    const runtimeLoad = loadLocalRuntimeFromStorage(window.localStorage);
    if (runtimeLoad.runtime?.match_id === match.id) {
      clearLocalRuntimeFromStorage(window.localStorage);
    }

    persistMatches(localMatches.filter((candidate) => candidate.id !== match.id));
    setUndoMatch(match);
    setInfoMessage(`Partida ${shortId(match.id)} eliminada.`);
  }

  function undoDelete() {
    if (!undoMatch) {
      return;
    }

    const alreadyExists = localMatches.some((match) => match.id === undoMatch.id);
    if (alreadyExists) {
      setUndoMatch(null);
      return;
    }

    persistMatches(sortByUpdatedAt([undoMatch, ...localMatches]));
    setInfoMessage(`Partida ${shortId(undoMatch.id)} restaurada.`);
    setUndoMatch(null);
  }

  const filteredMatches = useMemo(
    () => filterAndSortMatches(localMatches, searchTerm, statusFilter),
    [localMatches, searchTerm, statusFilter]
  );

  const rows = useMemo<HistoryRow[]>(
    () =>
      filteredMatches.map((match) => {
        const status = getLobbyStatus(match);

        return {
          id: match.id,
          code: shortId(match.id),
          phase: phaseLabel(match.cycle_phase),
          turn: `turno ${match.turn_number}`,
          status: statusLabel(status),
          roster: `${match.alive_count}/${match.total_participants} vivos`,
          seed: `Seed: ${match.settings.seed ?? 'sin seed'}`,
          updatedAt: dateLabel(match.updated_at),
          settings: `${match.settings.simulation_speed} · ${match.settings.event_profile}`,
          primaryActionLabel: status === 'finished' ? 'Resumen' : 'Reanudar',
          sessionHref: `/sessions/${match.id}`,
          duplicateHref: `/new?prefill=${match.id}`
        };
      }),
    [filteredMatches]
  );

  return {
    infoMessage,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    rows,
    localCount: localMatches.length,
    visibleCount: filteredMatches.length,
    filterLabel: statusFilter === 'all' ? 'Todos' : statusLabel(statusFilter),
    undoLabel: undoMatch ? shortId(undoMatch.id) : null,
    deleteMatch,
    undoDelete
  };
}
