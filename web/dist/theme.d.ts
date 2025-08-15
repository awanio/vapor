export type Theme = 'dark' | 'light';
export declare class ThemeManager {
    private static instance;
    private currentTheme;
    private readonly STORAGE_KEY;
    private constructor();
    static getInstance(): ThemeManager;
    private getSystemTheme;
    getTheme(): Theme;
    setTheme(theme: Theme): void;
    toggleTheme(): void;
    private applyTheme;
}
export declare const theme: ThemeManager;
//# sourceMappingURL=theme.d.ts.map