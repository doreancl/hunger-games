'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LocalMatchSummary } from '@/lib/local-matches';
import { dateLabel, getLobbyStatus, phaseLabel, shortId, statusLabel } from '@/lib/match-ux';
import styles from '@/app/page.module.css';

type MatchListProps = {
  matches: LocalMatchSummary[];
  emptyState: ReactNode;
  renderActions: (match: LocalMatchSummary) => ReactNode;
  showStatus?: boolean;
};

export function MatchList({ matches, emptyState, renderActions, showStatus = false }: MatchListProps) {
  if (matches.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <ul className={styles.matchList}>
      {matches.map((match) => {
        const status = getLobbyStatus(match);

        return (
          <li key={match.id} className={styles.matchItem}>
            <Link href={`/matches/${match.id}`} className={styles.matchLink}>
              <p>
                <strong>{shortId(match.id)}</strong> · {phaseLabel(match.cycle_phase)} · turno {match.turn_number}
              </p>
              <p>
                Vivos: {match.alive_count}/{match.total_participants} · Seed: {match.settings.seed ?? 'sin seed'}
              </p>
              <p>Actualizada: {dateLabel(match.updated_at)}</p>
            </Link>

            {showStatus ? (
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
            ) : null}

            <div className={styles.inlineControls}>{renderActions(match)}</div>
          </li>
        );
      })}
    </ul>
  );
}
