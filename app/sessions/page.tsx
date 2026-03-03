'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../page.module.css';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ButtonLink } from '@/app/components/ui/button-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { loadLocalMatchesFromStorage, saveLocalMatchesToStorage, type LocalMatchSummary } from '@/lib/local-matches';
import {
  dateLabel,
  filterAndSortMatches,
  getLobbyStatus,
  type LobbyStatus,
  phaseLabel,
  shortId,
  sortByUpdatedAt,
  statusLabel
} from '@/lib/match-ux';
import { clearLocalRuntimeFromStorage, loadLocalRuntimeFromStorage } from '@/lib/local-runtime';

export default function MatchesHistoryPage() {
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LobbyStatus>('all');
  const [undoMatch, setUndoMatch] = useState<LocalMatchSummary | null>(null);

  useEffect(() => {
    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    setLocalMatches(matches);
    if (error) {
      setInfoMessage(error);
    }
  }, []);

  useEffect(() => {
    if (!undoMatch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUndoMatch(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [undoMatch]);

  function persistMatches(nextMatches: LocalMatchSummary[]) {
    setLocalMatches(nextMatches);
    const saveResult = saveLocalMatchesToStorage(window.localStorage, nextMatches);
    if (!saveResult.ok) {
      setInfoMessage(saveResult.error);
    }
  }

  function onDeleteMatch(match: LocalMatchSummary) {
    const confirmed = window.confirm(`Eliminar partida ${shortId(match.id)}?`);
    if (!confirmed) {
      return;
    }

    const runtimeLoad = loadLocalRuntimeFromStorage(window.localStorage);
    if (runtimeLoad.runtime?.match_id === match.id) {
      clearLocalRuntimeFromStorage(window.localStorage);
    }

    const nextMatches = localMatches.filter((candidate) => candidate.id !== match.id);
    persistMatches(nextMatches);
    setUndoMatch(match);
    setInfoMessage(`Partida ${shortId(match.id)} eliminada.`);
  }

  function onUndoDelete() {
    if (!undoMatch) {
      return;
    }

    const alreadyExists = localMatches.some((match) => match.id === undoMatch.id);
    if (alreadyExists) {
      setUndoMatch(null);
      return;
    }

    const nextMatches = sortByUpdatedAt([undoMatch, ...localMatches]);
    persistMatches(nextMatches);
    setInfoMessage(`Partida ${shortId(undoMatch.id)} restaurada.`);
    setUndoMatch(null);
  }

  const filteredMatches = useMemo(
    () => filterAndSortMatches(localMatches, searchTerm, statusFilter),
    [localMatches, searchTerm, statusFilter]
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.title}>Historial de partidas</h1>
            <strong>{localMatches.length} partidas locales</strong>
          </div>
          <p className={styles.heroMeta}>Gestiona todas tus partidas locales desde un solo lugar.</p>

          <div className={styles.inlineControls}>
            <ButtonLink href="/new">Iniciar partida</ButtonLink>
            <ButtonLink href="/" variant="outline">
              Volver al lobby
            </ButtonLink>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Todas las partidas</CardTitle>
            <CardDescription>Busca, filtra y gestiona partidas guardadas.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className={styles.filtersRow}>
              <Label>
                Buscar
                <Input
                  placeholder="id corta o seed"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </Label>

              <Label>
                Estado
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | LobbyStatus)}
                >
                  <option value="all">Todos</option>
                  <option value="setup">Setup</option>
                  <option value="running">En curso</option>
                  <option value="finished">Finalizada</option>
                </Select>
              </Label>
            </div>

            {filteredMatches.length > 0 ? (
              <ul className={styles.matchList}>
                {filteredMatches.map((match) => {
                  const status = getLobbyStatus(match);
                  return (
                    <li key={match.id} className={styles.matchItem}>
                      <div>
                        <p>
                          <strong>{shortId(match.id)}</strong> · {phaseLabel(match.cycle_phase)} · turno {match.turn_number}
                        </p>
                        <p>
                          Vivos: {match.alive_count}/{match.total_participants} · Seed: {match.settings.seed ?? 'sin seed'}
                        </p>
                        <p>Actualizada: {dateLabel(match.updated_at)}</p>
                      </div>

                      <p>
                        <Badge>{statusLabel(status)}</Badge>
                      </p>

                      <div className={styles.inlineControls}>
                        <ButtonLink href={`/sessions/${match.id}`} size="sm">
                          Reanudar
                        </ButtonLink>
                        <ButtonLink href={`/new?prefill=${match.id}`} variant="outline" size="sm">
                          Duplicar setup
                        </ButtonLink>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteMatch(match)}>
                          Eliminar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>
                <p>No hay partidas que coincidan con el filtro actual.</p>
                <ButtonLink href="/new" size="sm">
                  Iniciar partida
                </ButtonLink>
              </div>
            )}
          </CardContent>
        </Card>

        {undoMatch ? (
          <Alert>
            <AlertDescription>
              Partida {shortId(undoMatch.id)} eliminada.{' '}
              <Button variant="outline" size="sm" onClick={onUndoDelete}>
                Deshacer
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {infoMessage ? (
          <Alert>
            <AlertDescription>{infoMessage}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </main>
  );
}
