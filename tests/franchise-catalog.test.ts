import { describe, expect, it } from 'vitest';
import { franchiseCatalogSchema } from '@/lib/domain/schemas';
import {
  buildCharacterLabel,
  buildRosterFromMovieSelection,
  DEFAULT_FRANCHISE_CATALOG_SOURCE,
  listFranchiseMovies,
  normalizeFranchiseCatalog
} from '@/lib/domain/franchise-catalog';

describe('franchise catalog schema', () => {
  it('accepts valid v1 catalog', () => {
    const payload = {
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        }
      ]
    };

    expect(franchiseCatalogSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects duplicated character_key', () => {
    const payload = {
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-1',
          display_name: 'Alex v2',
          franchise_id: 'f-1',
          movie_id: 'm-2',
          movie_title: 'Movie 2'
        }
      ]
    };

    expect(franchiseCatalogSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects character with missing franchise reference', () => {
    const payload = {
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'unknown',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        }
      ]
    };

    expect(franchiseCatalogSchema.safeParse(payload).success).toBe(false);
  });
});

describe('franchise catalog normalization', () => {
  it('deduplicates repeated character_key preserving first entry', () => {
    const input = {
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-1',
          display_name: 'Alex Duplicate',
          franchise_id: 'f-1',
          movie_id: 'm-2',
          movie_title: 'Movie 2'
        },
        {
          character_key: 'char-2',
          display_name: 'Sam',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        }
      ]
    };

    const result = normalizeFranchiseCatalog(input);
    expect(result.catalog.characters).toHaveLength(2);
    expect(result.catalog.characters[0].display_name).toBe('Alex');
    expect(result.diagnostics.duplicate_character_key_count).toBe(1);
    expect(result.diagnostics.invalid_version_count).toBe(0);
  });

  it('returns empty catalog when payload is invalid', () => {
    const result = normalizeFranchiseCatalog({ version: 1, franchises: 'bad', characters: [] });

    expect(result.catalog.characters).toEqual([]);
    expect(result.catalog.franchises).toEqual([]);
    expect(result.diagnostics.invalid_version_count).toBe(0);
  });

  it('counts dropped_character_count using real discarded characters', () => {
    const input = {
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-1',
          display_name: 'Alex Duplicate',
          franchise_id: 'f-1',
          movie_id: 'm-2',
          movie_title: 'Movie 2'
        },
        {
          character_key: 'char-2',
          display_name: 'Sam',
          franchise_id: 'unknown',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          display_name: 'Missing key',
          franchise_id: 'f-1',
          movie_id: 'm-3',
          movie_title: 'Movie 3'
        }
      ]
    };

    const result = normalizeFranchiseCatalog(input);

    expect(result.catalog.characters).toHaveLength(1);
    expect(result.diagnostics.dropped_character_count).toBe(3);
    expect(result.diagnostics.duplicate_character_key_count).toBe(1);
    expect(result.diagnostics.invalid_entry_count).toBe(2);
    expect(result.diagnostics.invalid_version_count).toBe(0);
  });

  it.each([
    { name: 'invalid numeric version', version: 2 },
    { name: 'non-numeric version', version: 'v2' }
  ])('reports invalid_version_count for $name', ({ version }) => {
    const input = {
      version,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        }
      ]
    };

    const result = normalizeFranchiseCatalog(input);

    expect(result.catalog.version).toBe(1);
    expect(result.catalog.characters).toHaveLength(1);
    expect(result.catalog.franchises).toHaveLength(1);
    expect(result.diagnostics.invalid_entry_count).toBe(0);
    expect(result.diagnostics.invalid_version_count).toBe(1);
  });

  it('returns empty catalog diagnostics for non-object payload', () => {
    const result = normalizeFranchiseCatalog(null);

    expect(result.catalog).toEqual({
      version: 1,
      franchises: [],
      characters: []
    });
    expect(result.diagnostics).toEqual({
      duplicate_character_key_count: 0,
      dropped_character_count: 0,
      invalid_entry_count: 1,
      invalid_version_count: 0
    });
  });

  it('sanitizes invalid franchise entries and non-array characters payloads', () => {
    const result = normalizeFranchiseCatalog({
      version: 1,
      franchises: [
        null,
        { franchise_id: '', franchise_name: 'Invalid blank id' },
        { franchise_id: 'f-1', franchise_name: 'Franchise 1' },
        { franchise_id: 'f-1', franchise_name: 'Duplicate franchise' },
        { franchise_id: 'f-2', franchise_name: 42 }
      ],
      characters: 'bad'
    });

    expect(result.catalog.franchises).toEqual([
      { franchise_id: 'f-1', franchise_name: 'Franchise 1' }
    ]);
    expect(result.catalog.characters).toEqual([]);
    expect(result.diagnostics.dropped_character_count).toBe(0);
    expect(result.diagnostics.invalid_entry_count).toBe(0);
  });

  it('counts non-object and malformed characters while sanitizing aliases', () => {
    const result = normalizeFranchiseCatalog({
      version: 1,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        123,
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1',
          aliases: ['Alias', '', 99]
        },
        {
          character_key: 'char-2',
          display_name: 999,
          franchise_id: 'f-1',
          movie_id: 'm-2',
          movie_title: 'Movie 2'
        }
      ]
    });

    expect(result.catalog.characters).toEqual([
      {
        character_key: 'char-1',
        display_name: 'Alex',
        franchise_id: 'f-1',
        movie_id: 'm-1',
        movie_title: 'Movie 1',
        aliases: ['Alias']
      }
    ]);
    expect(result.diagnostics.invalid_entry_count).toBe(2);
    expect(result.diagnostics.dropped_character_count).toBe(2);
  });
});

describe('buildCharacterLabel', () => {
  it('returns plain display name when there is no collision', () => {
    expect(
      buildCharacterLabel(
        {
          display_name: 'Alex',
          movie_title: 'Movie 1'
        },
        false
      )
    ).toBe('Alex');
  });

  it('appends movie title when display name collides', () => {
    expect(
      buildCharacterLabel(
        {
          display_name: 'Alex',
          movie_title: 'Movie 1'
        },
        true
      )
    ).toBe('Alex · Movie 1');
  });
});

describe('default catalog and selection helpers', () => {
  it('loads hardcoded catalog with popular franchises and movies', () => {
    const normalized = normalizeFranchiseCatalog(DEFAULT_FRANCHISE_CATALOG_SOURCE);

    expect(normalized.catalog.franchises.length).toBeGreaterThanOrEqual(3);
    expect(normalized.catalog.characters.length).toBeGreaterThanOrEqual(20);
    expect(normalized.catalog.franchises.some((entry) => entry.franchise_name === 'Star Wars')).toBe(
      true
    );
  });

  it('lists only movies for selected franchise', () => {
    const normalized = normalizeFranchiseCatalog(DEFAULT_FRANCHISE_CATALOG_SOURCE);
    const franchiseId = normalized.catalog.franchises[0]?.franchise_id ?? '';
    const movies = listFranchiseMovies(normalized.catalog, franchiseId);

    expect(movies.length).toBeGreaterThanOrEqual(2);
    expect(movies.every((movie) => movie.franchise_id === franchiseId)).toBe(true);
  });

  it('returns empty movie list for unknown franchise', () => {
    const normalized = normalizeFranchiseCatalog(DEFAULT_FRANCHISE_CATALOG_SOURCE);

    expect(listFranchiseMovies(normalized.catalog, 'missing')).toEqual([]);
  });

  it('generates roster only from selected movies without duplicates', () => {
    const catalog = {
      version: 1 as const,
      franchises: [{ franchise_id: 'f-1', franchise_name: 'Franchise 1' }],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-1',
          display_name: 'Alex Duplicate',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-2',
          display_name: 'Sam',
          franchise_id: 'f-1',
          movie_id: 'm-2',
          movie_title: 'Movie 2'
        },
        {
          character_key: 'char-3',
          display_name: 'Taylor',
          franchise_id: 'f-1',
          movie_id: 'm-3',
          movie_title: 'Movie 3'
        }
      ]
    };

    const normalized = normalizeFranchiseCatalog(catalog).catalog;
    const roster = buildRosterFromMovieSelection(normalized, 'f-1', ['m-1', 'm-2']);

    expect(roster).toEqual(['char-1', 'char-2']);
    expect(new Set(roster).size).toBe(roster.length);
  });

  it('returns empty roster when franchise is null or movie filter is empty', () => {
    const normalized = normalizeFranchiseCatalog(DEFAULT_FRANCHISE_CATALOG_SOURCE).catalog;

    expect(buildRosterFromMovieSelection(normalized, null, ['sw-anh'])).toEqual([]);
    expect(buildRosterFromMovieSelection(normalized, 'sw', [])).toEqual([]);
  });

  it('skips characters from other franchises and repeated keys while building roster', () => {
    const catalog = {
      version: 1 as const,
      franchises: [
        { franchise_id: 'f-1', franchise_name: 'Franchise 1' },
        { franchise_id: 'f-2', franchise_name: 'Franchise 2' }
      ],
      characters: [
        {
          character_key: 'char-1',
          display_name: 'Alex',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-1',
          display_name: 'Alex Duplicate',
          franchise_id: 'f-1',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        },
        {
          character_key: 'char-2',
          display_name: 'Casey',
          franchise_id: 'f-2',
          movie_id: 'm-1',
          movie_title: 'Movie 1'
        }
      ]
    };

    expect(buildRosterFromMovieSelection(catalog, 'f-1', ['m-1'])).toEqual(['char-1']);
  });
});
