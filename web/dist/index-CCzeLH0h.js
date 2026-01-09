(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
class I18n {
  constructor() {
    this.locale = "en";
    this.translations = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
    this.initPromise = null;
    this.initialized = false;
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && this.isValidLocale(savedLocale)) {
      this.locale = savedLocale;
    } else {
      const browserLang = navigator.language.split("-")[0];
      if (this.isValidLocale(browserLang)) {
        this.locale = browserLang;
      }
    }
  }
  isValidLocale(locale) {
    return locale === "en" || locale === "id";
  }
  async loadTranslations(locale) {
    if (this.translations.has(locale)) {
      return;
    }
    try {
      const isDev = false;
      const basePath = isDev ? "/src/locales" : "/locales";
      const response = await fetch(`${basePath}/${locale}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const translations = await response.json();
      this.translations.set(locale, translations);
      console.log(`Loaded translations for locale ${locale}`);
    } catch (error) {
      console.error(`Failed to load translations for locale ${locale}:`, error);
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
  async setLocale(locale) {
    if (this.locale !== locale) {
      await this.loadTranslations(locale);
      this.locale = locale;
      localStorage.setItem("locale", locale);
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
      console.warn(`No translations loaded for locale: ${this.locale}, key: ${key}`);
      return key;
    }
    const keys = key.split(".");
    let value = translations;
    for (const k of keys) {
      if (typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} in locale: ${this.locale}`);
        return key;
      }
    }
    if (typeof value !== "string") {
      console.warn(`Translation value is not a string for key: ${key}, got:`, value);
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
    this.listeners.forEach((listener) => listener());
  }
  // Helper method for components
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.initialized) {
      return Promise.resolve();
    }
    this.initPromise = Promise.all([
      this.loadTranslations("en"),
      this.loadTranslations(this.locale)
    ]).then(() => {
      this.initialized = true;
      console.log("i18n fully initialized with translations");
    });
    return this.initPromise;
  }
  isInitialized() {
    return this.initialized;
  }
}
const i18n = new I18n();
function t(key, params) {
  return i18n.t(key, params);
}
function getSameOriginUrl(protocol) {
  const { protocol: currentProtocol, host } = window.location;
  const isSecure = currentProtocol === "https:";
  if (protocol === "http") {
    return `${currentProtocol}//${host}`;
  } else {
    return `${isSecure ? "wss" : "ws"}://${host}`;
  }
}
const getEnvConfig = () => {
  const apiBaseUrl = getSameOriginUrl("http");
  const wsBaseUrl = getSameOriginUrl("ws");
  return {
    API_BASE_URL: apiBaseUrl,
    WS_BASE_URL: wsBaseUrl,
    API_VERSION: "/api/v1",
    ENABLE_DEBUG: false,
    ENABLE_MOCK_DATA: false
  };
};
const defaultConfig = getEnvConfig();
const windowConfig = window.VAPOR_CONFIG || {};
const config = {
  ...defaultConfig,
  ...windowConfig
};
function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${config.API_BASE_URL}${config.API_VERSION}${cleanEndpoint}`;
}
function getWsUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${config.WS_BASE_URL}${cleanPath}`;
}
class AuthManager {
  constructor() {
    this.token = null;
    this.expiresAt = null;
    this.loadToken();
  }
  static getInstance() {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
  loadToken() {
    const storedToken = localStorage.getItem("jwt_token");
    const storedExpiry = localStorage.getItem("jwt_expires_at");
    if (storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10);
      if (expiry > Date.now()) {
        this.token = storedToken;
        this.expiresAt = expiry;
      } else {
        console.log("[AuthManager] Token expired, clearing");
        this.clearToken();
      }
    }
  }
  saveToken(token, expiresAt) {
    const expiresAtMs = expiresAt < 1e10 ? expiresAt * 1e3 : expiresAt;
    this.token = token;
    this.expiresAt = expiresAtMs;
    localStorage.setItem("jwt_token", token);
    localStorage.setItem("jwt_expires_at", expiresAtMs.toString());
  }
  clearToken() {
    this.token = null;
    this.expiresAt = null;
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("jwt_expires_at");
  }
  async login(username, password) {
    try {
      const auth_type = "password";
      const response = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, auth_type })
      });
      const data = await response.json();
      if (response.ok && data.status === "success" && data.data) {
        this.saveToken(data.data.token, data.data.expires_at);
        window.dispatchEvent(new CustomEvent("auth:login"));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }
  logout() {
    this.clearToken();
    window.dispatchEvent(new CustomEvent("auth:logout"));
    window.location.href = "/";
  }
  isAuthenticated() {
    if (!this.token || !this.expiresAt) {
      this.loadToken();
    }
    return !!this.token && !!this.expiresAt && this.expiresAt > Date.now();
  }
  getToken() {
    if (!this.token || !this.expiresAt) {
      this.loadToken();
    }
    if (this.isAuthenticated()) {
      return this.token;
    }
    return null;
  }
  getAuthHeaders() {
    const token = this.getToken();
    if (token) {
      return {
        "Authorization": `Bearer ${token}`
      };
    }
    return {};
  }
  // Check if token will expire soon (within 5 minutes)
  isTokenExpiringSoon() {
    if (!this.expiresAt) return true;
    const fiveMinutes = 5 * 60 * 1e3;
    return this.expiresAt - Date.now() < fiveMinutes;
  }
  // For WebSocket authentication
  getWebSocketUrl(path) {
    return getWsUrl(path);
  }
}
const auth = AuthManager.getInstance();
const auth$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AuthManager,
  auth
}, Symbol.toStringTag, { value: "Module" }));
class ThemeManager {
  constructor() {
    this.currentTheme = "dark";
    this.STORAGE_KEY = "vapor-theme";
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
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
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  getTheme() {
    return this.currentTheme;
  }
  setTheme(theme2) {
    this.currentTheme = theme2;
    this.applyTheme(theme2);
    localStorage.setItem(this.STORAGE_KEY, theme2);
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: theme2 } }));
  }
  toggleTheme() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }
  applyTheme(theme2) {
    const root = document.documentElement;
    if (theme2 === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
  }
}
const theme = ThemeManager.getInstance();
theme.getTheme();
auth.isAuthenticated();
i18n.init().then(() => {
  console.log("i18n initialized, loading app...");
  import("./app-root-DrowmW7D.js").then((n) => n.x);
  console.log("Vapor Web UI initialized");
}).catch((error) => {
  console.error("Failed to initialize i18n:", error);
});
export {
  getWsUrl as a,
  auth as b,
  theme as c,
  auth$1 as d,
  getApiUrl as g,
  i18n as i,
  t
};
