(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload"))
    return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]'))
    n(s);
  new MutationObserver((s) => {
    for (const t of s)
      if (t.type === "childList")
        for (const r of t.addedNodes)
          r.tagName === "LINK" && r.rel === "modulepreload" && n(r);
  }).observe(document, { childList: !0, subtree: !0 });
  function o(s) {
    const t = {};
    return s.integrity && (t.integrity = s.integrity), s.referrerPolicy && (t.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? t.credentials = "include" : s.crossOrigin === "anonymous" ? t.credentials = "omit" : t.credentials = "same-origin", t;
  }
  function n(s) {
    if (s.ep)
      return;
    s.ep = !0;
    const t = o(s);
    fetch(s.href, t);
  }
})();
class g {
  constructor() {
    this.locale = "en", this.translations = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
    const e = localStorage.getItem("locale");
    if (e && this.isValidLocale(e))
      this.locale = e;
    else {
      const o = navigator.language.split("-")[0];
      this.isValidLocale(o) && (this.locale = o);
    }
  }
  isValidLocale(e) {
    return e === "en" || e === "id";
  }
  async loadTranslations(e) {
    if (!this.translations.has(e))
      try {
        const s = await fetch(`/locales/${e}.json`);
        if (!s.ok)
          throw new Error(`HTTP error! status: ${s.status}`);
        const t = await s.json();
        this.translations.set(e, t), console.log(`Loaded translations for locale ${e}`);
      } catch (o) {
        console.error(`Failed to load translations for locale ${e}:`, o);
        try {
          const n = `/locales/${e}.json`, s = await fetch(n);
          if (s.ok) {
            const t = await s.json();
            this.translations.set(e, t), console.log(`Loaded translations for locale ${e} from fallback path`);
          }
        } catch (n) {
          console.error(`Fallback also failed for locale ${e}:`, n);
        }
      }
  }
  async setLocale(e) {
    this.locale !== e && (await this.loadTranslations(e), this.locale = e, localStorage.setItem("locale", e), this.notifyListeners(), document.documentElement.lang = e);
  }
  getLocale() {
    return this.locale;
  }
  t(e, o) {
    const n = this.translations.get(this.locale);
    if (!n)
      return e;
    const s = e.split(".");
    let t = n;
    for (const r of s)
      if (typeof t == "object" && r in t)
        t = t[r];
      else
        return e;
    return typeof t != "string" ? e : o ? t.replace(/\{\{(\w+)\}\}/g, (r, h) => h in o ? String(o[h]) : r) : t;
  }
  onChange(e) {
    return this.listeners.add(e), () => this.listeners.delete(e);
  }
  notifyListeners() {
    this.listeners.forEach((e) => e());
  }
  // Helper method for components
  async init() {
    await Promise.all([
      this.loadTranslations("en"),
      this.loadTranslations(this.locale)
    ]);
  }
}
const u = new g();
function k(a, e) {
  return u.t(a, e);
}
const d = {
  API_BASE_URL: "https://vapor-dev.awan.app",
  WS_BASE_URL: "wss://vapor-dev.awan.app",
  API_VERSION: "/api/v1"
}, f = window.VAPOR_CONFIG || {}, c = {
  ...d,
  ...f
};
function p(a) {
  const e = a.startsWith("/") ? a : `/${a}`;
  return `${c.API_BASE_URL}${c.API_VERSION}${e}`;
}
function m(a) {
  const e = a.startsWith("/") ? a : `/${a}`;
  return `${c.WS_BASE_URL}${e}`;
}
class i {
  constructor() {
    this.token = null, this.expiresAt = null, console.log("[AuthManager] Constructor called"), this.loadToken();
  }
  static getInstance() {
    return i.instance || (i.instance = new i()), i.instance;
  }
  loadToken() {
    console.log("[AuthManager] loadToken called");
    const e = localStorage.getItem("jwt_token"), o = localStorage.getItem("jwt_expires_at");
    if (console.log("[AuthManager] localStorage values:", {
      storedToken: e ? `${e.substring(0, 20)}...` : "null",
      storedExpiry: o,
      currentTime: Date.now(),
      localStorage: {
        jwt_token: localStorage.getItem("jwt_token") ? "exists" : "null",
        jwt_expires_at: localStorage.getItem("jwt_expires_at")
      }
    }), e && o) {
      const n = parseInt(o, 10);
      console.log("[AuthManager] Token found, checking expiry:", {
        expiry: n,
        currentTime: Date.now(),
        isExpired: n <= Date.now(),
        timeUntilExpiry: n - Date.now()
      }), n > Date.now() ? (this.token = e, this.expiresAt = n, console.log("[AuthManager] Token loaded successfully")) : (console.log("[AuthManager] Token expired, clearing"), this.clearToken());
    } else
      console.log("[AuthManager] No valid token in localStorage");
  }
  saveToken(e, o) {
    const n = o < 1e10 ? o * 1e3 : o;
    console.log("[AuthManager] saveToken called:", {
      token: e ? `${e.substring(0, 20)}...` : "null",
      expiresAtOriginal: o,
      expiresAtMs: n,
      expiresAtDate: new Date(n).toISOString()
    }), this.token = e, this.expiresAt = n, localStorage.setItem("jwt_token", e), localStorage.setItem("jwt_expires_at", n.toString());
    const s = localStorage.getItem("jwt_token"), t = localStorage.getItem("jwt_expires_at");
    console.log("[AuthManager] Token saved to localStorage:", {
      savedSuccessfully: s === e && t === n.toString(),
      savedToken: s ? "exists" : "null",
      savedExpiry: t
    });
  }
  clearToken() {
    this.token = null, this.expiresAt = null, localStorage.removeItem("jwt_token"), localStorage.removeItem("jwt_expires_at");
  }
  async login(e, o) {
    try {
      const s = await fetch(p("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: e, password: o, auth_type: "password" })
      }), t = await s.json();
      return s.ok && t.status === "success" && t.data ? (console.log("[AuthManager] Login successful, response data:", {
        hasToken: !!t.data.token,
        expiresAt: t.data.expires_at,
        expiresAtDate: new Date(t.data.expires_at).toISOString()
      }), this.saveToken(t.data.token, t.data.expires_at), window.dispatchEvent(new CustomEvent("auth:login")), !0) : (console.log("[AuthManager] Login failed:", {
        responseOk: s.ok,
        status: t.status,
        hasData: !!t.data,
        error: t.error
      }), !1);
    } catch (n) {
      return console.error("Login error:", n), !1;
    }
  }
  logout() {
    this.clearToken(), window.dispatchEvent(new CustomEvent("auth:logout")), window.location.href = "/";
  }
  isAuthenticated() {
    return !!this.token && !!this.expiresAt && this.expiresAt > Date.now();
  }
  getToken() {
    return this.isAuthenticated() ? this.token : null;
  }
  getAuthHeaders() {
    const e = this.getToken();
    if (console.log("[AuthManager] getAuthHeaders called, token:", e ? "present" : "null"), e) {
      const o = {
        Authorization: `Bearer ${e}`
      };
      return console.log("[AuthManager] Returning auth headers:", o), o;
    }
    return console.log("[AuthManager] No token, returning empty headers"), {};
  }
  // Check if token will expire soon (within 5 minutes)
  isTokenExpiringSoon() {
    if (!this.expiresAt) return !0;
    const e = 5 * 60 * 1e3;
    return this.expiresAt - Date.now() < e;
  }
  // For WebSocket authentication
  getWebSocketUrl(e) {
    return m(e);
  }
}
const w = i.getInstance();
class l {
  constructor() {
    this.currentTheme = "dark", this.STORAGE_KEY = "vapor-theme";
    const e = localStorage.getItem(this.STORAGE_KEY);
    e ? this.currentTheme = e : this.currentTheme = this.getSystemTheme(), this.applyTheme(this.currentTheme);
  }
  static getInstance() {
    return l.instance || (l.instance = new l()), l.instance;
  }
  getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  getTheme() {
    return this.currentTheme;
  }
  setTheme(e) {
    this.currentTheme = e, this.applyTheme(e), localStorage.setItem(this.STORAGE_KEY, e), window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: e } }));
  }
  toggleTheme() {
    const e = this.currentTheme === "dark" ? "light" : "dark";
    this.setTheme(e);
  }
  applyTheme(e) {
    const o = document.documentElement;
    e === "light" ? (o.classList.add("light"), o.classList.remove("dark")) : (o.classList.add("dark"), o.classList.remove("light"));
  }
}
const T = l.getInstance();
T.getTheme();
w.isAuthenticated();
u.init().then(() => {
  console.log("i18n initialized, loading app..."), import("./app-root-DVtfAsuo.js"), console.log("Vapor Web UI initialized");
}).catch((a) => {
  console.error("Failed to initialize i18n:", a);
});
export {
  w as a,
  p as b,
  T as c,
  m as g,
  u as i,
  k as t
};
