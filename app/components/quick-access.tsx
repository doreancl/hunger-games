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

type QuickAccessRow = {
  id: string;
  code: ReactNode;
  phase: string;
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
  description: string;
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
  description,
  children
}: QuickAccessSectionProps) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-3 px-6">
        <h2 className="m-0 flex items-baseline gap-3 font-sans text-[22px] font-bold leading-tight tracking-normal text-foreground">
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {index}
          </span>
          <span>{title}</span>
        </h2>
        <p className="m-0 text-[13px] leading-snug text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function QuickAccessTable({ rows, emptyState }: QuickAccessTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Partida
            </TableHead>
            <TableHead className="font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Fase
            </TableHead>
            <TableHead className="font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Roster
            </TableHead>
            <TableHead className="font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Actualizada
            </TableHead>
            <TableHead className="font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
              <TableCell>
                {row.code}
              </TableCell>
              <TableCell>
                <strong className="block text-foreground">{row.phase}</strong>
                <small className="mt-0.5 block text-muted-foreground">{row.turn}</small>
              </TableCell>
              <TableCell>
                <strong className="block text-foreground">{row.roster}</strong>
                <small className="mt-0.5 block text-muted-foreground">{row.seed}</small>
              </TableCell>
              <TableCell>
                <strong className="block text-foreground">{row.updatedAt}</strong>
                <small className="mt-0.5 block text-muted-foreground">{row.settings}</small>
              </TableCell>
              <TableCell>{row.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
