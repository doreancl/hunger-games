import { z } from 'zod';

export const LOCAL_PREFS_STORAGE_KEY = 'hunger-games.local-prefs.v1';

export type LocalPrefs = {
  autosave_enabled: boolean;
};

const localPrefsSchema = z
  .object({
    autosave_enabled: z.boolean()
  })
  .strict();

export function defaultLocalPrefs(): LocalPrefs {
  return {
    autosave_enabled: true
  };
}

export function loadLocalPrefsFromStorage(storage: Pick<Storage, 'getItem'>): LocalPrefs {
  try {
    const raw = storage.getItem(LOCAL_PREFS_STORAGE_KEY);
    if (raw === null) {
      return defaultLocalPrefs();
    }
    const parsed = localPrefsSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      return defaultLocalPrefs();
    }
    return parsed.data;
  } catch {
    return defaultLocalPrefs();
  }
}

export function saveLocalPrefsToStorage(
  storage: Pick<Storage, 'setItem'>,
  prefs: LocalPrefs
): { ok: boolean } {
  try {
    storage.setItem(LOCAL_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
