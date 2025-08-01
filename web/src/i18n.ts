export type Locale = 'en' | 'id';

interface Translations {
  [key: string]: string | Translations;
}

class I18n {
  private locale: Locale = 'en';
  private translations: Map<Locale, Translations> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load saved locale preference
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && this.isValidLocale(savedLocale)) {
      this.locale = savedLocale;
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (this.isValidLocale(browserLang as Locale)) {
        this.locale = browserLang as Locale;
      }
    }
  }

  private isValidLocale(locale: string): locale is Locale {
    return locale === 'en' || locale === 'id';
  }

  async loadTranslations(locale: Locale): Promise<void> {
    if (this.translations.has(locale)) {
      return;
    }

    try {
      const response = await fetch(`/locales/${locale}.json`);
      const translations = await response.json();
      this.translations.set(locale, translations);
    } catch (error) {
      console.error(`Failed to load translations for locale ${locale}:`, error);
    }
  }

  setLocale(locale: Locale): void {
    if (this.locale !== locale) {
      this.locale = locale;
      localStorage.setItem('locale', locale);
      this.notifyListeners();
      
      // Update HTML lang attribute
      document.documentElement.lang = locale;
    }
  }

  getLocale(): Locale {
    return this.locale;
  }

  t(key: string, params?: Record<string, any>): string {
    const translations = this.translations.get(this.locale);
    if (!translations) {
      return key;
    }

    // Navigate through nested keys
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return paramKey in params ? String(params[paramKey]) : match;
      });
    }

    return value;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Helper method for components
  async init(): Promise<void> {
    await Promise.all([
      this.loadTranslations('en'),
      this.loadTranslations(this.locale)
    ]);
  }
}

// Create singleton instance
export const i18n = new I18n();

// Helper function for use in templates
export function t(key: string, params?: Record<string, any>): string {
  return i18n.t(key, params);
}
