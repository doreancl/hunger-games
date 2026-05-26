import type { ReactNode } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type PhaseTone = 'danger' | 'warning' | 'success';

type QuickAccessRow = {
  id: string;
  code: ReactNode;
  phase: string;
  phaseTone: PhaseTone;
  turn: string;
  roster: string;
  seed: string;
  updatedAt: string;
  settings: string;
  action: ReactNode;
};

type QuickAccessSectionProps = {
  index: string;
  title: string;
  children: ReactNode;
};

type QuickAccessTableProps = {
  rows: QuickAccessRow[];
  emptyState: {
    message: string;
    action: ReactNode;
  };
};

export function QuickAccessSection({
  index,
  title,
  children
}: QuickAccessSectionProps) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-3">
        <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {index}
          </span>
          <span>{title}</span>
        </h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function QuickAccessTable({ rows, emptyState }: QuickAccessTableProps) {
  const headerClassName =
    'px-4 py-3 align-top font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground';
  const phaseToneClassNames: Record<PhaseTone, string> = {
    danger: 'bg-[rgba(248,113,113,0.15)] text-[#f87171]',
    warning: 'bg-[rgba(251,191,36,0.15)] text-[#fbbf24]',
    success: 'bg-[rgba(110,231,183,0.15)] text-[#6ee7b7]'
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[15%]" />
          <col className="w-[26%]" />
          <col className="w-[29%]" />
          <col className="w-[14%]" />
        </colgroup>
        <TableHeader className="bg-muted">
          <TableRow className="hover:bg-transparent">
            <TableHead className={headerClassName}>
              Partida
            </TableHead>
            <TableHead className={headerClassName}>
              Fase
            </TableHead>
            <TableHead className={headerClassName}>
              Roster
            </TableHead>
            <TableHead className={headerClassName}>
              Actualizada
            </TableHead>
            <TableHead className={headerClassName}>
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <Empty className="min-h-[116px] border-0">
                  <EmptyHeader>
                    <EmptyTitle>{emptyState.message}</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>{emptyState.action}</EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/30">
              <TableCell className="px-4 py-3 align-top">
                {row.code}
              </TableCell>
              <TableCell className="px-4 py-3 align-top">
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-[9px] py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] ${phaseToneClassNames[row.phaseTone]}`}
                >
                  {row.phase}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3 align-top">
                <strong className="block text-foreground">{row.roster}</strong>
                <small className="mt-0.5 block text-muted-foreground">
                  {row.turn} · {row.seed}
                </small>
              </TableCell>
              <TableCell className="px-4 py-3 align-top">
                <strong className="block text-foreground">{row.updatedAt}</strong>
                <small className="mt-0.5 block text-muted-foreground">{row.settings}</small>
              </TableCell>
              <TableCell className="px-4 py-3 align-top">{row.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
