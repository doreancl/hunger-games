'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { HistoryFilter, HistoryRow } from './use-matches-history';

type MatchArchiveTableProps = {
  rows: HistoryRow[];
  searchTerm: string;
  statusFilter: HistoryFilter;
  localCount: number;
  visibleCount: number;
  filterLabel: string;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: HistoryFilter) => void;
  onDeleteMatch: (matchId: string) => void;
};

const headerClassName =
  'px-4 py-3 align-top font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground';

export function MatchArchiveSummary() {
  return (
    <section className="grid gap-6">
      <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
        <span className="font-mono text-xs font-bold text-muted-foreground">
          01
        </span>
        <span>Match archive</span>
      </h2>

      <div className="grid gap-3 rounded-xl border bg-card px-6 py-[22px] text-sm leading-[1.6] text-foreground">
        <div className="max-w-[860px]">
          <p className="m-0 mb-3">
            <strong>historial</strong> guarda las partidas locales que puedes reanudar,
            duplicar o cerrar cuando la simulacion ya termino.
          </p>
          <p className="m-0">
            Usa los filtros para encontrar una arena por seed, estado o id corta sin
            perder el contexto de la ultima ejecucion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
        </div>
      </div>
    </section>
  );
}

export function MatchArchiveTable({
  rows,
  searchTerm,
  statusFilter,
  localCount,
  visibleCount,
  filterLabel,
  onSearchTermChange,
  onStatusFilterChange,
  onDeleteMatch
}: MatchArchiveTableProps) {
  return (
    <section className="grid gap-6">
      <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
        <span className="font-mono text-xs font-bold text-muted-foreground">
          02
        </span>
        <span>Todas las partidas</span>
      </h2>

      <div className="grid gap-4">
        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <Label className="grid gap-2 text-sm font-semibold text-foreground">
            Buscar
            <Input
              data-analytics-control="history_search"
              placeholder="id corta o seed"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
            />
          </Label>

          <Label className="grid gap-2 text-sm font-semibold text-foreground">
            Estado
            <Select
              data-analytics-control="history_status_filter"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as HistoryFilter)}
            >
              <option value="all">Todos</option>
              <option value="setup">Setup</option>
              <option value="running">En curso</option>
              <option value="finished">Finalizada</option>
            </Select>
          </Label>

          <div className="grid content-end gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            <span>
              Locales <strong className="text-foreground">{localCount}</strong>
            </span>
            <span>
              Visibles <strong className="text-foreground">{visibleCount}</strong>
            </span>
            <span>
              Filtro <strong className="text-foreground">{filterLabel}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[21%]" />
              <col className="w-[27%]" />
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className={headerClassName}>Partida</TableHead>
                <TableHead className={headerClassName}>Estado</TableHead>
                <TableHead className={headerClassName}>Roster</TableHead>
                <TableHead className={headerClassName}>Actualizada</TableHead>
                <TableHead className={headerClassName}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="px-4 py-3 align-top">
                      <strong className="block font-mono text-foreground">{row.code}</strong>
                      <small className="mt-0.5 block text-muted-foreground">
                        {row.phase} · {row.turn}
                      </small>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <Badge>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <strong className="block text-foreground">{row.roster}</strong>
                      <small className="mt-0.5 block text-muted-foreground">{row.seed}</small>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <strong className="block text-foreground">{row.updatedAt}</strong>
                      <small className="mt-0.5 block text-muted-foreground">{row.settings}</small>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <ButtonLink href={row.sessionHref} size="sm">
                          {row.primaryActionLabel}
                        </ButtonLink>
                        <ButtonLink href={row.duplicateHref} variant="outline" size="sm">
                          Duplicar
                        </ButtonLink>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteMatch(row.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="px-4 py-8 align-top">
                    <div className="grid justify-items-start gap-3">
                      <p className="m-0 text-foreground">
                        No hay partidas que coincidan con el filtro actual.
                      </p>
                      <ButtonLink href="/" size="sm">
                        Nueva partida
                      </ButtonLink>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

export function UndoDeleteAlert({
  undoLabel,
  onUndoDelete
}: {
  undoLabel: string | null;
  onUndoDelete: () => void;
}) {
  if (!undoLabel) {
    return null;
  }

  return (
    <Alert>
      <AlertDescription>
        Partida {undoLabel} eliminada.{' '}
        <Button variant="outline" size="sm" onClick={onUndoDelete}>
          Deshacer
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function HistoryInfoAlert({ infoMessage }: { infoMessage: string | null }) {
  if (!infoMessage) {
    return null;
  }

  return (
    <Alert>
      <AlertDescription>{infoMessage}</AlertDescription>
    </Alert>
  );
}
