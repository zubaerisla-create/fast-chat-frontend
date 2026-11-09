'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const Ctx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({ theme: 'light', toggle: () => {}, set: () => {} });
const KEY = 'fc.theme';

/** App theme: saved choice, else the system preference. Applied as data-theme on <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const initial: Theme = saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  const set = useCallback((t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  }, []);
  const toggle = useCallback(() => set(theme === 'dark' ? 'light' : 'dark'), [theme, set]);
  return <Ctx.Provider value={{ theme, toggle, set }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
