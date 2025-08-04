export type Locale = 'en' | 'id';
declare class I18n {
    private locale;
    private translations;
    private listeners;
    constructor();
    private isValidLocale;
    loadTranslations(locale: Locale): Promise<void>;
    setLocale(locale: Locale): Promise<void>;
    getLocale(): Locale;
    t(key: string, params?: Record<string, any>): string;
    onChange(listener: () => void): () => void;
    private notifyListeners;
    init(): Promise<void>;
}
export declare const i18n: I18n;
export declare function t(key: string, params?: Record<string, any>): string;
export {};
//# sourceMappingURL=i18n.d.ts.map