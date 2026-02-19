'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { loadLocalMatchesFromStorage, type LocalMatchSummary } from '@/lib/local-matches';

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

export default function Home() {
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    setLocalMatches(matches);
    if (error) {
      setInfoMessage(error);
    }
  }, []);

  const latestMatches = useMemo(() => localMatches.slice(0, 5), [localMatches]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Hunger Games Lobby</h1>
            <strong>{localMatches.length} partidas locales</strong>
          </div>
          <p className={styles.heroMeta}>Accede rapido a partidas recientes o crea una nueva.</p>

          <div className={styles.inlineControls}>
            <Link className={styles.button} href="/matches/new">
              Iniciar partida
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/matches">
              Ver historial completo
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ultimas partidas</h2>
          <p className={styles.cardHint}>Se muestran las 5 mas recientes.</p>

          {latestMatches.length === 0 ? (
            <div>
              <p>No hay partidas guardadas todavia.</p>
              <Link className={styles.button} href="/matches/new">
                Iniciar partida
              </Link>
            </div>
          ) : (
            <ul className={styles.matchList}>
              {latestMatches.map((match) => (
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

                  <div className={styles.inlineControls}>
                    <Link className={styles.button} href={`/matches/new?resume=${match.id}`}>
                      Reanudar
                    </Link>
                    <Link className={`${styles.button} ${styles.buttonGhost}`} href={`/matches/${match.id}`}>
                      Ver detalle
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {infoMessage ? <p className={styles.info}>{infoMessage}</p> : null}
      </div>
    </main>
  );
}
