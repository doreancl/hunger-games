import { franchiseCatalogSchema } from '@/lib/domain/schemas';
import type { FranchiseCatalog, FranchiseCharacter } from '@/lib/domain/types';

export type FranchiseMovie = {
  movie_id: string;
  movie_title: string;
  franchise_id: string;
  franchise_name: string;
};

export const DEFAULT_FRANCHISE_CATALOG_SOURCE: FranchiseCatalog = {
  version: 1,
  franchises: [
    {
      franchise_id: 'sw',
      franchise_name: 'Star Wars'
    },
    {
      franchise_id: 'mcu',
      franchise_name: 'Marvel Cinematic Universe'
    },
    {
      franchise_id: 'hp',
      franchise_name: 'Harry Potter'
    }
  ],
  characters: [
    { character_key: 'sw-luke', display_name: 'Luke Skywalker', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-leia', display_name: 'Leia Organa', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-han', display_name: 'Han Solo', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-vader', display_name: 'Darth Vader', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-r2d2', display_name: 'R2-D2', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-c3po', display_name: 'C-3PO', franchise_id: 'sw', movie_id: 'sw-anh', movie_title: 'A New Hope' },
    { character_key: 'sw-yoda', display_name: 'Yoda', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'sw-lando', display_name: 'Lando Calrissian', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'sw-boba', display_name: 'Boba Fett', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'sw-chewie', display_name: 'Chewbacca', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'sw-piett', display_name: 'Admiral Piett', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'sw-ig88', display_name: 'IG-88', franchise_id: 'sw', movie_id: 'sw-esb', movie_title: 'The Empire Strikes Back' },
    { character_key: 'mcu-tony', display_name: 'Tony Stark', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-steve', display_name: 'Steve Rogers', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-thor', display_name: 'Thor', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-natasha', display_name: 'Natasha Romanoff', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-clint', display_name: 'Clint Barton', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-hulk', display_name: 'Bruce Banner', franchise_id: 'mcu', movie_id: 'mcu-avengers', movie_title: 'The Avengers' },
    { character_key: 'mcu-peter', display_name: 'Peter Parker', franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'mcu-tchalla', display_name: "T'Challa", franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'mcu-wanda', display_name: 'Wanda Maximoff', franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'mcu-sam', display_name: 'Sam Wilson', franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'mcu-bucky', display_name: 'Bucky Barnes', franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'mcu-vision', display_name: 'Vision', franchise_id: 'mcu', movie_id: 'mcu-civil-war', movie_title: 'Captain America: Civil War' },
    { character_key: 'hp-harry', display_name: 'Harry Potter', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-hermione', display_name: 'Hermione Granger', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-ron', display_name: 'Ron Weasley', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-dumbledore', display_name: 'Albus Dumbledore', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-snape', display_name: 'Severus Snape', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-draco', display_name: 'Draco Malfoy', franchise_id: 'hp', movie_id: 'hp-ss', movie_title: "Harry Potter and the Sorcerer's Stone" },
    { character_key: 'hp-neville', display_name: 'Neville Longbottom', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' },
    { character_key: 'hp-luna', display_name: 'Luna Lovegood', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' },
    { character_key: 'hp-minerva', display_name: 'Minerva McGonagall', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' },
    { character_key: 'hp-molly', display_name: 'Molly Weasley', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' },
    { character_key: 'hp-voldemort', display_name: 'Lord Voldemort', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' },
    { character_key: 'hp-bellatrix', display_name: 'Bellatrix Lestrange', franchise_id: 'hp', movie_id: 'hp-dh2', movie_title: 'Harry Potter and the Deathly Hallows: Part 2' }
  ]
};

export type FranchiseCatalogDiagnostics = {
  duplicate_character_key_count: number;
  dropped_character_count: number;
  invalid_entry_count: number;
  invalid_version_count: number;
};

export type NormalizeFranchiseCatalogResult = {
  catalog: FranchiseCatalog;
  diagnostics: FranchiseCatalogDiagnostics;
};

function emptyCatalog(): FranchiseCatalog {
  return {
    version: 1,
    franchises: [],
    characters: []
  };
}

export function normalizeFranchiseCatalog(input: unknown): NormalizeFranchiseCatalogResult {
  const parsedInput = franchiseCatalogSchema.safeParse(input);
  if (parsedInput.success) {
    return {
      catalog: parsedInput.data,
      diagnostics: {
        duplicate_character_key_count: 0,
        dropped_character_count: 0,
        invalid_entry_count: 0,
        invalid_version_count: 0
      }
    };
  }

  if (!input || typeof input !== 'object') {
    return {
      catalog: emptyCatalog(),
      diagnostics: {
        duplicate_character_key_count: 0,
        dropped_character_count: 0,
        invalid_entry_count: 1,
        invalid_version_count: 0
      }
    };
  }

  const raw = input as {
    version?: unknown;
    franchises?: unknown;
    characters?: unknown;
  };

  const franchises = Array.isArray(raw.franchises) ? raw.franchises : [];
  const franchiseIds = new Set<string>();
  const safeFranchises = franchises
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const candidate = entry as { franchise_id?: unknown; franchise_name?: unknown };
      if (typeof candidate.franchise_id !== 'string' || typeof candidate.franchise_name !== 'string') {
        return null;
      }
      const franchise_id = candidate.franchise_id.trim();
      const franchise_name = candidate.franchise_name.trim();
      if (franchise_id.length === 0 || franchise_name.length === 0 || franchiseIds.has(franchise_id)) {
        return null;
      }
      franchiseIds.add(franchise_id);
      return { franchise_id, franchise_name };
    })
    .filter((entry): entry is FranchiseCatalog['franchises'][number] => entry !== null);

  const characters = Array.isArray(raw.characters) ? raw.characters : [];
  const characterKeys = new Set<string>();
  let duplicateCharacterKeyCount = 0;
  let invalidEntryCount = 0;
  const invalidVersionCount = raw.version === 1 ? 0 : 1;
  const safeCharacters: FranchiseCharacter[] = [];

  for (const entry of characters) {
    if (!entry || typeof entry !== 'object') {
      invalidEntryCount += 1;
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const character_key =
      typeof candidate.character_key === 'string' ? candidate.character_key.trim() : '';
    const display_name =
      typeof candidate.display_name === 'string' ? candidate.display_name.trim() : '';
    const franchise_id =
      typeof candidate.franchise_id === 'string' ? candidate.franchise_id.trim() : '';
    const movie_id = typeof candidate.movie_id === 'string' ? candidate.movie_id.trim() : '';
    const movie_title =
      typeof candidate.movie_title === 'string' ? candidate.movie_title.trim() : '';

    if (
      character_key.length === 0 ||
      display_name.length === 0 ||
      franchise_id.length === 0 ||
      movie_id.length === 0 ||
      movie_title.length === 0
    ) {
      invalidEntryCount += 1;
      continue;
    }

    if (!franchiseIds.has(franchise_id)) {
      invalidEntryCount += 1;
      continue;
    }

    if (characterKeys.has(character_key)) {
      duplicateCharacterKeyCount += 1;
      continue;
    }

    characterKeys.add(character_key);
    safeCharacters.push({
      character_key,
      display_name,
      franchise_id,
      movie_id,
      movie_title,
      aliases: Array.isArray(candidate.aliases)
        ? candidate.aliases.filter((alias): alias is string => typeof alias === 'string').map((alias) => alias.trim()).filter((alias) => alias.length > 0)
        : undefined
    });
  }

  const normalized = {
    version: raw.version === 1 ? 1 : 1,
    franchises: safeFranchises,
    characters: safeCharacters
  } as const;

  const parsedNormalized = franchiseCatalogSchema.safeParse(normalized);
  const droppedCharacterCount = Math.max(0, characters.length - safeCharacters.length);
  if (!parsedNormalized.success) {
    return {
      catalog: emptyCatalog(),
      diagnostics: {
        duplicate_character_key_count: duplicateCharacterKeyCount,
        dropped_character_count: droppedCharacterCount,
        invalid_entry_count: invalidEntryCount + 1,
        invalid_version_count: invalidVersionCount
      }
    };
  }

  return {
    catalog: parsedNormalized.data,
    diagnostics: {
      duplicate_character_key_count: duplicateCharacterKeyCount,
      dropped_character_count: droppedCharacterCount,
      invalid_entry_count: invalidEntryCount,
      invalid_version_count: invalidVersionCount
    }
  };
}

export function buildCharacterLabel(
  character: Pick<FranchiseCharacter, 'display_name' | 'movie_title'>,
  hasNameCollision: boolean
): string {
  if (!hasNameCollision) {
    return character.display_name;
  }

  return `${character.display_name} · ${character.movie_title}`;
}

export function listFranchiseMovies(
  catalog: FranchiseCatalog,
  franchiseId: string
): FranchiseMovie[] {
  const franchise = catalog.franchises.find((entry) => entry.franchise_id === franchiseId);
  if (!franchise) {
    return [];
  }

  const byMovieId = new Map<string, FranchiseMovie>();
  for (const character of catalog.characters) {
    if (character.franchise_id !== franchiseId || byMovieId.has(character.movie_id)) {
      continue;
    }
    byMovieId.set(character.movie_id, {
      movie_id: character.movie_id,
      movie_title: character.movie_title,
      franchise_id: franchise.franchise_id,
      franchise_name: franchise.franchise_name
    });
  }

  return [...byMovieId.values()].sort((left, right) =>
    left.movie_title.localeCompare(right.movie_title)
  );
}

export function buildRosterFromMovieSelection(
  catalog: FranchiseCatalog,
  franchiseId: string | null,
  movieIds: string[]
): string[] {
  if (!franchiseId || movieIds.length === 0) {
    return [];
  }

  const selectedMovieIds = new Set(movieIds);
  const seenCharacterIds = new Set<string>();
  const roster: string[] = [];

  for (const character of catalog.characters) {
    if (character.franchise_id !== franchiseId) {
      continue;
    }
    if (!selectedMovieIds.has(character.movie_id)) {
      continue;
    }
    if (seenCharacterIds.has(character.character_key)) {
      continue;
    }

    seenCharacterIds.add(character.character_key);
    roster.push(character.character_key);
  }

  return roster;
}
