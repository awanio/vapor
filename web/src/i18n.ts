export type Locale = 'en' | 'id';

interface Translations {
  [key: string]: string | Translations;
}

class I18n {
  private locale: Locale = 'en';
  private translations: Map<Locale, Translations> = new Map();
  private listeners: Set<() => void> = new Set();
  private initPromise: Promise<void> | null = null;
  private initialized = false;

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
      // In development, Vite serves files from src directory
      // In production, files should be in public/locales
      const isDev = import.meta.env.DEV;
      const basePath = isDev ? '/src/locales' : '/locales';
      const response = await fetch(`${basePath}/${locale}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const translations = await response.json();
      this.translations.set(locale, translations);
      console.log(`Loaded translations for locale ${locale}`);
    } catch (error) {
      console.error(`Failed to load translations for locale ${locale}:`, error);
      // Try fallback path if primary fails
      try {
        const fallbackPath = `/locales/${locale}.json`;
        const fallbackResponse = await fetch(fallbackPath);
        if (fallbackResponse.ok) {
          const translations = await fallbackResponse.json();
          this.translations.set(locale, translations);
          console.log(`Loaded translations for locale ${locale} from fallback path`);
        }
      } catch (fallbackError) {
        console.error(`Fallback also failed for locale ${locale}:`, fallbackError);
      }
    }
  }

  async setLocale(locale: Locale): Promise<void> {
    if (this.locale !== locale) {
      // Load the translation file for the new locale
      await this.loadTranslations(locale);
      
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
      console.warn(`No translations loaded for locale: ${this.locale}, key: ${key}`);
      return key;
    }

    // Navigate through nested keys
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} in locale: ${this.locale}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string for key: ${key}, got:`, value);
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
    // If already initializing or initialized, return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }
    
    if (this.initialized) {
      return Promise.resolve();
    }
    
    // Create and store the initialization promise
    this.initPromise = Promise.all([
      this.loadTranslations('en'),
      this.loadTranslations(this.locale)
    ]).then(() => {
      this.initialized = true;
      console.log('i18n fully initialized with translations');
    });
    
    return this.initPromise;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
export const i18n = new I18n();

// Helper function for use in templates
export function t(key: string, params?: Record<string, any>): string {
  return i18n.t(key, params);
}
