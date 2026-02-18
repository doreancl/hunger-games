import { describe, expect, it } from 'vitest';
import {
  defaultLocalPrefs,
  LOCAL_PREFS_STORAGE_KEY,
  loadLocalPrefsFromStorage,
  saveLocalPrefsToStorage
} from '@/lib/local-prefs';

describe('local prefs storage', () => {
  it('returns default prefs when storage is empty', () => {
    const storage = {
      getItem() {
        return null;
      }
    };

    expect(loadLocalPrefsFromStorage(storage)).toEqual(defaultLocalPrefs());
  });

  it('saves and loads prefs', () => {
    let persisted: string | null = null;
    const storage = {
      setItem(_key: string, value: string) {
        persisted = value;
      },
      getItem(key: string) {
        if (key === LOCAL_PREFS_STORAGE_KEY) {
          return persisted;
        }
        return null;
      }
    };

    expect(saveLocalPrefsToStorage(storage, { autosave_enabled: false })).toEqual({ ok: true });
    expect(loadLocalPrefsFromStorage(storage)).toEqual({ autosave_enabled: false });
  });

  it('falls back to defaults when parse fails', () => {
    const storage = {
      getItem() {
        return '{bad-json';
      }
    };

    expect(loadLocalPrefsFromStorage(storage)).toEqual(defaultLocalPrefs());
  });
});
