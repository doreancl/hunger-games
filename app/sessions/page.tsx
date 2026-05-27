'use client';

import { HistoryView } from './history-view';
import { useMatchesHistory } from './use-matches-history';

export default function MatchesHistoryPage() {
  const history = useMatchesHistory();

  return (
    <HistoryView
      rows={history.rows}
      searchTerm={history.searchTerm}
      statusFilter={history.statusFilter}
      localCount={history.localCount}
      visibleCount={history.visibleCount}
      filterLabel={history.filterLabel}
      undoLabel={history.undoLabel}
      infoMessage={history.infoMessage}
      onSearchTermChange={history.setSearchTerm}
      onStatusFilterChange={history.setStatusFilter}
      onDeleteMatch={history.deleteMatch}
      onUndoDelete={history.undoDelete}
    />
  );
}
