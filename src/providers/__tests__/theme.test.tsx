import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, THEME_OPTIONS } from '../ThemeProvider';

function TestThemeConsumer() {
  const { theme, setTheme, cycleTheme, themeMeta } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="theme-name">{themeMeta.name}</span>
      <button data-testid="btn-midnight" onClick={() => setTheme('midnight')}>
        Set Midnight
      </button>
      <button data-testid="btn-forest" onClick={() => setTheme('forest')}>
        Set Forest
      </button>
      <button data-testid="btn-cycle" onClick={cycleTheme}>
        Cycle Theme
      </button>
    </div>
  );
}

describe('ThemeProvider & Sanctuary Themes', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('provides Warm Parchment as default theme', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('parchment');
    expect(screen.getByTestId('theme-name').textContent).toBe('Warm Parchment');
    expect(document.documentElement.getAttribute('data-theme')).toBe('parchment');
  });

  it('restores theme from localStorage if valid', () => {
    localStorage.setItem('deony-theme', 'midnight');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('midnight');
    expect(screen.getByTestId('theme-name').textContent).toBe('Midnight OLED');
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');
  });

  it('switches theme and persists to localStorage and documentElement', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('btn-midnight').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('midnight');
    expect(localStorage.getItem('deony-theme')).toBe('midnight');
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');

    act(() => {
      screen.getByTestId('btn-forest').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('forest');
    expect(localStorage.getItem('deony-theme')).toBe('forest');
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');
  });

  it('cycles through all three themes in sequence', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    // Initial: parchment
    expect(screen.getByTestId('current-theme').textContent).toBe('parchment');

    // Cycle 1: parchment -> midnight
    act(() => {
      screen.getByTestId('btn-cycle').click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('midnight');

    // Cycle 2: midnight -> forest
    act(() => {
      screen.getByTestId('btn-cycle').click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('forest');

    // Cycle 3: forest -> parchment
    act(() => {
      screen.getByTestId('btn-cycle').click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('parchment');
  });

  it('contains valid THEME_OPTIONS metadata for all three themes', () => {
    expect(THEME_OPTIONS).toHaveLength(3);
    const themeIds = THEME_OPTIONS.map((t) => t.id);
    expect(themeIds).toEqual(['parchment', 'midnight', 'forest']);

    THEME_OPTIONS.forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.previewColors.bg).toMatch(/^#/);
      expect(t.previewColors.surface).toMatch(/^#/);
      expect(t.previewColors.primary).toMatch(/^#/);
      expect(t.previewColors.accent).toMatch(/^#/);
    });
  });
});
