'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { MatchList } from '@/app/components/match-list';
import { loadLocalMatchesFromStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { quickAccessMatches } from '@/lib/match-ux';

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

  const quickMatches = useMemo(() => quickAccessMatches(localMatches, 6), [localMatches]);

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
          <h2 className={styles.cardTitle}>Acceso rapido</h2>
          <p className={styles.cardHint}>Se muestran las partidas mas recientes. Para gestión completa usa Historial.</p>

          <MatchList
            matches={quickMatches}
            emptyState={
              <div>
                <p>No hay partidas guardadas todavia.</p>
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
              </>
            )}
          />
        </section>

        {infoMessage ? <p className={styles.info}>{infoMessage}</p> : null}
      </div>
    </main>
  );
}
