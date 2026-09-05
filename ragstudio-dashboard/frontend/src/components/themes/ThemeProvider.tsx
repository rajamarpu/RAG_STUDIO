import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: Theme;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'rag-theme';
const TRANSITION_DURATION = 400;

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && ['light', 'dark'].includes(stored)) {
    return stored as Theme;
  }
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() || getSystemTheme());
  const [resolvedTheme, setResolvedTheme] = useState<Theme>(() => getStoredTheme() || getSystemTheme());
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const stored = getStoredTheme();
      if (!stored) {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        setThemeState(systemTheme);
        setResolvedTheme(systemTheme);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    document.documentElement.classList.add('theme-transitioning');
    const remove = () => document.documentElement.classList.remove('theme-transitioning');
    if ((applyTheme as any)._t) clearTimeout((applyTheme as any)._t);
    (applyTheme as any)._t = setTimeout(remove, TRANSITION_DURATION);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setIsTransitioning(true);
    setThemeState(newTheme);
    setResolvedTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);

    setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      resolvedTheme,
      isTransitioning,
    }}>
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

// Hook for components that need to know if reduced motion is preferred
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}