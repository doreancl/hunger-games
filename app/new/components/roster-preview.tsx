import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { buildCharacterLabel } from '@/lib/domain/franchise-catalog';
import type { FranchiseCharacter } from '@/lib/domain/types';
import type { getSetupRosterPreview } from '@/lib/match-ux';

type SetupRosterPreview = ReturnType<typeof getSetupRosterPreview>;

type RosterPreviewProps = {
  hasEmptySelectionState: boolean;
  setupRosterPreview: SetupRosterPreview;
  selectableCharacters: FranchiseCharacter[];
  selectedCharacters: string[];
  toggleCharacter: (characterId: string) => void;
  toggleAllCharacters: () => void;
  characterName: (characterId: string) => string;
};

export function RosterPreview(props: RosterPreviewProps) {
  const {
    hasEmptySelectionState,
    setupRosterPreview,
    selectableCharacters,
    selectedCharacters,
    toggleCharacter,
    toggleAllCharacters,
    characterName
  } = props;

  const selectedCharacterSet = new Set(selectedCharacters);
  const selectedSelectableCount = selectableCharacters.filter((character) =>
    selectedCharacterSet.has(character.character_key)
  ).length;
  const hasSelectableCharacters = selectableCharacters.length > 0;
  const allSelectableCharactersSelected =
    hasSelectableCharacters && selectedSelectableCount === selectableCharacters.length;
  const someSelectableCharactersSelected =
    selectedSelectableCount > 0 && selectedSelectableCount < selectableCharacters.length;

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4 px-6 py-[22px]">
        <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          3) Roster generado
        </CardTitle>
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
              return (
                <Label
                  key={character.character_key}
                  htmlFor={checkboxId}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-[12.5px]"
                >
                  <Checkbox
                    data-analytics-control="roster_character_selection"
                    id={checkboxId}
                    aria-label={`Seleccionar ${label}`}
                    checked={selectedCharacterSet.has(character.character_key)}
                    onChange={() => toggleCharacter(character.character_key)}
                  />
                  {label}
                </Label>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {setupRosterPreview.characterIds.map((characterId) => {
              const checkboxId = `roster-selected-${characterId}`;
              const label = characterName(characterId);
              return (
                <Label
                  key={characterId}
                  htmlFor={checkboxId}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-[12.5px] opacity-75"
                >
                  <Checkbox
                    data-analytics-control="roster_selected_character"
                    id={checkboxId}
                    aria-label={`Roster seleccionado ${label}`}
                    checked
                    readOnly
                    disabled
                  />
                  {label}
                </Label>
              );
            })}
          </div>
        )}
        <Badge variant="outline" className="mt-3">Seleccionados: {selectedCharacters.length}</Badge>
      </CardContent>
    </Card>
  );
}
