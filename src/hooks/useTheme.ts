import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { themes } from '../constants/theme';
import { resolvedThemeNameAtom, themeAtom, themeNameAtom } from '../atoms/theme';
import { Theme, ThemeName } from '../types';

export interface UseThemeResult {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  allThemes: Theme[];
}

export function useTheme(): UseThemeResult {
  const theme = useAtomValue(themeAtom);
  const themeName = useAtomValue(resolvedThemeNameAtom);
  const setThemeName = useSetAtom(themeNameAtom);

  const setTheme = useCallback(
    (name: ThemeName) => {
      setThemeName(name);
    },
    [setThemeName],
  );

  return {
    theme,
    themeName,
    setTheme,
    allThemes: Object.values(themes),
  };
}
