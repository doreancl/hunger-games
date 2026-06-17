import { useEffect, useRef } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildCharacterLabel } from '@/lib/domain/franchise-catalog';
import type { FranchiseCharacter } from '@/lib/domain/types';
import { MAX_ROSTER_SIZE } from '@/lib/local-matches';
import type { getSetupRosterPreview } from '@/lib/match-ux';
import { cn } from '@/lib/utils';

type SetupRosterPreview = ReturnType<typeof getSetupRosterPreview>;

type RosterPreviewProps = {
  hasEmptySelectionState: boolean;
  setupRosterPreview: SetupRosterPreview;
  selectableCharacters: FranchiseCharacter[];
  selectedCharacters: string[];
  toggleCharacter: (characterId: string) => void;
  toggleAllCharacters: () => void;
  characterName: (characterId: string) => string;
  rosterCharacterName: (characterId: string) => string;
  updateRosterCharacterName: (characterId: string, name: string) => void;
  addRosterCharacter: () => void;
  removeRosterCharacter: (characterId: string) => void;
  newRosterCharacterId: string | null;
  clearNewRosterCharacter: () => void;
  hasRosterChanges: boolean;
  resetRosterEdits: () => void;
};

export function RosterPreview(props: RosterPreviewProps) {
  const {
    hasEmptySelectionState,
    setupRosterPreview,
    selectableCharacters,
    selectedCharacters,
    toggleCharacter,
    toggleAllCharacters,
    characterName,
    rosterCharacterName,
    updateRosterCharacterName,
    addRosterCharacter,
    removeRosterCharacter,
    newRosterCharacterId,
    clearNewRosterCharacter,
    hasRosterChanges,
    resetRosterEdits
  } = props;
  const newCharacterInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCharacterSet = new Set(selectedCharacters);
  const selectedSelectableCount = selectableCharacters.filter((character) =>
    selectedCharacterSet.has(character.character_key)
  ).length;
  const selectableCharacterIdSet = new Set(
    selectableCharacters.map((character) => character.character_key)
  );
  const hasSelectableCharacters = selectableCharacters.length > 0;
  const allSelectableCharactersSelected =
    hasSelectableCharacters && selectedSelectableCount === selectableCharacters.length;
  const someSelectableCharactersSelected =
    selectedSelectableCount > 0 && selectedSelectableCount < selectableCharacters.length;
  const extraSelectedCharacters = selectedCharacters.filter(
    (characterId) => !selectableCharacterIdSet.has(characterId)
  );
  const selectedCharacterIdSet = new Set(selectedCharacters);
  const canAddRosterCharacter = selectedCharacters.length < MAX_ROSTER_SIZE;

  useEffect(() => {
    if (!newRosterCharacterId) {
      return;
    }

    newCharacterInputRef.current?.focus();
  }, [newRosterCharacterId]);

  function rosterRow(args: {
    characterId: string;
    checkboxId: string;
    checkboxLabel: string;
    selected: boolean;
    disabled?: boolean;
    opacityClassName?: string;
  }) {
    return (
      <div
        key={args.characterId}
        className={cn(
          'group flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-[12.5px]',
          args.opacityClassName
        )}
      >
        <Checkbox
          data-analytics-control="roster_character_selection"
          id={args.checkboxId}
          aria-label={args.checkboxLabel}
          checked={args.selected}
          onChange={() => toggleCharacter(args.characterId)}
          disabled={args.disabled}
        />
        <Input
          ref={args.characterId === newRosterCharacterId ? newCharacterInputRef : undefined}
          aria-label={
            rosterCharacterName(args.characterId).trim() === ''
              ? 'Editar nombre nuevo tributo'
              : `Editar nombre ${rosterCharacterName(args.characterId)}`
          }
          maxLength={40}
          value={rosterCharacterName(args.characterId)}
          onChange={(event) => updateRosterCharacterName(args.characterId, event.target.value)}
          onBlur={() => {
            if (args.characterId !== newRosterCharacterId) {
              return;
            }

            if (rosterCharacterName(args.characterId).trim() === '') {
              removeRosterCharacter(args.characterId);
              return;
            }

            clearNewRosterCharacter();
          }}
          className="h-6 min-w-0 !border-0 !bg-transparent px-1 py-0 font-mono text-[12.5px] text-foreground !shadow-none focus-visible:ring-1"
        />
        {args.selected ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Quitar ${rosterCharacterName(args.characterId)}`}
            title="Quitar"
            onClick={() => removeRosterCharacter(args.characterId)}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-4 px-6 py-[22px]">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            2) Roster generado
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRosterCharacter}
            disabled={!canAddRosterCharacter}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Anadir
          </Button>
        </div>
        {setupRosterPreview.mode === 'catalog' ? (
          <Label
            htmlFor="roster-select-all"
            className="flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <Checkbox
              data-analytics-control="roster_select_all"
              id="roster-select-all"
              aria-label="Seleccionar todo el roster"
              checked={allSelectableCharactersSelected}
              ref={(element) => {
                if (element) {
                  element.indeterminate = someSelectableCharactersSelected;
                }
              }}
              onChange={toggleAllCharacters}
              disabled={!hasSelectableCharacters}
            />
            Select all
          </Label>
        ) : null}
      </CardHeader>
      <CardContent className="px-6 pb-[22px]">
        {hasEmptySelectionState ? (
          <p className="text-sm text-muted-foreground">Selecciona franquicia y peliculas para empezar.</p>
        ) : setupRosterPreview.mode === 'empty' ? (
          <p className="text-sm text-muted-foreground">No hay personajes para las peliculas seleccionadas.</p>
        ) : setupRosterPreview.mode === 'catalog' ? (
          <div className="grid gap-2 md:grid-cols-2">
            {selectableCharacters.map((character) => {
              const checkboxId = `roster-${character.character_key}`;
              const label = buildCharacterLabel(character);
              return rosterRow({
                characterId: character.character_key,
                checkboxId,
                checkboxLabel: `Seleccionar ${label}`,
                selected: selectedCharacterIdSet.has(character.character_key)
              });
            })}
            {extraSelectedCharacters.map((characterId) => {
              const checkboxId = `roster-custom-${characterId}`;
              return rosterRow({
                characterId,
                checkboxId,
                checkboxLabel: `Seleccionar ${rosterCharacterName(characterId)}`,
                selected: true
              });
            })}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {setupRosterPreview.characterIds.map((characterId) => {
              const checkboxId = `roster-selected-${characterId}`;
              const label = characterName(characterId);
              return rosterRow({
                characterId,
                checkboxId,
                checkboxLabel: `Roster seleccionado ${label}`,
                selected: true,
                opacityClassName: 'opacity-75'
              });
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">Seleccionados: {selectedCharacters.length}</Badge>
          {hasRosterChanges ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Reiniciar
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reiniciar roster</AlertDialogTitle>
                  <AlertDialogDescription>
                    Perderas los cambios hechos al roster.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetRosterEdits}>Reiniciar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
