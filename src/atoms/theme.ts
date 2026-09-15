import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage, unwrap } from 'jotai/utils';
import { themes, DEFAULT_THEME, THEME_STORAGE_KEY } from '../constants/theme';
import { ThemeName } from '../types';

const baseStorage = createJSONStorage<ThemeName>(() => AsyncStorage);

/** Validates persisted theme name; falls back to default if corrupt or unknown. */
const themeStorage = {
  ...baseStorage,
  getItem: async (key: string, initialValue: ThemeName): Promise<ThemeName> => {
    const saved = await baseStorage.getItem(key, initialValue);
    if (saved && saved in themes) {
      return saved;
    }
    return initialValue;
  },
};

/** Persisted theme selection (AsyncStorage key: mobile-blog-theme). */
export const themeNameAtom = atomWithStorage(
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  themeStorage,
  { getOnInit: true },
);

/**
 * AsyncStorage-backed atoms resolve to `Value | Promise<Value>`.
 * unwrap + fallback keeps sync ThemeName for derived atoms and UI.
 */
export const resolvedThemeNameAtom = unwrap(themeNameAtom, () => DEFAULT_THEME);

/** Full theme object derived from resolved theme name. */
export const themeAtom = atom((get) => themes[get(resolvedThemeNameAtom)]);
