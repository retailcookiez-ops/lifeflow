import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
export type Mode = 'dark' | 'light';
const palettes = {
  dark: { bg: '#080F19', surface: '#111D2B', inset: '#0C1724', border: '#26374B', text: '#F4F7FF', muted: '#ADBDD2', faint: '#8295AD', teal: '#62E4D1', purple: '#BB88FA', blue: '#5BCBF4', amber: '#F8C475', active: '#173B3C', error: '#FF9C9C', buttonText: '#062A2B' },
  light: { bg: '#F4F8FD', surface: '#FFFFFF', inset: '#EDF3FA', border: '#DCE5F0', text: '#12213E', muted: '#536985', faint: '#627995', teal: '#00877F', purple: '#7B3FCC', blue: '#087EAC', amber: '#A7600C', active: '#DCFAF4', error: '#B52E45', buttonText: '#FFFFFF' },
};
export type Palette = typeof palettes.dark;
const ThemeContext = createContext<ReturnType<typeof useThemeState> | null>(null);
function useThemeState() {
  const [mode, setMode] = useState<Mode>('dark');
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0); const writes = useRef(Promise.resolve());
  useEffect(() => { let mounted = true; const initial = revision.current;
    AsyncStorage.getItem('lifeflow:theme').then(value => { if (mounted && revision.current === initial && (value === 'light' || value === 'dark')) setMode(value); }).catch(() => { if (mounted) setError('Could not restore appearance. Choose your theme again.'); });
    return () => { mounted = false; };
  }, []);
  const choose = useCallback((next: Mode) => {
    const id = ++revision.current; setMode(next); setError(null);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem('lifeflow:theme', next)).catch(() => { if (revision.current === id) setError('Theme changed for this session, but could not be saved. Please try again.'); });
  }, []);
  const colors = palettes[mode];
  const color = useCallback((value: string) => {
    const map: Record<string, string> = {
      '#0C1015': colors.bg, '#10161D': colors.inset, '#111820': colors.surface, '#171E27': colors.surface,
      '#202A35': colors.inset, '#28323D': colors.border, '#344150': colors.border, '#394551': colors.border,
      '#F4F7FA': colors.text, '#C2CAD4': colors.muted, '#9CA8B5': colors.muted, '#82909F': colors.faint,
      '#65717F': colors.faint, '#647180': colors.faint, '#8BE9C0': colors.teal, '#20382F': colors.active,
      '#FF9C9C': colors.error, '#F3CE83': colors.amber, '#397E63': colors.teal, '#062A2B': colors.buttonText,
    }; return map[value.toUpperCase()] ?? value;
  }, [colors]);
  return { mode, colors, color, choose, error };
}
export function AppThemeProvider({ children }: { children: ReactNode }) { const value = useThemeState(); return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>; }
export function useAppTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('AppThemeProvider missing'); return value; }
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(styles: T): T {
  const { color } = useAppTheme();
  return useMemo(() => Object.fromEntries(Object.entries(styles).map(([name, style]) => [name, Object.fromEntries(Object.entries(StyleSheet.flatten(style as Record<string, unknown>) as Record<string, unknown>).map(([key, value]) => [key, typeof value === 'string' ? color(value) : value]))])) as unknown as T, [styles, color]);
}
