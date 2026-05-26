'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QuickAccessSection, QuickAccessTable } from '@/app/components/quick-access';
import { buttonVariants } from '@/components/ui/button';
import { loadLocalMatchesFromStorage, type LocalMatchSummary } from '@/lib/local-matches';
import { dateLabel, getLobbyStatus, phaseLabel, quickAccessMatches, shortId } from '@/lib/match-ux';

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

function phaseTone(match: LocalMatchSummary): 'danger' | 'warning' | 'success' {
  if (match.cycle_phase === 'bloodbath' || match.cycle_phase === 'finale') {
    return 'danger';
  }

  if (getLobbyStatus(match) === 'finished') {
    return 'success';
  }

  return 'warning';
}

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

  const startTransitionToMatch = useCallback((): void => {
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
  }, []);

  const quickMatches = useMemo(() => quickAccessMatches(localMatches, 6), [localMatches]);
  const quickAccessRows = useMemo(
    () =>
      quickMatches.map((match) => ({
        id: match.id,
        code: (
          <Link href={`/sessions/${match.id}`} className="font-mono font-bold text-foreground">
            {shortId(match.id)}
          </Link>
        ),
        phase: phaseLabel(match.cycle_phase),
        phaseTone: phaseTone(match),
        turn: `Turno ${match.turn_number}`,
        roster: `${match.alive_count}/${match.total_participants} vivos`,
        seed: `Seed: ${match.settings.seed ?? 'sin seed'}`,
        updatedAt: dateLabel(match.updated_at),
        settings: `${match.settings.simulation_speed} · ${match.settings.event_profile}`,
        action: (
          <Link
            className={buttonVariants({ size: 'sm' })}
            href={`/sessions/${match.id}`}
            onClick={startTransitionToMatch}
          >
            {getLobbyStatus(match) === 'finished' ? 'Resumen' : 'Reanudar'}
          </Link>
        )
      })),
    [quickMatches, startTransitionToMatch]
  );
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

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background px-3 pb-9 pt-4 text-foreground transition-colors sm:px-6 sm:pt-7"
      aria-busy={isTransitioning}
    >
      <div className="mx-auto grid max-w-[1180px] gap-5">
        <header className="grid border-b pb-7 transition-colors">
          <div className="grid gap-2.5">
            <div>
              <h1 className="m-0 font-sans text-[clamp(2.9rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-foreground">
                hunger-games
              </h1>
            </div>
          </div>
        </header>

        <QuickAccessSection
          index="02"
          title="Acceso rapido"
        >
          <QuickAccessTable
            rows={quickAccessRows}
            emptyState={{
              message: 'No hay partidas guardadas todavia.',
              action: (
                <Link className={buttonVariants()} href="/new" onClick={startTransitionToMatch}>
                  Iniciar partida
                </Link>
              )
            }}
          />
        </QuickAccessSection>

        {infoMessage ? <p className="mt-2.5 font-semibold text-muted-foreground">{infoMessage}</p> : null}
      </div>
      {transitionOverlay ? (
        <div
          className={`fixed inset-0 z-[120] grid place-items-center bg-foreground/70 transition-opacity duration-200 ${transitionOverlay.isExiting ? 'opacity-0' : 'opacity-100'}`}
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
                ? 'Volviendo al lobby...'
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
