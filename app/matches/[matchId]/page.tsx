'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<LocalMatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { matches, error: loadError } = loadLocalMatchesFromStorage(window.localStorage);
    const current = matches.find((item) => item.id === matchId) ?? null;
    setMatch(current);
    setError(loadError);
  }, [matchId]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Detalle de partida</h1>
            <strong>{match ? shortId(match.id) : 'Sin datos'}</strong>
          </div>
          <p className={styles.heroMeta}>Vista local para continuar una simulacion guardada.</p>

          <div className={styles.inlineControls}>
            <Link className={styles.button} href={`/matches/new?resume=${matchId}`}>
              Reanudar partida
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/matches/new#partidas-locales">
              Ir al historial completo
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/">
              Volver al lobby
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          {!match ? (
            <div>
              <p>No se encontro esta partida en almacenamiento local.</p>
              <div className={styles.inlineControls}>
                <Link className={styles.button} href="/matches/new">
                  Iniciar nueva partida
                </Link>
                <Link className={`${styles.button} ${styles.buttonGhost}`} href="/">
                  Volver al lobby
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className={styles.cardTitle}>Resumen</h2>
              <p>
                <strong>ID:</strong> {shortId(match.id)}
              </p>
              <p>
                <strong>Fase:</strong> {phaseLabel(match.cycle_phase)} · <strong>Turno:</strong>{' '}
                {match.turn_number}
              </p>
              <p>
                <strong>Vivos:</strong> {match.alive_count}/{match.total_participants}
              </p>
              <p>
                <strong>Seed:</strong> {match.settings.seed ?? 'sin seed'}
              </p>
              <p>
                <strong>Actualizada:</strong> {dateLabel(match.updated_at)}
              </p>
            </>
          )}
        </section>

        {error ? <p className={styles.info}>{error}</p> : null}
      </div>
    </main>
  );
}
