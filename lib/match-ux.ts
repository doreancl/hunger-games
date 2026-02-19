import type { LocalMatchSummary } from '@/lib/local-matches';

export type LobbyStatus = 'setup' | 'running' | 'finished';

export function shortId(value: string): string {
  return value.slice(0, 8);
}

export function phaseLabel(phase: LocalMatchSummary['cycle_phase']): string {
  const labels: Record<LocalMatchSummary['cycle_phase'], string> = {
    setup: 'Setup',
    bloodbath: 'Bloodbath',
    day: 'Dia',
    night: 'Noche',
    finale: 'Finale'
  };

  return labels[phase];
}

export function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function getLobbyStatus(match: LocalMatchSummary): LobbyStatus {
  if (match.turn_number === 0 && match.cycle_phase === 'setup') {
    return 'setup';
  }

  if (match.alive_count <= 1 || match.cycle_phase === 'finale') {
    return 'finished';
  }

  return 'running';
}

export function statusLabel(status: LobbyStatus): string {
  if (status === 'setup') {
    return 'Setup';
  }

  if (status === 'finished') {
    return 'Finalizada';
  }

  return 'En curso';
}

export function statusPriority(status: LobbyStatus): number {
  if (status === 'running') {
    return 0;
  }
  if (status === 'setup') {
    return 1;
  }
  return 2;
}

export function sortByUpdatedAt(matches: LocalMatchSummary[]): LocalMatchSummary[] {
  return [...matches].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
}

export function quickAccessMatches(matches: LocalMatchSummary[], limit = 6): LocalMatchSummary[] {
  return matches.slice(0, limit);
}

export function filterAndSortMatches(
  matches: LocalMatchSummary[],
  searchTerm: string,
  statusFilter: 'all' | LobbyStatus
): LocalMatchSummary[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return matches
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
    });
}

export function parseMatchNavigationQuery(search: string): {
  resumeMatchId: string | null;
  prefillMatchId: string | null;
} {
  const params = new URLSearchParams(search);
  return {
    resumeMatchId: params.get('resume'),
    prefillMatchId: params.get('prefill')
  };
}
