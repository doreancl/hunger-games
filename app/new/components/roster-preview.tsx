import styles from '../page.module.css';
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
    <div>
      <strong>3) Roster generado</strong>
      {hasEmptySelectionState ? (
        <p>Selecciona franquicia y peliculas para empezar.</p>
      ) : setupRosterPreview.mode === 'empty' ? (
        <p>No hay personajes para las peliculas seleccionadas.</p>
      ) : setupRosterPreview.mode === 'catalog' ? (
        <div className={styles.movieGrid}>
          {selectableCharacters.map((character) => {
            const checkboxId = `roster-${character.character_key}`;
            const hasNameCollision =
              (hasDuplicateDisplayNames.get(character.display_name) ?? 0) > 1;
            const label = buildCharacterLabel(character, hasNameCollision);
            return (
              <label key={character.character_key} htmlFor={checkboxId} className={styles.characterToggle}>
                <input
                  id={checkboxId}
                  aria-label={`Seleccionar ${label}`}
                  type="checkbox"
                  checked={selectedCharacters.includes(character.character_key)}
                  onChange={() => toggleCharacter(character.character_key)}
                />
                {label}
              </label>
            );
          })}
        </div>
      ) : (
        <div className={styles.movieGrid}>
          {setupRosterPreview.characterIds.map((characterId) => {
            const checkboxId = `roster-selected-${characterId}`;
            const label = characterName(characterId);
            return (
              <label key={characterId} htmlFor={checkboxId} className={styles.characterToggle}>
                <input
                  id={checkboxId}
                  aria-label={`Roster seleccionado ${label}`}
                  type="checkbox"
                  checked
                  readOnly
                  disabled
                />
                {label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
