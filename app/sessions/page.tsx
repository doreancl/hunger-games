'use client';

import {
  HistoryInfoAlert,
  MatchArchiveSummary,
  MatchArchiveTable,
  UndoDeleteAlert
} from '@/app/_sessions/history-view';
import { useMatchesHistory } from '@/app/_sessions/use-matches-history';

export default function MatchesHistoryPage() {
  const history = useMatchesHistory();

  return (
    <main className="min-h-screen bg-background px-3 pb-9 pt-4 text-foreground transition-colors sm:px-6 sm:pt-7">
      <div className="mx-auto grid max-w-[1180px] gap-5">
        <header className="grid border-b pb-7 transition-colors">
          <h1 className="m-0 font-sans text-[clamp(2.9rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-foreground">
            historial<span className="sr-only"> de partidas</span>
          </h1>
        </header>

        <MatchArchiveSummary />
        <MatchArchiveTable
          rows={history.rows}
          searchTerm={history.searchTerm}
          statusFilter={history.statusFilter}
          localCount={history.localCount}
          visibleCount={history.visibleCount}
          filterLabel={history.filterLabel}
          onSearchTermChange={history.setSearchTerm}
          onStatusFilterChange={history.setStatusFilter}
          onDeleteMatch={history.deleteMatch}
        />
        <UndoDeleteAlert
          undoLabel={history.undoLabel}
          onUndoDelete={history.undoDelete}
        />
        <HistoryInfoAlert infoMessage={history.infoMessage} />
      </div>
    </main>
  );
}
