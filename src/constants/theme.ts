import { Theme, ThemeName } from '../types';

export const themes: Record<ThemeName, Theme> = {
  'dark-green': {
    name: 'dark-green',
    label: 'Dark Green',
    colors: {
      background: '#022c22',
      foreground: '#ecfdf5',
      card: '#022c22',
      cardForeground: '#ecfdf5',
      primary: '#22c55e',
      primaryForeground: '#022c22',
      secondary: '#14532d',
      secondaryForeground: '#ecfdf5',
      muted: '#14532d',
      mutedForeground: '#bbf7d0',
      accent: '#22c55e',
      accentForeground: '#022c22',
      destructive: '#f97373',
      destructiveForeground: '#ffffff',
      border: '#14532d',
      input: '#14532d',
      ring: '#22c55e',
    },
  },
  'dark-teal': {
    name: 'dark-teal',
    label: 'Dark Teal',
    colors: {
      background: '#0f2030',
      foreground: '#e8f8fc',
      card: '#152535',
      cardForeground: '#e8f8fc',
      primary: '#2dd4bf',
      primaryForeground: '#0a1a22',
      secondary: '#1a3040',
      secondaryForeground: '#e8f8fc',
      muted: '#162c3a',
      mutedForeground: '#7bb8c4',
      accent: '#14b8a6',
      accentForeground: '#ffffff',
      destructive: '#f97316',
      destructiveForeground: '#ffffff',
      border: '#1c3545',
      input: '#1c3545',
      ring: '#5eead4',
    },
  },
  'light-neutral': {
    name: 'light-neutral',
    label: 'Light',
    colors: {
      background: '#ffffff',
      foreground: '#111827',
      card: '#ffffff',
      cardForeground: '#111827',
      primary: '#1f2937',
      primaryForeground: '#f9fafb',
      secondary: '#f3f4f6',
      secondaryForeground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      accent: '#f3f4f6',
      accentForeground: '#1f2937',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e5e7eb',
      input: '#e5e7eb',
      ring: '#9ca3af',
    },
  },
};

export const DEFAULT_THEME: ThemeName = 'dark-green';
export const THEME_STORAGE_KEY = 'mobile-blog-theme';

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  '2xl': 18,
  '3xl': 22,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};
