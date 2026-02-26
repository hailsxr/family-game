import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  lightShadows,
  darkShadows,
  type Colors,
  type Shadows,
} from './theme';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeContextValue {
  colors: Colors;
  shadows: Shadows;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  shadows: lightShadows,
  isDark: false,
  preference: 'auto',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('auto');

  const isDark =
    preference === 'dark' ||
    (preference === 'auto' && systemScheme === 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      shadows: isDark ? darkShadows : lightShadows,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useColors(): Colors {
  return useContext(ThemeContext).colors;
}

export function useShadows(): Shadows {
  return useContext(ThemeContext).shadows;
}

export function useThemePreference() {
  const { preference, setPreference, isDark } = useContext(ThemeContext);
  return { preference, setPreference, isDark };
}
