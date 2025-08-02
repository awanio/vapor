(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload"))
    return;
  for (const t of document.querySelectorAll('link[rel="modulepreload"]'))
    o(t);
  new MutationObserver((t) => {
    for (const n of t)
      if (n.type === "childList")
        for (const a of n.addedNodes)
          a.tagName === "LINK" && a.rel === "modulepreload" && o(a);
  }).observe(document, { childList: !0, subtree: !0 });
  function s(t) {
    const n = {};
    return t.integrity && (n.integrity = t.integrity), t.referrerPolicy && (n.referrerPolicy = t.referrerPolicy), t.crossOrigin === "use-credentials" ? n.credentials = "include" : t.crossOrigin === "anonymous" ? n.credentials = "omit" : n.credentials = "same-origin", n;
  }
  function o(t) {
    if (t.ep)
      return;
    t.ep = !0;
    const n = s(t);
    fetch(t.href, n);
  }
})();
class g {
  constructor() {
    this.locale = "en", this.translations = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
    const e = localStorage.getItem("locale");
    if (e && this.isValidLocale(e))
      this.locale = e;
    else {
      const s = navigator.language.split("-")[0];
      this.isValidLocale(s) && (this.locale = s);
    }
  }
  isValidLocale(e) {
    return e === "en" || e === "id";
  }
  async loadTranslations(e) {
    if (!this.translations.has(e))
      try {
        const o = await (await fetch(`/locales/${e}.json`)).json();
        this.translations.set(e, o);
      } catch (s) {
        console.error(`Failed to load translations for locale ${e}:`, s);
      }
  }
  setLocale(e) {
    this.locale !== e && (this.locale = e, localStorage.setItem("locale", e), this.notifyListeners(), document.documentElement.lang = e);
  }
  getLocale() {
    return this.locale;
  }
  t(e, s) {
    const o = this.translations.get(this.locale);
    if (!o)
      return e;
    const t = e.split(".");
    let n = o;
    for (const a of t)
      if (typeof n == "object" && a in n)
        n = n[a];
      else
        return e;
    return typeof n != "string" ? e : s ? n.replace(/\{\{(\w+)\}\}/g, (a, h) => h in s ? String(s[h]) : a) : n;
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
function S(r, e) {
  return u.t(r, e);
}
const d = {
  API_BASE_URL: "https://vapor-dev.awan.app",
  WS_BASE_URL: "wss://vapor-dev.awan.app",
  API_VERSION: "/api/v1"
}, p = window.VAPOR_CONFIG || {}, c = {
  ...d,
  ...p
};
function f(r) {
  const e = r.startsWith("/") ? r : `/${r}`;
  return `${c.API_BASE_URL}${c.API_VERSION}${e}`;
}
function m(r) {
  const e = r.startsWith("/") ? r : `/${r}`;
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
    const e = localStorage.getItem("jwt_token"), s = localStorage.getItem("jwt_expires_at");
    if (console.log("[AuthManager] localStorage values:", {
      storedToken: e ? `${e.substring(0, 20)}...` : "null",
      storedExpiry: s,
      currentTime: Date.now(),
      localStorage: {
        jwt_token: localStorage.getItem("jwt_token") ? "exists" : "null",
        jwt_expires_at: localStorage.getItem("jwt_expires_at")
      }
    }), e && s) {
      const o = parseInt(s, 10);
      console.log("[AuthManager] Token found, checking expiry:", {
        expiry: o,
        currentTime: Date.now(),
        isExpired: o <= Date.now(),
        timeUntilExpiry: o - Date.now()
      }), o > Date.now() ? (this.token = e, this.expiresAt = o, console.log("[AuthManager] Token loaded successfully")) : (console.log("[AuthManager] Token expired, clearing"), this.clearToken());
    } else
      console.log("[AuthManager] No valid token in localStorage");
  }
  saveToken(e, s) {
    const o = s < 1e10 ? s * 1e3 : s;
    console.log("[AuthManager] saveToken called:", {
      token: e ? `${e.substring(0, 20)}...` : "null",
      expiresAtOriginal: s,
      expiresAtMs: o,
      expiresAtDate: new Date(o).toISOString()
    }), this.token = e, this.expiresAt = o, localStorage.setItem("jwt_token", e), localStorage.setItem("jwt_expires_at", o.toString());
    const t = localStorage.getItem("jwt_token"), n = localStorage.getItem("jwt_expires_at");
    console.log("[AuthManager] Token saved to localStorage:", {
      savedSuccessfully: t === e && n === o.toString(),
      savedToken: t ? "exists" : "null",
      savedExpiry: n
    });
  }
  clearToken() {
    this.token = null, this.expiresAt = null, localStorage.removeItem("jwt_token"), localStorage.removeItem("jwt_expires_at");
  }
  async login(e, s) {
    try {
      const o = await fetch(f("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: e, password: s })
      }), t = await o.json();
      return o.ok && t.status === "success" && t.data ? (console.log("[AuthManager] Login successful, response data:", {
        hasToken: !!t.data.token,
        expiresAt: t.data.expires_at,
        expiresAtDate: new Date(t.data.expires_at).toISOString()
      }), this.saveToken(t.data.token, t.data.expires_at), window.dispatchEvent(new CustomEvent("auth:login")), !0) : (console.log("[AuthManager] Login failed:", {
        responseOk: o.ok,
        status: t.status,
        hasData: !!t.data,
        error: t.error
      }), !1);
    } catch (o) {
      return console.error("Login error:", o), !1;
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
      const s = {
        Authorization: `Bearer ${e}`
      };
      return console.log("[AuthManager] Returning auth headers:", s), s;
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
    const s = document.documentElement;
    e === "light" ? (s.classList.add("light"), s.classList.remove("dark")) : (s.classList.add("dark"), s.classList.remove("light"));
  }
}
const T = l.getInstance();
T.getTheme();
w.isAuthenticated();
import("./app-root-J9h3D6-J.js");
u.init().then(() => {
  console.log("Vapor Web UI initialized");
}).catch((r) => {
  console.error("Failed to initialize i18n:", r);
});
export {
  w as a,
  T as b,
  f as g,
  S as t
};
