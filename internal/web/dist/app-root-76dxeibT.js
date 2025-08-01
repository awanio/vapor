var Ma = Object.defineProperty;
var La = (i, e, t) => e in i ? Ma(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var V = (i, e, t) => La(i, typeof e != "symbol" ? e + "" : e, t);
import { a as vt, g as Ra, t as B, b as Fr } from "./index-DklhcpqX.js";
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ji = globalThis, nr = ji.ShadowRoot && (ji.ShadyCSS === void 0 || ji.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, or = Symbol(), Hr = /* @__PURE__ */ new WeakMap();
let yo = class {
  constructor(e, t, s) {
    if (this._$cssResult$ = !0, s !== or) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (nr && e === void 0) {
      const s = t !== void 0 && t.length === 1;
      s && (e = Hr.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && Hr.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const So = (i) => new yo(typeof i == "string" ? i : i + "", void 0, or), Ne = (i, ...e) => {
  const t = i.length === 1 ? i[0] : e.reduce((s, r, o) => s + ((l) => {
    if (l._$cssResult$ === !0) return l.cssText;
    if (typeof l == "number") return l;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + l + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + i[o + 1], i[0]);
  return new yo(t, i, or);
}, Ta = (i, e) => {
  if (nr) i.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const s = document.createElement("style"), r = ji.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = t.cssText, i.appendChild(s);
  }
}, zr = nr ? (i) => i : (i) => i instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const s of e.cssRules) t += s.cssText;
  return So(t);
})(i) : i;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Pa, defineProperty: Oa, getOwnPropertyDescriptor: Ba, getOwnPropertyNames: Ia, getOwnPropertySymbols: $a, getPrototypeOf: Fa } = Object, st = globalThis, Wr = st.trustedTypes, Ha = Wr ? Wr.emptyScript : "", Cs = st.reactiveElementPolyfillSupport, ni = (i, e) => i, es = { toAttribute(i, e) {
  switch (e) {
    case Boolean:
      i = i ? Ha : null;
      break;
    case Object:
    case Array:
      i = i == null ? i : JSON.stringify(i);
  }
  return i;
}, fromAttribute(i, e) {
  let t = i;
  switch (e) {
    case Boolean:
      t = i !== null;
      break;
    case Number:
      t = i === null ? null : Number(i);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(i);
      } catch {
        t = null;
      }
  }
  return t;
} }, ar = (i, e) => !Pa(i, e), Nr = { attribute: !0, type: String, converter: es, reflect: !1, useDefault: !1, hasChanged: ar };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), st.litPropertyMetadata ?? (st.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let Pt = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Nr) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const s = Symbol(), r = this.getPropertyDescriptor(e, s, t);
      r !== void 0 && Oa(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, s) {
    const { get: r, set: o } = Ba(this.prototype, e) ?? { get() {
      return this[t];
    }, set(l) {
      this[t] = l;
    } };
    return { get: r, set(l) {
      const n = r == null ? void 0 : r.call(this);
      o == null || o.call(this, l), this.requestUpdate(e, n, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Nr;
  }
  static _$Ei() {
    if (this.hasOwnProperty(ni("elementProperties"))) return;
    const e = Fa(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(ni("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ni("properties"))) {
      const t = this.properties, s = [...Ia(t), ...$a(t)];
      for (const r of s) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [s, r] of t) this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, s] of this.elementProperties) {
      const r = this._$Eu(t, s);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const r of s) t.unshift(zr(r));
    } else e !== void 0 && t.push(zr(e));
    return t;
  }
  static _$Eu(e, t) {
    const s = t.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const s of t.keys()) this.hasOwnProperty(s) && (e.set(s, this[s]), delete this[s]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Ta(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var s;
      return (s = t.hostConnected) == null ? void 0 : s.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var s;
      return (s = t.hostDisconnected) == null ? void 0 : s.call(t);
    });
  }
  attributeChangedCallback(e, t, s) {
    this._$AK(e, s);
  }
  _$ET(e, t) {
    var o;
    const s = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, s);
    if (r !== void 0 && s.reflect === !0) {
      const l = (((o = s.converter) == null ? void 0 : o.toAttribute) !== void 0 ? s.converter : es).toAttribute(t, s.type);
      this._$Em = e, l == null ? this.removeAttribute(r) : this.setAttribute(r, l), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var o, l;
    const s = this.constructor, r = s._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const n = s.getPropertyOptions(r), a = typeof n.converter == "function" ? { fromAttribute: n.converter } : ((o = n.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? n.converter : es;
      this._$Em = r;
      const c = a.fromAttribute(t, n.type);
      this[r] = c ?? ((l = this._$Ej) == null ? void 0 : l.get(r)) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, s) {
    var r;
    if (e !== void 0) {
      const o = this.constructor, l = this[e];
      if (s ?? (s = o.getPropertyOptions(e)), !((s.hasChanged ?? ar)(l, t) || s.useDefault && s.reflect && l === ((r = this._$Ej) == null ? void 0 : r.get(e)) && !this.hasAttribute(o._$Eu(e, s)))) return;
      this.C(e, t, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: s, reflect: r, wrapped: o }, l) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, l ?? t ?? this[e]), o !== !0 || l !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, l] of this._$Ep) this[o] = l;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0) for (const [o, l] of r) {
        const { wrapped: n } = l, a = this[o];
        n !== !0 || this._$AL.has(o) || a === void 0 || this.C(o, void 0, l, a);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (s = this._$EO) == null || s.forEach((r) => {
        var o;
        return (o = r.hostUpdate) == null ? void 0 : o.call(r);
      }), this.update(t)) : this._$EM();
    } catch (r) {
      throw e = !1, this._$EM(), r;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((s) => {
      var r;
      return (r = s.hostUpdated) == null ? void 0 : r.call(s);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
Pt.elementStyles = [], Pt.shadowRootOptions = { mode: "open" }, Pt[ni("elementProperties")] = /* @__PURE__ */ new Map(), Pt[ni("finalized")] = /* @__PURE__ */ new Map(), Cs == null || Cs({ ReactiveElement: Pt }), (st.reactiveElementVersions ?? (st.reactiveElementVersions = [])).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const oi = globalThis, ts = oi.trustedTypes, Ur = ts ? ts.createPolicy("lit-html", { createHTML: (i) => i }) : void 0, xo = "$lit$", Ze = `lit$${Math.random().toFixed(9).slice(2)}$`, wo = "?" + Ze, za = `<${wo}>`, xt = document, ui = () => xt.createComment(""), fi = (i) => i === null || typeof i != "object" && typeof i != "function", lr = Array.isArray, Wa = (i) => lr(i) || typeof (i == null ? void 0 : i[Symbol.iterator]) == "function", ks = `[ 	
\f\r]`, Kt = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, jr = /-->/g, Vr = />/g, ct = RegExp(`>|${ks}(?:([^\\s"'>=/]+)(${ks}*=${ks}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), qr = /'/g, Kr = /"/g, Co = /^(?:script|style|textarea|title)$/i, Na = (i) => (e, ...t) => ({ _$litType$: i, strings: e, values: t }), N = Na(1), Bt = Symbol.for("lit-noChange"), _e = Symbol.for("lit-nothing"), Yr = /* @__PURE__ */ new WeakMap(), _t = xt.createTreeWalker(xt, 129);
function ko(i, e) {
  if (!lr(i) || !i.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ur !== void 0 ? Ur.createHTML(e) : e;
}
const Ua = (i, e) => {
  const t = i.length - 1, s = [];
  let r, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", l = Kt;
  for (let n = 0; n < t; n++) {
    const a = i[n];
    let c, u, d = -1, f = 0;
    for (; f < a.length && (l.lastIndex = f, u = l.exec(a), u !== null); ) f = l.lastIndex, l === Kt ? u[1] === "!--" ? l = jr : u[1] !== void 0 ? l = Vr : u[2] !== void 0 ? (Co.test(u[2]) && (r = RegExp("</" + u[2], "g")), l = ct) : u[3] !== void 0 && (l = ct) : l === ct ? u[0] === ">" ? (l = r ?? Kt, d = -1) : u[1] === void 0 ? d = -2 : (d = l.lastIndex - u[2].length, c = u[1], l = u[3] === void 0 ? ct : u[3] === '"' ? Kr : qr) : l === Kr || l === qr ? l = ct : l === jr || l === Vr ? l = Kt : (l = ct, r = void 0);
    const m = l === ct && i[n + 1].startsWith("/>") ? " " : "";
    o += l === Kt ? a + za : d >= 0 ? (s.push(c), a.slice(0, d) + xo + a.slice(d) + Ze + m) : a + Ze + (d === -2 ? n : m);
  }
  return [ko(i, o + (i[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
class pi {
  constructor({ strings: e, _$litType$: t }, s) {
    let r;
    this.parts = [];
    let o = 0, l = 0;
    const n = e.length - 1, a = this.parts, [c, u] = Ua(e, t);
    if (this.el = pi.createElement(c, s), _t.currentNode = this.el.content, t === 2 || t === 3) {
      const d = this.el.content.firstChild;
      d.replaceWith(...d.childNodes);
    }
    for (; (r = _t.nextNode()) !== null && a.length < n; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const d of r.getAttributeNames()) if (d.endsWith(xo)) {
          const f = u[l++], m = r.getAttribute(d).split(Ze), y = /([.?@])?(.*)/.exec(f);
          a.push({ type: 1, index: o, name: y[2], strings: m, ctor: y[1] === "." ? Va : y[1] === "?" ? qa : y[1] === "@" ? Ka : hs }), r.removeAttribute(d);
        } else d.startsWith(Ze) && (a.push({ type: 6, index: o }), r.removeAttribute(d));
        if (Co.test(r.tagName)) {
          const d = r.textContent.split(Ze), f = d.length - 1;
          if (f > 0) {
            r.textContent = ts ? ts.emptyScript : "";
            for (let m = 0; m < f; m++) r.append(d[m], ui()), _t.nextNode(), a.push({ type: 2, index: ++o });
            r.append(d[f], ui());
          }
        }
      } else if (r.nodeType === 8) if (r.data === wo) a.push({ type: 2, index: o });
      else {
        let d = -1;
        for (; (d = r.data.indexOf(Ze, d + 1)) !== -1; ) a.push({ type: 7, index: o }), d += Ze.length - 1;
      }
      o++;
    }
  }
  static createElement(e, t) {
    const s = xt.createElement("template");
    return s.innerHTML = e, s;
  }
}
function It(i, e, t = i, s) {
  var l, n;
  if (e === Bt) return e;
  let r = s !== void 0 ? (l = t._$Co) == null ? void 0 : l[s] : t._$Cl;
  const o = fi(e) ? void 0 : e._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== o && ((n = r == null ? void 0 : r._$AO) == null || n.call(r, !1), o === void 0 ? r = void 0 : (r = new o(i), r._$AT(i, t, s)), s !== void 0 ? (t._$Co ?? (t._$Co = []))[s] = r : t._$Cl = r), r !== void 0 && (e = It(i, r._$AS(i, e.values), r, s)), e;
}
class ja {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: s } = this._$AD, r = ((e == null ? void 0 : e.creationScope) ?? xt).importNode(t, !0);
    _t.currentNode = r;
    let o = _t.nextNode(), l = 0, n = 0, a = s[0];
    for (; a !== void 0; ) {
      if (l === a.index) {
        let c;
        a.type === 2 ? c = new wi(o, o.nextSibling, this, e) : a.type === 1 ? c = new a.ctor(o, a.name, a.strings, this, e) : a.type === 6 && (c = new Ya(o, this, e)), this._$AV.push(c), a = s[++n];
      }
      l !== (a == null ? void 0 : a.index) && (o = _t.nextNode(), l++);
    }
    return _t.currentNode = xt, r;
  }
  p(e) {
    let t = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, t), t += s.strings.length - 2) : s._$AI(e[t])), t++;
  }
}
class wi {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, s, r) {
    this.type = 2, this._$AH = _e, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = s, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = It(this, e, t), fi(e) ? e === _e || e == null || e === "" ? (this._$AH !== _e && this._$AR(), this._$AH = _e) : e !== this._$AH && e !== Bt && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Wa(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== _e && fi(this._$AH) ? this._$AA.nextSibling.data = e : this.T(xt.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var o;
    const { values: t, _$litType$: s } = e, r = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = pi.createElement(ko(s.h, s.h[0]), this.options)), s);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === r) this._$AH.p(t);
    else {
      const l = new ja(r, this), n = l.u(this.options);
      l.p(t), this.T(n), this._$AH = l;
    }
  }
  _$AC(e) {
    let t = Yr.get(e.strings);
    return t === void 0 && Yr.set(e.strings, t = new pi(e)), t;
  }
  k(e) {
    lr(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let s, r = 0;
    for (const o of e) r === t.length ? t.push(s = new wi(this.O(ui()), this.O(ui()), this, this.options)) : s = t[r], s._$AI(o), r++;
    r < t.length && (this._$AR(s && s._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, t); e !== this._$AB; ) {
      const r = e.nextSibling;
      e.remove(), e = r;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class hs {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, s, r, o) {
    this.type = 1, this._$AH = _e, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = _e;
  }
  _$AI(e, t = this, s, r) {
    const o = this.strings;
    let l = !1;
    if (o === void 0) e = It(this, e, t, 0), l = !fi(e) || e !== this._$AH && e !== Bt, l && (this._$AH = e);
    else {
      const n = e;
      let a, c;
      for (e = o[0], a = 0; a < o.length - 1; a++) c = It(this, n[s + a], t, a), c === Bt && (c = this._$AH[a]), l || (l = !fi(c) || c !== this._$AH[a]), c === _e ? e = _e : e !== _e && (e += (c ?? "") + o[a + 1]), this._$AH[a] = c;
    }
    l && !r && this.j(e);
  }
  j(e) {
    e === _e ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Va extends hs {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === _e ? void 0 : e;
  }
}
class qa extends hs {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== _e);
  }
}
class Ka extends hs {
  constructor(e, t, s, r, o) {
    super(e, t, s, r, o), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = It(this, e, t, 0) ?? _e) === Bt) return;
    const s = this._$AH, r = e === _e && s !== _e || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, o = e !== _e && (s === _e || r);
    r && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ya {
  constructor(e, t, s) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    It(this, e);
  }
}
const Es = oi.litHtmlPolyfillSupport;
Es == null || Es(pi, wi), (oi.litHtmlVersions ?? (oi.litHtmlVersions = [])).push("3.3.1");
const Xa = (i, e, t) => {
  const s = (t == null ? void 0 : t.renderBefore) ?? e;
  let r = s._$litPart$;
  if (r === void 0) {
    const o = (t == null ? void 0 : t.renderBefore) ?? null;
    s._$litPart$ = r = new wi(e.insertBefore(ui(), o), o, void 0, t ?? {});
  }
  return r._$AI(i), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const bt = globalThis;
class De extends Pt {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Xa(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
  }
  render() {
    return Bt;
  }
}
var bo;
De._$litElement$ = !0, De.finalized = !0, (bo = bt.litElementHydrateSupport) == null || bo.call(bt, { LitElement: De });
const Ds = bt.litElementPolyfillSupport;
Ds == null || Ds({ LitElement: De });
(bt.litElementVersions ?? (bt.litElementVersions = [])).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ga = (i) => (e, t) => {
  t !== void 0 ? t.addInitializer(() => {
    customElements.define(i, e);
  }) : customElements.define(i, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ja = { attribute: !0, type: String, converter: es, reflect: !1, hasChanged: ar }, Za = (i = Ja, e, t) => {
  const { kind: s, metadata: r } = t;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), s === "setter" && ((i = Object.create(i)).wrapped = !0), o.set(t.name, i), s === "accessor") {
    const { name: l } = t;
    return { set(n) {
      const a = e.get.call(this);
      e.set.call(this, n), this.requestUpdate(l, a, i);
    }, init(n) {
      return n !== void 0 && this.C(l, void 0, i, n), n;
    } };
  }
  if (s === "setter") {
    const { name: l } = t;
    return function(n) {
      const a = this[l];
      e.call(this, n), this.requestUpdate(l, a, i);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function oe(i) {
  return (e, t) => typeof t == "object" ? Za(i, e, t) : ((s, r, o) => {
    const l = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, s), l ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(i, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function fe(i) {
  return oe({ ...i, state: !0, attribute: !1 });
}
var Qa = Object.defineProperty, el = Object.getOwnPropertyDescriptor, Ci = (i, e, t, s) => {
  for (var r = s > 1 ? void 0 : s ? el(e, t) : e, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = (s ? l(e, t, r) : l(r)) || r);
  return s && r && Qa(e, t, r), r;
};
let wt = class extends De {
  constructor() {
    super(...arguments), this.username = "", this.password = "", this.loading = !1, this.error = "";
  }
  render() {
    return N`
      <div class="login-container">
        <div class="logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        <h1>Vapor</h1>
        
        <form @submit=${this.handleSubmit}>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              .value=${this.username}
              @input=${this.handleUsernameInput}
              ?disabled=${this.loading}
              required
              autocomplete="username"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              .value=${this.password}
              @input=${this.handlePasswordInput}
              ?disabled=${this.loading}
              required
              autocomplete="current-password"
            />
          </div>
          
          <button type="submit" ?disabled=${this.loading}>
            ${this.loading ? "Logging in..." : "Login"}
          </button>
          
          ${this.error ? N`
            <div class="error-message">${this.error}</div>
          ` : ""}
        </form>
      </div>
    `;
  }
  handleUsernameInput(i) {
    this.username = i.target.value, this.error = "";
  }
  handlePasswordInput(i) {
    this.password = i.target.value, this.error = "";
  }
  async handleSubmit(i) {
    if (i.preventDefault(), !this.username || !this.password) {
      this.error = "Please enter both username and password";
      return;
    }
    this.loading = !0, this.error = "";
    try {
      await vt.login(this.username, this.password) ? this.dispatchEvent(new CustomEvent("login-success", {
        bubbles: !0,
        composed: !0
      })) : this.error = "Invalid username or password";
    } catch (e) {
      this.error = "An error occurred. Please try again.", console.error("Login error:", e);
    } finally {
      this.loading = !1;
    }
  }
};
wt.styles = Ne`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--surface-0);
    }

    .login-container {
      background: var(--surface-1);
      border-radius: 8px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      text-align: center;
      color: var(--text-primary);
      margin-bottom: 2rem;
      font-size: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--surface-0);
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: var(--primary);
    }

    button {
      width: 100%;
      padding: 0.75rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      color: var(--error);
      text-align: center;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo svg {
      width: 64px;
      height: 64px;
      fill: var(--primary);
    }
  `;
Ci([
  fe()
], wt.prototype, "username", 2);
Ci([
  fe()
], wt.prototype, "password", 2);
Ci([
  fe()
], wt.prototype, "loading", 2);
Ci([
  fe()
], wt.prototype, "error", 2);
wt = Ci([
  Ga("login-page")
], wt);
class Mi extends Error {
  constructor(e, t, s, r) {
    super(e), this.code = t, this.details = s, this.status = r, this.name = "ApiError";
  }
}
class tl {
  // Generic request method
  static async request(e, t = {}) {
    var u, d, f;
    const { method: s = "GET", body: r, headers: o = {}, params: l } = t;
    let n = Ra(e);
    if (l) {
      const m = new URLSearchParams(
        Object.entries(l).map(([y, v]) => [y, String(v)])
      ).toString();
      m && (n += `?${m}`);
    }
    const a = e === "/auth/login" ? {} : vt.getAuthHeaders(), c = {
      "Content-Type": "application/json",
      ...a,
      ...o
    };
    console.log("[API Request]", s, n, {
      headers: c,
      hasAuth: !!a.Authorization
    });
    try {
      const m = await fetch(n, {
        method: s,
        headers: c,
        body: r ? JSON.stringify(r) : void 0
      }), y = m.headers.get("content-type");
      if (!(y != null && y.includes("application/json"))) {
        if (!m.ok)
          throw new Mi(`HTTP error! status: ${m.status}`, void 0, void 0, m.status);
        return m.text();
      }
      const v = await m.json();
      if (!m.ok || v.status === "error")
        throw new Mi(
          ((u = v.error) == null ? void 0 : u.message) || "An error occurred",
          (d = v.error) == null ? void 0 : d.code,
          (f = v.error) == null ? void 0 : f.details,
          m.status
        );
      return v.data;
    } catch (m) {
      throw m instanceof Mi ? m : new Mi(
        m instanceof Error ? m.message : "Network error",
        "NETWORK_ERROR"
      );
    }
  }
  // Convenience methods
  static get(e, t) {
    return this.request(e, { method: "GET", params: t });
  }
  static post(e, t) {
    return this.request(e, { method: "POST", body: t });
  }
  static put(e, t) {
    return this.request(e, { method: "PUT", body: t });
  }
  static delete(e) {
    return this.request(e, { method: "DELETE" });
  }
  static patch(e, t) {
    return this.request(e, { method: "PATCH", body: t });
  }
}
class cr {
  constructor(e) {
    this.path = e, this.ws = null, this.reconnectInterval = 5e3, this.maxReconnectAttempts = 5, this.reconnectAttempts = 0, this.messageHandlers = /* @__PURE__ */ new Map(), this.reconnectTimer = null, this.authenticated = !1, this.url = "";
  }
  connect() {
    return new Promise((e, t) => {
      try {
        this.url = vt.getWebSocketUrl(this.path), this.ws = new WebSocket(this.url), this.ws.onopen = () => {
          console.log(`WebSocket connected to ${this.path}`), this.reconnectAttempts = 0, this.authenticate().then(() => {
            e();
          }).catch(t);
        }, this.ws.onmessage = (s) => {
          try {
            const r = JSON.parse(s.data);
            this.handleMessage(r);
          } catch (r) {
            console.error("Failed to parse WebSocket message:", r);
          }
        }, this.ws.onerror = (s) => {
          console.error("WebSocket error:", s), t(s);
        }, this.ws.onclose = () => {
          console.log("WebSocket closed"), this.authenticated = !1, this.scheduleReconnect();
        };
      } catch (s) {
        t(s);
      }
    });
  }
  async authenticate() {
    const e = vt.getToken();
    if (!e)
      throw new Error("No authentication token available");
    return new Promise((t, s) => {
      const r = setTimeout(() => {
        s(new Error("Authentication timeout"));
      }, 5e3), o = (n) => {
        var a;
        n.type === "auth" && ((a = n.payload) == null ? void 0 : a.authenticated) === !0 && (clearTimeout(r), this.authenticated = !0, this.off("auth", o), this.off("error", l), console.log(`WebSocket authenticated as ${n.payload.username}`), t());
      }, l = (n) => {
        n.type === "error" && n.code === "AUTH_FAILED" && (clearTimeout(r), this.off("auth_success", o), this.off("error", l), s(new Error(n.error || "Authentication failed")));
      };
      this.on("auth", o), this.on("error", l), this.send({
        type: "auth",
        payload: {
          token: e
        }
      });
    });
  }
  scheduleReconnect() {
    this.reconnectTimer && clearTimeout(this.reconnectTimer), this.reconnectAttempts < this.maxReconnectAttempts && (this.reconnectAttempts++, console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}...`), this.reconnectTimer = window.setTimeout(() => {
      vt.isAuthenticated() && this.connect().catch(console.error);
    }, this.reconnectInterval));
  }
  handleMessage(e) {
    const t = this.messageHandlers.get(e.type);
    t && t.forEach((s) => s(e)), e.type === "error" && console.error("WebSocket error:", e.error);
  }
  send(e) {
    this.ws && this.ws.readyState === WebSocket.OPEN ? this.ws.send(JSON.stringify(e)) : console.error("WebSocket is not connected");
  }
  on(e, t) {
    this.messageHandlers.has(e) || this.messageHandlers.set(e, /* @__PURE__ */ new Set()), this.messageHandlers.get(e).add(t);
  }
  off(e, t) {
    const s = this.messageHandlers.get(e);
    s && s.delete(t);
  }
  disconnect() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.ws && (this.ws.close(), this.ws = null), this.messageHandlers.clear(), this.authenticated = !1;
  }
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
  }
}
const Q = tl;
/*!
 * @kurkle/color v0.3.4
 * https://github.com/kurkle/color#readme
 * (c) 2024 Jukka Kurkela
 * Released under the MIT License
 */
function ki(i) {
  return i + 0.5 | 0;
}
const Qe = (i, e, t) => Math.max(Math.min(i, t), e);
function Qt(i) {
  return Qe(ki(i * 2.55), 0, 255);
}
function rt(i) {
  return Qe(ki(i * 255), 0, 255);
}
function qe(i) {
  return Qe(ki(i / 2.55) / 100, 0, 1);
}
function Xr(i) {
  return Qe(ki(i * 100), 0, 100);
}
const Re = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 }, Ns = [..."0123456789ABCDEF"], il = (i) => Ns[i & 15], sl = (i) => Ns[(i & 240) >> 4] + Ns[i & 15], Li = (i) => (i & 240) >> 4 === (i & 15), rl = (i) => Li(i.r) && Li(i.g) && Li(i.b) && Li(i.a);
function nl(i) {
  var e = i.length, t;
  return i[0] === "#" && (e === 4 || e === 5 ? t = {
    r: 255 & Re[i[1]] * 17,
    g: 255 & Re[i[2]] * 17,
    b: 255 & Re[i[3]] * 17,
    a: e === 5 ? Re[i[4]] * 17 : 255
  } : (e === 7 || e === 9) && (t = {
    r: Re[i[1]] << 4 | Re[i[2]],
    g: Re[i[3]] << 4 | Re[i[4]],
    b: Re[i[5]] << 4 | Re[i[6]],
    a: e === 9 ? Re[i[7]] << 4 | Re[i[8]] : 255
  })), t;
}
const ol = (i, e) => i < 255 ? e(i) : "";
function al(i) {
  var e = rl(i) ? il : sl;
  return i ? "#" + e(i.r) + e(i.g) + e(i.b) + ol(i.a, e) : void 0;
}
const ll = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
function Eo(i, e, t) {
  const s = e * Math.min(t, 1 - t), r = (o, l = (o + i / 30) % 12) => t - s * Math.max(Math.min(l - 3, 9 - l, 1), -1);
  return [r(0), r(8), r(4)];
}
function cl(i, e, t) {
  const s = (r, o = (r + i / 60) % 6) => t - t * e * Math.max(Math.min(o, 4 - o, 1), 0);
  return [s(5), s(3), s(1)];
}
function hl(i, e, t) {
  const s = Eo(i, 1, 0.5);
  let r;
  for (e + t > 1 && (r = 1 / (e + t), e *= r, t *= r), r = 0; r < 3; r++)
    s[r] *= 1 - e - t, s[r] += e;
  return s;
}
function dl(i, e, t, s, r) {
  return i === r ? (e - t) / s + (e < t ? 6 : 0) : e === r ? (t - i) / s + 2 : (i - e) / s + 4;
}
function hr(i) {
  const t = i.r / 255, s = i.g / 255, r = i.b / 255, o = Math.max(t, s, r), l = Math.min(t, s, r), n = (o + l) / 2;
  let a, c, u;
  return o !== l && (u = o - l, c = n > 0.5 ? u / (2 - o - l) : u / (o + l), a = dl(t, s, r, u, o), a = a * 60 + 0.5), [a | 0, c || 0, n];
}
function dr(i, e, t, s) {
  return (Array.isArray(e) ? i(e[0], e[1], e[2]) : i(e, t, s)).map(rt);
}
function ur(i, e, t) {
  return dr(Eo, i, e, t);
}
function ul(i, e, t) {
  return dr(hl, i, e, t);
}
function fl(i, e, t) {
  return dr(cl, i, e, t);
}
function Do(i) {
  return (i % 360 + 360) % 360;
}
function pl(i) {
  const e = ll.exec(i);
  let t = 255, s;
  if (!e)
    return;
  e[5] !== s && (t = e[6] ? Qt(+e[5]) : rt(+e[5]));
  const r = Do(+e[2]), o = +e[3] / 100, l = +e[4] / 100;
  return e[1] === "hwb" ? s = ul(r, o, l) : e[1] === "hsv" ? s = fl(r, o, l) : s = ur(r, o, l), {
    r: s[0],
    g: s[1],
    b: s[2],
    a: t
  };
}
function gl(i, e) {
  var t = hr(i);
  t[0] = Do(t[0] + e), t = ur(t), i.r = t[0], i.g = t[1], i.b = t[2];
}
function _l(i) {
  if (!i)
    return;
  const e = hr(i), t = e[0], s = Xr(e[1]), r = Xr(e[2]);
  return i.a < 255 ? `hsla(${t}, ${s}%, ${r}%, ${qe(i.a)})` : `hsl(${t}, ${s}%, ${r}%)`;
}
const Gr = {
  x: "dark",
  Z: "light",
  Y: "re",
  X: "blu",
  W: "gr",
  V: "medium",
  U: "slate",
  A: "ee",
  T: "ol",
  S: "or",
  B: "ra",
  C: "lateg",
  D: "ights",
  R: "in",
  Q: "turquois",
  E: "hi",
  P: "ro",
  O: "al",
  N: "le",
  M: "de",
  L: "yello",
  F: "en",
  K: "ch",
  G: "arks",
  H: "ea",
  I: "ightg",
  J: "wh"
}, Jr = {
  OiceXe: "f0f8ff",
  antiquewEte: "faebd7",
  aqua: "ffff",
  aquamarRe: "7fffd4",
  azuY: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "0",
  blanKedOmond: "ffebcd",
  Xe: "ff",
  XeviTet: "8a2be2",
  bPwn: "a52a2a",
  burlywood: "deb887",
  caMtXe: "5f9ea0",
  KartYuse: "7fff00",
  KocTate: "d2691e",
  cSO: "ff7f50",
  cSnflowerXe: "6495ed",
  cSnsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "ffff",
  xXe: "8b",
  xcyan: "8b8b",
  xgTMnPd: "b8860b",
  xWay: "a9a9a9",
  xgYF: "6400",
  xgYy: "a9a9a9",
  xkhaki: "bdb76b",
  xmagFta: "8b008b",
  xTivegYF: "556b2f",
  xSange: "ff8c00",
  xScEd: "9932cc",
  xYd: "8b0000",
  xsOmon: "e9967a",
  xsHgYF: "8fbc8f",
  xUXe: "483d8b",
  xUWay: "2f4f4f",
  xUgYy: "2f4f4f",
  xQe: "ced1",
  xviTet: "9400d3",
  dAppRk: "ff1493",
  dApskyXe: "bfff",
  dimWay: "696969",
  dimgYy: "696969",
  dodgerXe: "1e90ff",
  fiYbrick: "b22222",
  flSOwEte: "fffaf0",
  foYstWAn: "228b22",
  fuKsia: "ff00ff",
  gaRsbSo: "dcdcdc",
  ghostwEte: "f8f8ff",
  gTd: "ffd700",
  gTMnPd: "daa520",
  Way: "808080",
  gYF: "8000",
  gYFLw: "adff2f",
  gYy: "808080",
  honeyMw: "f0fff0",
  hotpRk: "ff69b4",
  RdianYd: "cd5c5c",
  Rdigo: "4b0082",
  ivSy: "fffff0",
  khaki: "f0e68c",
  lavFMr: "e6e6fa",
  lavFMrXsh: "fff0f5",
  lawngYF: "7cfc00",
  NmoncEffon: "fffacd",
  ZXe: "add8e6",
  ZcSO: "f08080",
  Zcyan: "e0ffff",
  ZgTMnPdLw: "fafad2",
  ZWay: "d3d3d3",
  ZgYF: "90ee90",
  ZgYy: "d3d3d3",
  ZpRk: "ffb6c1",
  ZsOmon: "ffa07a",
  ZsHgYF: "20b2aa",
  ZskyXe: "87cefa",
  ZUWay: "778899",
  ZUgYy: "778899",
  ZstAlXe: "b0c4de",
  ZLw: "ffffe0",
  lime: "ff00",
  limegYF: "32cd32",
  lRF: "faf0e6",
  magFta: "ff00ff",
  maPon: "800000",
  VaquamarRe: "66cdaa",
  VXe: "cd",
  VScEd: "ba55d3",
  VpurpN: "9370db",
  VsHgYF: "3cb371",
  VUXe: "7b68ee",
  VsprRggYF: "fa9a",
  VQe: "48d1cc",
  VviTetYd: "c71585",
  midnightXe: "191970",
  mRtcYam: "f5fffa",
  mistyPse: "ffe4e1",
  moccasR: "ffe4b5",
  navajowEte: "ffdead",
  navy: "80",
  Tdlace: "fdf5e6",
  Tive: "808000",
  TivedBb: "6b8e23",
  Sange: "ffa500",
  SangeYd: "ff4500",
  ScEd: "da70d6",
  pOegTMnPd: "eee8aa",
  pOegYF: "98fb98",
  pOeQe: "afeeee",
  pOeviTetYd: "db7093",
  papayawEp: "ffefd5",
  pHKpuff: "ffdab9",
  peru: "cd853f",
  pRk: "ffc0cb",
  plum: "dda0dd",
  powMrXe: "b0e0e6",
  purpN: "800080",
  YbeccapurpN: "663399",
  Yd: "ff0000",
  Psybrown: "bc8f8f",
  PyOXe: "4169e1",
  saddNbPwn: "8b4513",
  sOmon: "fa8072",
  sandybPwn: "f4a460",
  sHgYF: "2e8b57",
  sHshell: "fff5ee",
  siFna: "a0522d",
  silver: "c0c0c0",
  skyXe: "87ceeb",
  UXe: "6a5acd",
  UWay: "708090",
  UgYy: "708090",
  snow: "fffafa",
  sprRggYF: "ff7f",
  stAlXe: "4682b4",
  tan: "d2b48c",
  teO: "8080",
  tEstN: "d8bfd8",
  tomato: "ff6347",
  Qe: "40e0d0",
  viTet: "ee82ee",
  JHt: "f5deb3",
  wEte: "ffffff",
  wEtesmoke: "f5f5f5",
  Lw: "ffff00",
  LwgYF: "9acd32"
};
function ml() {
  const i = {}, e = Object.keys(Jr), t = Object.keys(Gr);
  let s, r, o, l, n;
  for (s = 0; s < e.length; s++) {
    for (l = n = e[s], r = 0; r < t.length; r++)
      o = t[r], n = n.replace(o, Gr[o]);
    o = parseInt(Jr[l], 16), i[n] = [o >> 16 & 255, o >> 8 & 255, o & 255];
  }
  return i;
}
let Ri;
function vl(i) {
  Ri || (Ri = ml(), Ri.transparent = [0, 0, 0, 0]);
  const e = Ri[i.toLowerCase()];
  return e && {
    r: e[0],
    g: e[1],
    b: e[2],
    a: e.length === 4 ? e[3] : 255
  };
}
const bl = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
function yl(i) {
  const e = bl.exec(i);
  let t = 255, s, r, o;
  if (e) {
    if (e[7] !== s) {
      const l = +e[7];
      t = e[8] ? Qt(l) : Qe(l * 255, 0, 255);
    }
    return s = +e[1], r = +e[3], o = +e[5], s = 255 & (e[2] ? Qt(s) : Qe(s, 0, 255)), r = 255 & (e[4] ? Qt(r) : Qe(r, 0, 255)), o = 255 & (e[6] ? Qt(o) : Qe(o, 0, 255)), {
      r: s,
      g: r,
      b: o,
      a: t
    };
  }
}
function Sl(i) {
  return i && (i.a < 255 ? `rgba(${i.r}, ${i.g}, ${i.b}, ${qe(i.a)})` : `rgb(${i.r}, ${i.g}, ${i.b})`);
}
const As = (i) => i <= 31308e-7 ? i * 12.92 : Math.pow(i, 1 / 2.4) * 1.055 - 0.055, Rt = (i) => i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4);
function xl(i, e, t) {
  const s = Rt(qe(i.r)), r = Rt(qe(i.g)), o = Rt(qe(i.b));
  return {
    r: rt(As(s + t * (Rt(qe(e.r)) - s))),
    g: rt(As(r + t * (Rt(qe(e.g)) - r))),
    b: rt(As(o + t * (Rt(qe(e.b)) - o))),
    a: i.a + t * (e.a - i.a)
  };
}
function Ti(i, e, t) {
  if (i) {
    let s = hr(i);
    s[e] = Math.max(0, Math.min(s[e] + s[e] * t, e === 0 ? 360 : 1)), s = ur(s), i.r = s[0], i.g = s[1], i.b = s[2];
  }
}
function Ao(i, e) {
  return i && Object.assign(e || {}, i);
}
function Zr(i) {
  var e = { r: 0, g: 0, b: 0, a: 255 };
  return Array.isArray(i) ? i.length >= 3 && (e = { r: i[0], g: i[1], b: i[2], a: 255 }, i.length > 3 && (e.a = rt(i[3]))) : (e = Ao(i, { r: 0, g: 0, b: 0, a: 1 }), e.a = rt(e.a)), e;
}
function wl(i) {
  return i.charAt(0) === "r" ? yl(i) : pl(i);
}
class gi {
  constructor(e) {
    if (e instanceof gi)
      return e;
    const t = typeof e;
    let s;
    t === "object" ? s = Zr(e) : t === "string" && (s = nl(e) || vl(e) || wl(e)), this._rgb = s, this._valid = !!s;
  }
  get valid() {
    return this._valid;
  }
  get rgb() {
    var e = Ao(this._rgb);
    return e && (e.a = qe(e.a)), e;
  }
  set rgb(e) {
    this._rgb = Zr(e);
  }
  rgbString() {
    return this._valid ? Sl(this._rgb) : void 0;
  }
  hexString() {
    return this._valid ? al(this._rgb) : void 0;
  }
  hslString() {
    return this._valid ? _l(this._rgb) : void 0;
  }
  mix(e, t) {
    if (e) {
      const s = this.rgb, r = e.rgb;
      let o;
      const l = t === o ? 0.5 : t, n = 2 * l - 1, a = s.a - r.a, c = ((n * a === -1 ? n : (n + a) / (1 + n * a)) + 1) / 2;
      o = 1 - c, s.r = 255 & c * s.r + o * r.r + 0.5, s.g = 255 & c * s.g + o * r.g + 0.5, s.b = 255 & c * s.b + o * r.b + 0.5, s.a = l * s.a + (1 - l) * r.a, this.rgb = s;
    }
    return this;
  }
  interpolate(e, t) {
    return e && (this._rgb = xl(this._rgb, e._rgb, t)), this;
  }
  clone() {
    return new gi(this.rgb);
  }
  alpha(e) {
    return this._rgb.a = rt(e), this;
  }
  clearer(e) {
    const t = this._rgb;
    return t.a *= 1 - e, this;
  }
  greyscale() {
    const e = this._rgb, t = ki(e.r * 0.3 + e.g * 0.59 + e.b * 0.11);
    return e.r = e.g = e.b = t, this;
  }
  opaquer(e) {
    const t = this._rgb;
    return t.a *= 1 + e, this;
  }
  negate() {
    const e = this._rgb;
    return e.r = 255 - e.r, e.g = 255 - e.g, e.b = 255 - e.b, this;
  }
  lighten(e) {
    return Ti(this._rgb, 2, e), this;
  }
  darken(e) {
    return Ti(this._rgb, 2, -e), this;
  }
  saturate(e) {
    return Ti(this._rgb, 1, e), this;
  }
  desaturate(e) {
    return Ti(this._rgb, 1, -e), this;
  }
  rotate(e) {
    return gl(this._rgb, e), this;
  }
}
/*!
 * Chart.js v4.5.0
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */
function Ue() {
}
const Cl = /* @__PURE__ */ (() => {
  let i = 0;
  return () => i++;
})();
function ee(i) {
  return i == null;
}
function ce(i) {
  if (Array.isArray && Array.isArray(i))
    return !0;
  const e = Object.prototype.toString.call(i);
  return e.slice(0, 7) === "[object" && e.slice(-6) === "Array]";
}
function te(i) {
  return i !== null && Object.prototype.toString.call(i) === "[object Object]";
}
function ue(i) {
  return (typeof i == "number" || i instanceof Number) && isFinite(+i);
}
function Ae(i, e) {
  return ue(i) ? i : e;
}
function G(i, e) {
  return typeof i > "u" ? e : i;
}
const kl = (i, e) => typeof i == "string" && i.endsWith("%") ? parseFloat(i) / 100 : +i / e, Mo = (i, e) => typeof i == "string" && i.endsWith("%") ? parseFloat(i) / 100 * e : +i;
function ae(i, e, t) {
  if (i && typeof i.call == "function")
    return i.apply(t, e);
}
function ne(i, e, t, s) {
  let r, o, l;
  if (ce(i))
    for (o = i.length, r = 0; r < o; r++)
      e.call(t, i[r], r);
  else if (te(i))
    for (l = Object.keys(i), o = l.length, r = 0; r < o; r++)
      e.call(t, i[l[r]], l[r]);
}
function is(i, e) {
  let t, s, r, o;
  if (!i || !e || i.length !== e.length)
    return !1;
  for (t = 0, s = i.length; t < s; ++t)
    if (r = i[t], o = e[t], r.datasetIndex !== o.datasetIndex || r.index !== o.index)
      return !1;
  return !0;
}
function ss(i) {
  if (ce(i))
    return i.map(ss);
  if (te(i)) {
    const e = /* @__PURE__ */ Object.create(null), t = Object.keys(i), s = t.length;
    let r = 0;
    for (; r < s; ++r)
      e[t[r]] = ss(i[t[r]]);
    return e;
  }
  return i;
}
function Lo(i) {
  return [
    "__proto__",
    "prototype",
    "constructor"
  ].indexOf(i) === -1;
}
function El(i, e, t, s) {
  if (!Lo(i))
    return;
  const r = e[i], o = t[i];
  te(r) && te(o) ? _i(r, o, s) : e[i] = ss(o);
}
function _i(i, e, t) {
  const s = ce(e) ? e : [
    e
  ], r = s.length;
  if (!te(i))
    return i;
  t = t || {};
  const o = t.merger || El;
  let l;
  for (let n = 0; n < r; ++n) {
    if (l = s[n], !te(l))
      continue;
    const a = Object.keys(l);
    for (let c = 0, u = a.length; c < u; ++c)
      o(a[c], i, l, t);
  }
  return i;
}
function ai(i, e) {
  return _i(i, e, {
    merger: Dl
  });
}
function Dl(i, e, t) {
  if (!Lo(i))
    return;
  const s = e[i], r = t[i];
  te(s) && te(r) ? ai(s, r) : Object.prototype.hasOwnProperty.call(e, i) || (e[i] = ss(r));
}
const Qr = {
  // Chart.helpers.core resolveObjectKey should resolve empty key to root object
  "": (i) => i,
  // default resolvers
  x: (i) => i.x,
  y: (i) => i.y
};
function Al(i) {
  const e = i.split("."), t = [];
  let s = "";
  for (const r of e)
    s += r, s.endsWith("\\") ? s = s.slice(0, -1) + "." : (t.push(s), s = "");
  return t;
}
function Ml(i) {
  const e = Al(i);
  return (t) => {
    for (const s of e) {
      if (s === "")
        break;
      t = t && t[s];
    }
    return t;
  };
}
function nt(i, e) {
  return (Qr[e] || (Qr[e] = Ml(e)))(i);
}
function fr(i) {
  return i.charAt(0).toUpperCase() + i.slice(1);
}
const mi = (i) => typeof i < "u", ot = (i) => typeof i == "function", en = (i, e) => {
  if (i.size !== e.size)
    return !1;
  for (const t of i)
    if (!e.has(t))
      return !1;
  return !0;
};
function Ll(i) {
  return i.type === "mouseup" || i.type === "click" || i.type === "contextmenu";
}
const ie = Math.PI, le = 2 * ie, Rl = le + ie, rs = Number.POSITIVE_INFINITY, Tl = ie / 180, pe = ie / 2, ht = ie / 4, tn = ie * 2 / 3, et = Math.log10, He = Math.sign;
function li(i, e, t) {
  return Math.abs(i - e) < t;
}
function sn(i) {
  const e = Math.round(i);
  i = li(i, e, i / 1e3) ? e : i;
  const t = Math.pow(10, Math.floor(et(i))), s = i / t;
  return (s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10) * t;
}
function Pl(i) {
  const e = [], t = Math.sqrt(i);
  let s;
  for (s = 1; s < t; s++)
    i % s === 0 && (e.push(s), e.push(i / s));
  return t === (t | 0) && e.push(t), e.sort((r, o) => r - o).pop(), e;
}
function Ol(i) {
  return typeof i == "symbol" || typeof i == "object" && i !== null && !(Symbol.toPrimitive in i || "toString" in i || "valueOf" in i);
}
function $t(i) {
  return !Ol(i) && !isNaN(parseFloat(i)) && isFinite(i);
}
function Bl(i, e) {
  const t = Math.round(i);
  return t - e <= i && t + e >= i;
}
function Ro(i, e, t) {
  let s, r, o;
  for (s = 0, r = i.length; s < r; s++)
    o = i[s][t], isNaN(o) || (e.min = Math.min(e.min, o), e.max = Math.max(e.max, o));
}
function Te(i) {
  return i * (ie / 180);
}
function pr(i) {
  return i * (180 / ie);
}
function rn(i) {
  if (!ue(i))
    return;
  let e = 1, t = 0;
  for (; Math.round(i * e) / e !== i; )
    e *= 10, t++;
  return t;
}
function To(i, e) {
  const t = e.x - i.x, s = e.y - i.y, r = Math.sqrt(t * t + s * s);
  let o = Math.atan2(s, t);
  return o < -0.5 * ie && (o += le), {
    angle: o,
    distance: r
  };
}
function Us(i, e) {
  return Math.sqrt(Math.pow(e.x - i.x, 2) + Math.pow(e.y - i.y, 2));
}
function Il(i, e) {
  return (i - e + Rl) % le - ie;
}
function ye(i) {
  return (i % le + le) % le;
}
function vi(i, e, t, s) {
  const r = ye(i), o = ye(e), l = ye(t), n = ye(o - r), a = ye(l - r), c = ye(r - o), u = ye(r - l);
  return r === o || r === l || s && o === l || n > a && c < u;
}
function me(i, e, t) {
  return Math.max(e, Math.min(t, i));
}
function $l(i) {
  return me(i, -32768, 32767);
}
function Ke(i, e, t, s = 1e-6) {
  return i >= Math.min(e, t) - s && i <= Math.max(e, t) + s;
}
function gr(i, e, t) {
  t = t || ((l) => i[l] < e);
  let s = i.length - 1, r = 0, o;
  for (; s - r > 1; )
    o = r + s >> 1, t(o) ? r = o : s = o;
  return {
    lo: r,
    hi: s
  };
}
const Ye = (i, e, t, s) => gr(i, t, s ? (r) => {
  const o = i[r][e];
  return o < t || o === t && i[r + 1][e] === t;
} : (r) => i[r][e] < t), Fl = (i, e, t) => gr(i, t, (s) => i[s][e] >= t);
function Hl(i, e, t) {
  let s = 0, r = i.length;
  for (; s < r && i[s] < e; )
    s++;
  for (; r > s && i[r - 1] > t; )
    r--;
  return s > 0 || r < i.length ? i.slice(s, r) : i;
}
const Po = [
  "push",
  "pop",
  "shift",
  "splice",
  "unshift"
];
function zl(i, e) {
  if (i._chartjs) {
    i._chartjs.listeners.push(e);
    return;
  }
  Object.defineProperty(i, "_chartjs", {
    configurable: !0,
    enumerable: !1,
    value: {
      listeners: [
        e
      ]
    }
  }), Po.forEach((t) => {
    const s = "_onData" + fr(t), r = i[t];
    Object.defineProperty(i, t, {
      configurable: !0,
      enumerable: !1,
      value(...o) {
        const l = r.apply(this, o);
        return i._chartjs.listeners.forEach((n) => {
          typeof n[s] == "function" && n[s](...o);
        }), l;
      }
    });
  });
}
function nn(i, e) {
  const t = i._chartjs;
  if (!t)
    return;
  const s = t.listeners, r = s.indexOf(e);
  r !== -1 && s.splice(r, 1), !(s.length > 0) && (Po.forEach((o) => {
    delete i[o];
  }), delete i._chartjs);
}
function Oo(i) {
  const e = new Set(i);
  return e.size === i.length ? i : Array.from(e);
}
const Bo = function() {
  return typeof window > "u" ? function(i) {
    return i();
  } : window.requestAnimationFrame;
}();
function Io(i, e) {
  let t = [], s = !1;
  return function(...r) {
    t = r, s || (s = !0, Bo.call(window, () => {
      s = !1, i.apply(e, t);
    }));
  };
}
function Wl(i, e) {
  let t;
  return function(...s) {
    return e ? (clearTimeout(t), t = setTimeout(i, e, s)) : i.apply(this, s), e;
  };
}
const _r = (i) => i === "start" ? "left" : i === "end" ? "right" : "center", be = (i, e, t) => i === "start" ? e : i === "end" ? t : (e + t) / 2, Nl = (i, e, t, s) => i === (s ? "left" : "right") ? t : i === "center" ? (e + t) / 2 : e;
function $o(i, e, t) {
  const s = e.length;
  let r = 0, o = s;
  if (i._sorted) {
    const { iScale: l, vScale: n, _parsed: a } = i, c = i.dataset && i.dataset.options ? i.dataset.options.spanGaps : null, u = l.axis, { min: d, max: f, minDefined: m, maxDefined: y } = l.getUserBounds();
    if (m) {
      if (r = Math.min(
        // @ts-expect-error Need to type _parsed
        Ye(a, u, d).lo,
        // @ts-expect-error Need to fix types on _lookupByKey
        t ? s : Ye(e, u, l.getPixelForValue(d)).lo
      ), c) {
        const v = a.slice(0, r + 1).reverse().findIndex((h) => !ee(h[n.axis]));
        r -= Math.max(0, v);
      }
      r = me(r, 0, s - 1);
    }
    if (y) {
      let v = Math.max(
        // @ts-expect-error Need to type _parsed
        Ye(a, l.axis, f, !0).hi + 1,
        // @ts-expect-error Need to fix types on _lookupByKey
        t ? 0 : Ye(e, u, l.getPixelForValue(f), !0).hi + 1
      );
      if (c) {
        const h = a.slice(v - 1).findIndex((p) => !ee(p[n.axis]));
        v += Math.max(0, h);
      }
      o = me(v, r, s) - r;
    } else
      o = s - r;
  }
  return {
    start: r,
    count: o
  };
}
function Fo(i) {
  const { xScale: e, yScale: t, _scaleRanges: s } = i, r = {
    xmin: e.min,
    xmax: e.max,
    ymin: t.min,
    ymax: t.max
  };
  if (!s)
    return i._scaleRanges = r, !0;
  const o = s.xmin !== e.min || s.xmax !== e.max || s.ymin !== t.min || s.ymax !== t.max;
  return Object.assign(s, r), o;
}
const Pi = (i) => i === 0 || i === 1, on = (i, e, t) => -(Math.pow(2, 10 * (i -= 1)) * Math.sin((i - e) * le / t)), an = (i, e, t) => Math.pow(2, -10 * i) * Math.sin((i - e) * le / t) + 1, ci = {
  linear: (i) => i,
  easeInQuad: (i) => i * i,
  easeOutQuad: (i) => -i * (i - 2),
  easeInOutQuad: (i) => (i /= 0.5) < 1 ? 0.5 * i * i : -0.5 * (--i * (i - 2) - 1),
  easeInCubic: (i) => i * i * i,
  easeOutCubic: (i) => (i -= 1) * i * i + 1,
  easeInOutCubic: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i : 0.5 * ((i -= 2) * i * i + 2),
  easeInQuart: (i) => i * i * i * i,
  easeOutQuart: (i) => -((i -= 1) * i * i * i - 1),
  easeInOutQuart: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i * i : -0.5 * ((i -= 2) * i * i * i - 2),
  easeInQuint: (i) => i * i * i * i * i,
  easeOutQuint: (i) => (i -= 1) * i * i * i * i + 1,
  easeInOutQuint: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i * i * i : 0.5 * ((i -= 2) * i * i * i * i + 2),
  easeInSine: (i) => -Math.cos(i * pe) + 1,
  easeOutSine: (i) => Math.sin(i * pe),
  easeInOutSine: (i) => -0.5 * (Math.cos(ie * i) - 1),
  easeInExpo: (i) => i === 0 ? 0 : Math.pow(2, 10 * (i - 1)),
  easeOutExpo: (i) => i === 1 ? 1 : -Math.pow(2, -10 * i) + 1,
  easeInOutExpo: (i) => Pi(i) ? i : i < 0.5 ? 0.5 * Math.pow(2, 10 * (i * 2 - 1)) : 0.5 * (-Math.pow(2, -10 * (i * 2 - 1)) + 2),
  easeInCirc: (i) => i >= 1 ? i : -(Math.sqrt(1 - i * i) - 1),
  easeOutCirc: (i) => Math.sqrt(1 - (i -= 1) * i),
  easeInOutCirc: (i) => (i /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - i * i) - 1) : 0.5 * (Math.sqrt(1 - (i -= 2) * i) + 1),
  easeInElastic: (i) => Pi(i) ? i : on(i, 0.075, 0.3),
  easeOutElastic: (i) => Pi(i) ? i : an(i, 0.075, 0.3),
  easeInOutElastic(i) {
    return Pi(i) ? i : i < 0.5 ? 0.5 * on(i * 2, 0.1125, 0.45) : 0.5 + 0.5 * an(i * 2 - 1, 0.1125, 0.45);
  },
  easeInBack(i) {
    return i * i * ((1.70158 + 1) * i - 1.70158);
  },
  easeOutBack(i) {
    return (i -= 1) * i * ((1.70158 + 1) * i + 1.70158) + 1;
  },
  easeInOutBack(i) {
    let e = 1.70158;
    return (i /= 0.5) < 1 ? 0.5 * (i * i * (((e *= 1.525) + 1) * i - e)) : 0.5 * ((i -= 2) * i * (((e *= 1.525) + 1) * i + e) + 2);
  },
  easeInBounce: (i) => 1 - ci.easeOutBounce(1 - i),
  easeOutBounce(i) {
    return i < 1 / 2.75 ? 7.5625 * i * i : i < 2 / 2.75 ? 7.5625 * (i -= 1.5 / 2.75) * i + 0.75 : i < 2.5 / 2.75 ? 7.5625 * (i -= 2.25 / 2.75) * i + 0.9375 : 7.5625 * (i -= 2.625 / 2.75) * i + 0.984375;
  },
  easeInOutBounce: (i) => i < 0.5 ? ci.easeInBounce(i * 2) * 0.5 : ci.easeOutBounce(i * 2 - 1) * 0.5 + 0.5
};
function mr(i) {
  if (i && typeof i == "object") {
    const e = i.toString();
    return e === "[object CanvasPattern]" || e === "[object CanvasGradient]";
  }
  return !1;
}
function ln(i) {
  return mr(i) ? i : new gi(i);
}
function Ms(i) {
  return mr(i) ? i : new gi(i).saturate(0.5).darken(0.1).hexString();
}
const Ul = [
  "x",
  "y",
  "borderWidth",
  "radius",
  "tension"
], jl = [
  "color",
  "borderColor",
  "backgroundColor"
];
function Vl(i) {
  i.set("animation", {
    delay: void 0,
    duration: 1e3,
    easing: "easeOutQuart",
    fn: void 0,
    from: void 0,
    loop: void 0,
    to: void 0,
    type: void 0
  }), i.describe("animation", {
    _fallback: !1,
    _indexable: !1,
    _scriptable: (e) => e !== "onProgress" && e !== "onComplete" && e !== "fn"
  }), i.set("animations", {
    colors: {
      type: "color",
      properties: jl
    },
    numbers: {
      type: "number",
      properties: Ul
    }
  }), i.describe("animations", {
    _fallback: "animation"
  }), i.set("transitions", {
    active: {
      animation: {
        duration: 400
      }
    },
    resize: {
      animation: {
        duration: 0
      }
    },
    show: {
      animations: {
        colors: {
          from: "transparent"
        },
        visible: {
          type: "boolean",
          duration: 0
        }
      }
    },
    hide: {
      animations: {
        colors: {
          to: "transparent"
        },
        visible: {
          type: "boolean",
          easing: "linear",
          fn: (e) => e | 0
        }
      }
    }
  });
}
function ql(i) {
  i.set("layout", {
    autoPadding: !0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });
}
const cn = /* @__PURE__ */ new Map();
function Kl(i, e) {
  e = e || {};
  const t = i + JSON.stringify(e);
  let s = cn.get(t);
  return s || (s = new Intl.NumberFormat(i, e), cn.set(t, s)), s;
}
function Ei(i, e, t) {
  return Kl(e, t).format(i);
}
const Ho = {
  values(i) {
    return ce(i) ? i : "" + i;
  },
  numeric(i, e, t) {
    if (i === 0)
      return "0";
    const s = this.chart.options.locale;
    let r, o = i;
    if (t.length > 1) {
      const c = Math.max(Math.abs(t[0].value), Math.abs(t[t.length - 1].value));
      (c < 1e-4 || c > 1e15) && (r = "scientific"), o = Yl(i, t);
    }
    const l = et(Math.abs(o)), n = isNaN(l) ? 1 : Math.max(Math.min(-1 * Math.floor(l), 20), 0), a = {
      notation: r,
      minimumFractionDigits: n,
      maximumFractionDigits: n
    };
    return Object.assign(a, this.options.ticks.format), Ei(i, s, a);
  },
  logarithmic(i, e, t) {
    if (i === 0)
      return "0";
    const s = t[e].significand || i / Math.pow(10, Math.floor(et(i)));
    return [
      1,
      2,
      3,
      5,
      10,
      15
    ].includes(s) || e > 0.8 * t.length ? Ho.numeric.call(this, i, e, t) : "";
  }
};
function Yl(i, e) {
  let t = e.length > 3 ? e[2].value - e[1].value : e[1].value - e[0].value;
  return Math.abs(t) >= 1 && i !== Math.floor(i) && (t = i - Math.floor(i)), t;
}
var ds = {
  formatters: Ho
};
function Xl(i) {
  i.set("scale", {
    display: !0,
    offset: !1,
    reverse: !1,
    beginAtZero: !1,
    bounds: "ticks",
    clip: !0,
    grace: 0,
    grid: {
      display: !0,
      lineWidth: 1,
      drawOnChartArea: !0,
      drawTicks: !0,
      tickLength: 8,
      tickWidth: (e, t) => t.lineWidth,
      tickColor: (e, t) => t.color,
      offset: !1
    },
    border: {
      display: !0,
      dash: [],
      dashOffset: 0,
      width: 1
    },
    title: {
      display: !1,
      text: "",
      padding: {
        top: 4,
        bottom: 4
      }
    },
    ticks: {
      minRotation: 0,
      maxRotation: 50,
      mirror: !1,
      textStrokeWidth: 0,
      textStrokeColor: "",
      padding: 3,
      display: !0,
      autoSkip: !0,
      autoSkipPadding: 3,
      labelOffset: 0,
      callback: ds.formatters.values,
      minor: {},
      major: {},
      align: "center",
      crossAlign: "near",
      showLabelBackdrop: !1,
      backdropColor: "rgba(255, 255, 255, 0.75)",
      backdropPadding: 2
    }
  }), i.route("scale.ticks", "color", "", "color"), i.route("scale.grid", "color", "", "borderColor"), i.route("scale.border", "color", "", "borderColor"), i.route("scale.title", "color", "", "color"), i.describe("scale", {
    _fallback: !1,
    _scriptable: (e) => !e.startsWith("before") && !e.startsWith("after") && e !== "callback" && e !== "parser",
    _indexable: (e) => e !== "borderDash" && e !== "tickBorderDash" && e !== "dash"
  }), i.describe("scales", {
    _fallback: "scale"
  }), i.describe("scale.ticks", {
    _scriptable: (e) => e !== "backdropPadding" && e !== "callback",
    _indexable: (e) => e !== "backdropPadding"
  });
}
const Ct = /* @__PURE__ */ Object.create(null), js = /* @__PURE__ */ Object.create(null);
function hi(i, e) {
  if (!e)
    return i;
  const t = e.split(".");
  for (let s = 0, r = t.length; s < r; ++s) {
    const o = t[s];
    i = i[o] || (i[o] = /* @__PURE__ */ Object.create(null));
  }
  return i;
}
function Ls(i, e, t) {
  return typeof e == "string" ? _i(hi(i, e), t) : _i(hi(i, ""), e);
}
class Gl {
  constructor(e, t) {
    this.animation = void 0, this.backgroundColor = "rgba(0,0,0,0.1)", this.borderColor = "rgba(0,0,0,0.1)", this.color = "#666", this.datasets = {}, this.devicePixelRatio = (s) => s.chart.platform.getDevicePixelRatio(), this.elements = {}, this.events = [
      "mousemove",
      "mouseout",
      "click",
      "touchstart",
      "touchmove"
    ], this.font = {
      family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
      size: 12,
      style: "normal",
      lineHeight: 1.2,
      weight: null
    }, this.hover = {}, this.hoverBackgroundColor = (s, r) => Ms(r.backgroundColor), this.hoverBorderColor = (s, r) => Ms(r.borderColor), this.hoverColor = (s, r) => Ms(r.color), this.indexAxis = "x", this.interaction = {
      mode: "nearest",
      intersect: !0,
      includeInvisible: !1
    }, this.maintainAspectRatio = !0, this.onHover = null, this.onClick = null, this.parsing = !0, this.plugins = {}, this.responsive = !0, this.scale = void 0, this.scales = {}, this.showLine = !0, this.drawActiveElementsOnTop = !0, this.describe(e), this.apply(t);
  }
  set(e, t) {
    return Ls(this, e, t);
  }
  get(e) {
    return hi(this, e);
  }
  describe(e, t) {
    return Ls(js, e, t);
  }
  override(e, t) {
    return Ls(Ct, e, t);
  }
  route(e, t, s, r) {
    const o = hi(this, e), l = hi(this, s), n = "_" + t;
    Object.defineProperties(o, {
      [n]: {
        value: o[t],
        writable: !0
      },
      [t]: {
        enumerable: !0,
        get() {
          const a = this[n], c = l[r];
          return te(a) ? Object.assign({}, c, a) : G(a, c);
        },
        set(a) {
          this[n] = a;
        }
      }
    });
  }
  apply(e) {
    e.forEach((t) => t(this));
  }
}
var he = /* @__PURE__ */ new Gl({
  _scriptable: (i) => !i.startsWith("on"),
  _indexable: (i) => i !== "events",
  hover: {
    _fallback: "interaction"
  },
  interaction: {
    _scriptable: !1,
    _indexable: !1
  }
}, [
  Vl,
  ql,
  Xl
]);
function Jl(i) {
  return !i || ee(i.size) || ee(i.family) ? null : (i.style ? i.style + " " : "") + (i.weight ? i.weight + " " : "") + i.size + "px " + i.family;
}
function ns(i, e, t, s, r) {
  let o = e[r];
  return o || (o = e[r] = i.measureText(r).width, t.push(r)), o > s && (s = o), s;
}
function Zl(i, e, t, s) {
  s = s || {};
  let r = s.data = s.data || {}, o = s.garbageCollect = s.garbageCollect || [];
  s.font !== e && (r = s.data = {}, o = s.garbageCollect = [], s.font = e), i.save(), i.font = e;
  let l = 0;
  const n = t.length;
  let a, c, u, d, f;
  for (a = 0; a < n; a++)
    if (d = t[a], d != null && !ce(d))
      l = ns(i, r, o, l, d);
    else if (ce(d))
      for (c = 0, u = d.length; c < u; c++)
        f = d[c], f != null && !ce(f) && (l = ns(i, r, o, l, f));
  i.restore();
  const m = o.length / 2;
  if (m > t.length) {
    for (a = 0; a < m; a++)
      delete r[o[a]];
    o.splice(0, m);
  }
  return l;
}
function dt(i, e, t) {
  const s = i.currentDevicePixelRatio, r = t !== 0 ? Math.max(t / 2, 0.5) : 0;
  return Math.round((e - r) * s) / s + r;
}
function hn(i, e) {
  !e && !i || (e = e || i.getContext("2d"), e.save(), e.resetTransform(), e.clearRect(0, 0, i.width, i.height), e.restore());
}
function Vs(i, e, t, s) {
  zo(i, e, t, s, null);
}
function zo(i, e, t, s, r) {
  let o, l, n, a, c, u, d, f;
  const m = e.pointStyle, y = e.rotation, v = e.radius;
  let h = (y || 0) * Tl;
  if (m && typeof m == "object" && (o = m.toString(), o === "[object HTMLImageElement]" || o === "[object HTMLCanvasElement]")) {
    i.save(), i.translate(t, s), i.rotate(h), i.drawImage(m, -m.width / 2, -m.height / 2, m.width, m.height), i.restore();
    return;
  }
  if (!(isNaN(v) || v <= 0)) {
    switch (i.beginPath(), m) {
      default:
        r ? i.ellipse(t, s, r / 2, v, 0, 0, le) : i.arc(t, s, v, 0, le), i.closePath();
        break;
      case "triangle":
        u = r ? r / 2 : v, i.moveTo(t + Math.sin(h) * u, s - Math.cos(h) * v), h += tn, i.lineTo(t + Math.sin(h) * u, s - Math.cos(h) * v), h += tn, i.lineTo(t + Math.sin(h) * u, s - Math.cos(h) * v), i.closePath();
        break;
      case "rectRounded":
        c = v * 0.516, a = v - c, l = Math.cos(h + ht) * a, d = Math.cos(h + ht) * (r ? r / 2 - c : a), n = Math.sin(h + ht) * a, f = Math.sin(h + ht) * (r ? r / 2 - c : a), i.arc(t - d, s - n, c, h - ie, h - pe), i.arc(t + f, s - l, c, h - pe, h), i.arc(t + d, s + n, c, h, h + pe), i.arc(t - f, s + l, c, h + pe, h + ie), i.closePath();
        break;
      case "rect":
        if (!y) {
          a = Math.SQRT1_2 * v, u = r ? r / 2 : a, i.rect(t - u, s - a, 2 * u, 2 * a);
          break;
        }
        h += ht;
      case "rectRot":
        d = Math.cos(h) * (r ? r / 2 : v), l = Math.cos(h) * v, n = Math.sin(h) * v, f = Math.sin(h) * (r ? r / 2 : v), i.moveTo(t - d, s - n), i.lineTo(t + f, s - l), i.lineTo(t + d, s + n), i.lineTo(t - f, s + l), i.closePath();
        break;
      case "crossRot":
        h += ht;
      case "cross":
        d = Math.cos(h) * (r ? r / 2 : v), l = Math.cos(h) * v, n = Math.sin(h) * v, f = Math.sin(h) * (r ? r / 2 : v), i.moveTo(t - d, s - n), i.lineTo(t + d, s + n), i.moveTo(t + f, s - l), i.lineTo(t - f, s + l);
        break;
      case "star":
        d = Math.cos(h) * (r ? r / 2 : v), l = Math.cos(h) * v, n = Math.sin(h) * v, f = Math.sin(h) * (r ? r / 2 : v), i.moveTo(t - d, s - n), i.lineTo(t + d, s + n), i.moveTo(t + f, s - l), i.lineTo(t - f, s + l), h += ht, d = Math.cos(h) * (r ? r / 2 : v), l = Math.cos(h) * v, n = Math.sin(h) * v, f = Math.sin(h) * (r ? r / 2 : v), i.moveTo(t - d, s - n), i.lineTo(t + d, s + n), i.moveTo(t + f, s - l), i.lineTo(t - f, s + l);
        break;
      case "line":
        l = r ? r / 2 : Math.cos(h) * v, n = Math.sin(h) * v, i.moveTo(t - l, s - n), i.lineTo(t + l, s + n);
        break;
      case "dash":
        i.moveTo(t, s), i.lineTo(t + Math.cos(h) * (r ? r / 2 : v), s + Math.sin(h) * v);
        break;
      case !1:
        i.closePath();
        break;
    }
    i.fill(), e.borderWidth > 0 && i.stroke();
  }
}
function Xe(i, e, t) {
  return t = t || 0.5, !e || i && i.x > e.left - t && i.x < e.right + t && i.y > e.top - t && i.y < e.bottom + t;
}
function us(i, e) {
  i.save(), i.beginPath(), i.rect(e.left, e.top, e.right - e.left, e.bottom - e.top), i.clip();
}
function fs(i) {
  i.restore();
}
function Ql(i, e, t, s, r) {
  if (!e)
    return i.lineTo(t.x, t.y);
  if (r === "middle") {
    const o = (e.x + t.x) / 2;
    i.lineTo(o, e.y), i.lineTo(o, t.y);
  } else r === "after" != !!s ? i.lineTo(e.x, t.y) : i.lineTo(t.x, e.y);
  i.lineTo(t.x, t.y);
}
function ec(i, e, t, s) {
  if (!e)
    return i.lineTo(t.x, t.y);
  i.bezierCurveTo(s ? e.cp1x : e.cp2x, s ? e.cp1y : e.cp2y, s ? t.cp2x : t.cp1x, s ? t.cp2y : t.cp1y, t.x, t.y);
}
function tc(i, e) {
  e.translation && i.translate(e.translation[0], e.translation[1]), ee(e.rotation) || i.rotate(e.rotation), e.color && (i.fillStyle = e.color), e.textAlign && (i.textAlign = e.textAlign), e.textBaseline && (i.textBaseline = e.textBaseline);
}
function ic(i, e, t, s, r) {
  if (r.strikethrough || r.underline) {
    const o = i.measureText(s), l = e - o.actualBoundingBoxLeft, n = e + o.actualBoundingBoxRight, a = t - o.actualBoundingBoxAscent, c = t + o.actualBoundingBoxDescent, u = r.strikethrough ? (a + c) / 2 : c;
    i.strokeStyle = i.fillStyle, i.beginPath(), i.lineWidth = r.decorationWidth || 2, i.moveTo(l, u), i.lineTo(n, u), i.stroke();
  }
}
function sc(i, e) {
  const t = i.fillStyle;
  i.fillStyle = e.color, i.fillRect(e.left, e.top, e.width, e.height), i.fillStyle = t;
}
function kt(i, e, t, s, r, o = {}) {
  const l = ce(e) ? e : [
    e
  ], n = o.strokeWidth > 0 && o.strokeColor !== "";
  let a, c;
  for (i.save(), i.font = r.string, tc(i, o), a = 0; a < l.length; ++a)
    c = l[a], o.backdrop && sc(i, o.backdrop), n && (o.strokeColor && (i.strokeStyle = o.strokeColor), ee(o.strokeWidth) || (i.lineWidth = o.strokeWidth), i.strokeText(c, t, s, o.maxWidth)), i.fillText(c, t, s, o.maxWidth), ic(i, t, s, c, o), s += Number(r.lineHeight);
  i.restore();
}
function bi(i, e) {
  const { x: t, y: s, w: r, h: o, radius: l } = e;
  i.arc(t + l.topLeft, s + l.topLeft, l.topLeft, 1.5 * ie, ie, !0), i.lineTo(t, s + o - l.bottomLeft), i.arc(t + l.bottomLeft, s + o - l.bottomLeft, l.bottomLeft, ie, pe, !0), i.lineTo(t + r - l.bottomRight, s + o), i.arc(t + r - l.bottomRight, s + o - l.bottomRight, l.bottomRight, pe, 0, !0), i.lineTo(t + r, s + l.topRight), i.arc(t + r - l.topRight, s + l.topRight, l.topRight, 0, -pe, !0), i.lineTo(t + l.topLeft, s);
}
const rc = /^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/, nc = /^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;
function oc(i, e) {
  const t = ("" + i).match(rc);
  if (!t || t[1] === "normal")
    return e * 1.2;
  switch (i = +t[2], t[3]) {
    case "px":
      return i;
    case "%":
      i /= 100;
      break;
  }
  return e * i;
}
const ac = (i) => +i || 0;
function vr(i, e) {
  const t = {}, s = te(e), r = s ? Object.keys(e) : e, o = te(i) ? s ? (l) => G(i[l], i[e[l]]) : (l) => i[l] : () => i;
  for (const l of r)
    t[l] = ac(o(l));
  return t;
}
function Wo(i) {
  return vr(i, {
    top: "y",
    right: "x",
    bottom: "y",
    left: "x"
  });
}
function yt(i) {
  return vr(i, [
    "topLeft",
    "topRight",
    "bottomLeft",
    "bottomRight"
  ]);
}
function xe(i) {
  const e = Wo(i);
  return e.width = e.left + e.right, e.height = e.top + e.bottom, e;
}
function ge(i, e) {
  i = i || {}, e = e || he.font;
  let t = G(i.size, e.size);
  typeof t == "string" && (t = parseInt(t, 10));
  let s = G(i.style, e.style);
  s && !("" + s).match(nc) && (console.warn('Invalid font style specified: "' + s + '"'), s = void 0);
  const r = {
    family: G(i.family, e.family),
    lineHeight: oc(G(i.lineHeight, e.lineHeight), t),
    size: t,
    style: s,
    weight: G(i.weight, e.weight),
    string: ""
  };
  return r.string = Jl(r), r;
}
function ei(i, e, t, s) {
  let r, o, l;
  for (r = 0, o = i.length; r < o; ++r)
    if (l = i[r], l !== void 0 && l !== void 0)
      return l;
}
function lc(i, e, t) {
  const { min: s, max: r } = i, o = Mo(e, (r - s) / 2), l = (n, a) => t && n === 0 ? 0 : n + a;
  return {
    min: l(s, -Math.abs(o)),
    max: l(r, o)
  };
}
function lt(i, e) {
  return Object.assign(Object.create(i), e);
}
function br(i, e = [
  ""
], t, s, r = () => i[0]) {
  const o = t || i;
  typeof s > "u" && (s = Vo("_fallback", i));
  const l = {
    [Symbol.toStringTag]: "Object",
    _cacheable: !0,
    _scopes: i,
    _rootScopes: o,
    _fallback: s,
    _getTarget: r,
    override: (n) => br([
      n,
      ...i
    ], e, o, s)
  };
  return new Proxy(l, {
    /**
    * A trap for the delete operator.
    */
    deleteProperty(n, a) {
      return delete n[a], delete n._keys, delete i[0][a], !0;
    },
    /**
    * A trap for getting property values.
    */
    get(n, a) {
      return Uo(n, a, () => _c(a, e, i, n));
    },
    /**
    * A trap for Object.getOwnPropertyDescriptor.
    * Also used by Object.hasOwnProperty.
    */
    getOwnPropertyDescriptor(n, a) {
      return Reflect.getOwnPropertyDescriptor(n._scopes[0], a);
    },
    /**
    * A trap for Object.getPrototypeOf.
    */
    getPrototypeOf() {
      return Reflect.getPrototypeOf(i[0]);
    },
    /**
    * A trap for the in operator.
    */
    has(n, a) {
      return un(n).includes(a);
    },
    /**
    * A trap for Object.getOwnPropertyNames and Object.getOwnPropertySymbols.
    */
    ownKeys(n) {
      return un(n);
    },
    /**
    * A trap for setting property values.
    */
    set(n, a, c) {
      const u = n._storage || (n._storage = r());
      return n[a] = u[a] = c, delete n._keys, !0;
    }
  });
}
function Ft(i, e, t, s) {
  const r = {
    _cacheable: !1,
    _proxy: i,
    _context: e,
    _subProxy: t,
    _stack: /* @__PURE__ */ new Set(),
    _descriptors: No(i, s),
    setContext: (o) => Ft(i, o, t, s),
    override: (o) => Ft(i.override(o), e, t, s)
  };
  return new Proxy(r, {
    /**
    * A trap for the delete operator.
    */
    deleteProperty(o, l) {
      return delete o[l], delete i[l], !0;
    },
    /**
    * A trap for getting property values.
    */
    get(o, l, n) {
      return Uo(o, l, () => hc(o, l, n));
    },
    /**
    * A trap for Object.getOwnPropertyDescriptor.
    * Also used by Object.hasOwnProperty.
    */
    getOwnPropertyDescriptor(o, l) {
      return o._descriptors.allKeys ? Reflect.has(i, l) ? {
        enumerable: !0,
        configurable: !0
      } : void 0 : Reflect.getOwnPropertyDescriptor(i, l);
    },
    /**
    * A trap for Object.getPrototypeOf.
    */
    getPrototypeOf() {
      return Reflect.getPrototypeOf(i);
    },
    /**
    * A trap for the in operator.
    */
    has(o, l) {
      return Reflect.has(i, l);
    },
    /**
    * A trap for Object.getOwnPropertyNames and Object.getOwnPropertySymbols.
    */
    ownKeys() {
      return Reflect.ownKeys(i);
    },
    /**
    * A trap for setting property values.
    */
    set(o, l, n) {
      return i[l] = n, delete o[l], !0;
    }
  });
}
function No(i, e = {
  scriptable: !0,
  indexable: !0
}) {
  const { _scriptable: t = e.scriptable, _indexable: s = e.indexable, _allKeys: r = e.allKeys } = i;
  return {
    allKeys: r,
    scriptable: t,
    indexable: s,
    isScriptable: ot(t) ? t : () => t,
    isIndexable: ot(s) ? s : () => s
  };
}
const cc = (i, e) => i ? i + fr(e) : e, yr = (i, e) => te(e) && i !== "adapters" && (Object.getPrototypeOf(e) === null || e.constructor === Object);
function Uo(i, e, t) {
  if (Object.prototype.hasOwnProperty.call(i, e) || e === "constructor")
    return i[e];
  const s = t();
  return i[e] = s, s;
}
function hc(i, e, t) {
  const { _proxy: s, _context: r, _subProxy: o, _descriptors: l } = i;
  let n = s[e];
  return ot(n) && l.isScriptable(e) && (n = dc(e, n, i, t)), ce(n) && n.length && (n = uc(e, n, i, l.isIndexable)), yr(e, n) && (n = Ft(n, r, o && o[e], l)), n;
}
function dc(i, e, t, s) {
  const { _proxy: r, _context: o, _subProxy: l, _stack: n } = t;
  if (n.has(i))
    throw new Error("Recursion detected: " + Array.from(n).join("->") + "->" + i);
  n.add(i);
  let a = e(o, l || s);
  return n.delete(i), yr(i, a) && (a = Sr(r._scopes, r, i, a)), a;
}
function uc(i, e, t, s) {
  const { _proxy: r, _context: o, _subProxy: l, _descriptors: n } = t;
  if (typeof o.index < "u" && s(i))
    return e[o.index % e.length];
  if (te(e[0])) {
    const a = e, c = r._scopes.filter((u) => u !== a);
    e = [];
    for (const u of a) {
      const d = Sr(c, r, i, u);
      e.push(Ft(d, o, l && l[i], n));
    }
  }
  return e;
}
function jo(i, e, t) {
  return ot(i) ? i(e, t) : i;
}
const fc = (i, e) => i === !0 ? e : typeof i == "string" ? nt(e, i) : void 0;
function pc(i, e, t, s, r) {
  for (const o of e) {
    const l = fc(t, o);
    if (l) {
      i.add(l);
      const n = jo(l._fallback, t, r);
      if (typeof n < "u" && n !== t && n !== s)
        return n;
    } else if (l === !1 && typeof s < "u" && t !== s)
      return null;
  }
  return !1;
}
function Sr(i, e, t, s) {
  const r = e._rootScopes, o = jo(e._fallback, t, s), l = [
    ...i,
    ...r
  ], n = /* @__PURE__ */ new Set();
  n.add(s);
  let a = dn(n, l, t, o || t, s);
  return a === null || typeof o < "u" && o !== t && (a = dn(n, l, o, a, s), a === null) ? !1 : br(Array.from(n), [
    ""
  ], r, o, () => gc(e, t, s));
}
function dn(i, e, t, s, r) {
  for (; t; )
    t = pc(i, e, t, s, r);
  return t;
}
function gc(i, e, t) {
  const s = i._getTarget();
  e in s || (s[e] = {});
  const r = s[e];
  return ce(r) && te(t) ? t : r || {};
}
function _c(i, e, t, s) {
  let r;
  for (const o of e)
    if (r = Vo(cc(o, i), t), typeof r < "u")
      return yr(i, r) ? Sr(t, s, i, r) : r;
}
function Vo(i, e) {
  for (const t of e) {
    if (!t)
      continue;
    const s = t[i];
    if (typeof s < "u")
      return s;
  }
}
function un(i) {
  let e = i._keys;
  return e || (e = i._keys = mc(i._scopes)), e;
}
function mc(i) {
  const e = /* @__PURE__ */ new Set();
  for (const t of i)
    for (const s of Object.keys(t).filter((r) => !r.startsWith("_")))
      e.add(s);
  return Array.from(e);
}
function qo(i, e, t, s) {
  const { iScale: r } = i, { key: o = "r" } = this._parsing, l = new Array(s);
  let n, a, c, u;
  for (n = 0, a = s; n < a; ++n)
    c = n + t, u = e[c], l[n] = {
      r: r.parse(nt(u, o), c)
    };
  return l;
}
const vc = Number.EPSILON || 1e-14, Ht = (i, e) => e < i.length && !i[e].skip && i[e], Ko = (i) => i === "x" ? "y" : "x";
function bc(i, e, t, s) {
  const r = i.skip ? e : i, o = e, l = t.skip ? e : t, n = Us(o, r), a = Us(l, o);
  let c = n / (n + a), u = a / (n + a);
  c = isNaN(c) ? 0 : c, u = isNaN(u) ? 0 : u;
  const d = s * c, f = s * u;
  return {
    previous: {
      x: o.x - d * (l.x - r.x),
      y: o.y - d * (l.y - r.y)
    },
    next: {
      x: o.x + f * (l.x - r.x),
      y: o.y + f * (l.y - r.y)
    }
  };
}
function yc(i, e, t) {
  const s = i.length;
  let r, o, l, n, a, c = Ht(i, 0);
  for (let u = 0; u < s - 1; ++u)
    if (a = c, c = Ht(i, u + 1), !(!a || !c)) {
      if (li(e[u], 0, vc)) {
        t[u] = t[u + 1] = 0;
        continue;
      }
      r = t[u] / e[u], o = t[u + 1] / e[u], n = Math.pow(r, 2) + Math.pow(o, 2), !(n <= 9) && (l = 3 / Math.sqrt(n), t[u] = r * l * e[u], t[u + 1] = o * l * e[u]);
    }
}
function Sc(i, e, t = "x") {
  const s = Ko(t), r = i.length;
  let o, l, n, a = Ht(i, 0);
  for (let c = 0; c < r; ++c) {
    if (l = n, n = a, a = Ht(i, c + 1), !n)
      continue;
    const u = n[t], d = n[s];
    l && (o = (u - l[t]) / 3, n[`cp1${t}`] = u - o, n[`cp1${s}`] = d - o * e[c]), a && (o = (a[t] - u) / 3, n[`cp2${t}`] = u + o, n[`cp2${s}`] = d + o * e[c]);
  }
}
function xc(i, e = "x") {
  const t = Ko(e), s = i.length, r = Array(s).fill(0), o = Array(s);
  let l, n, a, c = Ht(i, 0);
  for (l = 0; l < s; ++l)
    if (n = a, a = c, c = Ht(i, l + 1), !!a) {
      if (c) {
        const u = c[e] - a[e];
        r[l] = u !== 0 ? (c[t] - a[t]) / u : 0;
      }
      o[l] = n ? c ? He(r[l - 1]) !== He(r[l]) ? 0 : (r[l - 1] + r[l]) / 2 : r[l - 1] : r[l];
    }
  yc(i, r, o), Sc(i, o, e);
}
function Oi(i, e, t) {
  return Math.max(Math.min(i, t), e);
}
function wc(i, e) {
  let t, s, r, o, l, n = Xe(i[0], e);
  for (t = 0, s = i.length; t < s; ++t)
    l = o, o = n, n = t < s - 1 && Xe(i[t + 1], e), o && (r = i[t], l && (r.cp1x = Oi(r.cp1x, e.left, e.right), r.cp1y = Oi(r.cp1y, e.top, e.bottom)), n && (r.cp2x = Oi(r.cp2x, e.left, e.right), r.cp2y = Oi(r.cp2y, e.top, e.bottom)));
}
function Cc(i, e, t, s, r) {
  let o, l, n, a;
  if (e.spanGaps && (i = i.filter((c) => !c.skip)), e.cubicInterpolationMode === "monotone")
    xc(i, r);
  else {
    let c = s ? i[i.length - 1] : i[0];
    for (o = 0, l = i.length; o < l; ++o)
      n = i[o], a = bc(c, n, i[Math.min(o + 1, l - (s ? 0 : 1)) % l], e.tension), n.cp1x = a.previous.x, n.cp1y = a.previous.y, n.cp2x = a.next.x, n.cp2y = a.next.y, c = n;
  }
  e.capBezierPoints && wc(i, t);
}
function xr() {
  return typeof window < "u" && typeof document < "u";
}
function wr(i) {
  let e = i.parentNode;
  return e && e.toString() === "[object ShadowRoot]" && (e = e.host), e;
}
function os(i, e, t) {
  let s;
  return typeof i == "string" ? (s = parseInt(i, 10), i.indexOf("%") !== -1 && (s = s / 100 * e.parentNode[t])) : s = i, s;
}
const ps = (i) => i.ownerDocument.defaultView.getComputedStyle(i, null);
function kc(i, e) {
  return ps(i).getPropertyValue(e);
}
const Ec = [
  "top",
  "right",
  "bottom",
  "left"
];
function St(i, e, t) {
  const s = {};
  t = t ? "-" + t : "";
  for (let r = 0; r < 4; r++) {
    const o = Ec[r];
    s[o] = parseFloat(i[e + "-" + o + t]) || 0;
  }
  return s.width = s.left + s.right, s.height = s.top + s.bottom, s;
}
const Dc = (i, e, t) => (i > 0 || e > 0) && (!t || !t.shadowRoot);
function Ac(i, e) {
  const t = i.touches, s = t && t.length ? t[0] : i, { offsetX: r, offsetY: o } = s;
  let l = !1, n, a;
  if (Dc(r, o, i.target))
    n = r, a = o;
  else {
    const c = e.getBoundingClientRect();
    n = s.clientX - c.left, a = s.clientY - c.top, l = !0;
  }
  return {
    x: n,
    y: a,
    box: l
  };
}
function pt(i, e) {
  if ("native" in i)
    return i;
  const { canvas: t, currentDevicePixelRatio: s } = e, r = ps(t), o = r.boxSizing === "border-box", l = St(r, "padding"), n = St(r, "border", "width"), { x: a, y: c, box: u } = Ac(i, t), d = l.left + (u && n.left), f = l.top + (u && n.top);
  let { width: m, height: y } = e;
  return o && (m -= l.width + n.width, y -= l.height + n.height), {
    x: Math.round((a - d) / m * t.width / s),
    y: Math.round((c - f) / y * t.height / s)
  };
}
function Mc(i, e, t) {
  let s, r;
  if (e === void 0 || t === void 0) {
    const o = i && wr(i);
    if (!o)
      e = i.clientWidth, t = i.clientHeight;
    else {
      const l = o.getBoundingClientRect(), n = ps(o), a = St(n, "border", "width"), c = St(n, "padding");
      e = l.width - c.width - a.width, t = l.height - c.height - a.height, s = os(n.maxWidth, o, "clientWidth"), r = os(n.maxHeight, o, "clientHeight");
    }
  }
  return {
    width: e,
    height: t,
    maxWidth: s || rs,
    maxHeight: r || rs
  };
}
const Bi = (i) => Math.round(i * 10) / 10;
function Lc(i, e, t, s) {
  const r = ps(i), o = St(r, "margin"), l = os(r.maxWidth, i, "clientWidth") || rs, n = os(r.maxHeight, i, "clientHeight") || rs, a = Mc(i, e, t);
  let { width: c, height: u } = a;
  if (r.boxSizing === "content-box") {
    const f = St(r, "border", "width"), m = St(r, "padding");
    c -= m.width + f.width, u -= m.height + f.height;
  }
  return c = Math.max(0, c - o.width), u = Math.max(0, s ? c / s : u - o.height), c = Bi(Math.min(c, l, a.maxWidth)), u = Bi(Math.min(u, n, a.maxHeight)), c && !u && (u = Bi(c / 2)), (e !== void 0 || t !== void 0) && s && a.height && u > a.height && (u = a.height, c = Bi(Math.floor(u * s))), {
    width: c,
    height: u
  };
}
function fn(i, e, t) {
  const s = e || 1, r = Math.floor(i.height * s), o = Math.floor(i.width * s);
  i.height = Math.floor(i.height), i.width = Math.floor(i.width);
  const l = i.canvas;
  return l.style && (t || !l.style.height && !l.style.width) && (l.style.height = `${i.height}px`, l.style.width = `${i.width}px`), i.currentDevicePixelRatio !== s || l.height !== r || l.width !== o ? (i.currentDevicePixelRatio = s, l.height = r, l.width = o, i.ctx.setTransform(s, 0, 0, s, 0, 0), !0) : !1;
}
const Rc = function() {
  let i = !1;
  try {
    const e = {
      get passive() {
        return i = !0, !1;
      }
    };
    xr() && (window.addEventListener("test", null, e), window.removeEventListener("test", null, e));
  } catch {
  }
  return i;
}();
function pn(i, e) {
  const t = kc(i, e), s = t && t.match(/^(\d+)(\.\d+)?px$/);
  return s ? +s[1] : void 0;
}
function gt(i, e, t, s) {
  return {
    x: i.x + t * (e.x - i.x),
    y: i.y + t * (e.y - i.y)
  };
}
function Tc(i, e, t, s) {
  return {
    x: i.x + t * (e.x - i.x),
    y: s === "middle" ? t < 0.5 ? i.y : e.y : s === "after" ? t < 1 ? i.y : e.y : t > 0 ? e.y : i.y
  };
}
function Pc(i, e, t, s) {
  const r = {
    x: i.cp2x,
    y: i.cp2y
  }, o = {
    x: e.cp1x,
    y: e.cp1y
  }, l = gt(i, r, t), n = gt(r, o, t), a = gt(o, e, t), c = gt(l, n, t), u = gt(n, a, t);
  return gt(c, u, t);
}
const Oc = function(i, e) {
  return {
    x(t) {
      return i + i + e - t;
    },
    setWidth(t) {
      e = t;
    },
    textAlign(t) {
      return t === "center" ? t : t === "right" ? "left" : "right";
    },
    xPlus(t, s) {
      return t - s;
    },
    leftForLtr(t, s) {
      return t - s;
    }
  };
}, Bc = function() {
  return {
    x(i) {
      return i;
    },
    setWidth(i) {
    },
    textAlign(i) {
      return i;
    },
    xPlus(i, e) {
      return i + e;
    },
    leftForLtr(i, e) {
      return i;
    }
  };
};
function Ot(i, e, t) {
  return i ? Oc(e, t) : Bc();
}
function Yo(i, e) {
  let t, s;
  (e === "ltr" || e === "rtl") && (t = i.canvas.style, s = [
    t.getPropertyValue("direction"),
    t.getPropertyPriority("direction")
  ], t.setProperty("direction", e, "important"), i.prevTextDirection = s);
}
function Xo(i, e) {
  e !== void 0 && (delete i.prevTextDirection, i.canvas.style.setProperty("direction", e[0], e[1]));
}
function Go(i) {
  return i === "angle" ? {
    between: vi,
    compare: Il,
    normalize: ye
  } : {
    between: Ke,
    compare: (e, t) => e - t,
    normalize: (e) => e
  };
}
function gn({ start: i, end: e, count: t, loop: s, style: r }) {
  return {
    start: i % t,
    end: e % t,
    loop: s && (e - i + 1) % t === 0,
    style: r
  };
}
function Ic(i, e, t) {
  const { property: s, start: r, end: o } = t, { between: l, normalize: n } = Go(s), a = e.length;
  let { start: c, end: u, loop: d } = i, f, m;
  if (d) {
    for (c += a, u += a, f = 0, m = a; f < m && l(n(e[c % a][s]), r, o); ++f)
      c--, u--;
    c %= a, u %= a;
  }
  return u < c && (u += a), {
    start: c,
    end: u,
    loop: d,
    style: i.style
  };
}
function Jo(i, e, t) {
  if (!t)
    return [
      i
    ];
  const { property: s, start: r, end: o } = t, l = e.length, { compare: n, between: a, normalize: c } = Go(s), { start: u, end: d, loop: f, style: m } = Ic(i, e, t), y = [];
  let v = !1, h = null, p, g, _;
  const b = () => a(r, _, p) && n(r, _) !== 0, S = () => n(o, p) === 0 || a(o, _, p), w = () => v || b(), k = () => !v || S();
  for (let x = u, C = u; x <= d; ++x)
    g = e[x % l], !g.skip && (p = c(g[s]), p !== _ && (v = a(p, r, o), h === null && w() && (h = n(p, r) === 0 ? x : C), h !== null && k() && (y.push(gn({
      start: h,
      end: x,
      loop: f,
      count: l,
      style: m
    })), h = null), C = x, _ = p));
  return h !== null && y.push(gn({
    start: h,
    end: d,
    loop: f,
    count: l,
    style: m
  })), y;
}
function Zo(i, e) {
  const t = [], s = i.segments;
  for (let r = 0; r < s.length; r++) {
    const o = Jo(s[r], i.points, e);
    o.length && t.push(...o);
  }
  return t;
}
function $c(i, e, t, s) {
  let r = 0, o = e - 1;
  if (t && !s)
    for (; r < e && !i[r].skip; )
      r++;
  for (; r < e && i[r].skip; )
    r++;
  for (r %= e, t && (o += r); o > r && i[o % e].skip; )
    o--;
  return o %= e, {
    start: r,
    end: o
  };
}
function Fc(i, e, t, s) {
  const r = i.length, o = [];
  let l = e, n = i[e], a;
  for (a = e + 1; a <= t; ++a) {
    const c = i[a % r];
    c.skip || c.stop ? n.skip || (s = !1, o.push({
      start: e % r,
      end: (a - 1) % r,
      loop: s
    }), e = l = c.stop ? a : null) : (l = a, n.skip && (e = a)), n = c;
  }
  return l !== null && o.push({
    start: e % r,
    end: l % r,
    loop: s
  }), o;
}
function Hc(i, e) {
  const t = i.points, s = i.options.spanGaps, r = t.length;
  if (!r)
    return [];
  const o = !!i._loop, { start: l, end: n } = $c(t, r, o, s);
  if (s === !0)
    return _n(i, [
      {
        start: l,
        end: n,
        loop: o
      }
    ], t, e);
  const a = n < l ? n + r : n, c = !!i._fullLoop && l === 0 && n === r - 1;
  return _n(i, Fc(t, l, a, c), t, e);
}
function _n(i, e, t, s) {
  return !s || !s.setContext || !t ? e : zc(i, e, t, s);
}
function zc(i, e, t, s) {
  const r = i._chart.getContext(), o = mn(i.options), { _datasetIndex: l, options: { spanGaps: n } } = i, a = t.length, c = [];
  let u = o, d = e[0].start, f = d;
  function m(y, v, h, p) {
    const g = n ? -1 : 1;
    if (y !== v) {
      for (y += a; t[y % a].skip; )
        y -= g;
      for (; t[v % a].skip; )
        v += g;
      y % a !== v % a && (c.push({
        start: y % a,
        end: v % a,
        loop: h,
        style: p
      }), u = p, d = v % a);
    }
  }
  for (const y of e) {
    d = n ? d : y.start;
    let v = t[d % a], h;
    for (f = d + 1; f <= y.end; f++) {
      const p = t[f % a];
      h = mn(s.setContext(lt(r, {
        type: "segment",
        p0: v,
        p1: p,
        p0DataIndex: (f - 1) % a,
        p1DataIndex: f % a,
        datasetIndex: l
      }))), Wc(h, u) && m(d, f - 1, y.loop, u), v = p, u = h;
    }
    d < f - 1 && m(d, f - 1, y.loop, u);
  }
  return c;
}
function mn(i) {
  return {
    backgroundColor: i.backgroundColor,
    borderCapStyle: i.borderCapStyle,
    borderDash: i.borderDash,
    borderDashOffset: i.borderDashOffset,
    borderJoinStyle: i.borderJoinStyle,
    borderWidth: i.borderWidth,
    borderColor: i.borderColor
  };
}
function Wc(i, e) {
  if (!e)
    return !1;
  const t = [], s = function(r, o) {
    return mr(o) ? (t.includes(o) || t.push(o), t.indexOf(o)) : o;
  };
  return JSON.stringify(i, s) !== JSON.stringify(e, s);
}
function Ii(i, e, t) {
  return i.options.clip ? i[t] : e[t];
}
function Nc(i, e) {
  const { xScale: t, yScale: s } = i;
  return t && s ? {
    left: Ii(t, e, "left"),
    right: Ii(t, e, "right"),
    top: Ii(s, e, "top"),
    bottom: Ii(s, e, "bottom")
  } : e;
}
function Qo(i, e) {
  const t = e._clip;
  if (t.disabled)
    return !1;
  const s = Nc(e, i.chartArea);
  return {
    left: t.left === !1 ? 0 : s.left - (t.left === !0 ? 0 : t.left),
    right: t.right === !1 ? i.width : s.right + (t.right === !0 ? 0 : t.right),
    top: t.top === !1 ? 0 : s.top - (t.top === !0 ? 0 : t.top),
    bottom: t.bottom === !1 ? i.height : s.bottom + (t.bottom === !0 ? 0 : t.bottom)
  };
}
/*!
 * Chart.js v4.5.0
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */
class Uc {
  constructor() {
    this._request = null, this._charts = /* @__PURE__ */ new Map(), this._running = !1, this._lastDate = void 0;
  }
  _notify(e, t, s, r) {
    const o = t.listeners[r], l = t.duration;
    o.forEach((n) => n({
      chart: e,
      initial: t.initial,
      numSteps: l,
      currentStep: Math.min(s - t.start, l)
    }));
  }
  _refresh() {
    this._request || (this._running = !0, this._request = Bo.call(window, () => {
      this._update(), this._request = null, this._running && this._refresh();
    }));
  }
  _update(e = Date.now()) {
    let t = 0;
    this._charts.forEach((s, r) => {
      if (!s.running || !s.items.length)
        return;
      const o = s.items;
      let l = o.length - 1, n = !1, a;
      for (; l >= 0; --l)
        a = o[l], a._active ? (a._total > s.duration && (s.duration = a._total), a.tick(e), n = !0) : (o[l] = o[o.length - 1], o.pop());
      n && (r.draw(), this._notify(r, s, e, "progress")), o.length || (s.running = !1, this._notify(r, s, e, "complete"), s.initial = !1), t += o.length;
    }), this._lastDate = e, t === 0 && (this._running = !1);
  }
  _getAnims(e) {
    const t = this._charts;
    let s = t.get(e);
    return s || (s = {
      running: !1,
      initial: !0,
      items: [],
      listeners: {
        complete: [],
        progress: []
      }
    }, t.set(e, s)), s;
  }
  listen(e, t, s) {
    this._getAnims(e).listeners[t].push(s);
  }
  add(e, t) {
    !t || !t.length || this._getAnims(e).items.push(...t);
  }
  has(e) {
    return this._getAnims(e).items.length > 0;
  }
  start(e) {
    const t = this._charts.get(e);
    t && (t.running = !0, t.start = Date.now(), t.duration = t.items.reduce((s, r) => Math.max(s, r._duration), 0), this._refresh());
  }
  running(e) {
    if (!this._running)
      return !1;
    const t = this._charts.get(e);
    return !(!t || !t.running || !t.items.length);
  }
  stop(e) {
    const t = this._charts.get(e);
    if (!t || !t.items.length)
      return;
    const s = t.items;
    let r = s.length - 1;
    for (; r >= 0; --r)
      s[r].cancel();
    t.items = [], this._notify(e, t, Date.now(), "complete");
  }
  remove(e) {
    return this._charts.delete(e);
  }
}
var je = /* @__PURE__ */ new Uc();
const vn = "transparent", jc = {
  boolean(i, e, t) {
    return t > 0.5 ? e : i;
  },
  color(i, e, t) {
    const s = ln(i || vn), r = s.valid && ln(e || vn);
    return r && r.valid ? r.mix(s, t).hexString() : e;
  },
  number(i, e, t) {
    return i + (e - i) * t;
  }
};
class Vc {
  constructor(e, t, s, r) {
    const o = t[s];
    r = ei([
      e.to,
      r,
      o,
      e.from
    ]);
    const l = ei([
      e.from,
      o,
      r
    ]);
    this._active = !0, this._fn = e.fn || jc[e.type || typeof l], this._easing = ci[e.easing] || ci.linear, this._start = Math.floor(Date.now() + (e.delay || 0)), this._duration = this._total = Math.floor(e.duration), this._loop = !!e.loop, this._target = t, this._prop = s, this._from = l, this._to = r, this._promises = void 0;
  }
  active() {
    return this._active;
  }
  update(e, t, s) {
    if (this._active) {
      this._notify(!1);
      const r = this._target[this._prop], o = s - this._start, l = this._duration - o;
      this._start = s, this._duration = Math.floor(Math.max(l, e.duration)), this._total += o, this._loop = !!e.loop, this._to = ei([
        e.to,
        t,
        r,
        e.from
      ]), this._from = ei([
        e.from,
        r,
        t
      ]);
    }
  }
  cancel() {
    this._active && (this.tick(Date.now()), this._active = !1, this._notify(!1));
  }
  tick(e) {
    const t = e - this._start, s = this._duration, r = this._prop, o = this._from, l = this._loop, n = this._to;
    let a;
    if (this._active = o !== n && (l || t < s), !this._active) {
      this._target[r] = n, this._notify(!0);
      return;
    }
    if (t < 0) {
      this._target[r] = o;
      return;
    }
    a = t / s % 2, a = l && a > 1 ? 2 - a : a, a = this._easing(Math.min(1, Math.max(0, a))), this._target[r] = this._fn(o, n, a);
  }
  wait() {
    const e = this._promises || (this._promises = []);
    return new Promise((t, s) => {
      e.push({
        res: t,
        rej: s
      });
    });
  }
  _notify(e) {
    const t = e ? "res" : "rej", s = this._promises || [];
    for (let r = 0; r < s.length; r++)
      s[r][t]();
  }
}
class ea {
  constructor(e, t) {
    this._chart = e, this._properties = /* @__PURE__ */ new Map(), this.configure(t);
  }
  configure(e) {
    if (!te(e))
      return;
    const t = Object.keys(he.animation), s = this._properties;
    Object.getOwnPropertyNames(e).forEach((r) => {
      const o = e[r];
      if (!te(o))
        return;
      const l = {};
      for (const n of t)
        l[n] = o[n];
      (ce(o.properties) && o.properties || [
        r
      ]).forEach((n) => {
        (n === r || !s.has(n)) && s.set(n, l);
      });
    });
  }
  _animateOptions(e, t) {
    const s = t.options, r = Kc(e, s);
    if (!r)
      return [];
    const o = this._createAnimations(r, s);
    return s.$shared && qc(e.options.$animations, s).then(() => {
      e.options = s;
    }, () => {
    }), o;
  }
  _createAnimations(e, t) {
    const s = this._properties, r = [], o = e.$animations || (e.$animations = {}), l = Object.keys(t), n = Date.now();
    let a;
    for (a = l.length - 1; a >= 0; --a) {
      const c = l[a];
      if (c.charAt(0) === "$")
        continue;
      if (c === "options") {
        r.push(...this._animateOptions(e, t));
        continue;
      }
      const u = t[c];
      let d = o[c];
      const f = s.get(c);
      if (d)
        if (f && d.active()) {
          d.update(f, u, n);
          continue;
        } else
          d.cancel();
      if (!f || !f.duration) {
        e[c] = u;
        continue;
      }
      o[c] = d = new Vc(f, e, c, u), r.push(d);
    }
    return r;
  }
  update(e, t) {
    if (this._properties.size === 0) {
      Object.assign(e, t);
      return;
    }
    const s = this._createAnimations(e, t);
    if (s.length)
      return je.add(this._chart, s), !0;
  }
}
function qc(i, e) {
  const t = [], s = Object.keys(e);
  for (let r = 0; r < s.length; r++) {
    const o = i[s[r]];
    o && o.active() && t.push(o.wait());
  }
  return Promise.all(t);
}
function Kc(i, e) {
  if (!e)
    return;
  let t = i.options;
  if (!t) {
    i.options = e;
    return;
  }
  return t.$shared && (i.options = t = Object.assign({}, t, {
    $shared: !1,
    $animations: {}
  })), t;
}
function bn(i, e) {
  const t = i && i.options || {}, s = t.reverse, r = t.min === void 0 ? e : 0, o = t.max === void 0 ? e : 0;
  return {
    start: s ? o : r,
    end: s ? r : o
  };
}
function Yc(i, e, t) {
  if (t === !1)
    return !1;
  const s = bn(i, t), r = bn(e, t);
  return {
    top: r.end,
    right: s.end,
    bottom: r.start,
    left: s.start
  };
}
function Xc(i) {
  let e, t, s, r;
  return te(i) ? (e = i.top, t = i.right, s = i.bottom, r = i.left) : e = t = s = r = i, {
    top: e,
    right: t,
    bottom: s,
    left: r,
    disabled: i === !1
  };
}
function ta(i, e) {
  const t = [], s = i._getSortedDatasetMetas(e);
  let r, o;
  for (r = 0, o = s.length; r < o; ++r)
    t.push(s[r].index);
  return t;
}
function yn(i, e, t, s = {}) {
  const r = i.keys, o = s.mode === "single";
  let l, n, a, c;
  if (e === null)
    return;
  let u = !1;
  for (l = 0, n = r.length; l < n; ++l) {
    if (a = +r[l], a === t) {
      if (u = !0, s.all)
        continue;
      break;
    }
    c = i.values[a], ue(c) && (o || e === 0 || He(e) === He(c)) && (e += c);
  }
  return !u && !s.all ? 0 : e;
}
function Gc(i, e) {
  const { iScale: t, vScale: s } = e, r = t.axis === "x" ? "x" : "y", o = s.axis === "x" ? "x" : "y", l = Object.keys(i), n = new Array(l.length);
  let a, c, u;
  for (a = 0, c = l.length; a < c; ++a)
    u = l[a], n[a] = {
      [r]: u,
      [o]: i[u]
    };
  return n;
}
function Rs(i, e) {
  const t = i && i.options.stacked;
  return t || t === void 0 && e.stack !== void 0;
}
function Jc(i, e, t) {
  return `${i.id}.${e.id}.${t.stack || t.type}`;
}
function Zc(i) {
  const { min: e, max: t, minDefined: s, maxDefined: r } = i.getUserBounds();
  return {
    min: s ? e : Number.NEGATIVE_INFINITY,
    max: r ? t : Number.POSITIVE_INFINITY
  };
}
function Qc(i, e, t) {
  const s = i[e] || (i[e] = {});
  return s[t] || (s[t] = {});
}
function Sn(i, e, t, s) {
  for (const r of e.getMatchingVisibleMetas(s).reverse()) {
    const o = i[r.index];
    if (t && o > 0 || !t && o < 0)
      return r.index;
  }
  return null;
}
function xn(i, e) {
  const { chart: t, _cachedMeta: s } = i, r = t._stacks || (t._stacks = {}), { iScale: o, vScale: l, index: n } = s, a = o.axis, c = l.axis, u = Jc(o, l, s), d = e.length;
  let f;
  for (let m = 0; m < d; ++m) {
    const y = e[m], { [a]: v, [c]: h } = y, p = y._stacks || (y._stacks = {});
    f = p[c] = Qc(r, u, v), f[n] = h, f._top = Sn(f, l, !0, s.type), f._bottom = Sn(f, l, !1, s.type);
    const g = f._visualValues || (f._visualValues = {});
    g[n] = h;
  }
}
function Ts(i, e) {
  const t = i.scales;
  return Object.keys(t).filter((s) => t[s].axis === e).shift();
}
function eh(i, e) {
  return lt(i, {
    active: !1,
    dataset: void 0,
    datasetIndex: e,
    index: e,
    mode: "default",
    type: "dataset"
  });
}
function th(i, e, t) {
  return lt(i, {
    active: !1,
    dataIndex: e,
    parsed: void 0,
    raw: void 0,
    element: t,
    index: e,
    mode: "default",
    type: "data"
  });
}
function Yt(i, e) {
  const t = i.controller.index, s = i.vScale && i.vScale.axis;
  if (s) {
    e = e || i._parsed;
    for (const r of e) {
      const o = r._stacks;
      if (!o || o[s] === void 0 || o[s][t] === void 0)
        return;
      delete o[s][t], o[s]._visualValues !== void 0 && o[s]._visualValues[t] !== void 0 && delete o[s]._visualValues[t];
    }
  }
}
const Ps = (i) => i === "reset" || i === "none", wn = (i, e) => e ? i : Object.assign({}, i), ih = (i, e, t) => i && !e.hidden && e._stacked && {
  keys: ta(t, !0),
  values: null
};
class Pe {
  constructor(e, t) {
    this.chart = e, this._ctx = e.ctx, this.index = t, this._cachedDataOpts = {}, this._cachedMeta = this.getMeta(), this._type = this._cachedMeta.type, this.options = void 0, this._parsing = !1, this._data = void 0, this._objectData = void 0, this._sharedOptions = void 0, this._drawStart = void 0, this._drawCount = void 0, this.enableOptionSharing = !1, this.supportsDecimation = !1, this.$context = void 0, this._syncList = [], this.datasetElementType = new.target.datasetElementType, this.dataElementType = new.target.dataElementType, this.initialize();
  }
  initialize() {
    const e = this._cachedMeta;
    this.configure(), this.linkScales(), e._stacked = Rs(e.vScale, e), this.addElements(), this.options.fill && !this.chart.isPluginEnabled("filler") && console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options");
  }
  updateIndex(e) {
    this.index !== e && Yt(this._cachedMeta), this.index = e;
  }
  linkScales() {
    const e = this.chart, t = this._cachedMeta, s = this.getDataset(), r = (d, f, m, y) => d === "x" ? f : d === "r" ? y : m, o = t.xAxisID = G(s.xAxisID, Ts(e, "x")), l = t.yAxisID = G(s.yAxisID, Ts(e, "y")), n = t.rAxisID = G(s.rAxisID, Ts(e, "r")), a = t.indexAxis, c = t.iAxisID = r(a, o, l, n), u = t.vAxisID = r(a, l, o, n);
    t.xScale = this.getScaleForId(o), t.yScale = this.getScaleForId(l), t.rScale = this.getScaleForId(n), t.iScale = this.getScaleForId(c), t.vScale = this.getScaleForId(u);
  }
  getDataset() {
    return this.chart.data.datasets[this.index];
  }
  getMeta() {
    return this.chart.getDatasetMeta(this.index);
  }
  getScaleForId(e) {
    return this.chart.scales[e];
  }
  _getOtherScale(e) {
    const t = this._cachedMeta;
    return e === t.iScale ? t.vScale : t.iScale;
  }
  reset() {
    this._update("reset");
  }
  _destroy() {
    const e = this._cachedMeta;
    this._data && nn(this._data, this), e._stacked && Yt(e);
  }
  _dataCheck() {
    const e = this.getDataset(), t = e.data || (e.data = []), s = this._data;
    if (te(t)) {
      const r = this._cachedMeta;
      this._data = Gc(t, r);
    } else if (s !== t) {
      if (s) {
        nn(s, this);
        const r = this._cachedMeta;
        Yt(r), r._parsed = [];
      }
      t && Object.isExtensible(t) && zl(t, this), this._syncList = [], this._data = t;
    }
  }
  addElements() {
    const e = this._cachedMeta;
    this._dataCheck(), this.datasetElementType && (e.dataset = new this.datasetElementType());
  }
  buildOrUpdateElements(e) {
    const t = this._cachedMeta, s = this.getDataset();
    let r = !1;
    this._dataCheck();
    const o = t._stacked;
    t._stacked = Rs(t.vScale, t), t.stack !== s.stack && (r = !0, Yt(t), t.stack = s.stack), this._resyncElements(e), (r || o !== t._stacked) && (xn(this, t._parsed), t._stacked = Rs(t.vScale, t));
  }
  configure() {
    const e = this.chart.config, t = e.datasetScopeKeys(this._type), s = e.getOptionScopes(this.getDataset(), t, !0);
    this.options = e.createResolver(s, this.getContext()), this._parsing = this.options.parsing, this._cachedDataOpts = {};
  }
  parse(e, t) {
    const { _cachedMeta: s, _data: r } = this, { iScale: o, _stacked: l } = s, n = o.axis;
    let a = e === 0 && t === r.length ? !0 : s._sorted, c = e > 0 && s._parsed[e - 1], u, d, f;
    if (this._parsing === !1)
      s._parsed = r, s._sorted = !0, f = r;
    else {
      ce(r[e]) ? f = this.parseArrayData(s, r, e, t) : te(r[e]) ? f = this.parseObjectData(s, r, e, t) : f = this.parsePrimitiveData(s, r, e, t);
      const m = () => d[n] === null || c && d[n] < c[n];
      for (u = 0; u < t; ++u)
        s._parsed[u + e] = d = f[u], a && (m() && (a = !1), c = d);
      s._sorted = a;
    }
    l && xn(this, f);
  }
  parsePrimitiveData(e, t, s, r) {
    const { iScale: o, vScale: l } = e, n = o.axis, a = l.axis, c = o.getLabels(), u = o === l, d = new Array(r);
    let f, m, y;
    for (f = 0, m = r; f < m; ++f)
      y = f + s, d[f] = {
        [n]: u || o.parse(c[y], y),
        [a]: l.parse(t[y], y)
      };
    return d;
  }
  parseArrayData(e, t, s, r) {
    const { xScale: o, yScale: l } = e, n = new Array(r);
    let a, c, u, d;
    for (a = 0, c = r; a < c; ++a)
      u = a + s, d = t[u], n[a] = {
        x: o.parse(d[0], u),
        y: l.parse(d[1], u)
      };
    return n;
  }
  parseObjectData(e, t, s, r) {
    const { xScale: o, yScale: l } = e, { xAxisKey: n = "x", yAxisKey: a = "y" } = this._parsing, c = new Array(r);
    let u, d, f, m;
    for (u = 0, d = r; u < d; ++u)
      f = u + s, m = t[f], c[u] = {
        x: o.parse(nt(m, n), f),
        y: l.parse(nt(m, a), f)
      };
    return c;
  }
  getParsed(e) {
    return this._cachedMeta._parsed[e];
  }
  getDataElement(e) {
    return this._cachedMeta.data[e];
  }
  applyStack(e, t, s) {
    const r = this.chart, o = this._cachedMeta, l = t[e.axis], n = {
      keys: ta(r, !0),
      values: t._stacks[e.axis]._visualValues
    };
    return yn(n, l, o.index, {
      mode: s
    });
  }
  updateRangeFromParsed(e, t, s, r) {
    const o = s[t.axis];
    let l = o === null ? NaN : o;
    const n = r && s._stacks[t.axis];
    r && n && (r.values = n, l = yn(r, o, this._cachedMeta.index)), e.min = Math.min(e.min, l), e.max = Math.max(e.max, l);
  }
  getMinMax(e, t) {
    const s = this._cachedMeta, r = s._parsed, o = s._sorted && e === s.iScale, l = r.length, n = this._getOtherScale(e), a = ih(t, s, this.chart), c = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    }, { min: u, max: d } = Zc(n);
    let f, m;
    function y() {
      m = r[f];
      const v = m[n.axis];
      return !ue(m[e.axis]) || u > v || d < v;
    }
    for (f = 0; f < l && !(!y() && (this.updateRangeFromParsed(c, e, m, a), o)); ++f)
      ;
    if (o) {
      for (f = l - 1; f >= 0; --f)
        if (!y()) {
          this.updateRangeFromParsed(c, e, m, a);
          break;
        }
    }
    return c;
  }
  getAllParsedValues(e) {
    const t = this._cachedMeta._parsed, s = [];
    let r, o, l;
    for (r = 0, o = t.length; r < o; ++r)
      l = t[r][e.axis], ue(l) && s.push(l);
    return s;
  }
  getMaxOverflow() {
    return !1;
  }
  getLabelAndValue(e) {
    const t = this._cachedMeta, s = t.iScale, r = t.vScale, o = this.getParsed(e);
    return {
      label: s ? "" + s.getLabelForValue(o[s.axis]) : "",
      value: r ? "" + r.getLabelForValue(o[r.axis]) : ""
    };
  }
  _update(e) {
    const t = this._cachedMeta;
    this.update(e || "default"), t._clip = Xc(G(this.options.clip, Yc(t.xScale, t.yScale, this.getMaxOverflow())));
  }
  update(e) {
  }
  draw() {
    const e = this._ctx, t = this.chart, s = this._cachedMeta, r = s.data || [], o = t.chartArea, l = [], n = this._drawStart || 0, a = this._drawCount || r.length - n, c = this.options.drawActiveElementsOnTop;
    let u;
    for (s.dataset && s.dataset.draw(e, o, n, a), u = n; u < n + a; ++u) {
      const d = r[u];
      d.hidden || (d.active && c ? l.push(d) : d.draw(e, o));
    }
    for (u = 0; u < l.length; ++u)
      l[u].draw(e, o);
  }
  getStyle(e, t) {
    const s = t ? "active" : "default";
    return e === void 0 && this._cachedMeta.dataset ? this.resolveDatasetElementOptions(s) : this.resolveDataElementOptions(e || 0, s);
  }
  getContext(e, t, s) {
    const r = this.getDataset();
    let o;
    if (e >= 0 && e < this._cachedMeta.data.length) {
      const l = this._cachedMeta.data[e];
      o = l.$context || (l.$context = th(this.getContext(), e, l)), o.parsed = this.getParsed(e), o.raw = r.data[e], o.index = o.dataIndex = e;
    } else
      o = this.$context || (this.$context = eh(this.chart.getContext(), this.index)), o.dataset = r, o.index = o.datasetIndex = this.index;
    return o.active = !!t, o.mode = s, o;
  }
  resolveDatasetElementOptions(e) {
    return this._resolveElementOptions(this.datasetElementType.id, e);
  }
  resolveDataElementOptions(e, t) {
    return this._resolveElementOptions(this.dataElementType.id, t, e);
  }
  _resolveElementOptions(e, t = "default", s) {
    const r = t === "active", o = this._cachedDataOpts, l = e + "-" + t, n = o[l], a = this.enableOptionSharing && mi(s);
    if (n)
      return wn(n, a);
    const c = this.chart.config, u = c.datasetElementScopeKeys(this._type, e), d = r ? [
      `${e}Hover`,
      "hover",
      e,
      ""
    ] : [
      e,
      ""
    ], f = c.getOptionScopes(this.getDataset(), u), m = Object.keys(he.elements[e]), y = () => this.getContext(s, r, t), v = c.resolveNamedOptions(f, m, y, d);
    return v.$shared && (v.$shared = a, o[l] = Object.freeze(wn(v, a))), v;
  }
  _resolveAnimations(e, t, s) {
    const r = this.chart, o = this._cachedDataOpts, l = `animation-${t}`, n = o[l];
    if (n)
      return n;
    let a;
    if (r.options.animation !== !1) {
      const u = this.chart.config, d = u.datasetAnimationScopeKeys(this._type, t), f = u.getOptionScopes(this.getDataset(), d);
      a = u.createResolver(f, this.getContext(e, s, t));
    }
    const c = new ea(r, a && a.animations);
    return a && a._cacheable && (o[l] = Object.freeze(c)), c;
  }
  getSharedOptions(e) {
    if (e.$shared)
      return this._sharedOptions || (this._sharedOptions = Object.assign({}, e));
  }
  includeOptions(e, t) {
    return !t || Ps(e) || this.chart._animationsDisabled;
  }
  _getSharedOptions(e, t) {
    const s = this.resolveDataElementOptions(e, t), r = this._sharedOptions, o = this.getSharedOptions(s), l = this.includeOptions(t, o) || o !== r;
    return this.updateSharedOptions(o, t, s), {
      sharedOptions: o,
      includeOptions: l
    };
  }
  updateElement(e, t, s, r) {
    Ps(r) ? Object.assign(e, s) : this._resolveAnimations(t, r).update(e, s);
  }
  updateSharedOptions(e, t, s) {
    e && !Ps(t) && this._resolveAnimations(void 0, t).update(e, s);
  }
  _setStyle(e, t, s, r) {
    e.active = r;
    const o = this.getStyle(t, r);
    this._resolveAnimations(t, s, r).update(e, {
      options: !r && this.getSharedOptions(o) || o
    });
  }
  removeHoverStyle(e, t, s) {
    this._setStyle(e, s, "active", !1);
  }
  setHoverStyle(e, t, s) {
    this._setStyle(e, s, "active", !0);
  }
  _removeDatasetHoverStyle() {
    const e = this._cachedMeta.dataset;
    e && this._setStyle(e, void 0, "active", !1);
  }
  _setDatasetHoverStyle() {
    const e = this._cachedMeta.dataset;
    e && this._setStyle(e, void 0, "active", !0);
  }
  _resyncElements(e) {
    const t = this._data, s = this._cachedMeta.data;
    for (const [n, a, c] of this._syncList)
      this[n](a, c);
    this._syncList = [];
    const r = s.length, o = t.length, l = Math.min(o, r);
    l && this.parse(0, l), o > r ? this._insertElements(r, o - r, e) : o < r && this._removeElements(o, r - o);
  }
  _insertElements(e, t, s = !0) {
    const r = this._cachedMeta, o = r.data, l = e + t;
    let n;
    const a = (c) => {
      for (c.length += t, n = c.length - 1; n >= l; n--)
        c[n] = c[n - t];
    };
    for (a(o), n = e; n < l; ++n)
      o[n] = new this.dataElementType();
    this._parsing && a(r._parsed), this.parse(e, t), s && this.updateElements(o, e, t, "reset");
  }
  updateElements(e, t, s, r) {
  }
  _removeElements(e, t) {
    const s = this._cachedMeta;
    if (this._parsing) {
      const r = s._parsed.splice(e, t);
      s._stacked && Yt(s, r);
    }
    s.data.splice(e, t);
  }
  _sync(e) {
    if (this._parsing)
      this._syncList.push(e);
    else {
      const [t, s, r] = e;
      this[t](s, r);
    }
    this.chart._dataChanges.push([
      this.index,
      ...e
    ]);
  }
  _onDataPush() {
    const e = arguments.length;
    this._sync([
      "_insertElements",
      this.getDataset().data.length - e,
      e
    ]);
  }
  _onDataPop() {
    this._sync([
      "_removeElements",
      this._cachedMeta.data.length - 1,
      1
    ]);
  }
  _onDataShift() {
    this._sync([
      "_removeElements",
      0,
      1
    ]);
  }
  _onDataSplice(e, t) {
    t && this._sync([
      "_removeElements",
      e,
      t
    ]);
    const s = arguments.length - 2;
    s && this._sync([
      "_insertElements",
      e,
      s
    ]);
  }
  _onDataUnshift() {
    this._sync([
      "_insertElements",
      0,
      arguments.length
    ]);
  }
}
V(Pe, "defaults", {}), V(Pe, "datasetElementType", null), V(Pe, "dataElementType", null);
function sh(i, e) {
  if (!i._cache.$bar) {
    const t = i.getMatchingVisibleMetas(e);
    let s = [];
    for (let r = 0, o = t.length; r < o; r++)
      s = s.concat(t[r].controller.getAllParsedValues(i));
    i._cache.$bar = Oo(s.sort((r, o) => r - o));
  }
  return i._cache.$bar;
}
function rh(i) {
  const e = i.iScale, t = sh(e, i.type);
  let s = e._length, r, o, l, n;
  const a = () => {
    l === 32767 || l === -32768 || (mi(n) && (s = Math.min(s, Math.abs(l - n) || s)), n = l);
  };
  for (r = 0, o = t.length; r < o; ++r)
    l = e.getPixelForValue(t[r]), a();
  for (n = void 0, r = 0, o = e.ticks.length; r < o; ++r)
    l = e.getPixelForTick(r), a();
  return s;
}
function nh(i, e, t, s) {
  const r = t.barThickness;
  let o, l;
  return ee(r) ? (o = e.min * t.categoryPercentage, l = t.barPercentage) : (o = r * s, l = 1), {
    chunk: o / s,
    ratio: l,
    start: e.pixels[i] - o / 2
  };
}
function oh(i, e, t, s) {
  const r = e.pixels, o = r[i];
  let l = i > 0 ? r[i - 1] : null, n = i < r.length - 1 ? r[i + 1] : null;
  const a = t.categoryPercentage;
  l === null && (l = o - (n === null ? e.end - e.start : n - o)), n === null && (n = o + o - l);
  const c = o - (o - Math.min(l, n)) / 2 * a;
  return {
    chunk: Math.abs(n - l) / 2 * a / s,
    ratio: t.barPercentage,
    start: c
  };
}
function ah(i, e, t, s) {
  const r = t.parse(i[0], s), o = t.parse(i[1], s), l = Math.min(r, o), n = Math.max(r, o);
  let a = l, c = n;
  Math.abs(l) > Math.abs(n) && (a = n, c = l), e[t.axis] = c, e._custom = {
    barStart: a,
    barEnd: c,
    start: r,
    end: o,
    min: l,
    max: n
  };
}
function ia(i, e, t, s) {
  return ce(i) ? ah(i, e, t, s) : e[t.axis] = t.parse(i, s), e;
}
function Cn(i, e, t, s) {
  const r = i.iScale, o = i.vScale, l = r.getLabels(), n = r === o, a = [];
  let c, u, d, f;
  for (c = t, u = t + s; c < u; ++c)
    f = e[c], d = {}, d[r.axis] = n || r.parse(l[c], c), a.push(ia(f, d, o, c));
  return a;
}
function Os(i) {
  return i && i.barStart !== void 0 && i.barEnd !== void 0;
}
function lh(i, e, t) {
  return i !== 0 ? He(i) : (e.isHorizontal() ? 1 : -1) * (e.min >= t ? 1 : -1);
}
function ch(i) {
  let e, t, s, r, o;
  return i.horizontal ? (e = i.base > i.x, t = "left", s = "right") : (e = i.base < i.y, t = "bottom", s = "top"), e ? (r = "end", o = "start") : (r = "start", o = "end"), {
    start: t,
    end: s,
    reverse: e,
    top: r,
    bottom: o
  };
}
function hh(i, e, t, s) {
  let r = e.borderSkipped;
  const o = {};
  if (!r) {
    i.borderSkipped = o;
    return;
  }
  if (r === !0) {
    i.borderSkipped = {
      top: !0,
      right: !0,
      bottom: !0,
      left: !0
    };
    return;
  }
  const { start: l, end: n, reverse: a, top: c, bottom: u } = ch(i);
  r === "middle" && t && (i.enableBorderRadius = !0, (t._top || 0) === s ? r = c : (t._bottom || 0) === s ? r = u : (o[kn(u, l, n, a)] = !0, r = c)), o[kn(r, l, n, a)] = !0, i.borderSkipped = o;
}
function kn(i, e, t, s) {
  return s ? (i = dh(i, e, t), i = En(i, t, e)) : i = En(i, e, t), i;
}
function dh(i, e, t) {
  return i === e ? t : i === t ? e : i;
}
function En(i, e, t) {
  return i === "start" ? e : i === "end" ? t : i;
}
function uh(i, { inflateAmount: e }, t) {
  i.inflateAmount = e === "auto" ? t === 1 ? 0.33 : 0 : e;
}
class Vi extends Pe {
  parsePrimitiveData(e, t, s, r) {
    return Cn(e, t, s, r);
  }
  parseArrayData(e, t, s, r) {
    return Cn(e, t, s, r);
  }
  parseObjectData(e, t, s, r) {
    const { iScale: o, vScale: l } = e, { xAxisKey: n = "x", yAxisKey: a = "y" } = this._parsing, c = o.axis === "x" ? n : a, u = l.axis === "x" ? n : a, d = [];
    let f, m, y, v;
    for (f = s, m = s + r; f < m; ++f)
      v = t[f], y = {}, y[o.axis] = o.parse(nt(v, c), f), d.push(ia(nt(v, u), y, l, f));
    return d;
  }
  updateRangeFromParsed(e, t, s, r) {
    super.updateRangeFromParsed(e, t, s, r);
    const o = s._custom;
    o && t === this._cachedMeta.vScale && (e.min = Math.min(e.min, o.min), e.max = Math.max(e.max, o.max));
  }
  getMaxOverflow() {
    return 0;
  }
  getLabelAndValue(e) {
    const t = this._cachedMeta, { iScale: s, vScale: r } = t, o = this.getParsed(e), l = o._custom, n = Os(l) ? "[" + l.start + ", " + l.end + "]" : "" + r.getLabelForValue(o[r.axis]);
    return {
      label: "" + s.getLabelForValue(o[s.axis]),
      value: n
    };
  }
  initialize() {
    this.enableOptionSharing = !0, super.initialize();
    const e = this._cachedMeta;
    e.stack = this.getDataset().stack;
  }
  update(e) {
    const t = this._cachedMeta;
    this.updateElements(t.data, 0, t.data.length, e);
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", { index: l, _cachedMeta: { vScale: n } } = this, a = n.getBasePixel(), c = n.isHorizontal(), u = this._getRuler(), { sharedOptions: d, includeOptions: f } = this._getSharedOptions(t, r);
    for (let m = t; m < t + s; m++) {
      const y = this.getParsed(m), v = o || ee(y[n.axis]) ? {
        base: a,
        head: a
      } : this._calculateBarValuePixels(m), h = this._calculateBarIndexPixels(m, u), p = (y._stacks || {})[n.axis], g = {
        horizontal: c,
        base: v.base,
        enableBorderRadius: !p || Os(y._custom) || l === p._top || l === p._bottom,
        x: c ? v.head : h.center,
        y: c ? h.center : v.head,
        height: c ? h.size : Math.abs(v.size),
        width: c ? Math.abs(v.size) : h.size
      };
      f && (g.options = d || this.resolveDataElementOptions(m, e[m].active ? "active" : r));
      const _ = g.options || e[m].options;
      hh(g, _, p, l), uh(g, _, u.ratio), this.updateElement(e[m], m, g, r);
    }
  }
  _getStacks(e, t) {
    const { iScale: s } = this._cachedMeta, r = s.getMatchingVisibleMetas(this._type).filter((u) => u.controller.options.grouped), o = s.options.stacked, l = [], n = this._cachedMeta.controller.getParsed(t), a = n && n[s.axis], c = (u) => {
      const d = u._parsed.find((m) => m[s.axis] === a), f = d && d[u.vScale.axis];
      if (ee(f) || isNaN(f))
        return !0;
    };
    for (const u of r)
      if (!(t !== void 0 && c(u)) && ((o === !1 || l.indexOf(u.stack) === -1 || o === void 0 && u.stack === void 0) && l.push(u.stack), u.index === e))
        break;
    return l.length || l.push(void 0), l;
  }
  _getStackCount(e) {
    return this._getStacks(void 0, e).length;
  }
  _getAxisCount() {
    return this._getAxis().length;
  }
  getFirstScaleIdForIndexAxis() {
    const e = this.chart.scales, t = this.chart.options.indexAxis;
    return Object.keys(e).filter((s) => e[s].axis === t).shift();
  }
  _getAxis() {
    const e = {}, t = this.getFirstScaleIdForIndexAxis();
    for (const s of this.chart.data.datasets)
      e[G(this.chart.options.indexAxis === "x" ? s.xAxisID : s.yAxisID, t)] = !0;
    return Object.keys(e);
  }
  _getStackIndex(e, t, s) {
    const r = this._getStacks(e, s), o = t !== void 0 ? r.indexOf(t) : -1;
    return o === -1 ? r.length - 1 : o;
  }
  _getRuler() {
    const e = this.options, t = this._cachedMeta, s = t.iScale, r = [];
    let o, l;
    for (o = 0, l = t.data.length; o < l; ++o)
      r.push(s.getPixelForValue(this.getParsed(o)[s.axis], o));
    const n = e.barThickness;
    return {
      min: n || rh(t),
      pixels: r,
      start: s._startPixel,
      end: s._endPixel,
      stackCount: this._getStackCount(),
      scale: s,
      grouped: e.grouped,
      ratio: n ? 1 : e.categoryPercentage * e.barPercentage
    };
  }
  _calculateBarValuePixels(e) {
    const { _cachedMeta: { vScale: t, _stacked: s, index: r }, options: { base: o, minBarLength: l } } = this, n = o || 0, a = this.getParsed(e), c = a._custom, u = Os(c);
    let d = a[t.axis], f = 0, m = s ? this.applyStack(t, a, s) : d, y, v;
    m !== d && (f = m - d, m = d), u && (d = c.barStart, m = c.barEnd - c.barStart, d !== 0 && He(d) !== He(c.barEnd) && (f = 0), f += d);
    const h = !ee(o) && !u ? o : f;
    let p = t.getPixelForValue(h);
    if (this.chart.getDataVisibility(e) ? y = t.getPixelForValue(f + m) : y = p, v = y - p, Math.abs(v) < l) {
      v = lh(v, t, n) * l, d === n && (p -= v / 2);
      const g = t.getPixelForDecimal(0), _ = t.getPixelForDecimal(1), b = Math.min(g, _), S = Math.max(g, _);
      p = Math.max(Math.min(p, S), b), y = p + v, s && !u && (a._stacks[t.axis]._visualValues[r] = t.getValueForPixel(y) - t.getValueForPixel(p));
    }
    if (p === t.getPixelForValue(n)) {
      const g = He(v) * t.getLineWidthForValue(n) / 2;
      p += g, v -= g;
    }
    return {
      size: v,
      base: p,
      head: y,
      center: y + v / 2
    };
  }
  _calculateBarIndexPixels(e, t) {
    const s = t.scale, r = this.options, o = r.skipNull, l = G(r.maxBarThickness, 1 / 0);
    let n, a;
    const c = this._getAxisCount();
    if (t.grouped) {
      const u = o ? this._getStackCount(e) : t.stackCount, d = r.barThickness === "flex" ? oh(e, t, r, u * c) : nh(e, t, r, u * c), f = this.chart.options.indexAxis === "x" ? this.getDataset().xAxisID : this.getDataset().yAxisID, m = this._getAxis().indexOf(G(f, this.getFirstScaleIdForIndexAxis())), y = this._getStackIndex(this.index, this._cachedMeta.stack, o ? e : void 0) + m;
      n = d.start + d.chunk * y + d.chunk / 2, a = Math.min(l, d.chunk * d.ratio);
    } else
      n = s.getPixelForValue(this.getParsed(e)[s.axis], e), a = Math.min(l, t.min * t.ratio);
    return {
      base: n - a / 2,
      head: n + a / 2,
      center: n,
      size: a
    };
  }
  draw() {
    const e = this._cachedMeta, t = e.vScale, s = e.data, r = s.length;
    let o = 0;
    for (; o < r; ++o)
      this.getParsed(o)[t.axis] !== null && !s[o].hidden && s[o].draw(this._ctx);
  }
}
V(Vi, "id", "bar"), V(Vi, "defaults", {
  datasetElementType: !1,
  dataElementType: "bar",
  categoryPercentage: 0.8,
  barPercentage: 0.9,
  grouped: !0,
  animations: {
    numbers: {
      type: "number",
      properties: [
        "x",
        "y",
        "base",
        "width",
        "height"
      ]
    }
  }
}), V(Vi, "overrides", {
  scales: {
    _index_: {
      type: "category",
      offset: !0,
      grid: {
        offset: !0
      }
    },
    _value_: {
      type: "linear",
      beginAtZero: !0
    }
  }
});
class qi extends Pe {
  initialize() {
    this.enableOptionSharing = !0, super.initialize();
  }
  parsePrimitiveData(e, t, s, r) {
    const o = super.parsePrimitiveData(e, t, s, r);
    for (let l = 0; l < o.length; l++)
      o[l]._custom = this.resolveDataElementOptions(l + s).radius;
    return o;
  }
  parseArrayData(e, t, s, r) {
    const o = super.parseArrayData(e, t, s, r);
    for (let l = 0; l < o.length; l++) {
      const n = t[s + l];
      o[l]._custom = G(n[2], this.resolveDataElementOptions(l + s).radius);
    }
    return o;
  }
  parseObjectData(e, t, s, r) {
    const o = super.parseObjectData(e, t, s, r);
    for (let l = 0; l < o.length; l++) {
      const n = t[s + l];
      o[l]._custom = G(n && n.r && +n.r, this.resolveDataElementOptions(l + s).radius);
    }
    return o;
  }
  getMaxOverflow() {
    const e = this._cachedMeta.data;
    let t = 0;
    for (let s = e.length - 1; s >= 0; --s)
      t = Math.max(t, e[s].size(this.resolveDataElementOptions(s)) / 2);
    return t > 0 && t;
  }
  getLabelAndValue(e) {
    const t = this._cachedMeta, s = this.chart.data.labels || [], { xScale: r, yScale: o } = t, l = this.getParsed(e), n = r.getLabelForValue(l.x), a = o.getLabelForValue(l.y), c = l._custom;
    return {
      label: s[e] || "",
      value: "(" + n + ", " + a + (c ? ", " + c : "") + ")"
    };
  }
  update(e) {
    const t = this._cachedMeta.data;
    this.updateElements(t, 0, t.length, e);
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", { iScale: l, vScale: n } = this._cachedMeta, { sharedOptions: a, includeOptions: c } = this._getSharedOptions(t, r), u = l.axis, d = n.axis;
    for (let f = t; f < t + s; f++) {
      const m = e[f], y = !o && this.getParsed(f), v = {}, h = v[u] = o ? l.getPixelForDecimal(0.5) : l.getPixelForValue(y[u]), p = v[d] = o ? n.getBasePixel() : n.getPixelForValue(y[d]);
      v.skip = isNaN(h) || isNaN(p), c && (v.options = a || this.resolveDataElementOptions(f, m.active ? "active" : r), o && (v.options.radius = 0)), this.updateElement(m, f, v, r);
    }
  }
  resolveDataElementOptions(e, t) {
    const s = this.getParsed(e);
    let r = super.resolveDataElementOptions(e, t);
    r.$shared && (r = Object.assign({}, r, {
      $shared: !1
    }));
    const o = r.radius;
    return t !== "active" && (r.radius = 0), r.radius += G(s && s._custom, o), r;
  }
}
V(qi, "id", "bubble"), V(qi, "defaults", {
  datasetElementType: !1,
  dataElementType: "point",
  animations: {
    numbers: {
      type: "number",
      properties: [
        "x",
        "y",
        "borderWidth",
        "radius"
      ]
    }
  }
}), V(qi, "overrides", {
  scales: {
    x: {
      type: "linear"
    },
    y: {
      type: "linear"
    }
  }
});
function fh(i, e, t) {
  let s = 1, r = 1, o = 0, l = 0;
  if (e < le) {
    const n = i, a = n + e, c = Math.cos(n), u = Math.sin(n), d = Math.cos(a), f = Math.sin(a), m = (_, b, S) => vi(_, n, a, !0) ? 1 : Math.max(b, b * t, S, S * t), y = (_, b, S) => vi(_, n, a, !0) ? -1 : Math.min(b, b * t, S, S * t), v = m(0, c, d), h = m(pe, u, f), p = y(ie, c, d), g = y(ie + pe, u, f);
    s = (v - p) / 2, r = (h - g) / 2, o = -(v + p) / 2, l = -(h + g) / 2;
  }
  return {
    ratioX: s,
    ratioY: r,
    offsetX: o,
    offsetY: l
  };
}
class mt extends Pe {
  constructor(e, t) {
    super(e, t), this.enableOptionSharing = !0, this.innerRadius = void 0, this.outerRadius = void 0, this.offsetX = void 0, this.offsetY = void 0;
  }
  linkScales() {
  }
  parse(e, t) {
    const s = this.getDataset().data, r = this._cachedMeta;
    if (this._parsing === !1)
      r._parsed = s;
    else {
      let o = (a) => +s[a];
      if (te(s[e])) {
        const { key: a = "value" } = this._parsing;
        o = (c) => +nt(s[c], a);
      }
      let l, n;
      for (l = e, n = e + t; l < n; ++l)
        r._parsed[l] = o(l);
    }
  }
  _getRotation() {
    return Te(this.options.rotation - 90);
  }
  _getCircumference() {
    return Te(this.options.circumference);
  }
  _getRotationExtents() {
    let e = le, t = -le;
    for (let s = 0; s < this.chart.data.datasets.length; ++s)
      if (this.chart.isDatasetVisible(s) && this.chart.getDatasetMeta(s).type === this._type) {
        const r = this.chart.getDatasetMeta(s).controller, o = r._getRotation(), l = r._getCircumference();
        e = Math.min(e, o), t = Math.max(t, o + l);
      }
    return {
      rotation: e,
      circumference: t - e
    };
  }
  update(e) {
    const t = this.chart, { chartArea: s } = t, r = this._cachedMeta, o = r.data, l = this.getMaxBorderWidth() + this.getMaxOffset(o) + this.options.spacing, n = Math.max((Math.min(s.width, s.height) - l) / 2, 0), a = Math.min(kl(this.options.cutout, n), 1), c = this._getRingWeight(this.index), { circumference: u, rotation: d } = this._getRotationExtents(), { ratioX: f, ratioY: m, offsetX: y, offsetY: v } = fh(d, u, a), h = (s.width - l) / f, p = (s.height - l) / m, g = Math.max(Math.min(h, p) / 2, 0), _ = Mo(this.options.radius, g), b = Math.max(_ * a, 0), S = (_ - b) / this._getVisibleDatasetWeightTotal();
    this.offsetX = y * _, this.offsetY = v * _, r.total = this.calculateTotal(), this.outerRadius = _ - S * this._getRingWeightOffset(this.index), this.innerRadius = Math.max(this.outerRadius - S * c, 0), this.updateElements(o, 0, o.length, e);
  }
  _circumference(e, t) {
    const s = this.options, r = this._cachedMeta, o = this._getCircumference();
    return t && s.animation.animateRotate || !this.chart.getDataVisibility(e) || r._parsed[e] === null || r.data[e].hidden ? 0 : this.calculateCircumference(r._parsed[e] * o / le);
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", l = this.chart, n = l.chartArea, c = l.options.animation, u = (n.left + n.right) / 2, d = (n.top + n.bottom) / 2, f = o && c.animateScale, m = f ? 0 : this.innerRadius, y = f ? 0 : this.outerRadius, { sharedOptions: v, includeOptions: h } = this._getSharedOptions(t, r);
    let p = this._getRotation(), g;
    for (g = 0; g < t; ++g)
      p += this._circumference(g, o);
    for (g = t; g < t + s; ++g) {
      const _ = this._circumference(g, o), b = e[g], S = {
        x: u + this.offsetX,
        y: d + this.offsetY,
        startAngle: p,
        endAngle: p + _,
        circumference: _,
        outerRadius: y,
        innerRadius: m
      };
      h && (S.options = v || this.resolveDataElementOptions(g, b.active ? "active" : r)), p += _, this.updateElement(b, g, S, r);
    }
  }
  calculateTotal() {
    const e = this._cachedMeta, t = e.data;
    let s = 0, r;
    for (r = 0; r < t.length; r++) {
      const o = e._parsed[r];
      o !== null && !isNaN(o) && this.chart.getDataVisibility(r) && !t[r].hidden && (s += Math.abs(o));
    }
    return s;
  }
  calculateCircumference(e) {
    const t = this._cachedMeta.total;
    return t > 0 && !isNaN(e) ? le * (Math.abs(e) / t) : 0;
  }
  getLabelAndValue(e) {
    const t = this._cachedMeta, s = this.chart, r = s.data.labels || [], o = Ei(t._parsed[e], s.options.locale);
    return {
      label: r[e] || "",
      value: o
    };
  }
  getMaxBorderWidth(e) {
    let t = 0;
    const s = this.chart;
    let r, o, l, n, a;
    if (!e) {
      for (r = 0, o = s.data.datasets.length; r < o; ++r)
        if (s.isDatasetVisible(r)) {
          l = s.getDatasetMeta(r), e = l.data, n = l.controller;
          break;
        }
    }
    if (!e)
      return 0;
    for (r = 0, o = e.length; r < o; ++r)
      a = n.resolveDataElementOptions(r), a.borderAlign !== "inner" && (t = Math.max(t, a.borderWidth || 0, a.hoverBorderWidth || 0));
    return t;
  }
  getMaxOffset(e) {
    let t = 0;
    for (let s = 0, r = e.length; s < r; ++s) {
      const o = this.resolveDataElementOptions(s);
      t = Math.max(t, o.offset || 0, o.hoverOffset || 0);
    }
    return t;
  }
  _getRingWeightOffset(e) {
    let t = 0;
    for (let s = 0; s < e; ++s)
      this.chart.isDatasetVisible(s) && (t += this._getRingWeight(s));
    return t;
  }
  _getRingWeight(e) {
    return Math.max(G(this.chart.data.datasets[e].weight, 1), 0);
  }
  _getVisibleDatasetWeightTotal() {
    return this._getRingWeightOffset(this.chart.data.datasets.length) || 1;
  }
}
V(mt, "id", "doughnut"), V(mt, "defaults", {
  datasetElementType: !1,
  dataElementType: "arc",
  animation: {
    animateRotate: !0,
    animateScale: !1
  },
  animations: {
    numbers: {
      type: "number",
      properties: [
        "circumference",
        "endAngle",
        "innerRadius",
        "outerRadius",
        "startAngle",
        "x",
        "y",
        "offset",
        "borderWidth",
        "spacing"
      ]
    }
  },
  cutout: "50%",
  rotation: 0,
  circumference: 360,
  radius: "100%",
  spacing: 0,
  indexAxis: "r"
}), V(mt, "descriptors", {
  _scriptable: (e) => e !== "spacing",
  _indexable: (e) => e !== "spacing" && !e.startsWith("borderDash") && !e.startsWith("hoverBorderDash")
}), V(mt, "overrides", {
  aspectRatio: 1,
  plugins: {
    legend: {
      labels: {
        generateLabels(e) {
          const t = e.data;
          if (t.labels.length && t.datasets.length) {
            const { labels: { pointStyle: s, color: r } } = e.legend.options;
            return t.labels.map((o, l) => {
              const a = e.getDatasetMeta(0).controller.getStyle(l);
              return {
                text: o,
                fillStyle: a.backgroundColor,
                strokeStyle: a.borderColor,
                fontColor: r,
                lineWidth: a.borderWidth,
                pointStyle: s,
                hidden: !e.getDataVisibility(l),
                index: l
              };
            });
          }
          return [];
        }
      },
      onClick(e, t, s) {
        s.chart.toggleDataVisibility(t.index), s.chart.update();
      }
    }
  }
});
class Ki extends Pe {
  initialize() {
    this.enableOptionSharing = !0, this.supportsDecimation = !0, super.initialize();
  }
  update(e) {
    const t = this._cachedMeta, { dataset: s, data: r = [], _dataset: o } = t, l = this.chart._animationsDisabled;
    let { start: n, count: a } = $o(t, r, l);
    this._drawStart = n, this._drawCount = a, Fo(t) && (n = 0, a = r.length), s._chart = this.chart, s._datasetIndex = this.index, s._decimated = !!o._decimated, s.points = r;
    const c = this.resolveDatasetElementOptions(e);
    this.options.showLine || (c.borderWidth = 0), c.segment = this.options.segment, this.updateElement(s, void 0, {
      animated: !l,
      options: c
    }, e), this.updateElements(r, n, a, e);
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", { iScale: l, vScale: n, _stacked: a, _dataset: c } = this._cachedMeta, { sharedOptions: u, includeOptions: d } = this._getSharedOptions(t, r), f = l.axis, m = n.axis, { spanGaps: y, segment: v } = this.options, h = $t(y) ? y : Number.POSITIVE_INFINITY, p = this.chart._animationsDisabled || o || r === "none", g = t + s, _ = e.length;
    let b = t > 0 && this.getParsed(t - 1);
    for (let S = 0; S < _; ++S) {
      const w = e[S], k = p ? w : {};
      if (S < t || S >= g) {
        k.skip = !0;
        continue;
      }
      const x = this.getParsed(S), C = ee(x[m]), A = k[f] = l.getPixelForValue(x[f], S), L = k[m] = o || C ? n.getBasePixel() : n.getPixelForValue(a ? this.applyStack(n, x, a) : x[m], S);
      k.skip = isNaN(A) || isNaN(L) || C, k.stop = S > 0 && Math.abs(x[f] - b[f]) > h, v && (k.parsed = x, k.raw = c.data[S]), d && (k.options = u || this.resolveDataElementOptions(S, w.active ? "active" : r)), p || this.updateElement(w, S, k, r), b = x;
    }
  }
  getMaxOverflow() {
    const e = this._cachedMeta, t = e.dataset, s = t.options && t.options.borderWidth || 0, r = e.data || [];
    if (!r.length)
      return s;
    const o = r[0].size(this.resolveDataElementOptions(0)), l = r[r.length - 1].size(this.resolveDataElementOptions(r.length - 1));
    return Math.max(s, o, l) / 2;
  }
  draw() {
    const e = this._cachedMeta;
    e.dataset.updateControlPoints(this.chart.chartArea, e.iScale.axis), super.draw();
  }
}
V(Ki, "id", "line"), V(Ki, "defaults", {
  datasetElementType: "line",
  dataElementType: "point",
  showLine: !0,
  spanGaps: !1
}), V(Ki, "overrides", {
  scales: {
    _index_: {
      type: "category"
    },
    _value_: {
      type: "linear"
    }
  }
});
class di extends Pe {
  constructor(e, t) {
    super(e, t), this.innerRadius = void 0, this.outerRadius = void 0;
  }
  getLabelAndValue(e) {
    const t = this._cachedMeta, s = this.chart, r = s.data.labels || [], o = Ei(t._parsed[e].r, s.options.locale);
    return {
      label: r[e] || "",
      value: o
    };
  }
  parseObjectData(e, t, s, r) {
    return qo.bind(this)(e, t, s, r);
  }
  update(e) {
    const t = this._cachedMeta.data;
    this._updateRadius(), this.updateElements(t, 0, t.length, e);
  }
  getMinMax() {
    const e = this._cachedMeta, t = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    };
    return e.data.forEach((s, r) => {
      const o = this.getParsed(r).r;
      !isNaN(o) && this.chart.getDataVisibility(r) && (o < t.min && (t.min = o), o > t.max && (t.max = o));
    }), t;
  }
  _updateRadius() {
    const e = this.chart, t = e.chartArea, s = e.options, r = Math.min(t.right - t.left, t.bottom - t.top), o = Math.max(r / 2, 0), l = Math.max(s.cutoutPercentage ? o / 100 * s.cutoutPercentage : 1, 0), n = (o - l) / e.getVisibleDatasetCount();
    this.outerRadius = o - n * this.index, this.innerRadius = this.outerRadius - n;
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", l = this.chart, a = l.options.animation, c = this._cachedMeta.rScale, u = c.xCenter, d = c.yCenter, f = c.getIndexAngle(0) - 0.5 * ie;
    let m = f, y;
    const v = 360 / this.countVisibleElements();
    for (y = 0; y < t; ++y)
      m += this._computeAngle(y, r, v);
    for (y = t; y < t + s; y++) {
      const h = e[y];
      let p = m, g = m + this._computeAngle(y, r, v), _ = l.getDataVisibility(y) ? c.getDistanceFromCenterForValue(this.getParsed(y).r) : 0;
      m = g, o && (a.animateScale && (_ = 0), a.animateRotate && (p = g = f));
      const b = {
        x: u,
        y: d,
        innerRadius: 0,
        outerRadius: _,
        startAngle: p,
        endAngle: g,
        options: this.resolveDataElementOptions(y, h.active ? "active" : r)
      };
      this.updateElement(h, y, b, r);
    }
  }
  countVisibleElements() {
    const e = this._cachedMeta;
    let t = 0;
    return e.data.forEach((s, r) => {
      !isNaN(this.getParsed(r).r) && this.chart.getDataVisibility(r) && t++;
    }), t;
  }
  _computeAngle(e, t, s) {
    return this.chart.getDataVisibility(e) ? Te(this.resolveDataElementOptions(e, t).angle || s) : 0;
  }
}
V(di, "id", "polarArea"), V(di, "defaults", {
  dataElementType: "arc",
  animation: {
    animateRotate: !0,
    animateScale: !0
  },
  animations: {
    numbers: {
      type: "number",
      properties: [
        "x",
        "y",
        "startAngle",
        "endAngle",
        "innerRadius",
        "outerRadius"
      ]
    }
  },
  indexAxis: "r",
  startAngle: 0
}), V(di, "overrides", {
  aspectRatio: 1,
  plugins: {
    legend: {
      labels: {
        generateLabels(e) {
          const t = e.data;
          if (t.labels.length && t.datasets.length) {
            const { labels: { pointStyle: s, color: r } } = e.legend.options;
            return t.labels.map((o, l) => {
              const a = e.getDatasetMeta(0).controller.getStyle(l);
              return {
                text: o,
                fillStyle: a.backgroundColor,
                strokeStyle: a.borderColor,
                fontColor: r,
                lineWidth: a.borderWidth,
                pointStyle: s,
                hidden: !e.getDataVisibility(l),
                index: l
              };
            });
          }
          return [];
        }
      },
      onClick(e, t, s) {
        s.chart.toggleDataVisibility(t.index), s.chart.update();
      }
    }
  },
  scales: {
    r: {
      type: "radialLinear",
      angleLines: {
        display: !1
      },
      beginAtZero: !0,
      grid: {
        circular: !0
      },
      pointLabels: {
        display: !1
      },
      startAngle: 0
    }
  }
});
class qs extends mt {
}
V(qs, "id", "pie"), V(qs, "defaults", {
  cutout: 0,
  rotation: 0,
  circumference: 360,
  radius: "100%"
});
class Yi extends Pe {
  getLabelAndValue(e) {
    const t = this._cachedMeta.vScale, s = this.getParsed(e);
    return {
      label: t.getLabels()[e],
      value: "" + t.getLabelForValue(s[t.axis])
    };
  }
  parseObjectData(e, t, s, r) {
    return qo.bind(this)(e, t, s, r);
  }
  update(e) {
    const t = this._cachedMeta, s = t.dataset, r = t.data || [], o = t.iScale.getLabels();
    if (s.points = r, e !== "resize") {
      const l = this.resolveDatasetElementOptions(e);
      this.options.showLine || (l.borderWidth = 0);
      const n = {
        _loop: !0,
        _fullLoop: o.length === r.length,
        options: l
      };
      this.updateElement(s, void 0, n, e);
    }
    this.updateElements(r, 0, r.length, e);
  }
  updateElements(e, t, s, r) {
    const o = this._cachedMeta.rScale, l = r === "reset";
    for (let n = t; n < t + s; n++) {
      const a = e[n], c = this.resolveDataElementOptions(n, a.active ? "active" : r), u = o.getPointPositionForValue(n, this.getParsed(n).r), d = l ? o.xCenter : u.x, f = l ? o.yCenter : u.y, m = {
        x: d,
        y: f,
        angle: u.angle,
        skip: isNaN(d) || isNaN(f),
        options: c
      };
      this.updateElement(a, n, m, r);
    }
  }
}
V(Yi, "id", "radar"), V(Yi, "defaults", {
  datasetElementType: "line",
  dataElementType: "point",
  indexAxis: "r",
  showLine: !0,
  elements: {
    line: {
      fill: "start"
    }
  }
}), V(Yi, "overrides", {
  aspectRatio: 1,
  scales: {
    r: {
      type: "radialLinear"
    }
  }
});
class Xi extends Pe {
  getLabelAndValue(e) {
    const t = this._cachedMeta, s = this.chart.data.labels || [], { xScale: r, yScale: o } = t, l = this.getParsed(e), n = r.getLabelForValue(l.x), a = o.getLabelForValue(l.y);
    return {
      label: s[e] || "",
      value: "(" + n + ", " + a + ")"
    };
  }
  update(e) {
    const t = this._cachedMeta, { data: s = [] } = t, r = this.chart._animationsDisabled;
    let { start: o, count: l } = $o(t, s, r);
    if (this._drawStart = o, this._drawCount = l, Fo(t) && (o = 0, l = s.length), this.options.showLine) {
      this.datasetElementType || this.addElements();
      const { dataset: n, _dataset: a } = t;
      n._chart = this.chart, n._datasetIndex = this.index, n._decimated = !!a._decimated, n.points = s;
      const c = this.resolveDatasetElementOptions(e);
      c.segment = this.options.segment, this.updateElement(n, void 0, {
        animated: !r,
        options: c
      }, e);
    } else this.datasetElementType && (delete t.dataset, this.datasetElementType = !1);
    this.updateElements(s, o, l, e);
  }
  addElements() {
    const { showLine: e } = this.options;
    !this.datasetElementType && e && (this.datasetElementType = this.chart.registry.getElement("line")), super.addElements();
  }
  updateElements(e, t, s, r) {
    const o = r === "reset", { iScale: l, vScale: n, _stacked: a, _dataset: c } = this._cachedMeta, u = this.resolveDataElementOptions(t, r), d = this.getSharedOptions(u), f = this.includeOptions(r, d), m = l.axis, y = n.axis, { spanGaps: v, segment: h } = this.options, p = $t(v) ? v : Number.POSITIVE_INFINITY, g = this.chart._animationsDisabled || o || r === "none";
    let _ = t > 0 && this.getParsed(t - 1);
    for (let b = t; b < t + s; ++b) {
      const S = e[b], w = this.getParsed(b), k = g ? S : {}, x = ee(w[y]), C = k[m] = l.getPixelForValue(w[m], b), A = k[y] = o || x ? n.getBasePixel() : n.getPixelForValue(a ? this.applyStack(n, w, a) : w[y], b);
      k.skip = isNaN(C) || isNaN(A) || x, k.stop = b > 0 && Math.abs(w[m] - _[m]) > p, h && (k.parsed = w, k.raw = c.data[b]), f && (k.options = d || this.resolveDataElementOptions(b, S.active ? "active" : r)), g || this.updateElement(S, b, k, r), _ = w;
    }
    this.updateSharedOptions(d, r, u);
  }
  getMaxOverflow() {
    const e = this._cachedMeta, t = e.data || [];
    if (!this.options.showLine) {
      let n = 0;
      for (let a = t.length - 1; a >= 0; --a)
        n = Math.max(n, t[a].size(this.resolveDataElementOptions(a)) / 2);
      return n > 0 && n;
    }
    const s = e.dataset, r = s.options && s.options.borderWidth || 0;
    if (!t.length)
      return r;
    const o = t[0].size(this.resolveDataElementOptions(0)), l = t[t.length - 1].size(this.resolveDataElementOptions(t.length - 1));
    return Math.max(r, o, l) / 2;
  }
}
V(Xi, "id", "scatter"), V(Xi, "defaults", {
  datasetElementType: !1,
  dataElementType: "point",
  showLine: !1,
  fill: !1
}), V(Xi, "overrides", {
  interaction: {
    mode: "point"
  },
  scales: {
    x: {
      type: "linear"
    },
    y: {
      type: "linear"
    }
  }
});
var ph = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  BarController: Vi,
  BubbleController: qi,
  DoughnutController: mt,
  LineController: Ki,
  PieController: qs,
  PolarAreaController: di,
  RadarController: Yi,
  ScatterController: Xi
});
function ut() {
  throw new Error("This method is not implemented: Check that a complete date adapter is provided.");
}
class Cr {
  constructor(e) {
    V(this, "options");
    this.options = e || {};
  }
  /**
  * Override default date adapter methods.
  * Accepts type parameter to define options type.
  * @example
  * Chart._adapters._date.override<{myAdapterOption: string}>({
  *   init() {
  *     console.log(this.options.myAdapterOption);
  *   }
  * })
  */
  static override(e) {
    Object.assign(Cr.prototype, e);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  init() {
  }
  formats() {
    return ut();
  }
  parse() {
    return ut();
  }
  format() {
    return ut();
  }
  add() {
    return ut();
  }
  diff() {
    return ut();
  }
  startOf() {
    return ut();
  }
  endOf() {
    return ut();
  }
}
var gh = {
  _date: Cr
};
function _h(i, e, t, s) {
  const { controller: r, data: o, _sorted: l } = i, n = r._cachedMeta.iScale, a = i.dataset && i.dataset.options ? i.dataset.options.spanGaps : null;
  if (n && e === n.axis && e !== "r" && l && o.length) {
    const c = n._reversePixels ? Fl : Ye;
    if (s) {
      if (r._sharedOptions) {
        const u = o[0], d = typeof u.getRange == "function" && u.getRange(e);
        if (d) {
          const f = c(o, e, t - d), m = c(o, e, t + d);
          return {
            lo: f.lo,
            hi: m.hi
          };
        }
      }
    } else {
      const u = c(o, e, t);
      if (a) {
        const { vScale: d } = r._cachedMeta, { _parsed: f } = i, m = f.slice(0, u.lo + 1).reverse().findIndex((v) => !ee(v[d.axis]));
        u.lo -= Math.max(0, m);
        const y = f.slice(u.hi).findIndex((v) => !ee(v[d.axis]));
        u.hi += Math.max(0, y);
      }
      return u;
    }
  }
  return {
    lo: 0,
    hi: o.length - 1
  };
}
function gs(i, e, t, s, r) {
  const o = i.getSortedVisibleDatasetMetas(), l = t[e];
  for (let n = 0, a = o.length; n < a; ++n) {
    const { index: c, data: u } = o[n], { lo: d, hi: f } = _h(o[n], e, l, r);
    for (let m = d; m <= f; ++m) {
      const y = u[m];
      y.skip || s(y, c, m);
    }
  }
}
function mh(i) {
  const e = i.indexOf("x") !== -1, t = i.indexOf("y") !== -1;
  return function(s, r) {
    const o = e ? Math.abs(s.x - r.x) : 0, l = t ? Math.abs(s.y - r.y) : 0;
    return Math.sqrt(Math.pow(o, 2) + Math.pow(l, 2));
  };
}
function Bs(i, e, t, s, r) {
  const o = [];
  return !r && !i.isPointInArea(e) || gs(i, t, e, function(n, a, c) {
    !r && !Xe(n, i.chartArea, 0) || n.inRange(e.x, e.y, s) && o.push({
      element: n,
      datasetIndex: a,
      index: c
    });
  }, !0), o;
}
function vh(i, e, t, s) {
  let r = [];
  function o(l, n, a) {
    const { startAngle: c, endAngle: u } = l.getProps([
      "startAngle",
      "endAngle"
    ], s), { angle: d } = To(l, {
      x: e.x,
      y: e.y
    });
    vi(d, c, u) && r.push({
      element: l,
      datasetIndex: n,
      index: a
    });
  }
  return gs(i, t, e, o), r;
}
function bh(i, e, t, s, r, o) {
  let l = [];
  const n = mh(t);
  let a = Number.POSITIVE_INFINITY;
  function c(u, d, f) {
    const m = u.inRange(e.x, e.y, r);
    if (s && !m)
      return;
    const y = u.getCenterPoint(r);
    if (!(!!o || i.isPointInArea(y)) && !m)
      return;
    const h = n(e, y);
    h < a ? (l = [
      {
        element: u,
        datasetIndex: d,
        index: f
      }
    ], a = h) : h === a && l.push({
      element: u,
      datasetIndex: d,
      index: f
    });
  }
  return gs(i, t, e, c), l;
}
function Is(i, e, t, s, r, o) {
  return !o && !i.isPointInArea(e) ? [] : t === "r" && !s ? vh(i, e, t, r) : bh(i, e, t, s, r, o);
}
function Dn(i, e, t, s, r) {
  const o = [], l = t === "x" ? "inXRange" : "inYRange";
  let n = !1;
  return gs(i, t, e, (a, c, u) => {
    a[l] && a[l](e[t], r) && (o.push({
      element: a,
      datasetIndex: c,
      index: u
    }), n = n || a.inRange(e.x, e.y, r));
  }), s && !n ? [] : o;
}
var yh = {
  modes: {
    index(i, e, t, s) {
      const r = pt(e, i), o = t.axis || "x", l = t.includeInvisible || !1, n = t.intersect ? Bs(i, r, o, s, l) : Is(i, r, o, !1, s, l), a = [];
      return n.length ? (i.getSortedVisibleDatasetMetas().forEach((c) => {
        const u = n[0].index, d = c.data[u];
        d && !d.skip && a.push({
          element: d,
          datasetIndex: c.index,
          index: u
        });
      }), a) : [];
    },
    dataset(i, e, t, s) {
      const r = pt(e, i), o = t.axis || "xy", l = t.includeInvisible || !1;
      let n = t.intersect ? Bs(i, r, o, s, l) : Is(i, r, o, !1, s, l);
      if (n.length > 0) {
        const a = n[0].datasetIndex, c = i.getDatasetMeta(a).data;
        n = [];
        for (let u = 0; u < c.length; ++u)
          n.push({
            element: c[u],
            datasetIndex: a,
            index: u
          });
      }
      return n;
    },
    point(i, e, t, s) {
      const r = pt(e, i), o = t.axis || "xy", l = t.includeInvisible || !1;
      return Bs(i, r, o, s, l);
    },
    nearest(i, e, t, s) {
      const r = pt(e, i), o = t.axis || "xy", l = t.includeInvisible || !1;
      return Is(i, r, o, t.intersect, s, l);
    },
    x(i, e, t, s) {
      const r = pt(e, i);
      return Dn(i, r, "x", t.intersect, s);
    },
    y(i, e, t, s) {
      const r = pt(e, i);
      return Dn(i, r, "y", t.intersect, s);
    }
  }
};
const sa = [
  "left",
  "top",
  "right",
  "bottom"
];
function Xt(i, e) {
  return i.filter((t) => t.pos === e);
}
function An(i, e) {
  return i.filter((t) => sa.indexOf(t.pos) === -1 && t.box.axis === e);
}
function Gt(i, e) {
  return i.sort((t, s) => {
    const r = e ? s : t, o = e ? t : s;
    return r.weight === o.weight ? r.index - o.index : r.weight - o.weight;
  });
}
function Sh(i) {
  const e = [];
  let t, s, r, o, l, n;
  for (t = 0, s = (i || []).length; t < s; ++t)
    r = i[t], { position: o, options: { stack: l, stackWeight: n = 1 } } = r, e.push({
      index: t,
      box: r,
      pos: o,
      horizontal: r.isHorizontal(),
      weight: r.weight,
      stack: l && o + l,
      stackWeight: n
    });
  return e;
}
function xh(i) {
  const e = {};
  for (const t of i) {
    const { stack: s, pos: r, stackWeight: o } = t;
    if (!s || !sa.includes(r))
      continue;
    const l = e[s] || (e[s] = {
      count: 0,
      placed: 0,
      weight: 0,
      size: 0
    });
    l.count++, l.weight += o;
  }
  return e;
}
function wh(i, e) {
  const t = xh(i), { vBoxMaxWidth: s, hBoxMaxHeight: r } = e;
  let o, l, n;
  for (o = 0, l = i.length; o < l; ++o) {
    n = i[o];
    const { fullSize: a } = n.box, c = t[n.stack], u = c && n.stackWeight / c.weight;
    n.horizontal ? (n.width = u ? u * s : a && e.availableWidth, n.height = r) : (n.width = s, n.height = u ? u * r : a && e.availableHeight);
  }
  return t;
}
function Ch(i) {
  const e = Sh(i), t = Gt(e.filter((c) => c.box.fullSize), !0), s = Gt(Xt(e, "left"), !0), r = Gt(Xt(e, "right")), o = Gt(Xt(e, "top"), !0), l = Gt(Xt(e, "bottom")), n = An(e, "x"), a = An(e, "y");
  return {
    fullSize: t,
    leftAndTop: s.concat(o),
    rightAndBottom: r.concat(a).concat(l).concat(n),
    chartArea: Xt(e, "chartArea"),
    vertical: s.concat(r).concat(a),
    horizontal: o.concat(l).concat(n)
  };
}
function Mn(i, e, t, s) {
  return Math.max(i[t], e[t]) + Math.max(i[s], e[s]);
}
function ra(i, e) {
  i.top = Math.max(i.top, e.top), i.left = Math.max(i.left, e.left), i.bottom = Math.max(i.bottom, e.bottom), i.right = Math.max(i.right, e.right);
}
function kh(i, e, t, s) {
  const { pos: r, box: o } = t, l = i.maxPadding;
  if (!te(r)) {
    t.size && (i[r] -= t.size);
    const d = s[t.stack] || {
      size: 0,
      count: 1
    };
    d.size = Math.max(d.size, t.horizontal ? o.height : o.width), t.size = d.size / d.count, i[r] += t.size;
  }
  o.getPadding && ra(l, o.getPadding());
  const n = Math.max(0, e.outerWidth - Mn(l, i, "left", "right")), a = Math.max(0, e.outerHeight - Mn(l, i, "top", "bottom")), c = n !== i.w, u = a !== i.h;
  return i.w = n, i.h = a, t.horizontal ? {
    same: c,
    other: u
  } : {
    same: u,
    other: c
  };
}
function Eh(i) {
  const e = i.maxPadding;
  function t(s) {
    const r = Math.max(e[s] - i[s], 0);
    return i[s] += r, r;
  }
  i.y += t("top"), i.x += t("left"), t("right"), t("bottom");
}
function Dh(i, e) {
  const t = e.maxPadding;
  function s(r) {
    const o = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    };
    return r.forEach((l) => {
      o[l] = Math.max(e[l], t[l]);
    }), o;
  }
  return s(i ? [
    "left",
    "right"
  ] : [
    "top",
    "bottom"
  ]);
}
function ti(i, e, t, s) {
  const r = [];
  let o, l, n, a, c, u;
  for (o = 0, l = i.length, c = 0; o < l; ++o) {
    n = i[o], a = n.box, a.update(n.width || e.w, n.height || e.h, Dh(n.horizontal, e));
    const { same: d, other: f } = kh(e, t, n, s);
    c |= d && r.length, u = u || f, a.fullSize || r.push(n);
  }
  return c && ti(r, e, t, s) || u;
}
function $i(i, e, t, s, r) {
  i.top = t, i.left = e, i.right = e + s, i.bottom = t + r, i.width = s, i.height = r;
}
function Ln(i, e, t, s) {
  const r = t.padding;
  let { x: o, y: l } = e;
  for (const n of i) {
    const a = n.box, c = s[n.stack] || {
      placed: 0,
      weight: 1
    }, u = n.stackWeight / c.weight || 1;
    if (n.horizontal) {
      const d = e.w * u, f = c.size || a.height;
      mi(c.start) && (l = c.start), a.fullSize ? $i(a, r.left, l, t.outerWidth - r.right - r.left, f) : $i(a, e.left + c.placed, l, d, f), c.start = l, c.placed += d, l = a.bottom;
    } else {
      const d = e.h * u, f = c.size || a.width;
      mi(c.start) && (o = c.start), a.fullSize ? $i(a, o, r.top, f, t.outerHeight - r.bottom - r.top) : $i(a, o, e.top + c.placed, f, d), c.start = o, c.placed += d, o = a.right;
    }
  }
  e.x = o, e.y = l;
}
var Se = {
  addBox(i, e) {
    i.boxes || (i.boxes = []), e.fullSize = e.fullSize || !1, e.position = e.position || "top", e.weight = e.weight || 0, e._layers = e._layers || function() {
      return [
        {
          z: 0,
          draw(t) {
            e.draw(t);
          }
        }
      ];
    }, i.boxes.push(e);
  },
  removeBox(i, e) {
    const t = i.boxes ? i.boxes.indexOf(e) : -1;
    t !== -1 && i.boxes.splice(t, 1);
  },
  configure(i, e, t) {
    e.fullSize = t.fullSize, e.position = t.position, e.weight = t.weight;
  },
  update(i, e, t, s) {
    if (!i)
      return;
    const r = xe(i.options.layout.padding), o = Math.max(e - r.width, 0), l = Math.max(t - r.height, 0), n = Ch(i.boxes), a = n.vertical, c = n.horizontal;
    ne(i.boxes, (v) => {
      typeof v.beforeLayout == "function" && v.beforeLayout();
    });
    const u = a.reduce((v, h) => h.box.options && h.box.options.display === !1 ? v : v + 1, 0) || 1, d = Object.freeze({
      outerWidth: e,
      outerHeight: t,
      padding: r,
      availableWidth: o,
      availableHeight: l,
      vBoxMaxWidth: o / 2 / u,
      hBoxMaxHeight: l / 2
    }), f = Object.assign({}, r);
    ra(f, xe(s));
    const m = Object.assign({
      maxPadding: f,
      w: o,
      h: l,
      x: r.left,
      y: r.top
    }, r), y = wh(a.concat(c), d);
    ti(n.fullSize, m, d, y), ti(a, m, d, y), ti(c, m, d, y) && ti(a, m, d, y), Eh(m), Ln(n.leftAndTop, m, d, y), m.x += m.w, m.y += m.h, Ln(n.rightAndBottom, m, d, y), i.chartArea = {
      left: m.left,
      top: m.top,
      right: m.left + m.w,
      bottom: m.top + m.h,
      height: m.h,
      width: m.w
    }, ne(n.chartArea, (v) => {
      const h = v.box;
      Object.assign(h, i.chartArea), h.update(m.w, m.h, {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      });
    });
  }
};
class na {
  acquireContext(e, t) {
  }
  releaseContext(e) {
    return !1;
  }
  addEventListener(e, t, s) {
  }
  removeEventListener(e, t, s) {
  }
  getDevicePixelRatio() {
    return 1;
  }
  getMaximumSize(e, t, s, r) {
    return t = Math.max(0, t || e.width), s = s || e.height, {
      width: t,
      height: Math.max(0, r ? Math.floor(t / r) : s)
    };
  }
  isAttached(e) {
    return !0;
  }
  updateConfig(e) {
  }
}
class Ah extends na {
  acquireContext(e) {
    return e && e.getContext && e.getContext("2d") || null;
  }
  updateConfig(e) {
    e.options.animation = !1;
  }
}
const Gi = "$chartjs", Mh = {
  touchstart: "mousedown",
  touchmove: "mousemove",
  touchend: "mouseup",
  pointerenter: "mouseenter",
  pointerdown: "mousedown",
  pointermove: "mousemove",
  pointerup: "mouseup",
  pointerleave: "mouseout",
  pointerout: "mouseout"
}, Rn = (i) => i === null || i === "";
function Lh(i, e) {
  const t = i.style, s = i.getAttribute("height"), r = i.getAttribute("width");
  if (i[Gi] = {
    initial: {
      height: s,
      width: r,
      style: {
        display: t.display,
        height: t.height,
        width: t.width
      }
    }
  }, t.display = t.display || "block", t.boxSizing = t.boxSizing || "border-box", Rn(r)) {
    const o = pn(i, "width");
    o !== void 0 && (i.width = o);
  }
  if (Rn(s))
    if (i.style.height === "")
      i.height = i.width / (e || 2);
    else {
      const o = pn(i, "height");
      o !== void 0 && (i.height = o);
    }
  return i;
}
const oa = Rc ? {
  passive: !0
} : !1;
function Rh(i, e, t) {
  i && i.addEventListener(e, t, oa);
}
function Th(i, e, t) {
  i && i.canvas && i.canvas.removeEventListener(e, t, oa);
}
function Ph(i, e) {
  const t = Mh[i.type] || i.type, { x: s, y: r } = pt(i, e);
  return {
    type: t,
    chart: e,
    native: i,
    x: s !== void 0 ? s : null,
    y: r !== void 0 ? r : null
  };
}
function as(i, e) {
  for (const t of i)
    if (t === e || t.contains(e))
      return !0;
}
function Oh(i, e, t) {
  const s = i.canvas, r = new MutationObserver((o) => {
    let l = !1;
    for (const n of o)
      l = l || as(n.addedNodes, s), l = l && !as(n.removedNodes, s);
    l && t();
  });
  return r.observe(document, {
    childList: !0,
    subtree: !0
  }), r;
}
function Bh(i, e, t) {
  const s = i.canvas, r = new MutationObserver((o) => {
    let l = !1;
    for (const n of o)
      l = l || as(n.removedNodes, s), l = l && !as(n.addedNodes, s);
    l && t();
  });
  return r.observe(document, {
    childList: !0,
    subtree: !0
  }), r;
}
const yi = /* @__PURE__ */ new Map();
let Tn = 0;
function aa() {
  const i = window.devicePixelRatio;
  i !== Tn && (Tn = i, yi.forEach((e, t) => {
    t.currentDevicePixelRatio !== i && e();
  }));
}
function Ih(i, e) {
  yi.size || window.addEventListener("resize", aa), yi.set(i, e);
}
function $h(i) {
  yi.delete(i), yi.size || window.removeEventListener("resize", aa);
}
function Fh(i, e, t) {
  const s = i.canvas, r = s && wr(s);
  if (!r)
    return;
  const o = Io((n, a) => {
    const c = r.clientWidth;
    t(n, a), c < r.clientWidth && t();
  }, window), l = new ResizeObserver((n) => {
    const a = n[0], c = a.contentRect.width, u = a.contentRect.height;
    c === 0 && u === 0 || o(c, u);
  });
  return l.observe(r), Ih(i, o), l;
}
function $s(i, e, t) {
  t && t.disconnect(), e === "resize" && $h(i);
}
function Hh(i, e, t) {
  const s = i.canvas, r = Io((o) => {
    i.ctx !== null && t(Ph(o, i));
  }, i);
  return Rh(s, e, r), r;
}
class zh extends na {
  acquireContext(e, t) {
    const s = e && e.getContext && e.getContext("2d");
    return s && s.canvas === e ? (Lh(e, t), s) : null;
  }
  releaseContext(e) {
    const t = e.canvas;
    if (!t[Gi])
      return !1;
    const s = t[Gi].initial;
    [
      "height",
      "width"
    ].forEach((o) => {
      const l = s[o];
      ee(l) ? t.removeAttribute(o) : t.setAttribute(o, l);
    });
    const r = s.style || {};
    return Object.keys(r).forEach((o) => {
      t.style[o] = r[o];
    }), t.width = t.width, delete t[Gi], !0;
  }
  addEventListener(e, t, s) {
    this.removeEventListener(e, t);
    const r = e.$proxies || (e.$proxies = {}), l = {
      attach: Oh,
      detach: Bh,
      resize: Fh
    }[t] || Hh;
    r[t] = l(e, t, s);
  }
  removeEventListener(e, t) {
    const s = e.$proxies || (e.$proxies = {}), r = s[t];
    if (!r)
      return;
    ({
      attach: $s,
      detach: $s,
      resize: $s
    }[t] || Th)(e, t, r), s[t] = void 0;
  }
  getDevicePixelRatio() {
    return window.devicePixelRatio;
  }
  getMaximumSize(e, t, s, r) {
    return Lc(e, t, s, r);
  }
  isAttached(e) {
    const t = e && wr(e);
    return !!(t && t.isConnected);
  }
}
function Wh(i) {
  return !xr() || typeof OffscreenCanvas < "u" && i instanceof OffscreenCanvas ? Ah : zh;
}
class Oe {
  constructor() {
    V(this, "x");
    V(this, "y");
    V(this, "active", !1);
    V(this, "options");
    V(this, "$animations");
  }
  tooltipPosition(e) {
    const { x: t, y: s } = this.getProps([
      "x",
      "y"
    ], e);
    return {
      x: t,
      y: s
    };
  }
  hasValue() {
    return $t(this.x) && $t(this.y);
  }
  getProps(e, t) {
    const s = this.$animations;
    if (!t || !s)
      return this;
    const r = {};
    return e.forEach((o) => {
      r[o] = s[o] && s[o].active() ? s[o]._to : this[o];
    }), r;
  }
}
V(Oe, "defaults", {}), V(Oe, "defaultRoutes");
function Nh(i, e) {
  const t = i.options.ticks, s = Uh(i), r = Math.min(t.maxTicksLimit || s, s), o = t.major.enabled ? Vh(e) : [], l = o.length, n = o[0], a = o[l - 1], c = [];
  if (l > r)
    return qh(e, c, o, l / r), c;
  const u = jh(o, e, r);
  if (l > 0) {
    let d, f;
    const m = l > 1 ? Math.round((a - n) / (l - 1)) : null;
    for (Fi(e, c, u, ee(m) ? 0 : n - m, n), d = 0, f = l - 1; d < f; d++)
      Fi(e, c, u, o[d], o[d + 1]);
    return Fi(e, c, u, a, ee(m) ? e.length : a + m), c;
  }
  return Fi(e, c, u), c;
}
function Uh(i) {
  const e = i.options.offset, t = i._tickSize(), s = i._length / t + (e ? 0 : 1), r = i._maxLength / t;
  return Math.floor(Math.min(s, r));
}
function jh(i, e, t) {
  const s = Kh(i), r = e.length / t;
  if (!s)
    return Math.max(r, 1);
  const o = Pl(s);
  for (let l = 0, n = o.length - 1; l < n; l++) {
    const a = o[l];
    if (a > r)
      return a;
  }
  return Math.max(r, 1);
}
function Vh(i) {
  const e = [];
  let t, s;
  for (t = 0, s = i.length; t < s; t++)
    i[t].major && e.push(t);
  return e;
}
function qh(i, e, t, s) {
  let r = 0, o = t[0], l;
  for (s = Math.ceil(s), l = 0; l < i.length; l++)
    l === o && (e.push(i[l]), r++, o = t[r * s]);
}
function Fi(i, e, t, s, r) {
  const o = G(s, 0), l = Math.min(G(r, i.length), i.length);
  let n = 0, a, c, u;
  for (t = Math.ceil(t), r && (a = r - s, t = a / Math.floor(a / t)), u = o; u < 0; )
    n++, u = Math.round(o + n * t);
  for (c = Math.max(o, 0); c < l; c++)
    c === u && (e.push(i[c]), n++, u = Math.round(o + n * t));
}
function Kh(i) {
  const e = i.length;
  let t, s;
  if (e < 2)
    return !1;
  for (s = i[0], t = 1; t < e; ++t)
    if (i[t] - i[t - 1] !== s)
      return !1;
  return s;
}
const Yh = (i) => i === "left" ? "right" : i === "right" ? "left" : i, Pn = (i, e, t) => e === "top" || e === "left" ? i[e] + t : i[e] - t, On = (i, e) => Math.min(e || i, i);
function Bn(i, e) {
  const t = [], s = i.length / e, r = i.length;
  let o = 0;
  for (; o < r; o += s)
    t.push(i[Math.floor(o)]);
  return t;
}
function Xh(i, e, t) {
  const s = i.ticks.length, r = Math.min(e, s - 1), o = i._startPixel, l = i._endPixel, n = 1e-6;
  let a = i.getPixelForTick(r), c;
  if (!(t && (s === 1 ? c = Math.max(a - o, l - a) : e === 0 ? c = (i.getPixelForTick(1) - a) / 2 : c = (a - i.getPixelForTick(r - 1)) / 2, a += r < e ? c : -c, a < o - n || a > l + n)))
    return a;
}
function Gh(i, e) {
  ne(i, (t) => {
    const s = t.gc, r = s.length / 2;
    let o;
    if (r > e) {
      for (o = 0; o < r; ++o)
        delete t.data[s[o]];
      s.splice(0, r);
    }
  });
}
function Jt(i) {
  return i.drawTicks ? i.tickLength : 0;
}
function In(i, e) {
  if (!i.display)
    return 0;
  const t = ge(i.font, e), s = xe(i.padding);
  return (ce(i.text) ? i.text.length : 1) * t.lineHeight + s.height;
}
function Jh(i, e) {
  return lt(i, {
    scale: e,
    type: "scale"
  });
}
function Zh(i, e, t) {
  return lt(i, {
    tick: t,
    index: e,
    type: "tick"
  });
}
function Qh(i, e, t) {
  let s = _r(i);
  return (t && e !== "right" || !t && e === "right") && (s = Yh(s)), s;
}
function ed(i, e, t, s) {
  const { top: r, left: o, bottom: l, right: n, chart: a } = i, { chartArea: c, scales: u } = a;
  let d = 0, f, m, y;
  const v = l - r, h = n - o;
  if (i.isHorizontal()) {
    if (m = be(s, o, n), te(t)) {
      const p = Object.keys(t)[0], g = t[p];
      y = u[p].getPixelForValue(g) + v - e;
    } else t === "center" ? y = (c.bottom + c.top) / 2 + v - e : y = Pn(i, t, e);
    f = n - o;
  } else {
    if (te(t)) {
      const p = Object.keys(t)[0], g = t[p];
      m = u[p].getPixelForValue(g) - h + e;
    } else t === "center" ? m = (c.left + c.right) / 2 - h + e : m = Pn(i, t, e);
    y = be(s, l, r), d = t === "left" ? -pe : pe;
  }
  return {
    titleX: m,
    titleY: y,
    maxWidth: f,
    rotation: d
  };
}
class Dt extends Oe {
  constructor(e) {
    super(), this.id = e.id, this.type = e.type, this.options = void 0, this.ctx = e.ctx, this.chart = e.chart, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.width = void 0, this.height = void 0, this._margins = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }, this.maxWidth = void 0, this.maxHeight = void 0, this.paddingTop = void 0, this.paddingBottom = void 0, this.paddingLeft = void 0, this.paddingRight = void 0, this.axis = void 0, this.labelRotation = void 0, this.min = void 0, this.max = void 0, this._range = void 0, this.ticks = [], this._gridLineItems = null, this._labelItems = null, this._labelSizes = null, this._length = 0, this._maxLength = 0, this._longestTextCache = {}, this._startPixel = void 0, this._endPixel = void 0, this._reversePixels = !1, this._userMax = void 0, this._userMin = void 0, this._suggestedMax = void 0, this._suggestedMin = void 0, this._ticksLength = 0, this._borderValue = 0, this._cache = {}, this._dataLimitsCached = !1, this.$context = void 0;
  }
  init(e) {
    this.options = e.setContext(this.getContext()), this.axis = e.axis, this._userMin = this.parse(e.min), this._userMax = this.parse(e.max), this._suggestedMin = this.parse(e.suggestedMin), this._suggestedMax = this.parse(e.suggestedMax);
  }
  parse(e, t) {
    return e;
  }
  getUserBounds() {
    let { _userMin: e, _userMax: t, _suggestedMin: s, _suggestedMax: r } = this;
    return e = Ae(e, Number.POSITIVE_INFINITY), t = Ae(t, Number.NEGATIVE_INFINITY), s = Ae(s, Number.POSITIVE_INFINITY), r = Ae(r, Number.NEGATIVE_INFINITY), {
      min: Ae(e, s),
      max: Ae(t, r),
      minDefined: ue(e),
      maxDefined: ue(t)
    };
  }
  getMinMax(e) {
    let { min: t, max: s, minDefined: r, maxDefined: o } = this.getUserBounds(), l;
    if (r && o)
      return {
        min: t,
        max: s
      };
    const n = this.getMatchingVisibleMetas();
    for (let a = 0, c = n.length; a < c; ++a)
      l = n[a].controller.getMinMax(this, e), r || (t = Math.min(t, l.min)), o || (s = Math.max(s, l.max));
    return t = o && t > s ? s : t, s = r && t > s ? t : s, {
      min: Ae(t, Ae(s, t)),
      max: Ae(s, Ae(t, s))
    };
  }
  getPadding() {
    return {
      left: this.paddingLeft || 0,
      top: this.paddingTop || 0,
      right: this.paddingRight || 0,
      bottom: this.paddingBottom || 0
    };
  }
  getTicks() {
    return this.ticks;
  }
  getLabels() {
    const e = this.chart.data;
    return this.options.labels || (this.isHorizontal() ? e.xLabels : e.yLabels) || e.labels || [];
  }
  getLabelItems(e = this.chart.chartArea) {
    return this._labelItems || (this._labelItems = this._computeLabelItems(e));
  }
  beforeLayout() {
    this._cache = {}, this._dataLimitsCached = !1;
  }
  beforeUpdate() {
    ae(this.options.beforeUpdate, [
      this
    ]);
  }
  update(e, t, s) {
    const { beginAtZero: r, grace: o, ticks: l } = this.options, n = l.sampleSize;
    this.beforeUpdate(), this.maxWidth = e, this.maxHeight = t, this._margins = s = Object.assign({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }, s), this.ticks = null, this._labelSizes = null, this._gridLineItems = null, this._labelItems = null, this.beforeSetDimensions(), this.setDimensions(), this.afterSetDimensions(), this._maxLength = this.isHorizontal() ? this.width + s.left + s.right : this.height + s.top + s.bottom, this._dataLimitsCached || (this.beforeDataLimits(), this.determineDataLimits(), this.afterDataLimits(), this._range = lc(this, o, r), this._dataLimitsCached = !0), this.beforeBuildTicks(), this.ticks = this.buildTicks() || [], this.afterBuildTicks();
    const a = n < this.ticks.length;
    this._convertTicksToLabels(a ? Bn(this.ticks, n) : this.ticks), this.configure(), this.beforeCalculateLabelRotation(), this.calculateLabelRotation(), this.afterCalculateLabelRotation(), l.display && (l.autoSkip || l.source === "auto") && (this.ticks = Nh(this, this.ticks), this._labelSizes = null, this.afterAutoSkip()), a && this._convertTicksToLabels(this.ticks), this.beforeFit(), this.fit(), this.afterFit(), this.afterUpdate();
  }
  configure() {
    let e = this.options.reverse, t, s;
    this.isHorizontal() ? (t = this.left, s = this.right) : (t = this.top, s = this.bottom, e = !e), this._startPixel = t, this._endPixel = s, this._reversePixels = e, this._length = s - t, this._alignToPixels = this.options.alignToPixels;
  }
  afterUpdate() {
    ae(this.options.afterUpdate, [
      this
    ]);
  }
  beforeSetDimensions() {
    ae(this.options.beforeSetDimensions, [
      this
    ]);
  }
  setDimensions() {
    this.isHorizontal() ? (this.width = this.maxWidth, this.left = 0, this.right = this.width) : (this.height = this.maxHeight, this.top = 0, this.bottom = this.height), this.paddingLeft = 0, this.paddingTop = 0, this.paddingRight = 0, this.paddingBottom = 0;
  }
  afterSetDimensions() {
    ae(this.options.afterSetDimensions, [
      this
    ]);
  }
  _callHooks(e) {
    this.chart.notifyPlugins(e, this.getContext()), ae(this.options[e], [
      this
    ]);
  }
  beforeDataLimits() {
    this._callHooks("beforeDataLimits");
  }
  determineDataLimits() {
  }
  afterDataLimits() {
    this._callHooks("afterDataLimits");
  }
  beforeBuildTicks() {
    this._callHooks("beforeBuildTicks");
  }
  buildTicks() {
    return [];
  }
  afterBuildTicks() {
    this._callHooks("afterBuildTicks");
  }
  beforeTickToLabelConversion() {
    ae(this.options.beforeTickToLabelConversion, [
      this
    ]);
  }
  generateTickLabels(e) {
    const t = this.options.ticks;
    let s, r, o;
    for (s = 0, r = e.length; s < r; s++)
      o = e[s], o.label = ae(t.callback, [
        o.value,
        s,
        e
      ], this);
  }
  afterTickToLabelConversion() {
    ae(this.options.afterTickToLabelConversion, [
      this
    ]);
  }
  beforeCalculateLabelRotation() {
    ae(this.options.beforeCalculateLabelRotation, [
      this
    ]);
  }
  calculateLabelRotation() {
    const e = this.options, t = e.ticks, s = On(this.ticks.length, e.ticks.maxTicksLimit), r = t.minRotation || 0, o = t.maxRotation;
    let l = r, n, a, c;
    if (!this._isVisible() || !t.display || r >= o || s <= 1 || !this.isHorizontal()) {
      this.labelRotation = r;
      return;
    }
    const u = this._getLabelSizes(), d = u.widest.width, f = u.highest.height, m = me(this.chart.width - d, 0, this.maxWidth);
    n = e.offset ? this.maxWidth / s : m / (s - 1), d + 6 > n && (n = m / (s - (e.offset ? 0.5 : 1)), a = this.maxHeight - Jt(e.grid) - t.padding - In(e.title, this.chart.options.font), c = Math.sqrt(d * d + f * f), l = pr(Math.min(Math.asin(me((u.highest.height + 6) / n, -1, 1)), Math.asin(me(a / c, -1, 1)) - Math.asin(me(f / c, -1, 1)))), l = Math.max(r, Math.min(o, l))), this.labelRotation = l;
  }
  afterCalculateLabelRotation() {
    ae(this.options.afterCalculateLabelRotation, [
      this
    ]);
  }
  afterAutoSkip() {
  }
  beforeFit() {
    ae(this.options.beforeFit, [
      this
    ]);
  }
  fit() {
    const e = {
      width: 0,
      height: 0
    }, { chart: t, options: { ticks: s, title: r, grid: o } } = this, l = this._isVisible(), n = this.isHorizontal();
    if (l) {
      const a = In(r, t.options.font);
      if (n ? (e.width = this.maxWidth, e.height = Jt(o) + a) : (e.height = this.maxHeight, e.width = Jt(o) + a), s.display && this.ticks.length) {
        const { first: c, last: u, widest: d, highest: f } = this._getLabelSizes(), m = s.padding * 2, y = Te(this.labelRotation), v = Math.cos(y), h = Math.sin(y);
        if (n) {
          const p = s.mirror ? 0 : h * d.width + v * f.height;
          e.height = Math.min(this.maxHeight, e.height + p + m);
        } else {
          const p = s.mirror ? 0 : v * d.width + h * f.height;
          e.width = Math.min(this.maxWidth, e.width + p + m);
        }
        this._calculatePadding(c, u, h, v);
      }
    }
    this._handleMargins(), n ? (this.width = this._length = t.width - this._margins.left - this._margins.right, this.height = e.height) : (this.width = e.width, this.height = this._length = t.height - this._margins.top - this._margins.bottom);
  }
  _calculatePadding(e, t, s, r) {
    const { ticks: { align: o, padding: l }, position: n } = this.options, a = this.labelRotation !== 0, c = n !== "top" && this.axis === "x";
    if (this.isHorizontal()) {
      const u = this.getPixelForTick(0) - this.left, d = this.right - this.getPixelForTick(this.ticks.length - 1);
      let f = 0, m = 0;
      a ? c ? (f = r * e.width, m = s * t.height) : (f = s * e.height, m = r * t.width) : o === "start" ? m = t.width : o === "end" ? f = e.width : o !== "inner" && (f = e.width / 2, m = t.width / 2), this.paddingLeft = Math.max((f - u + l) * this.width / (this.width - u), 0), this.paddingRight = Math.max((m - d + l) * this.width / (this.width - d), 0);
    } else {
      let u = t.height / 2, d = e.height / 2;
      o === "start" ? (u = 0, d = e.height) : o === "end" && (u = t.height, d = 0), this.paddingTop = u + l, this.paddingBottom = d + l;
    }
  }
  _handleMargins() {
    this._margins && (this._margins.left = Math.max(this.paddingLeft, this._margins.left), this._margins.top = Math.max(this.paddingTop, this._margins.top), this._margins.right = Math.max(this.paddingRight, this._margins.right), this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom));
  }
  afterFit() {
    ae(this.options.afterFit, [
      this
    ]);
  }
  isHorizontal() {
    const { axis: e, position: t } = this.options;
    return t === "top" || t === "bottom" || e === "x";
  }
  isFullSize() {
    return this.options.fullSize;
  }
  _convertTicksToLabels(e) {
    this.beforeTickToLabelConversion(), this.generateTickLabels(e);
    let t, s;
    for (t = 0, s = e.length; t < s; t++)
      ee(e[t].label) && (e.splice(t, 1), s--, t--);
    this.afterTickToLabelConversion();
  }
  _getLabelSizes() {
    let e = this._labelSizes;
    if (!e) {
      const t = this.options.ticks.sampleSize;
      let s = this.ticks;
      t < s.length && (s = Bn(s, t)), this._labelSizes = e = this._computeLabelSizes(s, s.length, this.options.ticks.maxTicksLimit);
    }
    return e;
  }
  _computeLabelSizes(e, t, s) {
    const { ctx: r, _longestTextCache: o } = this, l = [], n = [], a = Math.floor(t / On(t, s));
    let c = 0, u = 0, d, f, m, y, v, h, p, g, _, b, S;
    for (d = 0; d < t; d += a) {
      if (y = e[d].label, v = this._resolveTickFontOptions(d), r.font = h = v.string, p = o[h] = o[h] || {
        data: {},
        gc: []
      }, g = v.lineHeight, _ = b = 0, !ee(y) && !ce(y))
        _ = ns(r, p.data, p.gc, _, y), b = g;
      else if (ce(y))
        for (f = 0, m = y.length; f < m; ++f)
          S = y[f], !ee(S) && !ce(S) && (_ = ns(r, p.data, p.gc, _, S), b += g);
      l.push(_), n.push(b), c = Math.max(_, c), u = Math.max(b, u);
    }
    Gh(o, t);
    const w = l.indexOf(c), k = n.indexOf(u), x = (C) => ({
      width: l[C] || 0,
      height: n[C] || 0
    });
    return {
      first: x(0),
      last: x(t - 1),
      widest: x(w),
      highest: x(k),
      widths: l,
      heights: n
    };
  }
  getLabelForValue(e) {
    return e;
  }
  getPixelForValue(e, t) {
    return NaN;
  }
  getValueForPixel(e) {
  }
  getPixelForTick(e) {
    const t = this.ticks;
    return e < 0 || e > t.length - 1 ? null : this.getPixelForValue(t[e].value);
  }
  getPixelForDecimal(e) {
    this._reversePixels && (e = 1 - e);
    const t = this._startPixel + e * this._length;
    return $l(this._alignToPixels ? dt(this.chart, t, 0) : t);
  }
  getDecimalForPixel(e) {
    const t = (e - this._startPixel) / this._length;
    return this._reversePixels ? 1 - t : t;
  }
  getBasePixel() {
    return this.getPixelForValue(this.getBaseValue());
  }
  getBaseValue() {
    const { min: e, max: t } = this;
    return e < 0 && t < 0 ? t : e > 0 && t > 0 ? e : 0;
  }
  getContext(e) {
    const t = this.ticks || [];
    if (e >= 0 && e < t.length) {
      const s = t[e];
      return s.$context || (s.$context = Zh(this.getContext(), e, s));
    }
    return this.$context || (this.$context = Jh(this.chart.getContext(), this));
  }
  _tickSize() {
    const e = this.options.ticks, t = Te(this.labelRotation), s = Math.abs(Math.cos(t)), r = Math.abs(Math.sin(t)), o = this._getLabelSizes(), l = e.autoSkipPadding || 0, n = o ? o.widest.width + l : 0, a = o ? o.highest.height + l : 0;
    return this.isHorizontal() ? a * s > n * r ? n / s : a / r : a * r < n * s ? a / s : n / r;
  }
  _isVisible() {
    const e = this.options.display;
    return e !== "auto" ? !!e : this.getMatchingVisibleMetas().length > 0;
  }
  _computeGridLineItems(e) {
    const t = this.axis, s = this.chart, r = this.options, { grid: o, position: l, border: n } = r, a = o.offset, c = this.isHorizontal(), d = this.ticks.length + (a ? 1 : 0), f = Jt(o), m = [], y = n.setContext(this.getContext()), v = y.display ? y.width : 0, h = v / 2, p = function(H) {
      return dt(s, H, v);
    };
    let g, _, b, S, w, k, x, C, A, L, M, T;
    if (l === "top")
      g = p(this.bottom), k = this.bottom - f, C = g - h, L = p(e.top) + h, T = e.bottom;
    else if (l === "bottom")
      g = p(this.top), L = e.top, T = p(e.bottom) - h, k = g + h, C = this.top + f;
    else if (l === "left")
      g = p(this.right), w = this.right - f, x = g - h, A = p(e.left) + h, M = e.right;
    else if (l === "right")
      g = p(this.left), A = e.left, M = p(e.right) - h, w = g + h, x = this.left + f;
    else if (t === "x") {
      if (l === "center")
        g = p((e.top + e.bottom) / 2 + 0.5);
      else if (te(l)) {
        const H = Object.keys(l)[0], z = l[H];
        g = p(this.chart.scales[H].getPixelForValue(z));
      }
      L = e.top, T = e.bottom, k = g + h, C = k + f;
    } else if (t === "y") {
      if (l === "center")
        g = p((e.left + e.right) / 2);
      else if (te(l)) {
        const H = Object.keys(l)[0], z = l[H];
        g = p(this.chart.scales[H].getPixelForValue(z));
      }
      w = g - h, x = w - f, A = e.left, M = e.right;
    }
    const F = G(r.ticks.maxTicksLimit, d), $ = Math.max(1, Math.ceil(d / F));
    for (_ = 0; _ < d; _ += $) {
      const H = this.getContext(_), z = o.setContext(H), E = n.setContext(H), R = z.lineWidth, P = z.color, O = E.dash || [], j = E.dashOffset, q = z.tickWidth, X = z.tickColor, Y = z.tickBorderDash || [], se = z.tickBorderDashOffset;
      b = Xh(this, _, a), b !== void 0 && (S = dt(s, b, R), c ? w = x = A = M = S : k = C = L = T = S, m.push({
        tx1: w,
        ty1: k,
        tx2: x,
        ty2: C,
        x1: A,
        y1: L,
        x2: M,
        y2: T,
        width: R,
        color: P,
        borderDash: O,
        borderDashOffset: j,
        tickWidth: q,
        tickColor: X,
        tickBorderDash: Y,
        tickBorderDashOffset: se
      }));
    }
    return this._ticksLength = d, this._borderValue = g, m;
  }
  _computeLabelItems(e) {
    const t = this.axis, s = this.options, { position: r, ticks: o } = s, l = this.isHorizontal(), n = this.ticks, { align: a, crossAlign: c, padding: u, mirror: d } = o, f = Jt(s.grid), m = f + u, y = d ? -u : m, v = -Te(this.labelRotation), h = [];
    let p, g, _, b, S, w, k, x, C, A, L, M, T = "middle";
    if (r === "top")
      w = this.bottom - y, k = this._getXAxisLabelAlignment();
    else if (r === "bottom")
      w = this.top + y, k = this._getXAxisLabelAlignment();
    else if (r === "left") {
      const $ = this._getYAxisLabelAlignment(f);
      k = $.textAlign, S = $.x;
    } else if (r === "right") {
      const $ = this._getYAxisLabelAlignment(f);
      k = $.textAlign, S = $.x;
    } else if (t === "x") {
      if (r === "center")
        w = (e.top + e.bottom) / 2 + m;
      else if (te(r)) {
        const $ = Object.keys(r)[0], H = r[$];
        w = this.chart.scales[$].getPixelForValue(H) + m;
      }
      k = this._getXAxisLabelAlignment();
    } else if (t === "y") {
      if (r === "center")
        S = (e.left + e.right) / 2 - m;
      else if (te(r)) {
        const $ = Object.keys(r)[0], H = r[$];
        S = this.chart.scales[$].getPixelForValue(H);
      }
      k = this._getYAxisLabelAlignment(f).textAlign;
    }
    t === "y" && (a === "start" ? T = "top" : a === "end" && (T = "bottom"));
    const F = this._getLabelSizes();
    for (p = 0, g = n.length; p < g; ++p) {
      _ = n[p], b = _.label;
      const $ = o.setContext(this.getContext(p));
      x = this.getPixelForTick(p) + o.labelOffset, C = this._resolveTickFontOptions(p), A = C.lineHeight, L = ce(b) ? b.length : 1;
      const H = L / 2, z = $.color, E = $.textStrokeColor, R = $.textStrokeWidth;
      let P = k;
      l ? (S = x, k === "inner" && (p === g - 1 ? P = this.options.reverse ? "left" : "right" : p === 0 ? P = this.options.reverse ? "right" : "left" : P = "center"), r === "top" ? c === "near" || v !== 0 ? M = -L * A + A / 2 : c === "center" ? M = -F.highest.height / 2 - H * A + A : M = -F.highest.height + A / 2 : c === "near" || v !== 0 ? M = A / 2 : c === "center" ? M = F.highest.height / 2 - H * A : M = F.highest.height - L * A, d && (M *= -1), v !== 0 && !$.showLabelBackdrop && (S += A / 2 * Math.sin(v))) : (w = x, M = (1 - L) * A / 2);
      let O;
      if ($.showLabelBackdrop) {
        const j = xe($.backdropPadding), q = F.heights[p], X = F.widths[p];
        let Y = M - j.top, se = 0 - j.left;
        switch (T) {
          case "middle":
            Y -= q / 2;
            break;
          case "bottom":
            Y -= q;
            break;
        }
        switch (k) {
          case "center":
            se -= X / 2;
            break;
          case "right":
            se -= X;
            break;
          case "inner":
            p === g - 1 ? se -= X : p > 0 && (se -= X / 2);
            break;
        }
        O = {
          left: se,
          top: Y,
          width: X + j.width,
          height: q + j.height,
          color: $.backdropColor
        };
      }
      h.push({
        label: b,
        font: C,
        textOffset: M,
        options: {
          rotation: v,
          color: z,
          strokeColor: E,
          strokeWidth: R,
          textAlign: P,
          textBaseline: T,
          translation: [
            S,
            w
          ],
          backdrop: O
        }
      });
    }
    return h;
  }
  _getXAxisLabelAlignment() {
    const { position: e, ticks: t } = this.options;
    if (-Te(this.labelRotation))
      return e === "top" ? "left" : "right";
    let r = "center";
    return t.align === "start" ? r = "left" : t.align === "end" ? r = "right" : t.align === "inner" && (r = "inner"), r;
  }
  _getYAxisLabelAlignment(e) {
    const { position: t, ticks: { crossAlign: s, mirror: r, padding: o } } = this.options, l = this._getLabelSizes(), n = e + o, a = l.widest.width;
    let c, u;
    return t === "left" ? r ? (u = this.right + o, s === "near" ? c = "left" : s === "center" ? (c = "center", u += a / 2) : (c = "right", u += a)) : (u = this.right - n, s === "near" ? c = "right" : s === "center" ? (c = "center", u -= a / 2) : (c = "left", u = this.left)) : t === "right" ? r ? (u = this.left + o, s === "near" ? c = "right" : s === "center" ? (c = "center", u -= a / 2) : (c = "left", u -= a)) : (u = this.left + n, s === "near" ? c = "left" : s === "center" ? (c = "center", u += a / 2) : (c = "right", u = this.right)) : c = "right", {
      textAlign: c,
      x: u
    };
  }
  _computeLabelArea() {
    if (this.options.ticks.mirror)
      return;
    const e = this.chart, t = this.options.position;
    if (t === "left" || t === "right")
      return {
        top: 0,
        left: this.left,
        bottom: e.height,
        right: this.right
      };
    if (t === "top" || t === "bottom")
      return {
        top: this.top,
        left: 0,
        bottom: this.bottom,
        right: e.width
      };
  }
  drawBackground() {
    const { ctx: e, options: { backgroundColor: t }, left: s, top: r, width: o, height: l } = this;
    t && (e.save(), e.fillStyle = t, e.fillRect(s, r, o, l), e.restore());
  }
  getLineWidthForValue(e) {
    const t = this.options.grid;
    if (!this._isVisible() || !t.display)
      return 0;
    const r = this.ticks.findIndex((o) => o.value === e);
    return r >= 0 ? t.setContext(this.getContext(r)).lineWidth : 0;
  }
  drawGrid(e) {
    const t = this.options.grid, s = this.ctx, r = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(e));
    let o, l;
    const n = (a, c, u) => {
      !u.width || !u.color || (s.save(), s.lineWidth = u.width, s.strokeStyle = u.color, s.setLineDash(u.borderDash || []), s.lineDashOffset = u.borderDashOffset, s.beginPath(), s.moveTo(a.x, a.y), s.lineTo(c.x, c.y), s.stroke(), s.restore());
    };
    if (t.display)
      for (o = 0, l = r.length; o < l; ++o) {
        const a = r[o];
        t.drawOnChartArea && n({
          x: a.x1,
          y: a.y1
        }, {
          x: a.x2,
          y: a.y2
        }, a), t.drawTicks && n({
          x: a.tx1,
          y: a.ty1
        }, {
          x: a.tx2,
          y: a.ty2
        }, {
          color: a.tickColor,
          width: a.tickWidth,
          borderDash: a.tickBorderDash,
          borderDashOffset: a.tickBorderDashOffset
        });
      }
  }
  drawBorder() {
    const { chart: e, ctx: t, options: { border: s, grid: r } } = this, o = s.setContext(this.getContext()), l = s.display ? o.width : 0;
    if (!l)
      return;
    const n = r.setContext(this.getContext(0)).lineWidth, a = this._borderValue;
    let c, u, d, f;
    this.isHorizontal() ? (c = dt(e, this.left, l) - l / 2, u = dt(e, this.right, n) + n / 2, d = f = a) : (d = dt(e, this.top, l) - l / 2, f = dt(e, this.bottom, n) + n / 2, c = u = a), t.save(), t.lineWidth = o.width, t.strokeStyle = o.color, t.beginPath(), t.moveTo(c, d), t.lineTo(u, f), t.stroke(), t.restore();
  }
  drawLabels(e) {
    if (!this.options.ticks.display)
      return;
    const s = this.ctx, r = this._computeLabelArea();
    r && us(s, r);
    const o = this.getLabelItems(e);
    for (const l of o) {
      const n = l.options, a = l.font, c = l.label, u = l.textOffset;
      kt(s, c, 0, u, a, n);
    }
    r && fs(s);
  }
  drawTitle() {
    const { ctx: e, options: { position: t, title: s, reverse: r } } = this;
    if (!s.display)
      return;
    const o = ge(s.font), l = xe(s.padding), n = s.align;
    let a = o.lineHeight / 2;
    t === "bottom" || t === "center" || te(t) ? (a += l.bottom, ce(s.text) && (a += o.lineHeight * (s.text.length - 1))) : a += l.top;
    const { titleX: c, titleY: u, maxWidth: d, rotation: f } = ed(this, a, t, n);
    kt(e, s.text, 0, 0, o, {
      color: s.color,
      maxWidth: d,
      rotation: f,
      textAlign: Qh(n, t, r),
      textBaseline: "middle",
      translation: [
        c,
        u
      ]
    });
  }
  draw(e) {
    this._isVisible() && (this.drawBackground(), this.drawGrid(e), this.drawBorder(), this.drawTitle(), this.drawLabels(e));
  }
  _layers() {
    const e = this.options, t = e.ticks && e.ticks.z || 0, s = G(e.grid && e.grid.z, -1), r = G(e.border && e.border.z, 0);
    return !this._isVisible() || this.draw !== Dt.prototype.draw ? [
      {
        z: t,
        draw: (o) => {
          this.draw(o);
        }
      }
    ] : [
      {
        z: s,
        draw: (o) => {
          this.drawBackground(), this.drawGrid(o), this.drawTitle();
        }
      },
      {
        z: r,
        draw: () => {
          this.drawBorder();
        }
      },
      {
        z: t,
        draw: (o) => {
          this.drawLabels(o);
        }
      }
    ];
  }
  getMatchingVisibleMetas(e) {
    const t = this.chart.getSortedVisibleDatasetMetas(), s = this.axis + "AxisID", r = [];
    let o, l;
    for (o = 0, l = t.length; o < l; ++o) {
      const n = t[o];
      n[s] === this.id && (!e || n.type === e) && r.push(n);
    }
    return r;
  }
  _resolveTickFontOptions(e) {
    const t = this.options.ticks.setContext(this.getContext(e));
    return ge(t.font);
  }
  _maxDigits() {
    const e = this._resolveTickFontOptions(0).lineHeight;
    return (this.isHorizontal() ? this.width : this.height) / e;
  }
}
class Hi {
  constructor(e, t, s) {
    this.type = e, this.scope = t, this.override = s, this.items = /* @__PURE__ */ Object.create(null);
  }
  isForType(e) {
    return Object.prototype.isPrototypeOf.call(this.type.prototype, e.prototype);
  }
  register(e) {
    const t = Object.getPrototypeOf(e);
    let s;
    sd(t) && (s = this.register(t));
    const r = this.items, o = e.id, l = this.scope + "." + o;
    if (!o)
      throw new Error("class does not have id: " + e);
    return o in r || (r[o] = e, td(e, l, s), this.override && he.override(e.id, e.overrides)), l;
  }
  get(e) {
    return this.items[e];
  }
  unregister(e) {
    const t = this.items, s = e.id, r = this.scope;
    s in t && delete t[s], r && s in he[r] && (delete he[r][s], this.override && delete Ct[s]);
  }
}
function td(i, e, t) {
  const s = _i(/* @__PURE__ */ Object.create(null), [
    t ? he.get(t) : {},
    he.get(e),
    i.defaults
  ]);
  he.set(e, s), i.defaultRoutes && id(e, i.defaultRoutes), i.descriptors && he.describe(e, i.descriptors);
}
function id(i, e) {
  Object.keys(e).forEach((t) => {
    const s = t.split("."), r = s.pop(), o = [
      i
    ].concat(s).join("."), l = e[t].split("."), n = l.pop(), a = l.join(".");
    he.route(o, r, a, n);
  });
}
function sd(i) {
  return "id" in i && "defaults" in i;
}
class rd {
  constructor() {
    this.controllers = new Hi(Pe, "datasets", !0), this.elements = new Hi(Oe, "elements"), this.plugins = new Hi(Object, "plugins"), this.scales = new Hi(Dt, "scales"), this._typedRegistries = [
      this.controllers,
      this.scales,
      this.elements
    ];
  }
  add(...e) {
    this._each("register", e);
  }
  remove(...e) {
    this._each("unregister", e);
  }
  addControllers(...e) {
    this._each("register", e, this.controllers);
  }
  addElements(...e) {
    this._each("register", e, this.elements);
  }
  addPlugins(...e) {
    this._each("register", e, this.plugins);
  }
  addScales(...e) {
    this._each("register", e, this.scales);
  }
  getController(e) {
    return this._get(e, this.controllers, "controller");
  }
  getElement(e) {
    return this._get(e, this.elements, "element");
  }
  getPlugin(e) {
    return this._get(e, this.plugins, "plugin");
  }
  getScale(e) {
    return this._get(e, this.scales, "scale");
  }
  removeControllers(...e) {
    this._each("unregister", e, this.controllers);
  }
  removeElements(...e) {
    this._each("unregister", e, this.elements);
  }
  removePlugins(...e) {
    this._each("unregister", e, this.plugins);
  }
  removeScales(...e) {
    this._each("unregister", e, this.scales);
  }
  _each(e, t, s) {
    [
      ...t
    ].forEach((r) => {
      const o = s || this._getRegistryForType(r);
      s || o.isForType(r) || o === this.plugins && r.id ? this._exec(e, o, r) : ne(r, (l) => {
        const n = s || this._getRegistryForType(l);
        this._exec(e, n, l);
      });
    });
  }
  _exec(e, t, s) {
    const r = fr(e);
    ae(s["before" + r], [], s), t[e](s), ae(s["after" + r], [], s);
  }
  _getRegistryForType(e) {
    for (let t = 0; t < this._typedRegistries.length; t++) {
      const s = this._typedRegistries[t];
      if (s.isForType(e))
        return s;
    }
    return this.plugins;
  }
  _get(e, t, s) {
    const r = t.get(e);
    if (r === void 0)
      throw new Error('"' + e + '" is not a registered ' + s + ".");
    return r;
  }
}
var $e = /* @__PURE__ */ new rd();
class nd {
  constructor() {
    this._init = [];
  }
  notify(e, t, s, r) {
    t === "beforeInit" && (this._init = this._createDescriptors(e, !0), this._notify(this._init, e, "install"));
    const o = r ? this._descriptors(e).filter(r) : this._descriptors(e), l = this._notify(o, e, t, s);
    return t === "afterDestroy" && (this._notify(o, e, "stop"), this._notify(this._init, e, "uninstall")), l;
  }
  _notify(e, t, s, r) {
    r = r || {};
    for (const o of e) {
      const l = o.plugin, n = l[s], a = [
        t,
        r,
        o.options
      ];
      if (ae(n, a, l) === !1 && r.cancelable)
        return !1;
    }
    return !0;
  }
  invalidate() {
    ee(this._cache) || (this._oldCache = this._cache, this._cache = void 0);
  }
  _descriptors(e) {
    if (this._cache)
      return this._cache;
    const t = this._cache = this._createDescriptors(e);
    return this._notifyStateChanges(e), t;
  }
  _createDescriptors(e, t) {
    const s = e && e.config, r = G(s.options && s.options.plugins, {}), o = od(s);
    return r === !1 && !t ? [] : ld(e, o, r, t);
  }
  _notifyStateChanges(e) {
    const t = this._oldCache || [], s = this._cache, r = (o, l) => o.filter((n) => !l.some((a) => n.plugin.id === a.plugin.id));
    this._notify(r(t, s), e, "stop"), this._notify(r(s, t), e, "start");
  }
}
function od(i) {
  const e = {}, t = [], s = Object.keys($e.plugins.items);
  for (let o = 0; o < s.length; o++)
    t.push($e.getPlugin(s[o]));
  const r = i.plugins || [];
  for (let o = 0; o < r.length; o++) {
    const l = r[o];
    t.indexOf(l) === -1 && (t.push(l), e[l.id] = !0);
  }
  return {
    plugins: t,
    localIds: e
  };
}
function ad(i, e) {
  return !e && i === !1 ? null : i === !0 ? {} : i;
}
function ld(i, { plugins: e, localIds: t }, s, r) {
  const o = [], l = i.getContext();
  for (const n of e) {
    const a = n.id, c = ad(s[a], r);
    c !== null && o.push({
      plugin: n,
      options: cd(i.config, {
        plugin: n,
        local: t[a]
      }, c, l)
    });
  }
  return o;
}
function cd(i, { plugin: e, local: t }, s, r) {
  const o = i.pluginScopeKeys(e), l = i.getOptionScopes(s, o);
  return t && e.defaults && l.push(e.defaults), i.createResolver(l, r, [
    ""
  ], {
    scriptable: !1,
    indexable: !1,
    allKeys: !0
  });
}
function Ks(i, e) {
  const t = he.datasets[i] || {};
  return ((e.datasets || {})[i] || {}).indexAxis || e.indexAxis || t.indexAxis || "x";
}
function hd(i, e) {
  let t = i;
  return i === "_index_" ? t = e : i === "_value_" && (t = e === "x" ? "y" : "x"), t;
}
function dd(i, e) {
  return i === e ? "_index_" : "_value_";
}
function $n(i) {
  if (i === "x" || i === "y" || i === "r")
    return i;
}
function ud(i) {
  if (i === "top" || i === "bottom")
    return "x";
  if (i === "left" || i === "right")
    return "y";
}
function Ys(i, ...e) {
  if ($n(i))
    return i;
  for (const t of e) {
    const s = t.axis || ud(t.position) || i.length > 1 && $n(i[0].toLowerCase());
    if (s)
      return s;
  }
  throw new Error(`Cannot determine type of '${i}' axis. Please provide 'axis' or 'position' option.`);
}
function Fn(i, e, t) {
  if (t[e + "AxisID"] === i)
    return {
      axis: e
    };
}
function fd(i, e) {
  if (e.data && e.data.datasets) {
    const t = e.data.datasets.filter((s) => s.xAxisID === i || s.yAxisID === i);
    if (t.length)
      return Fn(i, "x", t[0]) || Fn(i, "y", t[0]);
  }
  return {};
}
function pd(i, e) {
  const t = Ct[i.type] || {
    scales: {}
  }, s = e.scales || {}, r = Ks(i.type, e), o = /* @__PURE__ */ Object.create(null);
  return Object.keys(s).forEach((l) => {
    const n = s[l];
    if (!te(n))
      return console.error(`Invalid scale configuration for scale: ${l}`);
    if (n._proxy)
      return console.warn(`Ignoring resolver passed as options for scale: ${l}`);
    const a = Ys(l, n, fd(l, i), he.scales[n.type]), c = dd(a, r), u = t.scales || {};
    o[l] = ai(/* @__PURE__ */ Object.create(null), [
      {
        axis: a
      },
      n,
      u[a],
      u[c]
    ]);
  }), i.data.datasets.forEach((l) => {
    const n = l.type || i.type, a = l.indexAxis || Ks(n, e), u = (Ct[n] || {}).scales || {};
    Object.keys(u).forEach((d) => {
      const f = hd(d, a), m = l[f + "AxisID"] || f;
      o[m] = o[m] || /* @__PURE__ */ Object.create(null), ai(o[m], [
        {
          axis: f
        },
        s[m],
        u[d]
      ]);
    });
  }), Object.keys(o).forEach((l) => {
    const n = o[l];
    ai(n, [
      he.scales[n.type],
      he.scale
    ]);
  }), o;
}
function la(i) {
  const e = i.options || (i.options = {});
  e.plugins = G(e.plugins, {}), e.scales = pd(i, e);
}
function ca(i) {
  return i = i || {}, i.datasets = i.datasets || [], i.labels = i.labels || [], i;
}
function gd(i) {
  return i = i || {}, i.data = ca(i.data), la(i), i;
}
const Hn = /* @__PURE__ */ new Map(), ha = /* @__PURE__ */ new Set();
function zi(i, e) {
  let t = Hn.get(i);
  return t || (t = e(), Hn.set(i, t), ha.add(t)), t;
}
const Zt = (i, e, t) => {
  const s = nt(e, t);
  s !== void 0 && i.add(s);
};
class _d {
  constructor(e) {
    this._config = gd(e), this._scopeCache = /* @__PURE__ */ new Map(), this._resolverCache = /* @__PURE__ */ new Map();
  }
  get platform() {
    return this._config.platform;
  }
  get type() {
    return this._config.type;
  }
  set type(e) {
    this._config.type = e;
  }
  get data() {
    return this._config.data;
  }
  set data(e) {
    this._config.data = ca(e);
  }
  get options() {
    return this._config.options;
  }
  set options(e) {
    this._config.options = e;
  }
  get plugins() {
    return this._config.plugins;
  }
  update() {
    const e = this._config;
    this.clearCache(), la(e);
  }
  clearCache() {
    this._scopeCache.clear(), this._resolverCache.clear();
  }
  datasetScopeKeys(e) {
    return zi(e, () => [
      [
        `datasets.${e}`,
        ""
      ]
    ]);
  }
  datasetAnimationScopeKeys(e, t) {
    return zi(`${e}.transition.${t}`, () => [
      [
        `datasets.${e}.transitions.${t}`,
        `transitions.${t}`
      ],
      [
        `datasets.${e}`,
        ""
      ]
    ]);
  }
  datasetElementScopeKeys(e, t) {
    return zi(`${e}-${t}`, () => [
      [
        `datasets.${e}.elements.${t}`,
        `datasets.${e}`,
        `elements.${t}`,
        ""
      ]
    ]);
  }
  pluginScopeKeys(e) {
    const t = e.id, s = this.type;
    return zi(`${s}-plugin-${t}`, () => [
      [
        `plugins.${t}`,
        ...e.additionalOptionScopes || []
      ]
    ]);
  }
  _cachedScopes(e, t) {
    const s = this._scopeCache;
    let r = s.get(e);
    return (!r || t) && (r = /* @__PURE__ */ new Map(), s.set(e, r)), r;
  }
  getOptionScopes(e, t, s) {
    const { options: r, type: o } = this, l = this._cachedScopes(e, s), n = l.get(t);
    if (n)
      return n;
    const a = /* @__PURE__ */ new Set();
    t.forEach((u) => {
      e && (a.add(e), u.forEach((d) => Zt(a, e, d))), u.forEach((d) => Zt(a, r, d)), u.forEach((d) => Zt(a, Ct[o] || {}, d)), u.forEach((d) => Zt(a, he, d)), u.forEach((d) => Zt(a, js, d));
    });
    const c = Array.from(a);
    return c.length === 0 && c.push(/* @__PURE__ */ Object.create(null)), ha.has(t) && l.set(t, c), c;
  }
  chartOptionScopes() {
    const { options: e, type: t } = this;
    return [
      e,
      Ct[t] || {},
      he.datasets[t] || {},
      {
        type: t
      },
      he,
      js
    ];
  }
  resolveNamedOptions(e, t, s, r = [
    ""
  ]) {
    const o = {
      $shared: !0
    }, { resolver: l, subPrefixes: n } = zn(this._resolverCache, e, r);
    let a = l;
    if (vd(l, t)) {
      o.$shared = !1, s = ot(s) ? s() : s;
      const c = this.createResolver(e, s, n);
      a = Ft(l, s, c);
    }
    for (const c of t)
      o[c] = a[c];
    return o;
  }
  createResolver(e, t, s = [
    ""
  ], r) {
    const { resolver: o } = zn(this._resolverCache, e, s);
    return te(t) ? Ft(o, t, void 0, r) : o;
  }
}
function zn(i, e, t) {
  let s = i.get(e);
  s || (s = /* @__PURE__ */ new Map(), i.set(e, s));
  const r = t.join();
  let o = s.get(r);
  return o || (o = {
    resolver: br(e, t),
    subPrefixes: t.filter((n) => !n.toLowerCase().includes("hover"))
  }, s.set(r, o)), o;
}
const md = (i) => te(i) && Object.getOwnPropertyNames(i).some((e) => ot(i[e]));
function vd(i, e) {
  const { isScriptable: t, isIndexable: s } = No(i);
  for (const r of e) {
    const o = t(r), l = s(r), n = (l || o) && i[r];
    if (o && (ot(n) || md(n)) || l && ce(n))
      return !0;
  }
  return !1;
}
var bd = "4.5.0";
const yd = [
  "top",
  "bottom",
  "left",
  "right",
  "chartArea"
];
function Wn(i, e) {
  return i === "top" || i === "bottom" || yd.indexOf(i) === -1 && e === "x";
}
function Nn(i, e) {
  return function(t, s) {
    return t[i] === s[i] ? t[e] - s[e] : t[i] - s[i];
  };
}
function Un(i) {
  const e = i.chart, t = e.options.animation;
  e.notifyPlugins("afterRender"), ae(t && t.onComplete, [
    i
  ], e);
}
function Sd(i) {
  const e = i.chart, t = e.options.animation;
  ae(t && t.onProgress, [
    i
  ], e);
}
function da(i) {
  return xr() && typeof i == "string" ? i = document.getElementById(i) : i && i.length && (i = i[0]), i && i.canvas && (i = i.canvas), i;
}
const Ji = {}, jn = (i) => {
  const e = da(i);
  return Object.values(Ji).filter((t) => t.canvas === e).pop();
};
function xd(i, e, t) {
  const s = Object.keys(i);
  for (const r of s) {
    const o = +r;
    if (o >= e) {
      const l = i[r];
      delete i[r], (t > 0 || o > e) && (i[o + t] = l);
    }
  }
}
function wd(i, e, t, s) {
  return !t || i.type === "mouseout" ? null : s ? e : i;
}
class Fe {
  static register(...e) {
    $e.add(...e), Vn();
  }
  static unregister(...e) {
    $e.remove(...e), Vn();
  }
  constructor(e, t) {
    const s = this.config = new _d(t), r = da(e), o = jn(r);
    if (o)
      throw new Error("Canvas is already in use. Chart with ID '" + o.id + "' must be destroyed before the canvas with ID '" + o.canvas.id + "' can be reused.");
    const l = s.createResolver(s.chartOptionScopes(), this.getContext());
    this.platform = new (s.platform || Wh(r))(), this.platform.updateConfig(s);
    const n = this.platform.acquireContext(r, l.aspectRatio), a = n && n.canvas, c = a && a.height, u = a && a.width;
    if (this.id = Cl(), this.ctx = n, this.canvas = a, this.width = u, this.height = c, this._options = l, this._aspectRatio = this.aspectRatio, this._layers = [], this._metasets = [], this._stacks = void 0, this.boxes = [], this.currentDevicePixelRatio = void 0, this.chartArea = void 0, this._active = [], this._lastEvent = void 0, this._listeners = {}, this._responsiveListeners = void 0, this._sortedMetasets = [], this.scales = {}, this._plugins = new nd(), this.$proxies = {}, this._hiddenIndices = {}, this.attached = !1, this._animationsDisabled = void 0, this.$context = void 0, this._doResize = Wl((d) => this.update(d), l.resizeDelay || 0), this._dataChanges = [], Ji[this.id] = this, !n || !a) {
      console.error("Failed to create chart: can't acquire context from the given item");
      return;
    }
    je.listen(this, "complete", Un), je.listen(this, "progress", Sd), this._initialize(), this.attached && this.update();
  }
  get aspectRatio() {
    const { options: { aspectRatio: e, maintainAspectRatio: t }, width: s, height: r, _aspectRatio: o } = this;
    return ee(e) ? t && o ? o : r ? s / r : null : e;
  }
  get data() {
    return this.config.data;
  }
  set data(e) {
    this.config.data = e;
  }
  get options() {
    return this._options;
  }
  set options(e) {
    this.config.options = e;
  }
  get registry() {
    return $e;
  }
  _initialize() {
    return this.notifyPlugins("beforeInit"), this.options.responsive ? this.resize() : fn(this, this.options.devicePixelRatio), this.bindEvents(), this.notifyPlugins("afterInit"), this;
  }
  clear() {
    return hn(this.canvas, this.ctx), this;
  }
  stop() {
    return je.stop(this), this;
  }
  resize(e, t) {
    je.running(this) ? this._resizeBeforeDraw = {
      width: e,
      height: t
    } : this._resize(e, t);
  }
  _resize(e, t) {
    const s = this.options, r = this.canvas, o = s.maintainAspectRatio && this.aspectRatio, l = this.platform.getMaximumSize(r, e, t, o), n = s.devicePixelRatio || this.platform.getDevicePixelRatio(), a = this.width ? "resize" : "attach";
    this.width = l.width, this.height = l.height, this._aspectRatio = this.aspectRatio, fn(this, n, !0) && (this.notifyPlugins("resize", {
      size: l
    }), ae(s.onResize, [
      this,
      l
    ], this), this.attached && this._doResize(a) && this.render());
  }
  ensureScalesHaveIDs() {
    const t = this.options.scales || {};
    ne(t, (s, r) => {
      s.id = r;
    });
  }
  buildOrUpdateScales() {
    const e = this.options, t = e.scales, s = this.scales, r = Object.keys(s).reduce((l, n) => (l[n] = !1, l), {});
    let o = [];
    t && (o = o.concat(Object.keys(t).map((l) => {
      const n = t[l], a = Ys(l, n), c = a === "r", u = a === "x";
      return {
        options: n,
        dposition: c ? "chartArea" : u ? "bottom" : "left",
        dtype: c ? "radialLinear" : u ? "category" : "linear"
      };
    }))), ne(o, (l) => {
      const n = l.options, a = n.id, c = Ys(a, n), u = G(n.type, l.dtype);
      (n.position === void 0 || Wn(n.position, c) !== Wn(l.dposition)) && (n.position = l.dposition), r[a] = !0;
      let d = null;
      if (a in s && s[a].type === u)
        d = s[a];
      else {
        const f = $e.getScale(u);
        d = new f({
          id: a,
          type: u,
          ctx: this.ctx,
          chart: this
        }), s[d.id] = d;
      }
      d.init(n, e);
    }), ne(r, (l, n) => {
      l || delete s[n];
    }), ne(s, (l) => {
      Se.configure(this, l, l.options), Se.addBox(this, l);
    });
  }
  _updateMetasets() {
    const e = this._metasets, t = this.data.datasets.length, s = e.length;
    if (e.sort((r, o) => r.index - o.index), s > t) {
      for (let r = t; r < s; ++r)
        this._destroyDatasetMeta(r);
      e.splice(t, s - t);
    }
    this._sortedMetasets = e.slice(0).sort(Nn("order", "index"));
  }
  _removeUnreferencedMetasets() {
    const { _metasets: e, data: { datasets: t } } = this;
    e.length > t.length && delete this._stacks, e.forEach((s, r) => {
      t.filter((o) => o === s._dataset).length === 0 && this._destroyDatasetMeta(r);
    });
  }
  buildOrUpdateControllers() {
    const e = [], t = this.data.datasets;
    let s, r;
    for (this._removeUnreferencedMetasets(), s = 0, r = t.length; s < r; s++) {
      const o = t[s];
      let l = this.getDatasetMeta(s);
      const n = o.type || this.config.type;
      if (l.type && l.type !== n && (this._destroyDatasetMeta(s), l = this.getDatasetMeta(s)), l.type = n, l.indexAxis = o.indexAxis || Ks(n, this.options), l.order = o.order || 0, l.index = s, l.label = "" + o.label, l.visible = this.isDatasetVisible(s), l.controller)
        l.controller.updateIndex(s), l.controller.linkScales();
      else {
        const a = $e.getController(n), { datasetElementType: c, dataElementType: u } = he.datasets[n];
        Object.assign(a, {
          dataElementType: $e.getElement(u),
          datasetElementType: c && $e.getElement(c)
        }), l.controller = new a(this, s), e.push(l.controller);
      }
    }
    return this._updateMetasets(), e;
  }
  _resetElements() {
    ne(this.data.datasets, (e, t) => {
      this.getDatasetMeta(t).controller.reset();
    }, this);
  }
  reset() {
    this._resetElements(), this.notifyPlugins("reset");
  }
  update(e) {
    const t = this.config;
    t.update();
    const s = this._options = t.createResolver(t.chartOptionScopes(), this.getContext()), r = this._animationsDisabled = !s.animation;
    if (this._updateScales(), this._checkEventBindings(), this._updateHiddenIndices(), this._plugins.invalidate(), this.notifyPlugins("beforeUpdate", {
      mode: e,
      cancelable: !0
    }) === !1)
      return;
    const o = this.buildOrUpdateControllers();
    this.notifyPlugins("beforeElementsUpdate");
    let l = 0;
    for (let c = 0, u = this.data.datasets.length; c < u; c++) {
      const { controller: d } = this.getDatasetMeta(c), f = !r && o.indexOf(d) === -1;
      d.buildOrUpdateElements(f), l = Math.max(+d.getMaxOverflow(), l);
    }
    l = this._minPadding = s.layout.autoPadding ? l : 0, this._updateLayout(l), r || ne(o, (c) => {
      c.reset();
    }), this._updateDatasets(e), this.notifyPlugins("afterUpdate", {
      mode: e
    }), this._layers.sort(Nn("z", "_idx"));
    const { _active: n, _lastEvent: a } = this;
    a ? this._eventHandler(a, !0) : n.length && this._updateHoverStyles(n, n, !0), this.render();
  }
  _updateScales() {
    ne(this.scales, (e) => {
      Se.removeBox(this, e);
    }), this.ensureScalesHaveIDs(), this.buildOrUpdateScales();
  }
  _checkEventBindings() {
    const e = this.options, t = new Set(Object.keys(this._listeners)), s = new Set(e.events);
    (!en(t, s) || !!this._responsiveListeners !== e.responsive) && (this.unbindEvents(), this.bindEvents());
  }
  _updateHiddenIndices() {
    const { _hiddenIndices: e } = this, t = this._getUniformDataChanges() || [];
    for (const { method: s, start: r, count: o } of t) {
      const l = s === "_removeElements" ? -o : o;
      xd(e, r, l);
    }
  }
  _getUniformDataChanges() {
    const e = this._dataChanges;
    if (!e || !e.length)
      return;
    this._dataChanges = [];
    const t = this.data.datasets.length, s = (o) => new Set(e.filter((l) => l[0] === o).map((l, n) => n + "," + l.splice(1).join(","))), r = s(0);
    for (let o = 1; o < t; o++)
      if (!en(r, s(o)))
        return;
    return Array.from(r).map((o) => o.split(",")).map((o) => ({
      method: o[1],
      start: +o[2],
      count: +o[3]
    }));
  }
  _updateLayout(e) {
    if (this.notifyPlugins("beforeLayout", {
      cancelable: !0
    }) === !1)
      return;
    Se.update(this, this.width, this.height, e);
    const t = this.chartArea, s = t.width <= 0 || t.height <= 0;
    this._layers = [], ne(this.boxes, (r) => {
      s && r.position === "chartArea" || (r.configure && r.configure(), this._layers.push(...r._layers()));
    }, this), this._layers.forEach((r, o) => {
      r._idx = o;
    }), this.notifyPlugins("afterLayout");
  }
  _updateDatasets(e) {
    if (this.notifyPlugins("beforeDatasetsUpdate", {
      mode: e,
      cancelable: !0
    }) !== !1) {
      for (let t = 0, s = this.data.datasets.length; t < s; ++t)
        this.getDatasetMeta(t).controller.configure();
      for (let t = 0, s = this.data.datasets.length; t < s; ++t)
        this._updateDataset(t, ot(e) ? e({
          datasetIndex: t
        }) : e);
      this.notifyPlugins("afterDatasetsUpdate", {
        mode: e
      });
    }
  }
  _updateDataset(e, t) {
    const s = this.getDatasetMeta(e), r = {
      meta: s,
      index: e,
      mode: t,
      cancelable: !0
    };
    this.notifyPlugins("beforeDatasetUpdate", r) !== !1 && (s.controller._update(t), r.cancelable = !1, this.notifyPlugins("afterDatasetUpdate", r));
  }
  render() {
    this.notifyPlugins("beforeRender", {
      cancelable: !0
    }) !== !1 && (je.has(this) ? this.attached && !je.running(this) && je.start(this) : (this.draw(), Un({
      chart: this
    })));
  }
  draw() {
    let e;
    if (this._resizeBeforeDraw) {
      const { width: s, height: r } = this._resizeBeforeDraw;
      this._resizeBeforeDraw = null, this._resize(s, r);
    }
    if (this.clear(), this.width <= 0 || this.height <= 0 || this.notifyPlugins("beforeDraw", {
      cancelable: !0
    }) === !1)
      return;
    const t = this._layers;
    for (e = 0; e < t.length && t[e].z <= 0; ++e)
      t[e].draw(this.chartArea);
    for (this._drawDatasets(); e < t.length; ++e)
      t[e].draw(this.chartArea);
    this.notifyPlugins("afterDraw");
  }
  _getSortedDatasetMetas(e) {
    const t = this._sortedMetasets, s = [];
    let r, o;
    for (r = 0, o = t.length; r < o; ++r) {
      const l = t[r];
      (!e || l.visible) && s.push(l);
    }
    return s;
  }
  getSortedVisibleDatasetMetas() {
    return this._getSortedDatasetMetas(!0);
  }
  _drawDatasets() {
    if (this.notifyPlugins("beforeDatasetsDraw", {
      cancelable: !0
    }) === !1)
      return;
    const e = this.getSortedVisibleDatasetMetas();
    for (let t = e.length - 1; t >= 0; --t)
      this._drawDataset(e[t]);
    this.notifyPlugins("afterDatasetsDraw");
  }
  _drawDataset(e) {
    const t = this.ctx, s = {
      meta: e,
      index: e.index,
      cancelable: !0
    }, r = Qo(this, e);
    this.notifyPlugins("beforeDatasetDraw", s) !== !1 && (r && us(t, r), e.controller.draw(), r && fs(t), s.cancelable = !1, this.notifyPlugins("afterDatasetDraw", s));
  }
  isPointInArea(e) {
    return Xe(e, this.chartArea, this._minPadding);
  }
  getElementsAtEventForMode(e, t, s, r) {
    const o = yh.modes[t];
    return typeof o == "function" ? o(this, e, s, r) : [];
  }
  getDatasetMeta(e) {
    const t = this.data.datasets[e], s = this._metasets;
    let r = s.filter((o) => o && o._dataset === t).pop();
    return r || (r = {
      type: null,
      data: [],
      dataset: null,
      controller: null,
      hidden: null,
      xAxisID: null,
      yAxisID: null,
      order: t && t.order || 0,
      index: e,
      _dataset: t,
      _parsed: [],
      _sorted: !1
    }, s.push(r)), r;
  }
  getContext() {
    return this.$context || (this.$context = lt(null, {
      chart: this,
      type: "chart"
    }));
  }
  getVisibleDatasetCount() {
    return this.getSortedVisibleDatasetMetas().length;
  }
  isDatasetVisible(e) {
    const t = this.data.datasets[e];
    if (!t)
      return !1;
    const s = this.getDatasetMeta(e);
    return typeof s.hidden == "boolean" ? !s.hidden : !t.hidden;
  }
  setDatasetVisibility(e, t) {
    const s = this.getDatasetMeta(e);
    s.hidden = !t;
  }
  toggleDataVisibility(e) {
    this._hiddenIndices[e] = !this._hiddenIndices[e];
  }
  getDataVisibility(e) {
    return !this._hiddenIndices[e];
  }
  _updateVisibility(e, t, s) {
    const r = s ? "show" : "hide", o = this.getDatasetMeta(e), l = o.controller._resolveAnimations(void 0, r);
    mi(t) ? (o.data[t].hidden = !s, this.update()) : (this.setDatasetVisibility(e, s), l.update(o, {
      visible: s
    }), this.update((n) => n.datasetIndex === e ? r : void 0));
  }
  hide(e, t) {
    this._updateVisibility(e, t, !1);
  }
  show(e, t) {
    this._updateVisibility(e, t, !0);
  }
  _destroyDatasetMeta(e) {
    const t = this._metasets[e];
    t && t.controller && t.controller._destroy(), delete this._metasets[e];
  }
  _stop() {
    let e, t;
    for (this.stop(), je.remove(this), e = 0, t = this.data.datasets.length; e < t; ++e)
      this._destroyDatasetMeta(e);
  }
  destroy() {
    this.notifyPlugins("beforeDestroy");
    const { canvas: e, ctx: t } = this;
    this._stop(), this.config.clearCache(), e && (this.unbindEvents(), hn(e, t), this.platform.releaseContext(t), this.canvas = null, this.ctx = null), delete Ji[this.id], this.notifyPlugins("afterDestroy");
  }
  toBase64Image(...e) {
    return this.canvas.toDataURL(...e);
  }
  bindEvents() {
    this.bindUserEvents(), this.options.responsive ? this.bindResponsiveEvents() : this.attached = !0;
  }
  bindUserEvents() {
    const e = this._listeners, t = this.platform, s = (o, l) => {
      t.addEventListener(this, o, l), e[o] = l;
    }, r = (o, l, n) => {
      o.offsetX = l, o.offsetY = n, this._eventHandler(o);
    };
    ne(this.options.events, (o) => s(o, r));
  }
  bindResponsiveEvents() {
    this._responsiveListeners || (this._responsiveListeners = {});
    const e = this._responsiveListeners, t = this.platform, s = (a, c) => {
      t.addEventListener(this, a, c), e[a] = c;
    }, r = (a, c) => {
      e[a] && (t.removeEventListener(this, a, c), delete e[a]);
    }, o = (a, c) => {
      this.canvas && this.resize(a, c);
    };
    let l;
    const n = () => {
      r("attach", n), this.attached = !0, this.resize(), s("resize", o), s("detach", l);
    };
    l = () => {
      this.attached = !1, r("resize", o), this._stop(), this._resize(0, 0), s("attach", n);
    }, t.isAttached(this.canvas) ? n() : l();
  }
  unbindEvents() {
    ne(this._listeners, (e, t) => {
      this.platform.removeEventListener(this, t, e);
    }), this._listeners = {}, ne(this._responsiveListeners, (e, t) => {
      this.platform.removeEventListener(this, t, e);
    }), this._responsiveListeners = void 0;
  }
  updateHoverStyle(e, t, s) {
    const r = s ? "set" : "remove";
    let o, l, n, a;
    for (t === "dataset" && (o = this.getDatasetMeta(e[0].datasetIndex), o.controller["_" + r + "DatasetHoverStyle"]()), n = 0, a = e.length; n < a; ++n) {
      l = e[n];
      const c = l && this.getDatasetMeta(l.datasetIndex).controller;
      c && c[r + "HoverStyle"](l.element, l.datasetIndex, l.index);
    }
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(e) {
    const t = this._active || [], s = e.map(({ datasetIndex: o, index: l }) => {
      const n = this.getDatasetMeta(o);
      if (!n)
        throw new Error("No dataset found at index " + o);
      return {
        datasetIndex: o,
        element: n.data[l],
        index: l
      };
    });
    !is(s, t) && (this._active = s, this._lastEvent = null, this._updateHoverStyles(s, t));
  }
  notifyPlugins(e, t, s) {
    return this._plugins.notify(this, e, t, s);
  }
  isPluginEnabled(e) {
    return this._plugins._cache.filter((t) => t.plugin.id === e).length === 1;
  }
  _updateHoverStyles(e, t, s) {
    const r = this.options.hover, o = (a, c) => a.filter((u) => !c.some((d) => u.datasetIndex === d.datasetIndex && u.index === d.index)), l = o(t, e), n = s ? e : o(e, t);
    l.length && this.updateHoverStyle(l, r.mode, !1), n.length && r.mode && this.updateHoverStyle(n, r.mode, !0);
  }
  _eventHandler(e, t) {
    const s = {
      event: e,
      replay: t,
      cancelable: !0,
      inChartArea: this.isPointInArea(e)
    }, r = (l) => (l.options.events || this.options.events).includes(e.native.type);
    if (this.notifyPlugins("beforeEvent", s, r) === !1)
      return;
    const o = this._handleEvent(e, t, s.inChartArea);
    return s.cancelable = !1, this.notifyPlugins("afterEvent", s, r), (o || s.changed) && this.render(), this;
  }
  _handleEvent(e, t, s) {
    const { _active: r = [], options: o } = this, l = t, n = this._getActiveElements(e, r, s, l), a = Ll(e), c = wd(e, this._lastEvent, s, a);
    s && (this._lastEvent = null, ae(o.onHover, [
      e,
      n,
      this
    ], this), a && ae(o.onClick, [
      e,
      n,
      this
    ], this));
    const u = !is(n, r);
    return (u || t) && (this._active = n, this._updateHoverStyles(n, r, t)), this._lastEvent = c, u;
  }
  _getActiveElements(e, t, s, r) {
    if (e.type === "mouseout")
      return [];
    if (!s)
      return t;
    const o = this.options.hover;
    return this.getElementsAtEventForMode(e, o.mode, o, r);
  }
}
V(Fe, "defaults", he), V(Fe, "instances", Ji), V(Fe, "overrides", Ct), V(Fe, "registry", $e), V(Fe, "version", bd), V(Fe, "getChart", jn);
function Vn() {
  return ne(Fe.instances, (i) => i._plugins.invalidate());
}
function Cd(i, e, t) {
  const { startAngle: s, x: r, y: o, outerRadius: l, innerRadius: n, options: a } = e, { borderWidth: c, borderJoinStyle: u } = a, d = Math.min(c / l, ye(s - t));
  if (i.beginPath(), i.arc(r, o, l - c / 2, s + d / 2, t - d / 2), n > 0) {
    const f = Math.min(c / n, ye(s - t));
    i.arc(r, o, n + c / 2, t - f / 2, s + f / 2, !0);
  } else {
    const f = Math.min(c / 2, l * ye(s - t));
    if (u === "round")
      i.arc(r, o, f, t - ie / 2, s + ie / 2, !0);
    else if (u === "bevel") {
      const m = 2 * f * f, y = -m * Math.cos(t + ie / 2) + r, v = -m * Math.sin(t + ie / 2) + o, h = m * Math.cos(s + ie / 2) + r, p = m * Math.sin(s + ie / 2) + o;
      i.lineTo(y, v), i.lineTo(h, p);
    }
  }
  i.closePath(), i.moveTo(0, 0), i.rect(0, 0, i.canvas.width, i.canvas.height), i.clip("evenodd");
}
function kd(i, e, t) {
  const { startAngle: s, pixelMargin: r, x: o, y: l, outerRadius: n, innerRadius: a } = e;
  let c = r / n;
  i.beginPath(), i.arc(o, l, n, s - c, t + c), a > r ? (c = r / a, i.arc(o, l, a, t + c, s - c, !0)) : i.arc(o, l, r, t + pe, s - pe), i.closePath(), i.clip();
}
function Ed(i) {
  return vr(i, [
    "outerStart",
    "outerEnd",
    "innerStart",
    "innerEnd"
  ]);
}
function Dd(i, e, t, s) {
  const r = Ed(i.options.borderRadius), o = (t - e) / 2, l = Math.min(o, s * e / 2), n = (a) => {
    const c = (t - Math.min(o, a)) * s / 2;
    return me(a, 0, Math.min(o, c));
  };
  return {
    outerStart: n(r.outerStart),
    outerEnd: n(r.outerEnd),
    innerStart: me(r.innerStart, 0, l),
    innerEnd: me(r.innerEnd, 0, l)
  };
}
function Tt(i, e, t, s) {
  return {
    x: t + i * Math.cos(e),
    y: s + i * Math.sin(e)
  };
}
function ls(i, e, t, s, r, o) {
  const { x: l, y: n, startAngle: a, pixelMargin: c, innerRadius: u } = e, d = Math.max(e.outerRadius + s + t - c, 0), f = u > 0 ? u + s + t + c : 0;
  let m = 0;
  const y = r - a;
  if (s) {
    const $ = u > 0 ? u - s : 0, H = d > 0 ? d - s : 0, z = ($ + H) / 2, E = z !== 0 ? y * z / (z + s) : y;
    m = (y - E) / 2;
  }
  const v = Math.max(1e-3, y * d - t / ie) / d, h = (y - v) / 2, p = a + h + m, g = r - h - m, { outerStart: _, outerEnd: b, innerStart: S, innerEnd: w } = Dd(e, f, d, g - p), k = d - _, x = d - b, C = p + _ / k, A = g - b / x, L = f + S, M = f + w, T = p + S / L, F = g - w / M;
  if (i.beginPath(), o) {
    const $ = (C + A) / 2;
    if (i.arc(l, n, d, C, $), i.arc(l, n, d, $, A), b > 0) {
      const R = Tt(x, A, l, n);
      i.arc(R.x, R.y, b, A, g + pe);
    }
    const H = Tt(M, g, l, n);
    if (i.lineTo(H.x, H.y), w > 0) {
      const R = Tt(M, F, l, n);
      i.arc(R.x, R.y, w, g + pe, F + Math.PI);
    }
    const z = (g - w / f + (p + S / f)) / 2;
    if (i.arc(l, n, f, g - w / f, z, !0), i.arc(l, n, f, z, p + S / f, !0), S > 0) {
      const R = Tt(L, T, l, n);
      i.arc(R.x, R.y, S, T + Math.PI, p - pe);
    }
    const E = Tt(k, p, l, n);
    if (i.lineTo(E.x, E.y), _ > 0) {
      const R = Tt(k, C, l, n);
      i.arc(R.x, R.y, _, p - pe, C);
    }
  } else {
    i.moveTo(l, n);
    const $ = Math.cos(C) * d + l, H = Math.sin(C) * d + n;
    i.lineTo($, H);
    const z = Math.cos(A) * d + l, E = Math.sin(A) * d + n;
    i.lineTo(z, E);
  }
  i.closePath();
}
function Ad(i, e, t, s, r) {
  const { fullCircles: o, startAngle: l, circumference: n } = e;
  let a = e.endAngle;
  if (o) {
    ls(i, e, t, s, a, r);
    for (let c = 0; c < o; ++c)
      i.fill();
    isNaN(n) || (a = l + (n % le || le));
  }
  return ls(i, e, t, s, a, r), i.fill(), a;
}
function Md(i, e, t, s, r) {
  const { fullCircles: o, startAngle: l, circumference: n, options: a } = e, { borderWidth: c, borderJoinStyle: u, borderDash: d, borderDashOffset: f, borderRadius: m } = a, y = a.borderAlign === "inner";
  if (!c)
    return;
  i.setLineDash(d || []), i.lineDashOffset = f, y ? (i.lineWidth = c * 2, i.lineJoin = u || "round") : (i.lineWidth = c, i.lineJoin = u || "bevel");
  let v = e.endAngle;
  if (o) {
    ls(i, e, t, s, v, r);
    for (let h = 0; h < o; ++h)
      i.stroke();
    isNaN(n) || (v = l + (n % le || le));
  }
  y && kd(i, e, v), a.selfJoin && v - l >= ie && m === 0 && u !== "miter" && Cd(i, e, v), o || (ls(i, e, t, s, v, r), i.stroke());
}
class ii extends Oe {
  constructor(t) {
    super();
    V(this, "circumference");
    V(this, "endAngle");
    V(this, "fullCircles");
    V(this, "innerRadius");
    V(this, "outerRadius");
    V(this, "pixelMargin");
    V(this, "startAngle");
    this.options = void 0, this.circumference = void 0, this.startAngle = void 0, this.endAngle = void 0, this.innerRadius = void 0, this.outerRadius = void 0, this.pixelMargin = 0, this.fullCircles = 0, t && Object.assign(this, t);
  }
  inRange(t, s, r) {
    const o = this.getProps([
      "x",
      "y"
    ], r), { angle: l, distance: n } = To(o, {
      x: t,
      y: s
    }), { startAngle: a, endAngle: c, innerRadius: u, outerRadius: d, circumference: f } = this.getProps([
      "startAngle",
      "endAngle",
      "innerRadius",
      "outerRadius",
      "circumference"
    ], r), m = (this.options.spacing + this.options.borderWidth) / 2, y = G(f, c - a), v = vi(l, a, c) && a !== c, h = y >= le || v, p = Ke(n, u + m, d + m);
    return h && p;
  }
  getCenterPoint(t) {
    const { x: s, y: r, startAngle: o, endAngle: l, innerRadius: n, outerRadius: a } = this.getProps([
      "x",
      "y",
      "startAngle",
      "endAngle",
      "innerRadius",
      "outerRadius"
    ], t), { offset: c, spacing: u } = this.options, d = (o + l) / 2, f = (n + a + u + c) / 2;
    return {
      x: s + Math.cos(d) * f,
      y: r + Math.sin(d) * f
    };
  }
  tooltipPosition(t) {
    return this.getCenterPoint(t);
  }
  draw(t) {
    const { options: s, circumference: r } = this, o = (s.offset || 0) / 4, l = (s.spacing || 0) / 2, n = s.circular;
    if (this.pixelMargin = s.borderAlign === "inner" ? 0.33 : 0, this.fullCircles = r > le ? Math.floor(r / le) : 0, r === 0 || this.innerRadius < 0 || this.outerRadius < 0)
      return;
    t.save();
    const a = (this.startAngle + this.endAngle) / 2;
    t.translate(Math.cos(a) * o, Math.sin(a) * o);
    const c = 1 - Math.sin(Math.min(ie, r || 0)), u = o * c;
    t.fillStyle = s.backgroundColor, t.strokeStyle = s.borderColor, Ad(t, this, u, l, n), Md(t, this, u, l, n), t.restore();
  }
}
V(ii, "id", "arc"), V(ii, "defaults", {
  borderAlign: "center",
  borderColor: "#fff",
  borderDash: [],
  borderDashOffset: 0,
  borderJoinStyle: void 0,
  borderRadius: 0,
  borderWidth: 2,
  offset: 0,
  spacing: 0,
  angle: void 0,
  circular: !0,
  selfJoin: !1
}), V(ii, "defaultRoutes", {
  backgroundColor: "backgroundColor"
}), V(ii, "descriptors", {
  _scriptable: !0,
  _indexable: (t) => t !== "borderDash"
});
function ua(i, e, t = e) {
  i.lineCap = G(t.borderCapStyle, e.borderCapStyle), i.setLineDash(G(t.borderDash, e.borderDash)), i.lineDashOffset = G(t.borderDashOffset, e.borderDashOffset), i.lineJoin = G(t.borderJoinStyle, e.borderJoinStyle), i.lineWidth = G(t.borderWidth, e.borderWidth), i.strokeStyle = G(t.borderColor, e.borderColor);
}
function Ld(i, e, t) {
  i.lineTo(t.x, t.y);
}
function Rd(i) {
  return i.stepped ? Ql : i.tension || i.cubicInterpolationMode === "monotone" ? ec : Ld;
}
function fa(i, e, t = {}) {
  const s = i.length, { start: r = 0, end: o = s - 1 } = t, { start: l, end: n } = e, a = Math.max(r, l), c = Math.min(o, n), u = r < l && o < l || r > n && o > n;
  return {
    count: s,
    start: a,
    loop: e.loop,
    ilen: c < a && !u ? s + c - a : c - a
  };
}
function Td(i, e, t, s) {
  const { points: r, options: o } = e, { count: l, start: n, loop: a, ilen: c } = fa(r, t, s), u = Rd(o);
  let { move: d = !0, reverse: f } = s || {}, m, y, v;
  for (m = 0; m <= c; ++m)
    y = r[(n + (f ? c - m : m)) % l], !y.skip && (d ? (i.moveTo(y.x, y.y), d = !1) : u(i, v, y, f, o.stepped), v = y);
  return a && (y = r[(n + (f ? c : 0)) % l], u(i, v, y, f, o.stepped)), !!a;
}
function Pd(i, e, t, s) {
  const r = e.points, { count: o, start: l, ilen: n } = fa(r, t, s), { move: a = !0, reverse: c } = s || {};
  let u = 0, d = 0, f, m, y, v, h, p;
  const g = (b) => (l + (c ? n - b : b)) % o, _ = () => {
    v !== h && (i.lineTo(u, h), i.lineTo(u, v), i.lineTo(u, p));
  };
  for (a && (m = r[g(0)], i.moveTo(m.x, m.y)), f = 0; f <= n; ++f) {
    if (m = r[g(f)], m.skip)
      continue;
    const b = m.x, S = m.y, w = b | 0;
    w === y ? (S < v ? v = S : S > h && (h = S), u = (d * u + b) / ++d) : (_(), i.lineTo(b, S), y = w, d = 0, v = h = S), p = S;
  }
  _();
}
function Xs(i) {
  const e = i.options, t = e.borderDash && e.borderDash.length;
  return !i._decimated && !i._loop && !e.tension && e.cubicInterpolationMode !== "monotone" && !e.stepped && !t ? Pd : Td;
}
function Od(i) {
  return i.stepped ? Tc : i.tension || i.cubicInterpolationMode === "monotone" ? Pc : gt;
}
function Bd(i, e, t, s) {
  let r = e._path;
  r || (r = e._path = new Path2D(), e.path(r, t, s) && r.closePath()), ua(i, e.options), i.stroke(r);
}
function Id(i, e, t, s) {
  const { segments: r, options: o } = e, l = Xs(e);
  for (const n of r)
    ua(i, o, n.style), i.beginPath(), l(i, e, n, {
      start: t,
      end: t + s - 1
    }) && i.closePath(), i.stroke();
}
const $d = typeof Path2D == "function";
function Fd(i, e, t, s) {
  $d && !e.options.segment ? Bd(i, e, t, s) : Id(i, e, t, s);
}
class tt extends Oe {
  constructor(e) {
    super(), this.animated = !0, this.options = void 0, this._chart = void 0, this._loop = void 0, this._fullLoop = void 0, this._path = void 0, this._points = void 0, this._segments = void 0, this._decimated = !1, this._pointsUpdated = !1, this._datasetIndex = void 0, e && Object.assign(this, e);
  }
  updateControlPoints(e, t) {
    const s = this.options;
    if ((s.tension || s.cubicInterpolationMode === "monotone") && !s.stepped && !this._pointsUpdated) {
      const r = s.spanGaps ? this._loop : this._fullLoop;
      Cc(this._points, s, e, r, t), this._pointsUpdated = !0;
    }
  }
  set points(e) {
    this._points = e, delete this._segments, delete this._path, this._pointsUpdated = !1;
  }
  get points() {
    return this._points;
  }
  get segments() {
    return this._segments || (this._segments = Hc(this, this.options.segment));
  }
  first() {
    const e = this.segments, t = this.points;
    return e.length && t[e[0].start];
  }
  last() {
    const e = this.segments, t = this.points, s = e.length;
    return s && t[e[s - 1].end];
  }
  interpolate(e, t) {
    const s = this.options, r = e[t], o = this.points, l = Zo(this, {
      property: t,
      start: r,
      end: r
    });
    if (!l.length)
      return;
    const n = [], a = Od(s);
    let c, u;
    for (c = 0, u = l.length; c < u; ++c) {
      const { start: d, end: f } = l[c], m = o[d], y = o[f];
      if (m === y) {
        n.push(m);
        continue;
      }
      const v = Math.abs((r - m[t]) / (y[t] - m[t])), h = a(m, y, v, s.stepped);
      h[t] = e[t], n.push(h);
    }
    return n.length === 1 ? n[0] : n;
  }
  pathSegment(e, t, s) {
    return Xs(this)(e, this, t, s);
  }
  path(e, t, s) {
    const r = this.segments, o = Xs(this);
    let l = this._loop;
    t = t || 0, s = s || this.points.length - t;
    for (const n of r)
      l &= o(e, this, n, {
        start: t,
        end: t + s - 1
      });
    return !!l;
  }
  draw(e, t, s, r) {
    const o = this.options || {};
    (this.points || []).length && o.borderWidth && (e.save(), Fd(e, this, s, r), e.restore()), this.animated && (this._pointsUpdated = !1, this._path = void 0);
  }
}
V(tt, "id", "line"), V(tt, "defaults", {
  borderCapStyle: "butt",
  borderDash: [],
  borderDashOffset: 0,
  borderJoinStyle: "miter",
  borderWidth: 3,
  capBezierPoints: !0,
  cubicInterpolationMode: "default",
  fill: !1,
  spanGaps: !1,
  stepped: !1,
  tension: 0
}), V(tt, "defaultRoutes", {
  backgroundColor: "backgroundColor",
  borderColor: "borderColor"
}), V(tt, "descriptors", {
  _scriptable: !0,
  _indexable: (e) => e !== "borderDash" && e !== "fill"
});
function qn(i, e, t, s) {
  const r = i.options, { [t]: o } = i.getProps([
    t
  ], s);
  return Math.abs(e - o) < r.radius + r.hitRadius;
}
class Zi extends Oe {
  constructor(t) {
    super();
    V(this, "parsed");
    V(this, "skip");
    V(this, "stop");
    this.options = void 0, this.parsed = void 0, this.skip = void 0, this.stop = void 0, t && Object.assign(this, t);
  }
  inRange(t, s, r) {
    const o = this.options, { x: l, y: n } = this.getProps([
      "x",
      "y"
    ], r);
    return Math.pow(t - l, 2) + Math.pow(s - n, 2) < Math.pow(o.hitRadius + o.radius, 2);
  }
  inXRange(t, s) {
    return qn(this, t, "x", s);
  }
  inYRange(t, s) {
    return qn(this, t, "y", s);
  }
  getCenterPoint(t) {
    const { x: s, y: r } = this.getProps([
      "x",
      "y"
    ], t);
    return {
      x: s,
      y: r
    };
  }
  size(t) {
    t = t || this.options || {};
    let s = t.radius || 0;
    s = Math.max(s, s && t.hoverRadius || 0);
    const r = s && t.borderWidth || 0;
    return (s + r) * 2;
  }
  draw(t, s) {
    const r = this.options;
    this.skip || r.radius < 0.1 || !Xe(this, s, this.size(r) / 2) || (t.strokeStyle = r.borderColor, t.lineWidth = r.borderWidth, t.fillStyle = r.backgroundColor, Vs(t, r, this.x, this.y));
  }
  getRange() {
    const t = this.options || {};
    return t.radius + t.hitRadius;
  }
}
V(Zi, "id", "point"), /**
* @type {any}
*/
V(Zi, "defaults", {
  borderWidth: 1,
  hitRadius: 1,
  hoverBorderWidth: 1,
  hoverRadius: 4,
  pointStyle: "circle",
  radius: 3,
  rotation: 0
}), /**
* @type {any}
*/
V(Zi, "defaultRoutes", {
  backgroundColor: "backgroundColor",
  borderColor: "borderColor"
});
function pa(i, e) {
  const { x: t, y: s, base: r, width: o, height: l } = i.getProps([
    "x",
    "y",
    "base",
    "width",
    "height"
  ], e);
  let n, a, c, u, d;
  return i.horizontal ? (d = l / 2, n = Math.min(t, r), a = Math.max(t, r), c = s - d, u = s + d) : (d = o / 2, n = t - d, a = t + d, c = Math.min(s, r), u = Math.max(s, r)), {
    left: n,
    top: c,
    right: a,
    bottom: u
  };
}
function it(i, e, t, s) {
  return i ? 0 : me(e, t, s);
}
function Hd(i, e, t) {
  const s = i.options.borderWidth, r = i.borderSkipped, o = Wo(s);
  return {
    t: it(r.top, o.top, 0, t),
    r: it(r.right, o.right, 0, e),
    b: it(r.bottom, o.bottom, 0, t),
    l: it(r.left, o.left, 0, e)
  };
}
function zd(i, e, t) {
  const { enableBorderRadius: s } = i.getProps([
    "enableBorderRadius"
  ]), r = i.options.borderRadius, o = yt(r), l = Math.min(e, t), n = i.borderSkipped, a = s || te(r);
  return {
    topLeft: it(!a || n.top || n.left, o.topLeft, 0, l),
    topRight: it(!a || n.top || n.right, o.topRight, 0, l),
    bottomLeft: it(!a || n.bottom || n.left, o.bottomLeft, 0, l),
    bottomRight: it(!a || n.bottom || n.right, o.bottomRight, 0, l)
  };
}
function Wd(i) {
  const e = pa(i), t = e.right - e.left, s = e.bottom - e.top, r = Hd(i, t / 2, s / 2), o = zd(i, t / 2, s / 2);
  return {
    outer: {
      x: e.left,
      y: e.top,
      w: t,
      h: s,
      radius: o
    },
    inner: {
      x: e.left + r.l,
      y: e.top + r.t,
      w: t - r.l - r.r,
      h: s - r.t - r.b,
      radius: {
        topLeft: Math.max(0, o.topLeft - Math.max(r.t, r.l)),
        topRight: Math.max(0, o.topRight - Math.max(r.t, r.r)),
        bottomLeft: Math.max(0, o.bottomLeft - Math.max(r.b, r.l)),
        bottomRight: Math.max(0, o.bottomRight - Math.max(r.b, r.r))
      }
    }
  };
}
function Fs(i, e, t, s) {
  const r = e === null, o = t === null, n = i && !(r && o) && pa(i, s);
  return n && (r || Ke(e, n.left, n.right)) && (o || Ke(t, n.top, n.bottom));
}
function Nd(i) {
  return i.topLeft || i.topRight || i.bottomLeft || i.bottomRight;
}
function Ud(i, e) {
  i.rect(e.x, e.y, e.w, e.h);
}
function Hs(i, e, t = {}) {
  const s = i.x !== t.x ? -e : 0, r = i.y !== t.y ? -e : 0, o = (i.x + i.w !== t.x + t.w ? e : 0) - s, l = (i.y + i.h !== t.y + t.h ? e : 0) - r;
  return {
    x: i.x + s,
    y: i.y + r,
    w: i.w + o,
    h: i.h + l,
    radius: i.radius
  };
}
class Qi extends Oe {
  constructor(e) {
    super(), this.options = void 0, this.horizontal = void 0, this.base = void 0, this.width = void 0, this.height = void 0, this.inflateAmount = void 0, e && Object.assign(this, e);
  }
  draw(e) {
    const { inflateAmount: t, options: { borderColor: s, backgroundColor: r } } = this, { inner: o, outer: l } = Wd(this), n = Nd(l.radius) ? bi : Ud;
    e.save(), (l.w !== o.w || l.h !== o.h) && (e.beginPath(), n(e, Hs(l, t, o)), e.clip(), n(e, Hs(o, -t, l)), e.fillStyle = s, e.fill("evenodd")), e.beginPath(), n(e, Hs(o, t)), e.fillStyle = r, e.fill(), e.restore();
  }
  inRange(e, t, s) {
    return Fs(this, e, t, s);
  }
  inXRange(e, t) {
    return Fs(this, e, null, t);
  }
  inYRange(e, t) {
    return Fs(this, null, e, t);
  }
  getCenterPoint(e) {
    const { x: t, y: s, base: r, horizontal: o } = this.getProps([
      "x",
      "y",
      "base",
      "horizontal"
    ], e);
    return {
      x: o ? (t + r) / 2 : t,
      y: o ? s : (s + r) / 2
    };
  }
  getRange(e) {
    return e === "x" ? this.width / 2 : this.height / 2;
  }
}
V(Qi, "id", "bar"), V(Qi, "defaults", {
  borderSkipped: "start",
  borderWidth: 0,
  borderRadius: 0,
  inflateAmount: "auto",
  pointStyle: void 0
}), V(Qi, "defaultRoutes", {
  backgroundColor: "backgroundColor",
  borderColor: "borderColor"
});
var jd = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ArcElement: ii,
  BarElement: Qi,
  LineElement: tt,
  PointElement: Zi
});
const Gs = [
  "rgb(54, 162, 235)",
  "rgb(255, 99, 132)",
  "rgb(255, 159, 64)",
  "rgb(255, 205, 86)",
  "rgb(75, 192, 192)",
  "rgb(153, 102, 255)",
  "rgb(201, 203, 207)"
  // grey
], Kn = /* @__PURE__ */ Gs.map((i) => i.replace("rgb(", "rgba(").replace(")", ", 0.5)"));
function ga(i) {
  return Gs[i % Gs.length];
}
function _a(i) {
  return Kn[i % Kn.length];
}
function Vd(i, e) {
  return i.borderColor = ga(e), i.backgroundColor = _a(e), ++e;
}
function qd(i, e) {
  return i.backgroundColor = i.data.map(() => ga(e++)), e;
}
function Kd(i, e) {
  return i.backgroundColor = i.data.map(() => _a(e++)), e;
}
function Yd(i) {
  let e = 0;
  return (t, s) => {
    const r = i.getDatasetMeta(s).controller;
    r instanceof mt ? e = qd(t, e) : r instanceof di ? e = Kd(t, e) : r && (e = Vd(t, e));
  };
}
function Yn(i) {
  let e;
  for (e in i)
    if (i[e].borderColor || i[e].backgroundColor)
      return !0;
  return !1;
}
function Xd(i) {
  return i && (i.borderColor || i.backgroundColor);
}
function Gd() {
  return he.borderColor !== "rgba(0,0,0,0.1)" || he.backgroundColor !== "rgba(0,0,0,0.1)";
}
var Jd = {
  id: "colors",
  defaults: {
    enabled: !0,
    forceOverride: !1
  },
  beforeLayout(i, e, t) {
    if (!t.enabled)
      return;
    const { data: { datasets: s }, options: r } = i.config, { elements: o } = r, l = Yn(s) || Xd(r) || o && Yn(o) || Gd();
    if (!t.forceOverride && l)
      return;
    const n = Yd(i);
    s.forEach(n);
  }
};
function Zd(i, e, t, s, r) {
  const o = r.samples || s;
  if (o >= t)
    return i.slice(e, e + t);
  const l = [], n = (t - 2) / (o - 2);
  let a = 0;
  const c = e + t - 1;
  let u = e, d, f, m, y, v;
  for (l[a++] = i[u], d = 0; d < o - 2; d++) {
    let h = 0, p = 0, g;
    const _ = Math.floor((d + 1) * n) + 1 + e, b = Math.min(Math.floor((d + 2) * n) + 1, t) + e, S = b - _;
    for (g = _; g < b; g++)
      h += i[g].x, p += i[g].y;
    h /= S, p /= S;
    const w = Math.floor(d * n) + 1 + e, k = Math.min(Math.floor((d + 1) * n) + 1, t) + e, { x, y: C } = i[u];
    for (m = y = -1, g = w; g < k; g++)
      y = 0.5 * Math.abs((x - h) * (i[g].y - C) - (x - i[g].x) * (p - C)), y > m && (m = y, f = i[g], v = g);
    l[a++] = f, u = v;
  }
  return l[a++] = i[c], l;
}
function Qd(i, e, t, s) {
  let r = 0, o = 0, l, n, a, c, u, d, f, m, y, v;
  const h = [], p = e + t - 1, g = i[e].x, b = i[p].x - g;
  for (l = e; l < e + t; ++l) {
    n = i[l], a = (n.x - g) / b * s, c = n.y;
    const S = a | 0;
    if (S === u)
      c < y ? (y = c, d = l) : c > v && (v = c, f = l), r = (o * r + n.x) / ++o;
    else {
      const w = l - 1;
      if (!ee(d) && !ee(f)) {
        const k = Math.min(d, f), x = Math.max(d, f);
        k !== m && k !== w && h.push({
          ...i[k],
          x: r
        }), x !== m && x !== w && h.push({
          ...i[x],
          x: r
        });
      }
      l > 0 && w !== m && h.push(i[w]), h.push(n), u = S, o = 0, y = v = c, d = f = m = l;
    }
  }
  return h;
}
function ma(i) {
  if (i._decimated) {
    const e = i._data;
    delete i._decimated, delete i._data, Object.defineProperty(i, "data", {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: e
    });
  }
}
function Xn(i) {
  i.data.datasets.forEach((e) => {
    ma(e);
  });
}
function eu(i, e) {
  const t = e.length;
  let s = 0, r;
  const { iScale: o } = i, { min: l, max: n, minDefined: a, maxDefined: c } = o.getUserBounds();
  return a && (s = me(Ye(e, o.axis, l).lo, 0, t - 1)), c ? r = me(Ye(e, o.axis, n).hi + 1, s, t) - s : r = t - s, {
    start: s,
    count: r
  };
}
var tu = {
  id: "decimation",
  defaults: {
    algorithm: "min-max",
    enabled: !1
  },
  beforeElementsUpdate: (i, e, t) => {
    if (!t.enabled) {
      Xn(i);
      return;
    }
    const s = i.width;
    i.data.datasets.forEach((r, o) => {
      const { _data: l, indexAxis: n } = r, a = i.getDatasetMeta(o), c = l || r.data;
      if (ei([
        n,
        i.options.indexAxis
      ]) === "y" || !a.controller.supportsDecimation)
        return;
      const u = i.scales[a.xAxisID];
      if (u.type !== "linear" && u.type !== "time" || i.options.parsing)
        return;
      let { start: d, count: f } = eu(a, c);
      const m = t.threshold || 4 * s;
      if (f <= m) {
        ma(r);
        return;
      }
      ee(l) && (r._data = c, delete r.data, Object.defineProperty(r, "data", {
        configurable: !0,
        enumerable: !0,
        get: function() {
          return this._decimated;
        },
        set: function(v) {
          this._data = v;
        }
      }));
      let y;
      switch (t.algorithm) {
        case "lttb":
          y = Zd(c, d, f, s, t);
          break;
        case "min-max":
          y = Qd(c, d, f, s);
          break;
        default:
          throw new Error(`Unsupported decimation algorithm '${t.algorithm}'`);
      }
      r._decimated = y;
    });
  },
  destroy(i) {
    Xn(i);
  }
};
function iu(i, e, t) {
  const s = i.segments, r = i.points, o = e.points, l = [];
  for (const n of s) {
    let { start: a, end: c } = n;
    c = _s(a, c, r);
    const u = Js(t, r[a], r[c], n.loop);
    if (!e.segments) {
      l.push({
        source: n,
        target: u,
        start: r[a],
        end: r[c]
      });
      continue;
    }
    const d = Zo(e, u);
    for (const f of d) {
      const m = Js(t, o[f.start], o[f.end], f.loop), y = Jo(n, r, m);
      for (const v of y)
        l.push({
          source: v,
          target: f,
          start: {
            [t]: Gn(u, m, "start", Math.max)
          },
          end: {
            [t]: Gn(u, m, "end", Math.min)
          }
        });
    }
  }
  return l;
}
function Js(i, e, t, s) {
  if (s)
    return;
  let r = e[i], o = t[i];
  return i === "angle" && (r = ye(r), o = ye(o)), {
    property: i,
    start: r,
    end: o
  };
}
function su(i, e) {
  const { x: t = null, y: s = null } = i || {}, r = e.points, o = [];
  return e.segments.forEach(({ start: l, end: n }) => {
    n = _s(l, n, r);
    const a = r[l], c = r[n];
    s !== null ? (o.push({
      x: a.x,
      y: s
    }), o.push({
      x: c.x,
      y: s
    })) : t !== null && (o.push({
      x: t,
      y: a.y
    }), o.push({
      x: t,
      y: c.y
    }));
  }), o;
}
function _s(i, e, t) {
  for (; e > i; e--) {
    const s = t[e];
    if (!isNaN(s.x) && !isNaN(s.y))
      break;
  }
  return e;
}
function Gn(i, e, t, s) {
  return i && e ? s(i[t], e[t]) : i ? i[t] : e ? e[t] : 0;
}
function va(i, e) {
  let t = [], s = !1;
  return ce(i) ? (s = !0, t = i) : t = su(i, e), t.length ? new tt({
    points: t,
    options: {
      tension: 0
    },
    _loop: s,
    _fullLoop: s
  }) : null;
}
function Jn(i) {
  return i && i.fill !== !1;
}
function ru(i, e, t) {
  let r = i[e].fill;
  const o = [
    e
  ];
  let l;
  if (!t)
    return r;
  for (; r !== !1 && o.indexOf(r) === -1; ) {
    if (!ue(r))
      return r;
    if (l = i[r], !l)
      return !1;
    if (l.visible)
      return r;
    o.push(r), r = l.fill;
  }
  return !1;
}
function nu(i, e, t) {
  const s = cu(i);
  if (te(s))
    return isNaN(s.value) ? !1 : s;
  let r = parseFloat(s);
  return ue(r) && Math.floor(r) === r ? ou(s[0], e, r, t) : [
    "origin",
    "start",
    "end",
    "stack",
    "shape"
  ].indexOf(s) >= 0 && s;
}
function ou(i, e, t, s) {
  return (i === "-" || i === "+") && (t = e + t), t === e || t < 0 || t >= s ? !1 : t;
}
function au(i, e) {
  let t = null;
  return i === "start" ? t = e.bottom : i === "end" ? t = e.top : te(i) ? t = e.getPixelForValue(i.value) : e.getBasePixel && (t = e.getBasePixel()), t;
}
function lu(i, e, t) {
  let s;
  return i === "start" ? s = t : i === "end" ? s = e.options.reverse ? e.min : e.max : te(i) ? s = i.value : s = e.getBaseValue(), s;
}
function cu(i) {
  const e = i.options, t = e.fill;
  let s = G(t && t.target, t);
  return s === void 0 && (s = !!e.backgroundColor), s === !1 || s === null ? !1 : s === !0 ? "origin" : s;
}
function hu(i) {
  const { scale: e, index: t, line: s } = i, r = [], o = s.segments, l = s.points, n = du(e, t);
  n.push(va({
    x: null,
    y: e.bottom
  }, s));
  for (let a = 0; a < o.length; a++) {
    const c = o[a];
    for (let u = c.start; u <= c.end; u++)
      uu(r, l[u], n);
  }
  return new tt({
    points: r,
    options: {}
  });
}
function du(i, e) {
  const t = [], s = i.getMatchingVisibleMetas("line");
  for (let r = 0; r < s.length; r++) {
    const o = s[r];
    if (o.index === e)
      break;
    o.hidden || t.unshift(o.dataset);
  }
  return t;
}
function uu(i, e, t) {
  const s = [];
  for (let r = 0; r < t.length; r++) {
    const o = t[r], { first: l, last: n, point: a } = fu(o, e, "x");
    if (!(!a || l && n)) {
      if (l)
        s.unshift(a);
      else if (i.push(a), !n)
        break;
    }
  }
  i.push(...s);
}
function fu(i, e, t) {
  const s = i.interpolate(e, t);
  if (!s)
    return {};
  const r = s[t], o = i.segments, l = i.points;
  let n = !1, a = !1;
  for (let c = 0; c < o.length; c++) {
    const u = o[c], d = l[u.start][t], f = l[u.end][t];
    if (Ke(r, d, f)) {
      n = r === d, a = r === f;
      break;
    }
  }
  return {
    first: n,
    last: a,
    point: s
  };
}
class ba {
  constructor(e) {
    this.x = e.x, this.y = e.y, this.radius = e.radius;
  }
  pathSegment(e, t, s) {
    const { x: r, y: o, radius: l } = this;
    return t = t || {
      start: 0,
      end: le
    }, e.arc(r, o, l, t.end, t.start, !0), !s.bounds;
  }
  interpolate(e) {
    const { x: t, y: s, radius: r } = this, o = e.angle;
    return {
      x: t + Math.cos(o) * r,
      y: s + Math.sin(o) * r,
      angle: o
    };
  }
}
function pu(i) {
  const { chart: e, fill: t, line: s } = i;
  if (ue(t))
    return gu(e, t);
  if (t === "stack")
    return hu(i);
  if (t === "shape")
    return !0;
  const r = _u(i);
  return r instanceof ba ? r : va(r, s);
}
function gu(i, e) {
  const t = i.getDatasetMeta(e);
  return t && i.isDatasetVisible(e) ? t.dataset : null;
}
function _u(i) {
  return (i.scale || {}).getPointPositionForValue ? vu(i) : mu(i);
}
function mu(i) {
  const { scale: e = {}, fill: t } = i, s = au(t, e);
  if (ue(s)) {
    const r = e.isHorizontal();
    return {
      x: r ? s : null,
      y: r ? null : s
    };
  }
  return null;
}
function vu(i) {
  const { scale: e, fill: t } = i, s = e.options, r = e.getLabels().length, o = s.reverse ? e.max : e.min, l = lu(t, e, o), n = [];
  if (s.grid.circular) {
    const a = e.getPointPositionForValue(0, o);
    return new ba({
      x: a.x,
      y: a.y,
      radius: e.getDistanceFromCenterForValue(l)
    });
  }
  for (let a = 0; a < r; ++a)
    n.push(e.getPointPositionForValue(a, l));
  return n;
}
function zs(i, e, t) {
  const s = pu(e), { chart: r, index: o, line: l, scale: n, axis: a } = e, c = l.options, u = c.fill, d = c.backgroundColor, { above: f = d, below: m = d } = u || {}, y = r.getDatasetMeta(o), v = Qo(r, y);
  s && l.points.length && (us(i, t), bu(i, {
    line: l,
    target: s,
    above: f,
    below: m,
    area: t,
    scale: n,
    axis: a,
    clip: v
  }), fs(i));
}
function bu(i, e) {
  const { line: t, target: s, above: r, below: o, area: l, scale: n, clip: a } = e, c = t._loop ? "angle" : e.axis;
  i.save();
  let u = o;
  o !== r && (c === "x" ? (Zn(i, s, l.top), Ws(i, {
    line: t,
    target: s,
    color: r,
    scale: n,
    property: c,
    clip: a
  }), i.restore(), i.save(), Zn(i, s, l.bottom)) : c === "y" && (Qn(i, s, l.left), Ws(i, {
    line: t,
    target: s,
    color: o,
    scale: n,
    property: c,
    clip: a
  }), i.restore(), i.save(), Qn(i, s, l.right), u = r)), Ws(i, {
    line: t,
    target: s,
    color: u,
    scale: n,
    property: c,
    clip: a
  }), i.restore();
}
function Zn(i, e, t) {
  const { segments: s, points: r } = e;
  let o = !0, l = !1;
  i.beginPath();
  for (const n of s) {
    const { start: a, end: c } = n, u = r[a], d = r[_s(a, c, r)];
    o ? (i.moveTo(u.x, u.y), o = !1) : (i.lineTo(u.x, t), i.lineTo(u.x, u.y)), l = !!e.pathSegment(i, n, {
      move: l
    }), l ? i.closePath() : i.lineTo(d.x, t);
  }
  i.lineTo(e.first().x, t), i.closePath(), i.clip();
}
function Qn(i, e, t) {
  const { segments: s, points: r } = e;
  let o = !0, l = !1;
  i.beginPath();
  for (const n of s) {
    const { start: a, end: c } = n, u = r[a], d = r[_s(a, c, r)];
    o ? (i.moveTo(u.x, u.y), o = !1) : (i.lineTo(t, u.y), i.lineTo(u.x, u.y)), l = !!e.pathSegment(i, n, {
      move: l
    }), l ? i.closePath() : i.lineTo(t, d.y);
  }
  i.lineTo(t, e.first().y), i.closePath(), i.clip();
}
function Ws(i, e) {
  const { line: t, target: s, property: r, color: o, scale: l, clip: n } = e, a = iu(t, s, r);
  for (const { source: c, target: u, start: d, end: f } of a) {
    const { style: { backgroundColor: m = o } = {} } = c, y = s !== !0;
    i.save(), i.fillStyle = m, yu(i, l, n, y && Js(r, d, f)), i.beginPath();
    const v = !!t.pathSegment(i, c);
    let h;
    if (y) {
      v ? i.closePath() : eo(i, s, f, r);
      const p = !!s.pathSegment(i, u, {
        move: v,
        reverse: !0
      });
      h = v && p, h || eo(i, s, d, r);
    }
    i.closePath(), i.fill(h ? "evenodd" : "nonzero"), i.restore();
  }
}
function yu(i, e, t, s) {
  const r = e.chart.chartArea, { property: o, start: l, end: n } = s || {};
  if (o === "x" || o === "y") {
    let a, c, u, d;
    o === "x" ? (a = l, c = r.top, u = n, d = r.bottom) : (a = r.left, c = l, u = r.right, d = n), i.beginPath(), t && (a = Math.max(a, t.left), u = Math.min(u, t.right), c = Math.max(c, t.top), d = Math.min(d, t.bottom)), i.rect(a, c, u - a, d - c), i.clip();
  }
}
function eo(i, e, t, s) {
  const r = e.interpolate(t, s);
  r && i.lineTo(r.x, r.y);
}
var Su = {
  id: "filler",
  afterDatasetsUpdate(i, e, t) {
    const s = (i.data.datasets || []).length, r = [];
    let o, l, n, a;
    for (l = 0; l < s; ++l)
      o = i.getDatasetMeta(l), n = o.dataset, a = null, n && n.options && n instanceof tt && (a = {
        visible: i.isDatasetVisible(l),
        index: l,
        fill: nu(n, l, s),
        chart: i,
        axis: o.controller.options.indexAxis,
        scale: o.vScale,
        line: n
      }), o.$filler = a, r.push(a);
    for (l = 0; l < s; ++l)
      a = r[l], !(!a || a.fill === !1) && (a.fill = ru(r, l, t.propagate));
  },
  beforeDraw(i, e, t) {
    const s = t.drawTime === "beforeDraw", r = i.getSortedVisibleDatasetMetas(), o = i.chartArea;
    for (let l = r.length - 1; l >= 0; --l) {
      const n = r[l].$filler;
      n && (n.line.updateControlPoints(o, n.axis), s && n.fill && zs(i.ctx, n, o));
    }
  },
  beforeDatasetsDraw(i, e, t) {
    if (t.drawTime !== "beforeDatasetsDraw")
      return;
    const s = i.getSortedVisibleDatasetMetas();
    for (let r = s.length - 1; r >= 0; --r) {
      const o = s[r].$filler;
      Jn(o) && zs(i.ctx, o, i.chartArea);
    }
  },
  beforeDatasetDraw(i, e, t) {
    const s = e.meta.$filler;
    !Jn(s) || t.drawTime !== "beforeDatasetDraw" || zs(i.ctx, s, i.chartArea);
  },
  defaults: {
    propagate: !0,
    drawTime: "beforeDatasetDraw"
  }
};
const to = (i, e) => {
  let { boxHeight: t = e, boxWidth: s = e } = i;
  return i.usePointStyle && (t = Math.min(t, e), s = i.pointStyleWidth || Math.min(s, e)), {
    boxWidth: s,
    boxHeight: t,
    itemHeight: Math.max(e, t)
  };
}, xu = (i, e) => i !== null && e !== null && i.datasetIndex === e.datasetIndex && i.index === e.index;
class io extends Oe {
  constructor(e) {
    super(), this._added = !1, this.legendHitBoxes = [], this._hoveredItem = null, this.doughnutMode = !1, this.chart = e.chart, this.options = e.options, this.ctx = e.ctx, this.legendItems = void 0, this.columnSizes = void 0, this.lineWidths = void 0, this.maxHeight = void 0, this.maxWidth = void 0, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.height = void 0, this.width = void 0, this._margins = void 0, this.position = void 0, this.weight = void 0, this.fullSize = void 0;
  }
  update(e, t, s) {
    this.maxWidth = e, this.maxHeight = t, this._margins = s, this.setDimensions(), this.buildLabels(), this.fit();
  }
  setDimensions() {
    this.isHorizontal() ? (this.width = this.maxWidth, this.left = this._margins.left, this.right = this.width) : (this.height = this.maxHeight, this.top = this._margins.top, this.bottom = this.height);
  }
  buildLabels() {
    const e = this.options.labels || {};
    let t = ae(e.generateLabels, [
      this.chart
    ], this) || [];
    e.filter && (t = t.filter((s) => e.filter(s, this.chart.data))), e.sort && (t = t.sort((s, r) => e.sort(s, r, this.chart.data))), this.options.reverse && t.reverse(), this.legendItems = t;
  }
  fit() {
    const { options: e, ctx: t } = this;
    if (!e.display) {
      this.width = this.height = 0;
      return;
    }
    const s = e.labels, r = ge(s.font), o = r.size, l = this._computeTitleHeight(), { boxWidth: n, itemHeight: a } = to(s, o);
    let c, u;
    t.font = r.string, this.isHorizontal() ? (c = this.maxWidth, u = this._fitRows(l, o, n, a) + 10) : (u = this.maxHeight, c = this._fitCols(l, r, n, a) + 10), this.width = Math.min(c, e.maxWidth || this.maxWidth), this.height = Math.min(u, e.maxHeight || this.maxHeight);
  }
  _fitRows(e, t, s, r) {
    const { ctx: o, maxWidth: l, options: { labels: { padding: n } } } = this, a = this.legendHitBoxes = [], c = this.lineWidths = [
      0
    ], u = r + n;
    let d = e;
    o.textAlign = "left", o.textBaseline = "middle";
    let f = -1, m = -u;
    return this.legendItems.forEach((y, v) => {
      const h = s + t / 2 + o.measureText(y.text).width;
      (v === 0 || c[c.length - 1] + h + 2 * n > l) && (d += u, c[c.length - (v > 0 ? 0 : 1)] = 0, m += u, f++), a[v] = {
        left: 0,
        top: m,
        row: f,
        width: h,
        height: r
      }, c[c.length - 1] += h + n;
    }), d;
  }
  _fitCols(e, t, s, r) {
    const { ctx: o, maxHeight: l, options: { labels: { padding: n } } } = this, a = this.legendHitBoxes = [], c = this.columnSizes = [], u = l - e;
    let d = n, f = 0, m = 0, y = 0, v = 0;
    return this.legendItems.forEach((h, p) => {
      const { itemWidth: g, itemHeight: _ } = wu(s, t, o, h, r);
      p > 0 && m + _ + 2 * n > u && (d += f + n, c.push({
        width: f,
        height: m
      }), y += f + n, v++, f = m = 0), a[p] = {
        left: y,
        top: m,
        col: v,
        width: g,
        height: _
      }, f = Math.max(f, g), m += _ + n;
    }), d += f, c.push({
      width: f,
      height: m
    }), d;
  }
  adjustHitBoxes() {
    if (!this.options.display)
      return;
    const e = this._computeTitleHeight(), { legendHitBoxes: t, options: { align: s, labels: { padding: r }, rtl: o } } = this, l = Ot(o, this.left, this.width);
    if (this.isHorizontal()) {
      let n = 0, a = be(s, this.left + r, this.right - this.lineWidths[n]);
      for (const c of t)
        n !== c.row && (n = c.row, a = be(s, this.left + r, this.right - this.lineWidths[n])), c.top += this.top + e + r, c.left = l.leftForLtr(l.x(a), c.width), a += c.width + r;
    } else {
      let n = 0, a = be(s, this.top + e + r, this.bottom - this.columnSizes[n].height);
      for (const c of t)
        c.col !== n && (n = c.col, a = be(s, this.top + e + r, this.bottom - this.columnSizes[n].height)), c.top = a, c.left += this.left + r, c.left = l.leftForLtr(l.x(c.left), c.width), a += c.height + r;
    }
  }
  isHorizontal() {
    return this.options.position === "top" || this.options.position === "bottom";
  }
  draw() {
    if (this.options.display) {
      const e = this.ctx;
      us(e, this), this._draw(), fs(e);
    }
  }
  _draw() {
    const { options: e, columnSizes: t, lineWidths: s, ctx: r } = this, { align: o, labels: l } = e, n = he.color, a = Ot(e.rtl, this.left, this.width), c = ge(l.font), { padding: u } = l, d = c.size, f = d / 2;
    let m;
    this.drawTitle(), r.textAlign = a.textAlign("left"), r.textBaseline = "middle", r.lineWidth = 0.5, r.font = c.string;
    const { boxWidth: y, boxHeight: v, itemHeight: h } = to(l, d), p = function(w, k, x) {
      if (isNaN(y) || y <= 0 || isNaN(v) || v < 0)
        return;
      r.save();
      const C = G(x.lineWidth, 1);
      if (r.fillStyle = G(x.fillStyle, n), r.lineCap = G(x.lineCap, "butt"), r.lineDashOffset = G(x.lineDashOffset, 0), r.lineJoin = G(x.lineJoin, "miter"), r.lineWidth = C, r.strokeStyle = G(x.strokeStyle, n), r.setLineDash(G(x.lineDash, [])), l.usePointStyle) {
        const A = {
          radius: v * Math.SQRT2 / 2,
          pointStyle: x.pointStyle,
          rotation: x.rotation,
          borderWidth: C
        }, L = a.xPlus(w, y / 2), M = k + f;
        zo(r, A, L, M, l.pointStyleWidth && y);
      } else {
        const A = k + Math.max((d - v) / 2, 0), L = a.leftForLtr(w, y), M = yt(x.borderRadius);
        r.beginPath(), Object.values(M).some((T) => T !== 0) ? bi(r, {
          x: L,
          y: A,
          w: y,
          h: v,
          radius: M
        }) : r.rect(L, A, y, v), r.fill(), C !== 0 && r.stroke();
      }
      r.restore();
    }, g = function(w, k, x) {
      kt(r, x.text, w, k + h / 2, c, {
        strikethrough: x.hidden,
        textAlign: a.textAlign(x.textAlign)
      });
    }, _ = this.isHorizontal(), b = this._computeTitleHeight();
    _ ? m = {
      x: be(o, this.left + u, this.right - s[0]),
      y: this.top + u + b,
      line: 0
    } : m = {
      x: this.left + u,
      y: be(o, this.top + b + u, this.bottom - t[0].height),
      line: 0
    }, Yo(this.ctx, e.textDirection);
    const S = h + u;
    this.legendItems.forEach((w, k) => {
      r.strokeStyle = w.fontColor, r.fillStyle = w.fontColor;
      const x = r.measureText(w.text).width, C = a.textAlign(w.textAlign || (w.textAlign = l.textAlign)), A = y + f + x;
      let L = m.x, M = m.y;
      a.setWidth(this.width), _ ? k > 0 && L + A + u > this.right && (M = m.y += S, m.line++, L = m.x = be(o, this.left + u, this.right - s[m.line])) : k > 0 && M + S > this.bottom && (L = m.x = L + t[m.line].width + u, m.line++, M = m.y = be(o, this.top + b + u, this.bottom - t[m.line].height));
      const T = a.x(L);
      if (p(T, M, w), L = Nl(C, L + y + f, _ ? L + A : this.right, e.rtl), g(a.x(L), M, w), _)
        m.x += A + u;
      else if (typeof w.text != "string") {
        const F = c.lineHeight;
        m.y += ya(w, F) + u;
      } else
        m.y += S;
    }), Xo(this.ctx, e.textDirection);
  }
  drawTitle() {
    const e = this.options, t = e.title, s = ge(t.font), r = xe(t.padding);
    if (!t.display)
      return;
    const o = Ot(e.rtl, this.left, this.width), l = this.ctx, n = t.position, a = s.size / 2, c = r.top + a;
    let u, d = this.left, f = this.width;
    if (this.isHorizontal())
      f = Math.max(...this.lineWidths), u = this.top + c, d = be(e.align, d, this.right - f);
    else {
      const y = this.columnSizes.reduce((v, h) => Math.max(v, h.height), 0);
      u = c + be(e.align, this.top, this.bottom - y - e.labels.padding - this._computeTitleHeight());
    }
    const m = be(n, d, d + f);
    l.textAlign = o.textAlign(_r(n)), l.textBaseline = "middle", l.strokeStyle = t.color, l.fillStyle = t.color, l.font = s.string, kt(l, t.text, m, u, s);
  }
  _computeTitleHeight() {
    const e = this.options.title, t = ge(e.font), s = xe(e.padding);
    return e.display ? t.lineHeight + s.height : 0;
  }
  _getLegendItemAt(e, t) {
    let s, r, o;
    if (Ke(e, this.left, this.right) && Ke(t, this.top, this.bottom)) {
      for (o = this.legendHitBoxes, s = 0; s < o.length; ++s)
        if (r = o[s], Ke(e, r.left, r.left + r.width) && Ke(t, r.top, r.top + r.height))
          return this.legendItems[s];
    }
    return null;
  }
  handleEvent(e) {
    const t = this.options;
    if (!Eu(e.type, t))
      return;
    const s = this._getLegendItemAt(e.x, e.y);
    if (e.type === "mousemove" || e.type === "mouseout") {
      const r = this._hoveredItem, o = xu(r, s);
      r && !o && ae(t.onLeave, [
        e,
        r,
        this
      ], this), this._hoveredItem = s, s && !o && ae(t.onHover, [
        e,
        s,
        this
      ], this);
    } else s && ae(t.onClick, [
      e,
      s,
      this
    ], this);
  }
}
function wu(i, e, t, s, r) {
  const o = Cu(s, i, e, t), l = ku(r, s, e.lineHeight);
  return {
    itemWidth: o,
    itemHeight: l
  };
}
function Cu(i, e, t, s) {
  let r = i.text;
  return r && typeof r != "string" && (r = r.reduce((o, l) => o.length > l.length ? o : l)), e + t.size / 2 + s.measureText(r).width;
}
function ku(i, e, t) {
  let s = i;
  return typeof e.text != "string" && (s = ya(e, t)), s;
}
function ya(i, e) {
  const t = i.text ? i.text.length : 0;
  return e * t;
}
function Eu(i, e) {
  return !!((i === "mousemove" || i === "mouseout") && (e.onHover || e.onLeave) || e.onClick && (i === "click" || i === "mouseup"));
}
var Du = {
  id: "legend",
  _element: io,
  start(i, e, t) {
    const s = i.legend = new io({
      ctx: i.ctx,
      options: t,
      chart: i
    });
    Se.configure(i, s, t), Se.addBox(i, s);
  },
  stop(i) {
    Se.removeBox(i, i.legend), delete i.legend;
  },
  beforeUpdate(i, e, t) {
    const s = i.legend;
    Se.configure(i, s, t), s.options = t;
  },
  afterUpdate(i) {
    const e = i.legend;
    e.buildLabels(), e.adjustHitBoxes();
  },
  afterEvent(i, e) {
    e.replay || i.legend.handleEvent(e.event);
  },
  defaults: {
    display: !0,
    position: "top",
    align: "center",
    fullSize: !0,
    reverse: !1,
    weight: 1e3,
    onClick(i, e, t) {
      const s = e.datasetIndex, r = t.chart;
      r.isDatasetVisible(s) ? (r.hide(s), e.hidden = !0) : (r.show(s), e.hidden = !1);
    },
    onHover: null,
    onLeave: null,
    labels: {
      color: (i) => i.chart.options.color,
      boxWidth: 40,
      padding: 10,
      generateLabels(i) {
        const e = i.data.datasets, { labels: { usePointStyle: t, pointStyle: s, textAlign: r, color: o, useBorderRadius: l, borderRadius: n } } = i.legend.options;
        return i._getSortedDatasetMetas().map((a) => {
          const c = a.controller.getStyle(t ? 0 : void 0), u = xe(c.borderWidth);
          return {
            text: e[a.index].label,
            fillStyle: c.backgroundColor,
            fontColor: o,
            hidden: !a.visible,
            lineCap: c.borderCapStyle,
            lineDash: c.borderDash,
            lineDashOffset: c.borderDashOffset,
            lineJoin: c.borderJoinStyle,
            lineWidth: (u.width + u.height) / 4,
            strokeStyle: c.borderColor,
            pointStyle: s || c.pointStyle,
            rotation: c.rotation,
            textAlign: r || c.textAlign,
            borderRadius: l && (n || c.borderRadius),
            datasetIndex: a.index
          };
        }, this);
      }
    },
    title: {
      color: (i) => i.chart.options.color,
      display: !1,
      position: "center",
      text: ""
    }
  },
  descriptors: {
    _scriptable: (i) => !i.startsWith("on"),
    labels: {
      _scriptable: (i) => ![
        "generateLabels",
        "filter",
        "sort"
      ].includes(i)
    }
  }
};
class kr extends Oe {
  constructor(e) {
    super(), this.chart = e.chart, this.options = e.options, this.ctx = e.ctx, this._padding = void 0, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.width = void 0, this.height = void 0, this.position = void 0, this.weight = void 0, this.fullSize = void 0;
  }
  update(e, t) {
    const s = this.options;
    if (this.left = 0, this.top = 0, !s.display) {
      this.width = this.height = this.right = this.bottom = 0;
      return;
    }
    this.width = this.right = e, this.height = this.bottom = t;
    const r = ce(s.text) ? s.text.length : 1;
    this._padding = xe(s.padding);
    const o = r * ge(s.font).lineHeight + this._padding.height;
    this.isHorizontal() ? this.height = o : this.width = o;
  }
  isHorizontal() {
    const e = this.options.position;
    return e === "top" || e === "bottom";
  }
  _drawArgs(e) {
    const { top: t, left: s, bottom: r, right: o, options: l } = this, n = l.align;
    let a = 0, c, u, d;
    return this.isHorizontal() ? (u = be(n, s, o), d = t + e, c = o - s) : (l.position === "left" ? (u = s + e, d = be(n, r, t), a = ie * -0.5) : (u = o - e, d = be(n, t, r), a = ie * 0.5), c = r - t), {
      titleX: u,
      titleY: d,
      maxWidth: c,
      rotation: a
    };
  }
  draw() {
    const e = this.ctx, t = this.options;
    if (!t.display)
      return;
    const s = ge(t.font), o = s.lineHeight / 2 + this._padding.top, { titleX: l, titleY: n, maxWidth: a, rotation: c } = this._drawArgs(o);
    kt(e, t.text, 0, 0, s, {
      color: t.color,
      maxWidth: a,
      rotation: c,
      textAlign: _r(t.align),
      textBaseline: "middle",
      translation: [
        l,
        n
      ]
    });
  }
}
function Au(i, e) {
  const t = new kr({
    ctx: i.ctx,
    options: e,
    chart: i
  });
  Se.configure(i, t, e), Se.addBox(i, t), i.titleBlock = t;
}
var Mu = {
  id: "title",
  _element: kr,
  start(i, e, t) {
    Au(i, t);
  },
  stop(i) {
    const e = i.titleBlock;
    Se.removeBox(i, e), delete i.titleBlock;
  },
  beforeUpdate(i, e, t) {
    const s = i.titleBlock;
    Se.configure(i, s, t), s.options = t;
  },
  defaults: {
    align: "center",
    display: !1,
    font: {
      weight: "bold"
    },
    fullSize: !0,
    padding: 10,
    position: "top",
    text: "",
    weight: 2e3
  },
  defaultRoutes: {
    color: "color"
  },
  descriptors: {
    _scriptable: !0,
    _indexable: !1
  }
};
const Wi = /* @__PURE__ */ new WeakMap();
var Lu = {
  id: "subtitle",
  start(i, e, t) {
    const s = new kr({
      ctx: i.ctx,
      options: t,
      chart: i
    });
    Se.configure(i, s, t), Se.addBox(i, s), Wi.set(i, s);
  },
  stop(i) {
    Se.removeBox(i, Wi.get(i)), Wi.delete(i);
  },
  beforeUpdate(i, e, t) {
    const s = Wi.get(i);
    Se.configure(i, s, t), s.options = t;
  },
  defaults: {
    align: "center",
    display: !1,
    font: {
      weight: "normal"
    },
    fullSize: !0,
    padding: 0,
    position: "top",
    text: "",
    weight: 1500
  },
  defaultRoutes: {
    color: "color"
  },
  descriptors: {
    _scriptable: !0,
    _indexable: !1
  }
};
const si = {
  average(i) {
    if (!i.length)
      return !1;
    let e, t, s = /* @__PURE__ */ new Set(), r = 0, o = 0;
    for (e = 0, t = i.length; e < t; ++e) {
      const n = i[e].element;
      if (n && n.hasValue()) {
        const a = n.tooltipPosition();
        s.add(a.x), r += a.y, ++o;
      }
    }
    return o === 0 || s.size === 0 ? !1 : {
      x: [
        ...s
      ].reduce((n, a) => n + a) / s.size,
      y: r / o
    };
  },
  nearest(i, e) {
    if (!i.length)
      return !1;
    let t = e.x, s = e.y, r = Number.POSITIVE_INFINITY, o, l, n;
    for (o = 0, l = i.length; o < l; ++o) {
      const a = i[o].element;
      if (a && a.hasValue()) {
        const c = a.getCenterPoint(), u = Us(e, c);
        u < r && (r = u, n = a);
      }
    }
    if (n) {
      const a = n.tooltipPosition();
      t = a.x, s = a.y;
    }
    return {
      x: t,
      y: s
    };
  }
};
function Ie(i, e) {
  return e && (ce(e) ? Array.prototype.push.apply(i, e) : i.push(e)), i;
}
function Ve(i) {
  return (typeof i == "string" || i instanceof String) && i.indexOf(`
`) > -1 ? i.split(`
`) : i;
}
function Ru(i, e) {
  const { element: t, datasetIndex: s, index: r } = e, o = i.getDatasetMeta(s).controller, { label: l, value: n } = o.getLabelAndValue(r);
  return {
    chart: i,
    label: l,
    parsed: o.getParsed(r),
    raw: i.data.datasets[s].data[r],
    formattedValue: n,
    dataset: o.getDataset(),
    dataIndex: r,
    datasetIndex: s,
    element: t
  };
}
function so(i, e) {
  const t = i.chart.ctx, { body: s, footer: r, title: o } = i, { boxWidth: l, boxHeight: n } = e, a = ge(e.bodyFont), c = ge(e.titleFont), u = ge(e.footerFont), d = o.length, f = r.length, m = s.length, y = xe(e.padding);
  let v = y.height, h = 0, p = s.reduce((b, S) => b + S.before.length + S.lines.length + S.after.length, 0);
  if (p += i.beforeBody.length + i.afterBody.length, d && (v += d * c.lineHeight + (d - 1) * e.titleSpacing + e.titleMarginBottom), p) {
    const b = e.displayColors ? Math.max(n, a.lineHeight) : a.lineHeight;
    v += m * b + (p - m) * a.lineHeight + (p - 1) * e.bodySpacing;
  }
  f && (v += e.footerMarginTop + f * u.lineHeight + (f - 1) * e.footerSpacing);
  let g = 0;
  const _ = function(b) {
    h = Math.max(h, t.measureText(b).width + g);
  };
  return t.save(), t.font = c.string, ne(i.title, _), t.font = a.string, ne(i.beforeBody.concat(i.afterBody), _), g = e.displayColors ? l + 2 + e.boxPadding : 0, ne(s, (b) => {
    ne(b.before, _), ne(b.lines, _), ne(b.after, _);
  }), g = 0, t.font = u.string, ne(i.footer, _), t.restore(), h += y.width, {
    width: h,
    height: v
  };
}
function Tu(i, e) {
  const { y: t, height: s } = e;
  return t < s / 2 ? "top" : t > i.height - s / 2 ? "bottom" : "center";
}
function Pu(i, e, t, s) {
  const { x: r, width: o } = s, l = t.caretSize + t.caretPadding;
  if (i === "left" && r + o + l > e.width || i === "right" && r - o - l < 0)
    return !0;
}
function Ou(i, e, t, s) {
  const { x: r, width: o } = t, { width: l, chartArea: { left: n, right: a } } = i;
  let c = "center";
  return s === "center" ? c = r <= (n + a) / 2 ? "left" : "right" : r <= o / 2 ? c = "left" : r >= l - o / 2 && (c = "right"), Pu(c, i, e, t) && (c = "center"), c;
}
function ro(i, e, t) {
  const s = t.yAlign || e.yAlign || Tu(i, t);
  return {
    xAlign: t.xAlign || e.xAlign || Ou(i, e, t, s),
    yAlign: s
  };
}
function Bu(i, e) {
  let { x: t, width: s } = i;
  return e === "right" ? t -= s : e === "center" && (t -= s / 2), t;
}
function Iu(i, e, t) {
  let { y: s, height: r } = i;
  return e === "top" ? s += t : e === "bottom" ? s -= r + t : s -= r / 2, s;
}
function no(i, e, t, s) {
  const { caretSize: r, caretPadding: o, cornerRadius: l } = i, { xAlign: n, yAlign: a } = t, c = r + o, { topLeft: u, topRight: d, bottomLeft: f, bottomRight: m } = yt(l);
  let y = Bu(e, n);
  const v = Iu(e, a, c);
  return a === "center" ? n === "left" ? y += c : n === "right" && (y -= c) : n === "left" ? y -= Math.max(u, f) + r : n === "right" && (y += Math.max(d, m) + r), {
    x: me(y, 0, s.width - e.width),
    y: me(v, 0, s.height - e.height)
  };
}
function Ni(i, e, t) {
  const s = xe(t.padding);
  return e === "center" ? i.x + i.width / 2 : e === "right" ? i.x + i.width - s.right : i.x + s.left;
}
function oo(i) {
  return Ie([], Ve(i));
}
function $u(i, e, t) {
  return lt(i, {
    tooltip: e,
    tooltipItems: t,
    type: "tooltip"
  });
}
function ao(i, e) {
  const t = e && e.dataset && e.dataset.tooltip && e.dataset.tooltip.callbacks;
  return t ? i.override(t) : i;
}
const Sa = {
  beforeTitle: Ue,
  title(i) {
    if (i.length > 0) {
      const e = i[0], t = e.chart.data.labels, s = t ? t.length : 0;
      if (this && this.options && this.options.mode === "dataset")
        return e.dataset.label || "";
      if (e.label)
        return e.label;
      if (s > 0 && e.dataIndex < s)
        return t[e.dataIndex];
    }
    return "";
  },
  afterTitle: Ue,
  beforeBody: Ue,
  beforeLabel: Ue,
  label(i) {
    if (this && this.options && this.options.mode === "dataset")
      return i.label + ": " + i.formattedValue || i.formattedValue;
    let e = i.dataset.label || "";
    e && (e += ": ");
    const t = i.formattedValue;
    return ee(t) || (e += t), e;
  },
  labelColor(i) {
    const t = i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);
    return {
      borderColor: t.borderColor,
      backgroundColor: t.backgroundColor,
      borderWidth: t.borderWidth,
      borderDash: t.borderDash,
      borderDashOffset: t.borderDashOffset,
      borderRadius: 0
    };
  },
  labelTextColor() {
    return this.options.bodyColor;
  },
  labelPointStyle(i) {
    const t = i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);
    return {
      pointStyle: t.pointStyle,
      rotation: t.rotation
    };
  },
  afterLabel: Ue,
  afterBody: Ue,
  beforeFooter: Ue,
  footer: Ue,
  afterFooter: Ue
};
function ke(i, e, t, s) {
  const r = i[e].call(t, s);
  return typeof r > "u" ? Sa[e].call(t, s) : r;
}
class Zs extends Oe {
  constructor(e) {
    super(), this.opacity = 0, this._active = [], this._eventPosition = void 0, this._size = void 0, this._cachedAnimations = void 0, this._tooltipItems = [], this.$animations = void 0, this.$context = void 0, this.chart = e.chart, this.options = e.options, this.dataPoints = void 0, this.title = void 0, this.beforeBody = void 0, this.body = void 0, this.afterBody = void 0, this.footer = void 0, this.xAlign = void 0, this.yAlign = void 0, this.x = void 0, this.y = void 0, this.height = void 0, this.width = void 0, this.caretX = void 0, this.caretY = void 0, this.labelColors = void 0, this.labelPointStyles = void 0, this.labelTextColors = void 0;
  }
  initialize(e) {
    this.options = e, this._cachedAnimations = void 0, this.$context = void 0;
  }
  _resolveAnimations() {
    const e = this._cachedAnimations;
    if (e)
      return e;
    const t = this.chart, s = this.options.setContext(this.getContext()), r = s.enabled && t.options.animation && s.animations, o = new ea(this.chart, r);
    return r._cacheable && (this._cachedAnimations = Object.freeze(o)), o;
  }
  getContext() {
    return this.$context || (this.$context = $u(this.chart.getContext(), this, this._tooltipItems));
  }
  getTitle(e, t) {
    const { callbacks: s } = t, r = ke(s, "beforeTitle", this, e), o = ke(s, "title", this, e), l = ke(s, "afterTitle", this, e);
    let n = [];
    return n = Ie(n, Ve(r)), n = Ie(n, Ve(o)), n = Ie(n, Ve(l)), n;
  }
  getBeforeBody(e, t) {
    return oo(ke(t.callbacks, "beforeBody", this, e));
  }
  getBody(e, t) {
    const { callbacks: s } = t, r = [];
    return ne(e, (o) => {
      const l = {
        before: [],
        lines: [],
        after: []
      }, n = ao(s, o);
      Ie(l.before, Ve(ke(n, "beforeLabel", this, o))), Ie(l.lines, ke(n, "label", this, o)), Ie(l.after, Ve(ke(n, "afterLabel", this, o))), r.push(l);
    }), r;
  }
  getAfterBody(e, t) {
    return oo(ke(t.callbacks, "afterBody", this, e));
  }
  getFooter(e, t) {
    const { callbacks: s } = t, r = ke(s, "beforeFooter", this, e), o = ke(s, "footer", this, e), l = ke(s, "afterFooter", this, e);
    let n = [];
    return n = Ie(n, Ve(r)), n = Ie(n, Ve(o)), n = Ie(n, Ve(l)), n;
  }
  _createItems(e) {
    const t = this._active, s = this.chart.data, r = [], o = [], l = [];
    let n = [], a, c;
    for (a = 0, c = t.length; a < c; ++a)
      n.push(Ru(this.chart, t[a]));
    return e.filter && (n = n.filter((u, d, f) => e.filter(u, d, f, s))), e.itemSort && (n = n.sort((u, d) => e.itemSort(u, d, s))), ne(n, (u) => {
      const d = ao(e.callbacks, u);
      r.push(ke(d, "labelColor", this, u)), o.push(ke(d, "labelPointStyle", this, u)), l.push(ke(d, "labelTextColor", this, u));
    }), this.labelColors = r, this.labelPointStyles = o, this.labelTextColors = l, this.dataPoints = n, n;
  }
  update(e, t) {
    const s = this.options.setContext(this.getContext()), r = this._active;
    let o, l = [];
    if (!r.length)
      this.opacity !== 0 && (o = {
        opacity: 0
      });
    else {
      const n = si[s.position].call(this, r, this._eventPosition);
      l = this._createItems(s), this.title = this.getTitle(l, s), this.beforeBody = this.getBeforeBody(l, s), this.body = this.getBody(l, s), this.afterBody = this.getAfterBody(l, s), this.footer = this.getFooter(l, s);
      const a = this._size = so(this, s), c = Object.assign({}, n, a), u = ro(this.chart, s, c), d = no(s, c, u, this.chart);
      this.xAlign = u.xAlign, this.yAlign = u.yAlign, o = {
        opacity: 1,
        x: d.x,
        y: d.y,
        width: a.width,
        height: a.height,
        caretX: n.x,
        caretY: n.y
      };
    }
    this._tooltipItems = l, this.$context = void 0, o && this._resolveAnimations().update(this, o), e && s.external && s.external.call(this, {
      chart: this.chart,
      tooltip: this,
      replay: t
    });
  }
  drawCaret(e, t, s, r) {
    const o = this.getCaretPosition(e, s, r);
    t.lineTo(o.x1, o.y1), t.lineTo(o.x2, o.y2), t.lineTo(o.x3, o.y3);
  }
  getCaretPosition(e, t, s) {
    const { xAlign: r, yAlign: o } = this, { caretSize: l, cornerRadius: n } = s, { topLeft: a, topRight: c, bottomLeft: u, bottomRight: d } = yt(n), { x: f, y: m } = e, { width: y, height: v } = t;
    let h, p, g, _, b, S;
    return o === "center" ? (b = m + v / 2, r === "left" ? (h = f, p = h - l, _ = b + l, S = b - l) : (h = f + y, p = h + l, _ = b - l, S = b + l), g = h) : (r === "left" ? p = f + Math.max(a, u) + l : r === "right" ? p = f + y - Math.max(c, d) - l : p = this.caretX, o === "top" ? (_ = m, b = _ - l, h = p - l, g = p + l) : (_ = m + v, b = _ + l, h = p + l, g = p - l), S = _), {
      x1: h,
      x2: p,
      x3: g,
      y1: _,
      y2: b,
      y3: S
    };
  }
  drawTitle(e, t, s) {
    const r = this.title, o = r.length;
    let l, n, a;
    if (o) {
      const c = Ot(s.rtl, this.x, this.width);
      for (e.x = Ni(this, s.titleAlign, s), t.textAlign = c.textAlign(s.titleAlign), t.textBaseline = "middle", l = ge(s.titleFont), n = s.titleSpacing, t.fillStyle = s.titleColor, t.font = l.string, a = 0; a < o; ++a)
        t.fillText(r[a], c.x(e.x), e.y + l.lineHeight / 2), e.y += l.lineHeight + n, a + 1 === o && (e.y += s.titleMarginBottom - n);
    }
  }
  _drawColorBox(e, t, s, r, o) {
    const l = this.labelColors[s], n = this.labelPointStyles[s], { boxHeight: a, boxWidth: c } = o, u = ge(o.bodyFont), d = Ni(this, "left", o), f = r.x(d), m = a < u.lineHeight ? (u.lineHeight - a) / 2 : 0, y = t.y + m;
    if (o.usePointStyle) {
      const v = {
        radius: Math.min(c, a) / 2,
        pointStyle: n.pointStyle,
        rotation: n.rotation,
        borderWidth: 1
      }, h = r.leftForLtr(f, c) + c / 2, p = y + a / 2;
      e.strokeStyle = o.multiKeyBackground, e.fillStyle = o.multiKeyBackground, Vs(e, v, h, p), e.strokeStyle = l.borderColor, e.fillStyle = l.backgroundColor, Vs(e, v, h, p);
    } else {
      e.lineWidth = te(l.borderWidth) ? Math.max(...Object.values(l.borderWidth)) : l.borderWidth || 1, e.strokeStyle = l.borderColor, e.setLineDash(l.borderDash || []), e.lineDashOffset = l.borderDashOffset || 0;
      const v = r.leftForLtr(f, c), h = r.leftForLtr(r.xPlus(f, 1), c - 2), p = yt(l.borderRadius);
      Object.values(p).some((g) => g !== 0) ? (e.beginPath(), e.fillStyle = o.multiKeyBackground, bi(e, {
        x: v,
        y,
        w: c,
        h: a,
        radius: p
      }), e.fill(), e.stroke(), e.fillStyle = l.backgroundColor, e.beginPath(), bi(e, {
        x: h,
        y: y + 1,
        w: c - 2,
        h: a - 2,
        radius: p
      }), e.fill()) : (e.fillStyle = o.multiKeyBackground, e.fillRect(v, y, c, a), e.strokeRect(v, y, c, a), e.fillStyle = l.backgroundColor, e.fillRect(h, y + 1, c - 2, a - 2));
    }
    e.fillStyle = this.labelTextColors[s];
  }
  drawBody(e, t, s) {
    const { body: r } = this, { bodySpacing: o, bodyAlign: l, displayColors: n, boxHeight: a, boxWidth: c, boxPadding: u } = s, d = ge(s.bodyFont);
    let f = d.lineHeight, m = 0;
    const y = Ot(s.rtl, this.x, this.width), v = function(x) {
      t.fillText(x, y.x(e.x + m), e.y + f / 2), e.y += f + o;
    }, h = y.textAlign(l);
    let p, g, _, b, S, w, k;
    for (t.textAlign = l, t.textBaseline = "middle", t.font = d.string, e.x = Ni(this, h, s), t.fillStyle = s.bodyColor, ne(this.beforeBody, v), m = n && h !== "right" ? l === "center" ? c / 2 + u : c + 2 + u : 0, b = 0, w = r.length; b < w; ++b) {
      for (p = r[b], g = this.labelTextColors[b], t.fillStyle = g, ne(p.before, v), _ = p.lines, n && _.length && (this._drawColorBox(t, e, b, y, s), f = Math.max(d.lineHeight, a)), S = 0, k = _.length; S < k; ++S)
        v(_[S]), f = d.lineHeight;
      ne(p.after, v);
    }
    m = 0, f = d.lineHeight, ne(this.afterBody, v), e.y -= o;
  }
  drawFooter(e, t, s) {
    const r = this.footer, o = r.length;
    let l, n;
    if (o) {
      const a = Ot(s.rtl, this.x, this.width);
      for (e.x = Ni(this, s.footerAlign, s), e.y += s.footerMarginTop, t.textAlign = a.textAlign(s.footerAlign), t.textBaseline = "middle", l = ge(s.footerFont), t.fillStyle = s.footerColor, t.font = l.string, n = 0; n < o; ++n)
        t.fillText(r[n], a.x(e.x), e.y + l.lineHeight / 2), e.y += l.lineHeight + s.footerSpacing;
    }
  }
  drawBackground(e, t, s, r) {
    const { xAlign: o, yAlign: l } = this, { x: n, y: a } = e, { width: c, height: u } = s, { topLeft: d, topRight: f, bottomLeft: m, bottomRight: y } = yt(r.cornerRadius);
    t.fillStyle = r.backgroundColor, t.strokeStyle = r.borderColor, t.lineWidth = r.borderWidth, t.beginPath(), t.moveTo(n + d, a), l === "top" && this.drawCaret(e, t, s, r), t.lineTo(n + c - f, a), t.quadraticCurveTo(n + c, a, n + c, a + f), l === "center" && o === "right" && this.drawCaret(e, t, s, r), t.lineTo(n + c, a + u - y), t.quadraticCurveTo(n + c, a + u, n + c - y, a + u), l === "bottom" && this.drawCaret(e, t, s, r), t.lineTo(n + m, a + u), t.quadraticCurveTo(n, a + u, n, a + u - m), l === "center" && o === "left" && this.drawCaret(e, t, s, r), t.lineTo(n, a + d), t.quadraticCurveTo(n, a, n + d, a), t.closePath(), t.fill(), r.borderWidth > 0 && t.stroke();
  }
  _updateAnimationTarget(e) {
    const t = this.chart, s = this.$animations, r = s && s.x, o = s && s.y;
    if (r || o) {
      const l = si[e.position].call(this, this._active, this._eventPosition);
      if (!l)
        return;
      const n = this._size = so(this, e), a = Object.assign({}, l, this._size), c = ro(t, e, a), u = no(e, a, c, t);
      (r._to !== u.x || o._to !== u.y) && (this.xAlign = c.xAlign, this.yAlign = c.yAlign, this.width = n.width, this.height = n.height, this.caretX = l.x, this.caretY = l.y, this._resolveAnimations().update(this, u));
    }
  }
  _willRender() {
    return !!this.opacity;
  }
  draw(e) {
    const t = this.options.setContext(this.getContext());
    let s = this.opacity;
    if (!s)
      return;
    this._updateAnimationTarget(t);
    const r = {
      width: this.width,
      height: this.height
    }, o = {
      x: this.x,
      y: this.y
    };
    s = Math.abs(s) < 1e-3 ? 0 : s;
    const l = xe(t.padding), n = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
    t.enabled && n && (e.save(), e.globalAlpha = s, this.drawBackground(o, e, r, t), Yo(e, t.textDirection), o.y += l.top, this.drawTitle(o, e, t), this.drawBody(o, e, t), this.drawFooter(o, e, t), Xo(e, t.textDirection), e.restore());
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(e, t) {
    const s = this._active, r = e.map(({ datasetIndex: n, index: a }) => {
      const c = this.chart.getDatasetMeta(n);
      if (!c)
        throw new Error("Cannot find a dataset at index " + n);
      return {
        datasetIndex: n,
        element: c.data[a],
        index: a
      };
    }), o = !is(s, r), l = this._positionChanged(r, t);
    (o || l) && (this._active = r, this._eventPosition = t, this._ignoreReplayEvents = !0, this.update(!0));
  }
  handleEvent(e, t, s = !0) {
    if (t && this._ignoreReplayEvents)
      return !1;
    this._ignoreReplayEvents = !1;
    const r = this.options, o = this._active || [], l = this._getActiveElements(e, o, t, s), n = this._positionChanged(l, e), a = t || !is(l, o) || n;
    return a && (this._active = l, (r.enabled || r.external) && (this._eventPosition = {
      x: e.x,
      y: e.y
    }, this.update(!0, t))), a;
  }
  _getActiveElements(e, t, s, r) {
    const o = this.options;
    if (e.type === "mouseout")
      return [];
    if (!r)
      return t.filter((n) => this.chart.data.datasets[n.datasetIndex] && this.chart.getDatasetMeta(n.datasetIndex).controller.getParsed(n.index) !== void 0);
    const l = this.chart.getElementsAtEventForMode(e, o.mode, o, s);
    return o.reverse && l.reverse(), l;
  }
  _positionChanged(e, t) {
    const { caretX: s, caretY: r, options: o } = this, l = si[o.position].call(this, e, t);
    return l !== !1 && (s !== l.x || r !== l.y);
  }
}
V(Zs, "positioners", si);
var Fu = {
  id: "tooltip",
  _element: Zs,
  positioners: si,
  afterInit(i, e, t) {
    t && (i.tooltip = new Zs({
      chart: i,
      options: t
    }));
  },
  beforeUpdate(i, e, t) {
    i.tooltip && i.tooltip.initialize(t);
  },
  reset(i, e, t) {
    i.tooltip && i.tooltip.initialize(t);
  },
  afterDraw(i) {
    const e = i.tooltip;
    if (e && e._willRender()) {
      const t = {
        tooltip: e
      };
      if (i.notifyPlugins("beforeTooltipDraw", {
        ...t,
        cancelable: !0
      }) === !1)
        return;
      e.draw(i.ctx), i.notifyPlugins("afterTooltipDraw", t);
    }
  },
  afterEvent(i, e) {
    if (i.tooltip) {
      const t = e.replay;
      i.tooltip.handleEvent(e.event, t, e.inChartArea) && (e.changed = !0);
    }
  },
  defaults: {
    enabled: !0,
    external: null,
    position: "average",
    backgroundColor: "rgba(0,0,0,0.8)",
    titleColor: "#fff",
    titleFont: {
      weight: "bold"
    },
    titleSpacing: 2,
    titleMarginBottom: 6,
    titleAlign: "left",
    bodyColor: "#fff",
    bodySpacing: 2,
    bodyFont: {},
    bodyAlign: "left",
    footerColor: "#fff",
    footerSpacing: 2,
    footerMarginTop: 6,
    footerFont: {
      weight: "bold"
    },
    footerAlign: "left",
    padding: 6,
    caretPadding: 2,
    caretSize: 5,
    cornerRadius: 6,
    boxHeight: (i, e) => e.bodyFont.size,
    boxWidth: (i, e) => e.bodyFont.size,
    multiKeyBackground: "#fff",
    displayColors: !0,
    boxPadding: 0,
    borderColor: "rgba(0,0,0,0)",
    borderWidth: 0,
    animation: {
      duration: 400,
      easing: "easeOutQuart"
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "width",
          "height",
          "caretX",
          "caretY"
        ]
      },
      opacity: {
        easing: "linear",
        duration: 200
      }
    },
    callbacks: Sa
  },
  defaultRoutes: {
    bodyFont: "font",
    footerFont: "font",
    titleFont: "font"
  },
  descriptors: {
    _scriptable: (i) => i !== "filter" && i !== "itemSort" && i !== "external",
    _indexable: !1,
    callbacks: {
      _scriptable: !1,
      _indexable: !1
    },
    animation: {
      _fallback: !1
    },
    animations: {
      _fallback: "animation"
    }
  },
  additionalOptionScopes: [
    "interaction"
  ]
}, Hu = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  Colors: Jd,
  Decimation: tu,
  Filler: Su,
  Legend: Du,
  SubTitle: Lu,
  Title: Mu,
  Tooltip: Fu
});
const zu = (i, e, t, s) => (typeof e == "string" ? (t = i.push(e) - 1, s.unshift({
  index: t,
  label: e
})) : isNaN(e) && (t = null), t);
function Wu(i, e, t, s) {
  const r = i.indexOf(e);
  if (r === -1)
    return zu(i, e, t, s);
  const o = i.lastIndexOf(e);
  return r !== o ? t : r;
}
const Nu = (i, e) => i === null ? null : me(Math.round(i), 0, e);
function lo(i) {
  const e = this.getLabels();
  return i >= 0 && i < e.length ? e[i] : i;
}
class Qs extends Dt {
  constructor(e) {
    super(e), this._startValue = void 0, this._valueRange = 0, this._addedLabels = [];
  }
  init(e) {
    const t = this._addedLabels;
    if (t.length) {
      const s = this.getLabels();
      for (const { index: r, label: o } of t)
        s[r] === o && s.splice(r, 1);
      this._addedLabels = [];
    }
    super.init(e);
  }
  parse(e, t) {
    if (ee(e))
      return null;
    const s = this.getLabels();
    return t = isFinite(t) && s[t] === e ? t : Wu(s, e, G(t, e), this._addedLabels), Nu(t, s.length - 1);
  }
  determineDataLimits() {
    const { minDefined: e, maxDefined: t } = this.getUserBounds();
    let { min: s, max: r } = this.getMinMax(!0);
    this.options.bounds === "ticks" && (e || (s = 0), t || (r = this.getLabels().length - 1)), this.min = s, this.max = r;
  }
  buildTicks() {
    const e = this.min, t = this.max, s = this.options.offset, r = [];
    let o = this.getLabels();
    o = e === 0 && t === o.length - 1 ? o : o.slice(e, t + 1), this._valueRange = Math.max(o.length - (s ? 0 : 1), 1), this._startValue = this.min - (s ? 0.5 : 0);
    for (let l = e; l <= t; l++)
      r.push({
        value: l
      });
    return r;
  }
  getLabelForValue(e) {
    return lo.call(this, e);
  }
  configure() {
    super.configure(), this.isHorizontal() || (this._reversePixels = !this._reversePixels);
  }
  getPixelForValue(e) {
    return typeof e != "number" && (e = this.parse(e)), e === null ? NaN : this.getPixelForDecimal((e - this._startValue) / this._valueRange);
  }
  getPixelForTick(e) {
    const t = this.ticks;
    return e < 0 || e > t.length - 1 ? null : this.getPixelForValue(t[e].value);
  }
  getValueForPixel(e) {
    return Math.round(this._startValue + this.getDecimalForPixel(e) * this._valueRange);
  }
  getBasePixel() {
    return this.bottom;
  }
}
V(Qs, "id", "category"), V(Qs, "defaults", {
  ticks: {
    callback: lo
  }
});
function Uu(i, e) {
  const t = [], { bounds: r, step: o, min: l, max: n, precision: a, count: c, maxTicks: u, maxDigits: d, includeBounds: f } = i, m = o || 1, y = u - 1, { min: v, max: h } = e, p = !ee(l), g = !ee(n), _ = !ee(c), b = (h - v) / (d + 1);
  let S = sn((h - v) / y / m) * m, w, k, x, C;
  if (S < 1e-14 && !p && !g)
    return [
      {
        value: v
      },
      {
        value: h
      }
    ];
  C = Math.ceil(h / S) - Math.floor(v / S), C > y && (S = sn(C * S / y / m) * m), ee(a) || (w = Math.pow(10, a), S = Math.ceil(S * w) / w), r === "ticks" ? (k = Math.floor(v / S) * S, x = Math.ceil(h / S) * S) : (k = v, x = h), p && g && o && Bl((n - l) / o, S / 1e3) ? (C = Math.round(Math.min((n - l) / S, u)), S = (n - l) / C, k = l, x = n) : _ ? (k = p ? l : k, x = g ? n : x, C = c - 1, S = (x - k) / C) : (C = (x - k) / S, li(C, Math.round(C), S / 1e3) ? C = Math.round(C) : C = Math.ceil(C));
  const A = Math.max(rn(S), rn(k));
  w = Math.pow(10, ee(a) ? A : a), k = Math.round(k * w) / w, x = Math.round(x * w) / w;
  let L = 0;
  for (p && (f && k !== l ? (t.push({
    value: l
  }), k < l && L++, li(Math.round((k + L * S) * w) / w, l, co(l, b, i)) && L++) : k < l && L++); L < C; ++L) {
    const M = Math.round((k + L * S) * w) / w;
    if (g && M > n)
      break;
    t.push({
      value: M
    });
  }
  return g && f && x !== n ? t.length && li(t[t.length - 1].value, n, co(n, b, i)) ? t[t.length - 1].value = n : t.push({
    value: n
  }) : (!g || x === n) && t.push({
    value: x
  }), t;
}
function co(i, e, { horizontal: t, minRotation: s }) {
  const r = Te(s), o = (t ? Math.sin(r) : Math.cos(r)) || 1e-3, l = 0.75 * e * ("" + i).length;
  return Math.min(e / o, l);
}
class cs extends Dt {
  constructor(e) {
    super(e), this.start = void 0, this.end = void 0, this._startValue = void 0, this._endValue = void 0, this._valueRange = 0;
  }
  parse(e, t) {
    return ee(e) || (typeof e == "number" || e instanceof Number) && !isFinite(+e) ? null : +e;
  }
  handleTickRangeOptions() {
    const { beginAtZero: e } = this.options, { minDefined: t, maxDefined: s } = this.getUserBounds();
    let { min: r, max: o } = this;
    const l = (a) => r = t ? r : a, n = (a) => o = s ? o : a;
    if (e) {
      const a = He(r), c = He(o);
      a < 0 && c < 0 ? n(0) : a > 0 && c > 0 && l(0);
    }
    if (r === o) {
      let a = o === 0 ? 1 : Math.abs(o * 0.05);
      n(o + a), e || l(r - a);
    }
    this.min = r, this.max = o;
  }
  getTickLimit() {
    const e = this.options.ticks;
    let { maxTicksLimit: t, stepSize: s } = e, r;
    return s ? (r = Math.ceil(this.max / s) - Math.floor(this.min / s) + 1, r > 1e3 && (console.warn(`scales.${this.id}.ticks.stepSize: ${s} would result generating up to ${r} ticks. Limiting to 1000.`), r = 1e3)) : (r = this.computeTickLimit(), t = t || 11), t && (r = Math.min(t, r)), r;
  }
  computeTickLimit() {
    return Number.POSITIVE_INFINITY;
  }
  buildTicks() {
    const e = this.options, t = e.ticks;
    let s = this.getTickLimit();
    s = Math.max(2, s);
    const r = {
      maxTicks: s,
      bounds: e.bounds,
      min: e.min,
      max: e.max,
      precision: t.precision,
      step: t.stepSize,
      count: t.count,
      maxDigits: this._maxDigits(),
      horizontal: this.isHorizontal(),
      minRotation: t.minRotation || 0,
      includeBounds: t.includeBounds !== !1
    }, o = this._range || this, l = Uu(r, o);
    return e.bounds === "ticks" && Ro(l, this, "value"), e.reverse ? (l.reverse(), this.start = this.max, this.end = this.min) : (this.start = this.min, this.end = this.max), l;
  }
  configure() {
    const e = this.ticks;
    let t = this.min, s = this.max;
    if (super.configure(), this.options.offset && e.length) {
      const r = (s - t) / Math.max(e.length - 1, 1) / 2;
      t -= r, s += r;
    }
    this._startValue = t, this._endValue = s, this._valueRange = s - t;
  }
  getLabelForValue(e) {
    return Ei(e, this.chart.options.locale, this.options.ticks.format);
  }
}
class er extends cs {
  determineDataLimits() {
    const { min: e, max: t } = this.getMinMax(!0);
    this.min = ue(e) ? e : 0, this.max = ue(t) ? t : 1, this.handleTickRangeOptions();
  }
  computeTickLimit() {
    const e = this.isHorizontal(), t = e ? this.width : this.height, s = Te(this.options.ticks.minRotation), r = (e ? Math.sin(s) : Math.cos(s)) || 1e-3, o = this._resolveTickFontOptions(0);
    return Math.ceil(t / Math.min(40, o.lineHeight / r));
  }
  getPixelForValue(e) {
    return e === null ? NaN : this.getPixelForDecimal((e - this._startValue) / this._valueRange);
  }
  getValueForPixel(e) {
    return this._startValue + this.getDecimalForPixel(e) * this._valueRange;
  }
}
V(er, "id", "linear"), V(er, "defaults", {
  ticks: {
    callback: ds.formatters.numeric
  }
});
const Si = (i) => Math.floor(et(i)), ft = (i, e) => Math.pow(10, Si(i) + e);
function ho(i) {
  return i / Math.pow(10, Si(i)) === 1;
}
function uo(i, e, t) {
  const s = Math.pow(10, t), r = Math.floor(i / s);
  return Math.ceil(e / s) - r;
}
function ju(i, e) {
  const t = e - i;
  let s = Si(t);
  for (; uo(i, e, s) > 10; )
    s++;
  for (; uo(i, e, s) < 10; )
    s--;
  return Math.min(s, Si(i));
}
function Vu(i, { min: e, max: t }) {
  e = Ae(i.min, e);
  const s = [], r = Si(e);
  let o = ju(e, t), l = o < 0 ? Math.pow(10, Math.abs(o)) : 1;
  const n = Math.pow(10, o), a = r > o ? Math.pow(10, r) : 0, c = Math.round((e - a) * l) / l, u = Math.floor((e - a) / n / 10) * n * 10;
  let d = Math.floor((c - u) / Math.pow(10, o)), f = Ae(i.min, Math.round((a + u + d * Math.pow(10, o)) * l) / l);
  for (; f < t; )
    s.push({
      value: f,
      major: ho(f),
      significand: d
    }), d >= 10 ? d = d < 15 ? 15 : 20 : d++, d >= 20 && (o++, d = 2, l = o >= 0 ? 1 : l), f = Math.round((a + u + d * Math.pow(10, o)) * l) / l;
  const m = Ae(i.max, f);
  return s.push({
    value: m,
    major: ho(m),
    significand: d
  }), s;
}
class tr extends Dt {
  constructor(e) {
    super(e), this.start = void 0, this.end = void 0, this._startValue = void 0, this._valueRange = 0;
  }
  parse(e, t) {
    const s = cs.prototype.parse.apply(this, [
      e,
      t
    ]);
    if (s === 0) {
      this._zero = !0;
      return;
    }
    return ue(s) && s > 0 ? s : null;
  }
  determineDataLimits() {
    const { min: e, max: t } = this.getMinMax(!0);
    this.min = ue(e) ? Math.max(0, e) : null, this.max = ue(t) ? Math.max(0, t) : null, this.options.beginAtZero && (this._zero = !0), this._zero && this.min !== this._suggestedMin && !ue(this._userMin) && (this.min = e === ft(this.min, 0) ? ft(this.min, -1) : ft(this.min, 0)), this.handleTickRangeOptions();
  }
  handleTickRangeOptions() {
    const { minDefined: e, maxDefined: t } = this.getUserBounds();
    let s = this.min, r = this.max;
    const o = (n) => s = e ? s : n, l = (n) => r = t ? r : n;
    s === r && (s <= 0 ? (o(1), l(10)) : (o(ft(s, -1)), l(ft(r, 1)))), s <= 0 && o(ft(r, -1)), r <= 0 && l(ft(s, 1)), this.min = s, this.max = r;
  }
  buildTicks() {
    const e = this.options, t = {
      min: this._userMin,
      max: this._userMax
    }, s = Vu(t, this);
    return e.bounds === "ticks" && Ro(s, this, "value"), e.reverse ? (s.reverse(), this.start = this.max, this.end = this.min) : (this.start = this.min, this.end = this.max), s;
  }
  getLabelForValue(e) {
    return e === void 0 ? "0" : Ei(e, this.chart.options.locale, this.options.ticks.format);
  }
  configure() {
    const e = this.min;
    super.configure(), this._startValue = et(e), this._valueRange = et(this.max) - et(e);
  }
  getPixelForValue(e) {
    return (e === void 0 || e === 0) && (e = this.min), e === null || isNaN(e) ? NaN : this.getPixelForDecimal(e === this.min ? 0 : (et(e) - this._startValue) / this._valueRange);
  }
  getValueForPixel(e) {
    const t = this.getDecimalForPixel(e);
    return Math.pow(10, this._startValue + t * this._valueRange);
  }
}
V(tr, "id", "logarithmic"), V(tr, "defaults", {
  ticks: {
    callback: ds.formatters.logarithmic,
    major: {
      enabled: !0
    }
  }
});
function ir(i) {
  const e = i.ticks;
  if (e.display && i.display) {
    const t = xe(e.backdropPadding);
    return G(e.font && e.font.size, he.font.size) + t.height;
  }
  return 0;
}
function qu(i, e, t) {
  return t = ce(t) ? t : [
    t
  ], {
    w: Zl(i, e.string, t),
    h: t.length * e.lineHeight
  };
}
function fo(i, e, t, s, r) {
  return i === s || i === r ? {
    start: e - t / 2,
    end: e + t / 2
  } : i < s || i > r ? {
    start: e - t,
    end: e
  } : {
    start: e,
    end: e + t
  };
}
function Ku(i) {
  const e = {
    l: i.left + i._padding.left,
    r: i.right - i._padding.right,
    t: i.top + i._padding.top,
    b: i.bottom - i._padding.bottom
  }, t = Object.assign({}, e), s = [], r = [], o = i._pointLabels.length, l = i.options.pointLabels, n = l.centerPointLabels ? ie / o : 0;
  for (let a = 0; a < o; a++) {
    const c = l.setContext(i.getPointLabelContext(a));
    r[a] = c.padding;
    const u = i.getPointPosition(a, i.drawingArea + r[a], n), d = ge(c.font), f = qu(i.ctx, d, i._pointLabels[a]);
    s[a] = f;
    const m = ye(i.getIndexAngle(a) + n), y = Math.round(pr(m)), v = fo(y, u.x, f.w, 0, 180), h = fo(y, u.y, f.h, 90, 270);
    Yu(t, e, m, v, h);
  }
  i.setCenterPoint(e.l - t.l, t.r - e.r, e.t - t.t, t.b - e.b), i._pointLabelItems = Ju(i, s, r);
}
function Yu(i, e, t, s, r) {
  const o = Math.abs(Math.sin(t)), l = Math.abs(Math.cos(t));
  let n = 0, a = 0;
  s.start < e.l ? (n = (e.l - s.start) / o, i.l = Math.min(i.l, e.l - n)) : s.end > e.r && (n = (s.end - e.r) / o, i.r = Math.max(i.r, e.r + n)), r.start < e.t ? (a = (e.t - r.start) / l, i.t = Math.min(i.t, e.t - a)) : r.end > e.b && (a = (r.end - e.b) / l, i.b = Math.max(i.b, e.b + a));
}
function Xu(i, e, t) {
  const s = i.drawingArea, { extra: r, additionalAngle: o, padding: l, size: n } = t, a = i.getPointPosition(e, s + r + l, o), c = Math.round(pr(ye(a.angle + pe))), u = ef(a.y, n.h, c), d = Zu(c), f = Qu(a.x, n.w, d);
  return {
    visible: !0,
    x: a.x,
    y: u,
    textAlign: d,
    left: f,
    top: u,
    right: f + n.w,
    bottom: u + n.h
  };
}
function Gu(i, e) {
  if (!e)
    return !0;
  const { left: t, top: s, right: r, bottom: o } = i;
  return !(Xe({
    x: t,
    y: s
  }, e) || Xe({
    x: t,
    y: o
  }, e) || Xe({
    x: r,
    y: s
  }, e) || Xe({
    x: r,
    y: o
  }, e));
}
function Ju(i, e, t) {
  const s = [], r = i._pointLabels.length, o = i.options, { centerPointLabels: l, display: n } = o.pointLabels, a = {
    extra: ir(o) / 2,
    additionalAngle: l ? ie / r : 0
  };
  let c;
  for (let u = 0; u < r; u++) {
    a.padding = t[u], a.size = e[u];
    const d = Xu(i, u, a);
    s.push(d), n === "auto" && (d.visible = Gu(d, c), d.visible && (c = d));
  }
  return s;
}
function Zu(i) {
  return i === 0 || i === 180 ? "center" : i < 180 ? "left" : "right";
}
function Qu(i, e, t) {
  return t === "right" ? i -= e : t === "center" && (i -= e / 2), i;
}
function ef(i, e, t) {
  return t === 90 || t === 270 ? i -= e / 2 : (t > 270 || t < 90) && (i -= e), i;
}
function tf(i, e, t) {
  const { left: s, top: r, right: o, bottom: l } = t, { backdropColor: n } = e;
  if (!ee(n)) {
    const a = yt(e.borderRadius), c = xe(e.backdropPadding);
    i.fillStyle = n;
    const u = s - c.left, d = r - c.top, f = o - s + c.width, m = l - r + c.height;
    Object.values(a).some((y) => y !== 0) ? (i.beginPath(), bi(i, {
      x: u,
      y: d,
      w: f,
      h: m,
      radius: a
    }), i.fill()) : i.fillRect(u, d, f, m);
  }
}
function sf(i, e) {
  const { ctx: t, options: { pointLabels: s } } = i;
  for (let r = e - 1; r >= 0; r--) {
    const o = i._pointLabelItems[r];
    if (!o.visible)
      continue;
    const l = s.setContext(i.getPointLabelContext(r));
    tf(t, l, o);
    const n = ge(l.font), { x: a, y: c, textAlign: u } = o;
    kt(t, i._pointLabels[r], a, c + n.lineHeight / 2, n, {
      color: l.color,
      textAlign: u,
      textBaseline: "middle"
    });
  }
}
function xa(i, e, t, s) {
  const { ctx: r } = i;
  if (t)
    r.arc(i.xCenter, i.yCenter, e, 0, le);
  else {
    let o = i.getPointPosition(0, e);
    r.moveTo(o.x, o.y);
    for (let l = 1; l < s; l++)
      o = i.getPointPosition(l, e), r.lineTo(o.x, o.y);
  }
}
function rf(i, e, t, s, r) {
  const o = i.ctx, l = e.circular, { color: n, lineWidth: a } = e;
  !l && !s || !n || !a || t < 0 || (o.save(), o.strokeStyle = n, o.lineWidth = a, o.setLineDash(r.dash || []), o.lineDashOffset = r.dashOffset, o.beginPath(), xa(i, t, l, s), o.closePath(), o.stroke(), o.restore());
}
function nf(i, e, t) {
  return lt(i, {
    label: t,
    index: e,
    type: "pointLabel"
  });
}
class ri extends cs {
  constructor(e) {
    super(e), this.xCenter = void 0, this.yCenter = void 0, this.drawingArea = void 0, this._pointLabels = [], this._pointLabelItems = [];
  }
  setDimensions() {
    const e = this._padding = xe(ir(this.options) / 2), t = this.width = this.maxWidth - e.width, s = this.height = this.maxHeight - e.height;
    this.xCenter = Math.floor(this.left + t / 2 + e.left), this.yCenter = Math.floor(this.top + s / 2 + e.top), this.drawingArea = Math.floor(Math.min(t, s) / 2);
  }
  determineDataLimits() {
    const { min: e, max: t } = this.getMinMax(!1);
    this.min = ue(e) && !isNaN(e) ? e : 0, this.max = ue(t) && !isNaN(t) ? t : 0, this.handleTickRangeOptions();
  }
  computeTickLimit() {
    return Math.ceil(this.drawingArea / ir(this.options));
  }
  generateTickLabels(e) {
    cs.prototype.generateTickLabels.call(this, e), this._pointLabels = this.getLabels().map((t, s) => {
      const r = ae(this.options.pointLabels.callback, [
        t,
        s
      ], this);
      return r || r === 0 ? r : "";
    }).filter((t, s) => this.chart.getDataVisibility(s));
  }
  fit() {
    const e = this.options;
    e.display && e.pointLabels.display ? Ku(this) : this.setCenterPoint(0, 0, 0, 0);
  }
  setCenterPoint(e, t, s, r) {
    this.xCenter += Math.floor((e - t) / 2), this.yCenter += Math.floor((s - r) / 2), this.drawingArea -= Math.min(this.drawingArea / 2, Math.max(e, t, s, r));
  }
  getIndexAngle(e) {
    const t = le / (this._pointLabels.length || 1), s = this.options.startAngle || 0;
    return ye(e * t + Te(s));
  }
  getDistanceFromCenterForValue(e) {
    if (ee(e))
      return NaN;
    const t = this.drawingArea / (this.max - this.min);
    return this.options.reverse ? (this.max - e) * t : (e - this.min) * t;
  }
  getValueForDistanceFromCenter(e) {
    if (ee(e))
      return NaN;
    const t = e / (this.drawingArea / (this.max - this.min));
    return this.options.reverse ? this.max - t : this.min + t;
  }
  getPointLabelContext(e) {
    const t = this._pointLabels || [];
    if (e >= 0 && e < t.length) {
      const s = t[e];
      return nf(this.getContext(), e, s);
    }
  }
  getPointPosition(e, t, s = 0) {
    const r = this.getIndexAngle(e) - pe + s;
    return {
      x: Math.cos(r) * t + this.xCenter,
      y: Math.sin(r) * t + this.yCenter,
      angle: r
    };
  }
  getPointPositionForValue(e, t) {
    return this.getPointPosition(e, this.getDistanceFromCenterForValue(t));
  }
  getBasePosition(e) {
    return this.getPointPositionForValue(e || 0, this.getBaseValue());
  }
  getPointLabelPosition(e) {
    const { left: t, top: s, right: r, bottom: o } = this._pointLabelItems[e];
    return {
      left: t,
      top: s,
      right: r,
      bottom: o
    };
  }
  drawBackground() {
    const { backgroundColor: e, grid: { circular: t } } = this.options;
    if (e) {
      const s = this.ctx;
      s.save(), s.beginPath(), xa(this, this.getDistanceFromCenterForValue(this._endValue), t, this._pointLabels.length), s.closePath(), s.fillStyle = e, s.fill(), s.restore();
    }
  }
  drawGrid() {
    const e = this.ctx, t = this.options, { angleLines: s, grid: r, border: o } = t, l = this._pointLabels.length;
    let n, a, c;
    if (t.pointLabels.display && sf(this, l), r.display && this.ticks.forEach((u, d) => {
      if (d !== 0 || d === 0 && this.min < 0) {
        a = this.getDistanceFromCenterForValue(u.value);
        const f = this.getContext(d), m = r.setContext(f), y = o.setContext(f);
        rf(this, m, a, l, y);
      }
    }), s.display) {
      for (e.save(), n = l - 1; n >= 0; n--) {
        const u = s.setContext(this.getPointLabelContext(n)), { color: d, lineWidth: f } = u;
        !f || !d || (e.lineWidth = f, e.strokeStyle = d, e.setLineDash(u.borderDash), e.lineDashOffset = u.borderDashOffset, a = this.getDistanceFromCenterForValue(t.reverse ? this.min : this.max), c = this.getPointPosition(n, a), e.beginPath(), e.moveTo(this.xCenter, this.yCenter), e.lineTo(c.x, c.y), e.stroke());
      }
      e.restore();
    }
  }
  drawBorder() {
  }
  drawLabels() {
    const e = this.ctx, t = this.options, s = t.ticks;
    if (!s.display)
      return;
    const r = this.getIndexAngle(0);
    let o, l;
    e.save(), e.translate(this.xCenter, this.yCenter), e.rotate(r), e.textAlign = "center", e.textBaseline = "middle", this.ticks.forEach((n, a) => {
      if (a === 0 && this.min >= 0 && !t.reverse)
        return;
      const c = s.setContext(this.getContext(a)), u = ge(c.font);
      if (o = this.getDistanceFromCenterForValue(this.ticks[a].value), c.showLabelBackdrop) {
        e.font = u.string, l = e.measureText(n.label).width, e.fillStyle = c.backdropColor;
        const d = xe(c.backdropPadding);
        e.fillRect(-l / 2 - d.left, -o - u.size / 2 - d.top, l + d.width, u.size + d.height);
      }
      kt(e, n.label, 0, -o, u, {
        color: c.color,
        strokeColor: c.textStrokeColor,
        strokeWidth: c.textStrokeWidth
      });
    }), e.restore();
  }
  drawTitle() {
  }
}
V(ri, "id", "radialLinear"), V(ri, "defaults", {
  display: !0,
  animate: !0,
  position: "chartArea",
  angleLines: {
    display: !0,
    lineWidth: 1,
    borderDash: [],
    borderDashOffset: 0
  },
  grid: {
    circular: !1
  },
  startAngle: 0,
  ticks: {
    showLabelBackdrop: !0,
    callback: ds.formatters.numeric
  },
  pointLabels: {
    backdropColor: void 0,
    backdropPadding: 2,
    display: !0,
    font: {
      size: 10
    },
    callback(e) {
      return e;
    },
    padding: 5,
    centerPointLabels: !1
  }
}), V(ri, "defaultRoutes", {
  "angleLines.color": "borderColor",
  "pointLabels.color": "color",
  "ticks.color": "color"
}), V(ri, "descriptors", {
  angleLines: {
    _fallback: "grid"
  }
});
const ms = {
  millisecond: {
    common: !0,
    size: 1,
    steps: 1e3
  },
  second: {
    common: !0,
    size: 1e3,
    steps: 60
  },
  minute: {
    common: !0,
    size: 6e4,
    steps: 60
  },
  hour: {
    common: !0,
    size: 36e5,
    steps: 24
  },
  day: {
    common: !0,
    size: 864e5,
    steps: 30
  },
  week: {
    common: !1,
    size: 6048e5,
    steps: 4
  },
  month: {
    common: !0,
    size: 2628e6,
    steps: 12
  },
  quarter: {
    common: !1,
    size: 7884e6,
    steps: 4
  },
  year: {
    common: !0,
    size: 3154e7
  }
}, Ee = /* @__PURE__ */ Object.keys(ms);
function po(i, e) {
  return i - e;
}
function go(i, e) {
  if (ee(e))
    return null;
  const t = i._adapter, { parser: s, round: r, isoWeekday: o } = i._parseOpts;
  let l = e;
  return typeof s == "function" && (l = s(l)), ue(l) || (l = typeof s == "string" ? t.parse(l, s) : t.parse(l)), l === null ? null : (r && (l = r === "week" && ($t(o) || o === !0) ? t.startOf(l, "isoWeek", o) : t.startOf(l, r)), +l);
}
function _o(i, e, t, s) {
  const r = Ee.length;
  for (let o = Ee.indexOf(i); o < r - 1; ++o) {
    const l = ms[Ee[o]], n = l.steps ? l.steps : Number.MAX_SAFE_INTEGER;
    if (l.common && Math.ceil((t - e) / (n * l.size)) <= s)
      return Ee[o];
  }
  return Ee[r - 1];
}
function of(i, e, t, s, r) {
  for (let o = Ee.length - 1; o >= Ee.indexOf(t); o--) {
    const l = Ee[o];
    if (ms[l].common && i._adapter.diff(r, s, l) >= e - 1)
      return l;
  }
  return Ee[t ? Ee.indexOf(t) : 0];
}
function af(i) {
  for (let e = Ee.indexOf(i) + 1, t = Ee.length; e < t; ++e)
    if (ms[Ee[e]].common)
      return Ee[e];
}
function mo(i, e, t) {
  if (!t)
    i[e] = !0;
  else if (t.length) {
    const { lo: s, hi: r } = gr(t, e), o = t[s] >= e ? t[s] : t[r];
    i[o] = !0;
  }
}
function lf(i, e, t, s) {
  const r = i._adapter, o = +r.startOf(e[0].value, s), l = e[e.length - 1].value;
  let n, a;
  for (n = o; n <= l; n = +r.add(n, 1, s))
    a = t[n], a >= 0 && (e[a].major = !0);
  return e;
}
function vo(i, e, t) {
  const s = [], r = {}, o = e.length;
  let l, n;
  for (l = 0; l < o; ++l)
    n = e[l], r[n] = l, s.push({
      value: n,
      major: !1
    });
  return o === 0 || !t ? s : lf(i, s, r, t);
}
class xi extends Dt {
  constructor(e) {
    super(e), this._cache = {
      data: [],
      labels: [],
      all: []
    }, this._unit = "day", this._majorUnit = void 0, this._offsets = {}, this._normalized = !1, this._parseOpts = void 0;
  }
  init(e, t = {}) {
    const s = e.time || (e.time = {}), r = this._adapter = new gh._date(e.adapters.date);
    r.init(t), ai(s.displayFormats, r.formats()), this._parseOpts = {
      parser: s.parser,
      round: s.round,
      isoWeekday: s.isoWeekday
    }, super.init(e), this._normalized = t.normalized;
  }
  parse(e, t) {
    return e === void 0 ? null : go(this, e);
  }
  beforeLayout() {
    super.beforeLayout(), this._cache = {
      data: [],
      labels: [],
      all: []
    };
  }
  determineDataLimits() {
    const e = this.options, t = this._adapter, s = e.time.unit || "day";
    let { min: r, max: o, minDefined: l, maxDefined: n } = this.getUserBounds();
    function a(c) {
      !l && !isNaN(c.min) && (r = Math.min(r, c.min)), !n && !isNaN(c.max) && (o = Math.max(o, c.max));
    }
    (!l || !n) && (a(this._getLabelBounds()), (e.bounds !== "ticks" || e.ticks.source !== "labels") && a(this.getMinMax(!1))), r = ue(r) && !isNaN(r) ? r : +t.startOf(Date.now(), s), o = ue(o) && !isNaN(o) ? o : +t.endOf(Date.now(), s) + 1, this.min = Math.min(r, o - 1), this.max = Math.max(r + 1, o);
  }
  _getLabelBounds() {
    const e = this.getLabelTimestamps();
    let t = Number.POSITIVE_INFINITY, s = Number.NEGATIVE_INFINITY;
    return e.length && (t = e[0], s = e[e.length - 1]), {
      min: t,
      max: s
    };
  }
  buildTicks() {
    const e = this.options, t = e.time, s = e.ticks, r = s.source === "labels" ? this.getLabelTimestamps() : this._generate();
    e.bounds === "ticks" && r.length && (this.min = this._userMin || r[0], this.max = this._userMax || r[r.length - 1]);
    const o = this.min, l = this.max, n = Hl(r, o, l);
    return this._unit = t.unit || (s.autoSkip ? _o(t.minUnit, this.min, this.max, this._getLabelCapacity(o)) : of(this, n.length, t.minUnit, this.min, this.max)), this._majorUnit = !s.major.enabled || this._unit === "year" ? void 0 : af(this._unit), this.initOffsets(r), e.reverse && n.reverse(), vo(this, n, this._majorUnit);
  }
  afterAutoSkip() {
    this.options.offsetAfterAutoskip && this.initOffsets(this.ticks.map((e) => +e.value));
  }
  initOffsets(e = []) {
    let t = 0, s = 0, r, o;
    this.options.offset && e.length && (r = this.getDecimalForValue(e[0]), e.length === 1 ? t = 1 - r : t = (this.getDecimalForValue(e[1]) - r) / 2, o = this.getDecimalForValue(e[e.length - 1]), e.length === 1 ? s = o : s = (o - this.getDecimalForValue(e[e.length - 2])) / 2);
    const l = e.length < 3 ? 0.5 : 0.25;
    t = me(t, 0, l), s = me(s, 0, l), this._offsets = {
      start: t,
      end: s,
      factor: 1 / (t + 1 + s)
    };
  }
  _generate() {
    const e = this._adapter, t = this.min, s = this.max, r = this.options, o = r.time, l = o.unit || _o(o.minUnit, t, s, this._getLabelCapacity(t)), n = G(r.ticks.stepSize, 1), a = l === "week" ? o.isoWeekday : !1, c = $t(a) || a === !0, u = {};
    let d = t, f, m;
    if (c && (d = +e.startOf(d, "isoWeek", a)), d = +e.startOf(d, c ? "day" : l), e.diff(s, t, l) > 1e5 * n)
      throw new Error(t + " and " + s + " are too far apart with stepSize of " + n + " " + l);
    const y = r.ticks.source === "data" && this.getDataTimestamps();
    for (f = d, m = 0; f < s; f = +e.add(f, n, l), m++)
      mo(u, f, y);
    return (f === s || r.bounds === "ticks" || m === 1) && mo(u, f, y), Object.keys(u).sort(po).map((v) => +v);
  }
  getLabelForValue(e) {
    const t = this._adapter, s = this.options.time;
    return s.tooltipFormat ? t.format(e, s.tooltipFormat) : t.format(e, s.displayFormats.datetime);
  }
  format(e, t) {
    const r = this.options.time.displayFormats, o = this._unit, l = t || r[o];
    return this._adapter.format(e, l);
  }
  _tickFormatFunction(e, t, s, r) {
    const o = this.options, l = o.ticks.callback;
    if (l)
      return ae(l, [
        e,
        t,
        s
      ], this);
    const n = o.time.displayFormats, a = this._unit, c = this._majorUnit, u = a && n[a], d = c && n[c], f = s[t], m = c && d && f && f.major;
    return this._adapter.format(e, r || (m ? d : u));
  }
  generateTickLabels(e) {
    let t, s, r;
    for (t = 0, s = e.length; t < s; ++t)
      r = e[t], r.label = this._tickFormatFunction(r.value, t, e);
  }
  getDecimalForValue(e) {
    return e === null ? NaN : (e - this.min) / (this.max - this.min);
  }
  getPixelForValue(e) {
    const t = this._offsets, s = this.getDecimalForValue(e);
    return this.getPixelForDecimal((t.start + s) * t.factor);
  }
  getValueForPixel(e) {
    const t = this._offsets, s = this.getDecimalForPixel(e) / t.factor - t.end;
    return this.min + s * (this.max - this.min);
  }
  _getLabelSize(e) {
    const t = this.options.ticks, s = this.ctx.measureText(e).width, r = Te(this.isHorizontal() ? t.maxRotation : t.minRotation), o = Math.cos(r), l = Math.sin(r), n = this._resolveTickFontOptions(0).size;
    return {
      w: s * o + n * l,
      h: s * l + n * o
    };
  }
  _getLabelCapacity(e) {
    const t = this.options.time, s = t.displayFormats, r = s[t.unit] || s.millisecond, o = this._tickFormatFunction(e, 0, vo(this, [
      e
    ], this._majorUnit), r), l = this._getLabelSize(o), n = Math.floor(this.isHorizontal() ? this.width / l.w : this.height / l.h) - 1;
    return n > 0 ? n : 1;
  }
  getDataTimestamps() {
    let e = this._cache.data || [], t, s;
    if (e.length)
      return e;
    const r = this.getMatchingVisibleMetas();
    if (this._normalized && r.length)
      return this._cache.data = r[0].controller.getAllParsedValues(this);
    for (t = 0, s = r.length; t < s; ++t)
      e = e.concat(r[t].controller.getAllParsedValues(this));
    return this._cache.data = this.normalize(e);
  }
  getLabelTimestamps() {
    const e = this._cache.labels || [];
    let t, s;
    if (e.length)
      return e;
    const r = this.getLabels();
    for (t = 0, s = r.length; t < s; ++t)
      e.push(go(this, r[t]));
    return this._cache.labels = this._normalized ? e : this.normalize(e);
  }
  normalize(e) {
    return Oo(e.sort(po));
  }
}
V(xi, "id", "time"), V(xi, "defaults", {
  bounds: "data",
  adapters: {},
  time: {
    parser: !1,
    unit: !1,
    round: !1,
    isoWeekday: !1,
    minUnit: "millisecond",
    displayFormats: {}
  },
  ticks: {
    source: "auto",
    callback: !1,
    major: {
      enabled: !1
    }
  }
});
function Ui(i, e, t) {
  let s = 0, r = i.length - 1, o, l, n, a;
  t ? (e >= i[s].pos && e <= i[r].pos && ({ lo: s, hi: r } = Ye(i, "pos", e)), { pos: o, time: n } = i[s], { pos: l, time: a } = i[r]) : (e >= i[s].time && e <= i[r].time && ({ lo: s, hi: r } = Ye(i, "time", e)), { time: o, pos: n } = i[s], { time: l, pos: a } = i[r]);
  const c = l - o;
  return c ? n + (a - n) * (e - o) / c : n;
}
class sr extends xi {
  constructor(e) {
    super(e), this._table = [], this._minPos = void 0, this._tableRange = void 0;
  }
  initOffsets() {
    const e = this._getTimestampsForTable(), t = this._table = this.buildLookupTable(e);
    this._minPos = Ui(t, this.min), this._tableRange = Ui(t, this.max) - this._minPos, super.initOffsets(e);
  }
  buildLookupTable(e) {
    const { min: t, max: s } = this, r = [], o = [];
    let l, n, a, c, u;
    for (l = 0, n = e.length; l < n; ++l)
      c = e[l], c >= t && c <= s && r.push(c);
    if (r.length < 2)
      return [
        {
          time: t,
          pos: 0
        },
        {
          time: s,
          pos: 1
        }
      ];
    for (l = 0, n = r.length; l < n; ++l)
      u = r[l + 1], a = r[l - 1], c = r[l], Math.round((u + a) / 2) !== c && o.push({
        time: c,
        pos: l / (n - 1)
      });
    return o;
  }
  _generate() {
    const e = this.min, t = this.max;
    let s = super.getDataTimestamps();
    return (!s.includes(e) || !s.length) && s.splice(0, 0, e), (!s.includes(t) || s.length === 1) && s.push(t), s.sort((r, o) => r - o);
  }
  _getTimestampsForTable() {
    let e = this._cache.all || [];
    if (e.length)
      return e;
    const t = this.getDataTimestamps(), s = this.getLabelTimestamps();
    return t.length && s.length ? e = this.normalize(t.concat(s)) : e = t.length ? t : s, e = this._cache.all = e, e;
  }
  getDecimalForValue(e) {
    return (Ui(this._table, e) - this._minPos) / this._tableRange;
  }
  getValueForPixel(e) {
    const t = this._offsets, s = this.getDecimalForPixel(e) / t.factor - t.end;
    return Ui(this._table, s * this._tableRange + this._minPos, !0);
  }
}
V(sr, "id", "timeseries"), V(sr, "defaults", xi.defaults);
var cf = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  CategoryScale: Qs,
  LinearScale: er,
  LogarithmicScale: tr,
  RadialLinearScale: ri,
  TimeScale: xi,
  TimeSeriesScale: sr
});
const hf = [
  ph,
  jd,
  Hu,
  cf
];
Fe.register(...hf);
var df = Object.defineProperty, At = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && df(e, t, r), r;
};
const Mr = class Mr extends De {
  constructor() {
    super(...arguments), this.systemSummary = null, this.cpuInfo = null, this.memoryInfo = null, this.currentCpuData = null, this.currentMemoryData = null, this.wsConnected = !1, this.wsError = null, this.cpuChart = null, this.memoryChart = null, this.diskChart = null, this.networkChart = null, this.wsManager = null;
  }
  connectedCallback() {
    super.connectedCallback(), this.fetchInitialData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.cleanup();
  }
  firstUpdated() {
    this.initCharts(), this.initWebSocket();
  }
  async fetchInitialData() {
    try {
      const [e, t, s] = await Promise.all([
        Q.get("/system/summary"),
        Q.get("/system/cpu"),
        Q.get("/system/memory")
      ]);
      this.systemSummary = e, this.cpuInfo = t, this.memoryInfo = s;
    } catch (e) {
      console.error("Failed to fetch system data:", e);
    }
  }
  async initWebSocket() {
    try {
      this.wsManager = new cr("/ws/metrics"), this.wsError = null, this.wsManager.on("auth", (e) => {
        var t;
        (t = e.payload) != null && t.authenticated && (console.log(`Authenticated as ${e.payload.username}`), this.wsConnected = !0, this.wsError = null, this.wsManager.send({
          type: "subscribe"
        }));
      }), this.wsManager.on("data", (e) => {
        var t, s, r;
        if (e.payload) {
          const o = e.payload;
          o.cpu && (this.currentCpuData = {
            usage_percent: o.cpu.usage,
            load1: ((t = o.cpu.load_average) == null ? void 0 : t[0]) || 0,
            load5: ((s = o.cpu.load_average) == null ? void 0 : s[1]) || 0,
            load15: ((r = o.cpu.load_average) == null ? void 0 : r[2]) || 0
          }, this.updateCpuChart(this.currentCpuData)), o.memory && (this.currentMemoryData = o.memory, this.updateMemoryChart(o.memory)), o.disk && this.updateDiskChart(o.disk), o.network && this.updateNetworkChart(o.network), this.requestUpdate();
        }
      }), this.wsManager.on("error", (e) => {
        console.error("WebSocket error:", e), this.wsError = e.error || "WebSocket connection error", this.wsConnected = !1;
      }), await this.wsManager.connect();
    } catch (e) {
      console.error("Failed to connect to metrics WebSocket:", e), this.wsError = e instanceof Error ? e.message : "Failed to connect to metrics", this.wsConnected = !1;
    }
  }
  cleanup() {
    this.wsManager && (this.wsManager.disconnect(), this.wsManager = null), this.cpuChart && (this.cpuChart.destroy(), this.cpuChart = null), this.memoryChart && (this.memoryChart.destroy(), this.memoryChart = null), this.diskChart && (this.diskChart.destroy(), this.diskChart = null), this.networkChart && (this.networkChart.destroy(), this.networkChart = null);
  }
  updateCpuChart(e) {
    var t, s;
    if (this.cpuChart) {
      const r = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      (t = this.cpuChart.data.labels) == null || t.push(r), this.cpuChart.data.datasets[0].data.push(e.usage_percent), this.cpuChart.data.labels.length > 30 && ((s = this.cpuChart.data.labels) == null || s.shift(), this.cpuChart.data.datasets[0].data.shift()), this.cpuChart.update("none");
    }
  }
  updateMemoryChart(e) {
    var t, s;
    if (this.memoryChart) {
      const r = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      (t = this.memoryChart.data.labels) == null || t.push(r), this.memoryChart.data.datasets[0].data.push(e.used_percent), this.memoryChart.data.labels.length > 30 && ((s = this.memoryChart.data.labels) == null || s.shift(), this.memoryChart.data.datasets[0].data.shift()), this.memoryChart.update("none");
    }
  }
  updateDiskChart(e) {
  }
  updateNetworkChart(e) {
  }
  formatBytes(e) {
    if (e === 0) return "0 Bytes";
    const t = 1024, s = ["Bytes", "KB", "MB", "GB", "TB"], r = Math.floor(Math.log(e) / Math.log(t));
    return parseFloat((e / Math.pow(t, r)).toFixed(2)) + " " + s[r];
  }
  formatUptime(e) {
    const t = Math.floor(e / 86400), s = Math.floor(e % 86400 / 3600), r = Math.floor(e % 3600 / 60), o = [];
    return t > 0 && o.push(`${t} ${B("dashboard.days")}`), s > 0 && o.push(`${s} ${B("dashboard.hours")}`), r > 0 && o.push(`${r} ${B("dashboard.minutes")}`), o.join(", ") || "0 " + B("dashboard.minutes");
  }
  initCharts() {
    var s, r;
    const e = (s = this.shadowRoot) == null ? void 0 : s.querySelector("#cpuChart"), t = (r = this.shadowRoot) == null ? void 0 : r.querySelector("#memoryChart");
    this.cpuChart = new Fe(e, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: B("dashboard.cpuUsage"),
          data: [],
          borderColor: "rgba(75, 192, 192, 1)",
          tension: 0.1
        }]
      },
      options: {
        scales: {
          x: { display: !1 },
          y: {
            beginAtZero: !0,
            max: 100
          }
        }
      }
    }), this.memoryChart = new Fe(t, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: B("dashboard.memoryUsage"),
          data: [],
          borderColor: "rgba(153, 102, 255, 1)",
          tension: 0.1
        }]
      },
      options: {
        scales: {
          x: { display: !1 },
          y: {
            beginAtZero: !0,
            max: 100
          }
        }
      }
    });
  }
  render() {
    return N`
      <div class="dashboard">
        <h1>${B("dashboard.title")}</h1>
        
        ${this.systemSummary ? N`
          <div class="system-info">
            <div class="info-card">
              <h3>${B("dashboard.overview")}</h3>
              <div class="info-grid">
                <span class="info-label">${B("dashboard.hostname")}:</span>
                <span class="info-value">${this.systemSummary.hostname}</span>
                
                <span class="info-label">${B("dashboard.os")}:</span>
                <span class="info-value">${this.systemSummary.os}</span>
                
                <span class="info-label">${B("dashboard.kernel")}:</span>
                <span class="info-value">${this.systemSummary.kernel_version}</span>
                
                <span class="info-label">${B("dashboard.uptime")}:</span>
                <span class="info-value">${this.formatUptime(this.systemSummary.uptime)}</span>
                
                <span class="info-label">${B("dashboard.architecture")}:</span>
                <span class="info-value">${this.systemSummary.platform}</span>
              </div>
            </div>
            
            ${this.cpuInfo ? N`
              <div class="info-card">
                <h3>${B("dashboard.cpu")}</h3>
                <div class="info-grid">
                  <span class="info-label">Model:</span>
                  <span class="info-value">${this.cpuInfo.model_name}</span>
                  
                  <span class="info-label">Cores:</span>
                  <span class="info-value">${this.cpuInfo.cores}</span>
                  
                  <span class="info-label">${B("dashboard.loadAverage")}:</span>
                  <span class="info-value">
                    ${this.cpuInfo.load1.toFixed(2)}, 
                    ${this.cpuInfo.load5.toFixed(2)}, 
                    ${this.cpuInfo.load15.toFixed(2)}
                  </span>
                  
                  ${this.currentCpuData ? N`
                    <span class="info-label">Current Usage:</span>
                    <span class="info-value">${this.currentCpuData.usage_percent.toFixed(1)}%</span>
                  ` : ""}
                </div>
              </div>
            ` : ""}
            
            ${this.memoryInfo ? N`
              <div class="info-card">
                <h3>${B("dashboard.memory")}</h3>
                <div class="info-grid">
                  <span class="info-label">Total:</span>
                  <span class="info-value">${this.formatBytes(this.memoryInfo.total)}</span>
                  
                  <span class="info-label">Used:</span>
                  <span class="info-value">
                    ${this.formatBytes(this.memoryInfo.used)} 
                    (${this.memoryInfo.used_percent.toFixed(1)}%)
                  </span>
                  
                  <span class="info-label">Free:</span>
                  <span class="info-value">${this.formatBytes(this.memoryInfo.free)}</span>
                  
                  ${this.currentMemoryData ? N`
                    <span class="info-label">Available:</span>
                    <span class="info-value">${this.formatBytes(this.currentMemoryData.available)}</span>
                  ` : ""}
                </div>
              </div>
            ` : ""}
          </div>
        ` : N`
          <div class="loading">${B("common.loading")}</div>
        `}
        
        <div class="metrics-section">
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">${B("dashboard.cpuUsage")}</h3>
                ${this.currentCpuData ? N`
                  <div>
                    <div class="metric-value">${this.currentCpuData.usage_percent.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      Load: ${this.currentCpuData.load1.toFixed(2)}
                    </div>
                  </div>
                ` : ""}
              </div>
              <div class="chart-container">
                <canvas id="cpuChart"></canvas>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">${B("dashboard.memoryUsage")}</h3>
                ${this.currentMemoryData ? N`
                  <div>
                    <div class="metric-value">${this.currentMemoryData.used_percent.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      ${this.formatBytes(this.currentMemoryData.used)} / 
                      ${this.formatBytes(this.currentMemoryData.total)}
                    </div>
                  </div>
                ` : ""}
              </div>
              <div class="chart-container">
                <canvas id="memoryChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
Mr.styles = Ne`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    .system-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .info-card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 16px;
    }

    .info-card h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      font-size: 13px;
    }

    .info-label {
      color: var(--vscode-text-dim);
    }

    .info-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
    }

    .metrics-section {
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .metric-card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 20px;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .metric-title {
      font-size: 16px;
      font-weight: 500;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 300;
      color: var(--vscode-accent);
      font-family: var(--vscode-font-family-mono);
    }

    .metric-subtitle {
      font-size: 12px;
      color: var(--vscode-text-dim);
      margin-top: 4px;
    }

    .chart-container {
      height: 200px;
      position: relative;
    }

    canvas {
      max-width: 100%;
      max-height: 100%;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--vscode-bg);
      border-radius: 4px;
      font-size: 13px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-success);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-text-dim);
    }

    .error {
      color: var(--vscode-error);
      padding: 16px;
      background: var(--vscode-bg-light);
      border-radius: 8px;
      margin-bottom: 16px;
    }
  `;
let ze = Mr;
At([
  oe({ type: Object })
], ze.prototype, "systemSummary");
At([
  oe({ type: Object })
], ze.prototype, "cpuInfo");
At([
  oe({ type: Object })
], ze.prototype, "memoryInfo");
At([
  oe({ type: Object })
], ze.prototype, "currentCpuData");
At([
  oe({ type: Object })
], ze.prototype, "currentMemoryData");
At([
  oe({ type: Boolean })
], ze.prototype, "wsConnected");
At([
  oe({ type: String })
], ze.prototype, "wsError");
customElements.define("dashboard-tab", ze);
var uf = Object.defineProperty, Di = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && uf(e, t, r), r;
};
const Lr = class Lr extends De {
  constructor() {
    super(), this.activeTab = "interfaces", this.interfaces = [], this.bridges = [], this.bonds = [], this.vlans = [];
  }
  firstUpdated() {
    this.fetchNetworkData();
  }
  async fetchNetworkData() {
    this.fetchInterfaces(), this.fetchBridges(), this.fetchBonds(), this.fetchVlans();
  }
  async fetchInterfaces() {
    try {
      const e = await Q.get("/network/interfaces");
      this.interfaces = e.interfaces || [];
    } catch (e) {
      console.error("Error fetching network interfaces:", e);
    }
  }
  async fetchBridges() {
    try {
      const e = await Q.get("/network/bridges");
      this.bridges = e.bridges || [];
    } catch (e) {
      console.error("Error fetching bridges:", e);
    }
  }
  async fetchBonds() {
    try {
      const e = await Q.get("/network/bonds");
      this.bonds = e.bonds || [];
    } catch (e) {
      console.error("Error fetching bonds:", e);
    }
  }
  async fetchVlans() {
    try {
      const e = await Q.get("/network/vlans");
      this.vlans = e.vlans || [];
    } catch (e) {
      console.error("Error fetching VLANs:", e);
    }
  }
  toggleInterfaceState(e) {
    const t = `/network/interfaces/${e.name}/${e.state === "up" ? "down" : "up"}`;
    Q.put(t).then(() => this.fetchInterfaces()).catch(console.error);
  }
  async deleteBridge(e) {
    if (confirm(`Are you sure you want to delete bridge ${e}?`))
      try {
        await Q.delete(`/network/bridge/${e}`), await this.fetchBridges();
      } catch (t) {
        console.error("Error deleting bridge:", t);
      }
  }
  async deleteBond(e) {
    if (confirm(`Are you sure you want to delete bond ${e}?`))
      try {
        await Q.delete(`/network/bond/${e}`), await this.fetchBonds();
      } catch (t) {
        console.error("Error deleting bond:", t);
      }
  }
  async deleteVlan(e) {
    if (confirm(`Are you sure you want to delete VLAN ${e}?`))
      try {
        await Q.delete(`/network/vlan/${e}`), await this.fetchVlans();
      } catch (t) {
        console.error("Error deleting VLAN:", t);
      }
  }
  handleConfigureAddress(e) {
    const t = {
      address: "192.168.1.20",
      // Example address
      netmask: 24,
      // Example netmask
      gateway: "192.168.1.1"
      // Optional gateway
    };
    Q.post(`/network/interfaces/${e.name}/address`, t).then(() => this.fetchInterfaces()).catch(console.error);
  }
  handleCreateBridge() {
    const e = {
      name: "br0",
      // Example bridge name
      interfaces: ["eth0", "eth1"]
      // Example interfaces
    };
    Q.post("/network/bridge", e).then(() => {
      this.fetchBridges(), this.fetchInterfaces();
    }).catch(console.error);
  }
  handleCreateBond() {
    const e = {
      name: "bond0",
      // Example bond name
      mode: "balance-rr",
      // Example mode
      interfaces: ["eth2", "eth3"]
      // Example interfaces
    };
    Q.post("/network/bond", e).then(() => {
      this.fetchBonds(), this.fetchInterfaces();
    }).catch(console.error);
  }
  handleCreateVLANInterface() {
    const e = {
      interface: "eth0",
      // Example base interface
      vlan_id: 100,
      // Example VLAN ID
      name: "eth0.100"
      // Optional name
    };
    Q.post("/network/vlan", e).then(() => {
      this.fetchVlans(), this.fetchInterfaces();
    }).catch(console.error);
  }
  renderInterface(e) {
    return N`
      <div class="network-interface">
        <div class="interface-header">
          <span class="interface-name">
            ${e.name}
          </span>
          <span class="interface-state ${e.state === "up" ? "state-up" : "state-down"}">
            ${e.state}
          </span>
        </div>
        <div class="interface-details">
          <div class="detail-item">
            <span class="detail-label">RX Bytes</span>
            <span class="detail-value">${e.statistics.rx_bytes}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">TX Bytes</span>
            <span class="detail-value">${e.statistics.tx_bytes}</span>
          </div>
        </div>
        <div class="interface-actions">
          <button class="action-button primary" @click="${() => this.toggleInterfaceState(e)}">
            ${e.state === "up" ? "Down" : "Up"}
          </button>
          <button class="action-button" @click="${() => this.handleConfigureAddress(e)}">
            Configure
          </button>
        </div>
      </div>
    `;
  }
  renderTabs() {
    return N`
      <div class="tab-header">
        <button class="tab-button ${this.activeTab === "interfaces" ? "active" : ""}" @click="${() => this.activeTab = "interfaces"}">
          Interfaces
        </button>
        <button class="tab-button ${this.activeTab === "bridges" ? "active" : ""}" @click="${() => this.activeTab = "bridges"}">
          Bridges
        </button>
        <button class="tab-button ${this.activeTab === "bonds" ? "active" : ""}" @click="${() => this.activeTab = "bonds"}">
          Bonds
        </button>
        <button class="tab-button ${this.activeTab === "vlans" ? "active" : ""}" @click="${() => this.activeTab = "vlans"}">
          VLANs
        </button>
      </div>
    `;
  }
  render() {
    return N`
      <div class="tab-container">
        <h1>Network Management</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.activeTab === "interfaces" ? N`
            <h2>Interfaces</h2>
            ${this.interfaces.length > 0 ? N`
              ${this.interfaces.map((e) => this.renderInterface(e))}
            ` : N`<div class="empty-state">No interfaces found.</div>`}
          ` : ""}

          ${this.activeTab === "bridges" ? N`
            <h2>Bridges</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Bridge Name</label>
                <input class="form-input" placeholder="br0">
              </div>
              <div class="form-group">
                <label class="form-label">Interfaces</label>
                <input class="form-input" placeholder="eth0, eth1">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateBridge}">Create Bridge</button>
              </div>
            </div>
            
            ${this.bridges.length > 0 ? N`
              <h3>Existing Bridges</h3>
              ${this.bridges.map((e) => N`
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${e.name}</span>
                    <span class="interface-state ${e.state === "up" ? "state-up" : "state-down"}">
                      ${e.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteBridge(e.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : N`<div class="empty-state">No bridges configured.</div>`}
          ` : ""}

          ${this.activeTab === "bonds" ? N`
            <h2>Bonds</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Bond Name</label>
                <input class="form-input" placeholder="bond0">
              </div>
              <div class="form-group">
                <label class="form-label">Mode</label>
                <input class="form-input" placeholder="balance-rr">
              </div>
              <div class="form-group">
                <label class="form-label">Interfaces</label>
                <input class="form-input" placeholder="eth2, eth3">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateBond}">Create Bond</button>
              </div>
            </div>
            
            ${this.bonds.length > 0 ? N`
              <h3>Existing Bonds</h3>
              ${this.bonds.map((e) => N`
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${e.name}</span>
                    <span class="interface-state ${e.state === "up" ? "state-up" : "state-down"}">
                      ${e.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteBond(e.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : N`<div class="empty-state">No bonds configured.</div>`}
          ` : ""}

          ${this.activeTab === "vlans" ? N`
            <h2>VLANs</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Base Interface</label>
                <input class="form-input" placeholder="eth0">
              </div>
              <div class="form-group">
                <label class="form-label">VLAN ID</label>
                <input class="form-input" placeholder="100">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateVLANInterface}">Create VLAN Interface</button>
              </div>
            </div>
            
            ${this.vlans.length > 0 ? N`
              <h3>Existing VLANs</h3>
              ${this.vlans.map((e) => N`
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${e.name}</span>
                    <span class="interface-state ${e.state === "up" ? "state-up" : "state-down"}">
                      ${e.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteVlan(e.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : N`<div class="empty-state">No VLANs configured.</div>`}
          ` : ""}
        </div>
      </div>
    `;
  }
};
Lr.styles = Ne`
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .network-interface {
      background-color: var(--surface-1);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color);
    }

    .interface-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .interface-name {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .interface-state {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .state-up {
      background-color: var(--success-bg);
      color: var(--success);
    }

    .state-down {
      background-color: var(--error-bg);
      color: var(--error);
    }

    .interface-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .interface-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-button {
      padding: 0.5rem 1rem;
      background-color: var(--surface-2);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .action-button:hover {
      background-color: var(--surface-3);
      border-color: var(--primary);
    }

    .action-button.primary {
      background-color: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .action-button.primary:hover {
      background-color: var(--primary-hover);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .create-form {
      background-color: var(--surface-1);
      padding: 1.5rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 0.5rem;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    h3 {
      font-size: 1.2rem;
      margin: 1.5rem 0 1rem 0;
      color: var(--text-primary);
    }
  `;
let at = Lr;
Di([
  fe()
], at.prototype, "activeTab");
Di([
  fe()
], at.prototype, "interfaces");
Di([
  fe()
], at.prototype, "bridges");
Di([
  fe()
], at.prototype, "bonds");
Di([
  fe()
], at.prototype, "vlans");
customElements.define("network-tab", at);
var ff = Object.defineProperty, Me = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && ff(e, t, r), r;
};
const Rr = class Rr extends De {
  constructor() {
    super(...arguments), this.disks = [], this.volumeGroups = [], this.logicalVolumes = [], this.physicalVolumes = [], this.raidDevices = [], this.availableRaidDisks = [], this.iscsiTargets = [], this.iscsiSessions = [], this.multipathDevices = [], this.btrfsSubvolumes = [], this.activeSection = "disks", this.loading = !1, this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.loadData();
  }
  async loadData() {
    this.loading = !0, this.error = "";
    try {
      switch (this.activeSection) {
        case "disks":
          await this.fetchDisks();
          break;
        case "lvm":
          await this.fetchLVM();
          break;
        case "raid":
          await this.fetchRAID();
          break;
        case "iscsi":
          await this.fetchiSCSI();
          break;
        case "multipath":
          await this.fetchMultipath();
          break;
        case "btrfs":
          await this.fetchBTRFS();
          break;
      }
    } catch (e) {
      const t = (e == null ? void 0 : e.message) || "Failed to load data", s = (e == null ? void 0 : e.details) || "";
      this.error = s ? `${t}: ${s}` : t, console.error("Storage tab error:", e);
    } finally {
      this.loading = !1;
    }
  }
  async fetchDisks() {
    try {
      const e = await Q.get("/storage/disks");
      this.disks = (e == null ? void 0 : e.disks) || [];
    } catch (e) {
      throw console.error("Error fetching disks:", e), this.disks = [], e;
    }
  }
  async fetchLVM() {
    try {
      const [e, t, s] = await Promise.all([
        Q.get("/storage/lvm/vgs"),
        Q.get("/storage/lvm/lvs"),
        Q.get("/storage/lvm/pvs")
      ]);
      this.volumeGroups = (e == null ? void 0 : e.volume_groups) || [], this.logicalVolumes = (t == null ? void 0 : t.logical_volumes) || [], this.physicalVolumes = (s == null ? void 0 : s.physical_volumes) || [];
    } catch (e) {
      throw console.error("Error fetching LVM data:", e), this.volumeGroups = [], this.logicalVolumes = [], this.physicalVolumes = [], e;
    }
  }
  async fetchRAID() {
    try {
      const [e, t] = await Promise.all([
        Q.get("/storage/raid/devices"),
        Q.get("/storage/raid/available-disks")
      ]);
      this.raidDevices = (e == null ? void 0 : e.devices) || [], this.availableRaidDisks = (t == null ? void 0 : t.disks) || [];
    } catch (e) {
      throw console.error("Error fetching RAID data:", e), this.raidDevices = [], this.availableRaidDisks = [], e;
    }
  }
  async fetchiSCSI() {
    try {
      const e = await Q.get("/storage/iscsi/sessions");
      this.iscsiSessions = (e == null ? void 0 : e.sessions) || [];
    } catch (e) {
      throw console.error("Error fetching iSCSI data:", e), this.iscsiSessions = [], e;
    }
  }
  async fetchMultipath() {
    try {
      const e = await Q.get("/storage/multipath/devices");
      this.multipathDevices = (e == null ? void 0 : e.devices) || [];
    } catch (e) {
      throw console.error("Error fetching multipath data:", e), this.multipathDevices = [], e;
    }
  }
  async fetchBTRFS() {
    this.btrfsSubvolumes = [];
  }
  formatBytes(e) {
    if (e === 0) return "0 Bytes";
    const t = 1024, s = ["Bytes", "KB", "MB", "GB", "TB"], r = Math.floor(Math.log(e) / Math.log(t));
    return parseFloat((e / Math.pow(t, r)).toFixed(2)) + " " + s[r];
  }
  switchSection(e) {
    this.activeSection = e, this.loadData();
  }
  renderTabs() {
    const e = [
      { id: "disks", label: B("storage.disks.title") },
      { id: "lvm", label: B("storage.lvm.title") },
      { id: "raid", label: B("storage.raid.title") },
      { id: "iscsi", label: B("storage.iscsi.title") },
      { id: "multipath", label: B("storage.multipath.title") },
      { id: "btrfs", label: B("storage.btrfs.title") }
    ];
    return N`
      <div class="tabs">
        ${e.map((t) => N`
          <button 
            class="tab ${this.activeSection === t.id ? "active" : ""}"
            @click=${() => this.switchSection(t.id)}
          >
            ${t.label}
          </button>
        `)}
      </div>
    `;
  }
  renderDisksSection() {
    return this.disks.length === 0 ? N`<div class="empty-state">${B("storage.disks.empty")}</div>` : N`
      ${this.disks.map((e) => N`
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${e.name} - ${e.model || "Unknown Model"}</h3>
            <span>${this.formatBytes(e.size)}</span>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">${B("storage.disks.type")}</span>
              <span class="info-value">${e.type}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${B("storage.disks.serial")}</span>
              <span class="info-value">${e.serial || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${B("storage.disks.removable")}</span>
              <span class="info-value">${e.removable ? B("common.yes") : B("common.no")}</span>
            </div>
          </div>
          
          ${e.partitions && e.partitions.length > 0 ? N`
            <h4>${B("storage.disks.partitions")}</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>${B("storage.disks.partition")}</th>
                  <th>${B("storage.disks.filesystem")}</th>
                  <th>${B("storage.disks.size")}</th>
                  <th>${B("storage.disks.used")}</th>
                  <th>${B("storage.disks.mountpoint")}</th>
                  <th>${B("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${e.partitions.map((t) => {
      var s;
      return N`
                  <tr>
                    <td>${t.name}</td>
                    <td>${t.filesystem || "Unknown"}</td>
                    <td>${this.formatBytes(t.size)}</td>
                    <td>
                      ${t.used ? N`
                        <div>
                          ${this.formatBytes(t.used)} (${(s = t.use_percent) == null ? void 0 : s.toFixed(1)}%)
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${t.use_percent}%"></div>
                          </div>
                        </div>
                      ` : "N/A"}
                    </td>
                    <td>${t.mount_point || "Not mounted"}</td>
                    <td>
                      ${t.mount_point ? N`
                        <button class="btn-danger" @click=${() => this.unmountPartition(t.mount_point)}>
                          ${B("storage.disks.unmount")}
                        </button>
                      ` : N`
                        <button class="btn-primary" @click=${() => this.mountPartition(t.path, `/mnt/${t.name}`)}>
                          ${B("storage.disks.mount")}
                        </button>
                      `}
                    </td>
                  </tr>
                `;
    })}
              </tbody>
            </table>
          ` : ""}
        </div>
      `)}
    `;
  }
  renderLVMSection() {
    return N`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${B("storage.lvm.volumeGroups")}</h3>
          <button class="btn-primary" @click=${this.showCreateVGDialog}>
            ${B("storage.lvm.createVG")}
          </button>
        </div>
        
        ${this.volumeGroups.length === 0 ? N`
          <div class="empty-state">${B("storage.lvm.noVolumeGroups")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("common.name")}</th>
                <th>${B("storage.lvm.size")}</th>
                <th>${B("storage.lvm.free")}</th>
                <th>${B("storage.lvm.pvCount")}</th>
                <th>${B("storage.lvm.lvCount")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.volumeGroups.map((e) => N`
                <tr>
                  <td>${e.name}</td>
                  <td>${this.formatBytes(e.size)}</td>
                  <td>${this.formatBytes(e.free)}</td>
                  <td>${e.pv_count}</td>
                  <td>${e.lv_count}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${B("storage.lvm.logicalVolumes")}</h3>
          <button class="btn-primary" @click=${this.showCreateLVDialog}>
            ${B("storage.lvm.createLV")}
          </button>
        </div>
        
        ${this.logicalVolumes.length === 0 ? N`
          <div class="empty-state">${B("storage.lvm.noLogicalVolumes")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("common.name")}</th>
                <th>${B("storage.lvm.volumeGroup")}</th>
                <th>${B("storage.lvm.size")}</th>
                <th>${B("storage.lvm.path")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.logicalVolumes.map((e) => N`
                <tr>
                  <td>${e.name}</td>
                  <td>${e.vg_name}</td>
                  <td>${this.formatBytes(e.size)}</td>
                  <td>${e.path}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <h3 class="card-title">${B("storage.lvm.physicalVolumes")}</h3>
        
        ${this.physicalVolumes.length === 0 ? N`
          <div class="empty-state">${B("storage.lvm.noPhysicalVolumes")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("common.name")}</th>
                <th>${B("storage.lvm.volumeGroup")}</th>
                <th>${B("storage.lvm.size")}</th>
                <th>${B("storage.lvm.free")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.physicalVolumes.map((e) => N`
                <tr>
                  <td>${e.name}</td>
                  <td>${e.vg_name || "N/A"}</td>
                  <td>${this.formatBytes(e.size)}</td>
                  <td>${this.formatBytes(e.free)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>
    `;
  }
  renderRAIDSection() {
    return N`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${B("storage.raid.devices")}</h3>
          <button class="btn-primary" @click=${this.showCreateRAIDDialog}>
            ${B("storage.raid.createRAID")}
          </button>
        </div>
        
        ${this.raidDevices.length === 0 ? N`
          <div class="empty-state">${B("storage.raid.noDevices")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("common.name")}</th>
                <th>${B("storage.raid.level")}</th>
                <th>${B("storage.raid.state")}</th>
                <th>${B("storage.raid.size")}</th>
                <th>${B("storage.raid.devices")}</th>
                <th>${B("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.raidDevices.map((e) => N`
                <tr>
                  <td>${e.name}</td>
                  <td>RAID ${e.level}</td>
                  <td>
                    <span class="status-badge ${e.state === "active" ? "active" : "error"}">
                      ${e.state}
                    </span>
                  </td>
                  <td>${this.formatBytes(e.size)}</td>
                  <td>${e.active_disks}/${e.total_disks}</td>
                  <td>
                    <button class="btn-danger" @click=${() => this.destroyRAID(e.path)}>
                      ${B("storage.raid.destroy")}
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <h3 class="card-title">${B("storage.raid.availableDisks")}</h3>
        
        ${this.availableRaidDisks.length === 0 ? N`
          <div class="empty-state">${B("storage.raid.noAvailableDisks")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("storage.raid.device")}</th>
                <th>${B("storage.raid.size")}</th>
                <th>${B("storage.raid.partition")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.availableRaidDisks.map((e) => N`
                <tr>
                  <td>${e.path}</td>
                  <td>${this.formatBytes(e.size)}</td>
                  <td>${e.partition ? B("common.yes") : B("common.no")}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>
    `;
  }
  renderISCSISection() {
    return N`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${B("storage.iscsi.sessions")}</h3>
          <button class="btn-primary" @click=${this.showDiscoverISCSIDialog}>
            ${B("storage.iscsi.discover")}
          </button>
        </div>
        
        ${this.iscsiSessions.length === 0 ? N`
          <div class="empty-state">${B("storage.iscsi.noSessions")}</div>
        ` : N`
          <table class="table">
            <thead>
              <tr>
                <th>${B("storage.iscsi.target")}</th>
                <th>${B("storage.iscsi.portal")}</th>
                <th>${B("storage.iscsi.sessionId")}</th>
                <th>${B("storage.iscsi.state")}</th>
                <th>${B("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.iscsiSessions.map((e) => N`
                <tr>
                  <td>${e.target}</td>
                  <td>${e.portal}</td>
                  <td>${e.session_id}</td>
                  <td>
                    <span class="status-badge ${e.state === "logged_in" ? "active" : "inactive"}">
                      ${e.state}
                    </span>
                  </td>
                  <td>
                    <button class="btn-danger" @click=${() => this.logoutISCSI(e.target)}>
                      ${B("storage.iscsi.logout")}
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      ${this.iscsiTargets.length > 0 ? N`
        <div class="card">
          <h3 class="card-title">${B("storage.iscsi.discoveredTargets")}</h3>
          <table class="table">
            <thead>
              <tr>
                <th>${B("storage.iscsi.iqn")}</th>
                <th>${B("storage.iscsi.portal")}</th>
                <th>${B("storage.iscsi.connected")}</th>
                <th>${B("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.iscsiTargets.map((e) => N`
                <tr>
                  <td>${e.iqn}</td>
                  <td>${e.portal}</td>
                  <td>${e.connected ? B("common.yes") : B("common.no")}</td>
                  <td>
                    ${e.connected ? "" : N`
                      <button class="btn-primary" @click=${() => this.loginISCSI(e)}>
                        ${B("storage.iscsi.login")}
                      </button>
                    `}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ""}
    `;
  }
  renderMultipathSection() {
    return N`
      <div class="card">
        <h3 class="card-title">${B("storage.multipath.devices")}</h3>
        
        ${this.multipathDevices.length === 0 ? N`
          <div class="empty-state">${B("storage.multipath.noDevices")}</div>
        ` : N`
          ${this.multipathDevices.map((e) => N`
            <div class="card">
              <div class="card-header">
                <h4 class="card-title">${e.name} - ${e.product}</h4>
                <span class="status-badge ${e.state === "active" ? "active" : "error"}">
                  ${e.state}
                </span>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">${B("storage.multipath.wwid")}</span>
                  <span class="info-value">${e.wwid}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${B("storage.multipath.vendor")}</span>
                  <span class="info-value">${e.vendor}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${B("storage.multipath.size")}</span>
                  <span class="info-value">${e.size}</span>
                </div>
              </div>
              
              <h5>${B("storage.multipath.paths")}</h5>
              <table class="table">
                <thead>
                  <tr>
                    <th>${B("storage.multipath.device")}</th>
                    <th>${B("storage.multipath.host")}</th>
                    <th>${B("storage.multipath.state")}</th>
                    <th>${B("storage.multipath.priority")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${e.paths.map((t) => N`
                    <tr>
                      <td>${t.device}</td>
                      <td>${t.host}</td>
                      <td>
                        <span class="status-badge ${t.state === "active" ? "active" : "inactive"}">
                          ${t.state}
                        </span>
                      </td>
                      <td>${t.priority}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `)}
        `}
      </div>
    `;
  }
  renderBTRFSSection() {
    return N`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${B("storage.btrfs.subvolumes")}</h3>
          <button class="btn-primary" @click=${this.showCreateSubvolumeDialog}>
            ${B("storage.btrfs.createSubvolume")}
          </button>
        </div>
        
        ${this.btrfsSubvolumes.length === 0 ? N`
          <div class="empty-state">${B("storage.btrfs.noSubvolumes")}</div>
        ` : N`
          <ul>
            ${this.btrfsSubvolumes.map((e) => N`
              <li>${e}</li>
            `)}
          </ul>
        `}
      </div>
    `;
  }
  renderContent() {
    if (this.loading)
      return N`<div class="loading">${B("common.loading")}</div>`;
    if (this.error)
      return N`<div class="error">${this.error}</div>`;
    switch (this.activeSection) {
      case "disks":
        return this.renderDisksSection();
      case "lvm":
        return this.renderLVMSection();
      case "raid":
        return this.renderRAIDSection();
      case "iscsi":
        return this.renderISCSISection();
      case "multipath":
        return this.renderMultipathSection();
      case "btrfs":
        return this.renderBTRFSSection();
      default:
        return N``;
    }
  }
  render() {
    return N`
      <div class="storage-container">
        <h1>${B("storage.title")}</h1>
        ${this.renderTabs()}
        <div class="content">
          ${this.renderContent()}
        </div>
      </div>
    `;
  }
  // Action methods
  async mountPartition(e, t) {
    try {
      await Q.post("/storage/mount", { device: e, mount_point: t }), await this.fetchDisks();
    } catch (s) {
      console.error("Error mounting partition:", s);
    }
  }
  async unmountPartition(e) {
    try {
      await Q.post("/storage/unmount", { mount_point: e }), await this.fetchDisks();
    } catch (t) {
      console.error("Error unmounting partition:", t);
    }
  }
  async destroyRAID(e) {
    if (confirm(B("storage.raid.confirmDestroy")))
      try {
        await Q.post("/storage/raid/destroy", { device: e }), await this.fetchRAID();
      } catch (t) {
        console.error("Error destroying RAID:", t);
      }
  }
  async logoutISCSI(e) {
    try {
      await Q.post("/storage/iscsi/logout", { target: e }), await this.fetchiSCSI();
    } catch (t) {
      console.error("Error logging out from iSCSI:", t);
    }
  }
  async loginISCSI(e) {
    try {
      await Q.post("/storage/iscsi/login", {
        target: e.iqn,
        portal: e.portal
      }), await this.fetchiSCSI();
    } catch (t) {
      console.error("Error logging in to iSCSI:", t);
    }
  }
  // Dialog methods (placeholders - in a real implementation, these would show modal dialogs)
  showCreateVGDialog() {
    console.log("Show create VG dialog");
  }
  showCreateLVDialog() {
    console.log("Show create LV dialog");
  }
  showCreateRAIDDialog() {
    console.log("Show create RAID dialog");
  }
  showDiscoverISCSIDialog() {
    console.log("Show discover iSCSI dialog");
  }
  showCreateSubvolumeDialog() {
    console.log("Show create subvolume dialog");
  }
};
Rr.styles = Ne`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .storage-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    .tabs {
      display: flex;
      gap: 2px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-border);
    }

    .tab {
      padding: 10px 20px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-text-dim);
      font-size: 14px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      color: var(--vscode-text);
    }

    .tab.active {
      color: var(--vscode-accent);
      border-bottom-color: var(--vscode-accent);
    }

    .section {
      display: none;
    }

    .section.active {
      display: block;
    }

    .card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 500;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 13px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      color: var(--vscode-text-dim);
      font-size: 12px;
    }

    .info-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-bg);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }

    .progress-fill {
      height: 100%;
      background: var(--vscode-accent);
      transition: width 0.3s ease;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .table th,
    .table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-border);
    }

    .table th {
      font-weight: 500;
      color: var(--vscode-text-dim);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge.active {
      background: var(--vscode-success);
      color: white;
    }

    .status-badge.inactive {
      background: var(--vscode-text-dim);
      color: white;
    }

    .status-badge.error {
      background: var(--vscode-error);
      color: white;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-secondary {
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border: 1px solid var(--vscode-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-bg-light);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--vscode-text-dim);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--vscode-text-dim);
    }

    .error {
      color: var(--vscode-error);
      padding: 16px;
      background: var(--vscode-bg-light);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .form-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      background: var(--vscode-bg);
      color: var(--vscode-text);
      font-size: 13px;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--vscode-bg-light);
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 500;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--vscode-text-dim);
    }
  `;
let we = Rr;
Me([
  oe({ type: Array })
], we.prototype, "disks");
Me([
  oe({ type: Array })
], we.prototype, "volumeGroups");
Me([
  oe({ type: Array })
], we.prototype, "logicalVolumes");
Me([
  oe({ type: Array })
], we.prototype, "physicalVolumes");
Me([
  oe({ type: Array })
], we.prototype, "raidDevices");
Me([
  oe({ type: Array })
], we.prototype, "availableRaidDisks");
Me([
  oe({ type: Array })
], we.prototype, "iscsiTargets");
Me([
  oe({ type: Array })
], we.prototype, "iscsiSessions");
Me([
  oe({ type: Array })
], we.prototype, "multipathDevices");
Me([
  oe({ type: Array })
], we.prototype, "btrfsSubvolumes");
Me([
  oe({ type: String })
], we.prototype, "activeSection");
Me([
  oe({ type: Boolean })
], we.prototype, "loading");
Me([
  oe({ type: String })
], we.prototype, "error");
customElements.define("storage-tab", we);
var pf = Object.defineProperty, Er = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && pf(e, t, r), r;
};
const Tr = class Tr extends De {
  constructor() {
    super(...arguments), this.activeTab = "containers", this.containers = [], this.images = [];
  }
  connectedCallback() {
    super.connectedCallback(), this.fetchData();
  }
  async fetchData() {
    this.activeTab === "containers" ? await this.fetchContainers() : this.activeTab === "images" && await this.fetchImages();
  }
  async fetchContainers() {
    try {
      const e = await Q.get("/containers");
      this.containers = e.containers || [];
    } catch (e) {
      console.error("Error fetching containers:", e);
    }
  }
  async fetchImages() {
    try {
      const e = await Q.get("/images");
      this.images = e.images || [];
    } catch (e) {
      console.error("Error fetching images:", e);
    }
  }
  async startContainer(e) {
    try {
      await Q.post(`/containers/${e}/start`), this.fetchContainers();
    } catch (t) {
      console.error("Error starting container:", t);
    }
  }
  async stopContainer(e) {
    try {
      await Q.post(`/containers/${e}/stop`), this.fetchContainers();
    } catch (t) {
      console.error("Error stopping container:", t);
    }
  }
  async removeContainer(e) {
    if (confirm(B("containers.removeConfirm")))
      try {
        await Q.delete(`/containers/${e}`), this.fetchContainers();
      } catch (t) {
        console.error("Error removing container:", t);
      }
  }
  async removeImage(e) {
    if (confirm(B("containers.removeImageConfirm")))
      try {
        await Q.delete(`/images/${e}`), this.fetchImages();
      } catch (t) {
        console.error("Error removing image:", t);
      }
  }
  renderContainer(e) {
    return N`
      <div class="container">
        <div class="container-header">
          <div>${e.name} - ${e.image}</div>
          <div>${e.state}</div>
        </div>
        <div class="container-info">
          <div>ID: ${e.id}</div>
          <div>Status: ${e.status}</div>
        </div>
        <div class="container-actions">
          ${e.state === "running" ? N`<button class="btn-danger" @click=${() => this.stopContainer(e.id)}>${B("containers.stop")}</button>` : N`<button class="btn-primary" @click=${() => this.startContainer(e.id)}>${B("containers.start")}</button>`}
          <button class="btn-danger" @click=${() => this.removeContainer(e.id)}>${B("common.delete")}</button>
        </div>
      </div>
    `;
  }
  renderImage(e) {
    return N`
      <div class="image">
        <div class="image-header">
          <div>${e.repository}:${e.tag || "latest"}</div>
          <div class="size-info">${this.formatSize(e.size)}</div>
        </div>
        <div class="image-info">
          <div>ID: ${e.id}</div>
          <div>Created: ${new Date(e.created).toLocaleDateString()}</div>
        </div>
        <div class="image-actions">
          <button class="btn-danger" @click=${() => this.removeImage(e.id)}>${B("common.delete")}</button>
        </div>
      </div>
    `;
  }
  formatSize(e) {
    if (!e) return "Unknown";
    const t = ["B", "KB", "MB", "GB"], s = Math.floor(Math.log(e) / Math.log(1024));
    return `${(e / Math.pow(1024, s)).toFixed(2)} ${t[s]}`;
  }
  renderTabs() {
    return N`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeTab === "containers" ? "active" : ""}" 
          @click="${() => {
      this.activeTab = "containers", this.fetchData();
    }}"
        >
          Containers
        </button>
        <button 
          class="tab-button ${this.activeTab === "images" ? "active" : ""}" 
          @click="${() => {
      this.activeTab = "images", this.fetchData();
    }}"
        >
          Images
        </button>
      </div>
    `;
  }
  render() {
    return N`
      <div class="tab-container">
        <h1>${B("containers.title")}</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.activeTab === "containers" ? N`
            <h2>Containers</h2>
            ${this.containers.length > 0 ? this.containers.map((e) => this.renderContainer(e)) : N`<div class="empty-state">No containers found.</div>`}
          ` : ""}

          ${this.activeTab === "images" ? N`
            <h2>Images</h2>
            ${this.images.length > 0 ? this.images.map((e) => this.renderImage(e)) : N`<div class="empty-state">No images found.</div>`}
          ` : ""}
        </div>
      </div>
    `;
  }
};
Tr.styles = Ne`
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .container {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .container-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .container-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .container-actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .size-info {
      font-size: 12px;
      color: var(--vscode-text-dim);
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    .image {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .image-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .image-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .image-actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
  `;
let zt = Tr;
Er([
  fe()
], zt.prototype, "activeTab");
Er([
  fe()
], zt.prototype, "containers");
Er([
  fe()
], zt.prototype, "images");
customElements.define("containers-tab", zt);
var gf = Object.defineProperty, Mt = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && gf(e, t, r), r;
};
const Pr = class Pr extends De {
  constructor() {
    super(...arguments), this.logs = [], this.serviceFilter = "", this.priorityFilter = "info", this.sinceFilter = "", this.follow = !0, this.connected = !1, this.autoScroll = !0, this.wsManager = null, this.logsContainer = null, this.maxLogs = 1e3;
  }
  // Maximum number of logs to keep in memory
  // Ensure update triggers on state change
  update(e) {
    super.update(e), console.log("Component updated", {
      logs: this.logs.length,
      connected: this.connected
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.initWebSocket();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.cleanup();
  }
  firstUpdated() {
    var e;
    this.logsContainer = (e = this.shadowRoot) == null ? void 0 : e.querySelector(".logs-container");
  }
  async initWebSocket() {
    try {
      this.wsManager = new cr("/ws/logs"), this.wsManager.on("auth", (e) => {
        var t;
        ((t = e.payload) == null ? void 0 : t.authenticated) === !0 && (this.connected = !0, this.subscribeToLogs());
      }), this.wsManager.on("data", (e) => {
        console.log("Received data message:", e);
        const t = e.payload || e;
        if (t.message) {
          const s = {
            type: "log",
            timestamp: t.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            service: t.service || t.unit || "system",
            priority: t.priority || t.level || "info",
            message: t.message || "",
            hostname: t.hostname,
            pid: t.pid
          };
          this.addLog(s);
        }
      }), this.wsManager.on("logs", (e) => {
        console.log("Received logs message:", e), e.payload && Array.isArray(e.payload) && e.payload.forEach((t) => {
          const s = {
            type: "log",
            timestamp: t.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            service: t.service || t.unit || "system",
            priority: t.priority || t.level || "info",
            message: t.message || "",
            hostname: t.hostname,
            pid: t.pid
          };
          this.addLog(s);
        });
      }), this.wsManager.on("error", (e) => {
        console.error("WebSocket error:", e.error), this.connected = !1;
      }), await this.wsManager.connect();
    } catch (e) {
      console.error("Failed to connect to logs WebSocket:", e), this.connected = !1;
    }
  }
  subscribeToLogs() {
    if (!this.wsManager) return;
    const e = {
      follow: this.follow
    };
    if (this.serviceFilter) {
      const s = this.serviceFilter.trim();
      s && (e.unit = s);
    }
    this.priorityFilter && this.priorityFilter !== "all" && (e.priority = this.priorityFilter), this.sinceFilter && (e.since = this.sinceFilter);
    const t = {
      type: "subscribe",
      payload: {
        filters: e
      }
    };
    console.log("Sending subscribe message:", t), this.wsManager.send(t);
  }
  addLog(e) {
    console.log("Adding log entry:", e), console.log("Current logs count before:", this.logs.length);
    const t = [...this.logs, e];
    t.length > this.maxLogs ? this.logs = t.slice(-this.maxLogs) : this.logs = t, console.log("Current logs count after:", this.logs.length), console.log("First log:", this.logs[0]), this.requestUpdate(), this.autoScroll && this.logsContainer && this.updateComplete.then(() => {
      this.logsContainer && (this.logsContainer.scrollTop = this.logsContainer.scrollHeight);
    });
  }
  handleServiceFilterChange(e) {
    this.serviceFilter = e.target.value, this.connected && (this.logs = [], this.subscribeToLogs());
  }
  handlePriorityChange(e) {
    this.priorityFilter = e.target.value, this.connected && (this.logs = [], this.subscribeToLogs());
  }
  handleSinceFilterChange(e) {
    this.sinceFilter = e.target.value, this.connected && (this.logs = [], this.subscribeToLogs());
  }
  handleFollowChange(e) {
    this.follow = e.target.checked, this.connected && this.subscribeToLogs();
  }
  handleAutoScrollChange(e) {
    this.autoScroll = e.target.checked, this.autoScroll && this.logsContainer && (this.logsContainer.scrollTop = this.logsContainer.scrollHeight);
  }
  clearLogs() {
    this.logs = [];
  }
  cleanup() {
    this.wsManager && (this.wsManager.disconnect(), this.wsManager = null), this.connected = !1;
  }
  formatTimestamp(e) {
    return new Date(e).toLocaleString();
  }
  renderLog(e) {
    return N`
      <div class="log-entry">
        <span class="log-timestamp">${this.formatTimestamp(e.timestamp)}</span>
        <span class="log-service" title="${e.service || "system"}">${e.service || "system"}</span>
        <span class="log-priority priority-${e.priority || "info"}">${(e.priority || "info").toUpperCase()}</span>
        <span class="log-message">${e.message}</span>
      </div>
    `;
  }
  render() {
    return N`
      <h1>${B("logs.title")}</h1>
      
      <div class="controls">
        <div class="filter-group">
          <input 
            class="filter-input" 
            type="text" 
            placeholder="${B("logs.filterServices")} (e.g., 'systemd', 'nginx')" 
            .value="${this.serviceFilter}"
            @input="${this.handleServiceFilterChange}"
          />
        </div>
        
        <div class="filter-group">
          <label for="priority">${B("logs.priority")}:</label>
          <select 
            id="priority" 
            class="priority-select" 
            .value="${this.priorityFilter}"
            @change="${this.handlePriorityChange}"
          >
            <option value="all">All</option>
            <option value="debug">Debug (7)</option>
            <option value="info">Info (6) and above</option>
            <option value="notice">Notice (5) and above</option>
            <option value="warning">Warning (4) and above</option>
            <option value="err">Error (3) and above</option>
            <option value="crit">Critical (2) and above</option>
            <option value="alert">Alert (1) and above</option>
            <option value="emerg">Emergency (0) only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <input 
            class="filter-input" 
            type="text" 
            placeholder="${B("logs.since")} (e.g., '10 minutes ago', '1 hour ago')" 
            .value="${this.sinceFilter}"
            @input="${this.handleSinceFilterChange}"
          />
        </div>
        
        <div class="toggle-follow">
          <input 
            type="checkbox" 
            id="follow" 
            .checked="${this.follow}"
            @change="${this.handleFollowChange}"
          />
          <label for="follow">${B("logs.follow")}</label>
        </div>
        
        <div class="toggle-follow">
          <input 
            type="checkbox" 
            id="autoscroll" 
            .checked="${this.autoScroll}"
            @change="${this.handleAutoScrollChange}"
          />
          <label for="autoscroll">Auto-scroll</label>
        </div>
        
        <button @click="${this.clearLogs}" ?disabled="${this.logs.length === 0}">
          ${B("logs.clear")}
        </button>
        
        <div class="status-indicator">
          <div class="status-dot ${this.connected ? "connected" : ""}"></div>
          <span>${this.connected ? B("common.connected") : B("common.disconnected")}</span>
        </div>
      </div>
      
      <div class="logs-container">
        ${this.logs.length > 0 ? this.logs.map((e) => this.renderLog(e)) : N`<div class="empty-state">${B("logs.noLogs")}</div>`}
      </div>
    `;
  }
};
Pr.styles = Ne`
    :host {
      display: block;
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
    }

    .controls {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .filter-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .filter-input {
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 13px;
      min-width: 200px;
    }

    .priority-select {
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 13px;
    }

    .toggle-follow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .toggle-follow input[type="checkbox"] {
      cursor: pointer;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-error);
    }

    .status-dot.connected {
      background: var(--vscode-success);
    }

    .logs-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      padding: 8px;
      font-family: var(--vscode-font-family-mono);
      font-size: 12px;
      min-height: 0; /* Important for flexbox overflow */
      position: relative;
    }

    .log-entry {
      padding: 4px 8px;
      margin-bottom: 2px;
      border-radius: 2px;
      display: grid;
      grid-template-columns: 160px 80px 100px 1fr;
      gap: 16px;
      align-items: start;
    }

    .log-entry:hover {
      background: var(--vscode-bg-light);
    }

    .log-timestamp {
      color: var(--vscode-text-dim);
      white-space: nowrap;
    }

    .log-service {
      color: var(--vscode-accent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .log-priority {
      font-weight: 500;
      white-space: nowrap;
    }

    .priority-emerg,
    .priority-emergency,
    .priority-0 {
      color: var(--vscode-error);
      background: rgba(255, 0, 0, 0.1);
    }

    .priority-alert,
    .priority-1 {
      color: var(--vscode-error);
    }

    .priority-crit,
    .priority-critical,
    .priority-2 {
      color: var(--vscode-error);
    }

    .priority-err,
    .priority-error,
    .priority-3 {
      color: var(--error);
    }

    .priority-warning,
    .priority-4 {
      color: var(--warning);
    }

    .priority-notice,
    .priority-5 {
      color: var(--vscode-text);
    }

    .priority-info,
    .priority-6 {
      color: var(--vscode-text);
    }

    .priority-debug,
    .priority-7 {
      color: var(--vscode-text-dim);
    }

    .log-message {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-text-dim);
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      background: var(--vscode-accent);
      color: white;
    }

    button:hover {
      background: var(--vscode-accent-hover);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
let We = Pr;
Mt([
  fe()
], We.prototype, "logs");
Mt([
  fe()
], We.prototype, "serviceFilter");
Mt([
  fe()
], We.prototype, "priorityFilter");
Mt([
  fe()
], We.prototype, "sinceFilter");
Mt([
  fe()
], We.prototype, "follow");
Mt([
  fe()
], We.prototype, "connected");
Mt([
  fe()
], We.prototype, "autoScroll");
customElements.define("logs-tab", We);
var wa = { exports: {} };
(function(i, e) {
  (function(t, s) {
    i.exports = s();
  })(self, () => (() => {
    var t = { 4567: function(l, n, a) {
      var c = this && this.__decorate || function(_, b, S, w) {
        var k, x = arguments.length, C = x < 3 ? b : w === null ? w = Object.getOwnPropertyDescriptor(b, S) : w;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") C = Reflect.decorate(_, b, S, w);
        else for (var A = _.length - 1; A >= 0; A--) (k = _[A]) && (C = (x < 3 ? k(C) : x > 3 ? k(b, S, C) : k(b, S)) || C);
        return x > 3 && C && Object.defineProperty(b, S, C), C;
      }, u = this && this.__param || function(_, b) {
        return function(S, w) {
          b(S, w, _);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.AccessibilityManager = void 0;
      const d = a(9042), f = a(6114), m = a(9924), y = a(844), v = a(5596), h = a(4725), p = a(3656);
      let g = n.AccessibilityManager = class extends y.Disposable {
        constructor(_, b) {
          super(), this._terminal = _, this._renderService = b, this._liveRegionLineCount = 0, this._charsToConsume = [], this._charsToAnnounce = "", this._accessibilityContainer = document.createElement("div"), this._accessibilityContainer.classList.add("xterm-accessibility"), this._rowContainer = document.createElement("div"), this._rowContainer.setAttribute("role", "list"), this._rowContainer.classList.add("xterm-accessibility-tree"), this._rowElements = [];
          for (let S = 0; S < this._terminal.rows; S++) this._rowElements[S] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[S]);
          if (this._topBoundaryFocusListener = (S) => this._handleBoundaryFocus(S, 0), this._bottomBoundaryFocusListener = (S) => this._handleBoundaryFocus(S, 1), this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions(), this._accessibilityContainer.appendChild(this._rowContainer), this._liveRegion = document.createElement("div"), this._liveRegion.classList.add("live-region"), this._liveRegion.setAttribute("aria-live", "assertive"), this._accessibilityContainer.appendChild(this._liveRegion), this._liveRegionDebouncer = this.register(new m.TimeBasedDebouncer(this._renderRows.bind(this))), !this._terminal.element) throw new Error("Cannot enable accessibility before Terminal.open");
          this._terminal.element.insertAdjacentElement("afterbegin", this._accessibilityContainer), this.register(this._terminal.onResize((S) => this._handleResize(S.rows))), this.register(this._terminal.onRender((S) => this._refreshRows(S.start, S.end))), this.register(this._terminal.onScroll(() => this._refreshRows())), this.register(this._terminal.onA11yChar((S) => this._handleChar(S))), this.register(this._terminal.onLineFeed(() => this._handleChar(`
`))), this.register(this._terminal.onA11yTab((S) => this._handleTab(S))), this.register(this._terminal.onKey((S) => this._handleKey(S.key))), this.register(this._terminal.onBlur(() => this._clearLiveRegion())), this.register(this._renderService.onDimensionsChange(() => this._refreshRowsDimensions())), this._screenDprMonitor = new v.ScreenDprMonitor(window), this.register(this._screenDprMonitor), this._screenDprMonitor.setListener(() => this._refreshRowsDimensions()), this.register((0, p.addDisposableDomListener)(window, "resize", () => this._refreshRowsDimensions())), this._refreshRows(), this.register((0, y.toDisposable)(() => {
            this._accessibilityContainer.remove(), this._rowElements.length = 0;
          }));
        }
        _handleTab(_) {
          for (let b = 0; b < _; b++) this._handleChar(" ");
        }
        _handleChar(_) {
          this._liveRegionLineCount < 21 && (this._charsToConsume.length > 0 ? this._charsToConsume.shift() !== _ && (this._charsToAnnounce += _) : this._charsToAnnounce += _, _ === `
` && (this._liveRegionLineCount++, this._liveRegionLineCount === 21 && (this._liveRegion.textContent += d.tooMuchOutput)), f.isMac && this._liveRegion.textContent && this._liveRegion.textContent.length > 0 && !this._liveRegion.parentNode && setTimeout(() => {
            this._accessibilityContainer.appendChild(this._liveRegion);
          }, 0));
        }
        _clearLiveRegion() {
          this._liveRegion.textContent = "", this._liveRegionLineCount = 0, f.isMac && this._liveRegion.remove();
        }
        _handleKey(_) {
          this._clearLiveRegion(), new RegExp("\\p{Control}", "u").test(_) || this._charsToConsume.push(_);
        }
        _refreshRows(_, b) {
          this._liveRegionDebouncer.refresh(_, b, this._terminal.rows);
        }
        _renderRows(_, b) {
          const S = this._terminal.buffer, w = S.lines.length.toString();
          for (let k = _; k <= b; k++) {
            const x = S.translateBufferLineToString(S.ydisp + k, !0), C = (S.ydisp + k + 1).toString(), A = this._rowElements[k];
            A && (x.length === 0 ? A.innerText = " " : A.textContent = x, A.setAttribute("aria-posinset", C), A.setAttribute("aria-setsize", w));
          }
          this._announceCharacters();
        }
        _announceCharacters() {
          this._charsToAnnounce.length !== 0 && (this._liveRegion.textContent += this._charsToAnnounce, this._charsToAnnounce = "");
        }
        _handleBoundaryFocus(_, b) {
          const S = _.target, w = this._rowElements[b === 0 ? 1 : this._rowElements.length - 2];
          if (S.getAttribute("aria-posinset") === (b === 0 ? "1" : `${this._terminal.buffer.lines.length}`) || _.relatedTarget !== w) return;
          let k, x;
          if (b === 0 ? (k = S, x = this._rowElements.pop(), this._rowContainer.removeChild(x)) : (k = this._rowElements.shift(), x = S, this._rowContainer.removeChild(k)), k.removeEventListener("focus", this._topBoundaryFocusListener), x.removeEventListener("focus", this._bottomBoundaryFocusListener), b === 0) {
            const C = this._createAccessibilityTreeNode();
            this._rowElements.unshift(C), this._rowContainer.insertAdjacentElement("afterbegin", C);
          } else {
            const C = this._createAccessibilityTreeNode();
            this._rowElements.push(C), this._rowContainer.appendChild(C);
          }
          this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._terminal.scrollLines(b === 0 ? -1 : 1), this._rowElements[b === 0 ? 1 : this._rowElements.length - 2].focus(), _.preventDefault(), _.stopImmediatePropagation();
        }
        _handleResize(_) {
          this._rowElements[this._rowElements.length - 1].removeEventListener("focus", this._bottomBoundaryFocusListener);
          for (let b = this._rowContainer.children.length; b < this._terminal.rows; b++) this._rowElements[b] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[b]);
          for (; this._rowElements.length > _; ) this._rowContainer.removeChild(this._rowElements.pop());
          this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions();
        }
        _createAccessibilityTreeNode() {
          const _ = document.createElement("div");
          return _.setAttribute("role", "listitem"), _.tabIndex = -1, this._refreshRowDimensions(_), _;
        }
        _refreshRowsDimensions() {
          if (this._renderService.dimensions.css.cell.height) {
            this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`, this._rowElements.length !== this._terminal.rows && this._handleResize(this._terminal.rows);
            for (let _ = 0; _ < this._terminal.rows; _++) this._refreshRowDimensions(this._rowElements[_]);
          }
        }
        _refreshRowDimensions(_) {
          _.style.height = `${this._renderService.dimensions.css.cell.height}px`;
        }
      };
      n.AccessibilityManager = g = c([u(1, h.IRenderService)], g);
    }, 3614: (l, n) => {
      function a(f) {
        return f.replace(/\r?\n/g, "\r");
      }
      function c(f, m) {
        return m ? "\x1B[200~" + f + "\x1B[201~" : f;
      }
      function u(f, m, y, v) {
        f = c(f = a(f), y.decPrivateModes.bracketedPasteMode && v.rawOptions.ignoreBracketedPasteMode !== !0), y.triggerDataEvent(f, !0), m.value = "";
      }
      function d(f, m, y) {
        const v = y.getBoundingClientRect(), h = f.clientX - v.left - 10, p = f.clientY - v.top - 10;
        m.style.width = "20px", m.style.height = "20px", m.style.left = `${h}px`, m.style.top = `${p}px`, m.style.zIndex = "1000", m.focus();
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.rightClickHandler = n.moveTextAreaUnderMouseCursor = n.paste = n.handlePasteEvent = n.copyHandler = n.bracketTextForPaste = n.prepareTextForTerminal = void 0, n.prepareTextForTerminal = a, n.bracketTextForPaste = c, n.copyHandler = function(f, m) {
        f.clipboardData && f.clipboardData.setData("text/plain", m.selectionText), f.preventDefault();
      }, n.handlePasteEvent = function(f, m, y, v) {
        f.stopPropagation(), f.clipboardData && u(f.clipboardData.getData("text/plain"), m, y, v);
      }, n.paste = u, n.moveTextAreaUnderMouseCursor = d, n.rightClickHandler = function(f, m, y, v, h) {
        d(f, m, y), h && v.rightClickSelect(f), m.value = v.selectionText, m.select();
      };
    }, 7239: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ColorContrastCache = void 0;
      const c = a(1505);
      n.ColorContrastCache = class {
        constructor() {
          this._color = new c.TwoKeyMap(), this._css = new c.TwoKeyMap();
        }
        setCss(u, d, f) {
          this._css.set(u, d, f);
        }
        getCss(u, d) {
          return this._css.get(u, d);
        }
        setColor(u, d, f) {
          this._color.set(u, d, f);
        }
        getColor(u, d) {
          return this._color.get(u, d);
        }
        clear() {
          this._color.clear(), this._css.clear();
        }
      };
    }, 3656: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.addDisposableDomListener = void 0, n.addDisposableDomListener = function(a, c, u, d) {
        a.addEventListener(c, u, d);
        let f = !1;
        return { dispose: () => {
          f || (f = !0, a.removeEventListener(c, u, d));
        } };
      };
    }, 6465: function(l, n, a) {
      var c = this && this.__decorate || function(h, p, g, _) {
        var b, S = arguments.length, w = S < 3 ? p : _ === null ? _ = Object.getOwnPropertyDescriptor(p, g) : _;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") w = Reflect.decorate(h, p, g, _);
        else for (var k = h.length - 1; k >= 0; k--) (b = h[k]) && (w = (S < 3 ? b(w) : S > 3 ? b(p, g, w) : b(p, g)) || w);
        return S > 3 && w && Object.defineProperty(p, g, w), w;
      }, u = this && this.__param || function(h, p) {
        return function(g, _) {
          p(g, _, h);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Linkifier2 = void 0;
      const d = a(3656), f = a(8460), m = a(844), y = a(2585);
      let v = n.Linkifier2 = class extends m.Disposable {
        get currentLink() {
          return this._currentLink;
        }
        constructor(h) {
          super(), this._bufferService = h, this._linkProviders = [], this._linkCacheDisposables = [], this._isMouseOut = !0, this._wasResized = !1, this._activeLine = -1, this._onShowLinkUnderline = this.register(new f.EventEmitter()), this.onShowLinkUnderline = this._onShowLinkUnderline.event, this._onHideLinkUnderline = this.register(new f.EventEmitter()), this.onHideLinkUnderline = this._onHideLinkUnderline.event, this.register((0, m.getDisposeArrayDisposable)(this._linkCacheDisposables)), this.register((0, m.toDisposable)(() => {
            this._lastMouseEvent = void 0;
          })), this.register(this._bufferService.onResize(() => {
            this._clearCurrentLink(), this._wasResized = !0;
          }));
        }
        registerLinkProvider(h) {
          return this._linkProviders.push(h), { dispose: () => {
            const p = this._linkProviders.indexOf(h);
            p !== -1 && this._linkProviders.splice(p, 1);
          } };
        }
        attachToDom(h, p, g) {
          this._element = h, this._mouseService = p, this._renderService = g, this.register((0, d.addDisposableDomListener)(this._element, "mouseleave", () => {
            this._isMouseOut = !0, this._clearCurrentLink();
          })), this.register((0, d.addDisposableDomListener)(this._element, "mousemove", this._handleMouseMove.bind(this))), this.register((0, d.addDisposableDomListener)(this._element, "mousedown", this._handleMouseDown.bind(this))), this.register((0, d.addDisposableDomListener)(this._element, "mouseup", this._handleMouseUp.bind(this)));
        }
        _handleMouseMove(h) {
          if (this._lastMouseEvent = h, !this._element || !this._mouseService) return;
          const p = this._positionFromMouseEvent(h, this._element, this._mouseService);
          if (!p) return;
          this._isMouseOut = !1;
          const g = h.composedPath();
          for (let _ = 0; _ < g.length; _++) {
            const b = g[_];
            if (b.classList.contains("xterm")) break;
            if (b.classList.contains("xterm-hover")) return;
          }
          this._lastBufferCell && p.x === this._lastBufferCell.x && p.y === this._lastBufferCell.y || (this._handleHover(p), this._lastBufferCell = p);
        }
        _handleHover(h) {
          if (this._activeLine !== h.y || this._wasResized) return this._clearCurrentLink(), this._askForLink(h, !1), void (this._wasResized = !1);
          this._currentLink && this._linkAtPosition(this._currentLink.link, h) || (this._clearCurrentLink(), this._askForLink(h, !0));
        }
        _askForLink(h, p) {
          var g, _;
          this._activeProviderReplies && p || ((g = this._activeProviderReplies) === null || g === void 0 || g.forEach((S) => {
            S == null || S.forEach((w) => {
              w.link.dispose && w.link.dispose();
            });
          }), this._activeProviderReplies = /* @__PURE__ */ new Map(), this._activeLine = h.y);
          let b = !1;
          for (const [S, w] of this._linkProviders.entries()) p ? !((_ = this._activeProviderReplies) === null || _ === void 0) && _.get(S) && (b = this._checkLinkProviderResult(S, h, b)) : w.provideLinks(h.y, (k) => {
            var x, C;
            if (this._isMouseOut) return;
            const A = k == null ? void 0 : k.map((L) => ({ link: L }));
            (x = this._activeProviderReplies) === null || x === void 0 || x.set(S, A), b = this._checkLinkProviderResult(S, h, b), ((C = this._activeProviderReplies) === null || C === void 0 ? void 0 : C.size) === this._linkProviders.length && this._removeIntersectingLinks(h.y, this._activeProviderReplies);
          });
        }
        _removeIntersectingLinks(h, p) {
          const g = /* @__PURE__ */ new Set();
          for (let _ = 0; _ < p.size; _++) {
            const b = p.get(_);
            if (b) for (let S = 0; S < b.length; S++) {
              const w = b[S], k = w.link.range.start.y < h ? 0 : w.link.range.start.x, x = w.link.range.end.y > h ? this._bufferService.cols : w.link.range.end.x;
              for (let C = k; C <= x; C++) {
                if (g.has(C)) {
                  b.splice(S--, 1);
                  break;
                }
                g.add(C);
              }
            }
          }
        }
        _checkLinkProviderResult(h, p, g) {
          var _;
          if (!this._activeProviderReplies) return g;
          const b = this._activeProviderReplies.get(h);
          let S = !1;
          for (let w = 0; w < h; w++) this._activeProviderReplies.has(w) && !this._activeProviderReplies.get(w) || (S = !0);
          if (!S && b) {
            const w = b.find((k) => this._linkAtPosition(k.link, p));
            w && (g = !0, this._handleNewLink(w));
          }
          if (this._activeProviderReplies.size === this._linkProviders.length && !g) for (let w = 0; w < this._activeProviderReplies.size; w++) {
            const k = (_ = this._activeProviderReplies.get(w)) === null || _ === void 0 ? void 0 : _.find((x) => this._linkAtPosition(x.link, p));
            if (k) {
              g = !0, this._handleNewLink(k);
              break;
            }
          }
          return g;
        }
        _handleMouseDown() {
          this._mouseDownLink = this._currentLink;
        }
        _handleMouseUp(h) {
          if (!this._element || !this._mouseService || !this._currentLink) return;
          const p = this._positionFromMouseEvent(h, this._element, this._mouseService);
          p && this._mouseDownLink === this._currentLink && this._linkAtPosition(this._currentLink.link, p) && this._currentLink.link.activate(h, this._currentLink.link.text);
        }
        _clearCurrentLink(h, p) {
          this._element && this._currentLink && this._lastMouseEvent && (!h || !p || this._currentLink.link.range.start.y >= h && this._currentLink.link.range.end.y <= p) && (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent), this._currentLink = void 0, (0, m.disposeArray)(this._linkCacheDisposables));
        }
        _handleNewLink(h) {
          if (!this._element || !this._lastMouseEvent || !this._mouseService) return;
          const p = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
          p && this._linkAtPosition(h.link, p) && (this._currentLink = h, this._currentLink.state = { decorations: { underline: h.link.decorations === void 0 || h.link.decorations.underline, pointerCursor: h.link.decorations === void 0 || h.link.decorations.pointerCursor }, isHovered: !0 }, this._linkHover(this._element, h.link, this._lastMouseEvent), h.link.decorations = {}, Object.defineProperties(h.link.decorations, { pointerCursor: { get: () => {
            var g, _;
            return (_ = (g = this._currentLink) === null || g === void 0 ? void 0 : g.state) === null || _ === void 0 ? void 0 : _.decorations.pointerCursor;
          }, set: (g) => {
            var _, b;
            !((_ = this._currentLink) === null || _ === void 0) && _.state && this._currentLink.state.decorations.pointerCursor !== g && (this._currentLink.state.decorations.pointerCursor = g, this._currentLink.state.isHovered && ((b = this._element) === null || b === void 0 || b.classList.toggle("xterm-cursor-pointer", g)));
          } }, underline: { get: () => {
            var g, _;
            return (_ = (g = this._currentLink) === null || g === void 0 ? void 0 : g.state) === null || _ === void 0 ? void 0 : _.decorations.underline;
          }, set: (g) => {
            var _, b, S;
            !((_ = this._currentLink) === null || _ === void 0) && _.state && ((S = (b = this._currentLink) === null || b === void 0 ? void 0 : b.state) === null || S === void 0 ? void 0 : S.decorations.underline) !== g && (this._currentLink.state.decorations.underline = g, this._currentLink.state.isHovered && this._fireUnderlineEvent(h.link, g));
          } } }), this._renderService && this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange((g) => {
            if (!this._currentLink) return;
            const _ = g.start === 0 ? 0 : g.start + 1 + this._bufferService.buffer.ydisp, b = this._bufferService.buffer.ydisp + 1 + g.end;
            if (this._currentLink.link.range.start.y >= _ && this._currentLink.link.range.end.y <= b && (this._clearCurrentLink(_, b), this._lastMouseEvent && this._element)) {
              const S = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
              S && this._askForLink(S, !1);
            }
          })));
        }
        _linkHover(h, p, g) {
          var _;
          !((_ = this._currentLink) === null || _ === void 0) && _.state && (this._currentLink.state.isHovered = !0, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(p, !0), this._currentLink.state.decorations.pointerCursor && h.classList.add("xterm-cursor-pointer")), p.hover && p.hover(g, p.text);
        }
        _fireUnderlineEvent(h, p) {
          const g = h.range, _ = this._bufferService.buffer.ydisp, b = this._createLinkUnderlineEvent(g.start.x - 1, g.start.y - _ - 1, g.end.x, g.end.y - _ - 1, void 0);
          (p ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(b);
        }
        _linkLeave(h, p, g) {
          var _;
          !((_ = this._currentLink) === null || _ === void 0) && _.state && (this._currentLink.state.isHovered = !1, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(p, !1), this._currentLink.state.decorations.pointerCursor && h.classList.remove("xterm-cursor-pointer")), p.leave && p.leave(g, p.text);
        }
        _linkAtPosition(h, p) {
          const g = h.range.start.y * this._bufferService.cols + h.range.start.x, _ = h.range.end.y * this._bufferService.cols + h.range.end.x, b = p.y * this._bufferService.cols + p.x;
          return g <= b && b <= _;
        }
        _positionFromMouseEvent(h, p, g) {
          const _ = g.getCoords(h, p, this._bufferService.cols, this._bufferService.rows);
          if (_) return { x: _[0], y: _[1] + this._bufferService.buffer.ydisp };
        }
        _createLinkUnderlineEvent(h, p, g, _, b) {
          return { x1: h, y1: p, x2: g, y2: _, cols: this._bufferService.cols, fg: b };
        }
      };
      n.Linkifier2 = v = c([u(0, y.IBufferService)], v);
    }, 9042: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.tooMuchOutput = n.promptLabel = void 0, n.promptLabel = "Terminal input", n.tooMuchOutput = "Too much output to announce, navigate to rows manually to read";
    }, 3730: function(l, n, a) {
      var c = this && this.__decorate || function(v, h, p, g) {
        var _, b = arguments.length, S = b < 3 ? h : g === null ? g = Object.getOwnPropertyDescriptor(h, p) : g;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") S = Reflect.decorate(v, h, p, g);
        else for (var w = v.length - 1; w >= 0; w--) (_ = v[w]) && (S = (b < 3 ? _(S) : b > 3 ? _(h, p, S) : _(h, p)) || S);
        return b > 3 && S && Object.defineProperty(h, p, S), S;
      }, u = this && this.__param || function(v, h) {
        return function(p, g) {
          h(p, g, v);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.OscLinkProvider = void 0;
      const d = a(511), f = a(2585);
      let m = n.OscLinkProvider = class {
        constructor(v, h, p) {
          this._bufferService = v, this._optionsService = h, this._oscLinkService = p;
        }
        provideLinks(v, h) {
          var p;
          const g = this._bufferService.buffer.lines.get(v - 1);
          if (!g) return void h(void 0);
          const _ = [], b = this._optionsService.rawOptions.linkHandler, S = new d.CellData(), w = g.getTrimmedLength();
          let k = -1, x = -1, C = !1;
          for (let A = 0; A < w; A++) if (x !== -1 || g.hasContent(A)) {
            if (g.loadCell(A, S), S.hasExtendedAttrs() && S.extended.urlId) {
              if (x === -1) {
                x = A, k = S.extended.urlId;
                continue;
              }
              C = S.extended.urlId !== k;
            } else x !== -1 && (C = !0);
            if (C || x !== -1 && A === w - 1) {
              const L = (p = this._oscLinkService.getLinkData(k)) === null || p === void 0 ? void 0 : p.uri;
              if (L) {
                const M = { start: { x: x + 1, y: v }, end: { x: A + (C || A !== w - 1 ? 0 : 1), y: v } };
                let T = !1;
                if (!(b != null && b.allowNonHttpProtocols)) try {
                  const F = new URL(L);
                  ["http:", "https:"].includes(F.protocol) || (T = !0);
                } catch {
                  T = !0;
                }
                T || _.push({ text: L, range: M, activate: (F, $) => b ? b.activate(F, $, M) : y(0, $), hover: (F, $) => {
                  var H;
                  return (H = b == null ? void 0 : b.hover) === null || H === void 0 ? void 0 : H.call(b, F, $, M);
                }, leave: (F, $) => {
                  var H;
                  return (H = b == null ? void 0 : b.leave) === null || H === void 0 ? void 0 : H.call(b, F, $, M);
                } });
              }
              C = !1, S.hasExtendedAttrs() && S.extended.urlId ? (x = A, k = S.extended.urlId) : (x = -1, k = -1);
            }
          }
          h(_);
        }
      };
      function y(v, h) {
        if (confirm(`Do you want to navigate to ${h}?

WARNING: This link could potentially be dangerous`)) {
          const p = window.open();
          if (p) {
            try {
              p.opener = null;
            } catch {
            }
            p.location.href = h;
          } else console.warn("Opening link blocked as opener could not be cleared");
        }
      }
      n.OscLinkProvider = m = c([u(0, f.IBufferService), u(1, f.IOptionsService), u(2, f.IOscLinkService)], m);
    }, 6193: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.RenderDebouncer = void 0, n.RenderDebouncer = class {
        constructor(a, c) {
          this._parentWindow = a, this._renderCallback = c, this._refreshCallbacks = [];
        }
        dispose() {
          this._animationFrame && (this._parentWindow.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
        }
        addRefreshCallback(a) {
          return this._refreshCallbacks.push(a), this._animationFrame || (this._animationFrame = this._parentWindow.requestAnimationFrame(() => this._innerRefresh())), this._animationFrame;
        }
        refresh(a, c, u) {
          this._rowCount = u, a = a !== void 0 ? a : 0, c = c !== void 0 ? c : this._rowCount - 1, this._rowStart = this._rowStart !== void 0 ? Math.min(this._rowStart, a) : a, this._rowEnd = this._rowEnd !== void 0 ? Math.max(this._rowEnd, c) : c, this._animationFrame || (this._animationFrame = this._parentWindow.requestAnimationFrame(() => this._innerRefresh()));
        }
        _innerRefresh() {
          if (this._animationFrame = void 0, this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0) return void this._runRefreshCallbacks();
          const a = Math.max(this._rowStart, 0), c = Math.min(this._rowEnd, this._rowCount - 1);
          this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(a, c), this._runRefreshCallbacks();
        }
        _runRefreshCallbacks() {
          for (const a of this._refreshCallbacks) a(0);
          this._refreshCallbacks = [];
        }
      };
    }, 5596: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ScreenDprMonitor = void 0;
      const c = a(844);
      class u extends c.Disposable {
        constructor(f) {
          super(), this._parentWindow = f, this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this.register((0, c.toDisposable)(() => {
            this.clearListener();
          }));
        }
        setListener(f) {
          this._listener && this.clearListener(), this._listener = f, this._outerListener = () => {
            this._listener && (this._listener(this._parentWindow.devicePixelRatio, this._currentDevicePixelRatio), this._updateDpr());
          }, this._updateDpr();
        }
        _updateDpr() {
          var f;
          this._outerListener && ((f = this._resolutionMediaMatchList) === null || f === void 0 || f.removeListener(this._outerListener), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`), this._resolutionMediaMatchList.addListener(this._outerListener));
        }
        clearListener() {
          this._resolutionMediaMatchList && this._listener && this._outerListener && (this._resolutionMediaMatchList.removeListener(this._outerListener), this._resolutionMediaMatchList = void 0, this._listener = void 0, this._outerListener = void 0);
        }
      }
      n.ScreenDprMonitor = u;
    }, 3236: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Terminal = void 0;
      const c = a(3614), u = a(3656), d = a(6465), f = a(9042), m = a(3730), y = a(1680), v = a(3107), h = a(5744), p = a(2950), g = a(1296), _ = a(428), b = a(4269), S = a(5114), w = a(8934), k = a(3230), x = a(9312), C = a(4725), A = a(6731), L = a(8055), M = a(8969), T = a(8460), F = a(844), $ = a(6114), H = a(8437), z = a(2584), E = a(7399), R = a(5941), P = a(9074), O = a(2585), j = a(5435), q = a(4567), X = typeof window < "u" ? window.document : null;
      class Y extends M.CoreTerminal {
        get onFocus() {
          return this._onFocus.event;
        }
        get onBlur() {
          return this._onBlur.event;
        }
        get onA11yChar() {
          return this._onA11yCharEmitter.event;
        }
        get onA11yTab() {
          return this._onA11yTabEmitter.event;
        }
        get onWillOpen() {
          return this._onWillOpen.event;
        }
        constructor(D = {}) {
          super(D), this.browser = $, this._keyDownHandled = !1, this._keyDownSeen = !1, this._keyPressHandled = !1, this._unprocessedDeadKey = !1, this._accessibilityManager = this.register(new F.MutableDisposable()), this._onCursorMove = this.register(new T.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onKey = this.register(new T.EventEmitter()), this.onKey = this._onKey.event, this._onRender = this.register(new T.EventEmitter()), this.onRender = this._onRender.event, this._onSelectionChange = this.register(new T.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onTitleChange = this.register(new T.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onBell = this.register(new T.EventEmitter()), this.onBell = this._onBell.event, this._onFocus = this.register(new T.EventEmitter()), this._onBlur = this.register(new T.EventEmitter()), this._onA11yCharEmitter = this.register(new T.EventEmitter()), this._onA11yTabEmitter = this.register(new T.EventEmitter()), this._onWillOpen = this.register(new T.EventEmitter()), this._setup(), this.linkifier2 = this.register(this._instantiationService.createInstance(d.Linkifier2)), this.linkifier2.registerLinkProvider(this._instantiationService.createInstance(m.OscLinkProvider)), this._decorationService = this._instantiationService.createInstance(P.DecorationService), this._instantiationService.setService(O.IDecorationService, this._decorationService), this.register(this._inputHandler.onRequestBell(() => this._onBell.fire())), this.register(this._inputHandler.onRequestRefreshRows((I, U) => this.refresh(I, U))), this.register(this._inputHandler.onRequestSendFocus(() => this._reportFocus())), this.register(this._inputHandler.onRequestReset(() => this.reset())), this.register(this._inputHandler.onRequestWindowsOptionsReport((I) => this._reportWindowsOptions(I))), this.register(this._inputHandler.onColor((I) => this._handleColorEvent(I))), this.register((0, T.forwardEvent)(this._inputHandler.onCursorMove, this._onCursorMove)), this.register((0, T.forwardEvent)(this._inputHandler.onTitleChange, this._onTitleChange)), this.register((0, T.forwardEvent)(this._inputHandler.onA11yChar, this._onA11yCharEmitter)), this.register((0, T.forwardEvent)(this._inputHandler.onA11yTab, this._onA11yTabEmitter)), this.register(this._bufferService.onResize((I) => this._afterResize(I.cols, I.rows))), this.register((0, F.toDisposable)(() => {
            var I, U;
            this._customKeyEventHandler = void 0, (U = (I = this.element) === null || I === void 0 ? void 0 : I.parentNode) === null || U === void 0 || U.removeChild(this.element);
          }));
        }
        _handleColorEvent(D) {
          if (this._themeService) for (const I of D) {
            let U, W = "";
            switch (I.index) {
              case 256:
                U = "foreground", W = "10";
                break;
              case 257:
                U = "background", W = "11";
                break;
              case 258:
                U = "cursor", W = "12";
                break;
              default:
                U = "ansi", W = "4;" + I.index;
            }
            switch (I.type) {
              case 0:
                const J = L.color.toColorRGB(U === "ansi" ? this._themeService.colors.ansi[I.index] : this._themeService.colors[U]);
                this.coreService.triggerDataEvent(`${z.C0.ESC}]${W};${(0, R.toRgbString)(J)}${z.C1_ESCAPED.ST}`);
                break;
              case 1:
                if (U === "ansi") this._themeService.modifyColors((K) => K.ansi[I.index] = L.rgba.toColor(...I.color));
                else {
                  const K = U;
                  this._themeService.modifyColors((re) => re[K] = L.rgba.toColor(...I.color));
                }
                break;
              case 2:
                this._themeService.restoreColor(I.index);
            }
          }
        }
        _setup() {
          super._setup(), this._customKeyEventHandler = void 0;
        }
        get buffer() {
          return this.buffers.active;
        }
        focus() {
          this.textarea && this.textarea.focus({ preventScroll: !0 });
        }
        _handleScreenReaderModeOptionChange(D) {
          D ? !this._accessibilityManager.value && this._renderService && (this._accessibilityManager.value = this._instantiationService.createInstance(q.AccessibilityManager, this)) : this._accessibilityManager.clear();
        }
        _handleTextAreaFocus(D) {
          this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(z.C0.ESC + "[I"), this.updateCursorStyle(D), this.element.classList.add("focus"), this._showCursor(), this._onFocus.fire();
        }
        blur() {
          var D;
          return (D = this.textarea) === null || D === void 0 ? void 0 : D.blur();
        }
        _handleTextAreaBlur() {
          this.textarea.value = "", this.refresh(this.buffer.y, this.buffer.y), this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(z.C0.ESC + "[O"), this.element.classList.remove("focus"), this._onBlur.fire();
        }
        _syncTextArea() {
          if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService) return;
          const D = this.buffer.ybase + this.buffer.y, I = this.buffer.lines.get(D);
          if (!I) return;
          const U = Math.min(this.buffer.x, this.cols - 1), W = this._renderService.dimensions.css.cell.height, J = I.getWidth(U), K = this._renderService.dimensions.css.cell.width * J, re = this.buffer.y * this._renderService.dimensions.css.cell.height, ve = U * this._renderService.dimensions.css.cell.width;
          this.textarea.style.left = ve + "px", this.textarea.style.top = re + "px", this.textarea.style.width = K + "px", this.textarea.style.height = W + "px", this.textarea.style.lineHeight = W + "px", this.textarea.style.zIndex = "-5";
        }
        _initGlobal() {
          this._bindKeys(), this.register((0, u.addDisposableDomListener)(this.element, "copy", (I) => {
            this.hasSelection() && (0, c.copyHandler)(I, this._selectionService);
          }));
          const D = (I) => (0, c.handlePasteEvent)(I, this.textarea, this.coreService, this.optionsService);
          this.register((0, u.addDisposableDomListener)(this.textarea, "paste", D)), this.register((0, u.addDisposableDomListener)(this.element, "paste", D)), $.isFirefox ? this.register((0, u.addDisposableDomListener)(this.element, "mousedown", (I) => {
            I.button === 2 && (0, c.rightClickHandler)(I, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
          })) : this.register((0, u.addDisposableDomListener)(this.element, "contextmenu", (I) => {
            (0, c.rightClickHandler)(I, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
          })), $.isLinux && this.register((0, u.addDisposableDomListener)(this.element, "auxclick", (I) => {
            I.button === 1 && (0, c.moveTextAreaUnderMouseCursor)(I, this.textarea, this.screenElement);
          }));
        }
        _bindKeys() {
          this.register((0, u.addDisposableDomListener)(this.textarea, "keyup", (D) => this._keyUp(D), !0)), this.register((0, u.addDisposableDomListener)(this.textarea, "keydown", (D) => this._keyDown(D), !0)), this.register((0, u.addDisposableDomListener)(this.textarea, "keypress", (D) => this._keyPress(D), !0)), this.register((0, u.addDisposableDomListener)(this.textarea, "compositionstart", () => this._compositionHelper.compositionstart())), this.register((0, u.addDisposableDomListener)(this.textarea, "compositionupdate", (D) => this._compositionHelper.compositionupdate(D))), this.register((0, u.addDisposableDomListener)(this.textarea, "compositionend", () => this._compositionHelper.compositionend())), this.register((0, u.addDisposableDomListener)(this.textarea, "input", (D) => this._inputEvent(D), !0)), this.register(this.onRender(() => this._compositionHelper.updateCompositionElements()));
        }
        open(D) {
          var I;
          if (!D) throw new Error("Terminal requires a parent element.");
          D.isConnected || this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"), this._document = D.ownerDocument, this.element = this._document.createElement("div"), this.element.dir = "ltr", this.element.classList.add("terminal"), this.element.classList.add("xterm"), D.appendChild(this.element);
          const U = X.createDocumentFragment();
          this._viewportElement = X.createElement("div"), this._viewportElement.classList.add("xterm-viewport"), U.appendChild(this._viewportElement), this._viewportScrollArea = X.createElement("div"), this._viewportScrollArea.classList.add("xterm-scroll-area"), this._viewportElement.appendChild(this._viewportScrollArea), this.screenElement = X.createElement("div"), this.screenElement.classList.add("xterm-screen"), this._helperContainer = X.createElement("div"), this._helperContainer.classList.add("xterm-helpers"), this.screenElement.appendChild(this._helperContainer), U.appendChild(this.screenElement), this.textarea = X.createElement("textarea"), this.textarea.classList.add("xterm-helper-textarea"), this.textarea.setAttribute("aria-label", f.promptLabel), $.isChromeOS || this.textarea.setAttribute("aria-multiline", "false"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.tabIndex = 0, this._coreBrowserService = this._instantiationService.createInstance(S.CoreBrowserService, this.textarea, (I = this._document.defaultView) !== null && I !== void 0 ? I : window), this._instantiationService.setService(C.ICoreBrowserService, this._coreBrowserService), this.register((0, u.addDisposableDomListener)(this.textarea, "focus", (W) => this._handleTextAreaFocus(W))), this.register((0, u.addDisposableDomListener)(this.textarea, "blur", () => this._handleTextAreaBlur())), this._helperContainer.appendChild(this.textarea), this._charSizeService = this._instantiationService.createInstance(_.CharSizeService, this._document, this._helperContainer), this._instantiationService.setService(C.ICharSizeService, this._charSizeService), this._themeService = this._instantiationService.createInstance(A.ThemeService), this._instantiationService.setService(C.IThemeService, this._themeService), this._characterJoinerService = this._instantiationService.createInstance(b.CharacterJoinerService), this._instantiationService.setService(C.ICharacterJoinerService, this._characterJoinerService), this._renderService = this.register(this._instantiationService.createInstance(k.RenderService, this.rows, this.screenElement)), this._instantiationService.setService(C.IRenderService, this._renderService), this.register(this._renderService.onRenderedViewportChange((W) => this._onRender.fire(W))), this.onResize((W) => this._renderService.resize(W.cols, W.rows)), this._compositionView = X.createElement("div"), this._compositionView.classList.add("composition-view"), this._compositionHelper = this._instantiationService.createInstance(p.CompositionHelper, this.textarea, this._compositionView), this._helperContainer.appendChild(this._compositionView), this.element.appendChild(U);
          try {
            this._onWillOpen.fire(this.element);
          } catch {
          }
          this._renderService.hasRenderer() || this._renderService.setRenderer(this._createRenderer()), this._mouseService = this._instantiationService.createInstance(w.MouseService), this._instantiationService.setService(C.IMouseService, this._mouseService), this.viewport = this._instantiationService.createInstance(y.Viewport, this._viewportElement, this._viewportScrollArea), this.viewport.onRequestScrollLines((W) => this.scrollLines(W.amount, W.suppressScrollEvent, 1)), this.register(this._inputHandler.onRequestSyncScrollBar(() => this.viewport.syncScrollArea())), this.register(this.viewport), this.register(this.onCursorMove(() => {
            this._renderService.handleCursorMove(), this._syncTextArea();
          })), this.register(this.onResize(() => this._renderService.handleResize(this.cols, this.rows))), this.register(this.onBlur(() => this._renderService.handleBlur())), this.register(this.onFocus(() => this._renderService.handleFocus())), this.register(this._renderService.onDimensionsChange(() => this.viewport.syncScrollArea())), this._selectionService = this.register(this._instantiationService.createInstance(x.SelectionService, this.element, this.screenElement, this.linkifier2)), this._instantiationService.setService(C.ISelectionService, this._selectionService), this.register(this._selectionService.onRequestScrollLines((W) => this.scrollLines(W.amount, W.suppressScrollEvent))), this.register(this._selectionService.onSelectionChange(() => this._onSelectionChange.fire())), this.register(this._selectionService.onRequestRedraw((W) => this._renderService.handleSelectionChanged(W.start, W.end, W.columnSelectMode))), this.register(this._selectionService.onLinuxMouseSelection((W) => {
            this.textarea.value = W, this.textarea.focus(), this.textarea.select();
          })), this.register(this._onScroll.event((W) => {
            this.viewport.syncScrollArea(), this._selectionService.refresh();
          })), this.register((0, u.addDisposableDomListener)(this._viewportElement, "scroll", () => this._selectionService.refresh())), this.linkifier2.attachToDom(this.screenElement, this._mouseService, this._renderService), this.register(this._instantiationService.createInstance(v.BufferDecorationRenderer, this.screenElement)), this.register((0, u.addDisposableDomListener)(this.element, "mousedown", (W) => this._selectionService.handleMouseDown(W))), this.coreMouseService.areMouseEventsActive ? (this._selectionService.disable(), this.element.classList.add("enable-mouse-events")) : this._selectionService.enable(), this.options.screenReaderMode && (this._accessibilityManager.value = this._instantiationService.createInstance(q.AccessibilityManager, this)), this.register(this.optionsService.onSpecificOptionChange("screenReaderMode", (W) => this._handleScreenReaderModeOptionChange(W))), this.options.overviewRulerWidth && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(h.OverviewRulerRenderer, this._viewportElement, this.screenElement))), this.optionsService.onSpecificOptionChange("overviewRulerWidth", (W) => {
            !this._overviewRulerRenderer && W && this._viewportElement && this.screenElement && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(h.OverviewRulerRenderer, this._viewportElement, this.screenElement)));
          }), this._charSizeService.measure(), this.refresh(0, this.rows - 1), this._initGlobal(), this.bindMouse();
        }
        _createRenderer() {
          return this._instantiationService.createInstance(g.DomRenderer, this.element, this.screenElement, this._viewportElement, this.linkifier2);
        }
        bindMouse() {
          const D = this, I = this.element;
          function U(K) {
            const re = D._mouseService.getMouseReportCoords(K, D.screenElement);
            if (!re) return !1;
            let ve, Ce;
            switch (K.overrideType || K.type) {
              case "mousemove":
                Ce = 32, K.buttons === void 0 ? (ve = 3, K.button !== void 0 && (ve = K.button < 3 ? K.button : 3)) : ve = 1 & K.buttons ? 0 : 4 & K.buttons ? 1 : 2 & K.buttons ? 2 : 3;
                break;
              case "mouseup":
                Ce = 0, ve = K.button < 3 ? K.button : 3;
                break;
              case "mousedown":
                Ce = 1, ve = K.button < 3 ? K.button : 3;
                break;
              case "wheel":
                if (D.viewport.getLinesScrolled(K) === 0) return !1;
                Ce = K.deltaY < 0 ? 0 : 1, ve = 4;
                break;
              default:
                return !1;
            }
            return !(Ce === void 0 || ve === void 0 || ve > 4) && D.coreMouseService.triggerMouseEvent({ col: re.col, row: re.row, x: re.x, y: re.y, button: ve, action: Ce, ctrl: K.ctrlKey, alt: K.altKey, shift: K.shiftKey });
          }
          const W = { mouseup: null, wheel: null, mousedrag: null, mousemove: null }, J = { mouseup: (K) => (U(K), K.buttons || (this._document.removeEventListener("mouseup", W.mouseup), W.mousedrag && this._document.removeEventListener("mousemove", W.mousedrag)), this.cancel(K)), wheel: (K) => (U(K), this.cancel(K, !0)), mousedrag: (K) => {
            K.buttons && U(K);
          }, mousemove: (K) => {
            K.buttons || U(K);
          } };
          this.register(this.coreMouseService.onProtocolChange((K) => {
            K ? (this.optionsService.rawOptions.logLevel === "debug" && this._logService.debug("Binding to mouse events:", this.coreMouseService.explainEvents(K)), this.element.classList.add("enable-mouse-events"), this._selectionService.disable()) : (this._logService.debug("Unbinding from mouse events."), this.element.classList.remove("enable-mouse-events"), this._selectionService.enable()), 8 & K ? W.mousemove || (I.addEventListener("mousemove", J.mousemove), W.mousemove = J.mousemove) : (I.removeEventListener("mousemove", W.mousemove), W.mousemove = null), 16 & K ? W.wheel || (I.addEventListener("wheel", J.wheel, { passive: !1 }), W.wheel = J.wheel) : (I.removeEventListener("wheel", W.wheel), W.wheel = null), 2 & K ? W.mouseup || (I.addEventListener("mouseup", J.mouseup), W.mouseup = J.mouseup) : (this._document.removeEventListener("mouseup", W.mouseup), I.removeEventListener("mouseup", W.mouseup), W.mouseup = null), 4 & K ? W.mousedrag || (W.mousedrag = J.mousedrag) : (this._document.removeEventListener("mousemove", W.mousedrag), W.mousedrag = null);
          })), this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol, this.register((0, u.addDisposableDomListener)(I, "mousedown", (K) => {
            if (K.preventDefault(), this.focus(), this.coreMouseService.areMouseEventsActive && !this._selectionService.shouldForceSelection(K)) return U(K), W.mouseup && this._document.addEventListener("mouseup", W.mouseup), W.mousedrag && this._document.addEventListener("mousemove", W.mousedrag), this.cancel(K);
          })), this.register((0, u.addDisposableDomListener)(I, "wheel", (K) => {
            if (!W.wheel) {
              if (!this.buffer.hasScrollback) {
                const re = this.viewport.getLinesScrolled(K);
                if (re === 0) return;
                const ve = z.C0.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? "O" : "[") + (K.deltaY < 0 ? "A" : "B");
                let Ce = "";
                for (let Lt = 0; Lt < Math.abs(re); Lt++) Ce += ve;
                return this.coreService.triggerDataEvent(Ce, !0), this.cancel(K, !0);
              }
              return this.viewport.handleWheel(K) ? this.cancel(K) : void 0;
            }
          }, { passive: !1 })), this.register((0, u.addDisposableDomListener)(I, "touchstart", (K) => {
            if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchStart(K), this.cancel(K);
          }, { passive: !0 })), this.register((0, u.addDisposableDomListener)(I, "touchmove", (K) => {
            if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchMove(K) ? void 0 : this.cancel(K);
          }, { passive: !1 }));
        }
        refresh(D, I) {
          var U;
          (U = this._renderService) === null || U === void 0 || U.refreshRows(D, I);
        }
        updateCursorStyle(D) {
          var I;
          !((I = this._selectionService) === null || I === void 0) && I.shouldColumnSelect(D) ? this.element.classList.add("column-select") : this.element.classList.remove("column-select");
        }
        _showCursor() {
          this.coreService.isCursorInitialized || (this.coreService.isCursorInitialized = !0, this.refresh(this.buffer.y, this.buffer.y));
        }
        scrollLines(D, I, U = 0) {
          var W;
          U === 1 ? (super.scrollLines(D, I, U), this.refresh(0, this.rows - 1)) : (W = this.viewport) === null || W === void 0 || W.scrollLines(D);
        }
        paste(D) {
          (0, c.paste)(D, this.textarea, this.coreService, this.optionsService);
        }
        attachCustomKeyEventHandler(D) {
          this._customKeyEventHandler = D;
        }
        registerLinkProvider(D) {
          return this.linkifier2.registerLinkProvider(D);
        }
        registerCharacterJoiner(D) {
          if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
          const I = this._characterJoinerService.register(D);
          return this.refresh(0, this.rows - 1), I;
        }
        deregisterCharacterJoiner(D) {
          if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
          this._characterJoinerService.deregister(D) && this.refresh(0, this.rows - 1);
        }
        get markers() {
          return this.buffer.markers;
        }
        registerMarker(D) {
          return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + D);
        }
        registerDecoration(D) {
          return this._decorationService.registerDecoration(D);
        }
        hasSelection() {
          return !!this._selectionService && this._selectionService.hasSelection;
        }
        select(D, I, U) {
          this._selectionService.setSelection(D, I, U);
        }
        getSelection() {
          return this._selectionService ? this._selectionService.selectionText : "";
        }
        getSelectionPosition() {
          if (this._selectionService && this._selectionService.hasSelection) return { start: { x: this._selectionService.selectionStart[0], y: this._selectionService.selectionStart[1] }, end: { x: this._selectionService.selectionEnd[0], y: this._selectionService.selectionEnd[1] } };
        }
        clearSelection() {
          var D;
          (D = this._selectionService) === null || D === void 0 || D.clearSelection();
        }
        selectAll() {
          var D;
          (D = this._selectionService) === null || D === void 0 || D.selectAll();
        }
        selectLines(D, I) {
          var U;
          (U = this._selectionService) === null || U === void 0 || U.selectLines(D, I);
        }
        _keyDown(D) {
          if (this._keyDownHandled = !1, this._keyDownSeen = !0, this._customKeyEventHandler && this._customKeyEventHandler(D) === !1) return !1;
          const I = this.browser.isMac && this.options.macOptionIsMeta && D.altKey;
          if (!I && !this._compositionHelper.keydown(D)) return this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp && this.scrollToBottom(), !1;
          I || D.key !== "Dead" && D.key !== "AltGraph" || (this._unprocessedDeadKey = !0);
          const U = (0, E.evaluateKeyboardEvent)(D, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
          if (this.updateCursorStyle(D), U.type === 3 || U.type === 2) {
            const W = this.rows - 1;
            return this.scrollLines(U.type === 2 ? -W : W), this.cancel(D, !0);
          }
          return U.type === 1 && this.selectAll(), !!this._isThirdLevelShift(this.browser, D) || (U.cancel && this.cancel(D, !0), !U.key || !!(D.key && !D.ctrlKey && !D.altKey && !D.metaKey && D.key.length === 1 && D.key.charCodeAt(0) >= 65 && D.key.charCodeAt(0) <= 90) || (this._unprocessedDeadKey ? (this._unprocessedDeadKey = !1, !0) : (U.key !== z.C0.ETX && U.key !== z.C0.CR || (this.textarea.value = ""), this._onKey.fire({ key: U.key, domEvent: D }), this._showCursor(), this.coreService.triggerDataEvent(U.key, !0), !this.optionsService.rawOptions.screenReaderMode || D.altKey || D.ctrlKey ? this.cancel(D, !0) : void (this._keyDownHandled = !0))));
        }
        _isThirdLevelShift(D, I) {
          const U = D.isMac && !this.options.macOptionIsMeta && I.altKey && !I.ctrlKey && !I.metaKey || D.isWindows && I.altKey && I.ctrlKey && !I.metaKey || D.isWindows && I.getModifierState("AltGraph");
          return I.type === "keypress" ? U : U && (!I.keyCode || I.keyCode > 47);
        }
        _keyUp(D) {
          this._keyDownSeen = !1, this._customKeyEventHandler && this._customKeyEventHandler(D) === !1 || (function(I) {
            return I.keyCode === 16 || I.keyCode === 17 || I.keyCode === 18;
          }(D) || this.focus(), this.updateCursorStyle(D), this._keyPressHandled = !1);
        }
        _keyPress(D) {
          let I;
          if (this._keyPressHandled = !1, this._keyDownHandled || this._customKeyEventHandler && this._customKeyEventHandler(D) === !1) return !1;
          if (this.cancel(D), D.charCode) I = D.charCode;
          else if (D.which === null || D.which === void 0) I = D.keyCode;
          else {
            if (D.which === 0 || D.charCode === 0) return !1;
            I = D.which;
          }
          return !(!I || (D.altKey || D.ctrlKey || D.metaKey) && !this._isThirdLevelShift(this.browser, D) || (I = String.fromCharCode(I), this._onKey.fire({ key: I, domEvent: D }), this._showCursor(), this.coreService.triggerDataEvent(I, !0), this._keyPressHandled = !0, this._unprocessedDeadKey = !1, 0));
        }
        _inputEvent(D) {
          if (D.data && D.inputType === "insertText" && (!D.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
            if (this._keyPressHandled) return !1;
            this._unprocessedDeadKey = !1;
            const I = D.data;
            return this.coreService.triggerDataEvent(I, !0), this.cancel(D), !0;
          }
          return !1;
        }
        resize(D, I) {
          D !== this.cols || I !== this.rows ? super.resize(D, I) : this._charSizeService && !this._charSizeService.hasValidSize && this._charSizeService.measure();
        }
        _afterResize(D, I) {
          var U, W;
          (U = this._charSizeService) === null || U === void 0 || U.measure(), (W = this.viewport) === null || W === void 0 || W.syncScrollArea(!0);
        }
        clear() {
          var D;
          if (this.buffer.ybase !== 0 || this.buffer.y !== 0) {
            this.buffer.clearAllMarkers(), this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)), this.buffer.lines.length = 1, this.buffer.ydisp = 0, this.buffer.ybase = 0, this.buffer.y = 0;
            for (let I = 1; I < this.rows; I++) this.buffer.lines.push(this.buffer.getBlankLine(H.DEFAULT_ATTR_DATA));
            this._onScroll.fire({ position: this.buffer.ydisp, source: 0 }), (D = this.viewport) === null || D === void 0 || D.reset(), this.refresh(0, this.rows - 1);
          }
        }
        reset() {
          var D, I;
          this.options.rows = this.rows, this.options.cols = this.cols;
          const U = this._customKeyEventHandler;
          this._setup(), super.reset(), (D = this._selectionService) === null || D === void 0 || D.reset(), this._decorationService.reset(), (I = this.viewport) === null || I === void 0 || I.reset(), this._customKeyEventHandler = U, this.refresh(0, this.rows - 1);
        }
        clearTextureAtlas() {
          var D;
          (D = this._renderService) === null || D === void 0 || D.clearTextureAtlas();
        }
        _reportFocus() {
          var D;
          !((D = this.element) === null || D === void 0) && D.classList.contains("focus") ? this.coreService.triggerDataEvent(z.C0.ESC + "[I") : this.coreService.triggerDataEvent(z.C0.ESC + "[O");
        }
        _reportWindowsOptions(D) {
          if (this._renderService) switch (D) {
            case j.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
              const I = this._renderService.dimensions.css.canvas.width.toFixed(0), U = this._renderService.dimensions.css.canvas.height.toFixed(0);
              this.coreService.triggerDataEvent(`${z.C0.ESC}[4;${U};${I}t`);
              break;
            case j.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
              const W = this._renderService.dimensions.css.cell.width.toFixed(0), J = this._renderService.dimensions.css.cell.height.toFixed(0);
              this.coreService.triggerDataEvent(`${z.C0.ESC}[6;${J};${W}t`);
          }
        }
        cancel(D, I) {
          if (this.options.cancelEvents || I) return D.preventDefault(), D.stopPropagation(), !1;
        }
      }
      n.Terminal = Y;
    }, 9924: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.TimeBasedDebouncer = void 0, n.TimeBasedDebouncer = class {
        constructor(a, c = 1e3) {
          this._renderCallback = a, this._debounceThresholdMS = c, this._lastRefreshMs = 0, this._additionalRefreshRequested = !1;
        }
        dispose() {
          this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
        }
        refresh(a, c, u) {
          this._rowCount = u, a = a !== void 0 ? a : 0, c = c !== void 0 ? c : this._rowCount - 1, this._rowStart = this._rowStart !== void 0 ? Math.min(this._rowStart, a) : a, this._rowEnd = this._rowEnd !== void 0 ? Math.max(this._rowEnd, c) : c;
          const d = Date.now();
          if (d - this._lastRefreshMs >= this._debounceThresholdMS) this._lastRefreshMs = d, this._innerRefresh();
          else if (!this._additionalRefreshRequested) {
            const f = d - this._lastRefreshMs, m = this._debounceThresholdMS - f;
            this._additionalRefreshRequested = !0, this._refreshTimeoutID = window.setTimeout(() => {
              this._lastRefreshMs = Date.now(), this._innerRefresh(), this._additionalRefreshRequested = !1, this._refreshTimeoutID = void 0;
            }, m);
          }
        }
        _innerRefresh() {
          if (this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0) return;
          const a = Math.max(this._rowStart, 0), c = Math.min(this._rowEnd, this._rowCount - 1);
          this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(a, c);
        }
      };
    }, 1680: function(l, n, a) {
      var c = this && this.__decorate || function(p, g, _, b) {
        var S, w = arguments.length, k = w < 3 ? g : b === null ? b = Object.getOwnPropertyDescriptor(g, _) : b;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") k = Reflect.decorate(p, g, _, b);
        else for (var x = p.length - 1; x >= 0; x--) (S = p[x]) && (k = (w < 3 ? S(k) : w > 3 ? S(g, _, k) : S(g, _)) || k);
        return w > 3 && k && Object.defineProperty(g, _, k), k;
      }, u = this && this.__param || function(p, g) {
        return function(_, b) {
          g(_, b, p);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Viewport = void 0;
      const d = a(3656), f = a(4725), m = a(8460), y = a(844), v = a(2585);
      let h = n.Viewport = class extends y.Disposable {
        constructor(p, g, _, b, S, w, k, x) {
          super(), this._viewportElement = p, this._scrollArea = g, this._bufferService = _, this._optionsService = b, this._charSizeService = S, this._renderService = w, this._coreBrowserService = k, this.scrollBarWidth = 0, this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._wheelPartialScroll = 0, this._refreshAnimationFrame = null, this._ignoreNextScrollEvent = !1, this._smoothScrollState = { startTime: 0, origin: -1, target: -1 }, this._onRequestScrollLines = this.register(new m.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this.scrollBarWidth = this._viewportElement.offsetWidth - this._scrollArea.offsetWidth || 15, this.register((0, d.addDisposableDomListener)(this._viewportElement, "scroll", this._handleScroll.bind(this))), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((C) => this._activeBuffer = C.activeBuffer)), this._renderDimensions = this._renderService.dimensions, this.register(this._renderService.onDimensionsChange((C) => this._renderDimensions = C)), this._handleThemeChange(x.colors), this.register(x.onChangeColors((C) => this._handleThemeChange(C))), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.syncScrollArea())), setTimeout(() => this.syncScrollArea());
        }
        _handleThemeChange(p) {
          this._viewportElement.style.backgroundColor = p.background.css;
        }
        reset() {
          this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._coreBrowserService.window.requestAnimationFrame(() => this.syncScrollArea());
        }
        _refresh(p) {
          if (p) return this._innerRefresh(), void (this._refreshAnimationFrame !== null && this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame));
          this._refreshAnimationFrame === null && (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
        }
        _innerRefresh() {
          if (this._charSizeService.height > 0) {
            this._currentRowHeight = this._renderService.dimensions.device.cell.height / this._coreBrowserService.dpr, this._currentDeviceCellHeight = this._renderService.dimensions.device.cell.height, this._lastRecordedViewportHeight = this._viewportElement.offsetHeight;
            const g = Math.round(this._currentRowHeight * this._lastRecordedBufferLength) + (this._lastRecordedViewportHeight - this._renderService.dimensions.css.canvas.height);
            this._lastRecordedBufferHeight !== g && (this._lastRecordedBufferHeight = g, this._scrollArea.style.height = this._lastRecordedBufferHeight + "px");
          }
          const p = this._bufferService.buffer.ydisp * this._currentRowHeight;
          this._viewportElement.scrollTop !== p && (this._ignoreNextScrollEvent = !0, this._viewportElement.scrollTop = p), this._refreshAnimationFrame = null;
        }
        syncScrollArea(p = !1) {
          if (this._lastRecordedBufferLength !== this._bufferService.buffer.lines.length) return this._lastRecordedBufferLength = this._bufferService.buffer.lines.length, void this._refresh(p);
          this._lastRecordedViewportHeight === this._renderService.dimensions.css.canvas.height && this._lastScrollTop === this._activeBuffer.ydisp * this._currentRowHeight && this._renderDimensions.device.cell.height === this._currentDeviceCellHeight || this._refresh(p);
        }
        _handleScroll(p) {
          if (this._lastScrollTop = this._viewportElement.scrollTop, !this._viewportElement.offsetParent) return;
          if (this._ignoreNextScrollEvent) return this._ignoreNextScrollEvent = !1, void this._onRequestScrollLines.fire({ amount: 0, suppressScrollEvent: !0 });
          const g = Math.round(this._lastScrollTop / this._currentRowHeight) - this._bufferService.buffer.ydisp;
          this._onRequestScrollLines.fire({ amount: g, suppressScrollEvent: !0 });
        }
        _smoothScroll() {
          if (this._isDisposed || this._smoothScrollState.origin === -1 || this._smoothScrollState.target === -1) return;
          const p = this._smoothScrollPercent();
          this._viewportElement.scrollTop = this._smoothScrollState.origin + Math.round(p * (this._smoothScrollState.target - this._smoothScrollState.origin)), p < 1 ? this._coreBrowserService.window.requestAnimationFrame(() => this._smoothScroll()) : this._clearSmoothScrollState();
        }
        _smoothScrollPercent() {
          return this._optionsService.rawOptions.smoothScrollDuration && this._smoothScrollState.startTime ? Math.max(Math.min((Date.now() - this._smoothScrollState.startTime) / this._optionsService.rawOptions.smoothScrollDuration, 1), 0) : 1;
        }
        _clearSmoothScrollState() {
          this._smoothScrollState.startTime = 0, this._smoothScrollState.origin = -1, this._smoothScrollState.target = -1;
        }
        _bubbleScroll(p, g) {
          const _ = this._viewportElement.scrollTop + this._lastRecordedViewportHeight;
          return !(g < 0 && this._viewportElement.scrollTop !== 0 || g > 0 && _ < this._lastRecordedBufferHeight) || (p.cancelable && p.preventDefault(), !1);
        }
        handleWheel(p) {
          const g = this._getPixelsScrolled(p);
          return g !== 0 && (this._optionsService.rawOptions.smoothScrollDuration ? (this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target === -1 ? this._smoothScrollState.target = this._viewportElement.scrollTop + g : this._smoothScrollState.target += g, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState()) : this._viewportElement.scrollTop += g, this._bubbleScroll(p, g));
        }
        scrollLines(p) {
          if (p !== 0) if (this._optionsService.rawOptions.smoothScrollDuration) {
            const g = p * this._currentRowHeight;
            this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target = this._smoothScrollState.origin + g, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState();
          } else this._onRequestScrollLines.fire({ amount: p, suppressScrollEvent: !1 });
        }
        _getPixelsScrolled(p) {
          if (p.deltaY === 0 || p.shiftKey) return 0;
          let g = this._applyScrollModifier(p.deltaY, p);
          return p.deltaMode === WheelEvent.DOM_DELTA_LINE ? g *= this._currentRowHeight : p.deltaMode === WheelEvent.DOM_DELTA_PAGE && (g *= this._currentRowHeight * this._bufferService.rows), g;
        }
        getBufferElements(p, g) {
          var _;
          let b, S = "";
          const w = [], k = g ?? this._bufferService.buffer.lines.length, x = this._bufferService.buffer.lines;
          for (let C = p; C < k; C++) {
            const A = x.get(C);
            if (!A) continue;
            const L = (_ = x.get(C + 1)) === null || _ === void 0 ? void 0 : _.isWrapped;
            if (S += A.translateToString(!L), !L || C === x.length - 1) {
              const M = document.createElement("div");
              M.textContent = S, w.push(M), S.length > 0 && (b = M), S = "";
            }
          }
          return { bufferElements: w, cursorElement: b };
        }
        getLinesScrolled(p) {
          if (p.deltaY === 0 || p.shiftKey) return 0;
          let g = this._applyScrollModifier(p.deltaY, p);
          return p.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? (g /= this._currentRowHeight + 0, this._wheelPartialScroll += g, g = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1), this._wheelPartialScroll %= 1) : p.deltaMode === WheelEvent.DOM_DELTA_PAGE && (g *= this._bufferService.rows), g;
        }
        _applyScrollModifier(p, g) {
          const _ = this._optionsService.rawOptions.fastScrollModifier;
          return _ === "alt" && g.altKey || _ === "ctrl" && g.ctrlKey || _ === "shift" && g.shiftKey ? p * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity : p * this._optionsService.rawOptions.scrollSensitivity;
        }
        handleTouchStart(p) {
          this._lastTouchY = p.touches[0].pageY;
        }
        handleTouchMove(p) {
          const g = this._lastTouchY - p.touches[0].pageY;
          return this._lastTouchY = p.touches[0].pageY, g !== 0 && (this._viewportElement.scrollTop += g, this._bubbleScroll(p, g));
        }
      };
      n.Viewport = h = c([u(2, v.IBufferService), u(3, v.IOptionsService), u(4, f.ICharSizeService), u(5, f.IRenderService), u(6, f.ICoreBrowserService), u(7, f.IThemeService)], h);
    }, 3107: function(l, n, a) {
      var c = this && this.__decorate || function(h, p, g, _) {
        var b, S = arguments.length, w = S < 3 ? p : _ === null ? _ = Object.getOwnPropertyDescriptor(p, g) : _;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") w = Reflect.decorate(h, p, g, _);
        else for (var k = h.length - 1; k >= 0; k--) (b = h[k]) && (w = (S < 3 ? b(w) : S > 3 ? b(p, g, w) : b(p, g)) || w);
        return S > 3 && w && Object.defineProperty(p, g, w), w;
      }, u = this && this.__param || function(h, p) {
        return function(g, _) {
          p(g, _, h);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferDecorationRenderer = void 0;
      const d = a(3656), f = a(4725), m = a(844), y = a(2585);
      let v = n.BufferDecorationRenderer = class extends m.Disposable {
        constructor(h, p, g, _) {
          super(), this._screenElement = h, this._bufferService = p, this._decorationService = g, this._renderService = _, this._decorationElements = /* @__PURE__ */ new Map(), this._altBufferIsActive = !1, this._dimensionsChanged = !1, this._container = document.createElement("div"), this._container.classList.add("xterm-decoration-container"), this._screenElement.appendChild(this._container), this.register(this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations())), this.register(this._renderService.onDimensionsChange(() => {
            this._dimensionsChanged = !0, this._queueRefresh();
          })), this.register((0, d.addDisposableDomListener)(window, "resize", () => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
          })), this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh())), this.register(this._decorationService.onDecorationRemoved((b) => this._removeDecoration(b))), this.register((0, m.toDisposable)(() => {
            this._container.remove(), this._decorationElements.clear();
          }));
        }
        _queueRefresh() {
          this._animationFrame === void 0 && (this._animationFrame = this._renderService.addRefreshCallback(() => {
            this._doRefreshDecorations(), this._animationFrame = void 0;
          }));
        }
        _doRefreshDecorations() {
          for (const h of this._decorationService.decorations) this._renderDecoration(h);
          this._dimensionsChanged = !1;
        }
        _renderDecoration(h) {
          this._refreshStyle(h), this._dimensionsChanged && this._refreshXPosition(h);
        }
        _createElement(h) {
          var p, g;
          const _ = document.createElement("div");
          _.classList.add("xterm-decoration"), _.classList.toggle("xterm-decoration-top-layer", ((p = h == null ? void 0 : h.options) === null || p === void 0 ? void 0 : p.layer) === "top"), _.style.width = `${Math.round((h.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, _.style.height = (h.options.height || 1) * this._renderService.dimensions.css.cell.height + "px", _.style.top = (h.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height + "px", _.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
          const b = (g = h.options.x) !== null && g !== void 0 ? g : 0;
          return b && b > this._bufferService.cols && (_.style.display = "none"), this._refreshXPosition(h, _), _;
        }
        _refreshStyle(h) {
          const p = h.marker.line - this._bufferService.buffers.active.ydisp;
          if (p < 0 || p >= this._bufferService.rows) h.element && (h.element.style.display = "none", h.onRenderEmitter.fire(h.element));
          else {
            let g = this._decorationElements.get(h);
            g || (g = this._createElement(h), h.element = g, this._decorationElements.set(h, g), this._container.appendChild(g), h.onDispose(() => {
              this._decorationElements.delete(h), g.remove();
            })), g.style.top = p * this._renderService.dimensions.css.cell.height + "px", g.style.display = this._altBufferIsActive ? "none" : "block", h.onRenderEmitter.fire(g);
          }
        }
        _refreshXPosition(h, p = h.element) {
          var g;
          if (!p) return;
          const _ = (g = h.options.x) !== null && g !== void 0 ? g : 0;
          (h.options.anchor || "left") === "right" ? p.style.right = _ ? _ * this._renderService.dimensions.css.cell.width + "px" : "" : p.style.left = _ ? _ * this._renderService.dimensions.css.cell.width + "px" : "";
        }
        _removeDecoration(h) {
          var p;
          (p = this._decorationElements.get(h)) === null || p === void 0 || p.remove(), this._decorationElements.delete(h), h.dispose();
        }
      };
      n.BufferDecorationRenderer = v = c([u(1, y.IBufferService), u(2, y.IDecorationService), u(3, f.IRenderService)], v);
    }, 5871: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ColorZoneStore = void 0, n.ColorZoneStore = class {
        constructor() {
          this._zones = [], this._zonePool = [], this._zonePoolIndex = 0, this._linePadding = { full: 0, left: 0, center: 0, right: 0 };
        }
        get zones() {
          return this._zonePool.length = Math.min(this._zonePool.length, this._zones.length), this._zones;
        }
        clear() {
          this._zones.length = 0, this._zonePoolIndex = 0;
        }
        addDecoration(a) {
          if (a.options.overviewRulerOptions) {
            for (const c of this._zones) if (c.color === a.options.overviewRulerOptions.color && c.position === a.options.overviewRulerOptions.position) {
              if (this._lineIntersectsZone(c, a.marker.line)) return;
              if (this._lineAdjacentToZone(c, a.marker.line, a.options.overviewRulerOptions.position)) return void this._addLineToZone(c, a.marker.line);
            }
            if (this._zonePoolIndex < this._zonePool.length) return this._zonePool[this._zonePoolIndex].color = a.options.overviewRulerOptions.color, this._zonePool[this._zonePoolIndex].position = a.options.overviewRulerOptions.position, this._zonePool[this._zonePoolIndex].startBufferLine = a.marker.line, this._zonePool[this._zonePoolIndex].endBufferLine = a.marker.line, void this._zones.push(this._zonePool[this._zonePoolIndex++]);
            this._zones.push({ color: a.options.overviewRulerOptions.color, position: a.options.overviewRulerOptions.position, startBufferLine: a.marker.line, endBufferLine: a.marker.line }), this._zonePool.push(this._zones[this._zones.length - 1]), this._zonePoolIndex++;
          }
        }
        setPadding(a) {
          this._linePadding = a;
        }
        _lineIntersectsZone(a, c) {
          return c >= a.startBufferLine && c <= a.endBufferLine;
        }
        _lineAdjacentToZone(a, c, u) {
          return c >= a.startBufferLine - this._linePadding[u || "full"] && c <= a.endBufferLine + this._linePadding[u || "full"];
        }
        _addLineToZone(a, c) {
          a.startBufferLine = Math.min(a.startBufferLine, c), a.endBufferLine = Math.max(a.endBufferLine, c);
        }
      };
    }, 5744: function(l, n, a) {
      var c = this && this.__decorate || function(b, S, w, k) {
        var x, C = arguments.length, A = C < 3 ? S : k === null ? k = Object.getOwnPropertyDescriptor(S, w) : k;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") A = Reflect.decorate(b, S, w, k);
        else for (var L = b.length - 1; L >= 0; L--) (x = b[L]) && (A = (C < 3 ? x(A) : C > 3 ? x(S, w, A) : x(S, w)) || A);
        return C > 3 && A && Object.defineProperty(S, w, A), A;
      }, u = this && this.__param || function(b, S) {
        return function(w, k) {
          S(w, k, b);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.OverviewRulerRenderer = void 0;
      const d = a(5871), f = a(3656), m = a(4725), y = a(844), v = a(2585), h = { full: 0, left: 0, center: 0, right: 0 }, p = { full: 0, left: 0, center: 0, right: 0 }, g = { full: 0, left: 0, center: 0, right: 0 };
      let _ = n.OverviewRulerRenderer = class extends y.Disposable {
        get _width() {
          return this._optionsService.options.overviewRulerWidth || 0;
        }
        constructor(b, S, w, k, x, C, A) {
          var L;
          super(), this._viewportElement = b, this._screenElement = S, this._bufferService = w, this._decorationService = k, this._renderService = x, this._optionsService = C, this._coreBrowseService = A, this._colorZoneStore = new d.ColorZoneStore(), this._shouldUpdateDimensions = !0, this._shouldUpdateAnchor = !0, this._lastKnownBufferLength = 0, this._canvas = document.createElement("canvas"), this._canvas.classList.add("xterm-decoration-overview-ruler"), this._refreshCanvasDimensions(), (L = this._viewportElement.parentElement) === null || L === void 0 || L.insertBefore(this._canvas, this._viewportElement);
          const M = this._canvas.getContext("2d");
          if (!M) throw new Error("Ctx cannot be null");
          this._ctx = M, this._registerDecorationListeners(), this._registerBufferChangeListeners(), this._registerDimensionChangeListeners(), this.register((0, y.toDisposable)(() => {
            var T;
            (T = this._canvas) === null || T === void 0 || T.remove();
          }));
        }
        _registerDecorationListeners() {
          this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh(void 0, !0))), this.register(this._decorationService.onDecorationRemoved(() => this._queueRefresh(void 0, !0)));
        }
        _registerBufferChangeListeners() {
          this.register(this._renderService.onRenderedViewportChange(() => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? "none" : "block";
          })), this.register(this._bufferService.onScroll(() => {
            this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length && (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
          }));
        }
        _registerDimensionChangeListeners() {
          this.register(this._renderService.onRender(() => {
            this._containerHeight && this._containerHeight === this._screenElement.clientHeight || (this._queueRefresh(!0), this._containerHeight = this._screenElement.clientHeight);
          })), this.register(this._optionsService.onSpecificOptionChange("overviewRulerWidth", () => this._queueRefresh(!0))), this.register((0, f.addDisposableDomListener)(this._coreBrowseService.window, "resize", () => this._queueRefresh(!0))), this._queueRefresh(!0);
        }
        _refreshDrawConstants() {
          const b = Math.floor(this._canvas.width / 3), S = Math.ceil(this._canvas.width / 3);
          p.full = this._canvas.width, p.left = b, p.center = S, p.right = b, this._refreshDrawHeightConstants(), g.full = 0, g.left = 0, g.center = p.left, g.right = p.left + p.center;
        }
        _refreshDrawHeightConstants() {
          h.full = Math.round(2 * this._coreBrowseService.dpr);
          const b = this._canvas.height / this._bufferService.buffer.lines.length, S = Math.round(Math.max(Math.min(b, 12), 6) * this._coreBrowseService.dpr);
          h.left = S, h.center = S, h.right = S;
        }
        _refreshColorZonePadding() {
          this._colorZoneStore.setPadding({ full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * h.full), left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * h.left), center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * h.center), right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * h.right) }), this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
        }
        _refreshCanvasDimensions() {
          this._canvas.style.width = `${this._width}px`, this._canvas.width = Math.round(this._width * this._coreBrowseService.dpr), this._canvas.style.height = `${this._screenElement.clientHeight}px`, this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowseService.dpr), this._refreshDrawConstants(), this._refreshColorZonePadding();
        }
        _refreshDecorations() {
          this._shouldUpdateDimensions && this._refreshCanvasDimensions(), this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height), this._colorZoneStore.clear();
          for (const S of this._decorationService.decorations) this._colorZoneStore.addDecoration(S);
          this._ctx.lineWidth = 1;
          const b = this._colorZoneStore.zones;
          for (const S of b) S.position !== "full" && this._renderColorZone(S);
          for (const S of b) S.position === "full" && this._renderColorZone(S);
          this._shouldUpdateDimensions = !1, this._shouldUpdateAnchor = !1;
        }
        _renderColorZone(b) {
          this._ctx.fillStyle = b.color, this._ctx.fillRect(g[b.position || "full"], Math.round((this._canvas.height - 1) * (b.startBufferLine / this._bufferService.buffers.active.lines.length) - h[b.position || "full"] / 2), p[b.position || "full"], Math.round((this._canvas.height - 1) * ((b.endBufferLine - b.startBufferLine) / this._bufferService.buffers.active.lines.length) + h[b.position || "full"]));
        }
        _queueRefresh(b, S) {
          this._shouldUpdateDimensions = b || this._shouldUpdateDimensions, this._shouldUpdateAnchor = S || this._shouldUpdateAnchor, this._animationFrame === void 0 && (this._animationFrame = this._coreBrowseService.window.requestAnimationFrame(() => {
            this._refreshDecorations(), this._animationFrame = void 0;
          }));
        }
      };
      n.OverviewRulerRenderer = _ = c([u(2, v.IBufferService), u(3, v.IDecorationService), u(4, m.IRenderService), u(5, v.IOptionsService), u(6, m.ICoreBrowserService)], _);
    }, 2950: function(l, n, a) {
      var c = this && this.__decorate || function(v, h, p, g) {
        var _, b = arguments.length, S = b < 3 ? h : g === null ? g = Object.getOwnPropertyDescriptor(h, p) : g;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") S = Reflect.decorate(v, h, p, g);
        else for (var w = v.length - 1; w >= 0; w--) (_ = v[w]) && (S = (b < 3 ? _(S) : b > 3 ? _(h, p, S) : _(h, p)) || S);
        return b > 3 && S && Object.defineProperty(h, p, S), S;
      }, u = this && this.__param || function(v, h) {
        return function(p, g) {
          h(p, g, v);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CompositionHelper = void 0;
      const d = a(4725), f = a(2585), m = a(2584);
      let y = n.CompositionHelper = class {
        get isComposing() {
          return this._isComposing;
        }
        constructor(v, h, p, g, _, b) {
          this._textarea = v, this._compositionView = h, this._bufferService = p, this._optionsService = g, this._coreService = _, this._renderService = b, this._isComposing = !1, this._isSendingComposition = !1, this._compositionPosition = { start: 0, end: 0 }, this._dataAlreadySent = "";
        }
        compositionstart() {
          this._isComposing = !0, this._compositionPosition.start = this._textarea.value.length, this._compositionView.textContent = "", this._dataAlreadySent = "", this._compositionView.classList.add("active");
        }
        compositionupdate(v) {
          this._compositionView.textContent = v.data, this.updateCompositionElements(), setTimeout(() => {
            this._compositionPosition.end = this._textarea.value.length;
          }, 0);
        }
        compositionend() {
          this._finalizeComposition(!0);
        }
        keydown(v) {
          if (this._isComposing || this._isSendingComposition) {
            if (v.keyCode === 229 || v.keyCode === 16 || v.keyCode === 17 || v.keyCode === 18) return !1;
            this._finalizeComposition(!1);
          }
          return v.keyCode !== 229 || (this._handleAnyTextareaChanges(), !1);
        }
        _finalizeComposition(v) {
          if (this._compositionView.classList.remove("active"), this._isComposing = !1, v) {
            const h = { start: this._compositionPosition.start, end: this._compositionPosition.end };
            this._isSendingComposition = !0, setTimeout(() => {
              if (this._isSendingComposition) {
                let p;
                this._isSendingComposition = !1, h.start += this._dataAlreadySent.length, p = this._isComposing ? this._textarea.value.substring(h.start, h.end) : this._textarea.value.substring(h.start), p.length > 0 && this._coreService.triggerDataEvent(p, !0);
              }
            }, 0);
          } else {
            this._isSendingComposition = !1;
            const h = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
            this._coreService.triggerDataEvent(h, !0);
          }
        }
        _handleAnyTextareaChanges() {
          const v = this._textarea.value;
          setTimeout(() => {
            if (!this._isComposing) {
              const h = this._textarea.value, p = h.replace(v, "");
              this._dataAlreadySent = p, h.length > v.length ? this._coreService.triggerDataEvent(p, !0) : h.length < v.length ? this._coreService.triggerDataEvent(`${m.C0.DEL}`, !0) : h.length === v.length && h !== v && this._coreService.triggerDataEvent(h, !0);
            }
          }, 0);
        }
        updateCompositionElements(v) {
          if (this._isComposing) {
            if (this._bufferService.buffer.isCursorInViewport) {
              const h = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1), p = this._renderService.dimensions.css.cell.height, g = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height, _ = h * this._renderService.dimensions.css.cell.width;
              this._compositionView.style.left = _ + "px", this._compositionView.style.top = g + "px", this._compositionView.style.height = p + "px", this._compositionView.style.lineHeight = p + "px", this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + "px";
              const b = this._compositionView.getBoundingClientRect();
              this._textarea.style.left = _ + "px", this._textarea.style.top = g + "px", this._textarea.style.width = Math.max(b.width, 1) + "px", this._textarea.style.height = Math.max(b.height, 1) + "px", this._textarea.style.lineHeight = b.height + "px";
            }
            v || setTimeout(() => this.updateCompositionElements(!0), 0);
          }
        }
      };
      n.CompositionHelper = y = c([u(2, f.IBufferService), u(3, f.IOptionsService), u(4, f.ICoreService), u(5, d.IRenderService)], y);
    }, 9806: (l, n) => {
      function a(c, u, d) {
        const f = d.getBoundingClientRect(), m = c.getComputedStyle(d), y = parseInt(m.getPropertyValue("padding-left")), v = parseInt(m.getPropertyValue("padding-top"));
        return [u.clientX - f.left - y, u.clientY - f.top - v];
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.getCoords = n.getCoordsRelativeToElement = void 0, n.getCoordsRelativeToElement = a, n.getCoords = function(c, u, d, f, m, y, v, h, p) {
        if (!y) return;
        const g = a(c, u, d);
        return g ? (g[0] = Math.ceil((g[0] + (p ? v / 2 : 0)) / v), g[1] = Math.ceil(g[1] / h), g[0] = Math.min(Math.max(g[0], 1), f + (p ? 1 : 0)), g[1] = Math.min(Math.max(g[1], 1), m), g) : void 0;
      };
    }, 9504: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.moveToCellSequence = void 0;
      const c = a(2584);
      function u(h, p, g, _) {
        const b = h - d(h, g), S = p - d(p, g), w = Math.abs(b - S) - function(k, x, C) {
          let A = 0;
          const L = k - d(k, C), M = x - d(x, C);
          for (let T = 0; T < Math.abs(L - M); T++) {
            const F = f(k, x) === "A" ? -1 : 1, $ = C.buffer.lines.get(L + F * T);
            $ != null && $.isWrapped && A++;
          }
          return A;
        }(h, p, g);
        return v(w, y(f(h, p), _));
      }
      function d(h, p) {
        let g = 0, _ = p.buffer.lines.get(h), b = _ == null ? void 0 : _.isWrapped;
        for (; b && h >= 0 && h < p.rows; ) g++, _ = p.buffer.lines.get(--h), b = _ == null ? void 0 : _.isWrapped;
        return g;
      }
      function f(h, p) {
        return h > p ? "A" : "B";
      }
      function m(h, p, g, _, b, S) {
        let w = h, k = p, x = "";
        for (; w !== g || k !== _; ) w += b ? 1 : -1, b && w > S.cols - 1 ? (x += S.buffer.translateBufferLineToString(k, !1, h, w), w = 0, h = 0, k++) : !b && w < 0 && (x += S.buffer.translateBufferLineToString(k, !1, 0, h + 1), w = S.cols - 1, h = w, k--);
        return x + S.buffer.translateBufferLineToString(k, !1, h, w);
      }
      function y(h, p) {
        const g = p ? "O" : "[";
        return c.C0.ESC + g + h;
      }
      function v(h, p) {
        h = Math.floor(h);
        let g = "";
        for (let _ = 0; _ < h; _++) g += p;
        return g;
      }
      n.moveToCellSequence = function(h, p, g, _) {
        const b = g.buffer.x, S = g.buffer.y;
        if (!g.buffer.hasScrollback) return function(x, C, A, L, M, T) {
          return u(C, L, M, T).length === 0 ? "" : v(m(x, C, x, C - d(C, M), !1, M).length, y("D", T));
        }(b, S, 0, p, g, _) + u(S, p, g, _) + function(x, C, A, L, M, T) {
          let F;
          F = u(C, L, M, T).length > 0 ? L - d(L, M) : C;
          const $ = L, H = function(z, E, R, P, O, j) {
            let q;
            return q = u(R, P, O, j).length > 0 ? P - d(P, O) : E, z < R && q <= P || z >= R && q < P ? "C" : "D";
          }(x, C, A, L, M, T);
          return v(m(x, F, A, $, H === "C", M).length, y(H, T));
        }(b, S, h, p, g, _);
        let w;
        if (S === p) return w = b > h ? "D" : "C", v(Math.abs(b - h), y(w, _));
        w = S > p ? "D" : "C";
        const k = Math.abs(S - p);
        return v(function(x, C) {
          return C.cols - x;
        }(S > p ? h : b, g) + (k - 1) * g.cols + 1 + ((S > p ? b : h) - 1), y(w, _));
      };
    }, 1296: function(l, n, a) {
      var c = this && this.__decorate || function(M, T, F, $) {
        var H, z = arguments.length, E = z < 3 ? T : $ === null ? $ = Object.getOwnPropertyDescriptor(T, F) : $;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") E = Reflect.decorate(M, T, F, $);
        else for (var R = M.length - 1; R >= 0; R--) (H = M[R]) && (E = (z < 3 ? H(E) : z > 3 ? H(T, F, E) : H(T, F)) || E);
        return z > 3 && E && Object.defineProperty(T, F, E), E;
      }, u = this && this.__param || function(M, T) {
        return function(F, $) {
          T(F, $, M);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DomRenderer = void 0;
      const d = a(3787), f = a(2550), m = a(2223), y = a(6171), v = a(4725), h = a(8055), p = a(8460), g = a(844), _ = a(2585), b = "xterm-dom-renderer-owner-", S = "xterm-rows", w = "xterm-fg-", k = "xterm-bg-", x = "xterm-focus", C = "xterm-selection";
      let A = 1, L = n.DomRenderer = class extends g.Disposable {
        constructor(M, T, F, $, H, z, E, R, P, O) {
          super(), this._element = M, this._screenElement = T, this._viewportElement = F, this._linkifier2 = $, this._charSizeService = z, this._optionsService = E, this._bufferService = R, this._coreBrowserService = P, this._themeService = O, this._terminalClass = A++, this._rowElements = [], this.onRequestRedraw = this.register(new p.EventEmitter()).event, this._rowContainer = document.createElement("div"), this._rowContainer.classList.add(S), this._rowContainer.style.lineHeight = "normal", this._rowContainer.setAttribute("aria-hidden", "true"), this._refreshRowElements(this._bufferService.cols, this._bufferService.rows), this._selectionContainer = document.createElement("div"), this._selectionContainer.classList.add(C), this._selectionContainer.setAttribute("aria-hidden", "true"), this.dimensions = (0, y.createRenderDimensions)(), this._updateDimensions(), this.register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())), this.register(this._themeService.onChangeColors((j) => this._injectCss(j))), this._injectCss(this._themeService.colors), this._rowFactory = H.createInstance(d.DomRendererRowFactory, document), this._element.classList.add(b + this._terminalClass), this._screenElement.appendChild(this._rowContainer), this._screenElement.appendChild(this._selectionContainer), this.register(this._linkifier2.onShowLinkUnderline((j) => this._handleLinkHover(j))), this.register(this._linkifier2.onHideLinkUnderline((j) => this._handleLinkLeave(j))), this.register((0, g.toDisposable)(() => {
            this._element.classList.remove(b + this._terminalClass), this._rowContainer.remove(), this._selectionContainer.remove(), this._widthCache.dispose(), this._themeStyleElement.remove(), this._dimensionsStyleElement.remove();
          })), this._widthCache = new f.WidthCache(document), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
        }
        _updateDimensions() {
          const M = this._coreBrowserService.dpr;
          this.dimensions.device.char.width = this._charSizeService.width * M, this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * M), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.left = 0, this.dimensions.device.char.top = 0, this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols, this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows, this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / M), this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / M), this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols, this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
          for (const F of this._rowElements) F.style.width = `${this.dimensions.css.canvas.width}px`, F.style.height = `${this.dimensions.css.cell.height}px`, F.style.lineHeight = `${this.dimensions.css.cell.height}px`, F.style.overflow = "hidden";
          this._dimensionsStyleElement || (this._dimensionsStyleElement = document.createElement("style"), this._screenElement.appendChild(this._dimensionsStyleElement));
          const T = `${this._terminalSelector} .${S} span { display: inline-block; height: 100%; vertical-align: top;}`;
          this._dimensionsStyleElement.textContent = T, this._selectionContainer.style.height = this._viewportElement.style.height, this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
        }
        _injectCss(M) {
          this._themeStyleElement || (this._themeStyleElement = document.createElement("style"), this._screenElement.appendChild(this._themeStyleElement));
          let T = `${this._terminalSelector} .${S} { color: ${M.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
          T += `${this._terminalSelector} .${S} .xterm-dim { color: ${h.color.multiplyOpacity(M.foreground, 0.5).css};}`, T += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`, T += "@keyframes blink_box_shadow_" + this._terminalClass + " { 50% {  border-bottom-style: hidden; }}", T += "@keyframes blink_block_" + this._terminalClass + ` { 0% {  background-color: ${M.cursor.css};  color: ${M.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${M.cursor.css}; }}`, T += `${this._terminalSelector} .${S}.${x} .xterm-cursor.xterm-cursor-blink:not(.xterm-cursor-block) { animation: blink_box_shadow_` + this._terminalClass + ` 1s step-end infinite;}${this._terminalSelector} .${S}.${x} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: blink_block_` + this._terminalClass + ` 1s step-end infinite;}${this._terminalSelector} .${S} .xterm-cursor.xterm-cursor-block { background-color: ${M.cursor.css}; color: ${M.cursorAccent.css};}${this._terminalSelector} .${S} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${M.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${S} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${M.cursor.css} inset;}${this._terminalSelector} .${S} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${M.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`, T += `${this._terminalSelector} .${C} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${C} div { position: absolute; background-color: ${M.selectionBackgroundOpaque.css};}${this._terminalSelector} .${C} div { position: absolute; background-color: ${M.selectionInactiveBackgroundOpaque.css};}`;
          for (const [F, $] of M.ansi.entries()) T += `${this._terminalSelector} .${w}${F} { color: ${$.css}; }${this._terminalSelector} .${w}${F}.xterm-dim { color: ${h.color.multiplyOpacity($, 0.5).css}; }${this._terminalSelector} .${k}${F} { background-color: ${$.css}; }`;
          T += `${this._terminalSelector} .${w}${m.INVERTED_DEFAULT_COLOR} { color: ${h.color.opaque(M.background).css}; }${this._terminalSelector} .${w}${m.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${h.color.multiplyOpacity(h.color.opaque(M.background), 0.5).css}; }${this._terminalSelector} .${k}${m.INVERTED_DEFAULT_COLOR} { background-color: ${M.foreground.css}; }`, this._themeStyleElement.textContent = T;
        }
        _setDefaultSpacing() {
          const M = this.dimensions.css.cell.width - this._widthCache.get("W", !1, !1);
          this._rowContainer.style.letterSpacing = `${M}px`, this._rowFactory.defaultSpacing = M;
        }
        handleDevicePixelRatioChange() {
          this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
        }
        _refreshRowElements(M, T) {
          for (let F = this._rowElements.length; F <= T; F++) {
            const $ = document.createElement("div");
            this._rowContainer.appendChild($), this._rowElements.push($);
          }
          for (; this._rowElements.length > T; ) this._rowContainer.removeChild(this._rowElements.pop());
        }
        handleResize(M, T) {
          this._refreshRowElements(M, T), this._updateDimensions();
        }
        handleCharSizeChanged() {
          this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
        }
        handleBlur() {
          this._rowContainer.classList.remove(x);
        }
        handleFocus() {
          this._rowContainer.classList.add(x), this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
        }
        handleSelectionChanged(M, T, F) {
          if (this._selectionContainer.replaceChildren(), this._rowFactory.handleSelectionChanged(M, T, F), this.renderRows(0, this._bufferService.rows - 1), !M || !T) return;
          const $ = M[1] - this._bufferService.buffer.ydisp, H = T[1] - this._bufferService.buffer.ydisp, z = Math.max($, 0), E = Math.min(H, this._bufferService.rows - 1);
          if (z >= this._bufferService.rows || E < 0) return;
          const R = document.createDocumentFragment();
          if (F) {
            const P = M[0] > T[0];
            R.appendChild(this._createSelectionElement(z, P ? T[0] : M[0], P ? M[0] : T[0], E - z + 1));
          } else {
            const P = $ === z ? M[0] : 0, O = z === H ? T[0] : this._bufferService.cols;
            R.appendChild(this._createSelectionElement(z, P, O));
            const j = E - z - 1;
            if (R.appendChild(this._createSelectionElement(z + 1, 0, this._bufferService.cols, j)), z !== E) {
              const q = H === E ? T[0] : this._bufferService.cols;
              R.appendChild(this._createSelectionElement(E, 0, q));
            }
          }
          this._selectionContainer.appendChild(R);
        }
        _createSelectionElement(M, T, F, $ = 1) {
          const H = document.createElement("div");
          return H.style.height = $ * this.dimensions.css.cell.height + "px", H.style.top = M * this.dimensions.css.cell.height + "px", H.style.left = T * this.dimensions.css.cell.width + "px", H.style.width = this.dimensions.css.cell.width * (F - T) + "px", H;
        }
        handleCursorMove() {
        }
        _handleOptionsChanged() {
          this._updateDimensions(), this._injectCss(this._themeService.colors), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
        }
        clear() {
          for (const M of this._rowElements) M.replaceChildren();
        }
        renderRows(M, T) {
          const F = this._bufferService.buffer, $ = F.ybase + F.y, H = Math.min(F.x, this._bufferService.cols - 1), z = this._optionsService.rawOptions.cursorBlink, E = this._optionsService.rawOptions.cursorStyle, R = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let P = M; P <= T; P++) {
            const O = P + F.ydisp, j = this._rowElements[P], q = F.lines.get(O);
            if (!j || !q) break;
            j.replaceChildren(...this._rowFactory.createRow(q, O, O === $, E, R, H, z, this.dimensions.css.cell.width, this._widthCache, -1, -1));
          }
        }
        get _terminalSelector() {
          return `.${b}${this._terminalClass}`;
        }
        _handleLinkHover(M) {
          this._setCellUnderline(M.x1, M.x2, M.y1, M.y2, M.cols, !0);
        }
        _handleLinkLeave(M) {
          this._setCellUnderline(M.x1, M.x2, M.y1, M.y2, M.cols, !1);
        }
        _setCellUnderline(M, T, F, $, H, z) {
          F < 0 && (M = 0), $ < 0 && (T = 0);
          const E = this._bufferService.rows - 1;
          F = Math.max(Math.min(F, E), 0), $ = Math.max(Math.min($, E), 0), H = Math.min(H, this._bufferService.cols);
          const R = this._bufferService.buffer, P = R.ybase + R.y, O = Math.min(R.x, H - 1), j = this._optionsService.rawOptions.cursorBlink, q = this._optionsService.rawOptions.cursorStyle, X = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let Y = F; Y <= $; ++Y) {
            const se = Y + R.ydisp, D = this._rowElements[Y], I = R.lines.get(se);
            if (!D || !I) break;
            D.replaceChildren(...this._rowFactory.createRow(I, se, se === P, q, X, O, j, this.dimensions.css.cell.width, this._widthCache, z ? Y === F ? M : 0 : -1, z ? (Y === $ ? T : H) - 1 : -1));
          }
        }
      };
      n.DomRenderer = L = c([u(4, _.IInstantiationService), u(5, v.ICharSizeService), u(6, _.IOptionsService), u(7, _.IBufferService), u(8, v.ICoreBrowserService), u(9, v.IThemeService)], L);
    }, 3787: function(l, n, a) {
      var c = this && this.__decorate || function(w, k, x, C) {
        var A, L = arguments.length, M = L < 3 ? k : C === null ? C = Object.getOwnPropertyDescriptor(k, x) : C;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") M = Reflect.decorate(w, k, x, C);
        else for (var T = w.length - 1; T >= 0; T--) (A = w[T]) && (M = (L < 3 ? A(M) : L > 3 ? A(k, x, M) : A(k, x)) || M);
        return L > 3 && M && Object.defineProperty(k, x, M), M;
      }, u = this && this.__param || function(w, k) {
        return function(x, C) {
          k(x, C, w);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DomRendererRowFactory = void 0;
      const d = a(2223), f = a(643), m = a(511), y = a(2585), v = a(8055), h = a(4725), p = a(4269), g = a(6171), _ = a(3734);
      let b = n.DomRendererRowFactory = class {
        constructor(w, k, x, C, A, L, M) {
          this._document = w, this._characterJoinerService = k, this._optionsService = x, this._coreBrowserService = C, this._coreService = A, this._decorationService = L, this._themeService = M, this._workCell = new m.CellData(), this._columnSelectMode = !1, this.defaultSpacing = 0;
        }
        handleSelectionChanged(w, k, x) {
          this._selectionStart = w, this._selectionEnd = k, this._columnSelectMode = x;
        }
        createRow(w, k, x, C, A, L, M, T, F, $, H) {
          const z = [], E = this._characterJoinerService.getJoinedCharacters(k), R = this._themeService.colors;
          let P, O = w.getNoBgTrimmedLength();
          x && O < L + 1 && (O = L + 1);
          let j = 0, q = "", X = 0, Y = 0, se = 0, D = !1, I = 0, U = !1, W = 0;
          const J = [], K = $ !== -1 && H !== -1;
          for (let re = 0; re < O; re++) {
            w.loadCell(re, this._workCell);
            let ve = this._workCell.getWidth();
            if (ve === 0) continue;
            let Ce = !1, Lt = re, Z = this._workCell;
            if (E.length > 0 && re === E[0][0]) {
              Ce = !0;
              const de = E.shift();
              Z = new p.JoinedCellData(this._workCell, w.translateToString(!0, de[0], de[1]), de[1] - de[0]), Lt = de[1] - 1, ve = Z.getWidth();
            }
            const Ut = this._isCellInSelection(re, k), bs = x && re === L, ys = K && re >= $ && re <= H;
            let Ss = !1;
            this._decorationService.forEachDecorationAtCell(re, k, void 0, (de) => {
              Ss = !0;
            });
            let Ai = Z.getChars() || f.WHITESPACE_CELL_CHAR;
            if (Ai === " " && (Z.isUnderline() || Z.isOverline()) && (Ai = " "), W = ve * T - F.get(Ai, Z.isBold(), Z.isItalic()), P) {
              if (j && (Ut && U || !Ut && !U && Z.bg === X) && (Ut && U && R.selectionForeground || Z.fg === Y) && Z.extended.ext === se && ys === D && W === I && !bs && !Ce && !Ss) {
                q += Ai, j++;
                continue;
              }
              j && (P.textContent = q), P = this._document.createElement("span"), j = 0, q = "";
            } else P = this._document.createElement("span");
            if (X = Z.bg, Y = Z.fg, se = Z.extended.ext, D = ys, I = W, U = Ut, Ce && L >= re && L <= Lt && (L = re), !this._coreService.isCursorHidden && bs) {
              if (J.push("xterm-cursor"), this._coreBrowserService.isFocused) M && J.push("xterm-cursor-blink"), J.push(C === "bar" ? "xterm-cursor-bar" : C === "underline" ? "xterm-cursor-underline" : "xterm-cursor-block");
              else if (A) switch (A) {
                case "outline":
                  J.push("xterm-cursor-outline");
                  break;
                case "block":
                  J.push("xterm-cursor-block");
                  break;
                case "bar":
                  J.push("xterm-cursor-bar");
                  break;
                case "underline":
                  J.push("xterm-cursor-underline");
              }
            }
            if (Z.isBold() && J.push("xterm-bold"), Z.isItalic() && J.push("xterm-italic"), Z.isDim() && J.push("xterm-dim"), q = Z.isInvisible() ? f.WHITESPACE_CELL_CHAR : Z.getChars() || f.WHITESPACE_CELL_CHAR, Z.isUnderline() && (J.push(`xterm-underline-${Z.extended.underlineStyle}`), q === " " && (q = " "), !Z.isUnderlineColorDefault())) if (Z.isUnderlineColorRGB()) P.style.textDecorationColor = `rgb(${_.AttributeData.toColorRGB(Z.getUnderlineColor()).join(",")})`;
            else {
              let de = Z.getUnderlineColor();
              this._optionsService.rawOptions.drawBoldTextInBrightColors && Z.isBold() && de < 8 && (de += 8), P.style.textDecorationColor = R.ansi[de].css;
            }
            Z.isOverline() && (J.push("xterm-overline"), q === " " && (q = " ")), Z.isStrikethrough() && J.push("xterm-strikethrough"), ys && (P.style.textDecoration = "underline");
            let Le = Z.getFgColor(), jt = Z.getFgColorMode(), Be = Z.getBgColor(), Vt = Z.getBgColorMode();
            const xs = !!Z.isInverse();
            if (xs) {
              const de = Le;
              Le = Be, Be = de;
              const Aa = jt;
              jt = Vt, Vt = Aa;
            }
            let Ge, ws, Je, qt = !1;
            switch (this._decorationService.forEachDecorationAtCell(re, k, void 0, (de) => {
              de.options.layer !== "top" && qt || (de.backgroundColorRGB && (Vt = 50331648, Be = de.backgroundColorRGB.rgba >> 8 & 16777215, Ge = de.backgroundColorRGB), de.foregroundColorRGB && (jt = 50331648, Le = de.foregroundColorRGB.rgba >> 8 & 16777215, ws = de.foregroundColorRGB), qt = de.options.layer === "top");
            }), !qt && Ut && (Ge = this._coreBrowserService.isFocused ? R.selectionBackgroundOpaque : R.selectionInactiveBackgroundOpaque, Be = Ge.rgba >> 8 & 16777215, Vt = 50331648, qt = !0, R.selectionForeground && (jt = 50331648, Le = R.selectionForeground.rgba >> 8 & 16777215, ws = R.selectionForeground)), qt && J.push("xterm-decoration-top"), Vt) {
              case 16777216:
              case 33554432:
                Je = R.ansi[Be], J.push(`xterm-bg-${Be}`);
                break;
              case 50331648:
                Je = v.rgba.toColor(Be >> 16, Be >> 8 & 255, 255 & Be), this._addStyle(P, `background-color:#${S((Be >>> 0).toString(16), "0", 6)}`);
                break;
              default:
                xs ? (Je = R.foreground, J.push(`xterm-bg-${d.INVERTED_DEFAULT_COLOR}`)) : Je = R.background;
            }
            switch (Ge || Z.isDim() && (Ge = v.color.multiplyOpacity(Je, 0.5)), jt) {
              case 16777216:
              case 33554432:
                Z.isBold() && Le < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors && (Le += 8), this._applyMinimumContrast(P, Je, R.ansi[Le], Z, Ge, void 0) || J.push(`xterm-fg-${Le}`);
                break;
              case 50331648:
                const de = v.rgba.toColor(Le >> 16 & 255, Le >> 8 & 255, 255 & Le);
                this._applyMinimumContrast(P, Je, de, Z, Ge, ws) || this._addStyle(P, `color:#${S(Le.toString(16), "0", 6)}`);
                break;
              default:
                this._applyMinimumContrast(P, Je, R.foreground, Z, Ge, void 0) || xs && J.push(`xterm-fg-${d.INVERTED_DEFAULT_COLOR}`);
            }
            J.length && (P.className = J.join(" "), J.length = 0), bs || Ce || Ss ? P.textContent = q : j++, W !== this.defaultSpacing && (P.style.letterSpacing = `${W}px`), z.push(P), re = Lt;
          }
          return P && j && (P.textContent = q), z;
        }
        _applyMinimumContrast(w, k, x, C, A, L) {
          if (this._optionsService.rawOptions.minimumContrastRatio === 1 || (0, g.excludeFromContrastRatioDemands)(C.getCode())) return !1;
          const M = this._getContrastCache(C);
          let T;
          if (A || L || (T = M.getColor(k.rgba, x.rgba)), T === void 0) {
            const F = this._optionsService.rawOptions.minimumContrastRatio / (C.isDim() ? 2 : 1);
            T = v.color.ensureContrastRatio(A || k, L || x, F), M.setColor((A || k).rgba, (L || x).rgba, T ?? null);
          }
          return !!T && (this._addStyle(w, `color:${T.css}`), !0);
        }
        _getContrastCache(w) {
          return w.isDim() ? this._themeService.colors.halfContrastCache : this._themeService.colors.contrastCache;
        }
        _addStyle(w, k) {
          w.setAttribute("style", `${w.getAttribute("style") || ""}${k};`);
        }
        _isCellInSelection(w, k) {
          const x = this._selectionStart, C = this._selectionEnd;
          return !(!x || !C) && (this._columnSelectMode ? x[0] <= C[0] ? w >= x[0] && k >= x[1] && w < C[0] && k <= C[1] : w < x[0] && k >= x[1] && w >= C[0] && k <= C[1] : k > x[1] && k < C[1] || x[1] === C[1] && k === x[1] && w >= x[0] && w < C[0] || x[1] < C[1] && k === C[1] && w < C[0] || x[1] < C[1] && k === x[1] && w >= x[0]);
        }
      };
      function S(w, k, x) {
        for (; w.length < x; ) w = k + w;
        return w;
      }
      n.DomRendererRowFactory = b = c([u(1, h.ICharacterJoinerService), u(2, y.IOptionsService), u(3, h.ICoreBrowserService), u(4, y.ICoreService), u(5, y.IDecorationService), u(6, h.IThemeService)], b);
    }, 2550: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.WidthCache = void 0, n.WidthCache = class {
        constructor(a) {
          this._flat = new Float32Array(256), this._font = "", this._fontSize = 0, this._weight = "normal", this._weightBold = "bold", this._measureElements = [], this._container = a.createElement("div"), this._container.style.position = "absolute", this._container.style.top = "-50000px", this._container.style.width = "50000px", this._container.style.whiteSpace = "pre", this._container.style.fontKerning = "none";
          const c = a.createElement("span"), u = a.createElement("span");
          u.style.fontWeight = "bold";
          const d = a.createElement("span");
          d.style.fontStyle = "italic";
          const f = a.createElement("span");
          f.style.fontWeight = "bold", f.style.fontStyle = "italic", this._measureElements = [c, u, d, f], this._container.appendChild(c), this._container.appendChild(u), this._container.appendChild(d), this._container.appendChild(f), a.body.appendChild(this._container), this.clear();
        }
        dispose() {
          this._container.remove(), this._measureElements.length = 0, this._holey = void 0;
        }
        clear() {
          this._flat.fill(-9999), this._holey = /* @__PURE__ */ new Map();
        }
        setFont(a, c, u, d) {
          a === this._font && c === this._fontSize && u === this._weight && d === this._weightBold || (this._font = a, this._fontSize = c, this._weight = u, this._weightBold = d, this._container.style.fontFamily = this._font, this._container.style.fontSize = `${this._fontSize}px`, this._measureElements[0].style.fontWeight = `${u}`, this._measureElements[1].style.fontWeight = `${d}`, this._measureElements[2].style.fontWeight = `${u}`, this._measureElements[3].style.fontWeight = `${d}`, this.clear());
        }
        get(a, c, u) {
          let d = 0;
          if (!c && !u && a.length === 1 && (d = a.charCodeAt(0)) < 256) return this._flat[d] !== -9999 ? this._flat[d] : this._flat[d] = this._measure(a, 0);
          let f = a;
          c && (f += "B"), u && (f += "I");
          let m = this._holey.get(f);
          if (m === void 0) {
            let y = 0;
            c && (y |= 1), u && (y |= 2), m = this._measure(a, y), this._holey.set(f, m);
          }
          return m;
        }
        _measure(a, c) {
          const u = this._measureElements[c];
          return u.textContent = a.repeat(32), u.offsetWidth / 32;
        }
      };
    }, 2223: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.TEXT_BASELINE = n.DIM_OPACITY = n.INVERTED_DEFAULT_COLOR = void 0;
      const c = a(6114);
      n.INVERTED_DEFAULT_COLOR = 257, n.DIM_OPACITY = 0.5, n.TEXT_BASELINE = c.isFirefox || c.isLegacyEdge ? "bottom" : "ideographic";
    }, 6171: (l, n) => {
      function a(c) {
        return 57508 <= c && c <= 57558;
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.createRenderDimensions = n.excludeFromContrastRatioDemands = n.isRestrictedPowerlineGlyph = n.isPowerlineGlyph = n.throwIfFalsy = void 0, n.throwIfFalsy = function(c) {
        if (!c) throw new Error("value must not be falsy");
        return c;
      }, n.isPowerlineGlyph = a, n.isRestrictedPowerlineGlyph = function(c) {
        return 57520 <= c && c <= 57527;
      }, n.excludeFromContrastRatioDemands = function(c) {
        return a(c) || function(u) {
          return 9472 <= u && u <= 9631;
        }(c);
      }, n.createRenderDimensions = function() {
        return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
      };
    }, 456: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.SelectionModel = void 0, n.SelectionModel = class {
        constructor(a) {
          this._bufferService = a, this.isSelectAllActive = !1, this.selectionStartLength = 0;
        }
        clearSelection() {
          this.selectionStart = void 0, this.selectionEnd = void 0, this.isSelectAllActive = !1, this.selectionStartLength = 0;
        }
        get finalSelectionStart() {
          return this.isSelectAllActive ? [0, 0] : this.selectionEnd && this.selectionStart && this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
        }
        get finalSelectionEnd() {
          if (this.isSelectAllActive) return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
          if (this.selectionStart) {
            if (!this.selectionEnd || this.areSelectionValuesReversed()) {
              const a = this.selectionStart[0] + this.selectionStartLength;
              return a > this._bufferService.cols ? a % this._bufferService.cols == 0 ? [this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols) - 1] : [a % this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols)] : [a, this.selectionStart[1]];
            }
            if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
              const a = this.selectionStart[0] + this.selectionStartLength;
              return a > this._bufferService.cols ? [a % this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols)] : [Math.max(a, this.selectionEnd[0]), this.selectionEnd[1]];
            }
            return this.selectionEnd;
          }
        }
        areSelectionValuesReversed() {
          const a = this.selectionStart, c = this.selectionEnd;
          return !(!a || !c) && (a[1] > c[1] || a[1] === c[1] && a[0] > c[0]);
        }
        handleTrim(a) {
          return this.selectionStart && (this.selectionStart[1] -= a), this.selectionEnd && (this.selectionEnd[1] -= a), this.selectionEnd && this.selectionEnd[1] < 0 ? (this.clearSelection(), !0) : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0), !1);
        }
      };
    }, 428: function(l, n, a) {
      var c = this && this.__decorate || function(h, p, g, _) {
        var b, S = arguments.length, w = S < 3 ? p : _ === null ? _ = Object.getOwnPropertyDescriptor(p, g) : _;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") w = Reflect.decorate(h, p, g, _);
        else for (var k = h.length - 1; k >= 0; k--) (b = h[k]) && (w = (S < 3 ? b(w) : S > 3 ? b(p, g, w) : b(p, g)) || w);
        return S > 3 && w && Object.defineProperty(p, g, w), w;
      }, u = this && this.__param || function(h, p) {
        return function(g, _) {
          p(g, _, h);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CharSizeService = void 0;
      const d = a(2585), f = a(8460), m = a(844);
      let y = n.CharSizeService = class extends m.Disposable {
        get hasValidSize() {
          return this.width > 0 && this.height > 0;
        }
        constructor(h, p, g) {
          super(), this._optionsService = g, this.width = 0, this.height = 0, this._onCharSizeChange = this.register(new f.EventEmitter()), this.onCharSizeChange = this._onCharSizeChange.event, this._measureStrategy = new v(h, p, this._optionsService), this.register(this._optionsService.onMultipleOptionChange(["fontFamily", "fontSize"], () => this.measure()));
        }
        measure() {
          const h = this._measureStrategy.measure();
          h.width === this.width && h.height === this.height || (this.width = h.width, this.height = h.height, this._onCharSizeChange.fire());
        }
      };
      n.CharSizeService = y = c([u(2, d.IOptionsService)], y);
      class v {
        constructor(p, g, _) {
          this._document = p, this._parentElement = g, this._optionsService = _, this._result = { width: 0, height: 0 }, this._measureElement = this._document.createElement("span"), this._measureElement.classList.add("xterm-char-measure-element"), this._measureElement.textContent = "W".repeat(32), this._measureElement.setAttribute("aria-hidden", "true"), this._measureElement.style.whiteSpace = "pre", this._measureElement.style.fontKerning = "none", this._parentElement.appendChild(this._measureElement);
        }
        measure() {
          this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`;
          const p = { height: Number(this._measureElement.offsetHeight), width: Number(this._measureElement.offsetWidth) };
          return p.width !== 0 && p.height !== 0 && (this._result.width = p.width / 32, this._result.height = Math.ceil(p.height)), this._result;
        }
      }
    }, 4269: function(l, n, a) {
      var c = this && this.__decorate || function(p, g, _, b) {
        var S, w = arguments.length, k = w < 3 ? g : b === null ? b = Object.getOwnPropertyDescriptor(g, _) : b;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") k = Reflect.decorate(p, g, _, b);
        else for (var x = p.length - 1; x >= 0; x--) (S = p[x]) && (k = (w < 3 ? S(k) : w > 3 ? S(g, _, k) : S(g, _)) || k);
        return w > 3 && k && Object.defineProperty(g, _, k), k;
      }, u = this && this.__param || function(p, g) {
        return function(_, b) {
          g(_, b, p);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CharacterJoinerService = n.JoinedCellData = void 0;
      const d = a(3734), f = a(643), m = a(511), y = a(2585);
      class v extends d.AttributeData {
        constructor(g, _, b) {
          super(), this.content = 0, this.combinedData = "", this.fg = g.fg, this.bg = g.bg, this.combinedData = _, this._width = b;
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(g) {
          throw new Error("not implemented");
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      n.JoinedCellData = v;
      let h = n.CharacterJoinerService = class Ca {
        constructor(g) {
          this._bufferService = g, this._characterJoiners = [], this._nextCharacterJoinerId = 0, this._workCell = new m.CellData();
        }
        register(g) {
          const _ = { id: this._nextCharacterJoinerId++, handler: g };
          return this._characterJoiners.push(_), _.id;
        }
        deregister(g) {
          for (let _ = 0; _ < this._characterJoiners.length; _++) if (this._characterJoiners[_].id === g) return this._characterJoiners.splice(_, 1), !0;
          return !1;
        }
        getJoinedCharacters(g) {
          if (this._characterJoiners.length === 0) return [];
          const _ = this._bufferService.buffer.lines.get(g);
          if (!_ || _.length === 0) return [];
          const b = [], S = _.translateToString(!0);
          let w = 0, k = 0, x = 0, C = _.getFg(0), A = _.getBg(0);
          for (let L = 0; L < _.getTrimmedLength(); L++) if (_.loadCell(L, this._workCell), this._workCell.getWidth() !== 0) {
            if (this._workCell.fg !== C || this._workCell.bg !== A) {
              if (L - w > 1) {
                const M = this._getJoinedRanges(S, x, k, _, w);
                for (let T = 0; T < M.length; T++) b.push(M[T]);
              }
              w = L, x = k, C = this._workCell.fg, A = this._workCell.bg;
            }
            k += this._workCell.getChars().length || f.WHITESPACE_CELL_CHAR.length;
          }
          if (this._bufferService.cols - w > 1) {
            const L = this._getJoinedRanges(S, x, k, _, w);
            for (let M = 0; M < L.length; M++) b.push(L[M]);
          }
          return b;
        }
        _getJoinedRanges(g, _, b, S, w) {
          const k = g.substring(_, b);
          let x = [];
          try {
            x = this._characterJoiners[0].handler(k);
          } catch (C) {
            console.error(C);
          }
          for (let C = 1; C < this._characterJoiners.length; C++) try {
            const A = this._characterJoiners[C].handler(k);
            for (let L = 0; L < A.length; L++) Ca._mergeRanges(x, A[L]);
          } catch (A) {
            console.error(A);
          }
          return this._stringRangesToCellRanges(x, S, w), x;
        }
        _stringRangesToCellRanges(g, _, b) {
          let S = 0, w = !1, k = 0, x = g[S];
          if (x) {
            for (let C = b; C < this._bufferService.cols; C++) {
              const A = _.getWidth(C), L = _.getString(C).length || f.WHITESPACE_CELL_CHAR.length;
              if (A !== 0) {
                if (!w && x[0] <= k && (x[0] = C, w = !0), x[1] <= k) {
                  if (x[1] = C, x = g[++S], !x) break;
                  x[0] <= k ? (x[0] = C, w = !0) : w = !1;
                }
                k += L;
              }
            }
            x && (x[1] = this._bufferService.cols);
          }
        }
        static _mergeRanges(g, _) {
          let b = !1;
          for (let S = 0; S < g.length; S++) {
            const w = g[S];
            if (b) {
              if (_[1] <= w[0]) return g[S - 1][1] = _[1], g;
              if (_[1] <= w[1]) return g[S - 1][1] = Math.max(_[1], w[1]), g.splice(S, 1), g;
              g.splice(S, 1), S--;
            } else {
              if (_[1] <= w[0]) return g.splice(S, 0, _), g;
              if (_[1] <= w[1]) return w[0] = Math.min(_[0], w[0]), g;
              _[0] < w[1] && (w[0] = Math.min(_[0], w[0]), b = !0);
            }
          }
          return b ? g[g.length - 1][1] = _[1] : g.push(_), g;
        }
      };
      n.CharacterJoinerService = h = c([u(0, y.IBufferService)], h);
    }, 5114: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CoreBrowserService = void 0, n.CoreBrowserService = class {
        constructor(a, c) {
          this._textarea = a, this.window = c, this._isFocused = !1, this._cachedIsFocused = void 0, this._textarea.addEventListener("focus", () => this._isFocused = !0), this._textarea.addEventListener("blur", () => this._isFocused = !1);
        }
        get dpr() {
          return this.window.devicePixelRatio;
        }
        get isFocused() {
          return this._cachedIsFocused === void 0 && (this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus(), queueMicrotask(() => this._cachedIsFocused = void 0)), this._cachedIsFocused;
        }
      };
    }, 8934: function(l, n, a) {
      var c = this && this.__decorate || function(y, v, h, p) {
        var g, _ = arguments.length, b = _ < 3 ? v : p === null ? p = Object.getOwnPropertyDescriptor(v, h) : p;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") b = Reflect.decorate(y, v, h, p);
        else for (var S = y.length - 1; S >= 0; S--) (g = y[S]) && (b = (_ < 3 ? g(b) : _ > 3 ? g(v, h, b) : g(v, h)) || b);
        return _ > 3 && b && Object.defineProperty(v, h, b), b;
      }, u = this && this.__param || function(y, v) {
        return function(h, p) {
          v(h, p, y);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.MouseService = void 0;
      const d = a(4725), f = a(9806);
      let m = n.MouseService = class {
        constructor(y, v) {
          this._renderService = y, this._charSizeService = v;
        }
        getCoords(y, v, h, p, g) {
          return (0, f.getCoords)(window, y, v, h, p, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, g);
        }
        getMouseReportCoords(y, v) {
          const h = (0, f.getCoordsRelativeToElement)(window, y, v);
          if (this._charSizeService.hasValidSize) return h[0] = Math.min(Math.max(h[0], 0), this._renderService.dimensions.css.canvas.width - 1), h[1] = Math.min(Math.max(h[1], 0), this._renderService.dimensions.css.canvas.height - 1), { col: Math.floor(h[0] / this._renderService.dimensions.css.cell.width), row: Math.floor(h[1] / this._renderService.dimensions.css.cell.height), x: Math.floor(h[0]), y: Math.floor(h[1]) };
        }
      };
      n.MouseService = m = c([u(0, d.IRenderService), u(1, d.ICharSizeService)], m);
    }, 3230: function(l, n, a) {
      var c = this && this.__decorate || function(b, S, w, k) {
        var x, C = arguments.length, A = C < 3 ? S : k === null ? k = Object.getOwnPropertyDescriptor(S, w) : k;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") A = Reflect.decorate(b, S, w, k);
        else for (var L = b.length - 1; L >= 0; L--) (x = b[L]) && (A = (C < 3 ? x(A) : C > 3 ? x(S, w, A) : x(S, w)) || A);
        return C > 3 && A && Object.defineProperty(S, w, A), A;
      }, u = this && this.__param || function(b, S) {
        return function(w, k) {
          S(w, k, b);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.RenderService = void 0;
      const d = a(3656), f = a(6193), m = a(5596), y = a(4725), v = a(8460), h = a(844), p = a(7226), g = a(2585);
      let _ = n.RenderService = class extends h.Disposable {
        get dimensions() {
          return this._renderer.value.dimensions;
        }
        constructor(b, S, w, k, x, C, A, L) {
          if (super(), this._rowCount = b, this._charSizeService = k, this._renderer = this.register(new h.MutableDisposable()), this._pausedResizeTask = new p.DebouncedIdleTask(), this._isPaused = !1, this._needsFullRefresh = !1, this._isNextRenderRedrawOnly = !0, this._needsSelectionRefresh = !1, this._canvasWidth = 0, this._canvasHeight = 0, this._selectionState = { start: void 0, end: void 0, columnSelectMode: !1 }, this._onDimensionsChange = this.register(new v.EventEmitter()), this.onDimensionsChange = this._onDimensionsChange.event, this._onRenderedViewportChange = this.register(new v.EventEmitter()), this.onRenderedViewportChange = this._onRenderedViewportChange.event, this._onRender = this.register(new v.EventEmitter()), this.onRender = this._onRender.event, this._onRefreshRequest = this.register(new v.EventEmitter()), this.onRefreshRequest = this._onRefreshRequest.event, this._renderDebouncer = new f.RenderDebouncer(A.window, (M, T) => this._renderRows(M, T)), this.register(this._renderDebouncer), this._screenDprMonitor = new m.ScreenDprMonitor(A.window), this._screenDprMonitor.setListener(() => this.handleDevicePixelRatioChange()), this.register(this._screenDprMonitor), this.register(C.onResize(() => this._fullRefresh())), this.register(C.buffers.onBufferActivate(() => {
            var M;
            return (M = this._renderer.value) === null || M === void 0 ? void 0 : M.clear();
          })), this.register(w.onOptionChange(() => this._handleOptionsChanged())), this.register(this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged())), this.register(x.onDecorationRegistered(() => this._fullRefresh())), this.register(x.onDecorationRemoved(() => this._fullRefresh())), this.register(w.onMultipleOptionChange(["customGlyphs", "drawBoldTextInBrightColors", "letterSpacing", "lineHeight", "fontFamily", "fontSize", "fontWeight", "fontWeightBold", "minimumContrastRatio"], () => {
            this.clear(), this.handleResize(C.cols, C.rows), this._fullRefresh();
          })), this.register(w.onMultipleOptionChange(["cursorBlink", "cursorStyle"], () => this.refreshRows(C.buffer.y, C.buffer.y, !0))), this.register((0, d.addDisposableDomListener)(A.window, "resize", () => this.handleDevicePixelRatioChange())), this.register(L.onChangeColors(() => this._fullRefresh())), "IntersectionObserver" in A.window) {
            const M = new A.window.IntersectionObserver((T) => this._handleIntersectionChange(T[T.length - 1]), { threshold: 0 });
            M.observe(S), this.register({ dispose: () => M.disconnect() });
          }
        }
        _handleIntersectionChange(b) {
          this._isPaused = b.isIntersecting === void 0 ? b.intersectionRatio === 0 : !b.isIntersecting, this._isPaused || this._charSizeService.hasValidSize || this._charSizeService.measure(), !this._isPaused && this._needsFullRefresh && (this._pausedResizeTask.flush(), this.refreshRows(0, this._rowCount - 1), this._needsFullRefresh = !1);
        }
        refreshRows(b, S, w = !1) {
          this._isPaused ? this._needsFullRefresh = !0 : (w || (this._isNextRenderRedrawOnly = !1), this._renderDebouncer.refresh(b, S, this._rowCount));
        }
        _renderRows(b, S) {
          this._renderer.value && (b = Math.min(b, this._rowCount - 1), S = Math.min(S, this._rowCount - 1), this._renderer.value.renderRows(b, S), this._needsSelectionRefresh && (this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode), this._needsSelectionRefresh = !1), this._isNextRenderRedrawOnly || this._onRenderedViewportChange.fire({ start: b, end: S }), this._onRender.fire({ start: b, end: S }), this._isNextRenderRedrawOnly = !0);
        }
        resize(b, S) {
          this._rowCount = S, this._fireOnCanvasResize();
        }
        _handleOptionsChanged() {
          this._renderer.value && (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
        }
        _fireOnCanvasResize() {
          this._renderer.value && (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight || this._onDimensionsChange.fire(this._renderer.value.dimensions));
        }
        hasRenderer() {
          return !!this._renderer.value;
        }
        setRenderer(b) {
          this._renderer.value = b, this._renderer.value.onRequestRedraw((S) => this.refreshRows(S.start, S.end, !0)), this._needsSelectionRefresh = !0, this._fullRefresh();
        }
        addRefreshCallback(b) {
          return this._renderDebouncer.addRefreshCallback(b);
        }
        _fullRefresh() {
          this._isPaused ? this._needsFullRefresh = !0 : this.refreshRows(0, this._rowCount - 1);
        }
        clearTextureAtlas() {
          var b, S;
          this._renderer.value && ((S = (b = this._renderer.value).clearTextureAtlas) === null || S === void 0 || S.call(b), this._fullRefresh());
        }
        handleDevicePixelRatioChange() {
          this._charSizeService.measure(), this._renderer.value && (this._renderer.value.handleDevicePixelRatioChange(), this.refreshRows(0, this._rowCount - 1));
        }
        handleResize(b, S) {
          this._renderer.value && (this._isPaused ? this._pausedResizeTask.set(() => this._renderer.value.handleResize(b, S)) : this._renderer.value.handleResize(b, S), this._fullRefresh());
        }
        handleCharSizeChanged() {
          var b;
          (b = this._renderer.value) === null || b === void 0 || b.handleCharSizeChanged();
        }
        handleBlur() {
          var b;
          (b = this._renderer.value) === null || b === void 0 || b.handleBlur();
        }
        handleFocus() {
          var b;
          (b = this._renderer.value) === null || b === void 0 || b.handleFocus();
        }
        handleSelectionChanged(b, S, w) {
          var k;
          this._selectionState.start = b, this._selectionState.end = S, this._selectionState.columnSelectMode = w, (k = this._renderer.value) === null || k === void 0 || k.handleSelectionChanged(b, S, w);
        }
        handleCursorMove() {
          var b;
          (b = this._renderer.value) === null || b === void 0 || b.handleCursorMove();
        }
        clear() {
          var b;
          (b = this._renderer.value) === null || b === void 0 || b.clear();
        }
      };
      n.RenderService = _ = c([u(2, g.IOptionsService), u(3, y.ICharSizeService), u(4, g.IDecorationService), u(5, g.IBufferService), u(6, y.ICoreBrowserService), u(7, y.IThemeService)], _);
    }, 9312: function(l, n, a) {
      var c = this && this.__decorate || function(x, C, A, L) {
        var M, T = arguments.length, F = T < 3 ? C : L === null ? L = Object.getOwnPropertyDescriptor(C, A) : L;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") F = Reflect.decorate(x, C, A, L);
        else for (var $ = x.length - 1; $ >= 0; $--) (M = x[$]) && (F = (T < 3 ? M(F) : T > 3 ? M(C, A, F) : M(C, A)) || F);
        return T > 3 && F && Object.defineProperty(C, A, F), F;
      }, u = this && this.__param || function(x, C) {
        return function(A, L) {
          C(A, L, x);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.SelectionService = void 0;
      const d = a(9806), f = a(9504), m = a(456), y = a(4725), v = a(8460), h = a(844), p = a(6114), g = a(4841), _ = a(511), b = a(2585), S = " ", w = new RegExp(S, "g");
      let k = n.SelectionService = class extends h.Disposable {
        constructor(x, C, A, L, M, T, F, $, H) {
          super(), this._element = x, this._screenElement = C, this._linkifier = A, this._bufferService = L, this._coreService = M, this._mouseService = T, this._optionsService = F, this._renderService = $, this._coreBrowserService = H, this._dragScrollAmount = 0, this._enabled = !0, this._workCell = new _.CellData(), this._mouseDownTimeStamp = 0, this._oldHasSelection = !1, this._oldSelectionStart = void 0, this._oldSelectionEnd = void 0, this._onLinuxMouseSelection = this.register(new v.EventEmitter()), this.onLinuxMouseSelection = this._onLinuxMouseSelection.event, this._onRedrawRequest = this.register(new v.EventEmitter()), this.onRequestRedraw = this._onRedrawRequest.event, this._onSelectionChange = this.register(new v.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onRequestScrollLines = this.register(new v.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this._mouseMoveListener = (z) => this._handleMouseMove(z), this._mouseUpListener = (z) => this._handleMouseUp(z), this._coreService.onUserInput(() => {
            this.hasSelection && this.clearSelection();
          }), this._trimListener = this._bufferService.buffer.lines.onTrim((z) => this._handleTrim(z)), this.register(this._bufferService.buffers.onBufferActivate((z) => this._handleBufferActivate(z))), this.enable(), this._model = new m.SelectionModel(this._bufferService), this._activeSelectionMode = 0, this.register((0, h.toDisposable)(() => {
            this._removeMouseDownListeners();
          }));
        }
        reset() {
          this.clearSelection();
        }
        disable() {
          this.clearSelection(), this._enabled = !1;
        }
        enable() {
          this._enabled = !0;
        }
        get selectionStart() {
          return this._model.finalSelectionStart;
        }
        get selectionEnd() {
          return this._model.finalSelectionEnd;
        }
        get hasSelection() {
          const x = this._model.finalSelectionStart, C = this._model.finalSelectionEnd;
          return !(!x || !C || x[0] === C[0] && x[1] === C[1]);
        }
        get selectionText() {
          const x = this._model.finalSelectionStart, C = this._model.finalSelectionEnd;
          if (!x || !C) return "";
          const A = this._bufferService.buffer, L = [];
          if (this._activeSelectionMode === 3) {
            if (x[0] === C[0]) return "";
            const M = x[0] < C[0] ? x[0] : C[0], T = x[0] < C[0] ? C[0] : x[0];
            for (let F = x[1]; F <= C[1]; F++) {
              const $ = A.translateBufferLineToString(F, !0, M, T);
              L.push($);
            }
          } else {
            const M = x[1] === C[1] ? C[0] : void 0;
            L.push(A.translateBufferLineToString(x[1], !0, x[0], M));
            for (let T = x[1] + 1; T <= C[1] - 1; T++) {
              const F = A.lines.get(T), $ = A.translateBufferLineToString(T, !0);
              F != null && F.isWrapped ? L[L.length - 1] += $ : L.push($);
            }
            if (x[1] !== C[1]) {
              const T = A.lines.get(C[1]), F = A.translateBufferLineToString(C[1], !0, 0, C[0]);
              T && T.isWrapped ? L[L.length - 1] += F : L.push(F);
            }
          }
          return L.map((M) => M.replace(w, " ")).join(p.isWindows ? `\r
` : `
`);
        }
        clearSelection() {
          this._model.clearSelection(), this._removeMouseDownListeners(), this.refresh(), this._onSelectionChange.fire();
        }
        refresh(x) {
          this._refreshAnimationFrame || (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._refresh())), p.isLinux && x && this.selectionText.length && this._onLinuxMouseSelection.fire(this.selectionText);
        }
        _refresh() {
          this._refreshAnimationFrame = void 0, this._onRedrawRequest.fire({ start: this._model.finalSelectionStart, end: this._model.finalSelectionEnd, columnSelectMode: this._activeSelectionMode === 3 });
        }
        _isClickInSelection(x) {
          const C = this._getMouseBufferCoords(x), A = this._model.finalSelectionStart, L = this._model.finalSelectionEnd;
          return !!(A && L && C) && this._areCoordsInSelection(C, A, L);
        }
        isCellInSelection(x, C) {
          const A = this._model.finalSelectionStart, L = this._model.finalSelectionEnd;
          return !(!A || !L) && this._areCoordsInSelection([x, C], A, L);
        }
        _areCoordsInSelection(x, C, A) {
          return x[1] > C[1] && x[1] < A[1] || C[1] === A[1] && x[1] === C[1] && x[0] >= C[0] && x[0] < A[0] || C[1] < A[1] && x[1] === A[1] && x[0] < A[0] || C[1] < A[1] && x[1] === C[1] && x[0] >= C[0];
        }
        _selectWordAtCursor(x, C) {
          var A, L;
          const M = (L = (A = this._linkifier.currentLink) === null || A === void 0 ? void 0 : A.link) === null || L === void 0 ? void 0 : L.range;
          if (M) return this._model.selectionStart = [M.start.x - 1, M.start.y - 1], this._model.selectionStartLength = (0, g.getRangeLength)(M, this._bufferService.cols), this._model.selectionEnd = void 0, !0;
          const T = this._getMouseBufferCoords(x);
          return !!T && (this._selectWordAt(T, C), this._model.selectionEnd = void 0, !0);
        }
        selectAll() {
          this._model.isSelectAllActive = !0, this.refresh(), this._onSelectionChange.fire();
        }
        selectLines(x, C) {
          this._model.clearSelection(), x = Math.max(x, 0), C = Math.min(C, this._bufferService.buffer.lines.length - 1), this._model.selectionStart = [0, x], this._model.selectionEnd = [this._bufferService.cols, C], this.refresh(), this._onSelectionChange.fire();
        }
        _handleTrim(x) {
          this._model.handleTrim(x) && this.refresh();
        }
        _getMouseBufferCoords(x) {
          const C = this._mouseService.getCoords(x, this._screenElement, this._bufferService.cols, this._bufferService.rows, !0);
          if (C) return C[0]--, C[1]--, C[1] += this._bufferService.buffer.ydisp, C;
        }
        _getMouseEventScrollAmount(x) {
          let C = (0, d.getCoordsRelativeToElement)(this._coreBrowserService.window, x, this._screenElement)[1];
          const A = this._renderService.dimensions.css.canvas.height;
          return C >= 0 && C <= A ? 0 : (C > A && (C -= A), C = Math.min(Math.max(C, -50), 50), C /= 50, C / Math.abs(C) + Math.round(14 * C));
        }
        shouldForceSelection(x) {
          return p.isMac ? x.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection : x.shiftKey;
        }
        handleMouseDown(x) {
          if (this._mouseDownTimeStamp = x.timeStamp, (x.button !== 2 || !this.hasSelection) && x.button === 0) {
            if (!this._enabled) {
              if (!this.shouldForceSelection(x)) return;
              x.stopPropagation();
            }
            x.preventDefault(), this._dragScrollAmount = 0, this._enabled && x.shiftKey ? this._handleIncrementalClick(x) : x.detail === 1 ? this._handleSingleClick(x) : x.detail === 2 ? this._handleDoubleClick(x) : x.detail === 3 && this._handleTripleClick(x), this._addMouseDownListeners(), this.refresh(!0);
          }
        }
        _addMouseDownListeners() {
          this._screenElement.ownerDocument && (this._screenElement.ownerDocument.addEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.addEventListener("mouseup", this._mouseUpListener)), this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(() => this._dragScroll(), 50);
        }
        _removeMouseDownListeners() {
          this._screenElement.ownerDocument && (this._screenElement.ownerDocument.removeEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.removeEventListener("mouseup", this._mouseUpListener)), this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer), this._dragScrollIntervalTimer = void 0;
        }
        _handleIncrementalClick(x) {
          this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(x));
        }
        _handleSingleClick(x) {
          if (this._model.selectionStartLength = 0, this._model.isSelectAllActive = !1, this._activeSelectionMode = this.shouldColumnSelect(x) ? 3 : 0, this._model.selectionStart = this._getMouseBufferCoords(x), !this._model.selectionStart) return;
          this._model.selectionEnd = void 0;
          const C = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
          C && C.length !== this._model.selectionStart[0] && C.hasWidth(this._model.selectionStart[0]) === 0 && this._model.selectionStart[0]++;
        }
        _handleDoubleClick(x) {
          this._selectWordAtCursor(x, !0) && (this._activeSelectionMode = 1);
        }
        _handleTripleClick(x) {
          const C = this._getMouseBufferCoords(x);
          C && (this._activeSelectionMode = 2, this._selectLineAt(C[1]));
        }
        shouldColumnSelect(x) {
          return x.altKey && !(p.isMac && this._optionsService.rawOptions.macOptionClickForcesSelection);
        }
        _handleMouseMove(x) {
          if (x.stopImmediatePropagation(), !this._model.selectionStart) return;
          const C = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
          if (this._model.selectionEnd = this._getMouseBufferCoords(x), !this._model.selectionEnd) return void this.refresh(!0);
          this._activeSelectionMode === 2 ? this._model.selectionEnd[1] < this._model.selectionStart[1] ? this._model.selectionEnd[0] = 0 : this._model.selectionEnd[0] = this._bufferService.cols : this._activeSelectionMode === 1 && this._selectToWordAt(this._model.selectionEnd), this._dragScrollAmount = this._getMouseEventScrollAmount(x), this._activeSelectionMode !== 3 && (this._dragScrollAmount > 0 ? this._model.selectionEnd[0] = this._bufferService.cols : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0));
          const A = this._bufferService.buffer;
          if (this._model.selectionEnd[1] < A.lines.length) {
            const L = A.lines.get(this._model.selectionEnd[1]);
            L && L.hasWidth(this._model.selectionEnd[0]) === 0 && this._model.selectionEnd[0]++;
          }
          C && C[0] === this._model.selectionEnd[0] && C[1] === this._model.selectionEnd[1] || this.refresh(!0);
        }
        _dragScroll() {
          if (this._model.selectionEnd && this._model.selectionStart && this._dragScrollAmount) {
            this._onRequestScrollLines.fire({ amount: this._dragScrollAmount, suppressScrollEvent: !1 });
            const x = this._bufferService.buffer;
            this._dragScrollAmount > 0 ? (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = this._bufferService.cols), this._model.selectionEnd[1] = Math.min(x.ydisp + this._bufferService.rows, x.lines.length - 1)) : (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = 0), this._model.selectionEnd[1] = x.ydisp), this.refresh();
          }
        }
        _handleMouseUp(x) {
          const C = x.timeStamp - this._mouseDownTimeStamp;
          if (this._removeMouseDownListeners(), this.selectionText.length <= 1 && C < 500 && x.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
            if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
              const A = this._mouseService.getCoords(x, this._element, this._bufferService.cols, this._bufferService.rows, !1);
              if (A && A[0] !== void 0 && A[1] !== void 0) {
                const L = (0, f.moveToCellSequence)(A[0] - 1, A[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
                this._coreService.triggerDataEvent(L, !0);
              }
            }
          } else this._fireEventIfSelectionChanged();
        }
        _fireEventIfSelectionChanged() {
          const x = this._model.finalSelectionStart, C = this._model.finalSelectionEnd, A = !(!x || !C || x[0] === C[0] && x[1] === C[1]);
          A ? x && C && (this._oldSelectionStart && this._oldSelectionEnd && x[0] === this._oldSelectionStart[0] && x[1] === this._oldSelectionStart[1] && C[0] === this._oldSelectionEnd[0] && C[1] === this._oldSelectionEnd[1] || this._fireOnSelectionChange(x, C, A)) : this._oldHasSelection && this._fireOnSelectionChange(x, C, A);
        }
        _fireOnSelectionChange(x, C, A) {
          this._oldSelectionStart = x, this._oldSelectionEnd = C, this._oldHasSelection = A, this._onSelectionChange.fire();
        }
        _handleBufferActivate(x) {
          this.clearSelection(), this._trimListener.dispose(), this._trimListener = x.activeBuffer.lines.onTrim((C) => this._handleTrim(C));
        }
        _convertViewportColToCharacterIndex(x, C) {
          let A = C;
          for (let L = 0; C >= L; L++) {
            const M = x.loadCell(L, this._workCell).getChars().length;
            this._workCell.getWidth() === 0 ? A-- : M > 1 && C !== L && (A += M - 1);
          }
          return A;
        }
        setSelection(x, C, A) {
          this._model.clearSelection(), this._removeMouseDownListeners(), this._model.selectionStart = [x, C], this._model.selectionStartLength = A, this.refresh(), this._fireEventIfSelectionChanged();
        }
        rightClickSelect(x) {
          this._isClickInSelection(x) || (this._selectWordAtCursor(x, !1) && this.refresh(!0), this._fireEventIfSelectionChanged());
        }
        _getWordAt(x, C, A = !0, L = !0) {
          if (x[0] >= this._bufferService.cols) return;
          const M = this._bufferService.buffer, T = M.lines.get(x[1]);
          if (!T) return;
          const F = M.translateBufferLineToString(x[1], !1);
          let $ = this._convertViewportColToCharacterIndex(T, x[0]), H = $;
          const z = x[0] - $;
          let E = 0, R = 0, P = 0, O = 0;
          if (F.charAt($) === " ") {
            for (; $ > 0 && F.charAt($ - 1) === " "; ) $--;
            for (; H < F.length && F.charAt(H + 1) === " "; ) H++;
          } else {
            let X = x[0], Y = x[0];
            T.getWidth(X) === 0 && (E++, X--), T.getWidth(Y) === 2 && (R++, Y++);
            const se = T.getString(Y).length;
            for (se > 1 && (O += se - 1, H += se - 1); X > 0 && $ > 0 && !this._isCharWordSeparator(T.loadCell(X - 1, this._workCell)); ) {
              T.loadCell(X - 1, this._workCell);
              const D = this._workCell.getChars().length;
              this._workCell.getWidth() === 0 ? (E++, X--) : D > 1 && (P += D - 1, $ -= D - 1), $--, X--;
            }
            for (; Y < T.length && H + 1 < F.length && !this._isCharWordSeparator(T.loadCell(Y + 1, this._workCell)); ) {
              T.loadCell(Y + 1, this._workCell);
              const D = this._workCell.getChars().length;
              this._workCell.getWidth() === 2 ? (R++, Y++) : D > 1 && (O += D - 1, H += D - 1), H++, Y++;
            }
          }
          H++;
          let j = $ + z - E + P, q = Math.min(this._bufferService.cols, H - $ + E + R - P - O);
          if (C || F.slice($, H).trim() !== "") {
            if (A && j === 0 && T.getCodePoint(0) !== 32) {
              const X = M.lines.get(x[1] - 1);
              if (X && T.isWrapped && X.getCodePoint(this._bufferService.cols - 1) !== 32) {
                const Y = this._getWordAt([this._bufferService.cols - 1, x[1] - 1], !1, !0, !1);
                if (Y) {
                  const se = this._bufferService.cols - Y.start;
                  j -= se, q += se;
                }
              }
            }
            if (L && j + q === this._bufferService.cols && T.getCodePoint(this._bufferService.cols - 1) !== 32) {
              const X = M.lines.get(x[1] + 1);
              if (X != null && X.isWrapped && X.getCodePoint(0) !== 32) {
                const Y = this._getWordAt([0, x[1] + 1], !1, !1, !0);
                Y && (q += Y.length);
              }
            }
            return { start: j, length: q };
          }
        }
        _selectWordAt(x, C) {
          const A = this._getWordAt(x, C);
          if (A) {
            for (; A.start < 0; ) A.start += this._bufferService.cols, x[1]--;
            this._model.selectionStart = [A.start, x[1]], this._model.selectionStartLength = A.length;
          }
        }
        _selectToWordAt(x) {
          const C = this._getWordAt(x, !0);
          if (C) {
            let A = x[1];
            for (; C.start < 0; ) C.start += this._bufferService.cols, A--;
            if (!this._model.areSelectionValuesReversed()) for (; C.start + C.length > this._bufferService.cols; ) C.length -= this._bufferService.cols, A++;
            this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? C.start : C.start + C.length, A];
          }
        }
        _isCharWordSeparator(x) {
          return x.getWidth() !== 0 && this._optionsService.rawOptions.wordSeparator.indexOf(x.getChars()) >= 0;
        }
        _selectLineAt(x) {
          const C = this._bufferService.buffer.getWrappedRangeForLine(x), A = { start: { x: 0, y: C.first }, end: { x: this._bufferService.cols - 1, y: C.last } };
          this._model.selectionStart = [0, C.first], this._model.selectionEnd = void 0, this._model.selectionStartLength = (0, g.getRangeLength)(A, this._bufferService.cols);
        }
      };
      n.SelectionService = k = c([u(3, b.IBufferService), u(4, b.ICoreService), u(5, y.IMouseService), u(6, b.IOptionsService), u(7, y.IRenderService), u(8, y.ICoreBrowserService)], k);
    }, 4725: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.IThemeService = n.ICharacterJoinerService = n.ISelectionService = n.IRenderService = n.IMouseService = n.ICoreBrowserService = n.ICharSizeService = void 0;
      const c = a(8343);
      n.ICharSizeService = (0, c.createDecorator)("CharSizeService"), n.ICoreBrowserService = (0, c.createDecorator)("CoreBrowserService"), n.IMouseService = (0, c.createDecorator)("MouseService"), n.IRenderService = (0, c.createDecorator)("RenderService"), n.ISelectionService = (0, c.createDecorator)("SelectionService"), n.ICharacterJoinerService = (0, c.createDecorator)("CharacterJoinerService"), n.IThemeService = (0, c.createDecorator)("ThemeService");
    }, 6731: function(l, n, a) {
      var c = this && this.__decorate || function(k, x, C, A) {
        var L, M = arguments.length, T = M < 3 ? x : A === null ? A = Object.getOwnPropertyDescriptor(x, C) : A;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") T = Reflect.decorate(k, x, C, A);
        else for (var F = k.length - 1; F >= 0; F--) (L = k[F]) && (T = (M < 3 ? L(T) : M > 3 ? L(x, C, T) : L(x, C)) || T);
        return M > 3 && T && Object.defineProperty(x, C, T), T;
      }, u = this && this.__param || function(k, x) {
        return function(C, A) {
          x(C, A, k);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ThemeService = n.DEFAULT_ANSI_COLORS = void 0;
      const d = a(7239), f = a(8055), m = a(8460), y = a(844), v = a(2585), h = f.css.toColor("#ffffff"), p = f.css.toColor("#000000"), g = f.css.toColor("#ffffff"), _ = f.css.toColor("#000000"), b = { css: "rgba(255, 255, 255, 0.3)", rgba: 4294967117 };
      n.DEFAULT_ANSI_COLORS = Object.freeze((() => {
        const k = [f.css.toColor("#2e3436"), f.css.toColor("#cc0000"), f.css.toColor("#4e9a06"), f.css.toColor("#c4a000"), f.css.toColor("#3465a4"), f.css.toColor("#75507b"), f.css.toColor("#06989a"), f.css.toColor("#d3d7cf"), f.css.toColor("#555753"), f.css.toColor("#ef2929"), f.css.toColor("#8ae234"), f.css.toColor("#fce94f"), f.css.toColor("#729fcf"), f.css.toColor("#ad7fa8"), f.css.toColor("#34e2e2"), f.css.toColor("#eeeeec")], x = [0, 95, 135, 175, 215, 255];
        for (let C = 0; C < 216; C++) {
          const A = x[C / 36 % 6 | 0], L = x[C / 6 % 6 | 0], M = x[C % 6];
          k.push({ css: f.channels.toCss(A, L, M), rgba: f.channels.toRgba(A, L, M) });
        }
        for (let C = 0; C < 24; C++) {
          const A = 8 + 10 * C;
          k.push({ css: f.channels.toCss(A, A, A), rgba: f.channels.toRgba(A, A, A) });
        }
        return k;
      })());
      let S = n.ThemeService = class extends y.Disposable {
        get colors() {
          return this._colors;
        }
        constructor(k) {
          super(), this._optionsService = k, this._contrastCache = new d.ColorContrastCache(), this._halfContrastCache = new d.ColorContrastCache(), this._onChangeColors = this.register(new m.EventEmitter()), this.onChangeColors = this._onChangeColors.event, this._colors = { foreground: h, background: p, cursor: g, cursorAccent: _, selectionForeground: void 0, selectionBackgroundTransparent: b, selectionBackgroundOpaque: f.color.blend(p, b), selectionInactiveBackgroundTransparent: b, selectionInactiveBackgroundOpaque: f.color.blend(p, b), ansi: n.DEFAULT_ANSI_COLORS.slice(), contrastCache: this._contrastCache, halfContrastCache: this._halfContrastCache }, this._updateRestoreColors(), this._setTheme(this._optionsService.rawOptions.theme), this.register(this._optionsService.onSpecificOptionChange("minimumContrastRatio", () => this._contrastCache.clear())), this.register(this._optionsService.onSpecificOptionChange("theme", () => this._setTheme(this._optionsService.rawOptions.theme)));
        }
        _setTheme(k = {}) {
          const x = this._colors;
          if (x.foreground = w(k.foreground, h), x.background = w(k.background, p), x.cursor = w(k.cursor, g), x.cursorAccent = w(k.cursorAccent, _), x.selectionBackgroundTransparent = w(k.selectionBackground, b), x.selectionBackgroundOpaque = f.color.blend(x.background, x.selectionBackgroundTransparent), x.selectionInactiveBackgroundTransparent = w(k.selectionInactiveBackground, x.selectionBackgroundTransparent), x.selectionInactiveBackgroundOpaque = f.color.blend(x.background, x.selectionInactiveBackgroundTransparent), x.selectionForeground = k.selectionForeground ? w(k.selectionForeground, f.NULL_COLOR) : void 0, x.selectionForeground === f.NULL_COLOR && (x.selectionForeground = void 0), f.color.isOpaque(x.selectionBackgroundTransparent) && (x.selectionBackgroundTransparent = f.color.opacity(x.selectionBackgroundTransparent, 0.3)), f.color.isOpaque(x.selectionInactiveBackgroundTransparent) && (x.selectionInactiveBackgroundTransparent = f.color.opacity(x.selectionInactiveBackgroundTransparent, 0.3)), x.ansi = n.DEFAULT_ANSI_COLORS.slice(), x.ansi[0] = w(k.black, n.DEFAULT_ANSI_COLORS[0]), x.ansi[1] = w(k.red, n.DEFAULT_ANSI_COLORS[1]), x.ansi[2] = w(k.green, n.DEFAULT_ANSI_COLORS[2]), x.ansi[3] = w(k.yellow, n.DEFAULT_ANSI_COLORS[3]), x.ansi[4] = w(k.blue, n.DEFAULT_ANSI_COLORS[4]), x.ansi[5] = w(k.magenta, n.DEFAULT_ANSI_COLORS[5]), x.ansi[6] = w(k.cyan, n.DEFAULT_ANSI_COLORS[6]), x.ansi[7] = w(k.white, n.DEFAULT_ANSI_COLORS[7]), x.ansi[8] = w(k.brightBlack, n.DEFAULT_ANSI_COLORS[8]), x.ansi[9] = w(k.brightRed, n.DEFAULT_ANSI_COLORS[9]), x.ansi[10] = w(k.brightGreen, n.DEFAULT_ANSI_COLORS[10]), x.ansi[11] = w(k.brightYellow, n.DEFAULT_ANSI_COLORS[11]), x.ansi[12] = w(k.brightBlue, n.DEFAULT_ANSI_COLORS[12]), x.ansi[13] = w(k.brightMagenta, n.DEFAULT_ANSI_COLORS[13]), x.ansi[14] = w(k.brightCyan, n.DEFAULT_ANSI_COLORS[14]), x.ansi[15] = w(k.brightWhite, n.DEFAULT_ANSI_COLORS[15]), k.extendedAnsi) {
            const C = Math.min(x.ansi.length - 16, k.extendedAnsi.length);
            for (let A = 0; A < C; A++) x.ansi[A + 16] = w(k.extendedAnsi[A], n.DEFAULT_ANSI_COLORS[A + 16]);
          }
          this._contrastCache.clear(), this._halfContrastCache.clear(), this._updateRestoreColors(), this._onChangeColors.fire(this.colors);
        }
        restoreColor(k) {
          this._restoreColor(k), this._onChangeColors.fire(this.colors);
        }
        _restoreColor(k) {
          if (k !== void 0) switch (k) {
            case 256:
              this._colors.foreground = this._restoreColors.foreground;
              break;
            case 257:
              this._colors.background = this._restoreColors.background;
              break;
            case 258:
              this._colors.cursor = this._restoreColors.cursor;
              break;
            default:
              this._colors.ansi[k] = this._restoreColors.ansi[k];
          }
          else for (let x = 0; x < this._restoreColors.ansi.length; ++x) this._colors.ansi[x] = this._restoreColors.ansi[x];
        }
        modifyColors(k) {
          k(this._colors), this._onChangeColors.fire(this.colors);
        }
        _updateRestoreColors() {
          this._restoreColors = { foreground: this._colors.foreground, background: this._colors.background, cursor: this._colors.cursor, ansi: this._colors.ansi.slice() };
        }
      };
      function w(k, x) {
        if (k !== void 0) try {
          return f.css.toColor(k);
        } catch {
        }
        return x;
      }
      n.ThemeService = S = c([u(0, v.IOptionsService)], S);
    }, 6349: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CircularList = void 0;
      const c = a(8460), u = a(844);
      class d extends u.Disposable {
        constructor(m) {
          super(), this._maxLength = m, this.onDeleteEmitter = this.register(new c.EventEmitter()), this.onDelete = this.onDeleteEmitter.event, this.onInsertEmitter = this.register(new c.EventEmitter()), this.onInsert = this.onInsertEmitter.event, this.onTrimEmitter = this.register(new c.EventEmitter()), this.onTrim = this.onTrimEmitter.event, this._array = new Array(this._maxLength), this._startIndex = 0, this._length = 0;
        }
        get maxLength() {
          return this._maxLength;
        }
        set maxLength(m) {
          if (this._maxLength === m) return;
          const y = new Array(m);
          for (let v = 0; v < Math.min(m, this.length); v++) y[v] = this._array[this._getCyclicIndex(v)];
          this._array = y, this._maxLength = m, this._startIndex = 0;
        }
        get length() {
          return this._length;
        }
        set length(m) {
          if (m > this._length) for (let y = this._length; y < m; y++) this._array[y] = void 0;
          this._length = m;
        }
        get(m) {
          return this._array[this._getCyclicIndex(m)];
        }
        set(m, y) {
          this._array[this._getCyclicIndex(m)] = y;
        }
        push(m) {
          this._array[this._getCyclicIndex(this._length)] = m, this._length === this._maxLength ? (this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1)) : this._length++;
        }
        recycle() {
          if (this._length !== this._maxLength) throw new Error("Can only recycle when the buffer is full");
          return this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1), this._array[this._getCyclicIndex(this._length - 1)];
        }
        get isFull() {
          return this._length === this._maxLength;
        }
        pop() {
          return this._array[this._getCyclicIndex(this._length-- - 1)];
        }
        splice(m, y, ...v) {
          if (y) {
            for (let h = m; h < this._length - y; h++) this._array[this._getCyclicIndex(h)] = this._array[this._getCyclicIndex(h + y)];
            this._length -= y, this.onDeleteEmitter.fire({ index: m, amount: y });
          }
          for (let h = this._length - 1; h >= m; h--) this._array[this._getCyclicIndex(h + v.length)] = this._array[this._getCyclicIndex(h)];
          for (let h = 0; h < v.length; h++) this._array[this._getCyclicIndex(m + h)] = v[h];
          if (v.length && this.onInsertEmitter.fire({ index: m, amount: v.length }), this._length + v.length > this._maxLength) {
            const h = this._length + v.length - this._maxLength;
            this._startIndex += h, this._length = this._maxLength, this.onTrimEmitter.fire(h);
          } else this._length += v.length;
        }
        trimStart(m) {
          m > this._length && (m = this._length), this._startIndex += m, this._length -= m, this.onTrimEmitter.fire(m);
        }
        shiftElements(m, y, v) {
          if (!(y <= 0)) {
            if (m < 0 || m >= this._length) throw new Error("start argument out of range");
            if (m + v < 0) throw new Error("Cannot shift elements in list beyond index 0");
            if (v > 0) {
              for (let p = y - 1; p >= 0; p--) this.set(m + p + v, this.get(m + p));
              const h = m + y + v - this._length;
              if (h > 0) for (this._length += h; this._length > this._maxLength; ) this._length--, this._startIndex++, this.onTrimEmitter.fire(1);
            } else for (let h = 0; h < y; h++) this.set(m + h + v, this.get(m + h));
          }
        }
        _getCyclicIndex(m) {
          return (this._startIndex + m) % this._maxLength;
        }
      }
      n.CircularList = d;
    }, 1439: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.clone = void 0, n.clone = function a(c, u = 5) {
        if (typeof c != "object") return c;
        const d = Array.isArray(c) ? [] : {};
        for (const f in c) d[f] = u <= 1 ? c[f] : c[f] && a(c[f], u - 1);
        return d;
      };
    }, 8055: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.contrastRatio = n.toPaddedHex = n.rgba = n.rgb = n.css = n.color = n.channels = n.NULL_COLOR = void 0;
      const c = a(6114);
      let u = 0, d = 0, f = 0, m = 0;
      var y, v, h, p, g;
      function _(S) {
        const w = S.toString(16);
        return w.length < 2 ? "0" + w : w;
      }
      function b(S, w) {
        return S < w ? (w + 0.05) / (S + 0.05) : (S + 0.05) / (w + 0.05);
      }
      n.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(S) {
        S.toCss = function(w, k, x, C) {
          return C !== void 0 ? `#${_(w)}${_(k)}${_(x)}${_(C)}` : `#${_(w)}${_(k)}${_(x)}`;
        }, S.toRgba = function(w, k, x, C = 255) {
          return (w << 24 | k << 16 | x << 8 | C) >>> 0;
        };
      }(y || (n.channels = y = {})), function(S) {
        function w(k, x) {
          return m = Math.round(255 * x), [u, d, f] = g.toChannels(k.rgba), { css: y.toCss(u, d, f, m), rgba: y.toRgba(u, d, f, m) };
        }
        S.blend = function(k, x) {
          if (m = (255 & x.rgba) / 255, m === 1) return { css: x.css, rgba: x.rgba };
          const C = x.rgba >> 24 & 255, A = x.rgba >> 16 & 255, L = x.rgba >> 8 & 255, M = k.rgba >> 24 & 255, T = k.rgba >> 16 & 255, F = k.rgba >> 8 & 255;
          return u = M + Math.round((C - M) * m), d = T + Math.round((A - T) * m), f = F + Math.round((L - F) * m), { css: y.toCss(u, d, f), rgba: y.toRgba(u, d, f) };
        }, S.isOpaque = function(k) {
          return (255 & k.rgba) == 255;
        }, S.ensureContrastRatio = function(k, x, C) {
          const A = g.ensureContrastRatio(k.rgba, x.rgba, C);
          if (A) return g.toColor(A >> 24 & 255, A >> 16 & 255, A >> 8 & 255);
        }, S.opaque = function(k) {
          const x = (255 | k.rgba) >>> 0;
          return [u, d, f] = g.toChannels(x), { css: y.toCss(u, d, f), rgba: x };
        }, S.opacity = w, S.multiplyOpacity = function(k, x) {
          return m = 255 & k.rgba, w(k, m * x / 255);
        }, S.toColorRGB = function(k) {
          return [k.rgba >> 24 & 255, k.rgba >> 16 & 255, k.rgba >> 8 & 255];
        };
      }(v || (n.color = v = {})), function(S) {
        let w, k;
        if (!c.isNode) {
          const x = document.createElement("canvas");
          x.width = 1, x.height = 1;
          const C = x.getContext("2d", { willReadFrequently: !0 });
          C && (w = C, w.globalCompositeOperation = "copy", k = w.createLinearGradient(0, 0, 1, 1));
        }
        S.toColor = function(x) {
          if (x.match(/#[\da-f]{3,8}/i)) switch (x.length) {
            case 4:
              return u = parseInt(x.slice(1, 2).repeat(2), 16), d = parseInt(x.slice(2, 3).repeat(2), 16), f = parseInt(x.slice(3, 4).repeat(2), 16), g.toColor(u, d, f);
            case 5:
              return u = parseInt(x.slice(1, 2).repeat(2), 16), d = parseInt(x.slice(2, 3).repeat(2), 16), f = parseInt(x.slice(3, 4).repeat(2), 16), m = parseInt(x.slice(4, 5).repeat(2), 16), g.toColor(u, d, f, m);
            case 7:
              return { css: x, rgba: (parseInt(x.slice(1), 16) << 8 | 255) >>> 0 };
            case 9:
              return { css: x, rgba: parseInt(x.slice(1), 16) >>> 0 };
          }
          const C = x.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
          if (C) return u = parseInt(C[1]), d = parseInt(C[2]), f = parseInt(C[3]), m = Math.round(255 * (C[5] === void 0 ? 1 : parseFloat(C[5]))), g.toColor(u, d, f, m);
          if (!w || !k) throw new Error("css.toColor: Unsupported css format");
          if (w.fillStyle = k, w.fillStyle = x, typeof w.fillStyle != "string") throw new Error("css.toColor: Unsupported css format");
          if (w.fillRect(0, 0, 1, 1), [u, d, f, m] = w.getImageData(0, 0, 1, 1).data, m !== 255) throw new Error("css.toColor: Unsupported css format");
          return { rgba: y.toRgba(u, d, f, m), css: x };
        };
      }(h || (n.css = h = {})), function(S) {
        function w(k, x, C) {
          const A = k / 255, L = x / 255, M = C / 255;
          return 0.2126 * (A <= 0.03928 ? A / 12.92 : Math.pow((A + 0.055) / 1.055, 2.4)) + 0.7152 * (L <= 0.03928 ? L / 12.92 : Math.pow((L + 0.055) / 1.055, 2.4)) + 0.0722 * (M <= 0.03928 ? M / 12.92 : Math.pow((M + 0.055) / 1.055, 2.4));
        }
        S.relativeLuminance = function(k) {
          return w(k >> 16 & 255, k >> 8 & 255, 255 & k);
        }, S.relativeLuminance2 = w;
      }(p || (n.rgb = p = {})), function(S) {
        function w(x, C, A) {
          const L = x >> 24 & 255, M = x >> 16 & 255, T = x >> 8 & 255;
          let F = C >> 24 & 255, $ = C >> 16 & 255, H = C >> 8 & 255, z = b(p.relativeLuminance2(F, $, H), p.relativeLuminance2(L, M, T));
          for (; z < A && (F > 0 || $ > 0 || H > 0); ) F -= Math.max(0, Math.ceil(0.1 * F)), $ -= Math.max(0, Math.ceil(0.1 * $)), H -= Math.max(0, Math.ceil(0.1 * H)), z = b(p.relativeLuminance2(F, $, H), p.relativeLuminance2(L, M, T));
          return (F << 24 | $ << 16 | H << 8 | 255) >>> 0;
        }
        function k(x, C, A) {
          const L = x >> 24 & 255, M = x >> 16 & 255, T = x >> 8 & 255;
          let F = C >> 24 & 255, $ = C >> 16 & 255, H = C >> 8 & 255, z = b(p.relativeLuminance2(F, $, H), p.relativeLuminance2(L, M, T));
          for (; z < A && (F < 255 || $ < 255 || H < 255); ) F = Math.min(255, F + Math.ceil(0.1 * (255 - F))), $ = Math.min(255, $ + Math.ceil(0.1 * (255 - $))), H = Math.min(255, H + Math.ceil(0.1 * (255 - H))), z = b(p.relativeLuminance2(F, $, H), p.relativeLuminance2(L, M, T));
          return (F << 24 | $ << 16 | H << 8 | 255) >>> 0;
        }
        S.ensureContrastRatio = function(x, C, A) {
          const L = p.relativeLuminance(x >> 8), M = p.relativeLuminance(C >> 8);
          if (b(L, M) < A) {
            if (M < L) {
              const $ = w(x, C, A), H = b(L, p.relativeLuminance($ >> 8));
              if (H < A) {
                const z = k(x, C, A);
                return H > b(L, p.relativeLuminance(z >> 8)) ? $ : z;
              }
              return $;
            }
            const T = k(x, C, A), F = b(L, p.relativeLuminance(T >> 8));
            if (F < A) {
              const $ = w(x, C, A);
              return F > b(L, p.relativeLuminance($ >> 8)) ? T : $;
            }
            return T;
          }
        }, S.reduceLuminance = w, S.increaseLuminance = k, S.toChannels = function(x) {
          return [x >> 24 & 255, x >> 16 & 255, x >> 8 & 255, 255 & x];
        }, S.toColor = function(x, C, A, L) {
          return { css: y.toCss(x, C, A, L), rgba: y.toRgba(x, C, A, L) };
        };
      }(g || (n.rgba = g = {})), n.toPaddedHex = _, n.contrastRatio = b;
    }, 8969: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CoreTerminal = void 0;
      const c = a(844), u = a(2585), d = a(4348), f = a(7866), m = a(744), y = a(7302), v = a(6975), h = a(8460), p = a(1753), g = a(1480), _ = a(7994), b = a(9282), S = a(5435), w = a(5981), k = a(2660);
      let x = !1;
      class C extends c.Disposable {
        get onScroll() {
          return this._onScrollApi || (this._onScrollApi = this.register(new h.EventEmitter()), this._onScroll.event((L) => {
            var M;
            (M = this._onScrollApi) === null || M === void 0 || M.fire(L.position);
          })), this._onScrollApi.event;
        }
        get cols() {
          return this._bufferService.cols;
        }
        get rows() {
          return this._bufferService.rows;
        }
        get buffers() {
          return this._bufferService.buffers;
        }
        get options() {
          return this.optionsService.options;
        }
        set options(L) {
          for (const M in L) this.optionsService.options[M] = L[M];
        }
        constructor(L) {
          super(), this._windowsWrappingHeuristics = this.register(new c.MutableDisposable()), this._onBinary = this.register(new h.EventEmitter()), this.onBinary = this._onBinary.event, this._onData = this.register(new h.EventEmitter()), this.onData = this._onData.event, this._onLineFeed = this.register(new h.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onResize = this.register(new h.EventEmitter()), this.onResize = this._onResize.event, this._onWriteParsed = this.register(new h.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event, this._onScroll = this.register(new h.EventEmitter()), this._instantiationService = new d.InstantiationService(), this.optionsService = this.register(new y.OptionsService(L)), this._instantiationService.setService(u.IOptionsService, this.optionsService), this._bufferService = this.register(this._instantiationService.createInstance(m.BufferService)), this._instantiationService.setService(u.IBufferService, this._bufferService), this._logService = this.register(this._instantiationService.createInstance(f.LogService)), this._instantiationService.setService(u.ILogService, this._logService), this.coreService = this.register(this._instantiationService.createInstance(v.CoreService)), this._instantiationService.setService(u.ICoreService, this.coreService), this.coreMouseService = this.register(this._instantiationService.createInstance(p.CoreMouseService)), this._instantiationService.setService(u.ICoreMouseService, this.coreMouseService), this.unicodeService = this.register(this._instantiationService.createInstance(g.UnicodeService)), this._instantiationService.setService(u.IUnicodeService, this.unicodeService), this._charsetService = this._instantiationService.createInstance(_.CharsetService), this._instantiationService.setService(u.ICharsetService, this._charsetService), this._oscLinkService = this._instantiationService.createInstance(k.OscLinkService), this._instantiationService.setService(u.IOscLinkService, this._oscLinkService), this._inputHandler = this.register(new S.InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService)), this.register((0, h.forwardEvent)(this._inputHandler.onLineFeed, this._onLineFeed)), this.register(this._inputHandler), this.register((0, h.forwardEvent)(this._bufferService.onResize, this._onResize)), this.register((0, h.forwardEvent)(this.coreService.onData, this._onData)), this.register((0, h.forwardEvent)(this.coreService.onBinary, this._onBinary)), this.register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom())), this.register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput())), this.register(this.optionsService.onMultipleOptionChange(["windowsMode", "windowsPty"], () => this._handleWindowsPtyOptionChange())), this.register(this._bufferService.onScroll((M) => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
          })), this.register(this._inputHandler.onScroll((M) => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
          })), this._writeBuffer = this.register(new w.WriteBuffer((M, T) => this._inputHandler.parse(M, T))), this.register((0, h.forwardEvent)(this._writeBuffer.onWriteParsed, this._onWriteParsed));
        }
        write(L, M) {
          this._writeBuffer.write(L, M);
        }
        writeSync(L, M) {
          this._logService.logLevel <= u.LogLevelEnum.WARN && !x && (this._logService.warn("writeSync is unreliable and will be removed soon."), x = !0), this._writeBuffer.writeSync(L, M);
        }
        resize(L, M) {
          isNaN(L) || isNaN(M) || (L = Math.max(L, m.MINIMUM_COLS), M = Math.max(M, m.MINIMUM_ROWS), this._bufferService.resize(L, M));
        }
        scroll(L, M = !1) {
          this._bufferService.scroll(L, M);
        }
        scrollLines(L, M, T) {
          this._bufferService.scrollLines(L, M, T);
        }
        scrollPages(L) {
          this.scrollLines(L * (this.rows - 1));
        }
        scrollToTop() {
          this.scrollLines(-this._bufferService.buffer.ydisp);
        }
        scrollToBottom() {
          this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        }
        scrollToLine(L) {
          const M = L - this._bufferService.buffer.ydisp;
          M !== 0 && this.scrollLines(M);
        }
        registerEscHandler(L, M) {
          return this._inputHandler.registerEscHandler(L, M);
        }
        registerDcsHandler(L, M) {
          return this._inputHandler.registerDcsHandler(L, M);
        }
        registerCsiHandler(L, M) {
          return this._inputHandler.registerCsiHandler(L, M);
        }
        registerOscHandler(L, M) {
          return this._inputHandler.registerOscHandler(L, M);
        }
        _setup() {
          this._handleWindowsPtyOptionChange();
        }
        reset() {
          this._inputHandler.reset(), this._bufferService.reset(), this._charsetService.reset(), this.coreService.reset(), this.coreMouseService.reset();
        }
        _handleWindowsPtyOptionChange() {
          let L = !1;
          const M = this.optionsService.rawOptions.windowsPty;
          M && M.buildNumber !== void 0 && M.buildNumber !== void 0 ? L = M.backend === "conpty" && M.buildNumber < 21376 : this.optionsService.rawOptions.windowsMode && (L = !0), L ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear();
        }
        _enableWindowsWrappingHeuristics() {
          if (!this._windowsWrappingHeuristics.value) {
            const L = [];
            L.push(this.onLineFeed(b.updateWindowsModeWrappedState.bind(null, this._bufferService))), L.push(this.registerCsiHandler({ final: "H" }, () => ((0, b.updateWindowsModeWrappedState)(this._bufferService), !1))), this._windowsWrappingHeuristics.value = (0, c.toDisposable)(() => {
              for (const M of L) M.dispose();
            });
          }
        }
      }
      n.CoreTerminal = C;
    }, 8460: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.forwardEvent = n.EventEmitter = void 0, n.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = !1;
        }
        get event() {
          return this._event || (this._event = (a) => (this._listeners.push(a), { dispose: () => {
            if (!this._disposed) {
              for (let c = 0; c < this._listeners.length; c++) if (this._listeners[c] === a) return void this._listeners.splice(c, 1);
            }
          } })), this._event;
        }
        fire(a, c) {
          const u = [];
          for (let d = 0; d < this._listeners.length; d++) u.push(this._listeners[d]);
          for (let d = 0; d < u.length; d++) u[d].call(void 0, a, c);
        }
        dispose() {
          this.clearListeners(), this._disposed = !0;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, n.forwardEvent = function(a, c) {
        return a((u) => c.fire(u));
      };
    }, 5435: function(l, n, a) {
      var c = this && this.__decorate || function(z, E, R, P) {
        var O, j = arguments.length, q = j < 3 ? E : P === null ? P = Object.getOwnPropertyDescriptor(E, R) : P;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") q = Reflect.decorate(z, E, R, P);
        else for (var X = z.length - 1; X >= 0; X--) (O = z[X]) && (q = (j < 3 ? O(q) : j > 3 ? O(E, R, q) : O(E, R)) || q);
        return j > 3 && q && Object.defineProperty(E, R, q), q;
      }, u = this && this.__param || function(z, E) {
        return function(R, P) {
          E(R, P, z);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.InputHandler = n.WindowsOptionsReportType = void 0;
      const d = a(2584), f = a(7116), m = a(2015), y = a(844), v = a(482), h = a(8437), p = a(8460), g = a(643), _ = a(511), b = a(3734), S = a(2585), w = a(6242), k = a(6351), x = a(5941), C = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 }, A = 131072;
      function L(z, E) {
        if (z > 24) return E.setWinLines || !1;
        switch (z) {
          case 1:
            return !!E.restoreWin;
          case 2:
            return !!E.minimizeWin;
          case 3:
            return !!E.setWinPosition;
          case 4:
            return !!E.setWinSizePixels;
          case 5:
            return !!E.raiseWin;
          case 6:
            return !!E.lowerWin;
          case 7:
            return !!E.refreshWin;
          case 8:
            return !!E.setWinSizeChars;
          case 9:
            return !!E.maximizeWin;
          case 10:
            return !!E.fullscreenWin;
          case 11:
            return !!E.getWinState;
          case 13:
            return !!E.getWinPosition;
          case 14:
            return !!E.getWinSizePixels;
          case 15:
            return !!E.getScreenSizePixels;
          case 16:
            return !!E.getCellSizePixels;
          case 18:
            return !!E.getWinSizeChars;
          case 19:
            return !!E.getScreenSizeChars;
          case 20:
            return !!E.getIconTitle;
          case 21:
            return !!E.getWinTitle;
          case 22:
            return !!E.pushTitle;
          case 23:
            return !!E.popTitle;
          case 24:
            return !!E.setWinLines;
        }
        return !1;
      }
      var M;
      (function(z) {
        z[z.GET_WIN_SIZE_PIXELS = 0] = "GET_WIN_SIZE_PIXELS", z[z.GET_CELL_SIZE_PIXELS = 1] = "GET_CELL_SIZE_PIXELS";
      })(M || (n.WindowsOptionsReportType = M = {}));
      let T = 0;
      class F extends y.Disposable {
        getAttrData() {
          return this._curAttrData;
        }
        constructor(E, R, P, O, j, q, X, Y, se = new m.EscapeSequenceParser()) {
          super(), this._bufferService = E, this._charsetService = R, this._coreService = P, this._logService = O, this._optionsService = j, this._oscLinkService = q, this._coreMouseService = X, this._unicodeService = Y, this._parser = se, this._parseBuffer = new Uint32Array(4096), this._stringDecoder = new v.StringToUtf32(), this._utf8Decoder = new v.Utf8ToUtf32(), this._workCell = new _.CellData(), this._windowTitle = "", this._iconName = "", this._windowTitleStack = [], this._iconNameStack = [], this._curAttrData = h.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = h.DEFAULT_ATTR_DATA.clone(), this._onRequestBell = this.register(new p.EventEmitter()), this.onRequestBell = this._onRequestBell.event, this._onRequestRefreshRows = this.register(new p.EventEmitter()), this.onRequestRefreshRows = this._onRequestRefreshRows.event, this._onRequestReset = this.register(new p.EventEmitter()), this.onRequestReset = this._onRequestReset.event, this._onRequestSendFocus = this.register(new p.EventEmitter()), this.onRequestSendFocus = this._onRequestSendFocus.event, this._onRequestSyncScrollBar = this.register(new p.EventEmitter()), this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event, this._onRequestWindowsOptionsReport = this.register(new p.EventEmitter()), this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event, this._onA11yChar = this.register(new p.EventEmitter()), this.onA11yChar = this._onA11yChar.event, this._onA11yTab = this.register(new p.EventEmitter()), this.onA11yTab = this._onA11yTab.event, this._onCursorMove = this.register(new p.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onLineFeed = this.register(new p.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onScroll = this.register(new p.EventEmitter()), this.onScroll = this._onScroll.event, this._onTitleChange = this.register(new p.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onColor = this.register(new p.EventEmitter()), this.onColor = this._onColor.event, this._parseStack = { paused: !1, cursorStartX: 0, cursorStartY: 0, decodedLength: 0, position: 0 }, this._specialColors = [256, 257, 258], this.register(this._parser), this._dirtyRowTracker = new $(this._bufferService), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((D) => this._activeBuffer = D.activeBuffer)), this._parser.setCsiHandlerFallback((D, I) => {
            this._logService.debug("Unknown CSI code: ", { identifier: this._parser.identToString(D), params: I.toArray() });
          }), this._parser.setEscHandlerFallback((D) => {
            this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(D) });
          }), this._parser.setExecuteHandlerFallback((D) => {
            this._logService.debug("Unknown EXECUTE code: ", { code: D });
          }), this._parser.setOscHandlerFallback((D, I, U) => {
            this._logService.debug("Unknown OSC code: ", { identifier: D, action: I, data: U });
          }), this._parser.setDcsHandlerFallback((D, I, U) => {
            I === "HOOK" && (U = U.toArray()), this._logService.debug("Unknown DCS code: ", { identifier: this._parser.identToString(D), action: I, payload: U });
          }), this._parser.setPrintHandler((D, I, U) => this.print(D, I, U)), this._parser.registerCsiHandler({ final: "@" }, (D) => this.insertChars(D)), this._parser.registerCsiHandler({ intermediates: " ", final: "@" }, (D) => this.scrollLeft(D)), this._parser.registerCsiHandler({ final: "A" }, (D) => this.cursorUp(D)), this._parser.registerCsiHandler({ intermediates: " ", final: "A" }, (D) => this.scrollRight(D)), this._parser.registerCsiHandler({ final: "B" }, (D) => this.cursorDown(D)), this._parser.registerCsiHandler({ final: "C" }, (D) => this.cursorForward(D)), this._parser.registerCsiHandler({ final: "D" }, (D) => this.cursorBackward(D)), this._parser.registerCsiHandler({ final: "E" }, (D) => this.cursorNextLine(D)), this._parser.registerCsiHandler({ final: "F" }, (D) => this.cursorPrecedingLine(D)), this._parser.registerCsiHandler({ final: "G" }, (D) => this.cursorCharAbsolute(D)), this._parser.registerCsiHandler({ final: "H" }, (D) => this.cursorPosition(D)), this._parser.registerCsiHandler({ final: "I" }, (D) => this.cursorForwardTab(D)), this._parser.registerCsiHandler({ final: "J" }, (D) => this.eraseInDisplay(D, !1)), this._parser.registerCsiHandler({ prefix: "?", final: "J" }, (D) => this.eraseInDisplay(D, !0)), this._parser.registerCsiHandler({ final: "K" }, (D) => this.eraseInLine(D, !1)), this._parser.registerCsiHandler({ prefix: "?", final: "K" }, (D) => this.eraseInLine(D, !0)), this._parser.registerCsiHandler({ final: "L" }, (D) => this.insertLines(D)), this._parser.registerCsiHandler({ final: "M" }, (D) => this.deleteLines(D)), this._parser.registerCsiHandler({ final: "P" }, (D) => this.deleteChars(D)), this._parser.registerCsiHandler({ final: "S" }, (D) => this.scrollUp(D)), this._parser.registerCsiHandler({ final: "T" }, (D) => this.scrollDown(D)), this._parser.registerCsiHandler({ final: "X" }, (D) => this.eraseChars(D)), this._parser.registerCsiHandler({ final: "Z" }, (D) => this.cursorBackwardTab(D)), this._parser.registerCsiHandler({ final: "`" }, (D) => this.charPosAbsolute(D)), this._parser.registerCsiHandler({ final: "a" }, (D) => this.hPositionRelative(D)), this._parser.registerCsiHandler({ final: "b" }, (D) => this.repeatPrecedingCharacter(D)), this._parser.registerCsiHandler({ final: "c" }, (D) => this.sendDeviceAttributesPrimary(D)), this._parser.registerCsiHandler({ prefix: ">", final: "c" }, (D) => this.sendDeviceAttributesSecondary(D)), this._parser.registerCsiHandler({ final: "d" }, (D) => this.linePosAbsolute(D)), this._parser.registerCsiHandler({ final: "e" }, (D) => this.vPositionRelative(D)), this._parser.registerCsiHandler({ final: "f" }, (D) => this.hVPosition(D)), this._parser.registerCsiHandler({ final: "g" }, (D) => this.tabClear(D)), this._parser.registerCsiHandler({ final: "h" }, (D) => this.setMode(D)), this._parser.registerCsiHandler({ prefix: "?", final: "h" }, (D) => this.setModePrivate(D)), this._parser.registerCsiHandler({ final: "l" }, (D) => this.resetMode(D)), this._parser.registerCsiHandler({ prefix: "?", final: "l" }, (D) => this.resetModePrivate(D)), this._parser.registerCsiHandler({ final: "m" }, (D) => this.charAttributes(D)), this._parser.registerCsiHandler({ final: "n" }, (D) => this.deviceStatus(D)), this._parser.registerCsiHandler({ prefix: "?", final: "n" }, (D) => this.deviceStatusPrivate(D)), this._parser.registerCsiHandler({ intermediates: "!", final: "p" }, (D) => this.softReset(D)), this._parser.registerCsiHandler({ intermediates: " ", final: "q" }, (D) => this.setCursorStyle(D)), this._parser.registerCsiHandler({ final: "r" }, (D) => this.setScrollRegion(D)), this._parser.registerCsiHandler({ final: "s" }, (D) => this.saveCursor(D)), this._parser.registerCsiHandler({ final: "t" }, (D) => this.windowOptions(D)), this._parser.registerCsiHandler({ final: "u" }, (D) => this.restoreCursor(D)), this._parser.registerCsiHandler({ intermediates: "'", final: "}" }, (D) => this.insertColumns(D)), this._parser.registerCsiHandler({ intermediates: "'", final: "~" }, (D) => this.deleteColumns(D)), this._parser.registerCsiHandler({ intermediates: '"', final: "q" }, (D) => this.selectProtected(D)), this._parser.registerCsiHandler({ intermediates: "$", final: "p" }, (D) => this.requestMode(D, !0)), this._parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, (D) => this.requestMode(D, !1)), this._parser.setExecuteHandler(d.C0.BEL, () => this.bell()), this._parser.setExecuteHandler(d.C0.LF, () => this.lineFeed()), this._parser.setExecuteHandler(d.C0.VT, () => this.lineFeed()), this._parser.setExecuteHandler(d.C0.FF, () => this.lineFeed()), this._parser.setExecuteHandler(d.C0.CR, () => this.carriageReturn()), this._parser.setExecuteHandler(d.C0.BS, () => this.backspace()), this._parser.setExecuteHandler(d.C0.HT, () => this.tab()), this._parser.setExecuteHandler(d.C0.SO, () => this.shiftOut()), this._parser.setExecuteHandler(d.C0.SI, () => this.shiftIn()), this._parser.setExecuteHandler(d.C1.IND, () => this.index()), this._parser.setExecuteHandler(d.C1.NEL, () => this.nextLine()), this._parser.setExecuteHandler(d.C1.HTS, () => this.tabSet()), this._parser.registerOscHandler(0, new w.OscHandler((D) => (this.setTitle(D), this.setIconName(D), !0))), this._parser.registerOscHandler(1, new w.OscHandler((D) => this.setIconName(D))), this._parser.registerOscHandler(2, new w.OscHandler((D) => this.setTitle(D))), this._parser.registerOscHandler(4, new w.OscHandler((D) => this.setOrReportIndexedColor(D))), this._parser.registerOscHandler(8, new w.OscHandler((D) => this.setHyperlink(D))), this._parser.registerOscHandler(10, new w.OscHandler((D) => this.setOrReportFgColor(D))), this._parser.registerOscHandler(11, new w.OscHandler((D) => this.setOrReportBgColor(D))), this._parser.registerOscHandler(12, new w.OscHandler((D) => this.setOrReportCursorColor(D))), this._parser.registerOscHandler(104, new w.OscHandler((D) => this.restoreIndexedColor(D))), this._parser.registerOscHandler(110, new w.OscHandler((D) => this.restoreFgColor(D))), this._parser.registerOscHandler(111, new w.OscHandler((D) => this.restoreBgColor(D))), this._parser.registerOscHandler(112, new w.OscHandler((D) => this.restoreCursorColor(D))), this._parser.registerEscHandler({ final: "7" }, () => this.saveCursor()), this._parser.registerEscHandler({ final: "8" }, () => this.restoreCursor()), this._parser.registerEscHandler({ final: "D" }, () => this.index()), this._parser.registerEscHandler({ final: "E" }, () => this.nextLine()), this._parser.registerEscHandler({ final: "H" }, () => this.tabSet()), this._parser.registerEscHandler({ final: "M" }, () => this.reverseIndex()), this._parser.registerEscHandler({ final: "=" }, () => this.keypadApplicationMode()), this._parser.registerEscHandler({ final: ">" }, () => this.keypadNumericMode()), this._parser.registerEscHandler({ final: "c" }, () => this.fullReset()), this._parser.registerEscHandler({ final: "n" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "o" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "|" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "}" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "~" }, () => this.setgLevel(1)), this._parser.registerEscHandler({ intermediates: "%", final: "@" }, () => this.selectDefaultCharset()), this._parser.registerEscHandler({ intermediates: "%", final: "G" }, () => this.selectDefaultCharset());
          for (const D in f.CHARSETS) this._parser.registerEscHandler({ intermediates: "(", final: D }, () => this.selectCharset("(" + D)), this._parser.registerEscHandler({ intermediates: ")", final: D }, () => this.selectCharset(")" + D)), this._parser.registerEscHandler({ intermediates: "*", final: D }, () => this.selectCharset("*" + D)), this._parser.registerEscHandler({ intermediates: "+", final: D }, () => this.selectCharset("+" + D)), this._parser.registerEscHandler({ intermediates: "-", final: D }, () => this.selectCharset("-" + D)), this._parser.registerEscHandler({ intermediates: ".", final: D }, () => this.selectCharset("." + D)), this._parser.registerEscHandler({ intermediates: "/", final: D }, () => this.selectCharset("/" + D));
          this._parser.registerEscHandler({ intermediates: "#", final: "8" }, () => this.screenAlignmentPattern()), this._parser.setErrorHandler((D) => (this._logService.error("Parsing error: ", D), D)), this._parser.registerDcsHandler({ intermediates: "$", final: "q" }, new k.DcsHandler((D, I) => this.requestStatusString(D, I)));
        }
        _preserveStack(E, R, P, O) {
          this._parseStack.paused = !0, this._parseStack.cursorStartX = E, this._parseStack.cursorStartY = R, this._parseStack.decodedLength = P, this._parseStack.position = O;
        }
        _logSlowResolvingAsync(E) {
          this._logService.logLevel <= S.LogLevelEnum.WARN && Promise.race([E, new Promise((R, P) => setTimeout(() => P("#SLOW_TIMEOUT"), 5e3))]).catch((R) => {
            if (R !== "#SLOW_TIMEOUT") throw R;
            console.warn("async parser handler taking longer than 5000 ms");
          });
        }
        _getCurrentLinkId() {
          return this._curAttrData.extended.urlId;
        }
        parse(E, R) {
          let P, O = this._activeBuffer.x, j = this._activeBuffer.y, q = 0;
          const X = this._parseStack.paused;
          if (X) {
            if (P = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, R)) return this._logSlowResolvingAsync(P), P;
            O = this._parseStack.cursorStartX, j = this._parseStack.cursorStartY, this._parseStack.paused = !1, E.length > A && (q = this._parseStack.position + A);
          }
          if (this._logService.logLevel <= S.LogLevelEnum.DEBUG && this._logService.debug("parsing data" + (typeof E == "string" ? ` "${E}"` : ` "${Array.prototype.map.call(E, (Y) => String.fromCharCode(Y)).join("")}"`), typeof E == "string" ? E.split("").map((Y) => Y.charCodeAt(0)) : E), this._parseBuffer.length < E.length && this._parseBuffer.length < A && (this._parseBuffer = new Uint32Array(Math.min(E.length, A))), X || this._dirtyRowTracker.clearRange(), E.length > A) for (let Y = q; Y < E.length; Y += A) {
            const se = Y + A < E.length ? Y + A : E.length, D = typeof E == "string" ? this._stringDecoder.decode(E.substring(Y, se), this._parseBuffer) : this._utf8Decoder.decode(E.subarray(Y, se), this._parseBuffer);
            if (P = this._parser.parse(this._parseBuffer, D)) return this._preserveStack(O, j, D, Y), this._logSlowResolvingAsync(P), P;
          }
          else if (!X) {
            const Y = typeof E == "string" ? this._stringDecoder.decode(E, this._parseBuffer) : this._utf8Decoder.decode(E, this._parseBuffer);
            if (P = this._parser.parse(this._parseBuffer, Y)) return this._preserveStack(O, j, Y, 0), this._logSlowResolvingAsync(P), P;
          }
          this._activeBuffer.x === O && this._activeBuffer.y === j || this._onCursorMove.fire(), this._onRequestRefreshRows.fire(this._dirtyRowTracker.start, this._dirtyRowTracker.end);
        }
        print(E, R, P) {
          let O, j;
          const q = this._charsetService.charset, X = this._optionsService.rawOptions.screenReaderMode, Y = this._bufferService.cols, se = this._coreService.decPrivateModes.wraparound, D = this._coreService.modes.insertMode, I = this._curAttrData;
          let U = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._activeBuffer.x && P - R > 0 && U.getWidth(this._activeBuffer.x - 1) === 2 && U.setCellFromCodePoint(this._activeBuffer.x - 1, 0, 1, I.fg, I.bg, I.extended);
          for (let W = R; W < P; ++W) {
            if (O = E[W], j = this._unicodeService.wcwidth(O), O < 127 && q) {
              const J = q[String.fromCharCode(O)];
              J && (O = J.charCodeAt(0));
            }
            if (X && this._onA11yChar.fire((0, v.stringFromCodePoint)(O)), this._getCurrentLinkId() && this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y), j || !this._activeBuffer.x) {
              if (this._activeBuffer.x + j - 1 >= Y) {
                if (se) {
                  for (; this._activeBuffer.x < Y; ) U.setCellFromCodePoint(this._activeBuffer.x++, 0, 1, I.fg, I.bg, I.extended);
                  this._activeBuffer.x = 0, this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData(), !0)) : (this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !0), U = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
                } else if (this._activeBuffer.x = Y - 1, j === 2) continue;
              }
              if (D && (U.insertCells(this._activeBuffer.x, j, this._activeBuffer.getNullCell(I), I), U.getWidth(Y - 1) === 2 && U.setCellFromCodePoint(Y - 1, g.NULL_CELL_CODE, g.NULL_CELL_WIDTH, I.fg, I.bg, I.extended)), U.setCellFromCodePoint(this._activeBuffer.x++, O, j, I.fg, I.bg, I.extended), j > 0) for (; --j; ) U.setCellFromCodePoint(this._activeBuffer.x++, 0, 0, I.fg, I.bg, I.extended);
            } else U.getWidth(this._activeBuffer.x - 1) ? U.addCodepointToCell(this._activeBuffer.x - 1, O) : U.addCodepointToCell(this._activeBuffer.x - 2, O);
          }
          P - R > 0 && (U.loadCell(this._activeBuffer.x - 1, this._workCell), this._workCell.getWidth() === 2 || this._workCell.getCode() > 65535 ? this._parser.precedingCodepoint = 0 : this._workCell.isCombined() ? this._parser.precedingCodepoint = this._workCell.getChars().charCodeAt(0) : this._parser.precedingCodepoint = this._workCell.content), this._activeBuffer.x < Y && P - R > 0 && U.getWidth(this._activeBuffer.x) === 0 && !U.hasContent(this._activeBuffer.x) && U.setCellFromCodePoint(this._activeBuffer.x, 0, 1, I.fg, I.bg, I.extended), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        registerCsiHandler(E, R) {
          return E.final !== "t" || E.prefix || E.intermediates ? this._parser.registerCsiHandler(E, R) : this._parser.registerCsiHandler(E, (P) => !L(P.params[0], this._optionsService.rawOptions.windowOptions) || R(P));
        }
        registerDcsHandler(E, R) {
          return this._parser.registerDcsHandler(E, new k.DcsHandler(R));
        }
        registerEscHandler(E, R) {
          return this._parser.registerEscHandler(E, R);
        }
        registerOscHandler(E, R) {
          return this._parser.registerOscHandler(E, new w.OscHandler(R));
        }
        bell() {
          return this._onRequestBell.fire(), !0;
        }
        lineFeed() {
          return this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows ? this._activeBuffer.y = this._bufferService.rows - 1 : this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !1, this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--, this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._onLineFeed.fire(), !0;
        }
        carriageReturn() {
          return this._activeBuffer.x = 0, !0;
        }
        backspace() {
          var E;
          if (!this._coreService.decPrivateModes.reverseWraparound) return this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, !0;
          if (this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0) this._activeBuffer.x--;
          else if (this._activeBuffer.x === 0 && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && (!((E = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)) === null || E === void 0) && E.isWrapped)) {
            this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !1, this._activeBuffer.y--, this._activeBuffer.x = this._bufferService.cols - 1;
            const R = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            R.hasWidth(this._activeBuffer.x) && !R.hasContent(this._activeBuffer.x) && this._activeBuffer.x--;
          }
          return this._restrictCursor(), !0;
        }
        tab() {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          const E = this._activeBuffer.x;
          return this._activeBuffer.x = this._activeBuffer.nextStop(), this._optionsService.rawOptions.screenReaderMode && this._onA11yTab.fire(this._activeBuffer.x - E), !0;
        }
        shiftOut() {
          return this._charsetService.setgLevel(1), !0;
        }
        shiftIn() {
          return this._charsetService.setgLevel(0), !0;
        }
        _restrictCursor(E = this._bufferService.cols - 1) {
          this._activeBuffer.x = Math.min(E, Math.max(0, this._activeBuffer.x)), this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y)), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        _setCursor(E, R) {
          this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._coreService.decPrivateModes.origin ? (this._activeBuffer.x = E, this._activeBuffer.y = this._activeBuffer.scrollTop + R) : (this._activeBuffer.x = E, this._activeBuffer.y = R), this._restrictCursor(), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        _moveCursor(E, R) {
          this._restrictCursor(), this._setCursor(this._activeBuffer.x + E, this._activeBuffer.y + R);
        }
        cursorUp(E) {
          const R = this._activeBuffer.y - this._activeBuffer.scrollTop;
          return R >= 0 ? this._moveCursor(0, -Math.min(R, E.params[0] || 1)) : this._moveCursor(0, -(E.params[0] || 1)), !0;
        }
        cursorDown(E) {
          const R = this._activeBuffer.scrollBottom - this._activeBuffer.y;
          return R >= 0 ? this._moveCursor(0, Math.min(R, E.params[0] || 1)) : this._moveCursor(0, E.params[0] || 1), !0;
        }
        cursorForward(E) {
          return this._moveCursor(E.params[0] || 1, 0), !0;
        }
        cursorBackward(E) {
          return this._moveCursor(-(E.params[0] || 1), 0), !0;
        }
        cursorNextLine(E) {
          return this.cursorDown(E), this._activeBuffer.x = 0, !0;
        }
        cursorPrecedingLine(E) {
          return this.cursorUp(E), this._activeBuffer.x = 0, !0;
        }
        cursorCharAbsolute(E) {
          return this._setCursor((E.params[0] || 1) - 1, this._activeBuffer.y), !0;
        }
        cursorPosition(E) {
          return this._setCursor(E.length >= 2 ? (E.params[1] || 1) - 1 : 0, (E.params[0] || 1) - 1), !0;
        }
        charPosAbsolute(E) {
          return this._setCursor((E.params[0] || 1) - 1, this._activeBuffer.y), !0;
        }
        hPositionRelative(E) {
          return this._moveCursor(E.params[0] || 1, 0), !0;
        }
        linePosAbsolute(E) {
          return this._setCursor(this._activeBuffer.x, (E.params[0] || 1) - 1), !0;
        }
        vPositionRelative(E) {
          return this._moveCursor(0, E.params[0] || 1), !0;
        }
        hVPosition(E) {
          return this.cursorPosition(E), !0;
        }
        tabClear(E) {
          const R = E.params[0];
          return R === 0 ? delete this._activeBuffer.tabs[this._activeBuffer.x] : R === 3 && (this._activeBuffer.tabs = {}), !0;
        }
        cursorForwardTab(E) {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          let R = E.params[0] || 1;
          for (; R--; ) this._activeBuffer.x = this._activeBuffer.nextStop();
          return !0;
        }
        cursorBackwardTab(E) {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          let R = E.params[0] || 1;
          for (; R--; ) this._activeBuffer.x = this._activeBuffer.prevStop();
          return !0;
        }
        selectProtected(E) {
          const R = E.params[0];
          return R === 1 && (this._curAttrData.bg |= 536870912), R !== 2 && R !== 0 || (this._curAttrData.bg &= -536870913), !0;
        }
        _eraseInBufferLine(E, R, P, O = !1, j = !1) {
          const q = this._activeBuffer.lines.get(this._activeBuffer.ybase + E);
          q.replaceCells(R, P, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData(), j), O && (q.isWrapped = !1);
        }
        _resetBufferLine(E, R = !1) {
          const P = this._activeBuffer.lines.get(this._activeBuffer.ybase + E);
          P && (P.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), R), this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + E), P.isWrapped = !1);
        }
        eraseInDisplay(E, R = !1) {
          let P;
          switch (this._restrictCursor(this._bufferService.cols), E.params[0]) {
            case 0:
              for (P = this._activeBuffer.y, this._dirtyRowTracker.markDirty(P), this._eraseInBufferLine(P++, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, R); P < this._bufferService.rows; P++) this._resetBufferLine(P, R);
              this._dirtyRowTracker.markDirty(P);
              break;
            case 1:
              for (P = this._activeBuffer.y, this._dirtyRowTracker.markDirty(P), this._eraseInBufferLine(P, 0, this._activeBuffer.x + 1, !0, R), this._activeBuffer.x + 1 >= this._bufferService.cols && (this._activeBuffer.lines.get(P + 1).isWrapped = !1); P--; ) this._resetBufferLine(P, R);
              this._dirtyRowTracker.markDirty(0);
              break;
            case 2:
              for (P = this._bufferService.rows, this._dirtyRowTracker.markDirty(P - 1); P--; ) this._resetBufferLine(P, R);
              this._dirtyRowTracker.markDirty(0);
              break;
            case 3:
              const O = this._activeBuffer.lines.length - this._bufferService.rows;
              O > 0 && (this._activeBuffer.lines.trimStart(O), this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - O, 0), this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - O, 0), this._onScroll.fire(0));
          }
          return !0;
        }
        eraseInLine(E, R = !1) {
          switch (this._restrictCursor(this._bufferService.cols), E.params[0]) {
            case 0:
              this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, R);
              break;
            case 1:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, !1, R);
              break;
            case 2:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, !0, R);
          }
          return this._dirtyRowTracker.markDirty(this._activeBuffer.y), !0;
        }
        insertLines(E) {
          this._restrictCursor();
          let R = E.params[0] || 1;
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const P = this._activeBuffer.ybase + this._activeBuffer.y, O = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, j = this._bufferService.rows - 1 + this._activeBuffer.ybase - O + 1;
          for (; R--; ) this._activeBuffer.lines.splice(j - 1, 1), this._activeBuffer.lines.splice(P, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, !0;
        }
        deleteLines(E) {
          this._restrictCursor();
          let R = E.params[0] || 1;
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const P = this._activeBuffer.ybase + this._activeBuffer.y;
          let O;
          for (O = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, O = this._bufferService.rows - 1 + this._activeBuffer.ybase - O; R--; ) this._activeBuffer.lines.splice(P, 1), this._activeBuffer.lines.splice(O, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, !0;
        }
        insertChars(E) {
          this._restrictCursor();
          const R = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return R && (R.insertCells(this._activeBuffer.x, E.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
        }
        deleteChars(E) {
          this._restrictCursor();
          const R = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return R && (R.deleteCells(this._activeBuffer.x, E.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
        }
        scrollUp(E) {
          let R = E.params[0] || 1;
          for (; R--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        scrollDown(E) {
          let R = E.params[0] || 1;
          for (; R--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(h.DEFAULT_ATTR_DATA));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        scrollLeft(E) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const R = E.params[0] || 1;
          for (let P = this._activeBuffer.scrollTop; P <= this._activeBuffer.scrollBottom; ++P) {
            const O = this._activeBuffer.lines.get(this._activeBuffer.ybase + P);
            O.deleteCells(0, R, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), O.isWrapped = !1;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        scrollRight(E) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const R = E.params[0] || 1;
          for (let P = this._activeBuffer.scrollTop; P <= this._activeBuffer.scrollBottom; ++P) {
            const O = this._activeBuffer.lines.get(this._activeBuffer.ybase + P);
            O.insertCells(0, R, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), O.isWrapped = !1;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        insertColumns(E) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const R = E.params[0] || 1;
          for (let P = this._activeBuffer.scrollTop; P <= this._activeBuffer.scrollBottom; ++P) {
            const O = this._activeBuffer.lines.get(this._activeBuffer.ybase + P);
            O.insertCells(this._activeBuffer.x, R, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), O.isWrapped = !1;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        deleteColumns(E) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
          const R = E.params[0] || 1;
          for (let P = this._activeBuffer.scrollTop; P <= this._activeBuffer.scrollBottom; ++P) {
            const O = this._activeBuffer.lines.get(this._activeBuffer.ybase + P);
            O.deleteCells(this._activeBuffer.x, R, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), O.isWrapped = !1;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
        }
        eraseChars(E) {
          this._restrictCursor();
          const R = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return R && (R.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (E.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
        }
        repeatPrecedingCharacter(E) {
          if (!this._parser.precedingCodepoint) return !0;
          const R = E.params[0] || 1, P = new Uint32Array(R);
          for (let O = 0; O < R; ++O) P[O] = this._parser.precedingCodepoint;
          return this.print(P, 0, P.length), !0;
        }
        sendDeviceAttributesPrimary(E) {
          return E.params[0] > 0 || (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen") ? this._coreService.triggerDataEvent(d.C0.ESC + "[?1;2c") : this._is("linux") && this._coreService.triggerDataEvent(d.C0.ESC + "[?6c")), !0;
        }
        sendDeviceAttributesSecondary(E) {
          return E.params[0] > 0 || (this._is("xterm") ? this._coreService.triggerDataEvent(d.C0.ESC + "[>0;276;0c") : this._is("rxvt-unicode") ? this._coreService.triggerDataEvent(d.C0.ESC + "[>85;95;0c") : this._is("linux") ? this._coreService.triggerDataEvent(E.params[0] + "c") : this._is("screen") && this._coreService.triggerDataEvent(d.C0.ESC + "[>83;40003;0c")), !0;
        }
        _is(E) {
          return (this._optionsService.rawOptions.termName + "").indexOf(E) === 0;
        }
        setMode(E) {
          for (let R = 0; R < E.length; R++) switch (E.params[R]) {
            case 4:
              this._coreService.modes.insertMode = !0;
              break;
            case 20:
              this._optionsService.options.convertEol = !0;
          }
          return !0;
        }
        setModePrivate(E) {
          for (let R = 0; R < E.length; R++) switch (E.params[R]) {
            case 1:
              this._coreService.decPrivateModes.applicationCursorKeys = !0;
              break;
            case 2:
              this._charsetService.setgCharset(0, f.DEFAULT_CHARSET), this._charsetService.setgCharset(1, f.DEFAULT_CHARSET), this._charsetService.setgCharset(2, f.DEFAULT_CHARSET), this._charsetService.setgCharset(3, f.DEFAULT_CHARSET);
              break;
            case 3:
              this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(132, this._bufferService.rows), this._onRequestReset.fire());
              break;
            case 6:
              this._coreService.decPrivateModes.origin = !0, this._setCursor(0, 0);
              break;
            case 7:
              this._coreService.decPrivateModes.wraparound = !0;
              break;
            case 12:
              this._optionsService.options.cursorBlink = !0;
              break;
            case 45:
              this._coreService.decPrivateModes.reverseWraparound = !0;
              break;
            case 66:
              this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = !0, this._onRequestSyncScrollBar.fire();
              break;
            case 9:
              this._coreMouseService.activeProtocol = "X10";
              break;
            case 1e3:
              this._coreMouseService.activeProtocol = "VT200";
              break;
            case 1002:
              this._coreMouseService.activeProtocol = "DRAG";
              break;
            case 1003:
              this._coreMouseService.activeProtocol = "ANY";
              break;
            case 1004:
              this._coreService.decPrivateModes.sendFocus = !0, this._onRequestSendFocus.fire();
              break;
            case 1005:
              this._logService.debug("DECSET 1005 not supported (see #2507)");
              break;
            case 1006:
              this._coreMouseService.activeEncoding = "SGR";
              break;
            case 1015:
              this._logService.debug("DECSET 1015 not supported (see #2507)");
              break;
            case 1016:
              this._coreMouseService.activeEncoding = "SGR_PIXELS";
              break;
            case 25:
              this._coreService.isCursorHidden = !1;
              break;
            case 1048:
              this.saveCursor();
              break;
            case 1049:
              this.saveCursor();
            case 47:
            case 1047:
              this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()), this._coreService.isCursorInitialized = !0, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
              break;
            case 2004:
              this._coreService.decPrivateModes.bracketedPasteMode = !0;
          }
          return !0;
        }
        resetMode(E) {
          for (let R = 0; R < E.length; R++) switch (E.params[R]) {
            case 4:
              this._coreService.modes.insertMode = !1;
              break;
            case 20:
              this._optionsService.options.convertEol = !1;
          }
          return !0;
        }
        resetModePrivate(E) {
          for (let R = 0; R < E.length; R++) switch (E.params[R]) {
            case 1:
              this._coreService.decPrivateModes.applicationCursorKeys = !1;
              break;
            case 3:
              this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(80, this._bufferService.rows), this._onRequestReset.fire());
              break;
            case 6:
              this._coreService.decPrivateModes.origin = !1, this._setCursor(0, 0);
              break;
            case 7:
              this._coreService.decPrivateModes.wraparound = !1;
              break;
            case 12:
              this._optionsService.options.cursorBlink = !1;
              break;
            case 45:
              this._coreService.decPrivateModes.reverseWraparound = !1;
              break;
            case 66:
              this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = !1, this._onRequestSyncScrollBar.fire();
              break;
            case 9:
            case 1e3:
            case 1002:
            case 1003:
              this._coreMouseService.activeProtocol = "NONE";
              break;
            case 1004:
              this._coreService.decPrivateModes.sendFocus = !1;
              break;
            case 1005:
              this._logService.debug("DECRST 1005 not supported (see #2507)");
              break;
            case 1006:
            case 1016:
              this._coreMouseService.activeEncoding = "DEFAULT";
              break;
            case 1015:
              this._logService.debug("DECRST 1015 not supported (see #2507)");
              break;
            case 25:
              this._coreService.isCursorHidden = !0;
              break;
            case 1048:
              this.restoreCursor();
              break;
            case 1049:
            case 47:
            case 1047:
              this._bufferService.buffers.activateNormalBuffer(), E.params[R] === 1049 && this.restoreCursor(), this._coreService.isCursorInitialized = !0, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
              break;
            case 2004:
              this._coreService.decPrivateModes.bracketedPasteMode = !1;
          }
          return !0;
        }
        requestMode(E, R) {
          const P = this._coreService.decPrivateModes, { activeProtocol: O, activeEncoding: j } = this._coreMouseService, q = this._coreService, { buffers: X, cols: Y } = this._bufferService, { active: se, alt: D } = X, I = this._optionsService.rawOptions, U = (re) => re ? 1 : 2, W = E.params[0];
          return J = W, K = R ? W === 2 ? 4 : W === 4 ? U(q.modes.insertMode) : W === 12 ? 3 : W === 20 ? U(I.convertEol) : 0 : W === 1 ? U(P.applicationCursorKeys) : W === 3 ? I.windowOptions.setWinLines ? Y === 80 ? 2 : Y === 132 ? 1 : 0 : 0 : W === 6 ? U(P.origin) : W === 7 ? U(P.wraparound) : W === 8 ? 3 : W === 9 ? U(O === "X10") : W === 12 ? U(I.cursorBlink) : W === 25 ? U(!q.isCursorHidden) : W === 45 ? U(P.reverseWraparound) : W === 66 ? U(P.applicationKeypad) : W === 67 ? 4 : W === 1e3 ? U(O === "VT200") : W === 1002 ? U(O === "DRAG") : W === 1003 ? U(O === "ANY") : W === 1004 ? U(P.sendFocus) : W === 1005 ? 4 : W === 1006 ? U(j === "SGR") : W === 1015 ? 4 : W === 1016 ? U(j === "SGR_PIXELS") : W === 1048 ? 1 : W === 47 || W === 1047 || W === 1049 ? U(se === D) : W === 2004 ? U(P.bracketedPasteMode) : 0, q.triggerDataEvent(`${d.C0.ESC}[${R ? "" : "?"}${J};${K}$y`), !0;
          var J, K;
        }
        _updateAttrColor(E, R, P, O, j) {
          return R === 2 ? (E |= 50331648, E &= -16777216, E |= b.AttributeData.fromColorRGB([P, O, j])) : R === 5 && (E &= -50331904, E |= 33554432 | 255 & P), E;
        }
        _extractColor(E, R, P) {
          const O = [0, 0, -1, 0, 0, 0];
          let j = 0, q = 0;
          do {
            if (O[q + j] = E.params[R + q], E.hasSubParams(R + q)) {
              const X = E.getSubParams(R + q);
              let Y = 0;
              do
                O[1] === 5 && (j = 1), O[q + Y + 1 + j] = X[Y];
              while (++Y < X.length && Y + q + 1 + j < O.length);
              break;
            }
            if (O[1] === 5 && q + j >= 2 || O[1] === 2 && q + j >= 5) break;
            O[1] && (j = 1);
          } while (++q + R < E.length && q + j < O.length);
          for (let X = 2; X < O.length; ++X) O[X] === -1 && (O[X] = 0);
          switch (O[0]) {
            case 38:
              P.fg = this._updateAttrColor(P.fg, O[1], O[3], O[4], O[5]);
              break;
            case 48:
              P.bg = this._updateAttrColor(P.bg, O[1], O[3], O[4], O[5]);
              break;
            case 58:
              P.extended = P.extended.clone(), P.extended.underlineColor = this._updateAttrColor(P.extended.underlineColor, O[1], O[3], O[4], O[5]);
          }
          return q;
        }
        _processUnderline(E, R) {
          R.extended = R.extended.clone(), (!~E || E > 5) && (E = 1), R.extended.underlineStyle = E, R.fg |= 268435456, E === 0 && (R.fg &= -268435457), R.updateExtended();
        }
        _processSGR0(E) {
          E.fg = h.DEFAULT_ATTR_DATA.fg, E.bg = h.DEFAULT_ATTR_DATA.bg, E.extended = E.extended.clone(), E.extended.underlineStyle = 0, E.extended.underlineColor &= -67108864, E.updateExtended();
        }
        charAttributes(E) {
          if (E.length === 1 && E.params[0] === 0) return this._processSGR0(this._curAttrData), !0;
          const R = E.length;
          let P;
          const O = this._curAttrData;
          for (let j = 0; j < R; j++) P = E.params[j], P >= 30 && P <= 37 ? (O.fg &= -50331904, O.fg |= 16777216 | P - 30) : P >= 40 && P <= 47 ? (O.bg &= -50331904, O.bg |= 16777216 | P - 40) : P >= 90 && P <= 97 ? (O.fg &= -50331904, O.fg |= 16777224 | P - 90) : P >= 100 && P <= 107 ? (O.bg &= -50331904, O.bg |= 16777224 | P - 100) : P === 0 ? this._processSGR0(O) : P === 1 ? O.fg |= 134217728 : P === 3 ? O.bg |= 67108864 : P === 4 ? (O.fg |= 268435456, this._processUnderline(E.hasSubParams(j) ? E.getSubParams(j)[0] : 1, O)) : P === 5 ? O.fg |= 536870912 : P === 7 ? O.fg |= 67108864 : P === 8 ? O.fg |= 1073741824 : P === 9 ? O.fg |= 2147483648 : P === 2 ? O.bg |= 134217728 : P === 21 ? this._processUnderline(2, O) : P === 22 ? (O.fg &= -134217729, O.bg &= -134217729) : P === 23 ? O.bg &= -67108865 : P === 24 ? (O.fg &= -268435457, this._processUnderline(0, O)) : P === 25 ? O.fg &= -536870913 : P === 27 ? O.fg &= -67108865 : P === 28 ? O.fg &= -1073741825 : P === 29 ? O.fg &= 2147483647 : P === 39 ? (O.fg &= -67108864, O.fg |= 16777215 & h.DEFAULT_ATTR_DATA.fg) : P === 49 ? (O.bg &= -67108864, O.bg |= 16777215 & h.DEFAULT_ATTR_DATA.bg) : P === 38 || P === 48 || P === 58 ? j += this._extractColor(E, j, O) : P === 53 ? O.bg |= 1073741824 : P === 55 ? O.bg &= -1073741825 : P === 59 ? (O.extended = O.extended.clone(), O.extended.underlineColor = -1, O.updateExtended()) : P === 100 ? (O.fg &= -67108864, O.fg |= 16777215 & h.DEFAULT_ATTR_DATA.fg, O.bg &= -67108864, O.bg |= 16777215 & h.DEFAULT_ATTR_DATA.bg) : this._logService.debug("Unknown SGR attribute: %d.", P);
          return !0;
        }
        deviceStatus(E) {
          switch (E.params[0]) {
            case 5:
              this._coreService.triggerDataEvent(`${d.C0.ESC}[0n`);
              break;
            case 6:
              const R = this._activeBuffer.y + 1, P = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${d.C0.ESC}[${R};${P}R`);
          }
          return !0;
        }
        deviceStatusPrivate(E) {
          if (E.params[0] === 6) {
            const R = this._activeBuffer.y + 1, P = this._activeBuffer.x + 1;
            this._coreService.triggerDataEvent(`${d.C0.ESC}[?${R};${P}R`);
          }
          return !0;
        }
        softReset(E) {
          return this._coreService.isCursorHidden = !1, this._onRequestSyncScrollBar.fire(), this._activeBuffer.scrollTop = 0, this._activeBuffer.scrollBottom = this._bufferService.rows - 1, this._curAttrData = h.DEFAULT_ATTR_DATA.clone(), this._coreService.reset(), this._charsetService.reset(), this._activeBuffer.savedX = 0, this._activeBuffer.savedY = this._activeBuffer.ybase, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, this._coreService.decPrivateModes.origin = !1, !0;
        }
        setCursorStyle(E) {
          const R = E.params[0] || 1;
          switch (R) {
            case 1:
            case 2:
              this._optionsService.options.cursorStyle = "block";
              break;
            case 3:
            case 4:
              this._optionsService.options.cursorStyle = "underline";
              break;
            case 5:
            case 6:
              this._optionsService.options.cursorStyle = "bar";
          }
          const P = R % 2 == 1;
          return this._optionsService.options.cursorBlink = P, !0;
        }
        setScrollRegion(E) {
          const R = E.params[0] || 1;
          let P;
          return (E.length < 2 || (P = E.params[1]) > this._bufferService.rows || P === 0) && (P = this._bufferService.rows), P > R && (this._activeBuffer.scrollTop = R - 1, this._activeBuffer.scrollBottom = P - 1, this._setCursor(0, 0)), !0;
        }
        windowOptions(E) {
          if (!L(E.params[0], this._optionsService.rawOptions.windowOptions)) return !0;
          const R = E.length > 1 ? E.params[1] : 0;
          switch (E.params[0]) {
            case 14:
              R !== 2 && this._onRequestWindowsOptionsReport.fire(M.GET_WIN_SIZE_PIXELS);
              break;
            case 16:
              this._onRequestWindowsOptionsReport.fire(M.GET_CELL_SIZE_PIXELS);
              break;
            case 18:
              this._bufferService && this._coreService.triggerDataEvent(`${d.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
              break;
            case 22:
              R !== 0 && R !== 2 || (this._windowTitleStack.push(this._windowTitle), this._windowTitleStack.length > 10 && this._windowTitleStack.shift()), R !== 0 && R !== 1 || (this._iconNameStack.push(this._iconName), this._iconNameStack.length > 10 && this._iconNameStack.shift());
              break;
            case 23:
              R !== 0 && R !== 2 || this._windowTitleStack.length && this.setTitle(this._windowTitleStack.pop()), R !== 0 && R !== 1 || this._iconNameStack.length && this.setIconName(this._iconNameStack.pop());
          }
          return !0;
        }
        saveCursor(E) {
          return this._activeBuffer.savedX = this._activeBuffer.x, this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, !0;
        }
        restoreCursor(E) {
          return this._activeBuffer.x = this._activeBuffer.savedX || 0, this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0), this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg, this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg, this._charsetService.charset = this._savedCharset, this._activeBuffer.savedCharset && (this._charsetService.charset = this._activeBuffer.savedCharset), this._restrictCursor(), !0;
        }
        setTitle(E) {
          return this._windowTitle = E, this._onTitleChange.fire(E), !0;
        }
        setIconName(E) {
          return this._iconName = E, !0;
        }
        setOrReportIndexedColor(E) {
          const R = [], P = E.split(";");
          for (; P.length > 1; ) {
            const O = P.shift(), j = P.shift();
            if (/^\d+$/.exec(O)) {
              const q = parseInt(O);
              if (H(q)) if (j === "?") R.push({ type: 0, index: q });
              else {
                const X = (0, x.parseColor)(j);
                X && R.push({ type: 1, index: q, color: X });
              }
            }
          }
          return R.length && this._onColor.fire(R), !0;
        }
        setHyperlink(E) {
          const R = E.split(";");
          return !(R.length < 2) && (R[1] ? this._createHyperlink(R[0], R[1]) : !R[0] && this._finishHyperlink());
        }
        _createHyperlink(E, R) {
          this._getCurrentLinkId() && this._finishHyperlink();
          const P = E.split(":");
          let O;
          const j = P.findIndex((q) => q.startsWith("id="));
          return j !== -1 && (O = P[j].slice(3) || void 0), this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id: O, uri: R }), this._curAttrData.updateExtended(), !0;
        }
        _finishHyperlink() {
          return this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = 0, this._curAttrData.updateExtended(), !0;
        }
        _setOrReportSpecialColor(E, R) {
          const P = E.split(";");
          for (let O = 0; O < P.length && !(R >= this._specialColors.length); ++O, ++R) if (P[O] === "?") this._onColor.fire([{ type: 0, index: this._specialColors[R] }]);
          else {
            const j = (0, x.parseColor)(P[O]);
            j && this._onColor.fire([{ type: 1, index: this._specialColors[R], color: j }]);
          }
          return !0;
        }
        setOrReportFgColor(E) {
          return this._setOrReportSpecialColor(E, 0);
        }
        setOrReportBgColor(E) {
          return this._setOrReportSpecialColor(E, 1);
        }
        setOrReportCursorColor(E) {
          return this._setOrReportSpecialColor(E, 2);
        }
        restoreIndexedColor(E) {
          if (!E) return this._onColor.fire([{ type: 2 }]), !0;
          const R = [], P = E.split(";");
          for (let O = 0; O < P.length; ++O) if (/^\d+$/.exec(P[O])) {
            const j = parseInt(P[O]);
            H(j) && R.push({ type: 2, index: j });
          }
          return R.length && this._onColor.fire(R), !0;
        }
        restoreFgColor(E) {
          return this._onColor.fire([{ type: 2, index: 256 }]), !0;
        }
        restoreBgColor(E) {
          return this._onColor.fire([{ type: 2, index: 257 }]), !0;
        }
        restoreCursorColor(E) {
          return this._onColor.fire([{ type: 2, index: 258 }]), !0;
        }
        nextLine() {
          return this._activeBuffer.x = 0, this.index(), !0;
        }
        keypadApplicationMode() {
          return this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = !0, this._onRequestSyncScrollBar.fire(), !0;
        }
        keypadNumericMode() {
          return this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = !1, this._onRequestSyncScrollBar.fire(), !0;
        }
        selectDefaultCharset() {
          return this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, f.DEFAULT_CHARSET), !0;
        }
        selectCharset(E) {
          return E.length !== 2 ? (this.selectDefaultCharset(), !0) : (E[0] === "/" || this._charsetService.setgCharset(C[E[0]], f.CHARSETS[E[1]] || f.DEFAULT_CHARSET), !0);
        }
        index() {
          return this._restrictCursor(), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._restrictCursor(), !0;
        }
        tabSet() {
          return this._activeBuffer.tabs[this._activeBuffer.x] = !0, !0;
        }
        reverseIndex() {
          if (this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop) {
            const E = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
            this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, E, 1), this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData())), this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
          } else this._activeBuffer.y--, this._restrictCursor();
          return !0;
        }
        fullReset() {
          return this._parser.reset(), this._onRequestReset.fire(), !0;
        }
        reset() {
          this._curAttrData = h.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = h.DEFAULT_ATTR_DATA.clone();
        }
        _eraseAttrData() {
          return this._eraseAttrDataInternal.bg &= -67108864, this._eraseAttrDataInternal.bg |= 67108863 & this._curAttrData.bg, this._eraseAttrDataInternal;
        }
        setgLevel(E) {
          return this._charsetService.setgLevel(E), !0;
        }
        screenAlignmentPattern() {
          const E = new _.CellData();
          E.content = 4194373, E.fg = this._curAttrData.fg, E.bg = this._curAttrData.bg, this._setCursor(0, 0);
          for (let R = 0; R < this._bufferService.rows; ++R) {
            const P = this._activeBuffer.ybase + this._activeBuffer.y + R, O = this._activeBuffer.lines.get(P);
            O && (O.fill(E), O.isWrapped = !1);
          }
          return this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), !0;
        }
        requestStatusString(E, R) {
          const P = this._bufferService.buffer, O = this._optionsService.rawOptions;
          return ((j) => (this._coreService.triggerDataEvent(`${d.C0.ESC}${j}${d.C0.ESC}\\`), !0))(E === '"q' ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q` : E === '"p' ? 'P1$r61;1"p' : E === "r" ? `P1$r${P.scrollTop + 1};${P.scrollBottom + 1}r` : E === "m" ? "P1$r0m" : E === " q" ? `P1$r${{ block: 2, underline: 4, bar: 6 }[O.cursorStyle] - (O.cursorBlink ? 1 : 0)} q` : "P0$r");
        }
        markRangeDirty(E, R) {
          this._dirtyRowTracker.markRangeDirty(E, R);
        }
      }
      n.InputHandler = F;
      let $ = class {
        constructor(z) {
          this._bufferService = z, this.clearRange();
        }
        clearRange() {
          this.start = this._bufferService.buffer.y, this.end = this._bufferService.buffer.y;
        }
        markDirty(z) {
          z < this.start ? this.start = z : z > this.end && (this.end = z);
        }
        markRangeDirty(z, E) {
          z > E && (T = z, z = E, E = T), z < this.start && (this.start = z), E > this.end && (this.end = E);
        }
        markAllDirty() {
          this.markRangeDirty(0, this._bufferService.rows - 1);
        }
      };
      function H(z) {
        return 0 <= z && z < 256;
      }
      $ = c([u(0, S.IBufferService)], $);
    }, 844: (l, n) => {
      function a(c) {
        for (const u of c) u.dispose();
        c.length = 0;
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.getDisposeArrayDisposable = n.disposeArray = n.toDisposable = n.MutableDisposable = n.Disposable = void 0, n.Disposable = class {
        constructor() {
          this._disposables = [], this._isDisposed = !1;
        }
        dispose() {
          this._isDisposed = !0;
          for (const c of this._disposables) c.dispose();
          this._disposables.length = 0;
        }
        register(c) {
          return this._disposables.push(c), c;
        }
        unregister(c) {
          const u = this._disposables.indexOf(c);
          u !== -1 && this._disposables.splice(u, 1);
        }
      }, n.MutableDisposable = class {
        constructor() {
          this._isDisposed = !1;
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(c) {
          var u;
          this._isDisposed || c === this._value || ((u = this._value) === null || u === void 0 || u.dispose(), this._value = c);
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          var c;
          this._isDisposed = !0, (c = this._value) === null || c === void 0 || c.dispose(), this._value = void 0;
        }
      }, n.toDisposable = function(c) {
        return { dispose: c };
      }, n.disposeArray = a, n.getDisposeArrayDisposable = function(c) {
        return { dispose: () => a(c) };
      };
    }, 1505: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.FourKeyMap = n.TwoKeyMap = void 0;
      class a {
        constructor() {
          this._data = {};
        }
        set(u, d, f) {
          this._data[u] || (this._data[u] = {}), this._data[u][d] = f;
        }
        get(u, d) {
          return this._data[u] ? this._data[u][d] : void 0;
        }
        clear() {
          this._data = {};
        }
      }
      n.TwoKeyMap = a, n.FourKeyMap = class {
        constructor() {
          this._data = new a();
        }
        set(c, u, d, f, m) {
          this._data.get(c, u) || this._data.set(c, u, new a()), this._data.get(c, u).set(d, f, m);
        }
        get(c, u, d, f) {
          var m;
          return (m = this._data.get(c, u)) === null || m === void 0 ? void 0 : m.get(d, f);
        }
        clear() {
          this._data.clear();
        }
      };
    }, 6114: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.isChromeOS = n.isLinux = n.isWindows = n.isIphone = n.isIpad = n.isMac = n.getSafariVersion = n.isSafari = n.isLegacyEdge = n.isFirefox = n.isNode = void 0, n.isNode = typeof navigator > "u";
      const a = n.isNode ? "node" : navigator.userAgent, c = n.isNode ? "node" : navigator.platform;
      n.isFirefox = a.includes("Firefox"), n.isLegacyEdge = a.includes("Edge"), n.isSafari = /^((?!chrome|android).)*safari/i.test(a), n.getSafariVersion = function() {
        if (!n.isSafari) return 0;
        const u = a.match(/Version\/(\d+)/);
        return u === null || u.length < 2 ? 0 : parseInt(u[1]);
      }, n.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(c), n.isIpad = c === "iPad", n.isIphone = c === "iPhone", n.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(c), n.isLinux = c.indexOf("Linux") >= 0, n.isChromeOS = /\bCrOS\b/.test(a);
    }, 6106: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.SortedList = void 0;
      let a = 0;
      n.SortedList = class {
        constructor(c) {
          this._getKey = c, this._array = [];
        }
        clear() {
          this._array.length = 0;
        }
        insert(c) {
          this._array.length !== 0 ? (a = this._search(this._getKey(c)), this._array.splice(a, 0, c)) : this._array.push(c);
        }
        delete(c) {
          if (this._array.length === 0) return !1;
          const u = this._getKey(c);
          if (u === void 0 || (a = this._search(u), a === -1) || this._getKey(this._array[a]) !== u) return !1;
          do
            if (this._array[a] === c) return this._array.splice(a, 1), !0;
          while (++a < this._array.length && this._getKey(this._array[a]) === u);
          return !1;
        }
        *getKeyIterator(c) {
          if (this._array.length !== 0 && (a = this._search(c), !(a < 0 || a >= this._array.length) && this._getKey(this._array[a]) === c)) do
            yield this._array[a];
          while (++a < this._array.length && this._getKey(this._array[a]) === c);
        }
        forEachByKey(c, u) {
          if (this._array.length !== 0 && (a = this._search(c), !(a < 0 || a >= this._array.length) && this._getKey(this._array[a]) === c)) do
            u(this._array[a]);
          while (++a < this._array.length && this._getKey(this._array[a]) === c);
        }
        values() {
          return [...this._array].values();
        }
        _search(c) {
          let u = 0, d = this._array.length - 1;
          for (; d >= u; ) {
            let f = u + d >> 1;
            const m = this._getKey(this._array[f]);
            if (m > c) d = f - 1;
            else {
              if (!(m < c)) {
                for (; f > 0 && this._getKey(this._array[f - 1]) === c; ) f--;
                return f;
              }
              u = f + 1;
            }
          }
          return u;
        }
      };
    }, 7226: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DebouncedIdleTask = n.IdleTaskQueue = n.PriorityTaskQueue = void 0;
      const c = a(6114);
      class u {
        constructor() {
          this._tasks = [], this._i = 0;
        }
        enqueue(m) {
          this._tasks.push(m), this._start();
        }
        flush() {
          for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = void 0), this._i = 0, this._tasks.length = 0;
        }
        _start() {
          this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
        }
        _process(m) {
          this._idleCallback = void 0;
          let y = 0, v = 0, h = m.timeRemaining(), p = 0;
          for (; this._i < this._tasks.length; ) {
            if (y = Date.now(), this._tasks[this._i]() || this._i++, y = Math.max(1, Date.now() - y), v = Math.max(y, v), p = m.timeRemaining(), 1.5 * v > p) return h - y < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(h - y))}ms`), void this._start();
            h = p;
          }
          this.clear();
        }
      }
      class d extends u {
        _requestCallback(m) {
          return setTimeout(() => m(this._createDeadline(16)));
        }
        _cancelCallback(m) {
          clearTimeout(m);
        }
        _createDeadline(m) {
          const y = Date.now() + m;
          return { timeRemaining: () => Math.max(0, y - Date.now()) };
        }
      }
      n.PriorityTaskQueue = d, n.IdleTaskQueue = !c.isNode && "requestIdleCallback" in window ? class extends u {
        _requestCallback(f) {
          return requestIdleCallback(f);
        }
        _cancelCallback(f) {
          cancelIdleCallback(f);
        }
      } : d, n.DebouncedIdleTask = class {
        constructor() {
          this._queue = new n.IdleTaskQueue();
        }
        set(f) {
          this._queue.clear(), this._queue.enqueue(f);
        }
        flush() {
          this._queue.flush();
        }
      };
    }, 9282: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.updateWindowsModeWrappedState = void 0;
      const c = a(643);
      n.updateWindowsModeWrappedState = function(u) {
        const d = u.buffer.lines.get(u.buffer.ybase + u.buffer.y - 1), f = d == null ? void 0 : d.get(u.cols - 1), m = u.buffer.lines.get(u.buffer.ybase + u.buffer.y);
        m && f && (m.isWrapped = f[c.CHAR_DATA_CODE_INDEX] !== c.NULL_CELL_CODE && f[c.CHAR_DATA_CODE_INDEX] !== c.WHITESPACE_CELL_CODE);
      };
    }, 3734: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ExtendedAttrs = n.AttributeData = void 0;
      class a {
        constructor() {
          this.fg = 0, this.bg = 0, this.extended = new c();
        }
        static toColorRGB(d) {
          return [d >>> 16 & 255, d >>> 8 & 255, 255 & d];
        }
        static fromColorRGB(d) {
          return (255 & d[0]) << 16 | (255 & d[1]) << 8 | 255 & d[2];
        }
        clone() {
          const d = new a();
          return d.fg = this.fg, d.bg = this.bg, d.extended = this.extended.clone(), d;
        }
        isInverse() {
          return 67108864 & this.fg;
        }
        isBold() {
          return 134217728 & this.fg;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 ? 1 : 268435456 & this.fg;
        }
        isBlink() {
          return 536870912 & this.fg;
        }
        isInvisible() {
          return 1073741824 & this.fg;
        }
        isItalic() {
          return 67108864 & this.bg;
        }
        isDim() {
          return 134217728 & this.bg;
        }
        isStrikethrough() {
          return 2147483648 & this.fg;
        }
        isProtected() {
          return 536870912 & this.bg;
        }
        isOverline() {
          return 1073741824 & this.bg;
        }
        getFgColorMode() {
          return 50331648 & this.fg;
        }
        getBgColorMode() {
          return 50331648 & this.bg;
        }
        isFgRGB() {
          return (50331648 & this.fg) == 50331648;
        }
        isBgRGB() {
          return (50331648 & this.bg) == 50331648;
        }
        isFgPalette() {
          return (50331648 & this.fg) == 16777216 || (50331648 & this.fg) == 33554432;
        }
        isBgPalette() {
          return (50331648 & this.bg) == 16777216 || (50331648 & this.bg) == 33554432;
        }
        isFgDefault() {
          return (50331648 & this.fg) == 0;
        }
        isBgDefault() {
          return (50331648 & this.bg) == 0;
        }
        isAttributeDefault() {
          return this.fg === 0 && this.bg === 0;
        }
        getFgColor() {
          switch (50331648 & this.fg) {
            case 16777216:
            case 33554432:
              return 255 & this.fg;
            case 50331648:
              return 16777215 & this.fg;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (50331648 & this.bg) {
            case 16777216:
            case 33554432:
              return 255 & this.bg;
            case 50331648:
              return 16777215 & this.bg;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return 268435456 & this.bg;
        }
        updateExtended() {
          this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
        }
        getUnderlineColor() {
          if (268435456 & this.bg && ~this.extended.underlineColor) switch (50331648 & this.extended.underlineColor) {
            case 16777216:
            case 33554432:
              return 255 & this.extended.underlineColor;
            case 50331648:
              return 16777215 & this.extended.underlineColor;
            default:
              return this.getFgColor();
          }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 50331648 : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 16777216 || (50331648 & this.extended.underlineColor) == 33554432 : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 0 : this.isFgDefault();
        }
        getUnderlineStyle() {
          return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
        }
      }
      n.AttributeData = a;
      class c {
        get ext() {
          return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
        }
        set ext(d) {
          this._ext = d;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (469762048 & this._ext) >> 26;
        }
        set underlineStyle(d) {
          this._ext &= -469762049, this._ext |= d << 26 & 469762048;
        }
        get underlineColor() {
          return 67108863 & this._ext;
        }
        set underlineColor(d) {
          this._ext &= -67108864, this._ext |= 67108863 & d;
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(d) {
          this._urlId = d;
        }
        constructor(d = 0, f = 0) {
          this._ext = 0, this._urlId = 0, this._ext = d, this._urlId = f;
        }
        clone() {
          return new c(this._ext, this._urlId);
        }
        isEmpty() {
          return this.underlineStyle === 0 && this._urlId === 0;
        }
      }
      n.ExtendedAttrs = c;
    }, 9092: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Buffer = n.MAX_BUFFER_SIZE = void 0;
      const c = a(6349), u = a(7226), d = a(3734), f = a(8437), m = a(4634), y = a(511), v = a(643), h = a(4863), p = a(7116);
      n.MAX_BUFFER_SIZE = 4294967295, n.Buffer = class {
        constructor(g, _, b) {
          this._hasScrollback = g, this._optionsService = _, this._bufferService = b, this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.tabs = {}, this.savedY = 0, this.savedX = 0, this.savedCurAttrData = f.DEFAULT_ATTR_DATA.clone(), this.savedCharset = p.DEFAULT_CHARSET, this.markers = [], this._nullCell = y.CellData.fromCharData([0, v.NULL_CELL_CHAR, v.NULL_CELL_WIDTH, v.NULL_CELL_CODE]), this._whitespaceCell = y.CellData.fromCharData([0, v.WHITESPACE_CELL_CHAR, v.WHITESPACE_CELL_WIDTH, v.WHITESPACE_CELL_CODE]), this._isClearing = !1, this._memoryCleanupQueue = new u.IdleTaskQueue(), this._memoryCleanupPosition = 0, this._cols = this._bufferService.cols, this._rows = this._bufferService.rows, this.lines = new c.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
        }
        getNullCell(g) {
          return g ? (this._nullCell.fg = g.fg, this._nullCell.bg = g.bg, this._nullCell.extended = g.extended) : (this._nullCell.fg = 0, this._nullCell.bg = 0, this._nullCell.extended = new d.ExtendedAttrs()), this._nullCell;
        }
        getWhitespaceCell(g) {
          return g ? (this._whitespaceCell.fg = g.fg, this._whitespaceCell.bg = g.bg, this._whitespaceCell.extended = g.extended) : (this._whitespaceCell.fg = 0, this._whitespaceCell.bg = 0, this._whitespaceCell.extended = new d.ExtendedAttrs()), this._whitespaceCell;
        }
        getBlankLine(g, _) {
          return new f.BufferLine(this._bufferService.cols, this.getNullCell(g), _);
        }
        get hasScrollback() {
          return this._hasScrollback && this.lines.maxLength > this._rows;
        }
        get isCursorInViewport() {
          const g = this.ybase + this.y - this.ydisp;
          return g >= 0 && g < this._rows;
        }
        _getCorrectBufferLength(g) {
          if (!this._hasScrollback) return g;
          const _ = g + this._optionsService.rawOptions.scrollback;
          return _ > n.MAX_BUFFER_SIZE ? n.MAX_BUFFER_SIZE : _;
        }
        fillViewportRows(g) {
          if (this.lines.length === 0) {
            g === void 0 && (g = f.DEFAULT_ATTR_DATA);
            let _ = this._rows;
            for (; _--; ) this.lines.push(this.getBlankLine(g));
          }
        }
        clear() {
          this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.lines = new c.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
        }
        resize(g, _) {
          const b = this.getNullCell(f.DEFAULT_ATTR_DATA);
          let S = 0;
          const w = this._getCorrectBufferLength(_);
          if (w > this.lines.maxLength && (this.lines.maxLength = w), this.lines.length > 0) {
            if (this._cols < g) for (let x = 0; x < this.lines.length; x++) S += +this.lines.get(x).resize(g, b);
            let k = 0;
            if (this._rows < _) for (let x = this._rows; x < _; x++) this.lines.length < _ + this.ybase && (this._optionsService.rawOptions.windowsMode || this._optionsService.rawOptions.windowsPty.backend !== void 0 || this._optionsService.rawOptions.windowsPty.buildNumber !== void 0 ? this.lines.push(new f.BufferLine(g, b)) : this.ybase > 0 && this.lines.length <= this.ybase + this.y + k + 1 ? (this.ybase--, k++, this.ydisp > 0 && this.ydisp--) : this.lines.push(new f.BufferLine(g, b)));
            else for (let x = this._rows; x > _; x--) this.lines.length > _ + this.ybase && (this.lines.length > this.ybase + this.y + 1 ? this.lines.pop() : (this.ybase++, this.ydisp++));
            if (w < this.lines.maxLength) {
              const x = this.lines.length - w;
              x > 0 && (this.lines.trimStart(x), this.ybase = Math.max(this.ybase - x, 0), this.ydisp = Math.max(this.ydisp - x, 0), this.savedY = Math.max(this.savedY - x, 0)), this.lines.maxLength = w;
            }
            this.x = Math.min(this.x, g - 1), this.y = Math.min(this.y, _ - 1), k && (this.y += k), this.savedX = Math.min(this.savedX, g - 1), this.scrollTop = 0;
          }
          if (this.scrollBottom = _ - 1, this._isReflowEnabled && (this._reflow(g, _), this._cols > g)) for (let k = 0; k < this.lines.length; k++) S += +this.lines.get(k).resize(g, b);
          this._cols = g, this._rows = _, this._memoryCleanupQueue.clear(), S > 0.1 * this.lines.length && (this._memoryCleanupPosition = 0, this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup()));
        }
        _batchedMemoryCleanup() {
          let g = !0;
          this._memoryCleanupPosition >= this.lines.length && (this._memoryCleanupPosition = 0, g = !1);
          let _ = 0;
          for (; this._memoryCleanupPosition < this.lines.length; ) if (_ += this.lines.get(this._memoryCleanupPosition++).cleanupMemory(), _ > 100) return !0;
          return g;
        }
        get _isReflowEnabled() {
          const g = this._optionsService.rawOptions.windowsPty;
          return g && g.buildNumber ? this._hasScrollback && g.backend === "conpty" && g.buildNumber >= 21376 : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
        }
        _reflow(g, _) {
          this._cols !== g && (g > this._cols ? this._reflowLarger(g, _) : this._reflowSmaller(g, _));
        }
        _reflowLarger(g, _) {
          const b = (0, m.reflowLargerGetLinesToRemove)(this.lines, this._cols, g, this.ybase + this.y, this.getNullCell(f.DEFAULT_ATTR_DATA));
          if (b.length > 0) {
            const S = (0, m.reflowLargerCreateNewLayout)(this.lines, b);
            (0, m.reflowLargerApplyNewLayout)(this.lines, S.layout), this._reflowLargerAdjustViewport(g, _, S.countRemoved);
          }
        }
        _reflowLargerAdjustViewport(g, _, b) {
          const S = this.getNullCell(f.DEFAULT_ATTR_DATA);
          let w = b;
          for (; w-- > 0; ) this.ybase === 0 ? (this.y > 0 && this.y--, this.lines.length < _ && this.lines.push(new f.BufferLine(g, S))) : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
          this.savedY = Math.max(this.savedY - b, 0);
        }
        _reflowSmaller(g, _) {
          const b = this.getNullCell(f.DEFAULT_ATTR_DATA), S = [];
          let w = 0;
          for (let k = this.lines.length - 1; k >= 0; k--) {
            let x = this.lines.get(k);
            if (!x || !x.isWrapped && x.getTrimmedLength() <= g) continue;
            const C = [x];
            for (; x.isWrapped && k > 0; ) x = this.lines.get(--k), C.unshift(x);
            const A = this.ybase + this.y;
            if (A >= k && A < k + C.length) continue;
            const L = C[C.length - 1].getTrimmedLength(), M = (0, m.reflowSmallerGetNewLineLengths)(C, this._cols, g), T = M.length - C.length;
            let F;
            F = this.ybase === 0 && this.y !== this.lines.length - 1 ? Math.max(0, this.y - this.lines.maxLength + T) : Math.max(0, this.lines.length - this.lines.maxLength + T);
            const $ = [];
            for (let O = 0; O < T; O++) {
              const j = this.getBlankLine(f.DEFAULT_ATTR_DATA, !0);
              $.push(j);
            }
            $.length > 0 && (S.push({ start: k + C.length + w, newLines: $ }), w += $.length), C.push(...$);
            let H = M.length - 1, z = M[H];
            z === 0 && (H--, z = M[H]);
            let E = C.length - T - 1, R = L;
            for (; E >= 0; ) {
              const O = Math.min(R, z);
              if (C[H] === void 0) break;
              if (C[H].copyCellsFrom(C[E], R - O, z - O, O, !0), z -= O, z === 0 && (H--, z = M[H]), R -= O, R === 0) {
                E--;
                const j = Math.max(E, 0);
                R = (0, m.getWrappedLineTrimmedLength)(C, j, this._cols);
              }
            }
            for (let O = 0; O < C.length; O++) M[O] < g && C[O].setCell(M[O], b);
            let P = T - F;
            for (; P-- > 0; ) this.ybase === 0 ? this.y < _ - 1 ? (this.y++, this.lines.pop()) : (this.ybase++, this.ydisp++) : this.ybase < Math.min(this.lines.maxLength, this.lines.length + w) - _ && (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
            this.savedY = Math.min(this.savedY + T, this.ybase + _ - 1);
          }
          if (S.length > 0) {
            const k = [], x = [];
            for (let H = 0; H < this.lines.length; H++) x.push(this.lines.get(H));
            const C = this.lines.length;
            let A = C - 1, L = 0, M = S[L];
            this.lines.length = Math.min(this.lines.maxLength, this.lines.length + w);
            let T = 0;
            for (let H = Math.min(this.lines.maxLength - 1, C + w - 1); H >= 0; H--) if (M && M.start > A + T) {
              for (let z = M.newLines.length - 1; z >= 0; z--) this.lines.set(H--, M.newLines[z]);
              H++, k.push({ index: A + 1, amount: M.newLines.length }), T += M.newLines.length, M = S[++L];
            } else this.lines.set(H, x[A--]);
            let F = 0;
            for (let H = k.length - 1; H >= 0; H--) k[H].index += F, this.lines.onInsertEmitter.fire(k[H]), F += k[H].amount;
            const $ = Math.max(0, C + w - this.lines.maxLength);
            $ > 0 && this.lines.onTrimEmitter.fire($);
          }
        }
        translateBufferLineToString(g, _, b = 0, S) {
          const w = this.lines.get(g);
          return w ? w.translateToString(_, b, S) : "";
        }
        getWrappedRangeForLine(g) {
          let _ = g, b = g;
          for (; _ > 0 && this.lines.get(_).isWrapped; ) _--;
          for (; b + 1 < this.lines.length && this.lines.get(b + 1).isWrapped; ) b++;
          return { first: _, last: b };
        }
        setupTabStops(g) {
          for (g != null ? this.tabs[g] || (g = this.prevStop(g)) : (this.tabs = {}, g = 0); g < this._cols; g += this._optionsService.rawOptions.tabStopWidth) this.tabs[g] = !0;
        }
        prevStop(g) {
          for (g == null && (g = this.x); !this.tabs[--g] && g > 0; ) ;
          return g >= this._cols ? this._cols - 1 : g < 0 ? 0 : g;
        }
        nextStop(g) {
          for (g == null && (g = this.x); !this.tabs[++g] && g < this._cols; ) ;
          return g >= this._cols ? this._cols - 1 : g < 0 ? 0 : g;
        }
        clearMarkers(g) {
          this._isClearing = !0;
          for (let _ = 0; _ < this.markers.length; _++) this.markers[_].line === g && (this.markers[_].dispose(), this.markers.splice(_--, 1));
          this._isClearing = !1;
        }
        clearAllMarkers() {
          this._isClearing = !0;
          for (let g = 0; g < this.markers.length; g++) this.markers[g].dispose(), this.markers.splice(g--, 1);
          this._isClearing = !1;
        }
        addMarker(g) {
          const _ = new h.Marker(g);
          return this.markers.push(_), _.register(this.lines.onTrim((b) => {
            _.line -= b, _.line < 0 && _.dispose();
          })), _.register(this.lines.onInsert((b) => {
            _.line >= b.index && (_.line += b.amount);
          })), _.register(this.lines.onDelete((b) => {
            _.line >= b.index && _.line < b.index + b.amount && _.dispose(), _.line > b.index && (_.line -= b.amount);
          })), _.register(_.onDispose(() => this._removeMarker(_))), _;
        }
        _removeMarker(g) {
          this._isClearing || this.markers.splice(this.markers.indexOf(g), 1);
        }
      };
    }, 8437: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferLine = n.DEFAULT_ATTR_DATA = void 0;
      const c = a(3734), u = a(511), d = a(643), f = a(482);
      n.DEFAULT_ATTR_DATA = Object.freeze(new c.AttributeData());
      let m = 0;
      class y {
        constructor(h, p, g = !1) {
          this.isWrapped = g, this._combined = {}, this._extendedAttrs = {}, this._data = new Uint32Array(3 * h);
          const _ = p || u.CellData.fromCharData([0, d.NULL_CELL_CHAR, d.NULL_CELL_WIDTH, d.NULL_CELL_CODE]);
          for (let b = 0; b < h; ++b) this.setCell(b, _);
          this.length = h;
        }
        get(h) {
          const p = this._data[3 * h + 0], g = 2097151 & p;
          return [this._data[3 * h + 1], 2097152 & p ? this._combined[h] : g ? (0, f.stringFromCodePoint)(g) : "", p >> 22, 2097152 & p ? this._combined[h].charCodeAt(this._combined[h].length - 1) : g];
        }
        set(h, p) {
          this._data[3 * h + 1] = p[d.CHAR_DATA_ATTR_INDEX], p[d.CHAR_DATA_CHAR_INDEX].length > 1 ? (this._combined[h] = p[1], this._data[3 * h + 0] = 2097152 | h | p[d.CHAR_DATA_WIDTH_INDEX] << 22) : this._data[3 * h + 0] = p[d.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | p[d.CHAR_DATA_WIDTH_INDEX] << 22;
        }
        getWidth(h) {
          return this._data[3 * h + 0] >> 22;
        }
        hasWidth(h) {
          return 12582912 & this._data[3 * h + 0];
        }
        getFg(h) {
          return this._data[3 * h + 1];
        }
        getBg(h) {
          return this._data[3 * h + 2];
        }
        hasContent(h) {
          return 4194303 & this._data[3 * h + 0];
        }
        getCodePoint(h) {
          const p = this._data[3 * h + 0];
          return 2097152 & p ? this._combined[h].charCodeAt(this._combined[h].length - 1) : 2097151 & p;
        }
        isCombined(h) {
          return 2097152 & this._data[3 * h + 0];
        }
        getString(h) {
          const p = this._data[3 * h + 0];
          return 2097152 & p ? this._combined[h] : 2097151 & p ? (0, f.stringFromCodePoint)(2097151 & p) : "";
        }
        isProtected(h) {
          return 536870912 & this._data[3 * h + 2];
        }
        loadCell(h, p) {
          return m = 3 * h, p.content = this._data[m + 0], p.fg = this._data[m + 1], p.bg = this._data[m + 2], 2097152 & p.content && (p.combinedData = this._combined[h]), 268435456 & p.bg && (p.extended = this._extendedAttrs[h]), p;
        }
        setCell(h, p) {
          2097152 & p.content && (this._combined[h] = p.combinedData), 268435456 & p.bg && (this._extendedAttrs[h] = p.extended), this._data[3 * h + 0] = p.content, this._data[3 * h + 1] = p.fg, this._data[3 * h + 2] = p.bg;
        }
        setCellFromCodePoint(h, p, g, _, b, S) {
          268435456 & b && (this._extendedAttrs[h] = S), this._data[3 * h + 0] = p | g << 22, this._data[3 * h + 1] = _, this._data[3 * h + 2] = b;
        }
        addCodepointToCell(h, p) {
          let g = this._data[3 * h + 0];
          2097152 & g ? this._combined[h] += (0, f.stringFromCodePoint)(p) : (2097151 & g ? (this._combined[h] = (0, f.stringFromCodePoint)(2097151 & g) + (0, f.stringFromCodePoint)(p), g &= -2097152, g |= 2097152) : g = p | 4194304, this._data[3 * h + 0] = g);
        }
        insertCells(h, p, g, _) {
          if ((h %= this.length) && this.getWidth(h - 1) === 2 && this.setCellFromCodePoint(h - 1, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()), p < this.length - h) {
            const b = new u.CellData();
            for (let S = this.length - h - p - 1; S >= 0; --S) this.setCell(h + p + S, this.loadCell(h + S, b));
            for (let S = 0; S < p; ++S) this.setCell(h + S, g);
          } else for (let b = h; b < this.length; ++b) this.setCell(b, g);
          this.getWidth(this.length - 1) === 2 && this.setCellFromCodePoint(this.length - 1, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs());
        }
        deleteCells(h, p, g, _) {
          if (h %= this.length, p < this.length - h) {
            const b = new u.CellData();
            for (let S = 0; S < this.length - h - p; ++S) this.setCell(h + S, this.loadCell(h + p + S, b));
            for (let S = this.length - p; S < this.length; ++S) this.setCell(S, g);
          } else for (let b = h; b < this.length; ++b) this.setCell(b, g);
          h && this.getWidth(h - 1) === 2 && this.setCellFromCodePoint(h - 1, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()), this.getWidth(h) !== 0 || this.hasContent(h) || this.setCellFromCodePoint(h, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs());
        }
        replaceCells(h, p, g, _, b = !1) {
          if (b) for (h && this.getWidth(h - 1) === 2 && !this.isProtected(h - 1) && this.setCellFromCodePoint(h - 1, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()), p < this.length && this.getWidth(p - 1) === 2 && !this.isProtected(p) && this.setCellFromCodePoint(p, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()); h < p && h < this.length; ) this.isProtected(h) || this.setCell(h, g), h++;
          else for (h && this.getWidth(h - 1) === 2 && this.setCellFromCodePoint(h - 1, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()), p < this.length && this.getWidth(p - 1) === 2 && this.setCellFromCodePoint(p, 0, 1, (_ == null ? void 0 : _.fg) || 0, (_ == null ? void 0 : _.bg) || 0, (_ == null ? void 0 : _.extended) || new c.ExtendedAttrs()); h < p && h < this.length; ) this.setCell(h++, g);
        }
        resize(h, p) {
          if (h === this.length) return 4 * this._data.length * 2 < this._data.buffer.byteLength;
          const g = 3 * h;
          if (h > this.length) {
            if (this._data.buffer.byteLength >= 4 * g) this._data = new Uint32Array(this._data.buffer, 0, g);
            else {
              const _ = new Uint32Array(g);
              _.set(this._data), this._data = _;
            }
            for (let _ = this.length; _ < h; ++_) this.setCell(_, p);
          } else {
            this._data = this._data.subarray(0, g);
            const _ = Object.keys(this._combined);
            for (let S = 0; S < _.length; S++) {
              const w = parseInt(_[S], 10);
              w >= h && delete this._combined[w];
            }
            const b = Object.keys(this._extendedAttrs);
            for (let S = 0; S < b.length; S++) {
              const w = parseInt(b[S], 10);
              w >= h && delete this._extendedAttrs[w];
            }
          }
          return this.length = h, 4 * g * 2 < this._data.buffer.byteLength;
        }
        cleanupMemory() {
          if (4 * this._data.length * 2 < this._data.buffer.byteLength) {
            const h = new Uint32Array(this._data.length);
            return h.set(this._data), this._data = h, 1;
          }
          return 0;
        }
        fill(h, p = !1) {
          if (p) for (let g = 0; g < this.length; ++g) this.isProtected(g) || this.setCell(g, h);
          else {
            this._combined = {}, this._extendedAttrs = {};
            for (let g = 0; g < this.length; ++g) this.setCell(g, h);
          }
        }
        copyFrom(h) {
          this.length !== h.length ? this._data = new Uint32Array(h._data) : this._data.set(h._data), this.length = h.length, this._combined = {};
          for (const p in h._combined) this._combined[p] = h._combined[p];
          this._extendedAttrs = {};
          for (const p in h._extendedAttrs) this._extendedAttrs[p] = h._extendedAttrs[p];
          this.isWrapped = h.isWrapped;
        }
        clone() {
          const h = new y(0);
          h._data = new Uint32Array(this._data), h.length = this.length;
          for (const p in this._combined) h._combined[p] = this._combined[p];
          for (const p in this._extendedAttrs) h._extendedAttrs[p] = this._extendedAttrs[p];
          return h.isWrapped = this.isWrapped, h;
        }
        getTrimmedLength() {
          for (let h = this.length - 1; h >= 0; --h) if (4194303 & this._data[3 * h + 0]) return h + (this._data[3 * h + 0] >> 22);
          return 0;
        }
        getNoBgTrimmedLength() {
          for (let h = this.length - 1; h >= 0; --h) if (4194303 & this._data[3 * h + 0] || 50331648 & this._data[3 * h + 2]) return h + (this._data[3 * h + 0] >> 22);
          return 0;
        }
        copyCellsFrom(h, p, g, _, b) {
          const S = h._data;
          if (b) for (let k = _ - 1; k >= 0; k--) {
            for (let x = 0; x < 3; x++) this._data[3 * (g + k) + x] = S[3 * (p + k) + x];
            268435456 & S[3 * (p + k) + 2] && (this._extendedAttrs[g + k] = h._extendedAttrs[p + k]);
          }
          else for (let k = 0; k < _; k++) {
            for (let x = 0; x < 3; x++) this._data[3 * (g + k) + x] = S[3 * (p + k) + x];
            268435456 & S[3 * (p + k) + 2] && (this._extendedAttrs[g + k] = h._extendedAttrs[p + k]);
          }
          const w = Object.keys(h._combined);
          for (let k = 0; k < w.length; k++) {
            const x = parseInt(w[k], 10);
            x >= p && (this._combined[x - p + g] = h._combined[x]);
          }
        }
        translateToString(h = !1, p = 0, g = this.length) {
          h && (g = Math.min(g, this.getTrimmedLength()));
          let _ = "";
          for (; p < g; ) {
            const b = this._data[3 * p + 0], S = 2097151 & b;
            _ += 2097152 & b ? this._combined[p] : S ? (0, f.stringFromCodePoint)(S) : d.WHITESPACE_CELL_CHAR, p += b >> 22 || 1;
          }
          return _;
        }
      }
      n.BufferLine = y;
    }, 4841: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.getRangeLength = void 0, n.getRangeLength = function(a, c) {
        if (a.start.y > a.end.y) throw new Error(`Buffer range end (${a.end.x}, ${a.end.y}) cannot be before start (${a.start.x}, ${a.start.y})`);
        return c * (a.end.y - a.start.y) + (a.end.x - a.start.x + 1);
      };
    }, 4634: (l, n) => {
      function a(c, u, d) {
        if (u === c.length - 1) return c[u].getTrimmedLength();
        const f = !c[u].hasContent(d - 1) && c[u].getWidth(d - 1) === 1, m = c[u + 1].getWidth(0) === 2;
        return f && m ? d - 1 : d;
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.getWrappedLineTrimmedLength = n.reflowSmallerGetNewLineLengths = n.reflowLargerApplyNewLayout = n.reflowLargerCreateNewLayout = n.reflowLargerGetLinesToRemove = void 0, n.reflowLargerGetLinesToRemove = function(c, u, d, f, m) {
        const y = [];
        for (let v = 0; v < c.length - 1; v++) {
          let h = v, p = c.get(++h);
          if (!p.isWrapped) continue;
          const g = [c.get(v)];
          for (; h < c.length && p.isWrapped; ) g.push(p), p = c.get(++h);
          if (f >= v && f < h) {
            v += g.length - 1;
            continue;
          }
          let _ = 0, b = a(g, _, u), S = 1, w = 0;
          for (; S < g.length; ) {
            const x = a(g, S, u), C = x - w, A = d - b, L = Math.min(C, A);
            g[_].copyCellsFrom(g[S], w, b, L, !1), b += L, b === d && (_++, b = 0), w += L, w === x && (S++, w = 0), b === 0 && _ !== 0 && g[_ - 1].getWidth(d - 1) === 2 && (g[_].copyCellsFrom(g[_ - 1], d - 1, b++, 1, !1), g[_ - 1].setCell(d - 1, m));
          }
          g[_].replaceCells(b, d, m);
          let k = 0;
          for (let x = g.length - 1; x > 0 && (x > _ || g[x].getTrimmedLength() === 0); x--) k++;
          k > 0 && (y.push(v + g.length - k), y.push(k)), v += g.length - 1;
        }
        return y;
      }, n.reflowLargerCreateNewLayout = function(c, u) {
        const d = [];
        let f = 0, m = u[f], y = 0;
        for (let v = 0; v < c.length; v++) if (m === v) {
          const h = u[++f];
          c.onDeleteEmitter.fire({ index: v - y, amount: h }), v += h - 1, y += h, m = u[++f];
        } else d.push(v);
        return { layout: d, countRemoved: y };
      }, n.reflowLargerApplyNewLayout = function(c, u) {
        const d = [];
        for (let f = 0; f < u.length; f++) d.push(c.get(u[f]));
        for (let f = 0; f < d.length; f++) c.set(f, d[f]);
        c.length = u.length;
      }, n.reflowSmallerGetNewLineLengths = function(c, u, d) {
        const f = [], m = c.map((p, g) => a(c, g, u)).reduce((p, g) => p + g);
        let y = 0, v = 0, h = 0;
        for (; h < m; ) {
          if (m - h < d) {
            f.push(m - h);
            break;
          }
          y += d;
          const p = a(c, v, u);
          y > p && (y -= p, v++);
          const g = c[v].getWidth(y - 1) === 2;
          g && y--;
          const _ = g ? d - 1 : d;
          f.push(_), h += _;
        }
        return f;
      }, n.getWrappedLineTrimmedLength = a;
    }, 5295: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferSet = void 0;
      const c = a(8460), u = a(844), d = a(9092);
      class f extends u.Disposable {
        constructor(y, v) {
          super(), this._optionsService = y, this._bufferService = v, this._onBufferActivate = this.register(new c.EventEmitter()), this.onBufferActivate = this._onBufferActivate.event, this.reset(), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.resize(this._bufferService.cols, this._bufferService.rows))), this.register(this._optionsService.onSpecificOptionChange("tabStopWidth", () => this.setupTabStops()));
        }
        reset() {
          this._normal = new d.Buffer(!0, this._optionsService, this._bufferService), this._normal.fillViewportRows(), this._alt = new d.Buffer(!1, this._optionsService, this._bufferService), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }), this.setupTabStops();
        }
        get alt() {
          return this._alt;
        }
        get active() {
          return this._activeBuffer;
        }
        get normal() {
          return this._normal;
        }
        activateNormalBuffer() {
          this._activeBuffer !== this._normal && (this._normal.x = this._alt.x, this._normal.y = this._alt.y, this._alt.clearAllMarkers(), this._alt.clear(), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }));
        }
        activateAltBuffer(y) {
          this._activeBuffer !== this._alt && (this._alt.fillViewportRows(y), this._alt.x = this._normal.x, this._alt.y = this._normal.y, this._activeBuffer = this._alt, this._onBufferActivate.fire({ activeBuffer: this._alt, inactiveBuffer: this._normal }));
        }
        resize(y, v) {
          this._normal.resize(y, v), this._alt.resize(y, v), this.setupTabStops(y);
        }
        setupTabStops(y) {
          this._normal.setupTabStops(y), this._alt.setupTabStops(y);
        }
      }
      n.BufferSet = f;
    }, 511: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CellData = void 0;
      const c = a(482), u = a(643), d = a(3734);
      class f extends d.AttributeData {
        constructor() {
          super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new d.ExtendedAttrs(), this.combinedData = "";
        }
        static fromCharData(y) {
          const v = new f();
          return v.setFromCharData(y), v;
        }
        isCombined() {
          return 2097152 & this.content;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, c.stringFromCodePoint)(2097151 & this.content) : "";
        }
        getCode() {
          return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
        }
        setFromCharData(y) {
          this.fg = y[u.CHAR_DATA_ATTR_INDEX], this.bg = 0;
          let v = !1;
          if (y[u.CHAR_DATA_CHAR_INDEX].length > 2) v = !0;
          else if (y[u.CHAR_DATA_CHAR_INDEX].length === 2) {
            const h = y[u.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
            if (55296 <= h && h <= 56319) {
              const p = y[u.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
              56320 <= p && p <= 57343 ? this.content = 1024 * (h - 55296) + p - 56320 + 65536 | y[u.CHAR_DATA_WIDTH_INDEX] << 22 : v = !0;
            } else v = !0;
          } else this.content = y[u.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | y[u.CHAR_DATA_WIDTH_INDEX] << 22;
          v && (this.combinedData = y[u.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | y[u.CHAR_DATA_WIDTH_INDEX] << 22);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      n.CellData = f;
    }, 643: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.WHITESPACE_CELL_CODE = n.WHITESPACE_CELL_WIDTH = n.WHITESPACE_CELL_CHAR = n.NULL_CELL_CODE = n.NULL_CELL_WIDTH = n.NULL_CELL_CHAR = n.CHAR_DATA_CODE_INDEX = n.CHAR_DATA_WIDTH_INDEX = n.CHAR_DATA_CHAR_INDEX = n.CHAR_DATA_ATTR_INDEX = n.DEFAULT_EXT = n.DEFAULT_ATTR = n.DEFAULT_COLOR = void 0, n.DEFAULT_COLOR = 0, n.DEFAULT_ATTR = 256 | n.DEFAULT_COLOR << 9, n.DEFAULT_EXT = 0, n.CHAR_DATA_ATTR_INDEX = 0, n.CHAR_DATA_CHAR_INDEX = 1, n.CHAR_DATA_WIDTH_INDEX = 2, n.CHAR_DATA_CODE_INDEX = 3, n.NULL_CELL_CHAR = "", n.NULL_CELL_WIDTH = 1, n.NULL_CELL_CODE = 0, n.WHITESPACE_CELL_CHAR = " ", n.WHITESPACE_CELL_WIDTH = 1, n.WHITESPACE_CELL_CODE = 32;
    }, 4863: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Marker = void 0;
      const c = a(8460), u = a(844);
      class d {
        get id() {
          return this._id;
        }
        constructor(m) {
          this.line = m, this.isDisposed = !1, this._disposables = [], this._id = d._nextId++, this._onDispose = this.register(new c.EventEmitter()), this.onDispose = this._onDispose.event;
        }
        dispose() {
          this.isDisposed || (this.isDisposed = !0, this.line = -1, this._onDispose.fire(), (0, u.disposeArray)(this._disposables), this._disposables.length = 0);
        }
        register(m) {
          return this._disposables.push(m), m;
        }
      }
      n.Marker = d, d._nextId = 1;
    }, 7116: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DEFAULT_CHARSET = n.CHARSETS = void 0, n.CHARSETS = {}, n.DEFAULT_CHARSET = n.CHARSETS.B, n.CHARSETS[0] = { "`": "◆", a: "▒", b: "␉", c: "␌", d: "␍", e: "␊", f: "°", g: "±", h: "␤", i: "␋", j: "┘", k: "┐", l: "┌", m: "└", n: "┼", o: "⎺", p: "⎻", q: "─", r: "⎼", s: "⎽", t: "├", u: "┤", v: "┴", w: "┬", x: "│", y: "≤", z: "≥", "{": "π", "|": "≠", "}": "£", "~": "·" }, n.CHARSETS.A = { "#": "£" }, n.CHARSETS.B = void 0, n.CHARSETS[4] = { "#": "£", "@": "¾", "[": "ij", "\\": "½", "]": "|", "{": "¨", "|": "f", "}": "¼", "~": "´" }, n.CHARSETS.C = n.CHARSETS[5] = { "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, n.CHARSETS.R = { "#": "£", "@": "à", "[": "°", "\\": "ç", "]": "§", "{": "é", "|": "ù", "}": "è", "~": "¨" }, n.CHARSETS.Q = { "@": "à", "[": "â", "\\": "ç", "]": "ê", "^": "î", "`": "ô", "{": "é", "|": "ù", "}": "è", "~": "û" }, n.CHARSETS.K = { "@": "§", "[": "Ä", "\\": "Ö", "]": "Ü", "{": "ä", "|": "ö", "}": "ü", "~": "ß" }, n.CHARSETS.Y = { "#": "£", "@": "§", "[": "°", "\\": "ç", "]": "é", "`": "ù", "{": "à", "|": "ò", "}": "è", "~": "ì" }, n.CHARSETS.E = n.CHARSETS[6] = { "@": "Ä", "[": "Æ", "\\": "Ø", "]": "Å", "^": "Ü", "`": "ä", "{": "æ", "|": "ø", "}": "å", "~": "ü" }, n.CHARSETS.Z = { "#": "£", "@": "§", "[": "¡", "\\": "Ñ", "]": "¿", "{": "°", "|": "ñ", "}": "ç" }, n.CHARSETS.H = n.CHARSETS[7] = { "@": "É", "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, n.CHARSETS["="] = { "#": "ù", "@": "à", "[": "é", "\\": "ç", "]": "ê", "^": "î", _: "è", "`": "ô", "{": "ä", "|": "ö", "}": "ü", "~": "û" };
    }, 2584: (l, n) => {
      var a, c, u;
      Object.defineProperty(n, "__esModule", { value: !0 }), n.C1_ESCAPED = n.C1 = n.C0 = void 0, function(d) {
        d.NUL = "\0", d.SOH = "", d.STX = "", d.ETX = "", d.EOT = "", d.ENQ = "", d.ACK = "", d.BEL = "\x07", d.BS = "\b", d.HT = "	", d.LF = `
`, d.VT = "\v", d.FF = "\f", d.CR = "\r", d.SO = "", d.SI = "", d.DLE = "", d.DC1 = "", d.DC2 = "", d.DC3 = "", d.DC4 = "", d.NAK = "", d.SYN = "", d.ETB = "", d.CAN = "", d.EM = "", d.SUB = "", d.ESC = "\x1B", d.FS = "", d.GS = "", d.RS = "", d.US = "", d.SP = " ", d.DEL = "";
      }(a || (n.C0 = a = {})), function(d) {
        d.PAD = "", d.HOP = "", d.BPH = "", d.NBH = "", d.IND = "", d.NEL = "", d.SSA = "", d.ESA = "", d.HTS = "", d.HTJ = "", d.VTS = "", d.PLD = "", d.PLU = "", d.RI = "", d.SS2 = "", d.SS3 = "", d.DCS = "", d.PU1 = "", d.PU2 = "", d.STS = "", d.CCH = "", d.MW = "", d.SPA = "", d.EPA = "", d.SOS = "", d.SGCI = "", d.SCI = "", d.CSI = "", d.ST = "", d.OSC = "", d.PM = "", d.APC = "";
      }(c || (n.C1 = c = {})), function(d) {
        d.ST = `${a.ESC}\\`;
      }(u || (n.C1_ESCAPED = u = {}));
    }, 7399: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.evaluateKeyboardEvent = void 0;
      const c = a(2584), u = { 48: ["0", ")"], 49: ["1", "!"], 50: ["2", "@"], 51: ["3", "#"], 52: ["4", "$"], 53: ["5", "%"], 54: ["6", "^"], 55: ["7", "&"], 56: ["8", "*"], 57: ["9", "("], 186: [";", ":"], 187: ["=", "+"], 188: [",", "<"], 189: ["-", "_"], 190: [".", ">"], 191: ["/", "?"], 192: ["`", "~"], 219: ["[", "{"], 220: ["\\", "|"], 221: ["]", "}"], 222: ["'", '"'] };
      n.evaluateKeyboardEvent = function(d, f, m, y) {
        const v = { type: 0, cancel: !1, key: void 0 }, h = (d.shiftKey ? 1 : 0) | (d.altKey ? 2 : 0) | (d.ctrlKey ? 4 : 0) | (d.metaKey ? 8 : 0);
        switch (d.keyCode) {
          case 0:
            d.key === "UIKeyInputUpArrow" ? v.key = f ? c.C0.ESC + "OA" : c.C0.ESC + "[A" : d.key === "UIKeyInputLeftArrow" ? v.key = f ? c.C0.ESC + "OD" : c.C0.ESC + "[D" : d.key === "UIKeyInputRightArrow" ? v.key = f ? c.C0.ESC + "OC" : c.C0.ESC + "[C" : d.key === "UIKeyInputDownArrow" && (v.key = f ? c.C0.ESC + "OB" : c.C0.ESC + "[B");
            break;
          case 8:
            if (d.altKey) {
              v.key = c.C0.ESC + c.C0.DEL;
              break;
            }
            v.key = c.C0.DEL;
            break;
          case 9:
            if (d.shiftKey) {
              v.key = c.C0.ESC + "[Z";
              break;
            }
            v.key = c.C0.HT, v.cancel = !0;
            break;
          case 13:
            v.key = d.altKey ? c.C0.ESC + c.C0.CR : c.C0.CR, v.cancel = !0;
            break;
          case 27:
            v.key = c.C0.ESC, d.altKey && (v.key = c.C0.ESC + c.C0.ESC), v.cancel = !0;
            break;
          case 37:
            if (d.metaKey) break;
            h ? (v.key = c.C0.ESC + "[1;" + (h + 1) + "D", v.key === c.C0.ESC + "[1;3D" && (v.key = c.C0.ESC + (m ? "b" : "[1;5D"))) : v.key = f ? c.C0.ESC + "OD" : c.C0.ESC + "[D";
            break;
          case 39:
            if (d.metaKey) break;
            h ? (v.key = c.C0.ESC + "[1;" + (h + 1) + "C", v.key === c.C0.ESC + "[1;3C" && (v.key = c.C0.ESC + (m ? "f" : "[1;5C"))) : v.key = f ? c.C0.ESC + "OC" : c.C0.ESC + "[C";
            break;
          case 38:
            if (d.metaKey) break;
            h ? (v.key = c.C0.ESC + "[1;" + (h + 1) + "A", m || v.key !== c.C0.ESC + "[1;3A" || (v.key = c.C0.ESC + "[1;5A")) : v.key = f ? c.C0.ESC + "OA" : c.C0.ESC + "[A";
            break;
          case 40:
            if (d.metaKey) break;
            h ? (v.key = c.C0.ESC + "[1;" + (h + 1) + "B", m || v.key !== c.C0.ESC + "[1;3B" || (v.key = c.C0.ESC + "[1;5B")) : v.key = f ? c.C0.ESC + "OB" : c.C0.ESC + "[B";
            break;
          case 45:
            d.shiftKey || d.ctrlKey || (v.key = c.C0.ESC + "[2~");
            break;
          case 46:
            v.key = h ? c.C0.ESC + "[3;" + (h + 1) + "~" : c.C0.ESC + "[3~";
            break;
          case 36:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "H" : f ? c.C0.ESC + "OH" : c.C0.ESC + "[H";
            break;
          case 35:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "F" : f ? c.C0.ESC + "OF" : c.C0.ESC + "[F";
            break;
          case 33:
            d.shiftKey ? v.type = 2 : d.ctrlKey ? v.key = c.C0.ESC + "[5;" + (h + 1) + "~" : v.key = c.C0.ESC + "[5~";
            break;
          case 34:
            d.shiftKey ? v.type = 3 : d.ctrlKey ? v.key = c.C0.ESC + "[6;" + (h + 1) + "~" : v.key = c.C0.ESC + "[6~";
            break;
          case 112:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "P" : c.C0.ESC + "OP";
            break;
          case 113:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "Q" : c.C0.ESC + "OQ";
            break;
          case 114:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "R" : c.C0.ESC + "OR";
            break;
          case 115:
            v.key = h ? c.C0.ESC + "[1;" + (h + 1) + "S" : c.C0.ESC + "OS";
            break;
          case 116:
            v.key = h ? c.C0.ESC + "[15;" + (h + 1) + "~" : c.C0.ESC + "[15~";
            break;
          case 117:
            v.key = h ? c.C0.ESC + "[17;" + (h + 1) + "~" : c.C0.ESC + "[17~";
            break;
          case 118:
            v.key = h ? c.C0.ESC + "[18;" + (h + 1) + "~" : c.C0.ESC + "[18~";
            break;
          case 119:
            v.key = h ? c.C0.ESC + "[19;" + (h + 1) + "~" : c.C0.ESC + "[19~";
            break;
          case 120:
            v.key = h ? c.C0.ESC + "[20;" + (h + 1) + "~" : c.C0.ESC + "[20~";
            break;
          case 121:
            v.key = h ? c.C0.ESC + "[21;" + (h + 1) + "~" : c.C0.ESC + "[21~";
            break;
          case 122:
            v.key = h ? c.C0.ESC + "[23;" + (h + 1) + "~" : c.C0.ESC + "[23~";
            break;
          case 123:
            v.key = h ? c.C0.ESC + "[24;" + (h + 1) + "~" : c.C0.ESC + "[24~";
            break;
          default:
            if (!d.ctrlKey || d.shiftKey || d.altKey || d.metaKey) if (m && !y || !d.altKey || d.metaKey) !m || d.altKey || d.ctrlKey || d.shiftKey || !d.metaKey ? d.key && !d.ctrlKey && !d.altKey && !d.metaKey && d.keyCode >= 48 && d.key.length === 1 ? v.key = d.key : d.key && d.ctrlKey && (d.key === "_" && (v.key = c.C0.US), d.key === "@" && (v.key = c.C0.NUL)) : d.keyCode === 65 && (v.type = 1);
            else {
              const p = u[d.keyCode], g = p == null ? void 0 : p[d.shiftKey ? 1 : 0];
              if (g) v.key = c.C0.ESC + g;
              else if (d.keyCode >= 65 && d.keyCode <= 90) {
                const _ = d.ctrlKey ? d.keyCode - 64 : d.keyCode + 32;
                let b = String.fromCharCode(_);
                d.shiftKey && (b = b.toUpperCase()), v.key = c.C0.ESC + b;
              } else if (d.keyCode === 32) v.key = c.C0.ESC + (d.ctrlKey ? c.C0.NUL : " ");
              else if (d.key === "Dead" && d.code.startsWith("Key")) {
                let _ = d.code.slice(3, 4);
                d.shiftKey || (_ = _.toLowerCase()), v.key = c.C0.ESC + _, v.cancel = !0;
              }
            }
            else d.keyCode >= 65 && d.keyCode <= 90 ? v.key = String.fromCharCode(d.keyCode - 64) : d.keyCode === 32 ? v.key = c.C0.NUL : d.keyCode >= 51 && d.keyCode <= 55 ? v.key = String.fromCharCode(d.keyCode - 51 + 27) : d.keyCode === 56 ? v.key = c.C0.DEL : d.keyCode === 219 ? v.key = c.C0.ESC : d.keyCode === 220 ? v.key = c.C0.FS : d.keyCode === 221 && (v.key = c.C0.GS);
        }
        return v;
      };
    }, 482: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Utf8ToUtf32 = n.StringToUtf32 = n.utf32ToString = n.stringFromCodePoint = void 0, n.stringFromCodePoint = function(a) {
        return a > 65535 ? (a -= 65536, String.fromCharCode(55296 + (a >> 10)) + String.fromCharCode(a % 1024 + 56320)) : String.fromCharCode(a);
      }, n.utf32ToString = function(a, c = 0, u = a.length) {
        let d = "";
        for (let f = c; f < u; ++f) {
          let m = a[f];
          m > 65535 ? (m -= 65536, d += String.fromCharCode(55296 + (m >> 10)) + String.fromCharCode(m % 1024 + 56320)) : d += String.fromCharCode(m);
        }
        return d;
      }, n.StringToUtf32 = class {
        constructor() {
          this._interim = 0;
        }
        clear() {
          this._interim = 0;
        }
        decode(a, c) {
          const u = a.length;
          if (!u) return 0;
          let d = 0, f = 0;
          if (this._interim) {
            const m = a.charCodeAt(f++);
            56320 <= m && m <= 57343 ? c[d++] = 1024 * (this._interim - 55296) + m - 56320 + 65536 : (c[d++] = this._interim, c[d++] = m), this._interim = 0;
          }
          for (let m = f; m < u; ++m) {
            const y = a.charCodeAt(m);
            if (55296 <= y && y <= 56319) {
              if (++m >= u) return this._interim = y, d;
              const v = a.charCodeAt(m);
              56320 <= v && v <= 57343 ? c[d++] = 1024 * (y - 55296) + v - 56320 + 65536 : (c[d++] = y, c[d++] = v);
            } else y !== 65279 && (c[d++] = y);
          }
          return d;
        }
      }, n.Utf8ToUtf32 = class {
        constructor() {
          this.interim = new Uint8Array(3);
        }
        clear() {
          this.interim.fill(0);
        }
        decode(a, c) {
          const u = a.length;
          if (!u) return 0;
          let d, f, m, y, v = 0, h = 0, p = 0;
          if (this.interim[0]) {
            let b = !1, S = this.interim[0];
            S &= (224 & S) == 192 ? 31 : (240 & S) == 224 ? 15 : 7;
            let w, k = 0;
            for (; (w = 63 & this.interim[++k]) && k < 4; ) S <<= 6, S |= w;
            const x = (224 & this.interim[0]) == 192 ? 2 : (240 & this.interim[0]) == 224 ? 3 : 4, C = x - k;
            for (; p < C; ) {
              if (p >= u) return 0;
              if (w = a[p++], (192 & w) != 128) {
                p--, b = !0;
                break;
              }
              this.interim[k++] = w, S <<= 6, S |= 63 & w;
            }
            b || (x === 2 ? S < 128 ? p-- : c[v++] = S : x === 3 ? S < 2048 || S >= 55296 && S <= 57343 || S === 65279 || (c[v++] = S) : S < 65536 || S > 1114111 || (c[v++] = S)), this.interim.fill(0);
          }
          const g = u - 4;
          let _ = p;
          for (; _ < u; ) {
            for (; !(!(_ < g) || 128 & (d = a[_]) || 128 & (f = a[_ + 1]) || 128 & (m = a[_ + 2]) || 128 & (y = a[_ + 3])); ) c[v++] = d, c[v++] = f, c[v++] = m, c[v++] = y, _ += 4;
            if (d = a[_++], d < 128) c[v++] = d;
            else if ((224 & d) == 192) {
              if (_ >= u) return this.interim[0] = d, v;
              if (f = a[_++], (192 & f) != 128) {
                _--;
                continue;
              }
              if (h = (31 & d) << 6 | 63 & f, h < 128) {
                _--;
                continue;
              }
              c[v++] = h;
            } else if ((240 & d) == 224) {
              if (_ >= u) return this.interim[0] = d, v;
              if (f = a[_++], (192 & f) != 128) {
                _--;
                continue;
              }
              if (_ >= u) return this.interim[0] = d, this.interim[1] = f, v;
              if (m = a[_++], (192 & m) != 128) {
                _--;
                continue;
              }
              if (h = (15 & d) << 12 | (63 & f) << 6 | 63 & m, h < 2048 || h >= 55296 && h <= 57343 || h === 65279) continue;
              c[v++] = h;
            } else if ((248 & d) == 240) {
              if (_ >= u) return this.interim[0] = d, v;
              if (f = a[_++], (192 & f) != 128) {
                _--;
                continue;
              }
              if (_ >= u) return this.interim[0] = d, this.interim[1] = f, v;
              if (m = a[_++], (192 & m) != 128) {
                _--;
                continue;
              }
              if (_ >= u) return this.interim[0] = d, this.interim[1] = f, this.interim[2] = m, v;
              if (y = a[_++], (192 & y) != 128) {
                _--;
                continue;
              }
              if (h = (7 & d) << 18 | (63 & f) << 12 | (63 & m) << 6 | 63 & y, h < 65536 || h > 1114111) continue;
              c[v++] = h;
            }
          }
          return v;
        }
      };
    }, 225: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.UnicodeV6 = void 0;
      const a = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]], c = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
      let u;
      n.UnicodeV6 = class {
        constructor() {
          if (this.version = "6", !u) {
            u = new Uint8Array(65536), u.fill(1), u[0] = 0, u.fill(0, 1, 32), u.fill(0, 127, 160), u.fill(2, 4352, 4448), u[9001] = 2, u[9002] = 2, u.fill(2, 11904, 42192), u[12351] = 1, u.fill(2, 44032, 55204), u.fill(2, 63744, 64256), u.fill(2, 65040, 65050), u.fill(2, 65072, 65136), u.fill(2, 65280, 65377), u.fill(2, 65504, 65511);
            for (let d = 0; d < a.length; ++d) u.fill(0, a[d][0], a[d][1] + 1);
          }
        }
        wcwidth(d) {
          return d < 32 ? 0 : d < 127 ? 1 : d < 65536 ? u[d] : function(f, m) {
            let y, v = 0, h = m.length - 1;
            if (f < m[0][0] || f > m[h][1]) return !1;
            for (; h >= v; ) if (y = v + h >> 1, f > m[y][1]) v = y + 1;
            else {
              if (!(f < m[y][0])) return !0;
              h = y - 1;
            }
            return !1;
          }(d, c) ? 0 : d >= 131072 && d <= 196605 || d >= 196608 && d <= 262141 ? 2 : 1;
        }
      };
    }, 5981: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.WriteBuffer = void 0;
      const c = a(8460), u = a(844);
      class d extends u.Disposable {
        constructor(m) {
          super(), this._action = m, this._writeBuffer = [], this._callbacks = [], this._pendingData = 0, this._bufferOffset = 0, this._isSyncWriting = !1, this._syncCalls = 0, this._didUserInput = !1, this._onWriteParsed = this.register(new c.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event;
        }
        handleUserInput() {
          this._didUserInput = !0;
        }
        writeSync(m, y) {
          if (y !== void 0 && this._syncCalls > y) return void (this._syncCalls = 0);
          if (this._pendingData += m.length, this._writeBuffer.push(m), this._callbacks.push(void 0), this._syncCalls++, this._isSyncWriting) return;
          let v;
          for (this._isSyncWriting = !0; v = this._writeBuffer.shift(); ) {
            this._action(v);
            const h = this._callbacks.shift();
            h && h();
          }
          this._pendingData = 0, this._bufferOffset = 2147483647, this._isSyncWriting = !1, this._syncCalls = 0;
        }
        write(m, y) {
          if (this._pendingData > 5e7) throw new Error("write data discarded, use flow control to avoid losing data");
          if (!this._writeBuffer.length) {
            if (this._bufferOffset = 0, this._didUserInput) return this._didUserInput = !1, this._pendingData += m.length, this._writeBuffer.push(m), this._callbacks.push(y), void this._innerWrite();
            setTimeout(() => this._innerWrite());
          }
          this._pendingData += m.length, this._writeBuffer.push(m), this._callbacks.push(y);
        }
        _innerWrite(m = 0, y = !0) {
          const v = m || Date.now();
          for (; this._writeBuffer.length > this._bufferOffset; ) {
            const h = this._writeBuffer[this._bufferOffset], p = this._action(h, y);
            if (p) {
              const _ = (b) => Date.now() - v >= 12 ? setTimeout(() => this._innerWrite(0, b)) : this._innerWrite(v, b);
              return void p.catch((b) => (queueMicrotask(() => {
                throw b;
              }), Promise.resolve(!1))).then(_);
            }
            const g = this._callbacks[this._bufferOffset];
            if (g && g(), this._bufferOffset++, this._pendingData -= h.length, Date.now() - v >= 12) break;
          }
          this._writeBuffer.length > this._bufferOffset ? (this._bufferOffset > 50 && (this._writeBuffer = this._writeBuffer.slice(this._bufferOffset), this._callbacks = this._callbacks.slice(this._bufferOffset), this._bufferOffset = 0), setTimeout(() => this._innerWrite())) : (this._writeBuffer.length = 0, this._callbacks.length = 0, this._pendingData = 0, this._bufferOffset = 0), this._onWriteParsed.fire();
        }
      }
      n.WriteBuffer = d;
    }, 5941: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.toRgbString = n.parseColor = void 0;
      const a = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/, c = /^[\da-f]+$/;
      function u(d, f) {
        const m = d.toString(16), y = m.length < 2 ? "0" + m : m;
        switch (f) {
          case 4:
            return m[0];
          case 8:
            return y;
          case 12:
            return (y + y).slice(0, 3);
          default:
            return y + y;
        }
      }
      n.parseColor = function(d) {
        if (!d) return;
        let f = d.toLowerCase();
        if (f.indexOf("rgb:") === 0) {
          f = f.slice(4);
          const m = a.exec(f);
          if (m) {
            const y = m[1] ? 15 : m[4] ? 255 : m[7] ? 4095 : 65535;
            return [Math.round(parseInt(m[1] || m[4] || m[7] || m[10], 16) / y * 255), Math.round(parseInt(m[2] || m[5] || m[8] || m[11], 16) / y * 255), Math.round(parseInt(m[3] || m[6] || m[9] || m[12], 16) / y * 255)];
          }
        } else if (f.indexOf("#") === 0 && (f = f.slice(1), c.exec(f) && [3, 6, 9, 12].includes(f.length))) {
          const m = f.length / 3, y = [0, 0, 0];
          for (let v = 0; v < 3; ++v) {
            const h = parseInt(f.slice(m * v, m * v + m), 16);
            y[v] = m === 1 ? h << 4 : m === 2 ? h : m === 3 ? h >> 4 : h >> 8;
          }
          return y;
        }
      }, n.toRgbString = function(d, f = 16) {
        const [m, y, v] = d;
        return `rgb:${u(m, f)}/${u(y, f)}/${u(v, f)}`;
      };
    }, 5770: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.PAYLOAD_LIMIT = void 0, n.PAYLOAD_LIMIT = 1e7;
    }, 6351: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DcsHandler = n.DcsParser = void 0;
      const c = a(482), u = a(8742), d = a(5770), f = [];
      n.DcsParser = class {
        constructor() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._active = f, this._ident = 0, this._handlerFb = () => {
          }, this._stack = { paused: !1, loopPosition: 0, fallThrough: !1 };
        }
        dispose() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._active = f;
        }
        registerHandler(y, v) {
          this._handlers[y] === void 0 && (this._handlers[y] = []);
          const h = this._handlers[y];
          return h.push(v), { dispose: () => {
            const p = h.indexOf(v);
            p !== -1 && h.splice(p, 1);
          } };
        }
        clearHandler(y) {
          this._handlers[y] && delete this._handlers[y];
        }
        setHandlerFallback(y) {
          this._handlerFb = y;
        }
        reset() {
          if (this._active.length) for (let y = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; y >= 0; --y) this._active[y].unhook(!1);
          this._stack.paused = !1, this._active = f, this._ident = 0;
        }
        hook(y, v) {
          if (this.reset(), this._ident = y, this._active = this._handlers[y] || f, this._active.length) for (let h = this._active.length - 1; h >= 0; h--) this._active[h].hook(v);
          else this._handlerFb(this._ident, "HOOK", v);
        }
        put(y, v, h) {
          if (this._active.length) for (let p = this._active.length - 1; p >= 0; p--) this._active[p].put(y, v, h);
          else this._handlerFb(this._ident, "PUT", (0, c.utf32ToString)(y, v, h));
        }
        unhook(y, v = !0) {
          if (this._active.length) {
            let h = !1, p = this._active.length - 1, g = !1;
            if (this._stack.paused && (p = this._stack.loopPosition - 1, h = v, g = this._stack.fallThrough, this._stack.paused = !1), !g && h === !1) {
              for (; p >= 0 && (h = this._active[p].unhook(y), h !== !0); p--) if (h instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = p, this._stack.fallThrough = !1, h;
              p--;
            }
            for (; p >= 0; p--) if (h = this._active[p].unhook(!1), h instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = p, this._stack.fallThrough = !0, h;
          } else this._handlerFb(this._ident, "UNHOOK", y);
          this._active = f, this._ident = 0;
        }
      };
      const m = new u.Params();
      m.addParam(0), n.DcsHandler = class {
        constructor(y) {
          this._handler = y, this._data = "", this._params = m, this._hitLimit = !1;
        }
        hook(y) {
          this._params = y.length > 1 || y.params[0] ? y.clone() : m, this._data = "", this._hitLimit = !1;
        }
        put(y, v, h) {
          this._hitLimit || (this._data += (0, c.utf32ToString)(y, v, h), this._data.length > d.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = !0));
        }
        unhook(y) {
          let v = !1;
          if (this._hitLimit) v = !1;
          else if (y && (v = this._handler(this._data, this._params), v instanceof Promise)) return v.then((h) => (this._params = m, this._data = "", this._hitLimit = !1, h));
          return this._params = m, this._data = "", this._hitLimit = !1, v;
        }
      };
    }, 2015: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.EscapeSequenceParser = n.VT500_TRANSITION_TABLE = n.TransitionTable = void 0;
      const c = a(844), u = a(8742), d = a(6242), f = a(6351);
      class m {
        constructor(p) {
          this.table = new Uint8Array(p);
        }
        setDefault(p, g) {
          this.table.fill(p << 4 | g);
        }
        add(p, g, _, b) {
          this.table[g << 8 | p] = _ << 4 | b;
        }
        addMany(p, g, _, b) {
          for (let S = 0; S < p.length; S++) this.table[g << 8 | p[S]] = _ << 4 | b;
        }
      }
      n.TransitionTable = m;
      const y = 160;
      n.VT500_TRANSITION_TABLE = function() {
        const h = new m(4095), p = Array.apply(null, Array(256)).map((k, x) => x), g = (k, x) => p.slice(k, x), _ = g(32, 127), b = g(0, 24);
        b.push(25), b.push.apply(b, g(28, 32));
        const S = g(0, 14);
        let w;
        for (w in h.setDefault(1, 0), h.addMany(_, 0, 2, 0), S) h.addMany([24, 26, 153, 154], w, 3, 0), h.addMany(g(128, 144), w, 3, 0), h.addMany(g(144, 152), w, 3, 0), h.add(156, w, 0, 0), h.add(27, w, 11, 1), h.add(157, w, 4, 8), h.addMany([152, 158, 159], w, 0, 7), h.add(155, w, 11, 3), h.add(144, w, 11, 9);
        return h.addMany(b, 0, 3, 0), h.addMany(b, 1, 3, 1), h.add(127, 1, 0, 1), h.addMany(b, 8, 0, 8), h.addMany(b, 3, 3, 3), h.add(127, 3, 0, 3), h.addMany(b, 4, 3, 4), h.add(127, 4, 0, 4), h.addMany(b, 6, 3, 6), h.addMany(b, 5, 3, 5), h.add(127, 5, 0, 5), h.addMany(b, 2, 3, 2), h.add(127, 2, 0, 2), h.add(93, 1, 4, 8), h.addMany(_, 8, 5, 8), h.add(127, 8, 5, 8), h.addMany([156, 27, 24, 26, 7], 8, 6, 0), h.addMany(g(28, 32), 8, 0, 8), h.addMany([88, 94, 95], 1, 0, 7), h.addMany(_, 7, 0, 7), h.addMany(b, 7, 0, 7), h.add(156, 7, 0, 0), h.add(127, 7, 0, 7), h.add(91, 1, 11, 3), h.addMany(g(64, 127), 3, 7, 0), h.addMany(g(48, 60), 3, 8, 4), h.addMany([60, 61, 62, 63], 3, 9, 4), h.addMany(g(48, 60), 4, 8, 4), h.addMany(g(64, 127), 4, 7, 0), h.addMany([60, 61, 62, 63], 4, 0, 6), h.addMany(g(32, 64), 6, 0, 6), h.add(127, 6, 0, 6), h.addMany(g(64, 127), 6, 0, 0), h.addMany(g(32, 48), 3, 9, 5), h.addMany(g(32, 48), 5, 9, 5), h.addMany(g(48, 64), 5, 0, 6), h.addMany(g(64, 127), 5, 7, 0), h.addMany(g(32, 48), 4, 9, 5), h.addMany(g(32, 48), 1, 9, 2), h.addMany(g(32, 48), 2, 9, 2), h.addMany(g(48, 127), 2, 10, 0), h.addMany(g(48, 80), 1, 10, 0), h.addMany(g(81, 88), 1, 10, 0), h.addMany([89, 90, 92], 1, 10, 0), h.addMany(g(96, 127), 1, 10, 0), h.add(80, 1, 11, 9), h.addMany(b, 9, 0, 9), h.add(127, 9, 0, 9), h.addMany(g(28, 32), 9, 0, 9), h.addMany(g(32, 48), 9, 9, 12), h.addMany(g(48, 60), 9, 8, 10), h.addMany([60, 61, 62, 63], 9, 9, 10), h.addMany(b, 11, 0, 11), h.addMany(g(32, 128), 11, 0, 11), h.addMany(g(28, 32), 11, 0, 11), h.addMany(b, 10, 0, 10), h.add(127, 10, 0, 10), h.addMany(g(28, 32), 10, 0, 10), h.addMany(g(48, 60), 10, 8, 10), h.addMany([60, 61, 62, 63], 10, 0, 11), h.addMany(g(32, 48), 10, 9, 12), h.addMany(b, 12, 0, 12), h.add(127, 12, 0, 12), h.addMany(g(28, 32), 12, 0, 12), h.addMany(g(32, 48), 12, 9, 12), h.addMany(g(48, 64), 12, 0, 11), h.addMany(g(64, 127), 12, 12, 13), h.addMany(g(64, 127), 10, 12, 13), h.addMany(g(64, 127), 9, 12, 13), h.addMany(b, 13, 13, 13), h.addMany(_, 13, 13, 13), h.add(127, 13, 0, 13), h.addMany([27, 156, 24, 26], 13, 14, 0), h.add(y, 0, 2, 0), h.add(y, 8, 5, 8), h.add(y, 6, 0, 6), h.add(y, 11, 0, 11), h.add(y, 13, 13, 13), h;
      }();
      class v extends c.Disposable {
        constructor(p = n.VT500_TRANSITION_TABLE) {
          super(), this._transitions = p, this._parseStack = { state: 0, handlers: [], handlerPos: 0, transition: 0, chunkPos: 0 }, this.initialState = 0, this.currentState = this.initialState, this._params = new u.Params(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0, this._printHandlerFb = (g, _, b) => {
          }, this._executeHandlerFb = (g) => {
          }, this._csiHandlerFb = (g, _) => {
          }, this._escHandlerFb = (g) => {
          }, this._errorHandlerFb = (g) => g, this._printHandler = this._printHandlerFb, this._executeHandlers = /* @__PURE__ */ Object.create(null), this._csiHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null), this.register((0, c.toDisposable)(() => {
            this._csiHandlers = /* @__PURE__ */ Object.create(null), this._executeHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null);
          })), this._oscParser = this.register(new d.OscParser()), this._dcsParser = this.register(new f.DcsParser()), this._errorHandler = this._errorHandlerFb, this.registerEscHandler({ final: "\\" }, () => !0);
        }
        _identifier(p, g = [64, 126]) {
          let _ = 0;
          if (p.prefix) {
            if (p.prefix.length > 1) throw new Error("only one byte as prefix supported");
            if (_ = p.prefix.charCodeAt(0), _ && 60 > _ || _ > 63) throw new Error("prefix must be in range 0x3c .. 0x3f");
          }
          if (p.intermediates) {
            if (p.intermediates.length > 2) throw new Error("only two bytes as intermediates are supported");
            for (let S = 0; S < p.intermediates.length; ++S) {
              const w = p.intermediates.charCodeAt(S);
              if (32 > w || w > 47) throw new Error("intermediate must be in range 0x20 .. 0x2f");
              _ <<= 8, _ |= w;
            }
          }
          if (p.final.length !== 1) throw new Error("final must be a single byte");
          const b = p.final.charCodeAt(0);
          if (g[0] > b || b > g[1]) throw new Error(`final must be in range ${g[0]} .. ${g[1]}`);
          return _ <<= 8, _ |= b, _;
        }
        identToString(p) {
          const g = [];
          for (; p; ) g.push(String.fromCharCode(255 & p)), p >>= 8;
          return g.reverse().join("");
        }
        setPrintHandler(p) {
          this._printHandler = p;
        }
        clearPrintHandler() {
          this._printHandler = this._printHandlerFb;
        }
        registerEscHandler(p, g) {
          const _ = this._identifier(p, [48, 126]);
          this._escHandlers[_] === void 0 && (this._escHandlers[_] = []);
          const b = this._escHandlers[_];
          return b.push(g), { dispose: () => {
            const S = b.indexOf(g);
            S !== -1 && b.splice(S, 1);
          } };
        }
        clearEscHandler(p) {
          this._escHandlers[this._identifier(p, [48, 126])] && delete this._escHandlers[this._identifier(p, [48, 126])];
        }
        setEscHandlerFallback(p) {
          this._escHandlerFb = p;
        }
        setExecuteHandler(p, g) {
          this._executeHandlers[p.charCodeAt(0)] = g;
        }
        clearExecuteHandler(p) {
          this._executeHandlers[p.charCodeAt(0)] && delete this._executeHandlers[p.charCodeAt(0)];
        }
        setExecuteHandlerFallback(p) {
          this._executeHandlerFb = p;
        }
        registerCsiHandler(p, g) {
          const _ = this._identifier(p);
          this._csiHandlers[_] === void 0 && (this._csiHandlers[_] = []);
          const b = this._csiHandlers[_];
          return b.push(g), { dispose: () => {
            const S = b.indexOf(g);
            S !== -1 && b.splice(S, 1);
          } };
        }
        clearCsiHandler(p) {
          this._csiHandlers[this._identifier(p)] && delete this._csiHandlers[this._identifier(p)];
        }
        setCsiHandlerFallback(p) {
          this._csiHandlerFb = p;
        }
        registerDcsHandler(p, g) {
          return this._dcsParser.registerHandler(this._identifier(p), g);
        }
        clearDcsHandler(p) {
          this._dcsParser.clearHandler(this._identifier(p));
        }
        setDcsHandlerFallback(p) {
          this._dcsParser.setHandlerFallback(p);
        }
        registerOscHandler(p, g) {
          return this._oscParser.registerHandler(p, g);
        }
        clearOscHandler(p) {
          this._oscParser.clearHandler(p);
        }
        setOscHandlerFallback(p) {
          this._oscParser.setHandlerFallback(p);
        }
        setErrorHandler(p) {
          this._errorHandler = p;
        }
        clearErrorHandler() {
          this._errorHandler = this._errorHandlerFb;
        }
        reset() {
          this.currentState = this.initialState, this._oscParser.reset(), this._dcsParser.reset(), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0, this._parseStack.state !== 0 && (this._parseStack.state = 2, this._parseStack.handlers = []);
        }
        _preserveStack(p, g, _, b, S) {
          this._parseStack.state = p, this._parseStack.handlers = g, this._parseStack.handlerPos = _, this._parseStack.transition = b, this._parseStack.chunkPos = S;
        }
        parse(p, g, _) {
          let b, S = 0, w = 0, k = 0;
          if (this._parseStack.state) if (this._parseStack.state === 2) this._parseStack.state = 0, k = this._parseStack.chunkPos + 1;
          else {
            if (_ === void 0 || this._parseStack.state === 1) throw this._parseStack.state = 1, new Error("improper continuation due to previous async handler, giving up parsing");
            const x = this._parseStack.handlers;
            let C = this._parseStack.handlerPos - 1;
            switch (this._parseStack.state) {
              case 3:
                if (_ === !1 && C > -1) {
                  for (; C >= 0 && (b = x[C](this._params), b !== !0); C--) if (b instanceof Promise) return this._parseStack.handlerPos = C, b;
                }
                this._parseStack.handlers = [];
                break;
              case 4:
                if (_ === !1 && C > -1) {
                  for (; C >= 0 && (b = x[C](), b !== !0); C--) if (b instanceof Promise) return this._parseStack.handlerPos = C, b;
                }
                this._parseStack.handlers = [];
                break;
              case 6:
                if (S = p[this._parseStack.chunkPos], b = this._dcsParser.unhook(S !== 24 && S !== 26, _), b) return b;
                S === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
                break;
              case 5:
                if (S = p[this._parseStack.chunkPos], b = this._oscParser.end(S !== 24 && S !== 26, _), b) return b;
                S === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
            }
            this._parseStack.state = 0, k = this._parseStack.chunkPos + 1, this.precedingCodepoint = 0, this.currentState = 15 & this._parseStack.transition;
          }
          for (let x = k; x < g; ++x) {
            switch (S = p[x], w = this._transitions.table[this.currentState << 8 | (S < 160 ? S : y)], w >> 4) {
              case 2:
                for (let T = x + 1; ; ++T) {
                  if (T >= g || (S = p[T]) < 32 || S > 126 && S < y) {
                    this._printHandler(p, x, T), x = T - 1;
                    break;
                  }
                  if (++T >= g || (S = p[T]) < 32 || S > 126 && S < y) {
                    this._printHandler(p, x, T), x = T - 1;
                    break;
                  }
                  if (++T >= g || (S = p[T]) < 32 || S > 126 && S < y) {
                    this._printHandler(p, x, T), x = T - 1;
                    break;
                  }
                  if (++T >= g || (S = p[T]) < 32 || S > 126 && S < y) {
                    this._printHandler(p, x, T), x = T - 1;
                    break;
                  }
                }
                break;
              case 3:
                this._executeHandlers[S] ? this._executeHandlers[S]() : this._executeHandlerFb(S), this.precedingCodepoint = 0;
                break;
              case 0:
                break;
              case 1:
                if (this._errorHandler({ position: x, code: S, currentState: this.currentState, collect: this._collect, params: this._params, abort: !1 }).abort) return;
                break;
              case 7:
                const C = this._csiHandlers[this._collect << 8 | S];
                let A = C ? C.length - 1 : -1;
                for (; A >= 0 && (b = C[A](this._params), b !== !0); A--) if (b instanceof Promise) return this._preserveStack(3, C, A, w, x), b;
                A < 0 && this._csiHandlerFb(this._collect << 8 | S, this._params), this.precedingCodepoint = 0;
                break;
              case 8:
                do
                  switch (S) {
                    case 59:
                      this._params.addParam(0);
                      break;
                    case 58:
                      this._params.addSubParam(-1);
                      break;
                    default:
                      this._params.addDigit(S - 48);
                  }
                while (++x < g && (S = p[x]) > 47 && S < 60);
                x--;
                break;
              case 9:
                this._collect <<= 8, this._collect |= S;
                break;
              case 10:
                const L = this._escHandlers[this._collect << 8 | S];
                let M = L ? L.length - 1 : -1;
                for (; M >= 0 && (b = L[M](), b !== !0); M--) if (b instanceof Promise) return this._preserveStack(4, L, M, w, x), b;
                M < 0 && this._escHandlerFb(this._collect << 8 | S), this.precedingCodepoint = 0;
                break;
              case 11:
                this._params.reset(), this._params.addParam(0), this._collect = 0;
                break;
              case 12:
                this._dcsParser.hook(this._collect << 8 | S, this._params);
                break;
              case 13:
                for (let T = x + 1; ; ++T) if (T >= g || (S = p[T]) === 24 || S === 26 || S === 27 || S > 127 && S < y) {
                  this._dcsParser.put(p, x, T), x = T - 1;
                  break;
                }
                break;
              case 14:
                if (b = this._dcsParser.unhook(S !== 24 && S !== 26), b) return this._preserveStack(6, [], 0, w, x), b;
                S === 27 && (w |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0;
                break;
              case 4:
                this._oscParser.start();
                break;
              case 5:
                for (let T = x + 1; ; T++) if (T >= g || (S = p[T]) < 32 || S > 127 && S < y) {
                  this._oscParser.put(p, x, T), x = T - 1;
                  break;
                }
                break;
              case 6:
                if (b = this._oscParser.end(S !== 24 && S !== 26), b) return this._preserveStack(5, [], 0, w, x), b;
                S === 27 && (w |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0;
            }
            this.currentState = 15 & w;
          }
        }
      }
      n.EscapeSequenceParser = v;
    }, 6242: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.OscHandler = n.OscParser = void 0;
      const c = a(5770), u = a(482), d = [];
      n.OscParser = class {
        constructor() {
          this._state = 0, this._active = d, this._id = -1, this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._stack = { paused: !1, loopPosition: 0, fallThrough: !1 };
        }
        registerHandler(f, m) {
          this._handlers[f] === void 0 && (this._handlers[f] = []);
          const y = this._handlers[f];
          return y.push(m), { dispose: () => {
            const v = y.indexOf(m);
            v !== -1 && y.splice(v, 1);
          } };
        }
        clearHandler(f) {
          this._handlers[f] && delete this._handlers[f];
        }
        setHandlerFallback(f) {
          this._handlerFb = f;
        }
        dispose() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._active = d;
        }
        reset() {
          if (this._state === 2) for (let f = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; f >= 0; --f) this._active[f].end(!1);
          this._stack.paused = !1, this._active = d, this._id = -1, this._state = 0;
        }
        _start() {
          if (this._active = this._handlers[this._id] || d, this._active.length) for (let f = this._active.length - 1; f >= 0; f--) this._active[f].start();
          else this._handlerFb(this._id, "START");
        }
        _put(f, m, y) {
          if (this._active.length) for (let v = this._active.length - 1; v >= 0; v--) this._active[v].put(f, m, y);
          else this._handlerFb(this._id, "PUT", (0, u.utf32ToString)(f, m, y));
        }
        start() {
          this.reset(), this._state = 1;
        }
        put(f, m, y) {
          if (this._state !== 3) {
            if (this._state === 1) for (; m < y; ) {
              const v = f[m++];
              if (v === 59) {
                this._state = 2, this._start();
                break;
              }
              if (v < 48 || 57 < v) return void (this._state = 3);
              this._id === -1 && (this._id = 0), this._id = 10 * this._id + v - 48;
            }
            this._state === 2 && y - m > 0 && this._put(f, m, y);
          }
        }
        end(f, m = !0) {
          if (this._state !== 0) {
            if (this._state !== 3) if (this._state === 1 && this._start(), this._active.length) {
              let y = !1, v = this._active.length - 1, h = !1;
              if (this._stack.paused && (v = this._stack.loopPosition - 1, y = m, h = this._stack.fallThrough, this._stack.paused = !1), !h && y === !1) {
                for (; v >= 0 && (y = this._active[v].end(f), y !== !0); v--) if (y instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = v, this._stack.fallThrough = !1, y;
                v--;
              }
              for (; v >= 0; v--) if (y = this._active[v].end(!1), y instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = v, this._stack.fallThrough = !0, y;
            } else this._handlerFb(this._id, "END", f);
            this._active = d, this._id = -1, this._state = 0;
          }
        }
      }, n.OscHandler = class {
        constructor(f) {
          this._handler = f, this._data = "", this._hitLimit = !1;
        }
        start() {
          this._data = "", this._hitLimit = !1;
        }
        put(f, m, y) {
          this._hitLimit || (this._data += (0, u.utf32ToString)(f, m, y), this._data.length > c.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = !0));
        }
        end(f) {
          let m = !1;
          if (this._hitLimit) m = !1;
          else if (f && (m = this._handler(this._data), m instanceof Promise)) return m.then((y) => (this._data = "", this._hitLimit = !1, y));
          return this._data = "", this._hitLimit = !1, m;
        }
      };
    }, 8742: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.Params = void 0;
      const a = 2147483647;
      class c {
        static fromArray(d) {
          const f = new c();
          if (!d.length) return f;
          for (let m = Array.isArray(d[0]) ? 1 : 0; m < d.length; ++m) {
            const y = d[m];
            if (Array.isArray(y)) for (let v = 0; v < y.length; ++v) f.addSubParam(y[v]);
            else f.addParam(y);
          }
          return f;
        }
        constructor(d = 32, f = 32) {
          if (this.maxLength = d, this.maxSubParamsLength = f, f > 256) throw new Error("maxSubParamsLength must not be greater than 256");
          this.params = new Int32Array(d), this.length = 0, this._subParams = new Int32Array(f), this._subParamsLength = 0, this._subParamsIdx = new Uint16Array(d), this._rejectDigits = !1, this._rejectSubDigits = !1, this._digitIsSub = !1;
        }
        clone() {
          const d = new c(this.maxLength, this.maxSubParamsLength);
          return d.params.set(this.params), d.length = this.length, d._subParams.set(this._subParams), d._subParamsLength = this._subParamsLength, d._subParamsIdx.set(this._subParamsIdx), d._rejectDigits = this._rejectDigits, d._rejectSubDigits = this._rejectSubDigits, d._digitIsSub = this._digitIsSub, d;
        }
        toArray() {
          const d = [];
          for (let f = 0; f < this.length; ++f) {
            d.push(this.params[f]);
            const m = this._subParamsIdx[f] >> 8, y = 255 & this._subParamsIdx[f];
            y - m > 0 && d.push(Array.prototype.slice.call(this._subParams, m, y));
          }
          return d;
        }
        reset() {
          this.length = 0, this._subParamsLength = 0, this._rejectDigits = !1, this._rejectSubDigits = !1, this._digitIsSub = !1;
        }
        addParam(d) {
          if (this._digitIsSub = !1, this.length >= this.maxLength) this._rejectDigits = !0;
          else {
            if (d < -1) throw new Error("values lesser than -1 are not allowed");
            this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength, this.params[this.length++] = d > a ? a : d;
          }
        }
        addSubParam(d) {
          if (this._digitIsSub = !0, this.length) if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) this._rejectSubDigits = !0;
          else {
            if (d < -1) throw new Error("values lesser than -1 are not allowed");
            this._subParams[this._subParamsLength++] = d > a ? a : d, this._subParamsIdx[this.length - 1]++;
          }
        }
        hasSubParams(d) {
          return (255 & this._subParamsIdx[d]) - (this._subParamsIdx[d] >> 8) > 0;
        }
        getSubParams(d) {
          const f = this._subParamsIdx[d] >> 8, m = 255 & this._subParamsIdx[d];
          return m - f > 0 ? this._subParams.subarray(f, m) : null;
        }
        getSubParamsAll() {
          const d = {};
          for (let f = 0; f < this.length; ++f) {
            const m = this._subParamsIdx[f] >> 8, y = 255 & this._subParamsIdx[f];
            y - m > 0 && (d[f] = this._subParams.slice(m, y));
          }
          return d;
        }
        addDigit(d) {
          let f;
          if (this._rejectDigits || !(f = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits) return;
          const m = this._digitIsSub ? this._subParams : this.params, y = m[f - 1];
          m[f - 1] = ~y ? Math.min(10 * y + d, a) : d;
        }
      }
      n.Params = c;
    }, 5741: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.AddonManager = void 0, n.AddonManager = class {
        constructor() {
          this._addons = [];
        }
        dispose() {
          for (let a = this._addons.length - 1; a >= 0; a--) this._addons[a].instance.dispose();
        }
        loadAddon(a, c) {
          const u = { instance: c, dispose: c.dispose, isDisposed: !1 };
          this._addons.push(u), c.dispose = () => this._wrappedAddonDispose(u), c.activate(a);
        }
        _wrappedAddonDispose(a) {
          if (a.isDisposed) return;
          let c = -1;
          for (let u = 0; u < this._addons.length; u++) if (this._addons[u] === a) {
            c = u;
            break;
          }
          if (c === -1) throw new Error("Could not dispose an addon that has not been loaded");
          a.isDisposed = !0, a.dispose.apply(a.instance), this._addons.splice(c, 1);
        }
      };
    }, 8771: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferApiView = void 0;
      const c = a(3785), u = a(511);
      n.BufferApiView = class {
        constructor(d, f) {
          this._buffer = d, this.type = f;
        }
        init(d) {
          return this._buffer = d, this;
        }
        get cursorY() {
          return this._buffer.y;
        }
        get cursorX() {
          return this._buffer.x;
        }
        get viewportY() {
          return this._buffer.ydisp;
        }
        get baseY() {
          return this._buffer.ybase;
        }
        get length() {
          return this._buffer.lines.length;
        }
        getLine(d) {
          const f = this._buffer.lines.get(d);
          if (f) return new c.BufferLineApiView(f);
        }
        getNullCell() {
          return new u.CellData();
        }
      };
    }, 3785: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferLineApiView = void 0;
      const c = a(511);
      n.BufferLineApiView = class {
        constructor(u) {
          this._line = u;
        }
        get isWrapped() {
          return this._line.isWrapped;
        }
        get length() {
          return this._line.length;
        }
        getCell(u, d) {
          if (!(u < 0 || u >= this._line.length)) return d ? (this._line.loadCell(u, d), d) : this._line.loadCell(u, new c.CellData());
        }
        translateToString(u, d, f) {
          return this._line.translateToString(u, d, f);
        }
      };
    }, 8285: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferNamespaceApi = void 0;
      const c = a(8771), u = a(8460), d = a(844);
      class f extends d.Disposable {
        constructor(y) {
          super(), this._core = y, this._onBufferChange = this.register(new u.EventEmitter()), this.onBufferChange = this._onBufferChange.event, this._normal = new c.BufferApiView(this._core.buffers.normal, "normal"), this._alternate = new c.BufferApiView(this._core.buffers.alt, "alternate"), this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active));
        }
        get active() {
          if (this._core.buffers.active === this._core.buffers.normal) return this.normal;
          if (this._core.buffers.active === this._core.buffers.alt) return this.alternate;
          throw new Error("Active buffer is neither normal nor alternate");
        }
        get normal() {
          return this._normal.init(this._core.buffers.normal);
        }
        get alternate() {
          return this._alternate.init(this._core.buffers.alt);
        }
      }
      n.BufferNamespaceApi = f;
    }, 7975: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.ParserApi = void 0, n.ParserApi = class {
        constructor(a) {
          this._core = a;
        }
        registerCsiHandler(a, c) {
          return this._core.registerCsiHandler(a, (u) => c(u.toArray()));
        }
        addCsiHandler(a, c) {
          return this.registerCsiHandler(a, c);
        }
        registerDcsHandler(a, c) {
          return this._core.registerDcsHandler(a, (u, d) => c(u, d.toArray()));
        }
        addDcsHandler(a, c) {
          return this.registerDcsHandler(a, c);
        }
        registerEscHandler(a, c) {
          return this._core.registerEscHandler(a, c);
        }
        addEscHandler(a, c) {
          return this.registerEscHandler(a, c);
        }
        registerOscHandler(a, c) {
          return this._core.registerOscHandler(a, c);
        }
        addOscHandler(a, c) {
          return this.registerOscHandler(a, c);
        }
      };
    }, 7090: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.UnicodeApi = void 0, n.UnicodeApi = class {
        constructor(a) {
          this._core = a;
        }
        register(a) {
          this._core.unicodeService.register(a);
        }
        get versions() {
          return this._core.unicodeService.versions;
        }
        get activeVersion() {
          return this._core.unicodeService.activeVersion;
        }
        set activeVersion(a) {
          this._core.unicodeService.activeVersion = a;
        }
      };
    }, 744: function(l, n, a) {
      var c = this && this.__decorate || function(h, p, g, _) {
        var b, S = arguments.length, w = S < 3 ? p : _ === null ? _ = Object.getOwnPropertyDescriptor(p, g) : _;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") w = Reflect.decorate(h, p, g, _);
        else for (var k = h.length - 1; k >= 0; k--) (b = h[k]) && (w = (S < 3 ? b(w) : S > 3 ? b(p, g, w) : b(p, g)) || w);
        return S > 3 && w && Object.defineProperty(p, g, w), w;
      }, u = this && this.__param || function(h, p) {
        return function(g, _) {
          p(g, _, h);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.BufferService = n.MINIMUM_ROWS = n.MINIMUM_COLS = void 0;
      const d = a(8460), f = a(844), m = a(5295), y = a(2585);
      n.MINIMUM_COLS = 2, n.MINIMUM_ROWS = 1;
      let v = n.BufferService = class extends f.Disposable {
        get buffer() {
          return this.buffers.active;
        }
        constructor(h) {
          super(), this.isUserScrolling = !1, this._onResize = this.register(new d.EventEmitter()), this.onResize = this._onResize.event, this._onScroll = this.register(new d.EventEmitter()), this.onScroll = this._onScroll.event, this.cols = Math.max(h.rawOptions.cols || 0, n.MINIMUM_COLS), this.rows = Math.max(h.rawOptions.rows || 0, n.MINIMUM_ROWS), this.buffers = this.register(new m.BufferSet(h, this));
        }
        resize(h, p) {
          this.cols = h, this.rows = p, this.buffers.resize(h, p), this._onResize.fire({ cols: h, rows: p });
        }
        reset() {
          this.buffers.reset(), this.isUserScrolling = !1;
        }
        scroll(h, p = !1) {
          const g = this.buffer;
          let _;
          _ = this._cachedBlankLine, _ && _.length === this.cols && _.getFg(0) === h.fg && _.getBg(0) === h.bg || (_ = g.getBlankLine(h, p), this._cachedBlankLine = _), _.isWrapped = p;
          const b = g.ybase + g.scrollTop, S = g.ybase + g.scrollBottom;
          if (g.scrollTop === 0) {
            const w = g.lines.isFull;
            S === g.lines.length - 1 ? w ? g.lines.recycle().copyFrom(_) : g.lines.push(_.clone()) : g.lines.splice(S + 1, 0, _.clone()), w ? this.isUserScrolling && (g.ydisp = Math.max(g.ydisp - 1, 0)) : (g.ybase++, this.isUserScrolling || g.ydisp++);
          } else {
            const w = S - b + 1;
            g.lines.shiftElements(b + 1, w - 1, -1), g.lines.set(S, _.clone());
          }
          this.isUserScrolling || (g.ydisp = g.ybase), this._onScroll.fire(g.ydisp);
        }
        scrollLines(h, p, g) {
          const _ = this.buffer;
          if (h < 0) {
            if (_.ydisp === 0) return;
            this.isUserScrolling = !0;
          } else h + _.ydisp >= _.ybase && (this.isUserScrolling = !1);
          const b = _.ydisp;
          _.ydisp = Math.max(Math.min(_.ydisp + h, _.ybase), 0), b !== _.ydisp && (p || this._onScroll.fire(_.ydisp));
        }
      };
      n.BufferService = v = c([u(0, y.IOptionsService)], v);
    }, 7994: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CharsetService = void 0, n.CharsetService = class {
        constructor() {
          this.glevel = 0, this._charsets = [];
        }
        reset() {
          this.charset = void 0, this._charsets = [], this.glevel = 0;
        }
        setgLevel(a) {
          this.glevel = a, this.charset = this._charsets[a];
        }
        setgCharset(a, c) {
          this._charsets[a] = c, this.glevel === a && (this.charset = c);
        }
      };
    }, 1753: function(l, n, a) {
      var c = this && this.__decorate || function(_, b, S, w) {
        var k, x = arguments.length, C = x < 3 ? b : w === null ? w = Object.getOwnPropertyDescriptor(b, S) : w;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") C = Reflect.decorate(_, b, S, w);
        else for (var A = _.length - 1; A >= 0; A--) (k = _[A]) && (C = (x < 3 ? k(C) : x > 3 ? k(b, S, C) : k(b, S)) || C);
        return x > 3 && C && Object.defineProperty(b, S, C), C;
      }, u = this && this.__param || function(_, b) {
        return function(S, w) {
          b(S, w, _);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CoreMouseService = void 0;
      const d = a(2585), f = a(8460), m = a(844), y = { NONE: { events: 0, restrict: () => !1 }, X10: { events: 1, restrict: (_) => _.button !== 4 && _.action === 1 && (_.ctrl = !1, _.alt = !1, _.shift = !1, !0) }, VT200: { events: 19, restrict: (_) => _.action !== 32 }, DRAG: { events: 23, restrict: (_) => _.action !== 32 || _.button !== 3 }, ANY: { events: 31, restrict: (_) => !0 } };
      function v(_, b) {
        let S = (_.ctrl ? 16 : 0) | (_.shift ? 4 : 0) | (_.alt ? 8 : 0);
        return _.button === 4 ? (S |= 64, S |= _.action) : (S |= 3 & _.button, 4 & _.button && (S |= 64), 8 & _.button && (S |= 128), _.action === 32 ? S |= 32 : _.action !== 0 || b || (S |= 3)), S;
      }
      const h = String.fromCharCode, p = { DEFAULT: (_) => {
        const b = [v(_, !1) + 32, _.col + 32, _.row + 32];
        return b[0] > 255 || b[1] > 255 || b[2] > 255 ? "" : `\x1B[M${h(b[0])}${h(b[1])}${h(b[2])}`;
      }, SGR: (_) => {
        const b = _.action === 0 && _.button !== 4 ? "m" : "M";
        return `\x1B[<${v(_, !0)};${_.col};${_.row}${b}`;
      }, SGR_PIXELS: (_) => {
        const b = _.action === 0 && _.button !== 4 ? "m" : "M";
        return `\x1B[<${v(_, !0)};${_.x};${_.y}${b}`;
      } };
      let g = n.CoreMouseService = class extends m.Disposable {
        constructor(_, b) {
          super(), this._bufferService = _, this._coreService = b, this._protocols = {}, this._encodings = {}, this._activeProtocol = "", this._activeEncoding = "", this._lastEvent = null, this._onProtocolChange = this.register(new f.EventEmitter()), this.onProtocolChange = this._onProtocolChange.event;
          for (const S of Object.keys(y)) this.addProtocol(S, y[S]);
          for (const S of Object.keys(p)) this.addEncoding(S, p[S]);
          this.reset();
        }
        addProtocol(_, b) {
          this._protocols[_] = b;
        }
        addEncoding(_, b) {
          this._encodings[_] = b;
        }
        get activeProtocol() {
          return this._activeProtocol;
        }
        get areMouseEventsActive() {
          return this._protocols[this._activeProtocol].events !== 0;
        }
        set activeProtocol(_) {
          if (!this._protocols[_]) throw new Error(`unknown protocol "${_}"`);
          this._activeProtocol = _, this._onProtocolChange.fire(this._protocols[_].events);
        }
        get activeEncoding() {
          return this._activeEncoding;
        }
        set activeEncoding(_) {
          if (!this._encodings[_]) throw new Error(`unknown encoding "${_}"`);
          this._activeEncoding = _;
        }
        reset() {
          this.activeProtocol = "NONE", this.activeEncoding = "DEFAULT", this._lastEvent = null;
        }
        triggerMouseEvent(_) {
          if (_.col < 0 || _.col >= this._bufferService.cols || _.row < 0 || _.row >= this._bufferService.rows || _.button === 4 && _.action === 32 || _.button === 3 && _.action !== 32 || _.button !== 4 && (_.action === 2 || _.action === 3) || (_.col++, _.row++, _.action === 32 && this._lastEvent && this._equalEvents(this._lastEvent, _, this._activeEncoding === "SGR_PIXELS")) || !this._protocols[this._activeProtocol].restrict(_)) return !1;
          const b = this._encodings[this._activeEncoding](_);
          return b && (this._activeEncoding === "DEFAULT" ? this._coreService.triggerBinaryEvent(b) : this._coreService.triggerDataEvent(b, !0)), this._lastEvent = _, !0;
        }
        explainEvents(_) {
          return { down: !!(1 & _), up: !!(2 & _), drag: !!(4 & _), move: !!(8 & _), wheel: !!(16 & _) };
        }
        _equalEvents(_, b, S) {
          if (S) {
            if (_.x !== b.x || _.y !== b.y) return !1;
          } else if (_.col !== b.col || _.row !== b.row) return !1;
          return _.button === b.button && _.action === b.action && _.ctrl === b.ctrl && _.alt === b.alt && _.shift === b.shift;
        }
      };
      n.CoreMouseService = g = c([u(0, d.IBufferService), u(1, d.ICoreService)], g);
    }, 6975: function(l, n, a) {
      var c = this && this.__decorate || function(g, _, b, S) {
        var w, k = arguments.length, x = k < 3 ? _ : S === null ? S = Object.getOwnPropertyDescriptor(_, b) : S;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") x = Reflect.decorate(g, _, b, S);
        else for (var C = g.length - 1; C >= 0; C--) (w = g[C]) && (x = (k < 3 ? w(x) : k > 3 ? w(_, b, x) : w(_, b)) || x);
        return k > 3 && x && Object.defineProperty(_, b, x), x;
      }, u = this && this.__param || function(g, _) {
        return function(b, S) {
          _(b, S, g);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.CoreService = void 0;
      const d = a(1439), f = a(8460), m = a(844), y = a(2585), v = Object.freeze({ insertMode: !1 }), h = Object.freeze({ applicationCursorKeys: !1, applicationKeypad: !1, bracketedPasteMode: !1, origin: !1, reverseWraparound: !1, sendFocus: !1, wraparound: !0 });
      let p = n.CoreService = class extends m.Disposable {
        constructor(g, _, b) {
          super(), this._bufferService = g, this._logService = _, this._optionsService = b, this.isCursorInitialized = !1, this.isCursorHidden = !1, this._onData = this.register(new f.EventEmitter()), this.onData = this._onData.event, this._onUserInput = this.register(new f.EventEmitter()), this.onUserInput = this._onUserInput.event, this._onBinary = this.register(new f.EventEmitter()), this.onBinary = this._onBinary.event, this._onRequestScrollToBottom = this.register(new f.EventEmitter()), this.onRequestScrollToBottom = this._onRequestScrollToBottom.event, this.modes = (0, d.clone)(v), this.decPrivateModes = (0, d.clone)(h);
        }
        reset() {
          this.modes = (0, d.clone)(v), this.decPrivateModes = (0, d.clone)(h);
        }
        triggerDataEvent(g, _ = !1) {
          if (this._optionsService.rawOptions.disableStdin) return;
          const b = this._bufferService.buffer;
          _ && this._optionsService.rawOptions.scrollOnUserInput && b.ybase !== b.ydisp && this._onRequestScrollToBottom.fire(), _ && this._onUserInput.fire(), this._logService.debug(`sending data "${g}"`, () => g.split("").map((S) => S.charCodeAt(0))), this._onData.fire(g);
        }
        triggerBinaryEvent(g) {
          this._optionsService.rawOptions.disableStdin || (this._logService.debug(`sending binary "${g}"`, () => g.split("").map((_) => _.charCodeAt(0))), this._onBinary.fire(g));
        }
      };
      n.CoreService = p = c([u(0, y.IBufferService), u(1, y.ILogService), u(2, y.IOptionsService)], p);
    }, 9074: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.DecorationService = void 0;
      const c = a(8055), u = a(8460), d = a(844), f = a(6106);
      let m = 0, y = 0;
      class v extends d.Disposable {
        get decorations() {
          return this._decorations.values();
        }
        constructor() {
          super(), this._decorations = new f.SortedList((g) => g == null ? void 0 : g.marker.line), this._onDecorationRegistered = this.register(new u.EventEmitter()), this.onDecorationRegistered = this._onDecorationRegistered.event, this._onDecorationRemoved = this.register(new u.EventEmitter()), this.onDecorationRemoved = this._onDecorationRemoved.event, this.register((0, d.toDisposable)(() => this.reset()));
        }
        registerDecoration(g) {
          if (g.marker.isDisposed) return;
          const _ = new h(g);
          if (_) {
            const b = _.marker.onDispose(() => _.dispose());
            _.onDispose(() => {
              _ && (this._decorations.delete(_) && this._onDecorationRemoved.fire(_), b.dispose());
            }), this._decorations.insert(_), this._onDecorationRegistered.fire(_);
          }
          return _;
        }
        reset() {
          for (const g of this._decorations.values()) g.dispose();
          this._decorations.clear();
        }
        *getDecorationsAtCell(g, _, b) {
          var S, w, k;
          let x = 0, C = 0;
          for (const A of this._decorations.getKeyIterator(_)) x = (S = A.options.x) !== null && S !== void 0 ? S : 0, C = x + ((w = A.options.width) !== null && w !== void 0 ? w : 1), g >= x && g < C && (!b || ((k = A.options.layer) !== null && k !== void 0 ? k : "bottom") === b) && (yield A);
        }
        forEachDecorationAtCell(g, _, b, S) {
          this._decorations.forEachByKey(_, (w) => {
            var k, x, C;
            m = (k = w.options.x) !== null && k !== void 0 ? k : 0, y = m + ((x = w.options.width) !== null && x !== void 0 ? x : 1), g >= m && g < y && (!b || ((C = w.options.layer) !== null && C !== void 0 ? C : "bottom") === b) && S(w);
          });
        }
      }
      n.DecorationService = v;
      class h extends d.Disposable {
        get isDisposed() {
          return this._isDisposed;
        }
        get backgroundColorRGB() {
          return this._cachedBg === null && (this.options.backgroundColor ? this._cachedBg = c.css.toColor(this.options.backgroundColor) : this._cachedBg = void 0), this._cachedBg;
        }
        get foregroundColorRGB() {
          return this._cachedFg === null && (this.options.foregroundColor ? this._cachedFg = c.css.toColor(this.options.foregroundColor) : this._cachedFg = void 0), this._cachedFg;
        }
        constructor(g) {
          super(), this.options = g, this.onRenderEmitter = this.register(new u.EventEmitter()), this.onRender = this.onRenderEmitter.event, this._onDispose = this.register(new u.EventEmitter()), this.onDispose = this._onDispose.event, this._cachedBg = null, this._cachedFg = null, this.marker = g.marker, this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position && (this.options.overviewRulerOptions.position = "full");
        }
        dispose() {
          this._onDispose.fire(), super.dispose();
        }
      }
    }, 4348: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.InstantiationService = n.ServiceCollection = void 0;
      const c = a(2585), u = a(8343);
      class d {
        constructor(...m) {
          this._entries = /* @__PURE__ */ new Map();
          for (const [y, v] of m) this.set(y, v);
        }
        set(m, y) {
          const v = this._entries.get(m);
          return this._entries.set(m, y), v;
        }
        forEach(m) {
          for (const [y, v] of this._entries.entries()) m(y, v);
        }
        has(m) {
          return this._entries.has(m);
        }
        get(m) {
          return this._entries.get(m);
        }
      }
      n.ServiceCollection = d, n.InstantiationService = class {
        constructor() {
          this._services = new d(), this._services.set(c.IInstantiationService, this);
        }
        setService(f, m) {
          this._services.set(f, m);
        }
        getService(f) {
          return this._services.get(f);
        }
        createInstance(f, ...m) {
          const y = (0, u.getServiceDependencies)(f).sort((p, g) => p.index - g.index), v = [];
          for (const p of y) {
            const g = this._services.get(p.id);
            if (!g) throw new Error(`[createInstance] ${f.name} depends on UNKNOWN service ${p.id}.`);
            v.push(g);
          }
          const h = y.length > 0 ? y[0].index : m.length;
          if (m.length !== h) throw new Error(`[createInstance] First service dependency of ${f.name} at position ${h + 1} conflicts with ${m.length} static arguments`);
          return new f(...m, ...v);
        }
      };
    }, 7866: function(l, n, a) {
      var c = this && this.__decorate || function(h, p, g, _) {
        var b, S = arguments.length, w = S < 3 ? p : _ === null ? _ = Object.getOwnPropertyDescriptor(p, g) : _;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") w = Reflect.decorate(h, p, g, _);
        else for (var k = h.length - 1; k >= 0; k--) (b = h[k]) && (w = (S < 3 ? b(w) : S > 3 ? b(p, g, w) : b(p, g)) || w);
        return S > 3 && w && Object.defineProperty(p, g, w), w;
      }, u = this && this.__param || function(h, p) {
        return function(g, _) {
          p(g, _, h);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.traceCall = n.setTraceLogger = n.LogService = void 0;
      const d = a(844), f = a(2585), m = { trace: f.LogLevelEnum.TRACE, debug: f.LogLevelEnum.DEBUG, info: f.LogLevelEnum.INFO, warn: f.LogLevelEnum.WARN, error: f.LogLevelEnum.ERROR, off: f.LogLevelEnum.OFF };
      let y, v = n.LogService = class extends d.Disposable {
        get logLevel() {
          return this._logLevel;
        }
        constructor(h) {
          super(), this._optionsService = h, this._logLevel = f.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), y = this;
        }
        _updateLogLevel() {
          this._logLevel = m[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(h) {
          for (let p = 0; p < h.length; p++) typeof h[p] == "function" && (h[p] = h[p]());
        }
        _log(h, p, g) {
          this._evalLazyOptionalParams(g), h.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + p, ...g);
        }
        trace(h, ...p) {
          var g, _;
          this._logLevel <= f.LogLevelEnum.TRACE && this._log((_ = (g = this._optionsService.options.logger) === null || g === void 0 ? void 0 : g.trace.bind(this._optionsService.options.logger)) !== null && _ !== void 0 ? _ : console.log, h, p);
        }
        debug(h, ...p) {
          var g, _;
          this._logLevel <= f.LogLevelEnum.DEBUG && this._log((_ = (g = this._optionsService.options.logger) === null || g === void 0 ? void 0 : g.debug.bind(this._optionsService.options.logger)) !== null && _ !== void 0 ? _ : console.log, h, p);
        }
        info(h, ...p) {
          var g, _;
          this._logLevel <= f.LogLevelEnum.INFO && this._log((_ = (g = this._optionsService.options.logger) === null || g === void 0 ? void 0 : g.info.bind(this._optionsService.options.logger)) !== null && _ !== void 0 ? _ : console.info, h, p);
        }
        warn(h, ...p) {
          var g, _;
          this._logLevel <= f.LogLevelEnum.WARN && this._log((_ = (g = this._optionsService.options.logger) === null || g === void 0 ? void 0 : g.warn.bind(this._optionsService.options.logger)) !== null && _ !== void 0 ? _ : console.warn, h, p);
        }
        error(h, ...p) {
          var g, _;
          this._logLevel <= f.LogLevelEnum.ERROR && this._log((_ = (g = this._optionsService.options.logger) === null || g === void 0 ? void 0 : g.error.bind(this._optionsService.options.logger)) !== null && _ !== void 0 ? _ : console.error, h, p);
        }
      };
      n.LogService = v = c([u(0, f.IOptionsService)], v), n.setTraceLogger = function(h) {
        y = h;
      }, n.traceCall = function(h, p, g) {
        if (typeof g.value != "function") throw new Error("not supported");
        const _ = g.value;
        g.value = function(...b) {
          if (y.logLevel !== f.LogLevelEnum.TRACE) return _.apply(this, b);
          y.trace(`GlyphRenderer#${_.name}(${b.map((w) => JSON.stringify(w)).join(", ")})`);
          const S = _.apply(this, b);
          return y.trace(`GlyphRenderer#${_.name} return`, S), S;
        };
      };
    }, 7302: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.OptionsService = n.DEFAULT_OPTIONS = void 0;
      const c = a(8460), u = a(844), d = a(6114);
      n.DEFAULT_OPTIONS = { cols: 80, rows: 24, cursorBlink: !1, cursorStyle: "block", cursorWidth: 1, cursorInactiveStyle: "outline", customGlyphs: !0, drawBoldTextInBrightColors: !0, fastScrollModifier: "alt", fastScrollSensitivity: 5, fontFamily: "courier-new, courier, monospace", fontSize: 15, fontWeight: "normal", fontWeightBold: "bold", ignoreBracketedPasteMode: !1, lineHeight: 1, letterSpacing: 0, linkHandler: null, logLevel: "info", logger: null, scrollback: 1e3, scrollOnUserInput: !0, scrollSensitivity: 1, screenReaderMode: !1, smoothScrollDuration: 0, macOptionIsMeta: !1, macOptionClickForcesSelection: !1, minimumContrastRatio: 1, disableStdin: !1, allowProposedApi: !1, allowTransparency: !1, tabStopWidth: 8, theme: {}, rightClickSelectsWord: d.isMac, windowOptions: {}, windowsMode: !1, windowsPty: {}, wordSeparator: " ()[]{}',\"`", altClickMovesCursor: !0, convertEol: !1, termName: "xterm", cancelEvents: !1, overviewRulerWidth: 0 };
      const f = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
      class m extends u.Disposable {
        constructor(v) {
          super(), this._onOptionChange = this.register(new c.EventEmitter()), this.onOptionChange = this._onOptionChange.event;
          const h = Object.assign({}, n.DEFAULT_OPTIONS);
          for (const p in v) if (p in h) try {
            const g = v[p];
            h[p] = this._sanitizeAndValidateOption(p, g);
          } catch (g) {
            console.error(g);
          }
          this.rawOptions = h, this.options = Object.assign({}, h), this._setupOptions();
        }
        onSpecificOptionChange(v, h) {
          return this.onOptionChange((p) => {
            p === v && h(this.rawOptions[v]);
          });
        }
        onMultipleOptionChange(v, h) {
          return this.onOptionChange((p) => {
            v.indexOf(p) !== -1 && h();
          });
        }
        _setupOptions() {
          const v = (p) => {
            if (!(p in n.DEFAULT_OPTIONS)) throw new Error(`No option with key "${p}"`);
            return this.rawOptions[p];
          }, h = (p, g) => {
            if (!(p in n.DEFAULT_OPTIONS)) throw new Error(`No option with key "${p}"`);
            g = this._sanitizeAndValidateOption(p, g), this.rawOptions[p] !== g && (this.rawOptions[p] = g, this._onOptionChange.fire(p));
          };
          for (const p in this.rawOptions) {
            const g = { get: v.bind(this, p), set: h.bind(this, p) };
            Object.defineProperty(this.options, p, g);
          }
        }
        _sanitizeAndValidateOption(v, h) {
          switch (v) {
            case "cursorStyle":
              if (h || (h = n.DEFAULT_OPTIONS[v]), !/* @__PURE__ */ function(p) {
                return p === "block" || p === "underline" || p === "bar";
              }(h)) throw new Error(`"${h}" is not a valid value for ${v}`);
              break;
            case "wordSeparator":
              h || (h = n.DEFAULT_OPTIONS[v]);
              break;
            case "fontWeight":
            case "fontWeightBold":
              if (typeof h == "number" && 1 <= h && h <= 1e3) break;
              h = f.includes(h) ? h : n.DEFAULT_OPTIONS[v];
              break;
            case "cursorWidth":
              h = Math.floor(h);
            case "lineHeight":
            case "tabStopWidth":
              if (h < 1) throw new Error(`${v} cannot be less than 1, value: ${h}`);
              break;
            case "minimumContrastRatio":
              h = Math.max(1, Math.min(21, Math.round(10 * h) / 10));
              break;
            case "scrollback":
              if ((h = Math.min(h, 4294967295)) < 0) throw new Error(`${v} cannot be less than 0, value: ${h}`);
              break;
            case "fastScrollSensitivity":
            case "scrollSensitivity":
              if (h <= 0) throw new Error(`${v} cannot be less than or equal to 0, value: ${h}`);
              break;
            case "rows":
            case "cols":
              if (!h && h !== 0) throw new Error(`${v} must be numeric, value: ${h}`);
              break;
            case "windowsPty":
              h = h ?? {};
          }
          return h;
        }
      }
      n.OptionsService = m;
    }, 2660: function(l, n, a) {
      var c = this && this.__decorate || function(m, y, v, h) {
        var p, g = arguments.length, _ = g < 3 ? y : h === null ? h = Object.getOwnPropertyDescriptor(y, v) : h;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function") _ = Reflect.decorate(m, y, v, h);
        else for (var b = m.length - 1; b >= 0; b--) (p = m[b]) && (_ = (g < 3 ? p(_) : g > 3 ? p(y, v, _) : p(y, v)) || _);
        return g > 3 && _ && Object.defineProperty(y, v, _), _;
      }, u = this && this.__param || function(m, y) {
        return function(v, h) {
          y(v, h, m);
        };
      };
      Object.defineProperty(n, "__esModule", { value: !0 }), n.OscLinkService = void 0;
      const d = a(2585);
      let f = n.OscLinkService = class {
        constructor(m) {
          this._bufferService = m, this._nextId = 1, this._entriesWithId = /* @__PURE__ */ new Map(), this._dataByLinkId = /* @__PURE__ */ new Map();
        }
        registerLink(m) {
          const y = this._bufferService.buffer;
          if (m.id === void 0) {
            const b = y.addMarker(y.ybase + y.y), S = { data: m, id: this._nextId++, lines: [b] };
            return b.onDispose(() => this._removeMarkerFromLink(S, b)), this._dataByLinkId.set(S.id, S), S.id;
          }
          const v = m, h = this._getEntryIdKey(v), p = this._entriesWithId.get(h);
          if (p) return this.addLineToLink(p.id, y.ybase + y.y), p.id;
          const g = y.addMarker(y.ybase + y.y), _ = { id: this._nextId++, key: this._getEntryIdKey(v), data: v, lines: [g] };
          return g.onDispose(() => this._removeMarkerFromLink(_, g)), this._entriesWithId.set(_.key, _), this._dataByLinkId.set(_.id, _), _.id;
        }
        addLineToLink(m, y) {
          const v = this._dataByLinkId.get(m);
          if (v && v.lines.every((h) => h.line !== y)) {
            const h = this._bufferService.buffer.addMarker(y);
            v.lines.push(h), h.onDispose(() => this._removeMarkerFromLink(v, h));
          }
        }
        getLinkData(m) {
          var y;
          return (y = this._dataByLinkId.get(m)) === null || y === void 0 ? void 0 : y.data;
        }
        _getEntryIdKey(m) {
          return `${m.id};;${m.uri}`;
        }
        _removeMarkerFromLink(m, y) {
          const v = m.lines.indexOf(y);
          v !== -1 && (m.lines.splice(v, 1), m.lines.length === 0 && (m.data.id !== void 0 && this._entriesWithId.delete(m.key), this._dataByLinkId.delete(m.id)));
        }
      };
      n.OscLinkService = f = c([u(0, d.IBufferService)], f);
    }, 8343: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.createDecorator = n.getServiceDependencies = n.serviceRegistry = void 0;
      const a = "di$target", c = "di$dependencies";
      n.serviceRegistry = /* @__PURE__ */ new Map(), n.getServiceDependencies = function(u) {
        return u[c] || [];
      }, n.createDecorator = function(u) {
        if (n.serviceRegistry.has(u)) return n.serviceRegistry.get(u);
        const d = function(f, m, y) {
          if (arguments.length !== 3) throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
          (function(v, h, p) {
            h[a] === h ? h[c].push({ id: v, index: p }) : (h[c] = [{ id: v, index: p }], h[a] = h);
          })(d, f, y);
        };
        return d.toString = () => u, n.serviceRegistry.set(u, d), d;
      };
    }, 2585: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.IDecorationService = n.IUnicodeService = n.IOscLinkService = n.IOptionsService = n.ILogService = n.LogLevelEnum = n.IInstantiationService = n.ICharsetService = n.ICoreService = n.ICoreMouseService = n.IBufferService = void 0;
      const c = a(8343);
      var u;
      n.IBufferService = (0, c.createDecorator)("BufferService"), n.ICoreMouseService = (0, c.createDecorator)("CoreMouseService"), n.ICoreService = (0, c.createDecorator)("CoreService"), n.ICharsetService = (0, c.createDecorator)("CharsetService"), n.IInstantiationService = (0, c.createDecorator)("InstantiationService"), function(d) {
        d[d.TRACE = 0] = "TRACE", d[d.DEBUG = 1] = "DEBUG", d[d.INFO = 2] = "INFO", d[d.WARN = 3] = "WARN", d[d.ERROR = 4] = "ERROR", d[d.OFF = 5] = "OFF";
      }(u || (n.LogLevelEnum = u = {})), n.ILogService = (0, c.createDecorator)("LogService"), n.IOptionsService = (0, c.createDecorator)("OptionsService"), n.IOscLinkService = (0, c.createDecorator)("OscLinkService"), n.IUnicodeService = (0, c.createDecorator)("UnicodeService"), n.IDecorationService = (0, c.createDecorator)("DecorationService");
    }, 1480: (l, n, a) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.UnicodeService = void 0;
      const c = a(8460), u = a(225);
      n.UnicodeService = class {
        constructor() {
          this._providers = /* @__PURE__ */ Object.create(null), this._active = "", this._onChange = new c.EventEmitter(), this.onChange = this._onChange.event;
          const d = new u.UnicodeV6();
          this.register(d), this._active = d.version, this._activeProvider = d;
        }
        dispose() {
          this._onChange.dispose();
        }
        get versions() {
          return Object.keys(this._providers);
        }
        get activeVersion() {
          return this._active;
        }
        set activeVersion(d) {
          if (!this._providers[d]) throw new Error(`unknown Unicode version "${d}"`);
          this._active = d, this._activeProvider = this._providers[d], this._onChange.fire(d);
        }
        register(d) {
          this._providers[d.version] = d;
        }
        wcwidth(d) {
          return this._activeProvider.wcwidth(d);
        }
        getStringCellWidth(d) {
          let f = 0;
          const m = d.length;
          for (let y = 0; y < m; ++y) {
            let v = d.charCodeAt(y);
            if (55296 <= v && v <= 56319) {
              if (++y >= m) return f + this.wcwidth(v);
              const h = d.charCodeAt(y);
              56320 <= h && h <= 57343 ? v = 1024 * (v - 55296) + h - 56320 + 65536 : f += this.wcwidth(h);
            }
            f += this.wcwidth(v);
          }
          return f;
        }
      };
    } }, s = {};
    function r(l) {
      var n = s[l];
      if (n !== void 0) return n.exports;
      var a = s[l] = { exports: {} };
      return t[l].call(a.exports, a, a.exports, r), a.exports;
    }
    var o = {};
    return (() => {
      var l = o;
      Object.defineProperty(l, "__esModule", { value: !0 }), l.Terminal = void 0;
      const n = r(9042), a = r(3236), c = r(844), u = r(5741), d = r(8285), f = r(7975), m = r(7090), y = ["cols", "rows"];
      class v extends c.Disposable {
        constructor(p) {
          super(), this._core = this.register(new a.Terminal(p)), this._addonManager = this.register(new u.AddonManager()), this._publicOptions = Object.assign({}, this._core.options);
          const g = (b) => this._core.options[b], _ = (b, S) => {
            this._checkReadonlyOptions(b), this._core.options[b] = S;
          };
          for (const b in this._core.options) {
            const S = { get: g.bind(this, b), set: _.bind(this, b) };
            Object.defineProperty(this._publicOptions, b, S);
          }
        }
        _checkReadonlyOptions(p) {
          if (y.includes(p)) throw new Error(`Option "${p}" can only be set in the constructor`);
        }
        _checkProposedApi() {
          if (!this._core.optionsService.rawOptions.allowProposedApi) throw new Error("You must set the allowProposedApi option to true to use proposed API");
        }
        get onBell() {
          return this._core.onBell;
        }
        get onBinary() {
          return this._core.onBinary;
        }
        get onCursorMove() {
          return this._core.onCursorMove;
        }
        get onData() {
          return this._core.onData;
        }
        get onKey() {
          return this._core.onKey;
        }
        get onLineFeed() {
          return this._core.onLineFeed;
        }
        get onRender() {
          return this._core.onRender;
        }
        get onResize() {
          return this._core.onResize;
        }
        get onScroll() {
          return this._core.onScroll;
        }
        get onSelectionChange() {
          return this._core.onSelectionChange;
        }
        get onTitleChange() {
          return this._core.onTitleChange;
        }
        get onWriteParsed() {
          return this._core.onWriteParsed;
        }
        get element() {
          return this._core.element;
        }
        get parser() {
          return this._parser || (this._parser = new f.ParserApi(this._core)), this._parser;
        }
        get unicode() {
          return this._checkProposedApi(), new m.UnicodeApi(this._core);
        }
        get textarea() {
          return this._core.textarea;
        }
        get rows() {
          return this._core.rows;
        }
        get cols() {
          return this._core.cols;
        }
        get buffer() {
          return this._buffer || (this._buffer = this.register(new d.BufferNamespaceApi(this._core))), this._buffer;
        }
        get markers() {
          return this._checkProposedApi(), this._core.markers;
        }
        get modes() {
          const p = this._core.coreService.decPrivateModes;
          let g = "none";
          switch (this._core.coreMouseService.activeProtocol) {
            case "X10":
              g = "x10";
              break;
            case "VT200":
              g = "vt200";
              break;
            case "DRAG":
              g = "drag";
              break;
            case "ANY":
              g = "any";
          }
          return { applicationCursorKeysMode: p.applicationCursorKeys, applicationKeypadMode: p.applicationKeypad, bracketedPasteMode: p.bracketedPasteMode, insertMode: this._core.coreService.modes.insertMode, mouseTrackingMode: g, originMode: p.origin, reverseWraparoundMode: p.reverseWraparound, sendFocusMode: p.sendFocus, wraparoundMode: p.wraparound };
        }
        get options() {
          return this._publicOptions;
        }
        set options(p) {
          for (const g in p) this._publicOptions[g] = p[g];
        }
        blur() {
          this._core.blur();
        }
        focus() {
          this._core.focus();
        }
        resize(p, g) {
          this._verifyIntegers(p, g), this._core.resize(p, g);
        }
        open(p) {
          this._core.open(p);
        }
        attachCustomKeyEventHandler(p) {
          this._core.attachCustomKeyEventHandler(p);
        }
        registerLinkProvider(p) {
          return this._core.registerLinkProvider(p);
        }
        registerCharacterJoiner(p) {
          return this._checkProposedApi(), this._core.registerCharacterJoiner(p);
        }
        deregisterCharacterJoiner(p) {
          this._checkProposedApi(), this._core.deregisterCharacterJoiner(p);
        }
        registerMarker(p = 0) {
          return this._verifyIntegers(p), this._core.registerMarker(p);
        }
        registerDecoration(p) {
          var g, _, b;
          return this._checkProposedApi(), this._verifyPositiveIntegers((g = p.x) !== null && g !== void 0 ? g : 0, (_ = p.width) !== null && _ !== void 0 ? _ : 0, (b = p.height) !== null && b !== void 0 ? b : 0), this._core.registerDecoration(p);
        }
        hasSelection() {
          return this._core.hasSelection();
        }
        select(p, g, _) {
          this._verifyIntegers(p, g, _), this._core.select(p, g, _);
        }
        getSelection() {
          return this._core.getSelection();
        }
        getSelectionPosition() {
          return this._core.getSelectionPosition();
        }
        clearSelection() {
          this._core.clearSelection();
        }
        selectAll() {
          this._core.selectAll();
        }
        selectLines(p, g) {
          this._verifyIntegers(p, g), this._core.selectLines(p, g);
        }
        dispose() {
          super.dispose();
        }
        scrollLines(p) {
          this._verifyIntegers(p), this._core.scrollLines(p);
        }
        scrollPages(p) {
          this._verifyIntegers(p), this._core.scrollPages(p);
        }
        scrollToTop() {
          this._core.scrollToTop();
        }
        scrollToBottom() {
          this._core.scrollToBottom();
        }
        scrollToLine(p) {
          this._verifyIntegers(p), this._core.scrollToLine(p);
        }
        clear() {
          this._core.clear();
        }
        write(p, g) {
          this._core.write(p, g);
        }
        writeln(p, g) {
          this._core.write(p), this._core.write(`\r
`, g);
        }
        paste(p) {
          this._core.paste(p);
        }
        refresh(p, g) {
          this._verifyIntegers(p, g), this._core.refresh(p, g);
        }
        reset() {
          this._core.reset();
        }
        clearTextureAtlas() {
          this._core.clearTextureAtlas();
        }
        loadAddon(p) {
          this._addonManager.loadAddon(this, p);
        }
        static get strings() {
          return n;
        }
        _verifyIntegers(...p) {
          for (const g of p) if (g === 1 / 0 || isNaN(g) || g % 1 != 0) throw new Error("This API only accepts integers");
        }
        _verifyPositiveIntegers(...p) {
          for (const g of p) if (g && (g === 1 / 0 || isNaN(g) || g % 1 != 0 || g < 0)) throw new Error("This API only accepts positive integers");
        }
      }
      l.Terminal = v;
    })(), o;
  })());
})(wa);
var _f = wa.exports, ka = { exports: {} };
(function(i, e) {
  (function(t, s) {
    i.exports = s();
  })(self, () => (() => {
    var t = {};
    return (() => {
      var s = t;
      Object.defineProperty(s, "__esModule", { value: !0 }), s.FitAddon = void 0, s.FitAddon = class {
        activate(r) {
          this._terminal = r;
        }
        dispose() {
        }
        fit() {
          const r = this.proposeDimensions();
          if (!r || !this._terminal || isNaN(r.cols) || isNaN(r.rows)) return;
          const o = this._terminal._core;
          this._terminal.rows === r.rows && this._terminal.cols === r.cols || (o._renderService.clear(), this._terminal.resize(r.cols, r.rows));
        }
        proposeDimensions() {
          if (!this._terminal || !this._terminal.element || !this._terminal.element.parentElement) return;
          const r = this._terminal._core, o = r._renderService.dimensions;
          if (o.css.cell.width === 0 || o.css.cell.height === 0) return;
          const l = this._terminal.options.scrollback === 0 ? 0 : r.viewport.scrollBarWidth, n = window.getComputedStyle(this._terminal.element.parentElement), a = parseInt(n.getPropertyValue("height")), c = Math.max(0, parseInt(n.getPropertyValue("width"))), u = window.getComputedStyle(this._terminal.element), d = a - (parseInt(u.getPropertyValue("padding-top")) + parseInt(u.getPropertyValue("padding-bottom"))), f = c - (parseInt(u.getPropertyValue("padding-right")) + parseInt(u.getPropertyValue("padding-left"))) - l;
          return { cols: Math.max(2, Math.floor(f / o.css.cell.width)), rows: Math.max(1, Math.floor(d / o.css.cell.height)) };
        }
      };
    })(), t;
  })());
})(ka);
var mf = ka.exports, Ea = { exports: {} };
(function(i, e) {
  (function(t, s) {
    i.exports = s();
  })(self, () => (() => {
    var t = { 6: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.LinkComputer = n.WebLinkProvider = void 0, n.WebLinkProvider = class {
        constructor(c, u, d, f = {}) {
          this._terminal = c, this._regex = u, this._handler = d, this._options = f;
        }
        provideLinks(c, u) {
          const d = a.computeLink(c, this._regex, this._terminal, this._handler);
          u(this._addCallbacks(d));
        }
        _addCallbacks(c) {
          return c.map((u) => (u.leave = this._options.leave, u.hover = (d, f) => {
            if (this._options.hover) {
              const { range: m } = u;
              this._options.hover(d, f, m);
            }
          }, u));
        }
      };
      class a {
        static computeLink(u, d, f, m) {
          const y = new RegExp(d.source, (d.flags || "") + "g"), [v, h] = a._getWindowedLineStrings(u - 1, f), p = v.join("");
          let g;
          const _ = [];
          for (; g = y.exec(p); ) {
            const b = g[0];
            try {
              const A = new URL(b), L = decodeURI(A.toString());
              if (b !== L && b + "/" !== L) continue;
            } catch {
              continue;
            }
            const [S, w] = a._mapStrIdx(f, h, 0, g.index), [k, x] = a._mapStrIdx(f, S, w, b.length);
            if (S === -1 || w === -1 || k === -1 || x === -1) continue;
            const C = { start: { x: w + 1, y: S + 1 }, end: { x, y: k + 1 } };
            _.push({ range: C, text: b, activate: m });
          }
          return _;
        }
        static _getWindowedLineStrings(u, d) {
          let f, m = u, y = u, v = 0, h = "";
          const p = [];
          if (f = d.buffer.active.getLine(u)) {
            const g = f.translateToString(!0);
            if (f.isWrapped && g[0] !== " ") {
              for (v = 0; (f = d.buffer.active.getLine(--m)) && v < 2048 && (h = f.translateToString(!0), v += h.length, p.push(h), f.isWrapped && h.indexOf(" ") === -1); ) ;
              p.reverse();
            }
            for (p.push(g), v = 0; (f = d.buffer.active.getLine(++y)) && f.isWrapped && v < 2048 && (h = f.translateToString(!0), v += h.length, p.push(h), h.indexOf(" ") === -1); ) ;
          }
          return [p, m];
        }
        static _mapStrIdx(u, d, f, m) {
          const y = u.buffer.active, v = y.getNullCell();
          let h = f;
          for (; m; ) {
            const p = y.getLine(d);
            if (!p) return [-1, -1];
            for (let g = h; g < p.length; ++g) {
              p.getCell(g, v);
              const _ = v.getChars();
              if (v.getWidth() && (m -= _.length || 1, g === p.length - 1 && _ === "")) {
                const b = y.getLine(d + 1);
                b && b.isWrapped && (b.getCell(0, v), v.getWidth() === 2 && (m += 1));
              }
              if (m < 0) return [d, g];
            }
            d++, h = 0;
          }
          return [d, h];
        }
      }
      n.LinkComputer = a;
    } }, s = {};
    function r(l) {
      var n = s[l];
      if (n !== void 0) return n.exports;
      var a = s[l] = { exports: {} };
      return t[l](a, a.exports, r), a.exports;
    }
    var o = {};
    return (() => {
      var l = o;
      Object.defineProperty(l, "__esModule", { value: !0 }), l.WebLinksAddon = void 0;
      const n = r(6), a = /https?:[/]{2}[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/;
      function c(u, d) {
        const f = window.open();
        if (f) {
          try {
            f.opener = null;
          } catch {
          }
          f.location.href = d;
        } else console.warn("Opening link blocked as opener could not be cleared");
      }
      l.WebLinksAddon = class {
        constructor(u = c, d = {}) {
          this._handler = u, this._options = d;
        }
        activate(u) {
          this._terminal = u;
          const d = this._options, f = d.urlRegex || a;
          this._linkProvider = this._terminal.registerLinkProvider(new n.WebLinkProvider(this._terminal, f, this._handler, d));
        }
        dispose() {
          var u;
          (u = this._linkProvider) === null || u === void 0 || u.dispose();
        }
      };
    })(), o;
  })());
})(Ea);
var vf = Ea.exports, Da = { exports: {} };
(function(i, e) {
  (function(t, s) {
    i.exports = s();
  })(self, () => (() => {
    var t = { 345: (l, n) => {
      Object.defineProperty(n, "__esModule", { value: !0 }), n.forwardEvent = n.EventEmitter = void 0, n.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = !1;
        }
        get event() {
          return this._event || (this._event = (a) => (this._listeners.push(a), { dispose: () => {
            if (!this._disposed) {
              for (let c = 0; c < this._listeners.length; c++) if (this._listeners[c] === a) return void this._listeners.splice(c, 1);
            }
          } })), this._event;
        }
        fire(a, c) {
          const u = [];
          for (let d = 0; d < this._listeners.length; d++) u.push(this._listeners[d]);
          for (let d = 0; d < u.length; d++) u[d].call(void 0, a, c);
        }
        dispose() {
          this.clearListeners(), this._disposed = !0;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, n.forwardEvent = function(a, c) {
        return a((u) => c.fire(u));
      };
    }, 859: (l, n) => {
      function a(c) {
        for (const u of c) u.dispose();
        c.length = 0;
      }
      Object.defineProperty(n, "__esModule", { value: !0 }), n.getDisposeArrayDisposable = n.disposeArray = n.toDisposable = n.MutableDisposable = n.Disposable = void 0, n.Disposable = class {
        constructor() {
          this._disposables = [], this._isDisposed = !1;
        }
        dispose() {
          this._isDisposed = !0;
          for (const c of this._disposables) c.dispose();
          this._disposables.length = 0;
        }
        register(c) {
          return this._disposables.push(c), c;
        }
        unregister(c) {
          const u = this._disposables.indexOf(c);
          u !== -1 && this._disposables.splice(u, 1);
        }
      }, n.MutableDisposable = class {
        constructor() {
          this._isDisposed = !1;
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(c) {
          var u;
          this._isDisposed || c === this._value || ((u = this._value) === null || u === void 0 || u.dispose(), this._value = c);
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          var c;
          this._isDisposed = !0, (c = this._value) === null || c === void 0 || c.dispose(), this._value = void 0;
        }
      }, n.toDisposable = function(c) {
        return { dispose: c };
      }, n.disposeArray = a, n.getDisposeArrayDisposable = function(c) {
        return { dispose: () => a(c) };
      };
    } }, s = {};
    function r(l) {
      var n = s[l];
      if (n !== void 0) return n.exports;
      var a = s[l] = { exports: {} };
      return t[l](a, a.exports, r), a.exports;
    }
    var o = {};
    return (() => {
      var l = o;
      Object.defineProperty(l, "__esModule", { value: !0 }), l.SearchAddon = void 0;
      const n = r(345), a = r(859), c = " ~!@#$%^&*()+`-=[]{}|\\;:\"',./<>?";
      class u extends a.Disposable {
        constructor(f) {
          var m;
          super(), this._highlightedLines = /* @__PURE__ */ new Set(), this._highlightDecorations = [], this._selectedDecoration = this.register(new a.MutableDisposable()), this._linesCacheTimeoutId = 0, this._onDidChangeResults = this.register(new n.EventEmitter()), this.onDidChangeResults = this._onDidChangeResults.event, this._highlightLimit = (m = f == null ? void 0 : f.highlightLimit) !== null && m !== void 0 ? m : 1e3;
        }
        activate(f) {
          this._terminal = f, this.register(this._terminal.onWriteParsed(() => this._updateMatches())), this.register(this._terminal.onResize(() => this._updateMatches())), this.register((0, a.toDisposable)(() => this.clearDecorations()));
        }
        _updateMatches() {
          var f;
          this._highlightTimeout && window.clearTimeout(this._highlightTimeout), this._cachedSearchTerm && (!((f = this._lastSearchOptions) === null || f === void 0) && f.decorations) && (this._highlightTimeout = setTimeout(() => {
            const m = this._cachedSearchTerm;
            this._cachedSearchTerm = void 0, this.findPrevious(m, Object.assign(Object.assign({}, this._lastSearchOptions), { incremental: !0, noScroll: !0 }));
          }, 200));
        }
        clearDecorations(f) {
          this._selectedDecoration.clear(), (0, a.disposeArray)(this._highlightDecorations), this._highlightDecorations = [], this._highlightedLines.clear(), f || (this._cachedSearchTerm = void 0);
        }
        findNext(f, m) {
          if (!this._terminal) throw new Error("Cannot use addon until it has been loaded");
          this._lastSearchOptions = m, m != null && m.decorations && (this._cachedSearchTerm !== void 0 && f === this._cachedSearchTerm || this._highlightAllMatches(f, m));
          const y = this._findNextAndSelect(f, m);
          return this._fireResults(m), this._cachedSearchTerm = f, y;
        }
        _highlightAllMatches(f, m) {
          if (!this._terminal) throw new Error("Cannot use addon until it has been loaded");
          if (!f || f.length === 0) return void this.clearDecorations();
          m = m || {}, this.clearDecorations(!0);
          const y = [];
          let v, h = this._find(f, 0, 0, m);
          for (; h && ((v == null ? void 0 : v.row) !== h.row || (v == null ? void 0 : v.col) !== h.col) && !(y.length >= this._highlightLimit); ) v = h, y.push(v), h = this._find(f, v.col + v.term.length >= this._terminal.cols ? v.row + 1 : v.row, v.col + v.term.length >= this._terminal.cols ? 0 : v.col + 1, m);
          for (const p of y) {
            const g = this._createResultDecoration(p, m.decorations);
            g && (this._highlightedLines.add(g.marker.line), this._highlightDecorations.push({ decoration: g, match: p, dispose() {
              g.dispose();
            } }));
          }
        }
        _find(f, m, y, v) {
          var h;
          if (!this._terminal || !f || f.length === 0) return (h = this._terminal) === null || h === void 0 || h.clearSelection(), void this.clearDecorations();
          if (y > this._terminal.cols) throw new Error(`Invalid col: ${y} to search in terminal of ${this._terminal.cols} cols`);
          let p;
          this._initLinesCache();
          const g = { startRow: m, startCol: y };
          if (p = this._findInLine(f, g, v), !p) for (let _ = m + 1; _ < this._terminal.buffer.active.baseY + this._terminal.rows && (g.startRow = _, g.startCol = 0, p = this._findInLine(f, g, v), !p); _++) ;
          return p;
        }
        _findNextAndSelect(f, m) {
          var y;
          if (!this._terminal || !f || f.length === 0) return (y = this._terminal) === null || y === void 0 || y.clearSelection(), this.clearDecorations(), !1;
          const v = this._terminal.getSelectionPosition();
          this._terminal.clearSelection();
          let h = 0, p = 0;
          v && (this._cachedSearchTerm === f ? (h = v.end.x, p = v.end.y) : (h = v.start.x, p = v.start.y)), this._initLinesCache();
          const g = { startRow: p, startCol: h };
          let _ = this._findInLine(f, g, m);
          if (!_) for (let b = p + 1; b < this._terminal.buffer.active.baseY + this._terminal.rows && (g.startRow = b, g.startCol = 0, _ = this._findInLine(f, g, m), !_); b++) ;
          if (!_ && p !== 0) for (let b = 0; b < p && (g.startRow = b, g.startCol = 0, _ = this._findInLine(f, g, m), !_); b++) ;
          return !_ && v && (g.startRow = v.start.y, g.startCol = 0, _ = this._findInLine(f, g, m)), this._selectResult(_, m == null ? void 0 : m.decorations, m == null ? void 0 : m.noScroll);
        }
        findPrevious(f, m) {
          if (!this._terminal) throw new Error("Cannot use addon until it has been loaded");
          this._lastSearchOptions = m, m != null && m.decorations && (this._cachedSearchTerm !== void 0 && f === this._cachedSearchTerm || this._highlightAllMatches(f, m));
          const y = this._findPreviousAndSelect(f, m);
          return this._fireResults(m), this._cachedSearchTerm = f, y;
        }
        _fireResults(f) {
          if (f != null && f.decorations) {
            let m = -1;
            if (this._selectedDecoration.value) {
              const y = this._selectedDecoration.value.match;
              for (let v = 0; v < this._highlightDecorations.length; v++) {
                const h = this._highlightDecorations[v].match;
                if (h.row === y.row && h.col === y.col && h.size === y.size) {
                  m = v;
                  break;
                }
              }
            }
            this._onDidChangeResults.fire({ resultIndex: m, resultCount: this._highlightDecorations.length });
          }
        }
        _findPreviousAndSelect(f, m) {
          var y;
          if (!this._terminal) throw new Error("Cannot use addon until it has been loaded");
          if (!this._terminal || !f || f.length === 0) return (y = this._terminal) === null || y === void 0 || y.clearSelection(), this.clearDecorations(), !1;
          const v = this._terminal.getSelectionPosition();
          this._terminal.clearSelection();
          let h = this._terminal.buffer.active.baseY + this._terminal.rows - 1, p = this._terminal.cols;
          const g = !0;
          this._initLinesCache();
          const _ = { startRow: h, startCol: p };
          let b;
          if (v && (_.startRow = h = v.start.y, _.startCol = p = v.start.x, this._cachedSearchTerm !== f && (b = this._findInLine(f, _, m, !1), b || (_.startRow = h = v.end.y, _.startCol = p = v.end.x))), b || (b = this._findInLine(f, _, m, g)), !b) {
            _.startCol = Math.max(_.startCol, this._terminal.cols);
            for (let S = h - 1; S >= 0 && (_.startRow = S, b = this._findInLine(f, _, m, g), !b); S--) ;
          }
          if (!b && h !== this._terminal.buffer.active.baseY + this._terminal.rows - 1) for (let S = this._terminal.buffer.active.baseY + this._terminal.rows - 1; S >= h && (_.startRow = S, b = this._findInLine(f, _, m, g), !b); S--) ;
          return this._selectResult(b, m == null ? void 0 : m.decorations, m == null ? void 0 : m.noScroll);
        }
        _initLinesCache() {
          const f = this._terminal;
          this._linesCache || (this._linesCache = new Array(f.buffer.active.length), this._cursorMoveListener = f.onCursorMove(() => this._destroyLinesCache()), this._resizeListener = f.onResize(() => this._destroyLinesCache())), window.clearTimeout(this._linesCacheTimeoutId), this._linesCacheTimeoutId = window.setTimeout(() => this._destroyLinesCache(), 15e3);
        }
        _destroyLinesCache() {
          this._linesCache = void 0, this._cursorMoveListener && (this._cursorMoveListener.dispose(), this._cursorMoveListener = void 0), this._resizeListener && (this._resizeListener.dispose(), this._resizeListener = void 0), this._linesCacheTimeoutId && (window.clearTimeout(this._linesCacheTimeoutId), this._linesCacheTimeoutId = 0);
        }
        _isWholeWord(f, m, y) {
          return (f === 0 || c.includes(m[f - 1])) && (f + y.length === m.length || c.includes(m[f + y.length]));
        }
        _findInLine(f, m, y = {}, v = !1) {
          var h;
          const p = this._terminal, g = m.startRow, _ = m.startCol, b = p.buffer.active.getLine(g);
          if (b != null && b.isWrapped) return v ? void (m.startCol += p.cols) : (m.startRow--, m.startCol += p.cols, this._findInLine(f, m, y));
          let S = (h = this._linesCache) === null || h === void 0 ? void 0 : h[g];
          S || (S = this._translateBufferLineToStringWithWrap(g, !0), this._linesCache && (this._linesCache[g] = S));
          const [w, k] = S, x = this._bufferColsToStringOffset(g, _), C = y.caseSensitive ? f : f.toLowerCase(), A = y.caseSensitive ? w : w.toLowerCase();
          let L = -1;
          if (y.regex) {
            const M = RegExp(C, "g");
            let T;
            if (v) for (; T = M.exec(A.slice(0, x)); ) L = M.lastIndex - T[0].length, f = T[0], M.lastIndex -= f.length - 1;
            else T = M.exec(A.slice(x)), T && T[0].length > 0 && (L = x + (M.lastIndex - T[0].length), f = T[0]);
          } else v ? x - C.length >= 0 && (L = A.lastIndexOf(C, x - C.length)) : L = A.indexOf(C, x);
          if (L >= 0) {
            if (y.wholeWord && !this._isWholeWord(L, A, f)) return;
            let M = 0;
            for (; M < k.length - 1 && L >= k[M + 1]; ) M++;
            let T = M;
            for (; T < k.length - 1 && L + f.length >= k[T + 1]; ) T++;
            const F = L - k[M], $ = L + f.length - k[T], H = this._stringLengthToBufferSize(g + M, F);
            return { term: f, col: H, row: g + M, size: this._stringLengthToBufferSize(g + T, $) - H + p.cols * (T - M) };
          }
        }
        _stringLengthToBufferSize(f, m) {
          const y = this._terminal.buffer.active.getLine(f);
          if (!y) return 0;
          for (let v = 0; v < m; v++) {
            const h = y.getCell(v);
            if (!h) break;
            const p = h.getChars();
            p.length > 1 && (m -= p.length - 1);
            const g = y.getCell(v + 1);
            g && g.getWidth() === 0 && m++;
          }
          return m;
        }
        _bufferColsToStringOffset(f, m) {
          const y = this._terminal;
          let v = f, h = 0, p = y.buffer.active.getLine(v);
          for (; m > 0 && p; ) {
            for (let g = 0; g < m && g < y.cols; g++) {
              const _ = p.getCell(g);
              if (!_) break;
              _.getWidth() && (h += _.getCode() === 0 ? 1 : _.getChars().length);
            }
            if (v++, p = y.buffer.active.getLine(v), p && !p.isWrapped) break;
            m -= y.cols;
          }
          return h;
        }
        _translateBufferLineToStringWithWrap(f, m) {
          var y;
          const v = this._terminal, h = [], p = [0];
          let g = v.buffer.active.getLine(f);
          for (; g; ) {
            const _ = v.buffer.active.getLine(f + 1), b = !!_ && _.isWrapped;
            let S = g.translateToString(!b && m);
            if (b && _) {
              const w = g.getCell(g.length - 1);
              w && w.getCode() === 0 && w.getWidth() === 1 && ((y = _.getCell(0)) === null || y === void 0 ? void 0 : y.getWidth()) === 2 && (S = S.slice(0, -1));
            }
            if (h.push(S), !b) break;
            p.push(p[p.length - 1] + S.length), f++, g = _;
          }
          return [h.join(""), p];
        }
        _selectResult(f, m, y) {
          const v = this._terminal;
          if (this._selectedDecoration.clear(), !f) return v.clearSelection(), !1;
          if (v.select(f.col, f.row, f.size), m) {
            const h = v.registerMarker(-v.buffer.active.baseY - v.buffer.active.cursorY + f.row);
            if (h) {
              const p = v.registerDecoration({ marker: h, x: f.col, width: f.size, backgroundColor: m.activeMatchBackground, layer: "top", overviewRulerOptions: { color: m.activeMatchColorOverviewRuler } });
              if (p) {
                const g = [];
                g.push(h), g.push(p.onRender((_) => this._applyStyles(_, m.activeMatchBorder, !0))), g.push(p.onDispose(() => (0, a.disposeArray)(g))), this._selectedDecoration.value = { decoration: p, match: f, dispose() {
                  p.dispose();
                } };
              }
            }
          }
          if (!y && (f.row >= v.buffer.active.viewportY + v.rows || f.row < v.buffer.active.viewportY)) {
            let h = f.row - v.buffer.active.viewportY;
            h -= Math.floor(v.rows / 2), v.scrollLines(h);
          }
          return !0;
        }
        _applyStyles(f, m, y) {
          f.classList.contains("xterm-find-result-decoration") || (f.classList.add("xterm-find-result-decoration"), m && (f.style.outline = `1px solid ${m}`)), y && f.classList.add("xterm-find-active-result-decoration");
        }
        _createResultDecoration(f, m) {
          const y = this._terminal, v = y.registerMarker(-y.buffer.active.baseY - y.buffer.active.cursorY + f.row);
          if (!v) return;
          const h = y.registerDecoration({ marker: v, x: f.col, width: f.size, backgroundColor: m.matchBackground, overviewRulerOptions: this._highlightedLines.has(v.line) ? void 0 : { color: m.matchOverviewRuler, position: "center" } });
          if (h) {
            const p = [];
            p.push(v), p.push(h.onRender((g) => this._applyStyles(g, m.matchBorder, !1))), p.push(h.onDispose(() => (0, a.disposeArray)(p)));
          }
          return h;
        }
      }
      l.SearchAddon = u;
    })(), o;
  })());
})(Da);
var bf = Da.exports;
const yf = `/**
 * Copyright (c) 2014 The xterm.js authors. All rights reserved.
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/term.js
 * @license MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Originally forked from (with the author's permission):
 *   Fabrice Bellard's javascript vt100 for jslinux:
 *   http://bellard.org/jslinux/
 *   Copyright (c) 2011 Fabrice Bellard
 *   The original design remains. The terminal itself
 *   has been extended to include xterm CSI codes, among
 *   other features.
 */.xterm{cursor:text;position:relative;-moz-user-select:none;user-select:none;-ms-user-select:none;-webkit-user-select:none}.xterm.focus,.xterm:focus{outline:none}.xterm .xterm-helpers{position:absolute;top:0;z-index:5}.xterm .xterm-helper-textarea{padding:0;border:0;margin:0;position:absolute;opacity:0;left:-9999em;top:0;width:0;height:0;z-index:-5;white-space:nowrap;overflow:hidden;resize:none}.xterm .composition-view{background:#000;color:#fff;display:none;position:absolute;white-space:nowrap;z-index:1}.xterm .composition-view.active{display:block}.xterm .xterm-viewport{background-color:#000;overflow-y:scroll;cursor:default;position:absolute;right:0;left:0;top:0;bottom:0}.xterm .xterm-screen{position:relative}.xterm .xterm-screen canvas{position:absolute;left:0;top:0}.xterm .xterm-scroll-area{visibility:hidden}.xterm-char-measure-element{display:inline-block;visibility:hidden;position:absolute;top:0;left:-9999em;line-height:normal}.xterm.enable-mouse-events{cursor:default}.xterm.xterm-cursor-pointer,.xterm .xterm-cursor-pointer{cursor:pointer}.xterm.column-select.focus{cursor:crosshair}.xterm .xterm-accessibility,.xterm .xterm-message{position:absolute;left:0;top:0;bottom:0;right:0;z-index:10;color:transparent;pointer-events:none}.xterm .live-region{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.xterm-dim{opacity:1!important}.xterm-underline-1{text-decoration:underline}.xterm-underline-2{-webkit-text-decoration:double underline;text-decoration:double underline}.xterm-underline-3{-webkit-text-decoration:wavy underline;text-decoration:wavy underline}.xterm-underline-4{-webkit-text-decoration:dotted underline;text-decoration:dotted underline}.xterm-underline-5{-webkit-text-decoration:dashed underline;text-decoration:dashed underline}.xterm-overline{text-decoration:overline}.xterm-overline.xterm-underline-1{text-decoration:overline underline}.xterm-overline.xterm-underline-2{-webkit-text-decoration:overline double underline;text-decoration:overline double underline}.xterm-overline.xterm-underline-3{-webkit-text-decoration:overline wavy underline;text-decoration:overline wavy underline}.xterm-overline.xterm-underline-4{-webkit-text-decoration:overline dotted underline;text-decoration:overline dotted underline}.xterm-overline.xterm-underline-5{-webkit-text-decoration:overline dashed underline;text-decoration:overline dashed underline}.xterm-strikethrough{text-decoration:line-through}.xterm-screen .xterm-decoration-container .xterm-decoration{z-index:6;position:absolute}.xterm-screen .xterm-decoration-container .xterm-decoration.xterm-decoration-top-layer{z-index:7}.xterm-decoration-overview-ruler{z-index:8;position:absolute;top:0;right:0;pointer-events:none}.xterm-decoration-top{z-index:2;position:relative}`, Or = class Or extends De {
  constructor() {
    super(...arguments), this.terminal = null, this.fitAddon = null, this.searchAddon = null, this.webLinksAddon = null, this.wsManager = null, this.terminalConnected = !1, this.connectionStatus = "disconnected", this.resizeObserver = null, this.handleWindowResize = () => {
      this.fitAddon && this.fitAddon.fit();
    }, this.handleFullscreenChange = () => {
      const e = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      console.log("Fullscreen change detected:", e), this.requestUpdate(), this.updateComplete.then(() => {
        setTimeout(() => {
          var n;
          if (!this.terminal || !this.fitAddon) return;
          const t = (n = this.shadowRoot) == null ? void 0 : n.querySelector(".terminal-wrapper");
          if (!t) return;
          const s = this.terminal.buffer.active, r = [];
          for (let a = 0; a < s.length; a++) {
            const c = s.getLine(a);
            c && r.push(c.translateToString());
          }
          const o = s.cursorY, l = s.cursorX;
          if (e) {
            t.innerHTML = "", t.style.width = "100%", t.style.height = "100%", t.style.display = "block", t.style.backgroundColor = "#1e1e1e", this.terminal.open(t);
            for (const a of r)
              a.trim() && this.terminal.writeln(a);
            this.terminal.write(`\x1B[${o + 1};${l + 1}H`);
          }
          this.fitAddon.fit(), this.terminal.focus(), this.terminal.refresh(0, this.terminal.rows - 1), t.focus(), this.terminal.focus(), this.terminal.resize(this.terminal.cols, this.terminal.rows), this.terminal.refresh(0, this.terminal.rows - 1);
        }, 500);
      });
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.updateComplete.then(() => {
      this.initializeTerminal();
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.cleanup();
  }
  initializeTerminal() {
    var t;
    const e = (t = this.shadowRoot) == null ? void 0 : t.querySelector(".terminal-wrapper");
    e && (this.terminal = new _f.Terminal({
      cursorBlink: !0,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      scrollback: 1e4,
      // Allow 10000 lines of scrollback
      convertEol: !0,
      screenReaderMode: !1,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#ffffff",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5"
      }
    }), this.fitAddon = new mf.FitAddon(), this.searchAddon = new bf.SearchAddon(), this.webLinksAddon = new vf.WebLinksAddon(), this.terminal.loadAddon(this.fitAddon), this.terminal.loadAddon(this.searchAddon), this.terminal.loadAddon(this.webLinksAddon), this.terminal.open(e), this.setupResizeObserver(e), setTimeout(() => {
      var s;
      (s = this.fitAddon) == null || s.fit();
    }, 100), this.hideCharMeasureElement(), this.terminal.onData((s) => {
      if (this.wsManager && this.terminalConnected) {
        const r = {
          type: "input",
          data: s
        };
        this.wsManager.send(r);
      }
    }), this.setupScrollingShortcuts(), this.terminal.onResize((s) => {
      if (this.wsManager && this.terminalConnected) {
        const r = {
          type: "resize",
          payload: {
            cols: s.cols,
            rows: s.rows
          }
        };
        this.wsManager.send(r);
      }
    }), window.addEventListener("resize", this.handleWindowResize), document.addEventListener("fullscreenchange", this.handleFullscreenChange), document.addEventListener("webkitfullscreenchange", this.handleFullscreenChange), document.addEventListener("mozfullscreenchange", this.handleFullscreenChange), document.addEventListener("MSFullscreenChange", this.handleFullscreenChange), this.connect());
  }
  setupResizeObserver(e) {
    this.resizeObserver && this.resizeObserver.disconnect(), this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon && this.terminal && requestAnimationFrame(() => {
        var t;
        (t = this.fitAddon) == null || t.fit();
      });
    }), this.resizeObserver.observe(e);
  }
  setupScrollingShortcuts() {
    var t;
    if (!this.terminal) return;
    const e = (t = this.shadowRoot) == null ? void 0 : t.querySelector(".terminal-wrapper");
    e && e.addEventListener("keydown", (s) => {
      if (!this.terminal) return;
      const r = s;
      if (r.key === "PageUp")
        r.preventDefault(), this.terminal.scrollPages(-1);
      else if (r.key === "PageDown")
        r.preventDefault(), this.terminal.scrollPages(1);
      else if (r.ctrlKey && r.key === "Home")
        r.preventDefault(), this.terminal.scrollToTop();
      else if (r.ctrlKey && r.key === "End")
        r.preventDefault(), this.terminal.scrollToBottom();
      else if (r.shiftKey && r.key === "PageUp") {
        r.preventDefault();
        const o = this.terminal.rows;
        this.terminal.scrollLines(-Math.floor(o / 2));
      } else if (r.shiftKey && r.key === "PageDown") {
        r.preventDefault();
        const o = this.terminal.rows;
        this.terminal.scrollLines(Math.floor(o / 2));
      }
    }), this.terminal.onScroll((s) => {
    });
  }
  hideCharMeasureElement() {
    var t;
    const e = (t = this.shadowRoot) == null ? void 0 : t.querySelector(".terminal-container");
    if (e) {
      setTimeout(() => {
        const r = e.querySelector(".xterm-char-measure-element");
        r && (r.style.position = "absolute", r.style.top = "0", r.style.left = "0", r.style.visibility = "hidden");
        const o = e.querySelector(".xterm-helper-textarea");
        o && (o.style.position = "absolute", o.style.left = "-9999px", o.style.top = "0", o.style.width = "0", o.style.height = "0", o.style.opacity = "0");
      }, 100);
      const s = document.createElement("style");
      s.textContent = `
        .xterm-char-measure-element {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          visibility: hidden !important;
        }
        
        .xterm-helper-textarea {
          position: absolute !important;
          left: -9999px !important;
          top: 0 !important;
          width: 0 !important;
          height: 0 !important;
          z-index: -10 !important;
          opacity: 0 !important;
          overflow: hidden !important;
          resize: none !important;
          pointer-events: none !important;
        }
        
        /* Fix xterm terminal height and scrolling */
        .xterm {
          height: 100%;
          width: 100%;
        }
        
        .xterm-viewport {
          height: 100% !important;
          width: 100% !important;
          overflow-y: scroll !important;
        }
        
        .xterm-scroll-area {
          height: auto !important;
          min-height: 100% !important;
        }
        
        .xterm-screen {
          position: relative;
          height: 100%;
        }
        
        /* Ensure terminal is visible in fullscreen */
        :host(:fullscreen) .xterm,
        :host(:-webkit-full-screen) .xterm,
        :host(:-moz-full-screen) .xterm,
        :host(:-ms-fullscreen) .xterm {
          z-index: 1000;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        :host(:fullscreen) .terminal-wrapper,
        :host(:-webkit-full-screen) .terminal-wrapper,
        :host(:-moz-full-screen) .terminal-wrapper,
        :host(:-ms-fullscreen) .terminal-wrapper {
          z-index: 999;
          opacity: 1 !important;
          visibility: visible !important;
          background-color: #1e1e1e;
        }
      `, e.appendChild(s);
    }
  }
  async connect() {
    var e, t;
    this.wsManager && this.wsManager.disconnect(), this.connectionStatus = "connecting", this.requestUpdate();
    try {
      this.wsManager = new cr("/ws/terminal"), this.wsManager.on("output", (r) => {
        var o;
        this.terminal && ((o = r.payload) != null && o.data) && this.terminal.write(r.payload.data);
      }), this.wsManager.on("error", (r) => {
        console.error("Terminal error:", r.error), this.terminalConnected = !1, this.connectionStatus = "disconnected", this.requestUpdate();
      }), await this.wsManager.connect();
      const s = {
        type: "subscribe",
        payload: {
          cols: ((e = this.terminal) == null ? void 0 : e.cols) || 80,
          rows: ((t = this.terminal) == null ? void 0 : t.rows) || 24,
          shell: "/bin/bash"
        }
      };
      this.wsManager.send(s), this.terminalConnected = !0, this.connectionStatus = "connected", this.requestUpdate();
    } catch (s) {
      console.error("Failed to connect to terminal:", s), this.connectionStatus = "disconnected", this.requestUpdate();
    }
  }
  disconnect() {
    this.wsManager && (this.wsManager.disconnect(), this.wsManager = null), this.terminalConnected = !1, this.connectionStatus = "disconnected", this.requestUpdate();
  }
  clearTerminal() {
    this.terminal && this.terminal.clear();
  }
  scrollToTop() {
    this.terminal && this.terminal.scrollToTop();
  }
  scrollToBottom() {
    this.terminal && this.terminal.scrollToBottom();
  }
  async copySelection() {
    if (this.terminal && this.terminal.hasSelection()) {
      const e = this.terminal.getSelection();
      try {
        await navigator.clipboard.writeText(e);
      } catch (t) {
        console.error("Failed to copy to clipboard:", t);
      }
    }
  }
  async pasteFromClipboard() {
    try {
      const e = await navigator.clipboard.readText();
      if (e && this.wsManager && this.terminalConnected) {
        const t = {
          type: "input",
          data: e
        };
        this.wsManager.send(t);
      }
    } catch (e) {
      console.error("Failed to paste from clipboard:", e);
    }
  }
  toggleFullscreen() {
    if (document.fullscreenElement)
      document.exitFullscreen().then(() => {
        this.requestUpdate(), setTimeout(() => {
          var e, t;
          (e = this.fitAddon) == null || e.fit(), (t = this.terminal) == null || t.focus();
        }, 300);
      }).catch((e) => {
        console.error("Failed to exit fullscreen:", e);
      });
    else {
      const e = this, t = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
      t && t.call(e).then(() => {
        this.requestUpdate(), setTimeout(() => {
          var r, o, l;
          (r = this.fitAddon) == null || r.fit(), (o = this.terminal) == null || o.focus();
          const s = (l = this.shadowRoot) == null ? void 0 : l.querySelector(".terminal-wrapper");
          s && (s.style.opacity = "1", s.style.visibility = "visible");
        }, 300);
      }).catch((s) => {
        console.error("Failed to enter fullscreen:", s);
      });
    }
  }
  cleanup() {
    window.removeEventListener("resize", this.handleWindowResize), document.removeEventListener("fullscreenchange", this.handleFullscreenChange), document.removeEventListener("webkitfullscreenchange", this.handleFullscreenChange), document.removeEventListener("mozfullscreenchange", this.handleFullscreenChange), document.removeEventListener("MSFullscreenChange", this.handleFullscreenChange), this.resizeObserver && (this.resizeObserver.disconnect(), this.resizeObserver = null), this.wsManager && (this.wsManager.disconnect(), this.wsManager = null), this.terminal && (this.terminal.dispose(), this.terminal = null), this.fitAddon = null, this.searchAddon = null, this.webLinksAddon = null;
  }
  render() {
    let e = "status-bar", t = "";
    switch (this.connectionStatus) {
      case "connecting":
        e += " status-connecting", t = B("terminal.connecting");
        break;
      case "connected":
        e += " status-connected", t = B("terminal.connected");
        break;
      case "disconnected":
        e += " status-disconnected", t = B("terminal.disconnected");
        break;
    }
    return N`
      <div class="terminal-header">
        <h3>${B("terminal.title")}</h3>
        <div class="terminal-actions">
          <button class="terminal-action" @click=${this.clearTerminal} title="${B("terminal.clear")}">
            ${B("terminal.clear")}
          </button>
          <button class="terminal-action" @click=${this.copySelection} title="${B("terminal.copy")}">
            ${B("terminal.copy")}
          </button>
          <button class="terminal-action" @click=${this.pasteFromClipboard} title="${B("terminal.paste")}">
            ${B("terminal.paste")}
          </button>
          <button class="terminal-action" @click=${this.toggleFullscreen} title="${B("terminal.fullscreen")}">
            ${B("terminal.fullscreen")}
          </button>
          <button class="terminal-action" @click=${this.scrollToTop} title="Scroll to Top">
            ↑ Top
          </button>
          <button class="terminal-action" @click=${this.scrollToBottom} title="Scroll to Bottom">
            ↓ Bottom
          </button>
          ${this.connectionStatus === "disconnected" ? N`<button class="terminal-action" @click=${this.connect}>Connect</button>` : this.connectionStatus === "connected" ? N`<button class="terminal-action" @click=${this.disconnect}>Disconnect</button>` : ""}
        </div>
      </div>
      <div class="terminal-container">
        <div class="terminal-wrapper"></div>
      </div>
      <div class="${e}">${t}</div>
    `;
  }
};
Or.styles = [
  So(yf),
  Ne`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      box-sizing: border-box;
    }

    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--vscode-bg-lighter);
      border-bottom: 1px solid var(--vscode-border);
    }

    .terminal-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
      color: var(--vscode-text);
    }

    .terminal-actions {
      display: flex;
      gap: 8px;
    }

    .terminal-action {
      padding: 4px 8px;
      border: none;
      background-color: transparent;
      color: var(--vscode-text-dim);
      cursor: pointer;
      font-size: 12px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .terminal-action:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    .terminal-container {
      flex: 1;
      overflow: hidden;
      padding: 8px;
      display: flex;
      flex-direction: column;
    }

    /* Ensure xterm terminal fills the container */
    .terminal-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .status-bar {
      display: flex;
      align-items: center;
      padding: 4px 16px;
      background-color: var(--vscode-bg-lighter);
      border-top: 1px solid var(--vscode-border);
      color: var(--vscode-text);
      font-size: 12px;
    }

    .status-connected {
      background-color: var(--vscode-success);
    }

    .status-disconnected {
      background-color: var(--vscode-error);
    }

    .status-connecting {
      background-color: var(--vscode-warning);
    }

    /* Terminal container should position elements correctly */
    .terminal-container {
      position: relative;
    }

    /* Fullscreen styles */
    :host(:fullscreen),
    :host(:-webkit-full-screen),
    :host(:-moz-full-screen),
    :host(:-ms-fullscreen) {
      width: 100vw !important;
      height: 100vh !important;
      background-color: var(--vscode-bg);
      display: flex !important;
      flex-direction: column !important;
      margin: 0 !important;
      padding: 0 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      z-index: 9999 !important;
    }

    :host(:fullscreen) .terminal-header,
    :host(:-webkit-full-screen) .terminal-header,
    :host(:-moz-full-screen) .terminal-header,
    :host(:-ms-fullscreen) .terminal-header {
      background-color: rgba(37, 37, 38, 0.95);
      z-index: 10000 !important;
    }

    :host(:fullscreen) .terminal-container,
    :host(:-webkit-full-screen) .terminal-container,
    :host(:-moz-full-screen) .terminal-container,
    :host(:-ms-fullscreen) .terminal-container {
      flex: 1 !important;
      height: auto !important;
      padding: 16px;
      background-color: #1e1e1e !important;
      display: flex !important;
      flex-direction: column !important;
      opacity: 1 !important;
      visibility: visible !important;
      z-index: 10001 !important;
    }

    :host(:fullscreen) .terminal-wrapper,
    :host(:-webkit-full-screen) .terminal-wrapper,
    :host(:-moz-full-screen) .terminal-wrapper,
    :host(:-ms-fullscreen) .terminal-wrapper {
      flex: 1 !important;
      background-color: #1e1e1e !important;
      opacity: 1 !important;
      visibility: visible !important;
      position: relative !important;
      overflow: hidden !important;
      z-index: 10002 !important;
    }

    /* Force xterm to be visible in fullscreen */
    :host(:fullscreen) .terminal-wrapper .xterm,
    :host(:-webkit-full-screen) .terminal-wrapper .xterm,
    :host(:-moz-full-screen) .terminal-wrapper .xterm,
    :host(:-ms-fullscreen) .terminal-wrapper .xterm {
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 10003 !important;
    }

    :host(:fullscreen) .status-bar,
    :host(:-webkit-full-screen) .status-bar,
    :host(:-moz-full-screen) .status-bar,
    :host(:-ms-fullscreen) .status-bar {
      z-index: 10004 !important;
    }
  `
];
let rr = Or;
customElements.define("terminal-tab", rr);
var Sf = Object.defineProperty, Dr = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && Sf(e, t, r), r;
};
const Br = class Br extends De {
  constructor() {
    super(...arguments), this.users = [], this.showCreateForm = !1, this.newUser = { username: "", password: "", groups: "" };
  }
  connectedCallback() {
    super.connectedCallback(), this.fetchUsers();
  }
  async fetchUsers() {
    try {
      const e = await Q.get("/users");
      this.users = e.users;
    } catch (e) {
      console.error("Error fetching users:", e);
    }
  }
  async createUser() {
    try {
      await Q.post("/users", this.newUser), this.showCreateForm = !1, this.newUser = { username: "", password: "", groups: "" }, this.fetchUsers();
    } catch (e) {
      console.error("Error creating user:", e);
    }
  }
  async deleteUser(e) {
    if (confirm(B("users.deleteConfirm", { username: e })))
      try {
        await Q.delete(`/users/${e}`), this.fetchUsers();
      } catch (t) {
        console.error("Error deleting user:", t);
      }
  }
  updateNewUser(e, t) {
    this.newUser = { ...this.newUser, [e]: t };
  }
  renderCreateForm() {
    return this.showCreateForm ? N`
      <div class="create-form">
        <h3>${B("users.createUser")}</h3>
        <div class="form-group">
          <label for="username">${B("users.username")}</label>
          <input
            id="username"
            type="text"
            .value=${this.newUser.username}
            @input=${(e) => this.updateNewUser("username", e.target.value)}
            placeholder="${B("users.username")}"
          />
        </div>
        <div class="form-group">
          <label for="password">${B("users.password")}</label>
          <input
            id="password"
            type="password"
            .value=${this.newUser.password}
            @input=${(e) => this.updateNewUser("password", e.target.value)}
            placeholder="${B("users.password")}"
          />
        </div>
        <div class="form-group">
          <label for="groups">${B("users.groups")}</label>
          <input
            id="groups"
            type="text"
            .value=${this.newUser.groups}
            @input=${(e) => this.updateNewUser("groups", e.target.value)}
            placeholder="wheel,users"
          />
        </div>
        <div class="form-actions">
          <button class="btn-secondary" @click=${() => this.showCreateForm = !1}>
            ${B("common.cancel")}
          </button>
          <button class="btn-primary" @click=${this.createUser}>
            ${B("common.create")}
          </button>
        </div>
      </div>
    ` : "";
  }
  renderUser(e) {
    return N`
      <div class="user-card">
        <div class="user-info">
          <div class="user-name">
            <span class="icon">👤</span>
            ${e.username}
          </div>
          <div class="user-details">
            ${B("users.uid")}: ${e.uid} | ${B("users.gid")}: ${e.gid}
          </div>
          <div class="user-details">
            ${B("users.home")}: ${e.home}
          </div>
          <div class="user-details">
            ${B("users.shell")}: ${e.shell}
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-secondary" title="${B("users.resetPassword")}">
            ${B("users.resetPassword")}
          </button>
          <button class="btn-danger" @click=${() => this.deleteUser(e.username)}>
            ${B("common.delete")}
          </button>
        </div>
      </div>
    `;
  }
  render() {
    return N`
      <div class="header">
        <h1>${B("users.title")}</h1>
        <button class="btn-primary" @click=${() => this.showCreateForm = !0}>
          ${B("users.createUser")}
        </button>
      </div>
      
      ${this.renderCreateForm()}
      
      <div class="users-grid">
        ${this.users.map((e) => this.renderUser(e))}
      </div>
    `;
  }
};
Br.styles = Ne`
    :host {
      display: block;
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    .users-grid {
      display: grid;
      gap: 12px;
    }

    .user-card {
      background: var(--vscode-bg-light);
      padding: 16px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-name {
      font-weight: bold;
      font-size: 16px;
    }

    .user-details {
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .user-actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .btn-secondary {
      background: var(--vscode-bg-lighter);
      color: var(--vscode-text);
      border: 1px solid var(--vscode-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-border);
    }

    .create-form {
      background: var(--vscode-bg-light);
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      font-size: 13px;
    }

    input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 14px;
    }

    input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
      margin-right: 4px;
    }
  `;
let Wt = Br;
Dr([
  oe({ type: Array })
], Wt.prototype, "users");
Dr([
  oe({ type: Boolean })
], Wt.prototype, "showCreateForm");
Dr([
  oe({ type: Object })
], Wt.prototype, "newUser");
customElements.define("users-tab", Wt);
var xf = Object.defineProperty, Ar = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && xf(e, t, r), r;
};
const Ir = class Ir extends De {
  constructor() {
    super(...arguments), this.collapsed = !1, this.activeItemId = "dashboard", this.expandedItems = /* @__PURE__ */ new Set(["network"]), this.navigationItems = [
      {
        id: "dashboard",
        label: "nav.dashboard",
        icon: "dashboard",
        route: "dashboard"
      },
      {
        id: "network",
        label: "nav.network",
        icon: "network",
        route: "network"
      },
      {
        id: "storage",
        label: "nav.storage",
        icon: "storage",
        route: "storage"
      },
      {
        id: "containers",
        label: "nav.containers",
        icon: "containers",
        route: "containers"
      },
      {
        id: "logs",
        label: "nav.logs",
        icon: "logs",
        route: "logs"
      },
      {
        id: "users",
        label: "nav.users",
        icon: "users",
        route: "users"
      },
      {
        id: "terminal",
        label: "nav.terminal",
        icon: "terminal",
        route: "terminal"
      }
    ], this.handlePopState = () => {
      const e = window.location.pathname.slice(1);
      if (e) {
        const t = this.navigationItems.find((s) => s.route === e);
        t && (this.activeItemId = t.id, this.requestUpdate());
      }
    };
  }
  handleItemClick(e, t) {
    if (t.stopPropagation(), e.children)
      this.expandedItems.has(e.id) ? this.expandedItems.delete(e.id) : this.expandedItems.add(e.id), this.requestUpdate();
    else if (e.route) {
      this.activeItemId = e.id;
      const s = e.route === "dashboard" ? "/" : `/${e.route}`;
      window.history.pushState({ route: e.route }, "", s), this.dispatchEvent(new CustomEvent("navigate", {
        detail: { route: e.route, item: e },
        bubbles: !0,
        composed: !0
      }));
    }
  }
  handleKeyDown(e, t) {
    t.key === "Enter" || t.key === " " ? (t.preventDefault(), this.handleItemClick(e, t)) : t.key === "ArrowRight" && e.children ? (t.preventDefault(), this.expandedItems.has(e.id) || (this.expandedItems.add(e.id), this.requestUpdate())) : t.key === "ArrowLeft" && e.children && (t.preventDefault(), this.expandedItems.has(e.id) && (this.expandedItems.delete(e.id), this.requestUpdate()));
  }
  renderNavItem(e) {
    const t = e.children && e.children.length > 0, s = this.expandedItems.has(e.id), r = this.activeItemId === e.id;
    return N`
      <li>
        <div
          class="tree-item ${r ? "active" : ""}"
          @click=${(o) => this.handleItemClick(e, o)}
          @keydown=${(o) => this.handleKeyDown(e, o)}
          title=${this.collapsed ? B(e.label) : ""}
          tabindex="0"
          role="treeitem"
          aria-expanded=${t ? s : void 0}
          aria-selected=${r}
        >
          ${t ? N`
            <span class="tree-item-arrow ${s ? "expanded" : ""}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4l4 4-4 4z"/>
              </svg>
            </span>
          ` : N`<span class="tree-item-arrow"></span>`}
          <span class="tree-item-icon icon-${e.icon}"></span>
          <span class="tree-item-label">${B(e.label)}</span>
        </div>
        ${t && s && !this.collapsed ? N`
          <ul class="tree-children">
            ${e.children.map((o) => this.renderNavItem(o))}
          </ul>
        ` : ""}
      </li>
    `;
  }
  connectedCallback() {
    super.connectedCallback();
    const e = window.location.pathname.slice(1);
    if (!e || e === "")
      this.activeItemId = "dashboard";
    else {
      const t = this.navigationItems.find((s) => s.route === e);
      t ? this.activeItemId = t.id : this.activeItemId = "";
    }
    window.addEventListener("popstate", this.handlePopState);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("popstate", this.handlePopState);
  }
  render() {
    return N`
      <ul class="tree" role="tree">
        ${this.navigationItems.map((e) => this.renderNavItem(e))}
      </ul>
    `;
  }
};
Ir.styles = Ne`
    :host {
      display: block;
      height: 100%;
      background-color: var(--vscode-sidebar);
      color: var(--vscode-text);
      border-right: 1px solid var(--vscode-border);
      overflow-y: auto;
      user-select: none;
    }

    .tree {
      padding: 20px 0 0 0;
      margin: 0;
      list-style: none;
    }

    .tree-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      position: relative;
      font-size: 13px;
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
    }

    .tree-item:hover {
      background-color: var(--vscode-sidebar-hover);
      border-left-color: var(--vscode-text-dim);
    }

    .tree-item.active {
      background-color: var(--vscode-sidebar-active);
      border-left-color: var(--vscode-sidebar-active-border);
      color: var(--vscode-accent);
    }

    .tree-item.active .tree-item-icon {
      color: var(--vscode-accent);
    }

    .tree-item-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tree-item-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-item-arrow {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .tree-item-arrow.expanded {
      transform: rotate(90deg);
    }

    .tree-children {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .tree-children .tree-item {
      padding-left: 28px;
    }

    .tree-children .tree-children .tree-item {
      padding-left: 44px;
    }

    /* Icons */
    .icon-system::before { content: '💻'; }
    .icon-dashboard::before { content: '📊'; }
    .icon-logs::before { content: '📜'; }
    .icon-terminal::before { content: '⌨️'; }
    .icon-network::before { content: '🌐'; }
    .icon-interfaces::before { content: '🔌'; }
    .icon-bonding::before { content: '🔗'; }
    .icon-vlans::before { content: '🏷️'; }
    .icon-storage::before { content: '💾'; }
    .icon-disks::before { content: '💿'; }
    .icon-lvm::before { content: '📦'; }
    .icon-raid::before { content: '🗄️'; }
    .icon-containers::before { content: '📦'; }
    .icon-images::before { content: '💿'; }
    .icon-users::before { content: '👥'; }

    :host([collapsed]) .tree-item-label,
    :host([collapsed]) .tree-item-arrow,
    :host([collapsed]) .tree-children {
      display: none;
    }

    :host([collapsed]) .tree-item {
      padding: 8px;
      justify-content: center;
    }

    :host([collapsed]) .tree-item-icon {
      margin-right: 0;
    }

    /* Focus styles for keyboard navigation */
    .tree-item:focus-visible {
      outline: 2px solid var(--vscode-accent);
      outline-offset: -2px;
    }

    /* Subtle animation on icon when hovering */
    .tree-item:hover .tree-item-icon {
      transform: translateX(2px);
      transition: transform 0.15s ease;
    }

    /* Child items styling */
    .tree-children .tree-item {
      font-size: 12px;
      opacity: 0.9;
    }

    .tree-children .tree-item.active {
      opacity: 1;
    }
  `;
let Nt = Ir;
Ar([
  oe({ type: Boolean })
], Nt.prototype, "collapsed");
Ar([
  oe({ type: String })
], Nt.prototype, "activeItemId");
Ar([
  oe({ type: Object })
], Nt.prototype, "expandedItems");
customElements.define("sidebar-tree", Nt);
var wf = Object.defineProperty, vs = (i, e, t, s) => {
  for (var r = void 0, o = i.length - 1, l; o >= 0; o--)
    (l = i[o]) && (r = l(e, t, r) || r);
  return r && wf(e, t, r), r;
};
const $r = class $r extends De {
  constructor() {
    super(...arguments), this.sidebarCollapsed = !1, this.isAuthenticated = !1, this.activeView = "dashboard", this.currentTheme = Fr.getTheme(), this.handleAuthLogin = () => {
      this.isAuthenticated = !0;
    }, this.handleAuthLogout = () => {
      this.isAuthenticated = !1;
    }, this.handleLoginSuccess = () => {
      this.isAuthenticated = !0;
    }, this.handleThemeChange = (e) => {
      this.currentTheme = e.detail.theme;
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.isAuthenticated = vt.isAuthenticated();
    const e = window.location.pathname.slice(1);
    !e || e === "" ? (this.activeView = "dashboard", window.history.replaceState({ route: "dashboard" }, "", "/")) : this.isValidRoute(e) ? this.activeView = e : this.activeView = e, window.addEventListener("popstate", (t) => {
      if (t.state && t.state.route)
        this.activeView = t.state.route;
      else {
        const s = window.location.pathname.slice(1);
        !s || s === "" ? this.activeView = "dashboard" : this.activeView = s;
      }
    }), window.addEventListener("auth:login", this.handleAuthLogin), window.addEventListener("auth:logout", this.handleAuthLogout), this.addEventListener("login-success", this.handleLoginSuccess), window.addEventListener("theme-changed", this.handleThemeChange);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("auth:login", this.handleAuthLogin), window.removeEventListener("auth:logout", this.handleAuthLogout), window.removeEventListener("theme-changed", this.handleThemeChange);
  }
  handleLogout() {
    vt.logout();
  }
  toggleTheme() {
    Fr.toggleTheme();
  }
  render() {
    return this.isAuthenticated ? N`
      <!-- App Header -->
      <header class="app-header">
        <div class="header-title">Vapor</div>
        <div class="header-actions">
          <button class="theme-toggle" @click="${this.toggleTheme}" title="Toggle theme">
            ${this.currentTheme === "dark" ? N`
              <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ` : N`
              <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            `}
          </button>
          <span class="user-info">Logged in</span>
          <button class="logout-button" @click="${this.handleLogout}">Logout</button>
        </div>
      </header>
      <!-- App Content -->
      <div class="app-content">
        <!-- Sidebar -->
        <sidebar-tree 
          ?collapsed="${this.sidebarCollapsed}"
          activeItemId="${this.activeView}"
          @navigate="${this.handleNavigation}"
        ></sidebar-tree>
        
        <button class="sidebar-toggle ${this.sidebarCollapsed ? "collapsed" : ""}" @click="${this.toggleSidebar}">
          ${this.sidebarCollapsed ? "›" : "‹"}
        </button>

        <!-- Main Content -->
        <main class="main">
          <div class="tab-content">
            ${this.activeView === "dashboard" ? N`<dashboard-tab></dashboard-tab>` : ""}
            ${this.activeView === "network" ? N`<network-tab></network-tab>` : ""}
            ${this.activeView === "storage" ? N`<storage-tab></storage-tab>` : ""}
            ${this.activeView === "containers" ? N`<containers-tab></containers-tab>` : ""}
            ${this.activeView === "logs" ? N`<logs-tab></logs-tab>` : ""}
            ${this.activeView === "terminal" ? N`<terminal-tab></terminal-tab>` : ""}
            ${this.activeView === "users" ? N`<users-tab></users-tab>` : ""}
            ${this.isValidRoute(this.activeView) ? "" : N`<div>404 - Page Not Found</div>`}
          </div>
        </main>
      </div>
      </div>
    ` : N`<login-page></login-page>`;
  }
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  handleNavigation(e) {
    this.activeView = e.detail.route;
  }
  isValidRoute(e) {
    return ["dashboard", "network", "storage", "containers", "logs", "terminal", "users"].includes(e);
  }
};
$r.styles = Ne`
    :host {
      display: block;
      height: 100vh;
      background-color: var(--surface-0);
      color: var(--text-primary);
      font-family: var(--font-family);
    }
  
    .app-header {
      background-color: var(--surface-1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 56px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-title {
      font-size: 1.25rem;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .user-info {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .logout-button {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .logout-button:hover {
      background: var(--surface-2);
      border-color: var(--primary);
    }

    .theme-toggle {
      padding: 0.5rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }

    .theme-toggle:hover {
      background: var(--surface-2);
      border-color: var(--primary);
    }

    .theme-icon {
      width: 20px;
      height: 20px;
    }

    .app-content {
      display: flex;
      height: calc(100vh - 56px);
    }

    sidebar-tree {
      width: 200px;
      background-color: var(--surface-1);
      transition: width 0.3s ease-in-out;
      border-right: 1px solid var(--border-color);
    }

    sidebar-tree[collapsed] {
      width: 60px;
    }
    
    .sidebar-toggle {
      position: absolute;
      top: 70px;
      left: 200px;
      transform: translateX(-50%);
      z-index: 10;
      padding: 0.25rem;
      background: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .sidebar-toggle:hover {
      background: var(--surface-2);
      color: var(--text-primary);
    }
    
    .sidebar-toggle.collapsed {
      left: 60px;
    }
    
    .main {
      flex: 1;
      overflow: auto;
      background-color: var(--surface-0);
      color: var(--text-primary);
      padding: 2rem;
      display: flex;
      flex-direction: column;
    }
    
    .tab-content {
      margin-top: 1rem;
      flex: 1;
      overflow: auto;
    }
  `;
let Et = $r;
vs([
  oe({ type: Boolean })
], Et.prototype, "sidebarCollapsed");
vs([
  fe()
], Et.prototype, "isAuthenticated");
vs([
  fe()
], Et.prototype, "activeView");
vs([
  fe()
], Et.prototype, "currentTheme");
customElements.define("app-root", Et);
export {
  Et as AppRoot
};
