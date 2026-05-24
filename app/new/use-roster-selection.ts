import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildRosterFromMovieSelection,
  listFranchiseMovies,
  type NormalizeFranchiseCatalogResult
} from '@/lib/domain/franchise-catalog';
import {
  deriveCatalogSelectionFromRoster,
  getSetupRosterPreview,
  pruneSelectedCharacters
} from '@/lib/match-ux';

type UseRosterSelectionArgs = {
  catalogResult: NormalizeFranchiseCatalogResult;
  selectedCharacters: string[];
  setSelectedCharacters: React.Dispatch<React.SetStateAction<string[]>>;
};

export type UseRosterSelectionResult = {
  selectedFranchiseId: string | null;
  selectedMovieIds: string[];
  franchiseOptions: NormalizeFranchiseCatalogResult['catalog']['franchises'];
  moviesForSelectedFranchise: ReturnType<typeof listFranchiseMovies>;
  selectableCharacters: NormalizeFranchiseCatalogResult['catalog']['characters'];
  setupRosterPreview: ReturnType<typeof getSetupRosterPreview>;
  hasEmptySelectionState: boolean;
  isCatalogEmpty: boolean;
  selectableCharacterIdSet: Set<string>;
  hasDuplicateDisplayNames: Map<string, number>;
  onSelectFranchise: (franchiseId: string) => void;
  toggleMovie: (movieId: string) => void;
  generateRosterFromSelection: () => string[];
  toggleCharacter: (characterId: string) => void;
  toggleAllCharacters: () => void;
  setSelectionFromRoster: (rosterCharacterIds: string[]) => void;
  resetSelection: () => void;
};

export function useRosterSelection({
  catalogResult,
  selectedCharacters,
  setSelectedCharacters
}: UseRosterSelectionArgs): UseRosterSelectionResult {
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null);
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);

  const catalogCharacters = catalogResult.catalog.characters;
  const franchiseOptions = catalogResult.catalog.franchises;
  const isCatalogEmpty = catalogCharacters.length === 0;

  const moviesForSelectedFranchise = useMemo(
    () =>
      selectedFranchiseId
        ? listFranchiseMovies(catalogResult.catalog, selectedFranchiseId)
        : [],
    [catalogResult.catalog, selectedFranchiseId]
  );
  const selectedMovieIdSet = useMemo(() => new Set(selectedMovieIds), [selectedMovieIds]);

  const selectableCharacters = useMemo(
    () =>
      selectedFranchiseId
        ? catalogCharacters.filter(
            (character) =>
              character.franchise_id === selectedFranchiseId &&
              selectedMovieIdSet.has(character.movie_id)
          )
        : [],
    [catalogCharacters, selectedFranchiseId, selectedMovieIdSet]
  );

  const selectableCharacterIdSet = useMemo(
    () => new Set(selectableCharacters.map((character) => character.character_key)),
    [selectableCharacters]
  );

  const hasCatalogSelection = Boolean(selectedFranchiseId) && selectedMovieIds.length > 0;
  const hasRosterSelection = selectedCharacters.length > 0;
  const hasEmptySelectionState = !hasCatalogSelection && !hasRosterSelection;

  const setupRosterPreview = useMemo(
    () =>
      getSetupRosterPreview({
        hasCatalogSelection,
        selectedCharacterIds: selectedCharacters,
        selectableCharacterIds: selectableCharacters.map((character) => character.character_key)
      }),
    [hasCatalogSelection, selectableCharacters, selectedCharacters]
  );

  const hasDuplicateDisplayNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const character of catalogCharacters) {
      counts.set(character.display_name, (counts.get(character.display_name) ?? 0) + 1);
    }
    return counts;
  }, [catalogCharacters]);

  useEffect(() => {
    if (!selectedFranchiseId) {
      return;
    }

    setSelectedCharacters((previous) => {
      const next = pruneSelectedCharacters(previous, selectableCharacterIdSet);
      return next.length === previous.length ? previous : next;
    });
  }, [selectableCharacterIdSet, selectedFranchiseId, setSelectedCharacters]);

  useEffect(() => {
    if (!selectedFranchiseId) {
      return;
    }

    if (!franchiseOptions.some((franchise) => franchise.franchise_id === selectedFranchiseId)) {
      setSelectedFranchiseId(null);
      setSelectedMovieIds([]);
      return;
    }

    const validMovieIds = new Set(moviesForSelectedFranchise.map((movie) => movie.movie_id));
    setSelectedMovieIds((previous) => previous.filter((movieId) => validMovieIds.has(movieId)));
  }, [franchiseOptions, moviesForSelectedFranchise, selectedFranchiseId]);

  const onSelectFranchise = useCallback((franchiseId: string) => {
    setSelectedFranchiseId(franchiseId);
    setSelectedMovieIds([]);
    setSelectedCharacters([]);
  }, [setSelectedCharacters]);

  const toggleMovie = useCallback((movieId: string) => {
    setSelectedMovieIds((previous) => {
      if (previous.includes(movieId)) {
        return previous.filter((id) => id !== movieId);
      }

      const movieCharacterIds = catalogCharacters
        .filter(
          (character) =>
            character.franchise_id === selectedFranchiseId && character.movie_id === movieId
        )
        .map((character) => character.character_key);

      setSelectedCharacters((current) => Array.from(new Set([...current, ...movieCharacterIds])));
      return [...previous, movieId];
    });
  }, [catalogCharacters, selectedFranchiseId, setSelectedCharacters]);

  const generateRosterFromSelection = useCallback(() => {
    const roster = buildRosterFromMovieSelection(
      catalogResult.catalog,
      selectedFranchiseId,
      selectedMovieIds
    );
    setSelectedCharacters(roster);
    return roster;
  }, [catalogResult.catalog, selectedFranchiseId, selectedMovieIds, setSelectedCharacters]);

  const toggleCharacter = useCallback((characterId: string) => {
    if (!selectableCharacterIdSet.has(characterId)) {
      return;
    }

    setSelectedCharacters((previous) => {
      if (previous.includes(characterId)) {
        return previous.filter((id) => id !== characterId);
      }

      return [...previous, characterId];
    });
  }, [selectableCharacterIdSet, setSelectedCharacters]);

  const toggleAllCharacters = useCallback(() => {
    const selectableIds = selectableCharacters.map((character) => character.character_key);
    if (selectableIds.length === 0) {
      return;
    }

    setSelectedCharacters((previous) => {
      const selectedSet = new Set(previous);
      const hasSelectedAll = selectableIds.every((characterId) => selectedSet.has(characterId));

      if (hasSelectedAll) {
        const selectableIdSet = new Set(selectableIds);
        return previous.filter((characterId) => !selectableIdSet.has(characterId));
      }

      return Array.from(new Set([...previous, ...selectableIds]));
    });
  }, [selectableCharacters, setSelectedCharacters]);

  const setSelectionFromRoster = useCallback((rosterCharacterIds: string[]) => {
    const nextSelection = deriveCatalogSelectionFromRoster(rosterCharacterIds, catalogCharacters);
    setSelectedFranchiseId(nextSelection.selectedFranchiseId);
    setSelectedMovieIds(nextSelection.selectedMovieIds);
  }, [catalogCharacters]);

  const resetSelection = useCallback(() => {
    setSelectedFranchiseId(null);
    setSelectedMovieIds([]);
    setSelectedCharacters([]);
  }, [setSelectedCharacters]);

  return {
    selectedFranchiseId,
    selectedMovieIds,
    franchiseOptions,
    moviesForSelectedFranchise,
    selectableCharacters,
    setupRosterPreview,
    hasEmptySelectionState,
    isCatalogEmpty,
    selectableCharacterIdSet,
    hasDuplicateDisplayNames,
    onSelectFranchise,
    toggleMovie,
    generateRosterFromSelection,
    toggleCharacter,
    toggleAllCharacters,
    setSelectionFromRoster,
    resetSelection
  };
}
