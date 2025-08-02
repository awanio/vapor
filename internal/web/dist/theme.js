export class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.STORAGE_KEY = 'vapor-theme';
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }
        else {
            this.currentTheme = this.getSystemTheme();
        }
        this.applyTheme(this.currentTheme);
    }
    static getInstance() {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    getTheme() {
        return this.currentTheme;
    }
    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    }
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        }
        else {
            root.classList.add('dark');
            root.classList.remove('light');
        }
    }
}
export const theme = ThemeManager.getInstance();
//# sourceMappingURL=theme.js.map