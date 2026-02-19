'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { MatchList } from '@/app/components/match-list';
import { loadLocalMatchesFromStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { quickAccessMatches } from '@/lib/match-ux';

const TRANSITION_STORAGE_KEY = 'hg_transition';
const TRANSITION_MIN_VISIBLE_MS = 700;
const TRANSITION_LONG_WAIT_MS = 3000;
const TRANSITION_FADE_OUT_MS = 180;

type TransitionDirection = 'lobby_to_match' | 'match_to_lobby';

type TransitionOverlayState = {
  direction: TransitionDirection;
  showLongWait: boolean;
  isExiting: boolean;
};

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export default function Home() {
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [transitionOverlay, setTransitionOverlay] = useState<TransitionOverlayState | null>(null);

  useEffect(() => {
    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    setLocalMatches(matches);
    if (error) {
      setInfoMessage(error);
    }
  }, []);

  const quickMatches = useMemo(() => quickAccessMatches(localMatches, 6), [localMatches]);
  const isTransitioning = transitionOverlay !== null;

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

    if (parsed?.direction !== 'match_to_lobby' || typeof parsed.startedAt !== 'number') {
      return;
    }

    window.sessionStorage.removeItem(TRANSITION_STORAGE_KEY);

    const elapsedMs = Date.now() - parsed.startedAt;
    const remainingMinMs = Math.max(0, TRANSITION_MIN_VISIBLE_MS - elapsedMs);
    const remainingLongWaitMs = Math.max(0, TRANSITION_LONG_WAIT_MS - elapsedMs);
    let longWaitId = 0;

    setTransitionOverlay({
      direction: 'match_to_lobby',
      showLongWait: elapsedMs >= TRANSITION_LONG_WAIT_MS,
      isExiting: false
    });

    if (elapsedMs < TRANSITION_LONG_WAIT_MS) {
      longWaitId = window.setTimeout(() => {
        setTransitionOverlay((current) => {
          if (!current || current.direction !== 'match_to_lobby' || current.isExiting) {
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

  function startTransitionToMatch(): void {
    const startedAt = Date.now();
    window.sessionStorage.setItem(
      TRANSITION_STORAGE_KEY,
      JSON.stringify({ direction: 'lobby_to_match', startedAt })
    );
    setTransitionOverlay({
      direction: 'lobby_to_match',
      showLongWait: false,
      isExiting: false
    });

    window.setTimeout(() => {
      setTransitionOverlay((current) => {
        if (!current || current.direction !== 'lobby_to_match' || current.isExiting) {
          return current;
        }

        return { ...current, showLongWait: true };
      });
    }, TRANSITION_LONG_WAIT_MS);
  }

  return (
    <main className={styles.page} aria-busy={isTransitioning}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Hunger Games Lobby</h1>
            <strong>{localMatches.length} partidas locales</strong>
          </div>
          <p className={styles.heroMeta}>Accede rapido a partidas recientes o crea una nueva.</p>

          <div className={styles.inlineControls}>
            <Link className={styles.button} href="/matches/new" onClick={startTransitionToMatch}>
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
                <Link className={styles.button} href="/matches/new" onClick={startTransitionToMatch}>
                  Iniciar partida
                </Link>
              </div>
            }
            renderActions={(match) => (
              <>
                <Link
                  className={styles.button}
                  href={`/matches/new?resume=${match.id}`}
                  onClick={startTransitionToMatch}
                >
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
      {transitionOverlay ? (
        <div
          className={`${styles.transitionOverlay} ${transitionOverlay.isExiting ? styles.transitionOverlayExit : ''}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={styles.transitionContent}>
            <div className={styles.transitionSpinner} aria-hidden="true" />
            <p className={styles.transitionTitle}>
              {transitionOverlay.direction === 'match_to_lobby'
                ? 'Volviendo al lobby...'
                : 'Preparando la arena...'}
            </p>
            <p className={styles.transitionHint}>
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
