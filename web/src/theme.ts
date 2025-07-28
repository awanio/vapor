export type Theme = 'dark' | 'light';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = 'dark';
  private readonly STORAGE_KEY = 'vapor-theme';

  private constructor() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme;
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Default to dark theme or system preference
      this.currentTheme = this.getSystemTheme();
    }
    this.applyTheme(this.currentTheme);
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private getSystemTheme(): Theme {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme;
    this.applyTheme(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }
}

export const theme = ThemeManager.getInstance();
