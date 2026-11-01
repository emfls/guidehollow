export type ThemeChoice = 'dark' | 'light';

/** Explicit choices override system colors; no storage or browser APIs needed. */
export function effectiveTheme(preference: string | undefined, prefersDark: boolean): ThemeChoice {
  if (preference === 'dark' || preference === 'light') return preference;
  return prefersDark ? 'dark' : 'light';
}

export function oppositeTheme(theme: ThemeChoice): ThemeChoice {
  return theme === 'dark' ? 'light' : 'dark';
}

/** This describes the next action, never the theme that was just activated. */
export function themeActionLabel(theme: ThemeChoice): string {
  return 'Switch to ' + oppositeTheme(theme) + ' theme';
}
