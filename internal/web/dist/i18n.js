class I18n {
    constructor() {
        this.locale = 'en';
        this.translations = new Map();
        this.listeners = new Set();
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale && this.isValidLocale(savedLocale)) {
            this.locale = savedLocale;
        }
        else {
            const browserLang = navigator.language.split('-')[0];
            if (this.isValidLocale(browserLang)) {
                this.locale = browserLang;
            }
        }
    }
    isValidLocale(locale) {
        return locale === 'en' || locale === 'id';
    }
    async loadTranslations(locale) {
        if (this.translations.has(locale)) {
            return;
        }
        try {
            const isDev = import.meta.env.DEV;
            const basePath = isDev ? '/src/locales' : '/locales';
            const response = await fetch(`${basePath}/${locale}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const translations = await response.json();
            this.translations.set(locale, translations);
            console.log(`Loaded translations for locale ${locale}`);
        }
        catch (error) {
            console.error(`Failed to load translations for locale ${locale}:`, error);
            try {
                const fallbackPath = `/locales/${locale}.json`;
                const fallbackResponse = await fetch(fallbackPath);
                if (fallbackResponse.ok) {
                    const translations = await fallbackResponse.json();
                    this.translations.set(locale, translations);
                    console.log(`Loaded translations for locale ${locale} from fallback path`);
                }
            }
            catch (fallbackError) {
                console.error(`Fallback also failed for locale ${locale}:`, fallbackError);
            }
        }
    }
    async setLocale(locale) {
        if (this.locale !== locale) {
            await this.loadTranslations(locale);
            this.locale = locale;
            localStorage.setItem('locale', locale);
            this.notifyListeners();
            document.documentElement.lang = locale;
        }
    }
    getLocale() {
        return this.locale;
    }
    t(key, params) {
        const translations = this.translations.get(this.locale);
        if (!translations) {
            return key;
        }
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            if (typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                return key;
            }
        }
        if (typeof value !== 'string') {
            return key;
        }
        if (params) {
            return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
                return paramKey in params ? String(params[paramKey]) : match;
            });
        }
        return value;
    }
    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
    async init() {
        await Promise.all([
            this.loadTranslations('en'),
            this.loadTranslations(this.locale)
        ]);
    }
}
export const i18n = new I18n();
export function t(key, params) {
    return i18n.t(key, params);
}
//# sourceMappingURL=i18n.js.map