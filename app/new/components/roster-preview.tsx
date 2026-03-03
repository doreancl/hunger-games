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
  hasDuplicateDisplayNames: Map<string, number>;
  toggleCharacter: (characterId: string) => void;
  characterName: (characterId: string) => string;
};

export function RosterPreview(props: RosterPreviewProps) {
  const {
    hasEmptySelectionState,
    setupRosterPreview,
    selectableCharacters,
    selectedCharacters,
    hasDuplicateDisplayNames,
    toggleCharacter,
    characterName
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">3) Roster generado</CardTitle>
      </CardHeader>
      <CardContent>
        {hasEmptySelectionState ? (
          <p className="text-sm text-muted-foreground">Selecciona franquicia y peliculas para empezar.</p>
        ) : setupRosterPreview.mode === 'empty' ? (
          <p className="text-sm text-muted-foreground">No hay personajes para las peliculas seleccionadas.</p>
        ) : setupRosterPreview.mode === 'catalog' ? (
          <div className="grid gap-2 md:grid-cols-2">
            {selectableCharacters.map((character) => {
              const checkboxId = `roster-${character.character_key}`;
              const hasNameCollision =
                (hasDuplicateDisplayNames.get(character.display_name) ?? 0) > 1;
              const label = buildCharacterLabel(character, hasNameCollision);
              return (
                <Label key={character.character_key} htmlFor={checkboxId} className="flex items-center gap-2 rounded-md border p-3">
                  <Checkbox
                    id={checkboxId}
                    aria-label={`Seleccionar ${label}`}
                    checked={selectedCharacters.includes(character.character_key)}
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
                <Label key={characterId} htmlFor={checkboxId} className="flex items-center gap-2 rounded-md border p-3 opacity-75">
                  <Checkbox
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
