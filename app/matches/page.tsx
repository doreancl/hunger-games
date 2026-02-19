'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from '../page.module.css';
import { MatchList } from '@/app/components/match-list';
import { loadLocalMatchesFromStorage, saveLocalMatchesToStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { clearLocalRuntimeFromStorage, loadLocalRuntimeFromStorage } from '@/lib/local-runtime';
import {
  filterAndSortMatches,
  type LobbyStatus,
  shortId,
  sortByUpdatedAt
} from '@/lib/match-ux';

export default function MatchesHistoryPage() {
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LobbyStatus>('all');
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

  function onDeleteMatch(match: LocalMatchSummary) {
    const confirmed = window.confirm(`Eliminar partida ${shortId(match.id)}?`);
    if (!confirmed) {
      return;
    }

    const runtimeLoad = loadLocalRuntimeFromStorage(window.localStorage);
    if (runtimeLoad.runtime?.match_id === match.id) {
      clearLocalRuntimeFromStorage(window.localStorage);
    }

    const nextMatches = localMatches.filter((candidate) => candidate.id !== match.id);
    persistMatches(nextMatches);
    setUndoMatch(match);
    setInfoMessage(`Partida ${shortId(match.id)} eliminada.`);
  }

  function onUndoDelete() {
    if (!undoMatch) {
      return;
    }

    const alreadyExists = localMatches.some((match) => match.id === undoMatch.id);
    if (alreadyExists) {
      setUndoMatch(null);
      return;
    }

    const nextMatches = sortByUpdatedAt([undoMatch, ...localMatches]);
    persistMatches(nextMatches);
    setInfoMessage(`Partida ${shortId(undoMatch.id)} restaurada.`);
    setUndoMatch(null);
  }

  const filteredMatches = useMemo(
    () => filterAndSortMatches(localMatches, searchTerm, statusFilter),
    [localMatches, searchTerm, statusFilter]
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Historial de partidas</h1>
            <strong>{localMatches.length} partidas locales</strong>
          </div>
          <p className={styles.heroMeta}>Gestiona todas tus partidas locales desde un solo lugar.</p>

          <div className={styles.inlineControls}>
            <Link className={styles.button} href="/matches/new">
              Iniciar partida
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/">
              Volver al lobby
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Todas las partidas</h2>
          <p className={styles.cardHint}>Busca, filtra y gestiona partidas guardadas.</p>

          <div className={styles.filtersRow}>
            <label className={styles.controlLabel}>
              Buscar
              <input
                className={styles.input}
                placeholder="id corta o seed"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className={styles.controlLabel}>
              Estado
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | LobbyStatus)}
              >
                <option value="all">Todos</option>
                <option value="setup">Setup</option>
                <option value="running">En curso</option>
                <option value="finished">Finalizada</option>
              </select>
            </label>
          </div>

          <MatchList
            matches={filteredMatches}
            showStatus
            emptyState={
              <div>
                <p>No hay partidas que coincidan con el filtro actual.</p>
                <Link className={styles.button} href="/matches/new">
                  Iniciar partida
                </Link>
              </div>
            }
            renderActions={(match) => (
              <>
                <Link className={styles.button} href={`/matches/new?resume=${match.id}`}>
                  Reanudar
                </Link>
                <Link className={`${styles.button} ${styles.buttonGhost}`} href={`/matches/${match.id}`}>
                  Ver detalle
                </Link>
                <Link className={`${styles.button} ${styles.buttonGhost}`} href={`/matches/new?prefill=${match.id}`}>
                  Duplicar setup
                </Link>
                <button
                  className={`${styles.button} ${styles.buttonDanger}`}
                  type="button"
                  onClick={() => onDeleteMatch(match)}
                >
                  Eliminar
                </button>
              </>
            )}
          />
        </section>

        {undoMatch ? (
          <p className={styles.info}>
            Partida {shortId(undoMatch.id)} eliminada.{' '}
            <button className={`${styles.button} ${styles.buttonGhost}`} type="button" onClick={onUndoDelete}>
              Deshacer
            </button>
          </p>
        ) : null}

        {infoMessage ? <p className={styles.info}>{infoMessage}</p> : null}
      </div>
    </main>
  );
}
