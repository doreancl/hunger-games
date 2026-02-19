'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { loadLocalMatchesFromStorage, saveLocalMatchesToStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { clearLocalRuntimeFromStorage, loadLocalRuntimeFromStorage } from '@/lib/local-runtime';

type LobbyStatus = 'setup' | 'running' | 'finished';

function shortId(value: string): string {
  return value.slice(0, 8);
}

function phaseLabel(phase: LocalMatchSummary['cycle_phase']): string {
  const labels: Record<LocalMatchSummary['cycle_phase'], string> = {
    setup: 'Setup',
    bloodbath: 'Bloodbath',
    day: 'Dia',
    night: 'Noche',
    finale: 'Finale'
  };

  return labels[phase];
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function getLobbyStatus(match: LocalMatchSummary): LobbyStatus {
  if (match.turn_number === 0 && match.cycle_phase === 'setup') {
    return 'setup';
  }

  if (match.alive_count <= 1 || match.cycle_phase === 'finale') {
    return 'finished';
  }

  return 'running';
}

function statusLabel(status: LobbyStatus): string {
  if (status === 'setup') {
    return 'Setup';
  }

  if (status === 'finished') {
    return 'Finalizada';
  }

  return 'En curso';
}

function sortByUpdatedAt(matches: LocalMatchSummary[]): LocalMatchSummary[] {
  return [...matches].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
}

function statusPriority(status: LobbyStatus): number {
  if (status === 'running') {
    return 0;
  }
  if (status === 'setup') {
    return 1;
  }
  return 2;
}

export default function Home() {
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

  const latestMatches = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return localMatches
      .filter((match) => {
        const status = getLobbyStatus(match);
        const matchesStatus = statusFilter === 'all' || statusFilter === status;

        if (!matchesStatus) {
          return false;
        }

        if (normalizedSearch === '') {
          return true;
        }

        const searchable = `${match.id} ${shortId(match.id)} ${match.settings.seed ?? ''}`.toLowerCase();
        return searchable.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const statusOrder = statusPriority(getLobbyStatus(left)) - statusPriority(getLobbyStatus(right));
        if (statusOrder !== 0) {
          return statusOrder;
        }
        return Date.parse(right.updated_at) - Date.parse(left.updated_at);
      })
      .slice(0, 5);
  }, [localMatches, searchTerm, statusFilter]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Hunger Games Lobby</h1>
            <strong>{localMatches.length} partidas locales</strong>
          </div>
          <p className={styles.heroMeta}>Revisa actividad reciente o inicia una nueva simulacion.</p>

          <div className={styles.inlineControls}>
            <Link className={styles.button} href="/matches/new">
              Iniciar partida
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/matches/new#partidas-locales">
              Ver historial completo
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ultimas partidas</h2>
          <p className={styles.cardHint}>Interactua con partidas recientes desde el lobby.</p>

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

          {latestMatches.length === 0 ? (
            <div>
              <p>No hay partidas que coincidan con el filtro actual.</p>
              <Link className={styles.button} href="/matches/new">
                Iniciar partida
              </Link>
            </div>
          ) : (
            <ul className={styles.matchList}>
              {latestMatches.map((match) => {
                const status = getLobbyStatus(match);
                return (
                  <li key={match.id} className={styles.matchItem}>
                    <Link href={`/matches/${match.id}`} className={styles.matchLink}>
                      <p>
                        <strong>{shortId(match.id)}</strong> · {phaseLabel(match.cycle_phase)} · turno{' '}
                        {match.turn_number}
                      </p>
                      <p>
                        Vivos: {match.alive_count}/{match.total_participants} · Seed:{' '}
                        {match.settings.seed ?? 'sin seed'}
                      </p>
                      <p>Actualizada: {dateLabel(match.updated_at)}</p>
                    </Link>

                    <p>
                      <span
                        className={`${styles.statusBadge} ${
                          status === 'running'
                            ? styles.statusRunning
                            : status === 'finished'
                              ? styles.statusFinished
                              : styles.statusSetup
                        }`}
                      >
                        {statusLabel(status)}
                      </span>
                    </p>

                    <div className={styles.inlineControls}>
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
