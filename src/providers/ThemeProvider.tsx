import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'parchment' | 'midnight' | 'forest';

export interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  previewColors: {
    bg: string;
    surface: string;
    primary: string;
    accent: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'parchment',
    name: 'Warm Parchment',
    description: 'Classic warm archival tones inspired by antique paper and ink.',
    previewColors: {
      bg: '#fff8f5',
      surface: '#f5ece8',
      primary: '#114349',
      accent: '#2d5a61',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    description: 'Deep onyx darkness with luminous teal accents for late-night reflection.',
    previewColors: {
      bg: '#0a0c10',
      surface: '#151a24',
      primary: '#2dd4bf',
      accent: '#38bdf8',
    },
  },
  {
    id: 'forest',
    name: 'Dark Forest',
    description: 'Enigmatic emerald pine with soft antique sage accents.',
    previewColors: {
      bg: '#08120e',
      surface: '#12241c',
      primary: '#6ee7b7',
      accent: '#86efac',
    },
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  themeMeta: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('deony-theme') as Theme;
      if (stored === 'parchment' || stored === 'midnight' || stored === 'forest') {
        return stored;
      }
    }
    return 'parchment';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deony-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const cycleTheme = () => {
    const order: Theme[] = ['parchment', 'midnight', 'forest'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    setTheme(order[nextIdx]);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themeMeta = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themeMeta }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
