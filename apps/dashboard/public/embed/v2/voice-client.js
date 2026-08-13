var Ar = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function wd(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var Tr = { exports: {} }, ho;
function tf() {
  if (ho) return Tr.exports;
  ho = 1;
  var r = typeof Reflect == "object" ? Reflect : null, e = r && typeof r.apply == "function" ? r.apply : function(S, T, L) {
    return Function.prototype.apply.call(S, T, L);
  }, t;
  r && typeof r.ownKeys == "function" ? t = r.ownKeys : Object.getOwnPropertySymbols ? t = function(S) {
    return Object.getOwnPropertyNames(S).concat(Object.getOwnPropertySymbols(S));
  } : t = function(S) {
    return Object.getOwnPropertyNames(S);
  };
  function n(k) {
    console && console.warn && console.warn(k);
  }
  var i = Number.isNaN || function(S) {
    return S !== S;
  };
  function s() {
    s.init.call(this);
  }
  Tr.exports = s, Tr.exports.once = E, s.EventEmitter = s, s.prototype._events = void 0, s.prototype._eventsCount = 0, s.prototype._maxListeners = void 0;
  var a = 10;
  function c(k) {
    if (typeof k != "function")
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof k);
  }
  Object.defineProperty(s, "defaultMaxListeners", {
    enumerable: !0,
    get: function() {
      return a;
    },
    set: function(k) {
      if (typeof k != "number" || k < 0 || i(k))
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + k + ".");
      a = k;
    }
  }), s.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, s.prototype.setMaxListeners = function(S) {
    if (typeof S != "number" || S < 0 || i(S))
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + S + ".");
    return this._maxListeners = S, this;
  };
  function u(k) {
    return k._maxListeners === void 0 ? s.defaultMaxListeners : k._maxListeners;
  }
  s.prototype.getMaxListeners = function() {
    return u(this);
  }, s.prototype.emit = function(S) {
    for (var T = [], L = 1; L < arguments.length; L++) T.push(arguments[L]);
    var D = S === "error", N = this._events;
    if (N !== void 0)
      D = D && N.error === void 0;
    else if (!D)
      return !1;
    if (D) {
      var $;
      if (T.length > 0 && ($ = T[0]), $ instanceof Error)
        throw $;
      var U = new Error("Unhandled error." + ($ ? " (" + $.message + ")" : ""));
      throw U.context = $, U;
    }
    var de = N[S];
    if (de === void 0)
      return !1;
    if (typeof de == "function")
      e(de, this, T);
    else
      for (var Le = de.length, vt = b(de, Le), L = 0; L < Le; ++L)
        e(vt[L], this, T);
    return !0;
  };
  function l(k, S, T, L) {
    var D, N, $;
    if (c(T), N = k._events, N === void 0 ? (N = k._events = /* @__PURE__ */ Object.create(null), k._eventsCount = 0) : (N.newListener !== void 0 && (k.emit(
      "newListener",
      S,
      T.listener ? T.listener : T
    ), N = k._events), $ = N[S]), $ === void 0)
      $ = N[S] = T, ++k._eventsCount;
    else if (typeof $ == "function" ? $ = N[S] = L ? [T, $] : [$, T] : L ? $.unshift(T) : $.push(T), D = u(k), D > 0 && $.length > D && !$.warned) {
      $.warned = !0;
      var U = new Error("Possible EventEmitter memory leak detected. " + $.length + " " + String(S) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      U.name = "MaxListenersExceededWarning", U.emitter = k, U.type = S, U.count = $.length, n(U);
    }
    return k;
  }
  s.prototype.addListener = function(S, T) {
    return l(this, S, T, !1);
  }, s.prototype.on = s.prototype.addListener, s.prototype.prependListener = function(S, T) {
    return l(this, S, T, !0);
  };
  function f() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function p(k, S, T) {
    var L = { fired: !1, wrapFn: void 0, target: k, type: S, listener: T }, D = f.bind(L);
    return D.listener = T, L.wrapFn = D, D;
  }
  s.prototype.once = function(S, T) {
    return c(T), this.on(S, p(this, S, T)), this;
  }, s.prototype.prependOnceListener = function(S, T) {
    return c(T), this.prependListener(S, p(this, S, T)), this;
  }, s.prototype.removeListener = function(S, T) {
    var L, D, N, $, U;
    if (c(T), D = this._events, D === void 0)
      return this;
    if (L = D[S], L === void 0)
      return this;
    if (L === T || L.listener === T)
      --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete D[S], D.removeListener && this.emit("removeListener", S, L.listener || T));
    else if (typeof L != "function") {
      for (N = -1, $ = L.length - 1; $ >= 0; $--)
        if (L[$] === T || L[$].listener === T) {
          U = L[$].listener, N = $;
          break;
        }
      if (N < 0)
        return this;
      N === 0 ? L.shift() : v(L, N), L.length === 1 && (D[S] = L[0]), D.removeListener !== void 0 && this.emit("removeListener", S, U || T);
    }
    return this;
  }, s.prototype.off = s.prototype.removeListener, s.prototype.removeAllListeners = function(S) {
    var T, L, D;
    if (L = this._events, L === void 0)
      return this;
    if (L.removeListener === void 0)
      return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : L[S] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete L[S]), this;
    if (arguments.length === 0) {
      var N = Object.keys(L), $;
      for (D = 0; D < N.length; ++D)
        $ = N[D], $ !== "removeListener" && this.removeAllListeners($);
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (T = L[S], typeof T == "function")
      this.removeListener(S, T);
    else if (T !== void 0)
      for (D = T.length - 1; D >= 0; D--)
        this.removeListener(S, T[D]);
    return this;
  };
  function y(k, S, T) {
    var L = k._events;
    if (L === void 0)
      return [];
    var D = L[S];
    return D === void 0 ? [] : typeof D == "function" ? T ? [D.listener || D] : [D] : T ? C(D) : b(D, D.length);
  }
  s.prototype.listeners = function(S) {
    return y(this, S, !0);
  }, s.prototype.rawListeners = function(S) {
    return y(this, S, !1);
  }, s.listenerCount = function(k, S) {
    return typeof k.listenerCount == "function" ? k.listenerCount(S) : M.call(k, S);
  }, s.prototype.listenerCount = M;
  function M(k) {
    var S = this._events;
    if (S !== void 0) {
      var T = S[k];
      if (typeof T == "function")
        return 1;
      if (T !== void 0)
        return T.length;
    }
    return 0;
  }
  s.prototype.eventNames = function() {
    return this._eventsCount > 0 ? t(this._events) : [];
  };
  function b(k, S) {
    for (var T = new Array(S), L = 0; L < S; ++L)
      T[L] = k[L];
    return T;
  }
  function v(k, S) {
    for (; S + 1 < k.length; S++)
      k[S] = k[S + 1];
    k.pop();
  }
  function C(k) {
    for (var S = new Array(k.length), T = 0; T < S.length; ++T)
      S[T] = k[T].listener || k[T];
    return S;
  }
  function E(k, S) {
    return new Promise(function(T, L) {
      function D($) {
        k.removeListener(S, N), L($);
      }
      function N() {
        typeof k.removeListener == "function" && k.removeListener("error", D), T([].slice.call(arguments));
      }
      I(k, S, N, { once: !0 }), S !== "error" && O(k, D, { once: !0 });
    });
  }
  function O(k, S, T) {
    typeof k.on == "function" && I(k, "error", S, T);
  }
  function I(k, S, T, L) {
    if (typeof k.on == "function")
      L.once ? k.once(S, T) : k.on(S, T);
    else if (typeof k.addEventListener == "function")
      k.addEventListener(S, function D(N) {
        L.once && k.removeEventListener(S, D), T(N);
      });
    else
      throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof k);
  }
  return Tr.exports;
}
var rf = tf();
const nf = /* @__PURE__ */ wd(rf), pe = [];
for (let r = 0; r < 256; ++r)
  pe.push((r + 256).toString(16).slice(1));
function sf(r, e = 0) {
  return (pe[r[e + 0]] + pe[r[e + 1]] + pe[r[e + 2]] + pe[r[e + 3]] + "-" + pe[r[e + 4]] + pe[r[e + 5]] + "-" + pe[r[e + 6]] + pe[r[e + 7]] + "-" + pe[r[e + 8]] + pe[r[e + 9]] + "-" + pe[r[e + 10]] + pe[r[e + 11]] + pe[r[e + 12]] + pe[r[e + 13]] + pe[r[e + 14]] + pe[r[e + 15]]).toLowerCase();
}
let Mn;
const af = new Uint8Array(16);
function of() {
  if (!Mn) {
    if (typeof crypto > "u" || !crypto.getRandomValues)
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    Mn = crypto.getRandomValues.bind(crypto);
  }
  return Mn(af);
}
const cf = typeof crypto < "u" && crypto.randomUUID && crypto.randomUUID.bind(crypto), fo = { randomUUID: cf };
function uf(r, e, t) {
  if (fo.randomUUID && !e && !r)
    return fo.randomUUID();
  r = r || {};
  const n = r.random ?? r.rng?.() ?? of();
  if (n.length < 16)
    throw new Error("Random bytes length must be >= 16");
  if (n[6] = n[6] & 15 | 64, n[8] = n[8] & 63 | 128, e) {
    if (t = t || 0, t < 0 || t + 16 > e.length)
      throw new RangeError(`UUID byte range ${t}:${t + 15} is out of buffer bounds`);
    for (let i = 0; i < 16; ++i)
      e[t + i] = n[i];
    return e;
  }
  return sf(n);
}
const lf = {
  AmazonBot: "amazonbot",
  "Amazon Silk": "amazon_silk",
  "Android Browser": "android",
  BaiduSpider: "baiduspider",
  Bada: "bada",
  BingCrawler: "bingcrawler",
  Brave: "brave",
  BlackBerry: "blackberry",
  "ChatGPT-User": "chatgpt_user",
  Chrome: "chrome",
  ClaudeBot: "claudebot",
  Chromium: "chromium",
  Diffbot: "diffbot",
  DuckDuckBot: "duckduckbot",
  DuckDuckGo: "duckduckgo",
  Electron: "electron",
  Epiphany: "epiphany",
  FacebookExternalHit: "facebookexternalhit",
  Firefox: "firefox",
  Focus: "focus",
  Generic: "generic",
  "Google Search": "google_search",
  Googlebot: "googlebot",
  GPTBot: "gptbot",
  "Internet Explorer": "ie",
  InternetArchiveCrawler: "internetarchivecrawler",
  "K-Meleon": "k_meleon",
  LibreWolf: "librewolf",
  Linespider: "linespider",
  Maxthon: "maxthon",
  "Meta-ExternalAds": "meta_externalads",
  "Meta-ExternalAgent": "meta_externalagent",
  "Meta-ExternalFetcher": "meta_externalfetcher",
  "Meta-WebIndexer": "meta_webindexer",
  "Microsoft Edge": "edge",
  "MZ Browser": "mz",
  "NAVER Whale Browser": "naver",
  "OAI-SearchBot": "oai_searchbot",
  Omgilibot: "omgilibot",
  Opera: "opera",
  "Opera Coast": "opera_coast",
  "Pale Moon": "pale_moon",
  PerplexityBot: "perplexitybot",
  "Perplexity-User": "perplexity_user",
  PhantomJS: "phantomjs",
  PingdomBot: "pingdombot",
  Puffin: "puffin",
  QQ: "qq",
  QQLite: "qqlite",
  QupZilla: "qupzilla",
  Roku: "roku",
  Safari: "safari",
  Sailfish: "sailfish",
  "Samsung Internet for Android": "samsung_internet",
  SlackBot: "slackbot",
  SeaMonkey: "seamonkey",
  Sleipnir: "sleipnir",
  "Sogou Browser": "sogou",
  Swing: "swing",
  Tizen: "tizen",
  "UC Browser": "uc",
  Vivaldi: "vivaldi",
  "WebOS Browser": "webos",
  WeChat: "wechat",
  YahooSlurp: "yahooslurp",
  "Yandex Browser": "yandex",
  YandexBot: "yandexbot",
  YouBot: "youbot"
}, Sd = {
  amazonbot: "AmazonBot",
  amazon_silk: "Amazon Silk",
  android: "Android Browser",
  baiduspider: "BaiduSpider",
  bada: "Bada",
  bingcrawler: "BingCrawler",
  blackberry: "BlackBerry",
  brave: "Brave",
  chatgpt_user: "ChatGPT-User",
  chrome: "Chrome",
  claudebot: "ClaudeBot",
  chromium: "Chromium",
  diffbot: "Diffbot",
  duckduckbot: "DuckDuckBot",
  duckduckgo: "DuckDuckGo",
  edge: "Microsoft Edge",
  electron: "Electron",
  epiphany: "Epiphany",
  facebookexternalhit: "FacebookExternalHit",
  firefox: "Firefox",
  focus: "Focus",
  generic: "Generic",
  google_search: "Google Search",
  googlebot: "Googlebot",
  gptbot: "GPTBot",
  ie: "Internet Explorer",
  internetarchivecrawler: "InternetArchiveCrawler",
  k_meleon: "K-Meleon",
  librewolf: "LibreWolf",
  linespider: "Linespider",
  maxthon: "Maxthon",
  meta_externalads: "Meta-ExternalAds",
  meta_externalagent: "Meta-ExternalAgent",
  meta_externalfetcher: "Meta-ExternalFetcher",
  meta_webindexer: "Meta-WebIndexer",
  mz: "MZ Browser",
  naver: "NAVER Whale Browser",
  oai_searchbot: "OAI-SearchBot",
  omgilibot: "Omgilibot",
  opera: "Opera",
  opera_coast: "Opera Coast",
  pale_moon: "Pale Moon",
  perplexitybot: "PerplexityBot",
  perplexity_user: "Perplexity-User",
  phantomjs: "PhantomJS",
  pingdombot: "PingdomBot",
  puffin: "Puffin",
  qq: "QQ Browser",
  qqlite: "QQ Browser Lite",
  qupzilla: "QupZilla",
  roku: "Roku",
  safari: "Safari",
  sailfish: "Sailfish",
  samsung_internet: "Samsung Internet for Android",
  seamonkey: "SeaMonkey",
  slackbot: "SlackBot",
  sleipnir: "Sleipnir",
  sogou: "Sogou Browser",
  swing: "Swing",
  tizen: "Tizen",
  uc: "UC Browser",
  vivaldi: "Vivaldi",
  webos: "WebOS Browser",
  wechat: "WeChat",
  yahooslurp: "YahooSlurp",
  yandex: "Yandex Browser",
  yandexbot: "YandexBot",
  youbot: "YouBot"
}, V = {
  bot: "bot",
  desktop: "desktop",
  mobile: "mobile",
  tablet: "tablet",
  tv: "tv"
}, ge = {
  Android: "Android",
  Bada: "Bada",
  BlackBerry: "BlackBerry",
  ChromeOS: "Chrome OS",
  HarmonyOS: "HarmonyOS",
  iOS: "iOS",
  Linux: "Linux",
  MacOS: "macOS",
  PlayStation4: "PlayStation 4",
  Roku: "Roku",
  Tizen: "Tizen",
  WebOS: "WebOS",
  Windows: "Windows",
  WindowsPhone: "Windows Phone"
}, ut = {
  Blink: "Blink",
  EdgeHTML: "EdgeHTML",
  Gecko: "Gecko",
  Presto: "Presto",
  Trident: "Trident",
  WebKit: "WebKit"
};
class _ {
  /**
   * Get first matched item for a string
   * @param {RegExp} regexp
   * @param {String} ua
   * @return {Array|{index: number, input: string}|*|boolean|string}
   */
  static getFirstMatch(e, t) {
    const n = t.match(e);
    return n && n.length > 0 && n[1] || "";
  }
  /**
   * Get second matched item for a string
   * @param regexp
   * @param {String} ua
   * @return {Array|{index: number, input: string}|*|boolean|string}
   */
  static getSecondMatch(e, t) {
    const n = t.match(e);
    return n && n.length > 1 && n[2] || "";
  }
  /**
   * Match a regexp and return a constant or undefined
   * @param {RegExp} regexp
   * @param {String} ua
   * @param {*} _const Any const that will be returned if regexp matches the string
   * @return {*}
   */
  static matchAndReturnConst(e, t, n) {
    if (e.test(t))
      return n;
  }
  static getWindowsVersionName(e) {
    switch (e) {
      case "NT":
        return "NT";
      case "XP":
        return "XP";
      case "NT 5.0":
        return "2000";
      case "NT 5.1":
        return "XP";
      case "NT 5.2":
        return "2003";
      case "NT 6.0":
        return "Vista";
      case "NT 6.1":
        return "7";
      case "NT 6.2":
        return "8";
      case "NT 6.3":
        return "8.1";
      case "NT 10.0":
        return "10";
      default:
        return;
    }
  }
  /**
   * Get macOS version name
   *    10.5 - Leopard
   *    10.6 - Snow Leopard
   *    10.7 - Lion
   *    10.8 - Mountain Lion
   *    10.9 - Mavericks
   *    10.10 - Yosemite
   *    10.11 - El Capitan
   *    10.12 - Sierra
   *    10.13 - High Sierra
   *    10.14 - Mojave
   *    10.15 - Catalina
   *    11 - Big Sur
   *    12 - Monterey
   *    13 - Ventura
   *    14 - Sonoma
   *    15 - Sequoia
   *
   * @example
   *   getMacOSVersionName("10.14") // 'Mojave'
   *
   * @param  {string} version
   * @return {string} versionName
   */
  static getMacOSVersionName(e) {
    const t = e.split(".").splice(0, 2).map((s) => parseInt(s, 10) || 0);
    t.push(0);
    const n = t[0], i = t[1];
    if (n === 10)
      switch (i) {
        case 5:
          return "Leopard";
        case 6:
          return "Snow Leopard";
        case 7:
          return "Lion";
        case 8:
          return "Mountain Lion";
        case 9:
          return "Mavericks";
        case 10:
          return "Yosemite";
        case 11:
          return "El Capitan";
        case 12:
          return "Sierra";
        case 13:
          return "High Sierra";
        case 14:
          return "Mojave";
        case 15:
          return "Catalina";
        default:
          return;
      }
    switch (n) {
      case 11:
        return "Big Sur";
      case 12:
        return "Monterey";
      case 13:
        return "Ventura";
      case 14:
        return "Sonoma";
      case 15:
        return "Sequoia";
      default:
        return;
    }
  }
  /**
   * Get Android version name
   *    1.5 - Cupcake
   *    1.6 - Donut
   *    2.0 - Eclair
   *    2.1 - Eclair
   *    2.2 - Froyo
   *    2.x - Gingerbread
   *    3.x - Honeycomb
   *    4.0 - Ice Cream Sandwich
   *    4.1 - Jelly Bean
   *    4.4 - KitKat
   *    5.x - Lollipop
   *    6.x - Marshmallow
   *    7.x - Nougat
   *    8.x - Oreo
   *    9.x - Pie
   *
   * @example
   *   getAndroidVersionName("7.0") // 'Nougat'
   *
   * @param  {string} version
   * @return {string} versionName
   */
  static getAndroidVersionName(e) {
    const t = e.split(".").splice(0, 2).map((n) => parseInt(n, 10) || 0);
    if (t.push(0), !(t[0] === 1 && t[1] < 5)) {
      if (t[0] === 1 && t[1] < 6) return "Cupcake";
      if (t[0] === 1 && t[1] >= 6) return "Donut";
      if (t[0] === 2 && t[1] < 2) return "Eclair";
      if (t[0] === 2 && t[1] === 2) return "Froyo";
      if (t[0] === 2 && t[1] > 2) return "Gingerbread";
      if (t[0] === 3) return "Honeycomb";
      if (t[0] === 4 && t[1] < 1) return "Ice Cream Sandwich";
      if (t[0] === 4 && t[1] < 4) return "Jelly Bean";
      if (t[0] === 4 && t[1] >= 4) return "KitKat";
      if (t[0] === 5) return "Lollipop";
      if (t[0] === 6) return "Marshmallow";
      if (t[0] === 7) return "Nougat";
      if (t[0] === 8) return "Oreo";
      if (t[0] === 9) return "Pie";
    }
  }
  /**
   * Get version precisions count
   *
   * @example
   *   getVersionPrecision("1.10.3") // 3
   *
   * @param  {string} version
   * @return {number}
   */
  static getVersionPrecision(e) {
    return e.split(".").length;
  }
  /**
   * Calculate browser version weight
   *
   * @example
   *   compareVersions('1.10.2.1',  '1.8.2.1.90')    // 1
   *   compareVersions('1.010.2.1', '1.09.2.1.90');  // 1
   *   compareVersions('1.10.2.1',  '1.10.2.1');     // 0
   *   compareVersions('1.10.2.1',  '1.0800.2');     // -1
   *   compareVersions('1.10.2.1',  '1.10',  true);  // 0
   *
   * @param {String} versionA versions versions to compare
   * @param {String} versionB versions versions to compare
   * @param {boolean} [isLoose] enable loose comparison
   * @return {Number} comparison result: -1 when versionA is lower,
   * 1 when versionA is bigger, 0 when both equal
   */
  /* eslint consistent-return: 1 */
  static compareVersions(e, t, n = !1) {
    const i = _.getVersionPrecision(e), s = _.getVersionPrecision(t);
    let a = Math.max(i, s), c = 0;
    const u = _.map([e, t], (l) => {
      const f = a - _.getVersionPrecision(l), p = l + new Array(f + 1).join(".0");
      return _.map(p.split("."), (y) => new Array(20 - y.length).join("0") + y).reverse();
    });
    for (n && (c = a - Math.min(i, s)), a -= 1; a >= c; ) {
      if (u[0][a] > u[1][a])
        return 1;
      if (u[0][a] === u[1][a]) {
        if (a === c)
          return 0;
        a -= 1;
      } else if (u[0][a] < u[1][a])
        return -1;
    }
  }
  /**
   * Array::map polyfill
   *
   * @param  {Array} arr
   * @param  {Function} iterator
   * @return {Array}
   */
  static map(e, t) {
    const n = [];
    let i;
    if (Array.prototype.map)
      return Array.prototype.map.call(e, t);
    for (i = 0; i < e.length; i += 1)
      n.push(t(e[i]));
    return n;
  }
  /**
   * Array::find polyfill
   *
   * @param  {Array} arr
   * @param  {Function} predicate
   * @return {Array}
   */
  static find(e, t) {
    let n, i;
    if (Array.prototype.find)
      return Array.prototype.find.call(e, t);
    for (n = 0, i = e.length; n < i; n += 1) {
      const s = e[n];
      if (t(s, n))
        return s;
    }
  }
  /**
   * Object::assign polyfill
   *
   * @param  {Object} obj
   * @param  {Object} ...objs
   * @return {Object}
   */
  static assign(e, ...t) {
    const n = e;
    let i, s;
    if (Object.assign)
      return Object.assign(e, ...t);
    for (i = 0, s = t.length; i < s; i += 1) {
      const a = t[i];
      typeof a == "object" && a !== null && Object.keys(a).forEach((u) => {
        n[u] = a[u];
      });
    }
    return e;
  }
  /**
   * Get short version/alias for a browser name
   *
   * @example
   *   getBrowserAlias('Microsoft Edge') // edge
   *
   * @param  {string} browserName
   * @return {string}
   */
  static getBrowserAlias(e) {
    return lf[e];
  }
  /**
   * Get browser name for a short version/alias
   *
   * @example
   *   getBrowserTypeByAlias('edge') // Microsoft Edge
   *
   * @param  {string} browserAlias
   * @return {string}
   */
  static getBrowserTypeByAlias(e) {
    return Sd[e] || "";
  }
}
const W = /version\/(\d+(\.?_?\d+)+)/i, df = [
  /* GPTBot */
  {
    test: [/gptbot/i],
    describe(r) {
      const e = {
        name: "GPTBot"
      }, t = _.getFirstMatch(/gptbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* ChatGPT-User */
  {
    test: [/chatgpt-user/i],
    describe(r) {
      const e = {
        name: "ChatGPT-User"
      }, t = _.getFirstMatch(/chatgpt-user\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* OAI-SearchBot */
  {
    test: [/oai-searchbot/i],
    describe(r) {
      const e = {
        name: "OAI-SearchBot"
      }, t = _.getFirstMatch(/oai-searchbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* ClaudeBot */
  {
    test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
    describe(r) {
      const e = {
        name: "ClaudeBot"
      }, t = _.getFirstMatch(/(?:claudebot|claude-web|claude-user|claude-searchbot)\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Omgilibot */
  {
    test: [/omgilibot/i, /webzio-extended/i],
    describe(r) {
      const e = {
        name: "Omgilibot"
      }, t = _.getFirstMatch(/(?:omgilibot|webzio-extended)\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Diffbot */
  {
    test: [/diffbot/i],
    describe(r) {
      const e = {
        name: "Diffbot"
      }, t = _.getFirstMatch(/diffbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* PerplexityBot */
  {
    test: [/perplexitybot/i],
    describe(r) {
      const e = {
        name: "PerplexityBot"
      }, t = _.getFirstMatch(/perplexitybot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Perplexity-User */
  {
    test: [/perplexity-user/i],
    describe(r) {
      const e = {
        name: "Perplexity-User"
      }, t = _.getFirstMatch(/perplexity-user\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* YouBot */
  {
    test: [/youbot/i],
    describe(r) {
      const e = {
        name: "YouBot"
      }, t = _.getFirstMatch(/youbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Meta-WebIndexer */
  {
    test: [/meta-webindexer/i],
    describe(r) {
      const e = {
        name: "Meta-WebIndexer"
      }, t = _.getFirstMatch(/meta-webindexer\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Meta-ExternalAds */
  {
    test: [/meta-externalads/i],
    describe(r) {
      const e = {
        name: "Meta-ExternalAds"
      }, t = _.getFirstMatch(/meta-externalads\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Meta-ExternalAgent */
  {
    test: [/meta-externalagent/i],
    describe(r) {
      const e = {
        name: "Meta-ExternalAgent"
      }, t = _.getFirstMatch(/meta-externalagent\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Meta-ExternalFetcher */
  {
    test: [/meta-externalfetcher/i],
    describe(r) {
      const e = {
        name: "Meta-ExternalFetcher"
      }, t = _.getFirstMatch(/meta-externalfetcher\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Googlebot */
  {
    test: [/googlebot/i],
    describe(r) {
      const e = {
        name: "Googlebot"
      }, t = _.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Linespider */
  {
    test: [/linespider/i],
    describe(r) {
      const e = {
        name: "Linespider"
      }, t = _.getFirstMatch(/(?:linespider)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* AmazonBot */
  {
    test: [/amazonbot/i],
    describe(r) {
      const e = {
        name: "AmazonBot"
      }, t = _.getFirstMatch(/amazonbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* BingCrawler */
  {
    test: [/bingbot/i],
    describe(r) {
      const e = {
        name: "BingCrawler"
      }, t = _.getFirstMatch(/bingbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* BaiduSpider */
  {
    test: [/baiduspider/i],
    describe(r) {
      const e = {
        name: "BaiduSpider"
      }, t = _.getFirstMatch(/baiduspider\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* DuckDuckBot */
  {
    test: [/duckduckbot/i],
    describe(r) {
      const e = {
        name: "DuckDuckBot"
      }, t = _.getFirstMatch(/duckduckbot\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* InternetArchiveCrawler */
  {
    test: [/ia_archiver/i],
    describe(r) {
      const e = {
        name: "InternetArchiveCrawler"
      }, t = _.getFirstMatch(/ia_archiver\/(\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* FacebookExternalHit */
  {
    test: [/facebookexternalhit/i, /facebookcatalog/i],
    describe() {
      return {
        name: "FacebookExternalHit"
      };
    }
  },
  /* SlackBot */
  {
    test: [/slackbot/i, /slack-imgProxy/i],
    describe(r) {
      const e = {
        name: "SlackBot"
      }, t = _.getFirstMatch(/(?:slackbot|slack-imgproxy)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* YahooSlurp */
  {
    test: [/yahoo!?[\s/]*slurp/i],
    describe() {
      return {
        name: "YahooSlurp"
      };
    }
  },
  /* YandexBot */
  {
    test: [/yandexbot/i, /yandexmobilebot/i],
    describe() {
      return {
        name: "YandexBot"
      };
    }
  },
  /* PingdomBot */
  {
    test: [/pingdom/i],
    describe() {
      return {
        name: "PingdomBot"
      };
    }
  },
  /* Opera < 13.0 */
  {
    test: [/opera/i],
    describe(r) {
      const e = {
        name: "Opera"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* Opera > 13.0 */
  {
    test: [/opr\/|opios/i],
    describe(r) {
      const e = {
        name: "Opera"
      }, t = _.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/SamsungBrowser/i],
    describe(r) {
      const e = {
        name: "Samsung Internet for Android"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/Whale/i],
    describe(r) {
      const e = {
        name: "NAVER Whale Browser"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/PaleMoon/i],
    describe(r) {
      const e = {
        name: "Pale Moon"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:PaleMoon)[\s/](\d+(?:\.\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/MZBrowser/i],
    describe(r) {
      const e = {
        name: "MZ Browser"
      }, t = _.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/focus/i],
    describe(r) {
      const e = {
        name: "Focus"
      }, t = _.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/swing/i],
    describe(r) {
      const e = {
        name: "Swing"
      }, t = _.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/coast/i],
    describe(r) {
      const e = {
        name: "Opera Coast"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/opt\/\d+(?:.?_?\d+)+/i],
    describe(r) {
      const e = {
        name: "Opera Touch"
      }, t = _.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/yabrowser/i],
    describe(r) {
      const e = {
        name: "Yandex Browser"
      }, t = _.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/ucbrowser/i],
    describe(r) {
      const e = {
        name: "UC Browser"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/Maxthon|mxios/i],
    describe(r) {
      const e = {
        name: "Maxthon"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/epiphany/i],
    describe(r) {
      const e = {
        name: "Epiphany"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/puffin/i],
    describe(r) {
      const e = {
        name: "Puffin"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/sleipnir/i],
    describe(r) {
      const e = {
        name: "Sleipnir"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/k-meleon/i],
    describe(r) {
      const e = {
        name: "K-Meleon"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/micromessenger/i],
    describe(r) {
      const e = {
        name: "WeChat"
      }, t = _.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/qqbrowser/i],
    describe(r) {
      const e = {
        name: /qqbrowserlite/i.test(r) ? "QQ Browser Lite" : "QQ Browser"
      }, t = _.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/msie|trident/i],
    describe(r) {
      const e = {
        name: "Internet Explorer"
      }, t = _.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/\sedg\//i],
    describe(r) {
      const e = {
        name: "Microsoft Edge"
      }, t = _.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/edg([ea]|ios)/i],
    describe(r) {
      const e = {
        name: "Microsoft Edge"
      }, t = _.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/vivaldi/i],
    describe(r) {
      const e = {
        name: "Vivaldi"
      }, t = _.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/seamonkey/i],
    describe(r) {
      const e = {
        name: "SeaMonkey"
      }, t = _.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/sailfish/i],
    describe(r) {
      const e = {
        name: "Sailfish"
      }, t = _.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/silk/i],
    describe(r) {
      const e = {
        name: "Amazon Silk"
      }, t = _.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/phantom/i],
    describe(r) {
      const e = {
        name: "PhantomJS"
      }, t = _.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/slimerjs/i],
    describe(r) {
      const e = {
        name: "SlimerJS"
      }, t = _.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
      const e = {
        name: "BlackBerry"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
      const e = {
        name: "WebOS Browser"
      }, t = _.getFirstMatch(W, r) || _.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/bada/i],
    describe(r) {
      const e = {
        name: "Bada"
      }, t = _.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/tizen/i],
    describe(r) {
      const e = {
        name: "Tizen"
      }, t = _.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/qupzilla/i],
    describe(r) {
      const e = {
        name: "QupZilla"
      }, t = _.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/librewolf/i],
    describe(r) {
      const e = {
        name: "LibreWolf"
      }, t = _.getFirstMatch(/(?:librewolf)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/firefox|iceweasel|fxios/i],
    describe(r) {
      const e = {
        name: "Firefox"
      }, t = _.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/electron/i],
    describe(r) {
      const e = {
        name: "Electron"
      }, t = _.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/sogoumobilebrowser/i, /metasr/i, /se 2\.[x]/i],
    describe(r) {
      const e = {
        name: "Sogou Browser"
      }, t = _.getFirstMatch(/(?:sogoumobilebrowser)[\s/](\d+(\.?_?\d+)+)/i, r), n = _.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r), i = _.getFirstMatch(/se ([\d.]+)x/i, r), s = t || n || i;
      return s && (e.version = s), e;
    }
  },
  {
    test: [/MiuiBrowser/i],
    describe(r) {
      const e = {
        name: "Miui"
      }, t = _.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* DuckDuckGo Browser */
  {
    test(r) {
      return r.hasBrand("DuckDuckGo") ? !0 : r.test(/\sDdg\/[\d.]+$/i);
    },
    describe(r, e) {
      const t = {
        name: "DuckDuckGo"
      };
      if (e) {
        const i = e.getBrandVersion("DuckDuckGo");
        if (i)
          return t.version = i, t;
      }
      const n = _.getFirstMatch(/\sDdg\/([\d.]+)$/i, r);
      return n && (t.version = n), t;
    }
  },
  /* Brave Browser */
  {
    test(r) {
      return r.hasBrand("Brave");
    },
    describe(r, e) {
      const t = {
        name: "Brave"
      };
      if (e) {
        const n = e.getBrandVersion("Brave");
        if (n)
          return t.version = n, t;
      }
      return t;
    }
  },
  {
    test: [/chromium/i],
    describe(r) {
      const e = {
        name: "Chromium"
      }, t = _.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, r) || _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/chrome|crios|crmo/i],
    describe(r) {
      const e = {
        name: "Chrome"
      }, t = _.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  {
    test: [/GSA/i],
    describe(r) {
      const e = {
        name: "Google Search"
      }, t = _.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* Android Browser */
  {
    test(r) {
      const e = !r.test(/like android/i), t = r.test(/android/i);
      return e && t;
    },
    describe(r) {
      const e = {
        name: "Android Browser"
      }, t = _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* PlayStation 4 */
  {
    test: [/playstation 4/i],
    describe(r) {
      const e = {
        name: "PlayStation 4"
      }, t = _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Safari */
  {
    test: [/safari|applewebkit/i],
    describe(r) {
      const e = {
        name: "Safari"
      }, t = _.getFirstMatch(W, r);
      return t && (e.version = t), e;
    }
  },
  /* Something else */
  {
    test: [/.*/i],
    describe(r) {
      const e = /^(.*)\/(.*) /, t = /^(.*)\/(.*)[ \t]\((.*)/, i = r.search("\\(") !== -1 ? t : e;
      return {
        name: _.getFirstMatch(i, r),
        version: _.getSecondMatch(i, r)
      };
    }
  }
], hf = [
  /* Roku */
  {
    test: [/Roku\/DVP/],
    describe(r) {
      const e = _.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, r);
      return {
        name: ge.Roku,
        version: e
      };
    }
  },
  /* Windows Phone */
  {
    test: [/windows phone/i],
    describe(r) {
      const e = _.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, r);
      return {
        name: ge.WindowsPhone,
        version: e
      };
    }
  },
  /* Windows */
  {
    test: [/windows /i],
    describe(r) {
      const e = _.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, r), t = _.getWindowsVersionName(e);
      return {
        name: ge.Windows,
        version: e,
        versionName: t
      };
    }
  },
  /* Firefox on iPad */
  {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe(r) {
      const e = {
        name: ge.iOS
      }, t = _.getSecondMatch(/(Version\/)(\d[\d.]+)/, r);
      return t && (e.version = t), e;
    }
  },
  /* macOS */
  {
    test: [/macintosh/i],
    describe(r) {
      const e = _.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, r).replace(/[_\s]/g, "."), t = _.getMacOSVersionName(e), n = {
        name: ge.MacOS,
        version: e
      };
      return t && (n.versionName = t), n;
    }
  },
  /* iOS */
  {
    test: [/(ipod|iphone|ipad)/i],
    describe(r) {
      const e = _.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, r).replace(/[_\s]/g, ".");
      return {
        name: ge.iOS,
        version: e
      };
    }
  },
  /* HarmonyOS */
  {
    test: [/OpenHarmony/i],
    describe(r) {
      const e = _.getFirstMatch(/OpenHarmony\s+(\d+(\.\d+)*)/i, r);
      return {
        name: ge.HarmonyOS,
        version: e
      };
    }
  },
  /* Android */
  {
    test(r) {
      const e = !r.test(/like android/i), t = r.test(/android/i);
      return e && t;
    },
    describe(r) {
      const e = _.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, r), t = _.getAndroidVersionName(e), n = {
        name: ge.Android,
        version: e
      };
      return t && (n.versionName = t), n;
    }
  },
  /* WebOS */
  {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
      const e = _.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, r), t = {
        name: ge.WebOS
      };
      return e && e.length && (t.version = e), t;
    }
  },
  /* BlackBerry */
  {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
      const e = _.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, r) || _.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, r) || _.getFirstMatch(/\bbb(\d+)/i, r);
      return {
        name: ge.BlackBerry,
        version: e
      };
    }
  },
  /* Bada */
  {
    test: [/bada/i],
    describe(r) {
      const e = _.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, r);
      return {
        name: ge.Bada,
        version: e
      };
    }
  },
  /* Tizen */
  {
    test: [/tizen/i],
    describe(r) {
      const e = _.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, r);
      return {
        name: ge.Tizen,
        version: e
      };
    }
  },
  /* Linux */
  {
    test: [/linux/i],
    describe() {
      return {
        name: ge.Linux
      };
    }
  },
  /* Chrome OS */
  {
    test: [/CrOS/],
    describe() {
      return {
        name: ge.ChromeOS
      };
    }
  },
  /* Playstation 4 */
  {
    test: [/PlayStation 4/],
    describe(r) {
      const e = _.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, r);
      return {
        name: ge.PlayStation4,
        version: e
      };
    }
  }
], ff = [
  /* Googlebot */
  {
    test: [/googlebot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Google"
      };
    }
  },
  /* LineSpider */
  {
    test: [/linespider/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Line"
      };
    }
  },
  /* AmazonBot */
  {
    test: [/amazonbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Amazon"
      };
    }
  },
  /* GPTBot */
  {
    test: [/gptbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "OpenAI"
      };
    }
  },
  /* ChatGPT-User */
  {
    test: [/chatgpt-user/i],
    describe() {
      return {
        type: V.bot,
        vendor: "OpenAI"
      };
    }
  },
  /* OAI-SearchBot */
  {
    test: [/oai-searchbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "OpenAI"
      };
    }
  },
  /* Baidu */
  {
    test: [/baiduspider/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Baidu"
      };
    }
  },
  /* Bingbot */
  {
    test: [/bingbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Bing"
      };
    }
  },
  /* DuckDuckBot */
  {
    test: [/duckduckbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "DuckDuckGo"
      };
    }
  },
  /* ClaudeBot */
  {
    test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Anthropic"
      };
    }
  },
  /* Omgilibot */
  {
    test: [/omgilibot/i, /webzio-extended/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Webz.io"
      };
    }
  },
  /* Diffbot */
  {
    test: [/diffbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Diffbot"
      };
    }
  },
  /* PerplexityBot */
  {
    test: [/perplexitybot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Perplexity AI"
      };
    }
  },
  /* Perplexity-User */
  {
    test: [/perplexity-user/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Perplexity AI"
      };
    }
  },
  /* YouBot */
  {
    test: [/youbot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "You.com"
      };
    }
  },
  /* Internet Archive Crawler */
  {
    test: [/ia_archiver/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Internet Archive"
      };
    }
  },
  /* Meta-WebIndexer */
  {
    test: [/meta-webindexer/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Meta"
      };
    }
  },
  /* Meta-ExternalAds */
  {
    test: [/meta-externalads/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Meta"
      };
    }
  },
  /* Meta-ExternalAgent */
  {
    test: [/meta-externalagent/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Meta"
      };
    }
  },
  /* Meta-ExternalFetcher */
  {
    test: [/meta-externalfetcher/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Meta"
      };
    }
  },
  /* Meta Web Crawler */
  {
    test: [/facebookexternalhit/i, /facebookcatalog/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Meta"
      };
    }
  },
  /* SlackBot */
  {
    test: [/slackbot/i, /slack-imgProxy/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Slack"
      };
    }
  },
  /* Yahoo! Slurp */
  {
    test: [/yahoo/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Yahoo"
      };
    }
  },
  /* Yandex */
  {
    test: [/yandexbot/i, /yandexmobilebot/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Yandex"
      };
    }
  },
  /* Pingdom */
  {
    test: [/pingdom/i],
    describe() {
      return {
        type: V.bot,
        vendor: "Pingdom"
      };
    }
  },
  /* Huawei */
  {
    test: [/huawei/i],
    describe(r) {
      const e = _.getFirstMatch(/(can-l01)/i, r) && "Nova", t = {
        type: V.mobile,
        vendor: "Huawei"
      };
      return e && (t.model = e), t;
    }
  },
  /* Nexus Tablet */
  {
    test: [/nexus\s*(?:7|8|9|10).*/i],
    describe() {
      return {
        type: V.tablet,
        vendor: "Nexus"
      };
    }
  },
  /* iPad */
  {
    test: [/ipad/i],
    describe() {
      return {
        type: V.tablet,
        vendor: "Apple",
        model: "iPad"
      };
    }
  },
  /* Firefox on iPad */
  {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe() {
      return {
        type: V.tablet,
        vendor: "Apple",
        model: "iPad"
      };
    }
  },
  /* Amazon Kindle Fire */
  {
    test: [/kftt build/i],
    describe() {
      return {
        type: V.tablet,
        vendor: "Amazon",
        model: "Kindle Fire HD 7"
      };
    }
  },
  /* Another Amazon Tablet with Silk */
  {
    test: [/silk/i],
    describe() {
      return {
        type: V.tablet,
        vendor: "Amazon"
      };
    }
  },
  /* Tablet */
  {
    test: [/tablet(?! pc)/i],
    describe() {
      return {
        type: V.tablet
      };
    }
  },
  /* iPod/iPhone */
  {
    test(r) {
      const e = r.test(/ipod|iphone/i), t = r.test(/like (ipod|iphone)/i);
      return e && !t;
    },
    describe(r) {
      const e = _.getFirstMatch(/(ipod|iphone)/i, r);
      return {
        type: V.mobile,
        vendor: "Apple",
        model: e
      };
    }
  },
  /* Nexus Mobile */
  {
    test: [/nexus\s*[0-6].*/i, /galaxy nexus/i],
    describe() {
      return {
        type: V.mobile,
        vendor: "Nexus"
      };
    }
  },
  /* Nokia */
  {
    test: [/Nokia/i],
    describe(r) {
      const e = _.getFirstMatch(/Nokia\s+([0-9]+(\.[0-9]+)?)/i, r), t = {
        type: V.mobile,
        vendor: "Nokia"
      };
      return e && (t.model = e), t;
    }
  },
  /* Mobile */
  {
    test: [/[^-]mobi/i],
    describe() {
      return {
        type: V.mobile
      };
    }
  },
  /* BlackBerry */
  {
    test(r) {
      return r.getBrowserName(!0) === "blackberry";
    },
    describe() {
      return {
        type: V.mobile,
        vendor: "BlackBerry"
      };
    }
  },
  /* Bada */
  {
    test(r) {
      return r.getBrowserName(!0) === "bada";
    },
    describe() {
      return {
        type: V.mobile
      };
    }
  },
  /* Windows Phone */
  {
    test(r) {
      return r.getBrowserName() === "windows phone";
    },
    describe() {
      return {
        type: V.mobile,
        vendor: "Microsoft"
      };
    }
  },
  /* Android Tablet */
  {
    test(r) {
      const e = Number(String(r.getOSVersion()).split(".")[0]);
      return r.getOSName(!0) === "android" && e >= 3;
    },
    describe() {
      return {
        type: V.tablet
      };
    }
  },
  /* Android Mobile */
  {
    test(r) {
      return r.getOSName(!0) === "android";
    },
    describe() {
      return {
        type: V.mobile
      };
    }
  },
  /* Smart TV */
  {
    test: [/smart-?tv|smarttv/i],
    describe() {
      return {
        type: V.tv
      };
    }
  },
  /* NetCast (LG Smart TV) */
  {
    test: [/netcast/i],
    describe() {
      return {
        type: V.tv
      };
    }
  },
  /* desktop */
  {
    test(r) {
      return r.getOSName(!0) === "macos";
    },
    describe() {
      return {
        type: V.desktop,
        vendor: "Apple"
      };
    }
  },
  /* Windows */
  {
    test(r) {
      return r.getOSName(!0) === "windows";
    },
    describe() {
      return {
        type: V.desktop
      };
    }
  },
  /* Linux */
  {
    test(r) {
      return r.getOSName(!0) === "linux";
    },
    describe() {
      return {
        type: V.desktop
      };
    }
  },
  /* PlayStation 4 */
  {
    test(r) {
      return r.getOSName(!0) === "playstation 4";
    },
    describe() {
      return {
        type: V.tv
      };
    }
  },
  /* Roku */
  {
    test(r) {
      return r.getOSName(!0) === "roku";
    },
    describe() {
      return {
        type: V.tv
      };
    }
  }
], pf = [
  /* EdgeHTML */
  {
    test(r) {
      return r.getBrowserName(!0) === "microsoft edge";
    },
    describe(r) {
      if (/\sedg\//i.test(r))
        return {
          name: ut.Blink
        };
      const t = _.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, r);
      return {
        name: ut.EdgeHTML,
        version: t
      };
    }
  },
  /* Trident */
  {
    test: [/trident/i],
    describe(r) {
      const e = {
        name: ut.Trident
      }, t = _.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* Presto */
  {
    test(r) {
      return r.test(/presto/i);
    },
    describe(r) {
      const e = {
        name: ut.Presto
      }, t = _.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* Gecko */
  {
    test(r) {
      const e = r.test(/gecko/i), t = r.test(/like gecko/i);
      return e && !t;
    },
    describe(r) {
      const e = {
        name: ut.Gecko
      }, t = _.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  },
  /* Blink */
  {
    test: [/(apple)?webkit\/537\.36/i],
    describe() {
      return {
        name: ut.Blink
      };
    }
  },
  /* WebKit */
  {
    test: [/(apple)?webkit/i],
    describe(r) {
      const e = {
        name: ut.WebKit
      }, t = _.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, r);
      return t && (e.version = t), e;
    }
  }
];
class po {
  /**
   * Create instance of Parser
   *
   * @param {String} UA User-Agent string
   * @param {Boolean|ClientHints} [skipParsingOrHints=false] Either a boolean to skip parsing,
   * or a ClientHints object containing User-Agent Client Hints data
   * @param {ClientHints} [clientHints] User-Agent Client Hints data (navigator.userAgentData)
   *
   * @throw {Error} in case of empty UA String
   *
   * @constructor
   */
  constructor(e, t = !1, n = null) {
    if (e == null || e === "")
      throw new Error("UserAgent parameter can't be empty");
    this._ua = e;
    let i = !1;
    typeof t == "boolean" ? (i = t, this._hints = n) : t != null && typeof t == "object" ? this._hints = t : this._hints = null, this.parsedResult = {}, i !== !0 && this.parse();
  }
  /**
   * Get Client Hints data
   * @return {ClientHints|null}
   *
   * @public
   * @example
   * const parser = Bowser.getParser(UA, clientHints);
   * const hints = parser.getHints();
   * console.log(hints.platform); // 'Windows'
   * console.log(hints.mobile); // false
   */
  getHints() {
    return this._hints;
  }
  /**
   * Check if a brand exists in Client Hints brands array
   * @param {string} brandName The brand name to check for
   * @return {boolean}
   *
   * @public
   * @example
   * const parser = Bowser.getParser(UA, clientHints);
   * if (parser.hasBrand('Google Chrome')) {
   *   console.log('Chrome detected!');
   * }
   */
  hasBrand(e) {
    if (!this._hints || !Array.isArray(this._hints.brands))
      return !1;
    const t = e.toLowerCase();
    return this._hints.brands.some(
      (n) => n.brand && n.brand.toLowerCase() === t
    );
  }
  /**
   * Get brand version from Client Hints
   * @param {string} brandName The brand name to get version for
   * @return {string|undefined}
   *
   * @public
   * @example
   * const parser = Bowser.getParser(UA, clientHints);
   * const version = parser.getBrandVersion('Google Chrome');
   * console.log(version); // '131'
   */
  getBrandVersion(e) {
    if (!this._hints || !Array.isArray(this._hints.brands))
      return;
    const t = e.toLowerCase(), n = this._hints.brands.find(
      (i) => i.brand && i.brand.toLowerCase() === t
    );
    return n ? n.version : void 0;
  }
  /**
   * Get UserAgent string of current Parser instance
   * @return {String} User-Agent String of the current <Parser> object
   *
   * @public
   */
  getUA() {
    return this._ua;
  }
  /**
   * Test a UA string for a regexp
   * @param {RegExp} regex
   * @return {Boolean}
   */
  test(e) {
    return e.test(this._ua);
  }
  /**
   * Get parsed browser object
   * @return {Object}
   */
  parseBrowser() {
    this.parsedResult.browser = {};
    const e = _.find(df, (t) => {
      if (typeof t.test == "function")
        return t.test(this);
      if (Array.isArray(t.test))
        return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.browser = e.describe(this.getUA(), this)), this.parsedResult.browser;
  }
  /**
   * Get parsed browser object
   * @return {Object}
   *
   * @public
   */
  getBrowser() {
    return this.parsedResult.browser ? this.parsedResult.browser : this.parseBrowser();
  }
  /**
   * Get browser's name
   * @return {String} Browser's name or an empty string
   *
   * @public
   */
  getBrowserName(e) {
    return e ? String(this.getBrowser().name).toLowerCase() || "" : this.getBrowser().name || "";
  }
  /**
   * Get browser's version
   * @return {String} version of browser
   *
   * @public
   */
  getBrowserVersion() {
    return this.getBrowser().version;
  }
  /**
   * Get OS
   * @return {Object}
   *
   * @example
   * this.getOS();
   * {
   *   name: 'macOS',
   *   version: '10.11.12'
   * }
   */
  getOS() {
    return this.parsedResult.os ? this.parsedResult.os : this.parseOS();
  }
  /**
   * Parse OS and save it to this.parsedResult.os
   * @return {*|{}}
   */
  parseOS() {
    this.parsedResult.os = {};
    const e = _.find(hf, (t) => {
      if (typeof t.test == "function")
        return t.test(this);
      if (Array.isArray(t.test))
        return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.os = e.describe(this.getUA())), this.parsedResult.os;
  }
  /**
   * Get OS name
   * @param {Boolean} [toLowerCase] return lower-cased value
   * @return {String} name of the OS — macOS, Windows, Linux, etc.
   */
  getOSName(e) {
    const { name: t } = this.getOS();
    return e ? String(t).toLowerCase() || "" : t || "";
  }
  /**
   * Get OS version
   * @return {String} full version with dots ('10.11.12', '5.6', etc)
   */
  getOSVersion() {
    return this.getOS().version;
  }
  /**
   * Get parsed platform
   * @return {{}}
   */
  getPlatform() {
    return this.parsedResult.platform ? this.parsedResult.platform : this.parsePlatform();
  }
  /**
   * Get platform name
   * @param {Boolean} [toLowerCase=false]
   * @return {*}
   */
  getPlatformType(e = !1) {
    const { type: t } = this.getPlatform();
    return e ? String(t).toLowerCase() || "" : t || "";
  }
  /**
   * Get parsed platform
   * @return {{}}
   */
  parsePlatform() {
    this.parsedResult.platform = {};
    const e = _.find(ff, (t) => {
      if (typeof t.test == "function")
        return t.test(this);
      if (Array.isArray(t.test))
        return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.platform = e.describe(this.getUA())), this.parsedResult.platform;
  }
  /**
   * Get parsed engine
   * @return {{}}
   */
  getEngine() {
    return this.parsedResult.engine ? this.parsedResult.engine : this.parseEngine();
  }
  /**
   * Get engines's name
   * @return {String} Engines's name or an empty string
   *
   * @public
   */
  getEngineName(e) {
    return e ? String(this.getEngine().name).toLowerCase() || "" : this.getEngine().name || "";
  }
  /**
   * Get parsed platform
   * @return {{}}
   */
  parseEngine() {
    this.parsedResult.engine = {};
    const e = _.find(pf, (t) => {
      if (typeof t.test == "function")
        return t.test(this);
      if (Array.isArray(t.test))
        return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.engine = e.describe(this.getUA())), this.parsedResult.engine;
  }
  /**
   * Parse full information about the browser
   * @returns {Parser}
   */
  parse() {
    return this.parseBrowser(), this.parseOS(), this.parsePlatform(), this.parseEngine(), this;
  }
  /**
   * Get parsed result
   * @return {ParsedResult}
   */
  getResult() {
    return _.assign({}, this.parsedResult);
  }
  /**
   * Check if parsed browser matches certain conditions
   *
   * @param {Object} checkTree It's one or two layered object,
   * which can include a platform or an OS on the first layer
   * and should have browsers specs on the bottom-laying layer
   *
   * @returns {Boolean|undefined} Whether the browser satisfies the set conditions or not.
   * Returns `undefined` when the browser is no described in the checkTree object.
   *
   * @example
   * const browser = Bowser.getParser(window.navigator.userAgent);
   * if (browser.satisfies({chrome: '>118.01.1322' }))
   * // or with os
   * if (browser.satisfies({windows: { chrome: '>118.01.1322' } }))
   * // or with platforms
   * if (browser.satisfies({desktop: { chrome: '>118.01.1322' } }))
   */
  satisfies(e) {
    const t = {};
    let n = 0;
    const i = {};
    let s = 0;
    if (Object.keys(e).forEach((c) => {
      const u = e[c];
      typeof u == "string" ? (i[c] = u, s += 1) : typeof u == "object" && (t[c] = u, n += 1);
    }), n > 0) {
      const c = Object.keys(t), u = _.find(c, (f) => this.isOS(f));
      if (u) {
        const f = this.satisfies(t[u]);
        if (f !== void 0)
          return f;
      }
      const l = _.find(
        c,
        (f) => this.isPlatform(f)
      );
      if (l) {
        const f = this.satisfies(t[l]);
        if (f !== void 0)
          return f;
      }
    }
    if (s > 0) {
      const c = Object.keys(i), u = _.find(c, (l) => this.isBrowser(l, !0));
      if (u !== void 0)
        return this.compareVersion(i[u]);
    }
  }
  /**
   * Check if the browser name equals the passed string
   * @param {string} browserName The string to compare with the browser name
   * @param [includingAlias=false] The flag showing whether alias will be included into comparison
   * @returns {boolean}
   */
  isBrowser(e, t = !1) {
    const n = this.getBrowserName().toLowerCase();
    let i = e.toLowerCase();
    const s = _.getBrowserTypeByAlias(i);
    return t && s && (i = s.toLowerCase()), i === n;
  }
  compareVersion(e) {
    let t = [0], n = e, i = !1;
    const s = this.getBrowserVersion();
    if (typeof s == "string")
      return e[0] === ">" || e[0] === "<" ? (n = e.substr(1), e[1] === "=" ? (i = !0, n = e.substr(2)) : t = [], e[0] === ">" ? t.push(1) : t.push(-1)) : e[0] === "=" ? n = e.substr(1) : e[0] === "~" && (i = !0, n = e.substr(1)), t.indexOf(
        _.compareVersions(s, n, i)
      ) > -1;
  }
  /**
   * Check if the OS name equals the passed string
   * @param {string} osName The string to compare with the OS name
   * @returns {boolean}
   */
  isOS(e) {
    return this.getOSName(!0) === String(e).toLowerCase();
  }
  /**
   * Check if the platform type equals the passed string
   * @param {string} platformType The string to compare with the platform type
   * @returns {boolean}
   */
  isPlatform(e) {
    return this.getPlatformType(!0) === String(e).toLowerCase();
  }
  /**
   * Check if the engine name equals the passed string
   * @param {string} engineName The string to compare with the engine name
   * @returns {boolean}
   */
  isEngine(e) {
    return this.getEngineName(!0) === String(e).toLowerCase();
  }
  /**
   * Is anything? Check if the browser is called "anything",
   * the OS called "anything" or the platform called "anything"
   * @param {String} anything
   * @param [includingAlias=false] The flag showing whether alias will be included into comparison
   * @returns {Boolean}
   */
  is(e, t = !1) {
    return this.isBrowser(e, t) || this.isOS(e) || this.isPlatform(e);
  }
  /**
   * Check if any of the given values satisfies this.is(anything)
   * @param {String[]} anythings
   * @returns {Boolean}
   */
  some(e = []) {
    return e.some((t) => this.is(t));
  }
}
/*!
 * Bowser - a browser detector
 * https://github.com/bowser-js/bowser
 * MIT License | (c) Dustin Diaz 2012-2015
 * MIT License | (c) Denis Demchenko 2015-2019
 */
class gf {
  /**
   * Creates a {@link Parser} instance
   *
   * @param {String} UA UserAgent string
   * @param {Boolean|Object} [skipParsingOrHints=false] Either a boolean to skip parsing,
   * or a ClientHints object (navigator.userAgentData)
   * @param {Object} [clientHints] User-Agent Client Hints data (navigator.userAgentData)
   * @returns {Parser}
   * @throws {Error} when UA is not a String
   *
   * @example
   * const parser = Bowser.getParser(window.navigator.userAgent);
   * const result = parser.getResult();
   *
   * @example
   * // With User-Agent Client Hints
   * const parser = Bowser.getParser(
   *   window.navigator.userAgent,
   *   window.navigator.userAgentData
   * );
   */
  static getParser(e, t = !1, n = null) {
    if (typeof e != "string")
      throw new Error("UserAgent should be a string");
    return new po(e, t, n);
  }
  /**
   * Creates a {@link Parser} instance and runs {@link Parser.getResult} immediately
   *
   * @param {String} UA UserAgent string
   * @param {Object} [clientHints] User-Agent Client Hints data (navigator.userAgentData)
   * @return {ParsedResult}
   *
   * @example
   * const result = Bowser.parse(window.navigator.userAgent);
   *
   * @example
   * // With User-Agent Client Hints
   * const result = Bowser.parse(
   *   window.navigator.userAgent,
   *   window.navigator.userAgentData
   * );
   */
  static parse(e, t = null) {
    return new po(e, t).getResult();
  }
  static get BROWSER_MAP() {
    return Sd;
  }
  static get ENGINE_MAP() {
    return ut;
  }
  static get OS_MAP() {
    return ge;
  }
  static get PLATFORMS_MAP() {
    return V;
  }
}
function Ie(r, e) {
  return Object.keys(e).forEach(function(t) {
    t === "default" || t === "__esModule" || Object.prototype.hasOwnProperty.call(r, t) || Object.defineProperty(r, t, {
      enumerable: !0,
      get: function() {
        return e[t];
      }
    });
  }), r;
}
function re(r, e, t, n) {
  Object.defineProperty(r, e, { get: t, set: n, enumerable: !0, configurable: !0 });
}
function mf(r) {
  return r && r.__esModule ? r.default : r;
}
var Lt = {}, kd = {};
re(kd, "A11ySnapshotStreamer", () => Od);
const vf = 10, Qr = 200, Cn = 50, bf = 100, yf = 20, go = 2e3, Jt = /* @__PURE__ */ new WeakMap(), mo = typeof WeakRef > "u" ? void 0 : WeakRef, Wr = /* @__PURE__ */ new Map();
let _f = 0;
function Yr(r) {
  const e = Jt.get(r);
  if (e) return e;
  const t = `e${++_f}`;
  return Jt.set(r, t), Wr.set(t, mo ? new mo(r) : r), t;
}
function wf(r) {
  const e = Wr.get(r);
  if (!e) return null;
  const t = "deref" in e ? e.deref() : e;
  return !t || !t.isConnected ? (Wr.delete(r), null) : t;
}
function Sf(r) {
  return Jt.get(r) ?? null;
}
const Md = /* @__PURE__ */ new Set([
  "script",
  "style",
  "link",
  "meta",
  "noscript",
  "template"
]);
function kf(r) {
  if (Md.has(r.tagName.toLowerCase()) || r.getAttribute("aria-hidden") === "true" || r.hasAttribute("data-a11y-exclude") || r.hidden) return !0;
  if (r instanceof HTMLElement && r.offsetParent === null && r.tagName !== "BODY") {
    const e = window.getComputedStyle(r);
    if (e.display === "none" || e.visibility === "hidden") return !0;
  }
  return !1;
}
const Mf = /* @__PURE__ */ new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "textbox",
  "combobox",
  "switch",
  "menuitem",
  "tab"
]), Cd = /* @__PURE__ */ new Set([
  ...Mf,
  "heading",
  "img"
]);
function Cf(r) {
  return !!(r.hasAttribute("aria-label") || r.hasAttribute("aria-labelledby") || (r.textContent ?? "").trim().length > 0);
}
function Ef(r) {
  const e = r.getAttribute("role");
  if (e) return e;
  const t = r.tagName.toLowerCase();
  switch (t) {
    case "main":
    case "nav":
    case "header":
    case "aside":
    case "footer":
      return t;
    case "article":
    case "section":
      return Cf(r) ? "region" : null;
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "a":
      return r.hasAttribute("href") ? "link" : null;
    case "button":
      return "button";
    case "input": {
      const n = r.type;
      return n === "checkbox" ? "checkbox" : n === "radio" ? "radio" : n === "submit" || n === "button" || n === "reset" ? "button" : n === "hidden" ? null : "textbox";
    }
    case "select":
      return "combobox";
    case "textarea":
      return "textbox";
    case "label":
      return null;
    // consumed by its associated input
    case "img":
      return r.getAttribute("alt") !== null ? "img" : null;
    case "p":
      return "paragraph";
    case "ul":
    case "ol":
      return "list";
    case "li":
      return "listitem";
    case "table":
      return "table";
    case "tr":
      return "row";
    case "th":
      return "columnheader";
    case "td":
      return "cell";
    default:
      return r.hasAttribute("aria-label") || r.hasAttribute("aria-labelledby") || r.hasAttribute("tabindex") ? "generic" : null;
  }
}
function Ed(r) {
  return r.replace(/\s+/g, " ").trim();
}
function Ye(r, e = bf) {
  const t = Ed(r);
  return t.length <= e ? t : t.slice(0, e - 1) + "…";
}
function Af(r) {
  const e = r.getAttribute("aria-labelledby");
  if (!e) return;
  const t = [];
  for (const i of e.split(/\s+/)) {
    if (!i) continue;
    const s = r.ownerDocument.getElementById(i);
    s && t.push(Sa(s));
  }
  return t.filter(Boolean).join(" ") || void 0;
}
function Sa(r) {
  const e = [];
  for (let t = 0; t < r.childNodes.length; t++) {
    const n = r.childNodes[t];
    if (n.nodeType === 3) {
      const i = (n.textContent ?? "").trim();
      i && e.push(i);
    } else if (n.nodeType === 1) {
      const i = n;
      if (Md.has(i.tagName.toLowerCase()) || i.getAttribute("aria-hidden") === "true") continue;
      const s = Sa(i);
      s && e.push(s);
    }
  }
  return e.join(" ").replace(/\s+/g, " ").trim();
}
function Tf(r, e) {
  const t = r.getAttribute("aria-label");
  if (t) return Ye(t);
  const n = Af(r);
  if (n) return Ye(n);
  const i = r.tagName.toLowerCase();
  if (i === "input" || i === "textarea" || i === "select") {
    const s = r.getAttribute("id");
    if (s) {
      const u = r.ownerDocument.getElementsByTagName("label");
      for (let l = 0; l < u.length; l++)
        if (u[l].htmlFor === s && u[l].textContent) return Ye(u[l].textContent ?? "");
    }
    const a = r.closest("label");
    if (a?.textContent) return Ye(a.textContent);
    const c = r.getAttribute("placeholder");
    return c ? Ye(c) : void 0;
  }
  if (i === "img") {
    const s = r.getAttribute("alt");
    return s ? Ye(s) : void 0;
  }
  if (Cd.has(e) || e === "paragraph") {
    const s = Sa(r);
    return s ? Ye(s) : void 0;
  }
}
function Of(r) {
  if (r instanceof HTMLInputElement)
    return r.type === "password" || r.type === "checkbox" || r.type === "radio" || r.type === "hidden" ? void 0 : r.value || void 0;
  if (r instanceof HTMLTextAreaElement) return r.value || void 0;
  if (r instanceof HTMLSelectElement) {
    const t = r.selectedOptions[0]?.text?.trim();
    return t || r.value || void 0;
  }
}
function Pf(r) {
  const e = [];
  return r.ownerDocument.activeElement === r && e.push("focused"), r.getAttribute("aria-expanded") === "true" && e.push("expanded"), r.getAttribute("aria-selected") === "true" && e.push("selected"), (r.hasAttribute("disabled") || r.getAttribute("aria-disabled") === "true") && e.push("disabled"), r.getAttribute("aria-checked") === "true" && e.push("checked"), r instanceof HTMLInputElement && (r.type === "checkbox" || r.type === "radio") && r.checked && (e.includes("checked") || e.push("checked")), e;
}
function xf(r) {
  const e = r.getBoundingClientRect();
  if (e.width === 0 && e.height === 0) return !0;
  const t = window.innerWidth || document.documentElement.clientWidth, n = window.innerHeight || document.documentElement.clientHeight;
  return e.bottom <= 0 || e.top >= n || e.right <= 0 || e.left >= t;
}
function If(r, e) {
  if (e !== "heading") return;
  const n = r.tagName.toLowerCase().match(/^h([1-6])$/);
  if (n) return parseInt(n[1], 10);
  const i = r.getAttribute("aria-level");
  if (i) {
    const s = parseInt(i, 10);
    if (!Number.isNaN(s)) return s;
  }
}
function vo(r, e) {
  const t = r.getAttribute(e);
  if (!t) return;
  const n = parseInt(t, 10);
  if (!(Number.isNaN(n) || n < 0))
    return n;
}
function Lf(r, e, t, n, i = !1) {
  if (kf(r)) return [];
  if (t.count >= Qr) return [];
  if (e > vf)
    return t.count++, [
      {
        ref: Yr(r),
        role: "ellipsis",
        name: "<truncated: max depth>"
      }
    ];
  const s = Ef(r);
  if (s === null)
    return Js(r, e, t, n, {
      skipTextNodes: i
    });
  t.count++;
  const a = {
    ref: Yr(r),
    role: s
  }, c = Tf(r, s);
  c && (a.name = c);
  const u = Of(r);
  u !== void 0 && (a.value = u);
  const l = Pf(r);
  n.trackViewport && xf(r) && l.push("offscreen"), l.length && (a.state = l);
  const f = If(r, s);
  f !== void 0 && (a.level = f);
  const p = vo(r, "aria-colcount");
  p !== void 0 && (a.colcount = p);
  const y = vo(r, "aria-rowcount");
  if (y !== void 0 && (a.rowcount = y), Cd.has(s)) {
    if (r instanceof HTMLSelectElement) {
      const M = Rf(r, t, a.ref);
      M.length > 0 && (a.children = M);
    }
  } else {
    const M = s === "paragraph", b = Js(r, e + 1, t, n, {
      skipTextNodes: M
    });
    if (b.length > 0)
      if (b.length > Cn) {
        const v = b.slice(0, Cn);
        v.push({
          ref: `${a.ref}.more`,
          role: "ellipsis",
          name: `${b.length - Cn} more`
        }), a.children = v;
      } else a.children = b;
  }
  return [
    a
  ];
}
function Rf(r, e, t) {
  const n = [], i = r.options;
  let s = 0;
  for (let a = 0; a < i.length && !(e.count >= Qr); a++) {
    const c = i[a];
    if (c.hidden || c.getAttribute("aria-hidden") === "true") continue;
    if (s >= yf) {
      e.count++, n.push({
        ref: `${t}.more`,
        role: "ellipsis",
        name: `${i.length - s} more`
      });
      break;
    }
    e.count++, s++;
    const u = (c.text || c.value || "").trim(), l = {
      ref: Yr(c),
      role: "option",
      name: Ye(u)
    }, f = [];
    c.selected && f.push("selected"), c.disabled && f.push("disabled"), f.length && (l.state = f), n.push(l);
  }
  return n;
}
function Js(r, e, t, n, i = {}) {
  const s = [];
  for (let a = 0; a < r.childNodes.length; a++) {
    const c = r.childNodes[a];
    if (c.nodeType === 3) {
      if (i.skipTextNodes) continue;
      const u = Ed(c.textContent ?? "");
      if (u) {
        if (t.count >= Qr) break;
        t.count++, s.push({
          ref: "",
          role: "text",
          name: Ye(u)
        });
      }
    } else if (c.nodeType === 1) {
      const u = Lf(c, e, t, n, i.skipTextNodes);
      for (const l of u) s.push(l);
      if (t.count >= Qr) break;
    }
  }
  return s;
}
function jf(r) {
  let e = r;
  for (; e; ) {
    if (e.getAttribute("aria-hidden") === "true" || e.hasAttribute("data-a11y-exclude")) return null;
    if (Jt.has(e)) return e;
    e = e.parentElement;
  }
  return null;
}
function bo(r) {
  return r.length <= go ? r : r.slice(0, go - 1) + "…";
}
function Ad() {
  if (typeof document > "u") return null;
  const r = document.activeElement;
  if (r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement) {
    const c = r.selectionStart, u = r.selectionEnd;
    if (c !== null && u !== null && c !== u) {
      const l = Jt.get(r);
      if (!l) return null;
      const f = r.value.slice(c, u);
      return f ? {
        ref: l,
        text: bo(f),
        start_offset: c,
        end_offset: u
      } : null;
    }
  }
  const e = document.getSelection();
  if (!e || e.rangeCount === 0 || e.isCollapsed) return null;
  const t = e.toString();
  if (!t) return null;
  let i = e.getRangeAt(0).commonAncestorContainer;
  for (; i && i.nodeType !== 1; ) i = i.parentNode;
  const s = jf(i);
  if (!s) return null;
  const a = Jt.get(s);
  return a ? {
    ref: a,
    text: bo(t)
  } : null;
}
function Td(r, e = {}) {
  const t = r ?? (typeof document < "u" ? document.body : null);
  if (!t) return {
    root: {
      ref: "e0",
      role: "generic"
    },
    captured_at: Date.now()
  };
  const n = {
    trackViewport: e.trackViewport ?? !0
  }, s = Js(t, 0, {
    count: 0
  }, n), a = Ad();
  return {
    root: {
      ref: Yr(t),
      role: "generic",
      ...s.length > 0 ? {
        children: s
      } : {}
    },
    captured_at: Date.now(),
    ...a ? {
      selection: a
    } : {}
  };
}
class Od {
  constructor(e, t = {}) {
    this.running = !1, this.emitSnapshot = e, this.debounceMs = t.debounceMs ?? 300, this.trackViewport = t.trackViewport ?? !0, this.logSnapshots = t.logSnapshots ?? !1;
  }
  /**
   * Begin streaming. Safe to call multiple times; subsequent calls
   * are no-ops until `stop()` runs.
   */
  start() {
    this.running || typeof document > "u" || (this.running = !0, this.schedule(), this.observer = new MutationObserver(() => this.schedule()), this.observer.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributes: !0,
      attributeFilter: [
        "role",
        "aria-label",
        "aria-labelledby",
        "aria-expanded",
        "aria-selected",
        "aria-checked",
        "aria-disabled",
        "aria-level",
        "aria-hidden",
        "aria-colcount",
        "aria-rowcount",
        "data-a11y-exclude",
        "disabled",
        "hidden",
        "tabindex",
        "href"
      ]
    }), this.focusHandler = () => this.schedule(), document.addEventListener("focusin", this.focusHandler), document.addEventListener("focusout", this.focusHandler), this.scrollEndHandler = () => this.schedule(), window.addEventListener("scrollend", this.scrollEndHandler, {
      capture: !0
    }), this.resizeHandler = () => this.schedule(), window.addEventListener("resize", this.resizeHandler), this.visibilityHandler = () => {
      document.visibilityState === "visible" && this.schedule();
    }, document.addEventListener("visibilitychange", this.visibilityHandler), this.selectionHandler = () => this.schedule(), document.addEventListener("selectionchange", this.selectionHandler), this.formHandler = () => this.schedule(), document.addEventListener("input", this.formHandler, {
      capture: !0
    }), document.addEventListener("change", this.formHandler, {
      capture: !0
    }));
  }
  /** Stop streaming. Safe to call before `start()` or multiple times. */
  stop() {
    this.running && (this.running = !1, this.timer !== void 0 && (clearTimeout(this.timer), this.timer = void 0), this.observer && (this.observer.disconnect(), this.observer = void 0), typeof document < "u" && (this.focusHandler && (document.removeEventListener("focusin", this.focusHandler), document.removeEventListener("focusout", this.focusHandler)), this.visibilityHandler && document.removeEventListener("visibilitychange", this.visibilityHandler), this.selectionHandler && document.removeEventListener("selectionchange", this.selectionHandler), this.formHandler && (document.removeEventListener("input", this.formHandler, {
      capture: !0
    }), document.removeEventListener("change", this.formHandler, {
      capture: !0
    }))), typeof window < "u" && (this.scrollEndHandler && window.removeEventListener("scrollend", this.scrollEndHandler, {
      capture: !0
    }), this.resizeHandler && window.removeEventListener("resize", this.resizeHandler)), this.focusHandler = void 0, this.scrollEndHandler = void 0, this.resizeHandler = void 0, this.visibilityHandler = void 0, this.selectionHandler = void 0, this.formHandler = void 0);
  }
  schedule() {
    this.running && (this.timer !== void 0 && clearTimeout(this.timer), this.timer = setTimeout(() => this.emit(), this.debounceMs));
  }
  emit() {
    if (this.timer = void 0, !!this.running)
      try {
        const e = Td(void 0, {
          trackViewport: this.trackViewport
        });
        if (this.emitSnapshot(e), this.logSnapshots) {
          const t = Pd(e.root), n = Math.round(JSON.stringify(e).length / 4);
          console.groupCollapsed(`[A11ySnapshotStreamer] emit: ${t} nodes, ~${n} tokens`), console.log("snapshot:", e), console.groupEnd();
        }
      } catch {
      }
  }
}
function Pd(r) {
  let e = 1;
  const t = r.children;
  if (t) for (const n of t) e += Pd(n);
  return e;
}
var xd = {};
re(xd, "PipecatClient", () => ke);
var Ht = {};
Ht = JSON.parse('{"name":"@pipecat-ai/client-js","version":"1.13.0","license":"BSD-2-Clause","main":"dist/index.js","module":"dist/index.module.js","types":"dist/index.d.ts","source":"index.ts","repository":{"type":"git","url":"git+https://github.com/pipecat-ai/pipecat-client-web.git"},"exports":{".":{"types":"./dist/index.d.ts","import":"./dist/index.module.js","require":"./dist/index.js"}},"files":["dist","package.json","README.md"],"scripts":{"build":"jest --silent --passWithNoTests && parcel build --no-cache","dev":"parcel watch","lint":"eslint . --report-unused-disable-directives --max-warnings 0","test":"jest"},"jest":{"preset":"ts-jest","testEnvironment":"jsdom","setupFilesAfterEnv":["<rootDir>/tests/jest.setup.ts"]},"devDependencies":{"@jest/globals":"^29.7.0","@types/clone-deep":"^4.0.4","@types/jest":"^29.5.12","eslint":"^9.11.1","eslint-config-prettier":"^9.1.0","eslint-plugin-simple-import-sort":"^12.1.1","jest":"^29.7.0","jest-environment-jsdom":"^30.0.2","ts-jest":"^29.2.5","whatwg-fetch":"^3.6.20"},"dependencies":{"@types/events":"^3.0.3","bowser":"^2.11.0","clone-deep":"^4.0.1","events":"^3.3.0","typed-emitter":"^2.1.0","uuid":"^11.1.1"}}');
var it = {};
re(it, "findElementByRef", () => wf);
re(it, "findRefForElement", () => Sf);
re(it, "serializeSelection", () => Ad);
re(it, "snapshotDocument", () => Td);
var Id = {};
re(Id, "TransportStateEnum", () => Hs);
var Hs;
(function(r) {
  r.DISCONNECTED = "disconnected", r.INITIALIZING = "initializing", r.INITIALIZED = "initialized", r.AUTHENTICATING = "authenticating", r.AUTHENTICATED = "authenticated", r.CONNECTING = "connecting", r.CONNECTED = "connected", r.READY = "ready", r.DISCONNECTING = "disconnecting", r.ERROR = "error";
})(Hs || (Hs = {}));
var qe = {};
re(qe, "RTVIError", () => Se);
re(qe, "ConnectionTimeoutError", () => Df);
re(qe, "StartBotError", () => Ld);
re(qe, "TransportStartError", () => Ks);
re(qe, "InvalidTransportParamsError", () => Bf);
re(qe, "BotNotReadyError", () => Rd);
re(qe, "BotAlreadyStartedError", () => jd);
re(qe, "UnsupportedFeatureError", () => Ut);
re(qe, "MessageTooLargeError", () => ka);
re(qe, "DeviceError", () => Xe);
class Se extends Error {
  constructor(e, t) {
    super(e), this.status = t;
  }
}
class Df extends Se {
  constructor(e) {
    super(e ?? "Bot did not enter ready state within the specified timeout period.");
  }
}
class Ld extends Se {
  constructor(e, t) {
    super(e ?? "Failed to connect / invalid auth bundle from base url", t ?? 500), this.error = "invalid-request-error";
  }
}
class Ks extends Se {
  constructor(e) {
    super(e ?? "Unable to connect to transport");
  }
}
class Bf extends Se {
  constructor(e) {
    super(e ?? "Invalid transport connection parameters");
  }
}
class Rd extends Se {
  constructor(e) {
    super(e ?? "Attempt to call action on transport when not in 'ready' state.");
  }
}
class jd extends Se {
  constructor(e) {
    super(e ?? "Pipecat client has already been started. Please call disconnect() before starting again.");
  }
}
class Ut extends Se {
  constructor(e, t, n) {
    let i = `${e} not supported${n ? `: ${n}` : ""}`;
    t && (i = `${t} does not support ${e}${n ? `: ${n}` : ""}`), super(i), this.feature = e;
  }
}
class ka extends Se {
  constructor(e) {
    super(e ?? "Message size exceeds the maximum allowed limit for transport.");
  }
}
class Xe extends Se {
  constructor(e, t, n, i) {
    super(n ?? `Device error for ${e.join(", ")}: ${t}`), this.devices = e, this.type = t, this.details = i;
  }
}
var Dd = {};
re(Dd, "RTVIEvent", () => F);
var F;
(function(r) {
  r.Connected = "connected", r.Disconnected = "disconnected", r.TransportStateChanged = "transportStateChanged", r.BotStarted = "botStarted", r.BotConnected = "botConnected", r.BotReady = "botReady", r.BotDisconnected = "botDisconnected", r.Error = "error", r.ServerMessage = "serverMessage", r.ServerResponse = "serverResponse", r.MessageError = "messageError", r.UICommand = "uiCommand", r.UIJobGroup = "uiJobGroup", r.Metrics = "metrics", r.BotStartedSpeaking = "botStartedSpeaking", r.BotStoppedSpeaking = "botStoppedSpeaking", r.UserStartedSpeaking = "userStartedSpeaking", r.UserStoppedSpeaking = "userStoppedSpeaking", r.UserMuteStarted = "userMuteStarted", r.UserMuteStopped = "userMuteStopped", r.UserTranscript = "userTranscript", r.BotOutput = "botOutput", r.BotTranscript = "botTranscript", r.UserLlmText = "userLlmText", r.BotLlmText = "botLlmText", r.BotLlmStarted = "botLlmStarted", r.BotLlmStopped = "botLlmStopped", r.LLMFunctionCall = "llmFunctionCall", r.LLMFunctionCallStarted = "llmFunctionCallStarted", r.LLMFunctionCallInProgress = "llmFunctionCallInProgress", r.LLMFunctionCallStopped = "llmFunctionCallStopped", r.BotLlmSearchResponse = "botLlmSearchResponse", r.BotTtsText = "botTtsText", r.BotTtsStarted = "botTtsStarted", r.BotTtsStopped = "botTtsStopped", r.ParticipantConnected = "participantConnected", r.ParticipantLeft = "participantLeft", r.TrackStarted = "trackStarted", r.TrackStopped = "trackStopped", r.ScreenTrackStarted = "screenTrackStarted", r.ScreenTrackStopped = "screenTrackStopped", r.ScreenShareError = "screenShareError", r.LocalAudioLevel = "localAudioLevel", r.RemoteAudioLevel = "remoteAudioLevel", r.AvailableCamsUpdated = "availableCamsUpdated", r.AvailableMicsUpdated = "availableMicsUpdated", r.AvailableSpeakersUpdated = "availableSpeakersUpdated", r.CamUpdated = "camUpdated", r.MicUpdated = "micUpdated", r.SpeakerUpdated = "speakerUpdated", r.DeviceError = "deviceError", r.MediaStateUpdated = "mediaStateUpdated", r.UnsupportedFeature = "unsupportedFeature";
})(F || (F = {}));
var Rt = {};
re(Rt, "RTVI_PROTOCOL_VERSION", () => Ma);
re(Rt, "RTVI_MESSAGE_LABEL", () => Bd);
re(Rt, "RTVIMessageType", () => q);
re(Rt, "AggregationType", () => Qs);
re(Rt, "setAboutClient", () => Fd);
re(Rt, "RTVIMessage", () => oe);
const Ma = "2.1.0", Bd = "rtvi-ai";
var q;
(function(r) {
  r.CLIENT_READY = "client-ready", r.DISCONNECT_BOT = "disconnect-bot", r.CLIENT_MESSAGE = "client-message", r.SEND_TEXT = "send-text", r.DTMF = "dtmf", r.UI_EVENT = "ui-event", r.UI_SNAPSHOT = "ui-snapshot", r.UI_CANCEL_JOB_GROUP = "ui-cancel-job-group", r.APPEND_TO_CONTEXT = "append-to-context", r.BOT_READY = "bot-ready", r.ERROR = "error", r.METRICS = "metrics", r.SERVER_MESSAGE = "server-message", r.SERVER_RESPONSE = "server-response", r.ERROR_RESPONSE = "error-response", r.APPEND_TO_CONTEXT_RESULT = "append-to-context-result", r.UI_COMMAND = "ui-command", r.UI_JOB_GROUP = "ui-job-group", r.USER_STARTED_SPEAKING = "user-started-speaking", r.USER_STOPPED_SPEAKING = "user-stopped-speaking", r.BOT_STARTED_SPEAKING = "bot-started-speaking", r.BOT_STOPPED_SPEAKING = "bot-stopped-speaking", r.USER_MUTE_STARTED = "user-mute-started", r.USER_MUTE_STOPPED = "user-mute-stopped", r.USER_TRANSCRIPTION = "user-transcription", r.BOT_OUTPUT = "bot-output", r.BOT_TRANSCRIPTION = "bot-transcription", r.USER_LLM_TEXT = "user-llm-text", r.BOT_LLM_TEXT = "bot-llm-text", r.BOT_LLM_STARTED = "bot-llm-started", r.BOT_LLM_STOPPED = "bot-llm-stopped", r.LLM_FUNCTION_CALL = "llm-function-call", r.LLM_FUNCTION_CALL_STARTED = "llm-function-call-started", r.LLM_FUNCTION_CALL_IN_PROGRESS = "llm-function-call-in-progress", r.LLM_FUNCTION_CALL_STOPPED = "llm-function-call-stopped", r.LLM_FUNCTION_CALL_RESULT = "llm-function-call-result", r.BOT_LLM_SEARCH_RESPONSE = "bot-llm-search-response", r.BOT_TTS_TEXT = "bot-tts-text", r.BOT_TTS_STARTED = "bot-tts-started", r.BOT_TTS_STOPPED = "bot-tts-stopped";
})(q || (q = {}));
var Qs;
(function(r) {
  r.WORD = "word", r.SENTENCE = "sentence";
})(Qs || (Qs = {}));
let sr;
function Fd(r) {
  sr ? sr = {
    ...sr,
    ...r
  } : sr = r;
}
class oe {
  constructor(e, t, n) {
    this.label = Bd, this.type = e, this.data = t, this.id = n || uf().slice(0, 8);
  }
  // Outbound message types
  static clientReady() {
    return new oe(q.CLIENT_READY, {
      version: Ma,
      about: sr || {
        library: Ht.name,
        library_version: Ht.version
      }
    });
  }
  static disconnectBot() {
    return new oe(q.DISCONNECT_BOT, {});
  }
  static error(e, t = !1) {
    return new oe(q.ERROR, {
      message: e,
      fatal: t
    });
  }
}
var Ff = {};
Ie(it, Id);
Ie(it, qe);
Ie(it, Dd);
Ie(it, Rt);
Ie(it, Ff);
function mt(r, e, t) {
  const n = t.value;
  return t.value = function(...i) {
    if (this.state === "ready") return n.apply(this, i);
    throw new Rd(`Attempt to call ${e.toString()} when transport not in ready state. Await connect() first.`);
  }, t;
}
function Ca(r, e, t) {
  const n = t.value, i = [
    "authenticating",
    "connecting",
    "connected",
    "ready"
  ];
  return t.value = function(...s) {
    if (i.includes(this.state)) throw new jd(`Attempt to call ${e.toString()} when client already started. Please call disconnect() before starting again.`);
    return n.apply(this, s);
  }, t;
}
var Nd = {};
re(Nd, "MessageDispatcher", () => $d);
var Ea = {};
re(Ea, "LogLevel", () => ht);
re(Ea, "logger", () => R);
var ht;
(function(r) {
  r[r.NONE = 0] = "NONE", r[r.ERROR = 1] = "ERROR", r[r.WARN = 2] = "WARN", r[r.INFO = 3] = "INFO", r[r.DEBUG = 4] = "DEBUG";
})(ht || (ht = {}));
class Vt {
  constructor() {
    this.level = ht.DEBUG;
  }
  static getInstance() {
    return Vt.instance || (Vt.instance = new Vt()), Vt.instance;
  }
  setLevel(e) {
    this.level = e;
  }
  debug(...e) {
    this.level >= ht.DEBUG && console.debug(...e);
  }
  info(...e) {
    this.level >= ht.INFO && console.info(...e);
  }
  warn(...e) {
    this.level >= ht.WARN && console.warn(...e);
  }
  error(...e) {
    this.level >= ht.ERROR && console.error(...e);
  }
}
const R = Vt.getInstance();
class $d {
  constructor(e) {
    this._queue = new Array(), this._gcInterval = void 0, this._queue = [], this._sendMethod = e;
  }
  disconnect() {
    this.clearQueue(), clearInterval(this._gcInterval), this._gcInterval = void 0;
  }
  dispatch(e, t = q.CLIENT_MESSAGE, n = 1e4) {
    this._gcInterval || (this._gcInterval = setInterval(() => {
      this._gc();
    }, 2e3));
    const i = new oe(t, e), s = new Promise((a, c) => {
      this._queue.push({
        message: i,
        timestamp: Date.now(),
        timeout: n,
        resolve: a,
        reject: c
      });
    });
    R.debug("[MessageDispatcher] dispatch", i);
    try {
      this._sendMethod(i);
    } catch (a) {
      return R.error("[MessageDispatcher] Error sending message", a), Promise.reject(a);
    }
    return this._gc(), s;
  }
  clearQueue() {
    this._queue = [];
  }
  _resolveReject(e, t = !0) {
    const n = this._queue.find((i) => i.message.id === e.id);
    return n && (t ? (R.debug("[MessageDispatcher] Resolve", e), n.resolve(e)) : (R.debug("[MessageDispatcher] Reject", e), n.reject(e)), this._queue = this._queue.filter((i) => i.message.id !== e.id), R.debug("[MessageDispatcher] Queue", this._queue)), e;
  }
  resolve(e) {
    return this._resolveReject(e, !0);
  }
  reject(e) {
    return this._resolveReject(e, !1);
  }
  _gc() {
    const e = [];
    this._queue = this._queue.filter((t) => {
      const n = Date.now() - t.timestamp < t.timeout;
      return n || e.push(t), n;
    }), e.forEach((t) => {
      t.message.type === q.CLIENT_MESSAGE && t.reject(new oe(q.ERROR_RESPONSE, {
        error: "Timed out waiting for response",
        msgType: t.message.data.t,
        data: t.message.data.d,
        fatal: !1
      }));
    }), R.debug("[MessageDispatcher] GC", this._queue);
  }
}
var Aa = {};
re(Aa, "isAPIRequest", () => Ta);
re(Aa, "makeRequest", () => Oa);
function Ta(r) {
  if (typeof r == "object" && r !== null && Object.keys(r).includes("endpoint")) {
    const e = r.endpoint;
    return typeof e == "string" || e instanceof URL || typeof Request < "u" && e instanceof Request;
  }
  return !1;
}
async function Oa(r, e) {
  e || (e = new AbortController());
  let t;
  return new Promise((n, i) => {
    (async () => {
      r.timeout && (t = setTimeout(async () => {
        e.abort(), i(new Error("Timed out"));
      }, r.timeout));
      let s;
      typeof Request < "u" && r.endpoint instanceof Request ? (s = new Request(r.endpoint, {
        signal: e.signal
      }), r.requestData && R.warn("[Pipecat Client] requestData in APIRequest is ignored when endpoint is a Request object"), r.headers && R.warn("[Pipecat Client] headers in APIRequest is ignored when endpoint is a Request object")) : s = new Request(r.endpoint, {
        method: "POST",
        mode: "cors",
        headers: new Headers({
          "Content-Type": "application/json",
          ...Object.fromEntries((r.headers ?? new Headers()).entries())
        }),
        body: JSON.stringify(r.requestData),
        signal: e.signal
      }), R.debug(`[Pipecat Client] Fetching from ${s.url}`), fetch(s).then((a) => {
        if (R.debug(`[Pipecat Client] Received response from ${s.url}`, a), !a.ok) {
          i(a);
          return;
        }
        return a.json();
      }).then((a) => {
        n(a);
      }).catch((a) => {
        R.error(`[Pipecat Client] Error fetching: ${a}`), i(a);
      }).finally(() => {
        t && clearTimeout(t);
      });
    })();
  });
}
var Pa = {};
re(Pa, "Transport", () => qd);
re(Pa, "TransportWrapper", () => Ud);
class qd {
  constructor() {
    this._state = "disconnected", this._maxMessageSize = 65536;
  }
  /**
   * Establishes a connection with the remote server. This is the main entry
   * point for the transport to start sending and receiving media and messages.
   * This is called from PipecatClient.connect() and should not be called directly.
   * @param connectParams - This type will ultimately be defned by the transport
   * implementation. It is used to pass connection parameters to the transport.
   */
  connect(e) {
    this._abortController = new AbortController();
    let t = e;
    try {
      t = this._validateConnectionParams(e);
    } catch (n) {
      throw new Se(`Invalid connection params: ${n.message}. Please check your connection params and try again.`);
    }
    return this._connect(t);
  }
  /**
   * Allow the transports to determine how the bot was started.
   */
  get startBotParams() {
    return this._startBotParams;
  }
  /**
   * Set the parameters used to start the bot.
   * @param startBotParams
   */
  set startBotParams(e) {
    if (typeof Request < "u" && e.endpoint instanceof Request) {
      this._startBotParams = {
        ...e,
        endpoint: e.endpoint.clone()
      };
      return;
    }
    this._startBotParams = e;
  }
  /**
   * Disconnects the transport from the remote server. This is called from
   * PipecatClient.disconnect() and should not be called directly.
   */
  disconnect() {
    return this._abortController && this._abortController.abort(), this._disconnect();
  }
  /**
   * Maximum size, in bytes, of a single message that this transport will attempt
   * to send. Callers should ensure that any outbound {@link RTVIMessage} payloads
   * do not exceed this limit to avoid transport or server errors.
   */
  get maxMessageSize() {
    return this._maxMessageSize;
  }
}
class Ud {
  constructor(e) {
    this._transport = e, this._proxy = new Proxy(this._transport, {
      get: (t, n, i) => {
        if (typeof t[n] == "function") {
          let s;
          switch (String(n)) {
            // Disable methods that modify the lifecycle of the call. These operations
            // should be performed via the Pipecat client in order to keep state in sync.
            case "initialize":
              s = "Direct calls to initialize() are disabled and used internally by the PipecatClient.";
              break;
            case "initDevices":
              s = "Direct calls to initDevices() are disabled. Please use the PipecatClient.initDevices() wrapper or let PipecatClient.connect() call it for you.";
              break;
            case "sendReadyMessage":
              s = "Direct calls to sendReadyMessage() are disabled and used internally by the PipecatClient.";
              break;
            case "connect":
              s = "Direct calls to connect() are disabled. Please use the PipecatClient.connect() wrapper.";
              break;
            case "disconnect":
              s = "Direct calls to disconnect() are disabled. Please use the PipecatClient.disconnect() wrapper.";
              break;
          }
          return s ? () => {
            throw new Error(s);
          } : (...a) => t[n](...a);
        }
        return Reflect.get(t, n, i);
      }
    });
  }
  get proxy() {
    return this._proxy;
  }
}
var xa = {};
re(xa, "learnAboutClient", () => Vd);
re(xa, "messageSizeWithinLimit", () => Ia);
function Vd() {
  let r = {
    library: Ht.name,
    library_version: Ht.version,
    platform_details: {}
  }, e = null;
  if (window?.navigator?.userAgent) try {
    e = gf.parse(window.navigator.userAgent);
  } catch {
  }
  return e?.browser?.name && (r.platform_details.browser = e.browser.name), e?.browser?.name === "Safari" && !e.browser.version ? r.platform_details.browser_version = "Web View" : e?.browser?.version && (r.platform_details.browser_version = e.browser.version), e?.platform?.type && (r.platform_details.platform_type = e.platform.type), e?.engine?.name && (r.platform_details.engine = e.engine.name), e?.os && (r.platform = e.os.name, r.platform_version = e.os.version), r;
}
function Ia(r, e) {
  return ((i) => {
    const s = JSON.stringify(i);
    return new TextEncoder().encode(s).length;
  })(r) <= e;
}
var Ue = function(r, e, t, n) {
  var i = arguments.length, s = i < 3 ? e : n === null ? n = Object.getOwnPropertyDescriptor(e, t) : n, a;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") s = Reflect.decorate(r, e, t, n);
  else for (var c = r.length - 1; c >= 0; c--) (a = r[c]) && (s = (i < 3 ? a(s) : i > 3 ? a(e, t, s) : a(e, t)) || s);
  return i > 3 && s && Object.defineProperty(e, t, s), s;
};
function Nf(r) {
  switch (r) {
    case "in-use":
      return "already-in-use";
    case "permissions":
      return "blocked";
    case "not-found":
      return "not-found";
    case "undefined-mediadevices":
      return "not-supported";
    case "constraints":
      return "invalid-constraints";
    case "unknown":
    default:
      return "unknown";
  }
}
class $f extends nf {
}
class ke extends $f {
  constructor(e) {
    super(), this._functionCallCallbacks = {}, this._botTranscriptionWarned = !1, this._llmFunctionCallWarned = !1, this._botVersion = [
      0,
      0,
      0
    ], this._mediaState = {
      mic: {
        state: "uninitialized"
      },
      cam: {
        state: "uninitialized"
      }
    }, Fd(Vd()), this._transport = e.transport, this._transportWrapper = new Ud(this._transport), this._disconnectOnBotDisconnect = e.disconnectOnBotDisconnect ?? !0;
    const t = {
      ...e.callbacks,
      onMessageError: (n) => {
        e?.callbacks?.onMessageError?.(n), this.emit(F.MessageError, n);
      },
      onError: (n) => {
        e?.callbacks?.onError?.(n);
        try {
          this.emit(F.Error, n);
        } catch (s) {
          s instanceof Error && s.message.includes("Unhandled error") ? e?.callbacks?.onError || R.debug("No onError callback registered to handle error", n) : R.debug("Could not emit error", n, s);
        }
        n.data?.fatal && (R.error("Fatal error reported. Disconnecting..."), this.disconnect());
      },
      onConnected: () => {
        e?.callbacks?.onConnected?.(), this.emit(F.Connected);
      },
      onDisconnected: () => {
        e?.callbacks?.onDisconnected?.(), this.emit(F.Disconnected);
      },
      onTransportStateChanged: (n) => {
        e?.callbacks?.onTransportStateChanged?.(n), this.emit(F.TransportStateChanged, n), n === "ready" && this._flushPendingUISnapshot();
      },
      onParticipantJoined: (n) => {
        e?.callbacks?.onParticipantJoined?.(n), this.emit(F.ParticipantConnected, n);
      },
      onParticipantLeft: (n) => {
        e?.callbacks?.onParticipantLeft?.(n), this.emit(F.ParticipantLeft, n);
      },
      onTrackStarted: (n, i) => {
        e?.callbacks?.onTrackStarted?.(n, i), this.emit(F.TrackStarted, n, i);
      },
      onTrackStopped: (n, i) => {
        e?.callbacks?.onTrackStopped?.(n, i), this.emit(F.TrackStopped, n, i);
      },
      onScreenTrackStarted: (n, i) => {
        e?.callbacks?.onScreenTrackStarted?.(n, i), this.emit(F.ScreenTrackStarted, n, i);
      },
      onScreenTrackStopped: (n, i) => {
        e?.callbacks?.onScreenTrackStopped?.(n, i), this.emit(F.ScreenTrackStopped, n, i);
      },
      onScreenShareError: (n) => {
        e?.callbacks?.onScreenShareError?.(n), this.emit(F.ScreenShareError, n);
      },
      onUnsupportedFeature: (n) => {
        e?.callbacks?.onUnsupportedFeature?.(n), this.emit(F.UnsupportedFeature, n);
      },
      onAvailableCamsUpdated: (n) => {
        e?.callbacks?.onAvailableCamsUpdated?.(n), this.emit(F.AvailableCamsUpdated, n);
      },
      onAvailableMicsUpdated: (n) => {
        e?.callbacks?.onAvailableMicsUpdated?.(n), this.emit(F.AvailableMicsUpdated, n);
      },
      onAvailableSpeakersUpdated: (n) => {
        e?.callbacks?.onAvailableSpeakersUpdated?.(n), this.emit(F.AvailableSpeakersUpdated, n);
      },
      onCamUpdated: (n) => {
        n?.deviceId && this._markDeviceGranted("cam"), e?.callbacks?.onCamUpdated?.(n), this.emit(F.CamUpdated, n);
      },
      onMicUpdated: (n) => {
        n?.deviceId && this._markDeviceGranted("mic"), e?.callbacks?.onMicUpdated?.(n), this.emit(F.MicUpdated, n);
      },
      onSpeakerUpdated: (n) => {
        e?.callbacks?.onSpeakerUpdated?.(n), this.emit(F.SpeakerUpdated, n);
      },
      onDeviceError: (n) => {
        this._classifyAndApplyDeviceError(n), e?.callbacks?.onDeviceError?.(n), this.emit(F.DeviceError, n);
      },
      onBotStarted: (n) => {
        e?.callbacks?.onBotStarted?.(n), this.emit(F.BotStarted, n);
      },
      onBotConnected: (n) => {
        e?.callbacks?.onBotConnected?.(n), this.emit(F.BotConnected, n);
      },
      onBotReady: (n) => {
        e?.callbacks?.onBotReady?.(n), this.emit(F.BotReady, n);
      },
      onBotDisconnected: (n) => {
        e?.callbacks?.onBotDisconnected?.(n), this.emit(F.BotDisconnected, n), this._disconnectOnBotDisconnect && (R.info("Bot disconnected. Disconnecting client..."), this.disconnect());
      },
      onUserStartedSpeaking: () => {
        e?.callbacks?.onUserStartedSpeaking?.(), this.emit(F.UserStartedSpeaking);
      },
      onUserStoppedSpeaking: () => {
        e?.callbacks?.onUserStoppedSpeaking?.(), this.emit(F.UserStoppedSpeaking);
      },
      onBotStartedSpeaking: () => {
        e?.callbacks?.onBotStartedSpeaking?.(), this.emit(F.BotStartedSpeaking);
      },
      onBotStoppedSpeaking: () => {
        e?.callbacks?.onBotStoppedSpeaking?.(), this.emit(F.BotStoppedSpeaking);
      },
      onRemoteAudioLevel: (n, i) => {
        e?.callbacks?.onRemoteAudioLevel?.(n, i), this.emit(F.RemoteAudioLevel, n, i);
      },
      onLocalAudioLevel: (n) => {
        e?.callbacks?.onLocalAudioLevel?.(n), this.emit(F.LocalAudioLevel, n);
      },
      onUserMuteStarted: () => {
        e?.callbacks?.onUserMuteStarted?.(), this.emit(F.UserMuteStarted);
      },
      onUserMuteStopped: () => {
        e?.callbacks?.onUserMuteStopped?.(), this.emit(F.UserMuteStopped);
      },
      onUserTranscript: (n) => {
        e?.callbacks?.onUserTranscript?.(n), this.emit(F.UserTranscript, n);
      },
      onBotOutput: (n) => {
        e?.callbacks?.onBotOutput?.(n), this.emit(F.BotOutput, n);
      },
      onBotTranscript: (n) => {
        (!!e?.callbacks?.onBotTranscript || this.listenerCount(F.BotTranscript) > 0) && !this._botTranscriptionWarned && (R.warn("[Pipecat Client] Bot transcription is deprecated. Please use the onBotOutput instead."), this._botTranscriptionWarned = !0), e?.callbacks?.onBotTranscript?.(n), this.emit(F.BotTranscript, n);
      },
      onBotLlmText: (n) => {
        e?.callbacks?.onBotLlmText?.(n), this.emit(F.BotLlmText, n);
      },
      onBotLlmStarted: () => {
        e?.callbacks?.onBotLlmStarted?.(), this.emit(F.BotLlmStarted);
      },
      onBotLlmStopped: () => {
        e?.callbacks?.onBotLlmStopped?.(), this.emit(F.BotLlmStopped);
      },
      onBotTtsText: (n) => {
        e?.callbacks?.onBotTtsText?.(n), this.emit(F.BotTtsText, n);
      },
      onBotTtsStarted: () => {
        e?.callbacks?.onBotTtsStarted?.(), this.emit(F.BotTtsStarted);
      },
      onBotTtsStopped: () => {
        e?.callbacks?.onBotTtsStopped?.(), this.emit(F.BotTtsStopped);
      }
    };
    this._options = {
      ...e,
      callbacks: t,
      enableMic: e.enableMic ?? !0,
      enableCam: e.enableCam ?? !1,
      enableScreenShare: e.enableScreenShare ?? !1
    }, this._initialize(), R.debug("[Pipecat Client] Initialized", this.version);
  }
  setLogLevel(e) {
    R.setLevel(e);
  }
  // ------ Transport methods
  /**
   * Initialize local media devices.
   *
   * Drives MediaState transitions: both mic and cam move to 'initializing' on
   * entry. On success, each device moves to 'granted' only if the transport
   * reports it as acquired (via onMicUpdated / onCamUpdated with a real
   * deviceId); otherwise that device falls back to 'uninitialized'. On
   * failure the in-flight DeviceError (if any) classifies the affected
   * device(s) per-device; anything still at 'initializing' falls back to
   * 'unknown'. The original error is always re-thrown.
   *
   * Calling this again after a failure is the recovery path — a second call
   * re-enters 'initializing' and reclassifies. There is no separate
   * retryDevices() method.
   */
  async initDevices() {
    R.debug("[Pipecat Client] Initializing devices..."), this._setMediaState({
      mic: {
        state: "initializing"
      },
      cam: {
        state: "initializing"
      }
    });
    try {
      await this._transport.initDevices(), this._resolveLingeringInitializing({
        state: "uninitialized"
      });
    } catch (e) {
      throw this._resolveLingeringInitializing({
        state: "error",
        reason: "unknown"
      }), e;
    } finally {
      await this._enrichFromPermissionsAPI();
    }
  }
  /**
   * After the transport's initDevices() resolves or rejects, any device
   * still at 'initializing' didn't receive a 'granted' upgrade from
   * onMicUpdated / onCamUpdated and wasn't classified by a DeviceError
   * (which would have moved it to 'error'). Apply the supplied fallback so
   * it doesn't linger.
   *
   * On success, fallback is 'uninitialized' (the transport simply didn't
   * speak to that device — e.g. daily-js skipping cam under
   * startVideoOff: true). On failure, fallback is an 'unknown' error (we
   * know something went wrong but can't pin it on this device).
   */
  _resolveLingeringInitializing(e) {
    const t = {};
    for (const n of [
      "mic",
      "cam"
    ]) this._mediaState[n].state === "initializing" && (t[n] = e);
    Object.keys(t).length > 0 && this._setMediaState(t);
  }
  /**
   * Upgrade a device to 'granted'. Called from the wrapped onMicUpdated /
   * onCamUpdated when the transport reports an actual selected device.
   * Allowed from any state — a previously errored device (e.g. 'not-found'
   * because the cam was unplugged) can recover when the device reappears
   * on a subsequent initDevices() call.
   */
  _markDeviceGranted(e) {
    this._mediaState[e].state !== "granted" && this._setMediaState({
      [e]: {
        state: "granted"
      }
    });
  }
  /**
   * startBot() is a method that initiates the bot by posting to a specified endpoint
   * that optionally returns connection parameters for establishing a transport session.
   * @param startBotParams
   * @returns Promise that resolves to TransportConnectionParams or unknown
   */
  async startBot(e) {
    this.needsInit() && await this.initDevices(), this._transport.state = "authenticating", this._transport.startBotParams = e, this._abortController = new AbortController();
    let t;
    try {
      t = await Oa(e, this._abortController);
    } catch (n) {
      let i = "An unknown error occurred while starting the bot.", s;
      if (n instanceof Response) {
        const a = await n.json();
        i = a.info ?? a.detail ?? n.statusText, s = n.status;
      } else n instanceof Error && (i = n.message);
      throw this._options.callbacks?.onError?.(new oe(q.ERROR_RESPONSE, {
        message: i,
        fatal: !0
      })), new Ld(i, s);
    }
    return this._transport.state = "authenticated", this._options.callbacks?.onBotStarted?.(t), t;
  }
  /**
   * The `connect` function establishes a transport session and awaits a
   * bot-ready signal, handling various connection states and errors.
   * @param {TransportConnectionParams} [connectParams] -
   * The `connectParams` parameter in the `connect` method should be of type
   * `TransportConnectionParams`. This parameter is passed to the transport
   * for establishing a transport session.
   * NOTE: `connectParams` as type `ConnectionEndpoint` IS NOW DEPRECATED. If you
   * want to authenticate and connect to a bot in one step, use
   * `startBotAndConnect()` instead.
   * @returns The `connect` method returns a Promise that resolves to an unknown value.
   */
  async connect(e) {
    return e && Ta(e) ? (R.warn("Calling connect with an API endpoint is deprecated. Use startBotAndConnect() instead."), this.startBotAndConnect(e)) : new Promise((t, n) => {
      (async () => {
        this._connectResolve = t, this.needsInit() && await this.initDevices();
        try {
          await this._transport.connect(e), await this._transport.sendReadyMessage();
        } catch (i) {
          this.disconnect(), n(i);
          return;
        }
      })();
    });
  }
  async startBotAndConnect(e) {
    const t = await this.startBot(e);
    return this.connect(t);
  }
  /**
   * Disconnect the voice client from the transport
   * Reset / reinitialize transport and abort any pending requests
   */
  async disconnect() {
    this.stopUISnapshotStream(), this._botVersion = [
      0,
      0,
      0
    ], await this._transport.disconnect(), this._messageDispatcher.disconnect();
  }
  /**
   * The _initialize function performs internal set up of the transport and
   * message dispatcher.
   */
  _initialize() {
    this._transport.initialize(this._options, this.handleMessage.bind(this)), this._messageDispatcher = new $d(this._sendMessage.bind(this));
  }
  /**
   * Apply a partial MediaState patch and emit MediaStateUpdated if the patch
   * actually changes anything. The callback always receives a fresh object.
   */
  _setMediaState(e) {
    const t = {
      ...this._mediaState,
      ...e
    };
    this._statusEquals(t.mic, this._mediaState.mic) && this._statusEquals(t.cam, this._mediaState.cam) || (this._mediaState = t, this._options.callbacks?.onMediaStateChanged?.(this.mediaState), this.emit(F.MediaStateUpdated, this.mediaState));
  }
  /**
   * Structural equality for two DeviceStatus values. Distinct error
   * statuses (different `reason` or `details`) are treated as distinct so a
   * status update fires when the underlying error changes, even if `state`
   * was already 'error'.
   */
  _statusEquals(e, t) {
    return e.state !== t.state ? !1 : e.state === "error" && t.state === "error" ? e.reason === t.reason && e.details === t.details : !0;
  }
  /**
   * Map a DeviceError onto a partial MediaState patch and apply it. Mirrors
   * daily-react's camera-error classifier — affected devices flip to an
   * `'error'` status carrying the reason and the original error payload.
   */
  _classifyAndApplyDeviceError(e) {
    const t = {
      state: "error",
      reason: Nf(e.type),
      details: e.details
    }, n = {};
    e.devices.includes("mic") && (n.mic = t), e.devices.includes("cam") && (n.cam = t), Object.keys(n).length !== 0 && this._setMediaState(n);
  }
  /**
   * Permissions API enrichment, run AFTER the transport's initDevices()
   * resolves. By that point the prompt (if any) has been dismissed, and the
   * Permissions API's `denied` answer is authoritative — it overrides any
   * under-reported DeviceError.
   *
   * Concrete case worth flagging: on a page where the user previously
   * blocked permissions, daily-js's `camera-error` only names whichever
   * device the transport tried first when re-initializing — even though
   * both are blocked. Re-querying here catches the missing one. Worth a
   * follow-up daily-js ticket.
   *
   * Silently no-ops where the API is unavailable (Safari, some mobile
   * browsers) or throws on an unsupported descriptor.
   */
  async _enrichFromPermissionsAPI() {
    const e = globalThis.navigator?.permissions;
    if (!e?.query) return;
    const t = e.query.bind(e), n = {};
    await Promise.all([
      "mic",
      "cam"
    ].map(async (i) => {
      try {
        (await t({
          name: i === "mic" ? "microphone" : "camera"
        })).state === "denied" && (n[i] = {
          state: "error",
          reason: "blocked"
        });
      } catch {
      }
    })), Object.keys(n).length > 0 && this._setMediaState(n);
  }
  /**
   * Internal wrapper around the transport's sendMessage method
   */
  _sendMessage(e) {
    if (!Ia(e, this._transport.maxMessageSize)) {
      const t = `Message data too large. Max size is ${this._transport.maxMessageSize}`;
      throw this._options.callbacks?.onError?.(oe.error(t, !1)), new ka(t);
    }
    try {
      this._transport.sendMessage(e);
    } catch (t) {
      throw t instanceof Error ? this._options.callbacks?.onError?.(oe.error(t.message, !1)) : this._options.callbacks?.onError?.(oe.error("Unknown error sending message", !1)), t;
    }
  }
  /**
   * Get the current state of the transport
   */
  get connected() {
    return [
      "connected",
      "ready"
    ].includes(this._transport.state);
  }
  get transport() {
    return this._transportWrapper.proxy;
  }
  get state() {
    return this._transport.state;
  }
  /**
   * Per-device device state (mic, cam). Independent of transport state.
   *
   * Updated by initDevices() and DeviceError events. Returns a snapshot — to
   * track changes, subscribe to RTVIEvent.MediaStateUpdated or pass an
   * onMediaStateChanged callback in the client constructor.
   */
  get mediaState() {
    return {
      mic: {
        ...this._mediaState.mic
      },
      cam: {
        ...this._mediaState.cam
      }
    };
  }
  /**
   * Whether initDevices() still has work to do. Returns true if any device
   * the caller opted into (enableMic / enableCam) is still 'uninitialized'.
   * Devices the caller opted out of are not considered — they stay
   * 'uninitialized' by design and must not gate the implicit init.
   *
   * Used internally by connect() / startBot() to decide whether to drive an
   * implicit initDevices(); exposed publicly so consumers (e.g. step 3's
   * useMediaState hook) can branch on the same logic.
   */
  needsInit() {
    return this._options.enableMic !== !1 && this._mediaState.mic.state === "uninitialized" || this._options.enableCam !== !1 && this._mediaState.cam.state === "uninitialized";
  }
  get version() {
    return (/* @__PURE__ */ mf(Ht)).version;
  }
  // ------ Device methods
  async getAllMics() {
    return await this._transport.getAllMics();
  }
  async getAllCams() {
    return await this._transport.getAllCams();
  }
  async getAllSpeakers() {
    return await this._transport.getAllSpeakers();
  }
  get selectedMic() {
    return this._transport.selectedMic;
  }
  get selectedCam() {
    try {
      return this._transport.selectedCam;
    } catch (e) {
      if (e instanceof Ut)
        return this._options.callbacks?.onUnsupportedFeature?.(e), {};
      throw e;
    }
  }
  get selectedSpeaker() {
    return this._transport.selectedSpeaker;
  }
  updateMic(e) {
    this._transport.updateMic(e);
  }
  updateCam(e) {
    this._transport.updateCam(e);
  }
  updateSpeaker(e) {
    this._transport.updateSpeaker(e);
  }
  enableMic(e) {
    this._transport.enableMic(e);
  }
  get isMicEnabled() {
    return this._transport.isMicEnabled;
  }
  enableCam(e) {
    try {
      this._transport.enableCam(e);
    } catch (t) {
      if (t instanceof Ut) this._options.callbacks?.onUnsupportedFeature?.(t);
      else throw t;
    }
  }
  get isCamEnabled() {
    return this._transport.isCamEnabled;
  }
  tracks() {
    return this._transport.tracks();
  }
  enableScreenShare(e) {
    try {
      return this._transport.enableScreenShare(e);
    } catch (t) {
      if (t instanceof Ut) this._options.callbacks?.onUnsupportedFeature?.(t);
      else throw t;
    }
  }
  get isSharingScreen() {
    return this._transport.isSharingScreen;
  }
  // ------ Messages
  /**
   * Directly send a message to the bot via the transport.
   * Do not await a response.
   * @param msgType - a string representing the message type
   * @param data - a dictionary of data to send with the message
   */
  sendClientMessage(e, t) {
    this._sendMessage(new oe(q.CLIENT_MESSAGE, {
      t: e,
      d: t
    }));
  }
  /**
   * Send a named UI event to the server as a first-class RTVI
   * `ui-event` message.
   *
   * @param event - App-defined event.
   * @param payload - App-defined payload. Optional.
   */
  sendUIEvent(e, t) {
    const n = {
      event: e,
      payload: t
    };
    this._sendMessage(new oe(q.UI_EVENT, n));
  }
  /**
   * Send DTMF tones to the server as first-class RTVI `dtmf` messages.
   *
   * Accepts a single key or a sequence of keys (e.g. "123#"). Bots on
   * RTVI protocol 2.1.0+ receive the keys as a single message; 2.0.x
   * bots receive one legacy `{button}` message per key. Bots older than
   * 2.0.0 don't support DTMF at all.
   *
   * @param dtmf - The DTMF key(s) to send (0-9, *, or #).
   */
  sendDTMF(e) {
    if (!/^[0-9*#]+$/.test(e)) throw new Se(`Invalid DTMF sequence "${e}". Only 0-9, * and # are allowed.`);
    if (this._botVersion[0] < 2) throw new Ut("DTMF", "bot", "requires RTVI protocol 2.0.0+");
    const t = [
      ...e
    ];
    if (this._botVersion[0] === 2 && this._botVersion[1] < 1) for (const n of t) this._sendMessage(new oe(q.DTMF, {
      button: n
    }));
    else {
      const n = {
        buttons: t
      };
      this._sendMessage(new oe(q.DTMF, n));
    }
  }
  /**
   * Start streaming UI snapshots to the server as
   * first-class `ui-snapshot` RTVI messages.
   *
   * Calling this again replaces any existing managed streamer with
   * the new options.
   */
  startUISnapshotStream(e = {}) {
    this.stopUISnapshotStream(), this._uiSnapshotStreamer = new Od((t) => {
      if (this.state !== "ready") {
        this._pendingUISnapshot = t;
        return;
      }
      this._sendUISnapshot(t);
    }, e), this._uiSnapshotStreamer.start();
  }
  /**
   * Stop the managed UI snapshot stream, if one is active.
   */
  stopUISnapshotStream() {
    this._uiSnapshotStreamer?.stop(), this._uiSnapshotStreamer = void 0, this._pendingUISnapshot = void 0;
  }
  _sendUISnapshot(e) {
    const t = {
      tree: e
    };
    this._sendMessage(new oe(q.UI_SNAPSHOT, t));
  }
  _flushPendingUISnapshot() {
    if (!this._pendingUISnapshot || this.state !== "ready") return;
    const e = this._pendingUISnapshot;
    this._pendingUISnapshot = void 0, this._sendUISnapshot(e);
  }
  /**
   * Ask the server to cancel an in-flight UI job group.
   *
   * @param jobId - Shared job identifier of the group to cancel.
   * @param reason - Optional human-readable reason logged on the server.
   */
  cancelUIJobGroup(e, t) {
    const n = {
      job_id: e
    };
    t !== void 0 && (n.reason = t), this._sendMessage(new oe(q.UI_CANCEL_JOB_GROUP, n));
  }
  /**
   * Directly send a message to the bot via the transport.
   * Wait for and return the response.
   * @param msgType - a string representing the message type
   * @param data - a dictionary of data to send with the message
   * @param timeout - optional timeout in milliseconds for the response
   */
  async sendClientRequest(e, t, n) {
    const i = {
      t: e,
      d: t
    };
    return (await this._messageDispatcher.dispatch(i, q.CLIENT_MESSAGE, n)).data.d;
  }
  registerFunctionCallHandler(e, t) {
    this._functionCallCallbacks[e] = t;
  }
  unregisterFunctionCallHandler(e) {
    delete this._functionCallCallbacks[e];
  }
  unregisterAllFunctionCallHandlers() {
    this._functionCallCallbacks = {};
  }
  async appendToContext(e) {
    return R.warn("appendToContext() is deprecated. Use sendText() instead."), await this._sendMessage(new oe(q.APPEND_TO_CONTEXT, {
      role: e.role,
      content: e.content,
      run_immediately: e.run_immediately
    })), !0;
  }
  async sendText(e, t = {}) {
    await this._sendMessage(new oe(q.SEND_TEXT, {
      content: e,
      options: t
    }));
  }
  /**
   * Disconnects the bot, but keeps the session alive
   */
  disconnectBot() {
    this._sendMessage(new oe(q.DISCONNECT_BOT, {}));
  }
  handleMessage(e) {
    switch (R.debug("[RTVI Message]", e), e.type) {
      case q.BOT_READY: {
        const t = e.data, n = t.version ? t.version.split(".").map(Number) : [
          0,
          0,
          0
        ];
        this._botVersion = n, R.debug(`[Pipecat Client] Bot is ready. Version: ${t.version}`), n[0] < 2 && R.warn(`[Pipecat Client] Bot protocol version ${t.version} is older than this client (${Ma}). Compatibility issues may occur.`), this._connectResolve?.(e.data), this._options.callbacks?.onBotReady?.(e.data);
        break;
      }
      case q.ERROR:
        this._options.callbacks?.onError?.(e);
        break;
      case q.SERVER_RESPONSE:
        this._messageDispatcher.resolve(e);
        break;
      case q.ERROR_RESPONSE: {
        const t = this._messageDispatcher.reject(e);
        this._options.callbacks?.onMessageError?.(t);
        break;
      }
      case q.USER_STARTED_SPEAKING:
        this._options.callbacks?.onUserStartedSpeaking?.();
        break;
      case q.USER_STOPPED_SPEAKING:
        this._options.callbacks?.onUserStoppedSpeaking?.();
        break;
      case q.BOT_STARTED_SPEAKING:
        this._options.callbacks?.onBotStartedSpeaking?.();
        break;
      case q.BOT_STOPPED_SPEAKING:
        this._options.callbacks?.onBotStoppedSpeaking?.();
        break;
      case q.USER_MUTE_STARTED:
        this._options.callbacks?.onUserMuteStarted?.();
        break;
      case q.USER_MUTE_STOPPED:
        this._options.callbacks?.onUserMuteStopped?.();
        break;
      case q.USER_TRANSCRIPTION: {
        const t = e.data;
        this._options.callbacks?.onUserTranscript?.(t);
        break;
      }
      case q.USER_LLM_TEXT: {
        const t = e.data;
        this._options.callbacks?.onUserLlmText?.(t), this.emit(F.UserLlmText, t);
        break;
      }
      case q.BOT_OUTPUT:
        this._options.callbacks?.onBotOutput?.(e.data);
        break;
      case q.BOT_TRANSCRIPTION:
        this._options.callbacks?.onBotTranscript?.(e.data);
        break;
      case q.BOT_LLM_TEXT:
        this._options.callbacks?.onBotLlmText?.(e.data);
        break;
      case q.BOT_LLM_STARTED:
        this._options.callbacks?.onBotLlmStarted?.();
        break;
      case q.BOT_LLM_STOPPED:
        this._options.callbacks?.onBotLlmStopped?.();
        break;
      case q.BOT_TTS_TEXT:
        this._options.callbacks?.onBotTtsText?.(e.data);
        break;
      case q.BOT_TTS_STARTED:
        this._options.callbacks?.onBotTtsStarted?.();
        break;
      case q.BOT_TTS_STOPPED:
        this._options.callbacks?.onBotTtsStopped?.();
        break;
      case q.METRICS:
        this._options.callbacks?.onMetrics?.(e.data), this.emit(F.Metrics, e.data);
        break;
      case q.SERVER_MESSAGE:
        this._options.callbacks?.onServerMessage?.(e.data), this.emit(F.ServerMessage, e.data);
        break;
      case q.UI_COMMAND: {
        const t = e.data;
        this._options.callbacks?.onUICommand?.(t), this.emit(F.UICommand, t);
        break;
      }
      case q.UI_JOB_GROUP: {
        const t = e.data;
        this._options.callbacks?.onUIJobGroup?.(t), this.emit(F.UIJobGroup, t);
        break;
      }
      case q.LLM_FUNCTION_CALL_STARTED: {
        const t = e.data;
        this._options.callbacks?.onLLMFunctionCallStarted?.(t), this.emit(F.LLMFunctionCallStarted, t);
        break;
      }
      case q.LLM_FUNCTION_CALL_IN_PROGRESS: {
        const t = e.data;
        this._maybeTriggerFunctionCallCallback(t), this._options.callbacks?.onLLMFunctionCallInProgress?.(t), this.emit(F.LLMFunctionCallInProgress, t);
        break;
      }
      case q.LLM_FUNCTION_CALL_STOPPED: {
        const t = e.data;
        this._options.callbacks?.onLLMFunctionCallStopped?.(t), this.emit(F.LLMFunctionCallStopped, t);
        break;
      }
      case q.LLM_FUNCTION_CALL: {
        const t = e.data, n = {
          function_name: t.function_name,
          tool_call_id: t.tool_call_id,
          arguments: t.args
        };
        this._maybeTriggerFunctionCallCallback(n), this._options.callbacks?.onLLMFunctionCall && (this._llmFunctionCallWarned || (R.warn("[Pipecat Client] onLLMFunctionCall is deprecated. Please use onLLMFunctionCallInProgress instead."), this._llmFunctionCallWarned = !0)), this._options.callbacks?.onLLMFunctionCall?.(t), this.emit(F.LLMFunctionCall, t);
        break;
      }
      case q.BOT_LLM_SEARCH_RESPONSE: {
        const t = e.data;
        this._options.callbacks?.onBotLlmSearchResponse?.(t), this.emit(F.BotLlmSearchResponse, t);
        break;
      }
      default:
        R.debug("[Pipecat Client] Unrecognized message type", e.type);
        break;
    }
  }
  _maybeTriggerFunctionCallCallback(e) {
    if (!e.function_name) return;
    const t = this._functionCallCallbacks[e.function_name];
    if (t) {
      const n = {
        functionName: e.function_name ?? "",
        arguments: e.arguments ?? {}
      };
      t(n).then((i) => {
        i != null && this._sendMessage(new oe(q.LLM_FUNCTION_CALL_RESULT, {
          function_name: e.function_name,
          tool_call_id: e.tool_call_id,
          arguments: e.arguments ?? {},
          result: i
        }));
      }).catch((i) => {
        R.error("Error in function call callback", i);
      });
    }
  }
}
Ue([
  Ca
], ke.prototype, "startBot", null);
Ue([
  Ca
], ke.prototype, "connect", null);
Ue([
  Ca
], ke.prototype, "startBotAndConnect", null);
Ue([
  mt
], ke.prototype, "sendClientMessage", null);
Ue([
  mt
], ke.prototype, "sendUIEvent", null);
Ue([
  mt
], ke.prototype, "sendDTMF", null);
Ue([
  mt
], ke.prototype, "cancelUIJobGroup", null);
Ue([
  mt
], ke.prototype, "sendClientRequest", null);
Ue([
  mt
], ke.prototype, "appendToContext", null);
Ue([
  mt
], ke.prototype, "sendText", null);
Ue([
  mt
], ke.prototype, "disconnectBot", null);
Ie(Lt, kd);
Ie(Lt, xd);
Ie(Lt, Nd);
Ie(Lt, Ea);
Ie(Lt, Aa);
Ie(Lt, Pa);
Ie(Lt, xa);
function yo(r, e) {
  if (r == null) return {};
  var t, n, i = (function(a, c) {
    if (a == null) return {};
    var u = {};
    for (var l in a) if ({}.hasOwnProperty.call(a, l)) {
      if (c.indexOf(l) !== -1) continue;
      u[l] = a[l];
    }
    return u;
  })(r, e);
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(r);
    for (n = 0; n < s.length; n++) t = s[n], e.indexOf(t) === -1 && {}.propertyIsEnumerable.call(r, t) && (i[t] = r[t]);
  }
  return i;
}
function Me(r, e) {
  if (!(r instanceof e)) throw new TypeError("Cannot call a class as a function");
}
function te(r) {
  return te = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, te(r);
}
function zd(r) {
  var e = (function(t, n) {
    if (te(t) != "object" || !t) return t;
    var i = t[Symbol.toPrimitive];
    if (i !== void 0) {
      var s = i.call(t, n);
      if (te(s) != "object") return s;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return String(t);
  })(r, "string");
  return te(e) == "symbol" ? e : e + "";
}
function _o(r, e) {
  for (var t = 0; t < e.length; t++) {
    var n = e[t];
    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(r, zd(n.key), n);
  }
}
function Ce(r, e, t) {
  return e && _o(r.prototype, e), t && _o(r, t), Object.defineProperty(r, "prototype", { writable: !1 }), r;
}
function un(r, e) {
  if (e && (te(e) == "object" || typeof e == "function")) return e;
  if (e !== void 0) throw new TypeError("Derived constructors may only return object or undefined");
  return (function(t) {
    if (t === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return t;
  })(r);
}
function $e(r) {
  return $e = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  }, $e(r);
}
function fr(r, e) {
  return fr = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, n) {
    return t.__proto__ = n, t;
  }, fr(r, e);
}
function ln(r, e) {
  if (typeof e != "function" && e !== null) throw new TypeError("Super expression must either be null or a function");
  r.prototype = Object.create(e && e.prototype, { constructor: { value: r, writable: !0, configurable: !0 } }), Object.defineProperty(r, "prototype", { writable: !1 }), e && fr(r, e);
}
function Je(r, e, t) {
  return (e = zd(e)) in r ? Object.defineProperty(r, e, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : r[e] = t, r;
}
function wo(r, e, t, n, i, s, a) {
  try {
    var c = r[s](a), u = c.value;
  } catch (l) {
    return void t(l);
  }
  c.done ? e(u) : Promise.resolve(u).then(n, i);
}
function J(r) {
  return function() {
    var e = this, t = arguments;
    return new Promise(function(n, i) {
      var s = r.apply(e, t);
      function a(u) {
        wo(s, n, i, a, c, "next", u);
      }
      function c(u) {
        wo(s, n, i, a, c, "throw", u);
      }
      a(void 0);
    });
  };
}
function So(r, e) {
  (e == null || e > r.length) && (e = r.length);
  for (var t = 0, n = Array(e); t < e; t++) n[t] = r[t];
  return n;
}
function le(r, e) {
  return (function(t) {
    if (Array.isArray(t)) return t;
  })(r) || (function(t, n) {
    var i = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
    if (i != null) {
      var s, a, c, u, l = [], f = !0, p = !1;
      try {
        if (c = (i = i.call(t)).next, n === 0) {
          if (Object(i) !== i) return;
          f = !1;
        } else for (; !(f = (s = c.call(i)).done) && (l.push(s.value), l.length !== n); f = !0) ;
      } catch (y) {
        p = !0, a = y;
      } finally {
        try {
          if (!f && i.return != null && (u = i.return(), Object(u) !== u)) return;
        } finally {
          if (p) throw a;
        }
      }
      return l;
    }
  })(r, e) || (function(t, n) {
    if (t) {
      if (typeof t == "string") return So(t, n);
      var i = {}.toString.call(t).slice(8, -1);
      return i === "Object" && t.constructor && (i = t.constructor.name), i === "Map" || i === "Set" ? Array.from(t) : i === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i) ? So(t, n) : void 0;
    }
  })(r, e) || (function() {
    throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  })();
}
function qf(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var ko, Or = { exports: {} }, Ys = (function() {
  if (ko) return Or.exports;
  ko = 1;
  var r, e = typeof Reflect == "object" ? Reflect : null, t = e && typeof e.apply == "function" ? e.apply : function(v, C, E) {
    return Function.prototype.apply.call(v, C, E);
  };
  r = e && typeof e.ownKeys == "function" ? e.ownKeys : Object.getOwnPropertySymbols ? function(v) {
    return Object.getOwnPropertyNames(v).concat(Object.getOwnPropertySymbols(v));
  } : function(v) {
    return Object.getOwnPropertyNames(v);
  };
  var n = Number.isNaN || function(v) {
    return v != v;
  };
  function i() {
    i.init.call(this);
  }
  Or.exports = i, Or.exports.once = function(v, C) {
    return new Promise(function(E, O) {
      function I(S) {
        v.removeListener(C, k), O(S);
      }
      function k() {
        typeof v.removeListener == "function" && v.removeListener("error", I), E([].slice.call(arguments));
      }
      b(v, C, k, { once: !0 }), C !== "error" && (function(S, T, L) {
        typeof S.on == "function" && b(S, "error", T, L);
      })(v, I, { once: !0 });
    });
  }, i.EventEmitter = i, i.prototype._events = void 0, i.prototype._eventsCount = 0, i.prototype._maxListeners = void 0;
  var s = 10;
  function a(v) {
    if (typeof v != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof v);
  }
  function c(v) {
    return v._maxListeners === void 0 ? i.defaultMaxListeners : v._maxListeners;
  }
  function u(v, C, E, O) {
    var I, k, S, T;
    if (a(E), (k = v._events) === void 0 ? (k = v._events = /* @__PURE__ */ Object.create(null), v._eventsCount = 0) : (k.newListener !== void 0 && (v.emit("newListener", C, E.listener ? E.listener : E), k = v._events), S = k[C]), S === void 0) S = k[C] = E, ++v._eventsCount;
    else if (typeof S == "function" ? S = k[C] = O ? [E, S] : [S, E] : O ? S.unshift(E) : S.push(E), (I = c(v)) > 0 && S.length > I && !S.warned) {
      S.warned = !0;
      var L = new Error("Possible EventEmitter memory leak detected. " + S.length + " " + String(C) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      L.name = "MaxListenersExceededWarning", L.emitter = v, L.type = C, L.count = S.length, T = L, console && console.warn && console.warn(T);
    }
    return v;
  }
  function l() {
    if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function f(v, C, E) {
    var O = { fired: !1, wrapFn: void 0, target: v, type: C, listener: E }, I = l.bind(O);
    return I.listener = E, O.wrapFn = I, I;
  }
  function p(v, C, E) {
    var O = v._events;
    if (O === void 0) return [];
    var I = O[C];
    return I === void 0 ? [] : typeof I == "function" ? E ? [I.listener || I] : [I] : E ? (function(k) {
      for (var S = new Array(k.length), T = 0; T < S.length; ++T) S[T] = k[T].listener || k[T];
      return S;
    })(I) : M(I, I.length);
  }
  function y(v) {
    var C = this._events;
    if (C !== void 0) {
      var E = C[v];
      if (typeof E == "function") return 1;
      if (E !== void 0) return E.length;
    }
    return 0;
  }
  function M(v, C) {
    for (var E = new Array(C), O = 0; O < C; ++O) E[O] = v[O];
    return E;
  }
  function b(v, C, E, O) {
    if (typeof v.on == "function") O.once ? v.once(C, E) : v.on(C, E);
    else {
      if (typeof v.addEventListener != "function") throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof v);
      v.addEventListener(C, function I(k) {
        O.once && v.removeEventListener(C, I), E(k);
      });
    }
  }
  return Object.defineProperty(i, "defaultMaxListeners", { enumerable: !0, get: function() {
    return s;
  }, set: function(v) {
    if (typeof v != "number" || v < 0 || n(v)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + v + ".");
    s = v;
  } }), i.init = function() {
    this._events !== void 0 && this._events !== Object.getPrototypeOf(this)._events || (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, i.prototype.setMaxListeners = function(v) {
    if (typeof v != "number" || v < 0 || n(v)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + v + ".");
    return this._maxListeners = v, this;
  }, i.prototype.getMaxListeners = function() {
    return c(this);
  }, i.prototype.emit = function(v) {
    for (var C = [], E = 1; E < arguments.length; E++) C.push(arguments[E]);
    var O = v === "error", I = this._events;
    if (I !== void 0) O = O && I.error === void 0;
    else if (!O) return !1;
    if (O) {
      var k;
      if (C.length > 0 && (k = C[0]), k instanceof Error) throw k;
      var S = new Error("Unhandled error." + (k ? " (" + k.message + ")" : ""));
      throw S.context = k, S;
    }
    var T = I[v];
    if (T === void 0) return !1;
    if (typeof T == "function") t(T, this, C);
    else {
      var L = T.length, D = M(T, L);
      for (E = 0; E < L; ++E) t(D[E], this, C);
    }
    return !0;
  }, i.prototype.addListener = function(v, C) {
    return u(this, v, C, !1);
  }, i.prototype.on = i.prototype.addListener, i.prototype.prependListener = function(v, C) {
    return u(this, v, C, !0);
  }, i.prototype.once = function(v, C) {
    return a(C), this.on(v, f(this, v, C)), this;
  }, i.prototype.prependOnceListener = function(v, C) {
    return a(C), this.prependListener(v, f(this, v, C)), this;
  }, i.prototype.removeListener = function(v, C) {
    var E, O, I, k, S;
    if (a(C), (O = this._events) === void 0) return this;
    if ((E = O[v]) === void 0) return this;
    if (E === C || E.listener === C) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete O[v], O.removeListener && this.emit("removeListener", v, E.listener || C));
    else if (typeof E != "function") {
      for (I = -1, k = E.length - 1; k >= 0; k--) if (E[k] === C || E[k].listener === C) {
        S = E[k].listener, I = k;
        break;
      }
      if (I < 0) return this;
      I === 0 ? E.shift() : (function(T, L) {
        for (; L + 1 < T.length; L++) T[L] = T[L + 1];
        T.pop();
      })(E, I), E.length === 1 && (O[v] = E[0]), O.removeListener !== void 0 && this.emit("removeListener", v, S || C);
    }
    return this;
  }, i.prototype.off = i.prototype.removeListener, i.prototype.removeAllListeners = function(v) {
    var C, E, O;
    if ((E = this._events) === void 0) return this;
    if (E.removeListener === void 0) return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : E[v] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete E[v]), this;
    if (arguments.length === 0) {
      var I, k = Object.keys(E);
      for (O = 0; O < k.length; ++O) (I = k[O]) !== "removeListener" && this.removeAllListeners(I);
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (typeof (C = E[v]) == "function") this.removeListener(v, C);
    else if (C !== void 0) for (O = C.length - 1; O >= 0; O--) this.removeListener(v, C[O]);
    return this;
  }, i.prototype.listeners = function(v) {
    return p(this, v, !0);
  }, i.prototype.rawListeners = function(v) {
    return p(this, v, !1);
  }, i.listenerCount = function(v, C) {
    return typeof v.listenerCount == "function" ? v.listenerCount(C) : y.call(v, C);
  }, i.prototype.listenerCount = y, i.prototype.eventNames = function() {
    return this._eventsCount > 0 ? r(this._events) : [];
  }, Or.exports;
})(), Pr = qf(Ys), Mo = Object.prototype.hasOwnProperty;
function Co(r, e, t) {
  for (t of r.keys()) if (be(t, e)) return t;
}
function be(r, e) {
  var t, n, i;
  if (r === e) return !0;
  if (r && e && (t = r.constructor) === e.constructor) {
    if (t === Date) return r.getTime() === e.getTime();
    if (t === RegExp) return r.toString() === e.toString();
    if (t === Array) {
      if ((n = r.length) === e.length) for (; n-- && be(r[n], e[n]); ) ;
      return n === -1;
    }
    if (t === Set) {
      if (r.size !== e.size) return !1;
      for (n of r)
        if ((i = n) && typeof i == "object" && !(i = Co(e, i)) || !e.has(i)) return !1;
      return !0;
    }
    if (t === Map) {
      if (r.size !== e.size) return !1;
      for (n of r)
        if ((i = n[0]) && typeof i == "object" && !(i = Co(e, i)) || !be(n[1], e.get(i))) return !1;
      return !0;
    }
    if (t === ArrayBuffer) r = new Uint8Array(r), e = new Uint8Array(e);
    else if (t === DataView) {
      if ((n = r.byteLength) === e.byteLength) for (; n-- && r.getInt8(n) === e.getInt8(n); ) ;
      return n === -1;
    }
    if (ArrayBuffer.isView(r)) {
      if ((n = r.byteLength) === e.byteLength) for (; n-- && r[n] === e[n]; ) ;
      return n === -1;
    }
    if (!t || typeof r == "object") {
      for (t in n = 0, r)
        if (Mo.call(r, t) && ++n && !Mo.call(e, t) || !(t in e) || !be(r[t], e[t])) return !1;
      return Object.keys(e).length === n;
    }
  }
  return r != r && e != e;
}
const Uf = { AmazonBot: "amazonbot", "Amazon Silk": "amazon_silk", "Android Browser": "android", BaiduSpider: "baiduspider", Bada: "bada", BingCrawler: "bingcrawler", Brave: "brave", BlackBerry: "blackberry", "ChatGPT-User": "chatgpt_user", Chrome: "chrome", ClaudeBot: "claudebot", Chromium: "chromium", Diffbot: "diffbot", DuckDuckBot: "duckduckbot", DuckDuckGo: "duckduckgo", Electron: "electron", Epiphany: "epiphany", FacebookExternalHit: "facebookexternalhit", Firefox: "firefox", Focus: "focus", Generic: "generic", "Google Search": "google_search", Googlebot: "googlebot", GPTBot: "gptbot", "Internet Explorer": "ie", InternetArchiveCrawler: "internetarchivecrawler", "K-Meleon": "k_meleon", LibreWolf: "librewolf", Linespider: "linespider", Maxthon: "maxthon", "Meta-ExternalAds": "meta_externalads", "Meta-ExternalAgent": "meta_externalagent", "Meta-ExternalFetcher": "meta_externalfetcher", "Meta-WebIndexer": "meta_webindexer", "Microsoft Edge": "edge", "MZ Browser": "mz", "NAVER Whale Browser": "naver", "OAI-SearchBot": "oai_searchbot", Omgilibot: "omgilibot", Opera: "opera", "Opera Coast": "opera_coast", "Pale Moon": "pale_moon", PerplexityBot: "perplexitybot", "Perplexity-User": "perplexity_user", PhantomJS: "phantomjs", PingdomBot: "pingdombot", Puffin: "puffin", QQ: "qq", QQLite: "qqlite", QupZilla: "qupzilla", Roku: "roku", Safari: "safari", Sailfish: "sailfish", "Samsung Internet for Android": "samsung_internet", SlackBot: "slackbot", SeaMonkey: "seamonkey", Sleipnir: "sleipnir", "Sogou Browser": "sogou", Swing: "swing", Tizen: "tizen", "UC Browser": "uc", Vivaldi: "vivaldi", "WebOS Browser": "webos", WeChat: "wechat", YahooSlurp: "yahooslurp", "Yandex Browser": "yandex", YandexBot: "yandexbot", YouBot: "youbot" }, Wd = { amazonbot: "AmazonBot", amazon_silk: "Amazon Silk", android: "Android Browser", baiduspider: "BaiduSpider", bada: "Bada", bingcrawler: "BingCrawler", blackberry: "BlackBerry", brave: "Brave", chatgpt_user: "ChatGPT-User", chrome: "Chrome", claudebot: "ClaudeBot", chromium: "Chromium", diffbot: "Diffbot", duckduckbot: "DuckDuckBot", duckduckgo: "DuckDuckGo", edge: "Microsoft Edge", electron: "Electron", epiphany: "Epiphany", facebookexternalhit: "FacebookExternalHit", firefox: "Firefox", focus: "Focus", generic: "Generic", google_search: "Google Search", googlebot: "Googlebot", gptbot: "GPTBot", ie: "Internet Explorer", internetarchivecrawler: "InternetArchiveCrawler", k_meleon: "K-Meleon", librewolf: "LibreWolf", linespider: "Linespider", maxthon: "Maxthon", meta_externalads: "Meta-ExternalAds", meta_externalagent: "Meta-ExternalAgent", meta_externalfetcher: "Meta-ExternalFetcher", meta_webindexer: "Meta-WebIndexer", mz: "MZ Browser", naver: "NAVER Whale Browser", oai_searchbot: "OAI-SearchBot", omgilibot: "Omgilibot", opera: "Opera", opera_coast: "Opera Coast", pale_moon: "Pale Moon", perplexitybot: "PerplexityBot", perplexity_user: "Perplexity-User", phantomjs: "PhantomJS", pingdombot: "PingdomBot", puffin: "Puffin", qq: "QQ Browser", qqlite: "QQ Browser Lite", qupzilla: "QupZilla", roku: "Roku", safari: "Safari", sailfish: "Sailfish", samsung_internet: "Samsung Internet for Android", seamonkey: "SeaMonkey", slackbot: "SlackBot", sleipnir: "Sleipnir", sogou: "Sogou Browser", swing: "Swing", tizen: "Tizen", uc: "UC Browser", vivaldi: "Vivaldi", webos: "WebOS Browser", wechat: "WeChat", yahooslurp: "YahooSlurp", yandex: "Yandex Browser", yandexbot: "YandexBot", youbot: "YouBot" }, z = { bot: "bot", desktop: "desktop", mobile: "mobile", tablet: "tablet", tv: "tv" }, me = { Android: "Android", Bada: "Bada", BlackBerry: "BlackBerry", ChromeOS: "Chrome OS", HarmonyOS: "HarmonyOS", iOS: "iOS", Linux: "Linux", MacOS: "macOS", PlayStation4: "PlayStation 4", Roku: "Roku", Tizen: "Tizen", WebOS: "WebOS", Windows: "Windows", WindowsPhone: "Windows Phone" }, lt = { Blink: "Blink", EdgeHTML: "EdgeHTML", Gecko: "Gecko", Presto: "Presto", Trident: "Trident", WebKit: "WebKit" };
class w {
  static getFirstMatch(e, t) {
    const n = t.match(e);
    return n && n.length > 0 && n[1] || "";
  }
  static getSecondMatch(e, t) {
    const n = t.match(e);
    return n && n.length > 1 && n[2] || "";
  }
  static matchAndReturnConst(e, t, n) {
    if (e.test(t)) return n;
  }
  static getWindowsVersionName(e) {
    switch (e) {
      case "NT":
        return "NT";
      case "XP":
      case "NT 5.1":
        return "XP";
      case "NT 5.0":
        return "2000";
      case "NT 5.2":
        return "2003";
      case "NT 6.0":
        return "Vista";
      case "NT 6.1":
        return "7";
      case "NT 6.2":
        return "8";
      case "NT 6.3":
        return "8.1";
      case "NT 10.0":
        return "10";
      default:
        return;
    }
  }
  static getMacOSVersionName(e) {
    const t = e.split(".").splice(0, 2).map((s) => parseInt(s, 10) || 0);
    t.push(0);
    const n = t[0], i = t[1];
    if (n === 10) switch (i) {
      case 5:
        return "Leopard";
      case 6:
        return "Snow Leopard";
      case 7:
        return "Lion";
      case 8:
        return "Mountain Lion";
      case 9:
        return "Mavericks";
      case 10:
        return "Yosemite";
      case 11:
        return "El Capitan";
      case 12:
        return "Sierra";
      case 13:
        return "High Sierra";
      case 14:
        return "Mojave";
      case 15:
        return "Catalina";
      default:
        return;
    }
    switch (n) {
      case 11:
        return "Big Sur";
      case 12:
        return "Monterey";
      case 13:
        return "Ventura";
      case 14:
        return "Sonoma";
      case 15:
        return "Sequoia";
      default:
        return;
    }
  }
  static getAndroidVersionName(e) {
    const t = e.split(".").splice(0, 2).map((n) => parseInt(n, 10) || 0);
    if (t.push(0), !(t[0] === 1 && t[1] < 5)) return t[0] === 1 && t[1] < 6 ? "Cupcake" : t[0] === 1 && t[1] >= 6 ? "Donut" : t[0] === 2 && t[1] < 2 ? "Eclair" : t[0] === 2 && t[1] === 2 ? "Froyo" : t[0] === 2 && t[1] > 2 ? "Gingerbread" : t[0] === 3 ? "Honeycomb" : t[0] === 4 && t[1] < 1 ? "Ice Cream Sandwich" : t[0] === 4 && t[1] < 4 ? "Jelly Bean" : t[0] === 4 && t[1] >= 4 ? "KitKat" : t[0] === 5 ? "Lollipop" : t[0] === 6 ? "Marshmallow" : t[0] === 7 ? "Nougat" : t[0] === 8 ? "Oreo" : t[0] === 9 ? "Pie" : void 0;
  }
  static getVersionPrecision(e) {
    return e.split(".").length;
  }
  static compareVersions(e, t, n = !1) {
    const i = w.getVersionPrecision(e), s = w.getVersionPrecision(t);
    let a = Math.max(i, s), c = 0;
    const u = w.map([e, t], (l) => {
      const f = a - w.getVersionPrecision(l), p = l + new Array(f + 1).join(".0");
      return w.map(p.split("."), (y) => new Array(20 - y.length).join("0") + y).reverse();
    });
    for (n && (c = a - Math.min(i, s)), a -= 1; a >= c; ) {
      if (u[0][a] > u[1][a]) return 1;
      if (u[0][a] === u[1][a]) {
        if (a === c) return 0;
        a -= 1;
      } else if (u[0][a] < u[1][a]) return -1;
    }
  }
  static map(e, t) {
    const n = [];
    let i;
    if (Array.prototype.map) return Array.prototype.map.call(e, t);
    for (i = 0; i < e.length; i += 1) n.push(t(e[i]));
    return n;
  }
  static find(e, t) {
    let n, i;
    if (Array.prototype.find) return Array.prototype.find.call(e, t);
    for (n = 0, i = e.length; n < i; n += 1) {
      const s = e[n];
      if (t(s, n)) return s;
    }
  }
  static assign(e, ...t) {
    const n = e;
    let i, s;
    if (Object.assign) return Object.assign(e, ...t);
    for (i = 0, s = t.length; i < s; i += 1) {
      const a = t[i];
      typeof a == "object" && a !== null && Object.keys(a).forEach((c) => {
        n[c] = a[c];
      });
    }
    return e;
  }
  static getBrowserAlias(e) {
    return Uf[e];
  }
  static getBrowserTypeByAlias(e) {
    return Wd[e] || "";
  }
}
const G = /version\/(\d+(\.?_?\d+)+)/i, Vf = [{ test: [/gptbot/i], describe(r) {
  const e = { name: "GPTBot" }, t = w.getFirstMatch(/gptbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/chatgpt-user/i], describe(r) {
  const e = { name: "ChatGPT-User" }, t = w.getFirstMatch(/chatgpt-user\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/oai-searchbot/i], describe(r) {
  const e = { name: "OAI-SearchBot" }, t = w.getFirstMatch(/oai-searchbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i], describe(r) {
  const e = { name: "ClaudeBot" }, t = w.getFirstMatch(/(?:claudebot|claude-web|claude-user|claude-searchbot)\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/omgilibot/i, /webzio-extended/i], describe(r) {
  const e = { name: "Omgilibot" }, t = w.getFirstMatch(/(?:omgilibot|webzio-extended)\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/diffbot/i], describe(r) {
  const e = { name: "Diffbot" }, t = w.getFirstMatch(/diffbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/perplexitybot/i], describe(r) {
  const e = { name: "PerplexityBot" }, t = w.getFirstMatch(/perplexitybot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/perplexity-user/i], describe(r) {
  const e = { name: "Perplexity-User" }, t = w.getFirstMatch(/perplexity-user\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/youbot/i], describe(r) {
  const e = { name: "YouBot" }, t = w.getFirstMatch(/youbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/meta-webindexer/i], describe(r) {
  const e = { name: "Meta-WebIndexer" }, t = w.getFirstMatch(/meta-webindexer\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/meta-externalads/i], describe(r) {
  const e = { name: "Meta-ExternalAds" }, t = w.getFirstMatch(/meta-externalads\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/meta-externalagent/i], describe(r) {
  const e = { name: "Meta-ExternalAgent" }, t = w.getFirstMatch(/meta-externalagent\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/meta-externalfetcher/i], describe(r) {
  const e = { name: "Meta-ExternalFetcher" }, t = w.getFirstMatch(/meta-externalfetcher\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/googlebot/i], describe(r) {
  const e = { name: "Googlebot" }, t = w.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/linespider/i], describe(r) {
  const e = { name: "Linespider" }, t = w.getFirstMatch(/(?:linespider)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/amazonbot/i], describe(r) {
  const e = { name: "AmazonBot" }, t = w.getFirstMatch(/amazonbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/bingbot/i], describe(r) {
  const e = { name: "BingCrawler" }, t = w.getFirstMatch(/bingbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/baiduspider/i], describe(r) {
  const e = { name: "BaiduSpider" }, t = w.getFirstMatch(/baiduspider\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/duckduckbot/i], describe(r) {
  const e = { name: "DuckDuckBot" }, t = w.getFirstMatch(/duckduckbot\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/ia_archiver/i], describe(r) {
  const e = { name: "InternetArchiveCrawler" }, t = w.getFirstMatch(/ia_archiver\/(\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/facebookexternalhit/i, /facebookcatalog/i], describe: () => ({ name: "FacebookExternalHit" }) }, { test: [/slackbot/i, /slack-imgProxy/i], describe(r) {
  const e = { name: "SlackBot" }, t = w.getFirstMatch(/(?:slackbot|slack-imgproxy)(?:-[-\w]+)?[\s/](\d+(\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/yahoo!?[\s/]*slurp/i], describe: () => ({ name: "YahooSlurp" }) }, { test: [/yandexbot/i, /yandexmobilebot/i], describe: () => ({ name: "YandexBot" }) }, { test: [/pingdom/i], describe: () => ({ name: "PingdomBot" }) }, { test: [/opera/i], describe(r) {
  const e = { name: "Opera" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/opr\/|opios/i], describe(r) {
  const e = { name: "Opera" }, t = w.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/SamsungBrowser/i], describe(r) {
  const e = { name: "Samsung Internet for Android" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/Whale/i], describe(r) {
  const e = { name: "NAVER Whale Browser" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/PaleMoon/i], describe(r) {
  const e = { name: "Pale Moon" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:PaleMoon)[\s/](\d+(?:\.\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/MZBrowser/i], describe(r) {
  const e = { name: "MZ Browser" }, t = w.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/focus/i], describe(r) {
  const e = { name: "Focus" }, t = w.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/swing/i], describe(r) {
  const e = { name: "Swing" }, t = w.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/coast/i], describe(r) {
  const e = { name: "Opera Coast" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/opt\/\d+(?:.?_?\d+)+/i], describe(r) {
  const e = { name: "Opera Touch" }, t = w.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/yabrowser/i], describe(r) {
  const e = { name: "Yandex Browser" }, t = w.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/ucbrowser/i], describe(r) {
  const e = { name: "UC Browser" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/Maxthon|mxios/i], describe(r) {
  const e = { name: "Maxthon" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/epiphany/i], describe(r) {
  const e = { name: "Epiphany" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/puffin/i], describe(r) {
  const e = { name: "Puffin" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/sleipnir/i], describe(r) {
  const e = { name: "Sleipnir" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/k-meleon/i], describe(r) {
  const e = { name: "K-Meleon" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/micromessenger/i], describe(r) {
  const e = { name: "WeChat" }, t = w.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/qqbrowser/i], describe(r) {
  const e = { name: /qqbrowserlite/i.test(r) ? "QQ Browser Lite" : "QQ Browser" }, t = w.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/msie|trident/i], describe(r) {
  const e = { name: "Internet Explorer" }, t = w.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/\sedg\//i], describe(r) {
  const e = { name: "Microsoft Edge" }, t = w.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/edg([ea]|ios)/i], describe(r) {
  const e = { name: "Microsoft Edge" }, t = w.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/vivaldi/i], describe(r) {
  const e = { name: "Vivaldi" }, t = w.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/seamonkey/i], describe(r) {
  const e = { name: "SeaMonkey" }, t = w.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/sailfish/i], describe(r) {
  const e = { name: "Sailfish" }, t = w.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, r);
  return t && (e.version = t), e;
} }, { test: [/silk/i], describe(r) {
  const e = { name: "Amazon Silk" }, t = w.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/phantom/i], describe(r) {
  const e = { name: "PhantomJS" }, t = w.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/slimerjs/i], describe(r) {
  const e = { name: "SlimerJS" }, t = w.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/blackberry|\bbb\d+/i, /rim\stablet/i], describe(r) {
  const e = { name: "BlackBerry" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/(web|hpw)[o0]s/i], describe(r) {
  const e = { name: "WebOS Browser" }, t = w.getFirstMatch(G, r) || w.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/bada/i], describe(r) {
  const e = { name: "Bada" }, t = w.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/tizen/i], describe(r) {
  const e = { name: "Tizen" }, t = w.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/qupzilla/i], describe(r) {
  const e = { name: "QupZilla" }, t = w.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/librewolf/i], describe(r) {
  const e = { name: "LibreWolf" }, t = w.getFirstMatch(/(?:librewolf)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/firefox|iceweasel|fxios/i], describe(r) {
  const e = { name: "Firefox" }, t = w.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/electron/i], describe(r) {
  const e = { name: "Electron" }, t = w.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/sogoumobilebrowser/i, /metasr/i, /se 2\.[x]/i], describe(r) {
  const e = { name: "Sogou Browser" }, t = w.getFirstMatch(/(?:sogoumobilebrowser)[\s/](\d+(\.?_?\d+)+)/i, r), n = w.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r), i = w.getFirstMatch(/se ([\d.]+)x/i, r), s = t || n || i;
  return s && (e.version = s), e;
} }, { test: [/MiuiBrowser/i], describe(r) {
  const e = { name: "Miui" }, t = w.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: (r) => !!r.hasBrand("DuckDuckGo") || r.test(/\sDdg\/[\d.]+$/i), describe(r, e) {
  const t = { name: "DuckDuckGo" };
  if (e) {
    const i = e.getBrandVersion("DuckDuckGo");
    if (i) return t.version = i, t;
  }
  const n = w.getFirstMatch(/\sDdg\/([\d.]+)$/i, r);
  return n && (t.version = n), t;
} }, { test: (r) => r.hasBrand("Brave"), describe(r, e) {
  const t = { name: "Brave" };
  if (e) {
    const n = e.getBrandVersion("Brave");
    if (n) return t.version = n, t;
  }
  return t;
} }, { test: [/chromium/i], describe(r) {
  const e = { name: "Chromium" }, t = w.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, r) || w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/chrome|crios|crmo/i], describe(r) {
  const e = { name: "Chrome" }, t = w.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/GSA/i], describe(r) {
  const e = { name: "Google Search" }, t = w.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test(r) {
  const e = !r.test(/like android/i), t = r.test(/android/i);
  return e && t;
}, describe(r) {
  const e = { name: "Android Browser" }, t = w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/playstation 4/i], describe(r) {
  const e = { name: "PlayStation 4" }, t = w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/safari|applewebkit/i], describe(r) {
  const e = { name: "Safari" }, t = w.getFirstMatch(G, r);
  return t && (e.version = t), e;
} }, { test: [/.*/i], describe(r) {
  const e = r.search("\\(") !== -1 ? /^(.*)\/(.*)[ \t]\((.*)/ : /^(.*)\/(.*) /;
  return { name: w.getFirstMatch(e, r), version: w.getSecondMatch(e, r) };
} }];
var zf = [{ test: [/Roku\/DVP/], describe(r) {
  const e = w.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, r);
  return { name: me.Roku, version: e };
} }, { test: [/windows phone/i], describe(r) {
  const e = w.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, r);
  return { name: me.WindowsPhone, version: e };
} }, { test: [/windows /i], describe(r) {
  const e = w.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, r), t = w.getWindowsVersionName(e);
  return { name: me.Windows, version: e, versionName: t };
} }, { test: [/Macintosh(.*?) FxiOS(.*?)\//], describe(r) {
  const e = { name: me.iOS }, t = w.getSecondMatch(/(Version\/)(\d[\d.]+)/, r);
  return t && (e.version = t), e;
} }, { test: [/macintosh/i], describe(r) {
  const e = w.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, r).replace(/[_\s]/g, "."), t = w.getMacOSVersionName(e), n = { name: me.MacOS, version: e };
  return t && (n.versionName = t), n;
} }, { test: [/(ipod|iphone|ipad)/i], describe(r) {
  const e = w.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, r).replace(/[_\s]/g, ".");
  return { name: me.iOS, version: e };
} }, { test: [/OpenHarmony/i], describe(r) {
  const e = w.getFirstMatch(/OpenHarmony\s+(\d+(\.\d+)*)/i, r);
  return { name: me.HarmonyOS, version: e };
} }, { test(r) {
  const e = !r.test(/like android/i), t = r.test(/android/i);
  return e && t;
}, describe(r) {
  const e = w.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, r), t = w.getAndroidVersionName(e), n = { name: me.Android, version: e };
  return t && (n.versionName = t), n;
} }, { test: [/(web|hpw)[o0]s/i], describe(r) {
  const e = w.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, r), t = { name: me.WebOS };
  return e && e.length && (t.version = e), t;
} }, { test: [/blackberry|\bbb\d+/i, /rim\stablet/i], describe(r) {
  const e = w.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, r) || w.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, r) || w.getFirstMatch(/\bbb(\d+)/i, r);
  return { name: me.BlackBerry, version: e };
} }, { test: [/bada/i], describe(r) {
  const e = w.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, r);
  return { name: me.Bada, version: e };
} }, { test: [/tizen/i], describe(r) {
  const e = w.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, r);
  return { name: me.Tizen, version: e };
} }, { test: [/linux/i], describe: () => ({ name: me.Linux }) }, { test: [/CrOS/], describe: () => ({ name: me.ChromeOS }) }, { test: [/PlayStation 4/], describe(r) {
  const e = w.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, r);
  return { name: me.PlayStation4, version: e };
} }], Wf = [{ test: [/googlebot/i], describe: () => ({ type: z.bot, vendor: "Google" }) }, { test: [/linespider/i], describe: () => ({ type: z.bot, vendor: "Line" }) }, { test: [/amazonbot/i], describe: () => ({ type: z.bot, vendor: "Amazon" }) }, { test: [/gptbot/i], describe: () => ({ type: z.bot, vendor: "OpenAI" }) }, { test: [/chatgpt-user/i], describe: () => ({ type: z.bot, vendor: "OpenAI" }) }, { test: [/oai-searchbot/i], describe: () => ({ type: z.bot, vendor: "OpenAI" }) }, { test: [/baiduspider/i], describe: () => ({ type: z.bot, vendor: "Baidu" }) }, { test: [/bingbot/i], describe: () => ({ type: z.bot, vendor: "Bing" }) }, { test: [/duckduckbot/i], describe: () => ({ type: z.bot, vendor: "DuckDuckGo" }) }, { test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i], describe: () => ({ type: z.bot, vendor: "Anthropic" }) }, { test: [/omgilibot/i, /webzio-extended/i], describe: () => ({ type: z.bot, vendor: "Webz.io" }) }, { test: [/diffbot/i], describe: () => ({ type: z.bot, vendor: "Diffbot" }) }, { test: [/perplexitybot/i], describe: () => ({ type: z.bot, vendor: "Perplexity AI" }) }, { test: [/perplexity-user/i], describe: () => ({ type: z.bot, vendor: "Perplexity AI" }) }, { test: [/youbot/i], describe: () => ({ type: z.bot, vendor: "You.com" }) }, { test: [/ia_archiver/i], describe: () => ({ type: z.bot, vendor: "Internet Archive" }) }, { test: [/meta-webindexer/i], describe: () => ({ type: z.bot, vendor: "Meta" }) }, { test: [/meta-externalads/i], describe: () => ({ type: z.bot, vendor: "Meta" }) }, { test: [/meta-externalagent/i], describe: () => ({ type: z.bot, vendor: "Meta" }) }, { test: [/meta-externalfetcher/i], describe: () => ({ type: z.bot, vendor: "Meta" }) }, { test: [/facebookexternalhit/i, /facebookcatalog/i], describe: () => ({ type: z.bot, vendor: "Meta" }) }, { test: [/slackbot/i, /slack-imgProxy/i], describe: () => ({ type: z.bot, vendor: "Slack" }) }, { test: [/yahoo/i], describe: () => ({ type: z.bot, vendor: "Yahoo" }) }, { test: [/yandexbot/i, /yandexmobilebot/i], describe: () => ({ type: z.bot, vendor: "Yandex" }) }, { test: [/pingdom/i], describe: () => ({ type: z.bot, vendor: "Pingdom" }) }, { test: [/huawei/i], describe(r) {
  const e = w.getFirstMatch(/(can-l01)/i, r) && "Nova", t = { type: z.mobile, vendor: "Huawei" };
  return e && (t.model = e), t;
} }, { test: [/nexus\s*(?:7|8|9|10).*/i], describe: () => ({ type: z.tablet, vendor: "Nexus" }) }, { test: [/ipad/i], describe: () => ({ type: z.tablet, vendor: "Apple", model: "iPad" }) }, { test: [/Macintosh(.*?) FxiOS(.*?)\//], describe: () => ({ type: z.tablet, vendor: "Apple", model: "iPad" }) }, { test: [/kftt build/i], describe: () => ({ type: z.tablet, vendor: "Amazon", model: "Kindle Fire HD 7" }) }, { test: [/silk/i], describe: () => ({ type: z.tablet, vendor: "Amazon" }) }, { test: [/tablet(?! pc)/i], describe: () => ({ type: z.tablet }) }, { test(r) {
  const e = r.test(/ipod|iphone/i), t = r.test(/like (ipod|iphone)/i);
  return e && !t;
}, describe(r) {
  const e = w.getFirstMatch(/(ipod|iphone)/i, r);
  return { type: z.mobile, vendor: "Apple", model: e };
} }, { test: [/nexus\s*[0-6].*/i, /galaxy nexus/i], describe: () => ({ type: z.mobile, vendor: "Nexus" }) }, { test: [/Nokia/i], describe(r) {
  const e = w.getFirstMatch(/Nokia\s+([0-9]+(\.[0-9]+)?)/i, r), t = { type: z.mobile, vendor: "Nokia" };
  return e && (t.model = e), t;
} }, { test: [/[^-]mobi/i], describe: () => ({ type: z.mobile }) }, { test: (r) => r.getBrowserName(!0) === "blackberry", describe: () => ({ type: z.mobile, vendor: "BlackBerry" }) }, { test: (r) => r.getBrowserName(!0) === "bada", describe: () => ({ type: z.mobile }) }, { test: (r) => r.getBrowserName() === "windows phone", describe: () => ({ type: z.mobile, vendor: "Microsoft" }) }, { test(r) {
  const e = Number(String(r.getOSVersion()).split(".")[0]);
  return r.getOSName(!0) === "android" && e >= 3;
}, describe: () => ({ type: z.tablet }) }, { test: (r) => r.getOSName(!0) === "android", describe: () => ({ type: z.mobile }) }, { test: [/smart-?tv|smarttv/i], describe: () => ({ type: z.tv }) }, { test: [/netcast/i], describe: () => ({ type: z.tv }) }, { test: (r) => r.getOSName(!0) === "macos", describe: () => ({ type: z.desktop, vendor: "Apple" }) }, { test: (r) => r.getOSName(!0) === "windows", describe: () => ({ type: z.desktop }) }, { test: (r) => r.getOSName(!0) === "linux", describe: () => ({ type: z.desktop }) }, { test: (r) => r.getOSName(!0) === "playstation 4", describe: () => ({ type: z.tv }) }, { test: (r) => r.getOSName(!0) === "roku", describe: () => ({ type: z.tv }) }], Gf = [{ test: (r) => r.getBrowserName(!0) === "microsoft edge", describe(r) {
  if (/\sedg\//i.test(r)) return { name: lt.Blink };
  const e = w.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, r);
  return { name: lt.EdgeHTML, version: e };
} }, { test: [/trident/i], describe(r) {
  const e = { name: lt.Trident }, t = w.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: (r) => r.test(/presto/i), describe(r) {
  const e = { name: lt.Presto }, t = w.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test(r) {
  const e = r.test(/gecko/i), t = r.test(/like gecko/i);
  return e && !t;
}, describe(r) {
  const e = { name: lt.Gecko }, t = w.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }, { test: [/(apple)?webkit\/537\.36/i], describe: () => ({ name: lt.Blink }) }, { test: [/(apple)?webkit/i], describe(r) {
  const e = { name: lt.WebKit }, t = w.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, r);
  return t && (e.version = t), e;
} }];
class Eo {
  constructor(e, t = !1, n = null) {
    if (e == null || e === "") throw new Error("UserAgent parameter can't be empty");
    this._ua = e;
    let i = !1;
    typeof t == "boolean" ? (i = t, this._hints = n) : this._hints = t != null && typeof t == "object" ? t : null, this.parsedResult = {}, i !== !0 && this.parse();
  }
  getHints() {
    return this._hints;
  }
  hasBrand(e) {
    if (!this._hints || !Array.isArray(this._hints.brands)) return !1;
    const t = e.toLowerCase();
    return this._hints.brands.some((n) => n.brand && n.brand.toLowerCase() === t);
  }
  getBrandVersion(e) {
    if (!this._hints || !Array.isArray(this._hints.brands)) return;
    const t = e.toLowerCase(), n = this._hints.brands.find((i) => i.brand && i.brand.toLowerCase() === t);
    return n ? n.version : void 0;
  }
  getUA() {
    return this._ua;
  }
  test(e) {
    return e.test(this._ua);
  }
  parseBrowser() {
    this.parsedResult.browser = {};
    const e = w.find(Vf, (t) => {
      if (typeof t.test == "function") return t.test(this);
      if (Array.isArray(t.test)) return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.browser = e.describe(this.getUA(), this)), this.parsedResult.browser;
  }
  getBrowser() {
    return this.parsedResult.browser ? this.parsedResult.browser : this.parseBrowser();
  }
  getBrowserName(e) {
    return e ? String(this.getBrowser().name).toLowerCase() || "" : this.getBrowser().name || "";
  }
  getBrowserVersion() {
    return this.getBrowser().version;
  }
  getOS() {
    return this.parsedResult.os ? this.parsedResult.os : this.parseOS();
  }
  parseOS() {
    this.parsedResult.os = {};
    const e = w.find(zf, (t) => {
      if (typeof t.test == "function") return t.test(this);
      if (Array.isArray(t.test)) return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.os = e.describe(this.getUA())), this.parsedResult.os;
  }
  getOSName(e) {
    const { name: t } = this.getOS();
    return e ? String(t).toLowerCase() || "" : t || "";
  }
  getOSVersion() {
    return this.getOS().version;
  }
  getPlatform() {
    return this.parsedResult.platform ? this.parsedResult.platform : this.parsePlatform();
  }
  getPlatformType(e = !1) {
    const { type: t } = this.getPlatform();
    return e ? String(t).toLowerCase() || "" : t || "";
  }
  parsePlatform() {
    this.parsedResult.platform = {};
    const e = w.find(Wf, (t) => {
      if (typeof t.test == "function") return t.test(this);
      if (Array.isArray(t.test)) return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.platform = e.describe(this.getUA())), this.parsedResult.platform;
  }
  getEngine() {
    return this.parsedResult.engine ? this.parsedResult.engine : this.parseEngine();
  }
  getEngineName(e) {
    return e ? String(this.getEngine().name).toLowerCase() || "" : this.getEngine().name || "";
  }
  parseEngine() {
    this.parsedResult.engine = {};
    const e = w.find(Gf, (t) => {
      if (typeof t.test == "function") return t.test(this);
      if (Array.isArray(t.test)) return t.test.some((n) => this.test(n));
      throw new Error("Browser's test function is not valid");
    });
    return e && (this.parsedResult.engine = e.describe(this.getUA())), this.parsedResult.engine;
  }
  parse() {
    return this.parseBrowser(), this.parseOS(), this.parsePlatform(), this.parseEngine(), this;
  }
  getResult() {
    return w.assign({}, this.parsedResult);
  }
  satisfies(e) {
    const t = {};
    let n = 0;
    const i = {};
    let s = 0;
    if (Object.keys(e).forEach((a) => {
      const c = e[a];
      typeof c == "string" ? (i[a] = c, s += 1) : typeof c == "object" && (t[a] = c, n += 1);
    }), n > 0) {
      const a = Object.keys(t), c = w.find(a, (l) => this.isOS(l));
      if (c) {
        const l = this.satisfies(t[c]);
        if (l !== void 0) return l;
      }
      const u = w.find(a, (l) => this.isPlatform(l));
      if (u) {
        const l = this.satisfies(t[u]);
        if (l !== void 0) return l;
      }
    }
    if (s > 0) {
      const a = Object.keys(i), c = w.find(a, (u) => this.isBrowser(u, !0));
      if (c !== void 0) return this.compareVersion(i[c]);
    }
  }
  isBrowser(e, t = !1) {
    const n = this.getBrowserName().toLowerCase();
    let i = e.toLowerCase();
    const s = w.getBrowserTypeByAlias(i);
    return t && s && (i = s.toLowerCase()), i === n;
  }
  compareVersion(e) {
    let t = [0], n = e, i = !1;
    const s = this.getBrowserVersion();
    if (typeof s == "string") return e[0] === ">" || e[0] === "<" ? (n = e.substr(1), e[1] === "=" ? (i = !0, n = e.substr(2)) : t = [], e[0] === ">" ? t.push(1) : t.push(-1)) : e[0] === "=" ? n = e.substr(1) : e[0] === "~" && (i = !0, n = e.substr(1)), t.indexOf(w.compareVersions(s, n, i)) > -1;
  }
  isOS(e) {
    return this.getOSName(!0) === String(e).toLowerCase();
  }
  isPlatform(e) {
    return this.getPlatformType(!0) === String(e).toLowerCase();
  }
  isEngine(e) {
    return this.getEngineName(!0) === String(e).toLowerCase();
  }
  is(e, t = !1) {
    return this.isBrowser(e, t) || this.isOS(e) || this.isPlatform(e);
  }
  some(e = []) {
    return e.some((t) => this.is(t));
  }
}
/*!
 * Bowser - a browser detector
 * https://github.com/bowser-js/bowser
 * MIT License | (c) Dustin Diaz 2012-2015
 * MIT License | (c) Denis Demchenko 2015-2019
 */
class Jf {
  static getParser(e, t = !1, n = null) {
    if (typeof e != "string") throw new Error("UserAgent should be a string");
    return new Eo(e, t, n);
  }
  static parse(e, t = null) {
    return new Eo(e, t).getResult();
  }
  static get BROWSER_MAP() {
    return Wd;
  }
  static get ENGINE_MAP() {
    return lt;
  }
  static get OS_MAP() {
    return me;
  }
  static get PLATFORMS_MAP() {
    return z;
  }
}
function dn() {
  return Date.now() + Math.random().toString();
}
function nr() {
  throw new Error("Method must be implemented in subclass");
}
function Gd(r, e) {
  return e != null && e.proxyUrl ? e.proxyUrl + (e.proxyUrl.slice(-1) === "/" ? "" : "/") + r.substring(8) : r;
}
function Xr(r) {
  if (r != null && r.callObjectBundleUrlOverride) return console.warn("The callObjectBundleUrlOverride property is deprecated and will be removed. Please use bundlePathOverride instead. When providing a bundlePathOverride, the URL should point to the directory containing all Daily bundles (call-machine-object-bundle.js and audio-processor-bundle.js)."), r.callObjectBundleUrlOverride;
  var e = (function(t) {
    if (t != null && t.bundlePathOverride) {
      var n = t.bundlePathOverride;
      return n.endsWith("/") ? n.slice(0, -1) : n;
    }
    if (t != null && t.callObjectBundleUrlOverride) {
      var i = t.callObjectBundleUrlOverride, s = i.substring(0, i.lastIndexOf("/"));
      return s.endsWith("/") ? s.slice(0, -1) : s;
    }
    var a = Gd("https://c.daily.co/call-machine/versioned/".concat("0.90.0", "/static"), t);
    return a.endsWith("/") ? a.slice(0, -1) : a;
  })(r) + "/call-machine-object-bundle.js";
  return e;
}
function Zr(r) {
  try {
    new URL(r);
  } catch {
    return !1;
  }
  return !0;
}
const ae = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, Et = "8.55.2", ne = globalThis;
function en(r, e, t) {
  const n = ne, i = n.__SENTRY__ = n.__SENTRY__ || {}, s = i[Et] = i[Et] || {};
  return s[r] || (s[r] = e());
}
const jt = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, Xs = ["debug", "info", "warn", "error", "log", "assert", "trace"], tn = {};
function gr(r) {
  if (!("console" in ne)) return r();
  const e = ne.console, t = {}, n = Object.keys(tn);
  n.forEach((i) => {
    const s = tn[i];
    t[i] = e[i], e[i] = s;
  });
  try {
    return r();
  } finally {
    n.forEach((i) => {
      e[i] = t[i];
    });
  }
}
const K = en("logger", function() {
  let r = !1;
  const e = { enable: () => {
    r = !0;
  }, disable: () => {
    r = !1;
  }, isEnabled: () => r };
  return jt ? Xs.forEach((t) => {
    e[t] = (...n) => {
      r && gr(() => {
        ne.console[t](`Sentry Logger [${t}]:`, ...n);
      });
    };
  }) : Xs.forEach((t) => {
    e[t] = () => {
    };
  }), e;
}), Ct = "?", Ao = /\(error: (.*)\)/, To = /captureMessage|captureException/;
function xr(r) {
  return r[r.length - 1] || {};
}
const Oo = "<anonymous>";
function pt(r) {
  try {
    return r && typeof r == "function" && r.name || Oo;
  } catch {
    return Oo;
  }
}
function Po(r) {
  const e = r.exception;
  if (e) {
    const t = [];
    try {
      return e.values.forEach((n) => {
        n.stacktrace.frames && t.push(...n.stacktrace.frames);
      }), t;
    } catch {
      return;
    }
  }
}
const Gr = {}, xo = {};
function At(r, e) {
  Gr[r] = Gr[r] || [], Gr[r].push(e);
}
function Tt(r, e) {
  if (!xo[r]) {
    xo[r] = !0;
    try {
      e();
    } catch (t) {
      jt && K.error(`Error while instrumenting ${r}`, t);
    }
  }
}
function Ne(r, e) {
  const t = r && Gr[r];
  if (t) for (const n of t) try {
    n(e);
  } catch (i) {
    jt && K.error(`Error while triggering instrumentation handler.
Type: ${r}
Name: ${pt(n)}
Error:`, i);
  }
}
let En = null;
function Hf() {
  En = ne.onerror, ne.onerror = function(r, e, t, n, i) {
    return Ne("error", { column: n, error: i, line: t, msg: r, url: e }), !!En && En.apply(this, arguments);
  }, ne.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let An = null;
function Kf() {
  An = ne.onunhandledrejection, ne.onunhandledrejection = function(r) {
    return Ne("unhandledrejection", r), !An || An.apply(this, arguments);
  }, ne.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
function hn() {
  return La(ne), ne;
}
function La(r) {
  const e = r.__SENTRY__ = r.__SENTRY__ || {};
  return e.version = e.version || Et, e[Et] = e[Et] || {};
}
const Jd = Object.prototype.toString;
function Ra(r) {
  switch (Jd.call(r)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
    case "[object WebAssembly.Exception]":
      return !0;
    default:
      return Ot(r, Error);
  }
}
function er(r, e) {
  return Jd.call(r) === `[object ${e}]`;
}
function Hd(r) {
  return er(r, "ErrorEvent");
}
function Io(r) {
  return er(r, "DOMError");
}
function tt(r) {
  return er(r, "String");
}
function ja(r) {
  return typeof r == "object" && r !== null && "__sentry_template_string__" in r && "__sentry_template_values__" in r;
}
function Zs(r) {
  return r === null || ja(r) || typeof r != "object" && typeof r != "function";
}
function Kt(r) {
  return er(r, "Object");
}
function fn(r) {
  return typeof Event < "u" && Ot(r, Event);
}
function pn(r) {
  return !!(r && r.then && typeof r.then == "function");
}
function Ot(r, e) {
  try {
    return r instanceof e;
  } catch {
    return !1;
  }
}
function Kd(r) {
  return !(typeof r != "object" || r === null || !r.__isVue && !r._isVue);
}
const Da = ne;
function Qd(r, e = {}) {
  if (!r) return "<unknown>";
  try {
    let t = r;
    const n = 5, i = [];
    let s = 0, a = 0;
    const c = " > ", u = c.length;
    let l;
    const f = Array.isArray(e) ? e : e.keyAttrs, p = !Array.isArray(e) && e.maxStringLength || 80;
    for (; t && s++ < n && (l = Qf(t, f), !(l === "html" || s > 1 && a + i.length * u + l.length >= p)); ) i.push(l), a += l.length, t = t.parentNode;
    return i.reverse().join(c);
  } catch {
    return "<unknown>";
  }
}
function Qf(r, e) {
  const t = r, n = [];
  if (!t || !t.tagName) return "";
  if (Da.HTMLElement && t instanceof HTMLElement && t.dataset) {
    if (t.dataset.sentryComponent) return t.dataset.sentryComponent;
    if (t.dataset.sentryElement) return t.dataset.sentryElement;
  }
  n.push(t.tagName.toLowerCase());
  const i = e && e.length ? e.filter((a) => t.getAttribute(a)).map((a) => [a, t.getAttribute(a)]) : null;
  if (i && i.length) i.forEach((a) => {
    n.push(`[${a[0]}="${a[1]}"]`);
  });
  else {
    t.id && n.push(`#${t.id}`);
    const a = t.className;
    if (a && tt(a)) {
      const c = a.split(/\s+/);
      for (const u of c) n.push(`.${u}`);
    }
  }
  const s = ["aria-label", "type", "name", "title", "alt"];
  for (const a of s) {
    const c = t.getAttribute(a);
    c && n.push(`[${a}="${c}"]`);
  }
  return n.join("");
}
function Wt(r, e = 0) {
  return typeof r != "string" || e === 0 || r.length <= e ? r : `${r.slice(0, e)}...`;
}
function Lo(r, e) {
  if (!Array.isArray(r)) return "";
  const t = [];
  for (let n = 0; n < r.length; n++) {
    const i = r[n];
    try {
      Kd(i) ? t.push("[VueViewModel]") : t.push(String(i));
    } catch {
      t.push("[value cannot be serialized]");
    }
  }
  return t.join(e);
}
function Yf(r, e, t = !1) {
  return !!tt(r) && (er(e, "RegExp") ? e.test(r) : !!tt(e) && (t ? r === e : r.includes(e)));
}
function Ir(r, e = [], t = !1) {
  return e.some((n) => Yf(r, n, t));
}
function we(r, e, t) {
  if (!(e in r)) return;
  const n = r[e], i = t(n);
  typeof i == "function" && Yd(i, n);
  try {
    r[e] = i;
  } catch {
    jt && K.log(`Failed to replace method "${e}" in object`, r);
  }
}
function Pt(r, e, t) {
  try {
    Object.defineProperty(r, e, { value: t, writable: !0, configurable: !0 });
  } catch {
    jt && K.log(`Failed to add non-enumerable property "${e}" to object`, r);
  }
}
function Yd(r, e) {
  try {
    const t = e.prototype || {};
    r.prototype = e.prototype = t, Pt(r, "__sentry_original__", e);
  } catch {
  }
}
function Ba(r) {
  return r.__sentry_original__;
}
function Xd(r) {
  if (Ra(r)) return { message: r.message, name: r.name, stack: r.stack, ...jo(r) };
  if (fn(r)) {
    const e = { type: r.type, target: Ro(r.target), currentTarget: Ro(r.currentTarget), ...jo(r) };
    return typeof CustomEvent < "u" && Ot(r, CustomEvent) && (e.detail = r.detail), e;
  }
  return r;
}
function Ro(r) {
  try {
    return e = r, typeof Element < "u" && Ot(e, Element) ? Qd(r) : Object.prototype.toString.call(r);
  } catch {
    return "<unknown>";
  }
  var e;
}
function jo(r) {
  if (typeof r == "object" && r !== null) {
    const e = {};
    for (const t in r) Object.prototype.hasOwnProperty.call(r, t) && (e[t] = r[t]);
    return e;
  }
  return {};
}
function Oe(r) {
  return ea(r, /* @__PURE__ */ new Map());
}
function ea(r, e) {
  if ((function(t) {
    if (!Kt(t)) return !1;
    try {
      const n = Object.getPrototypeOf(t).constructor.name;
      return !n || n === "Object";
    } catch {
      return !0;
    }
  })(r)) {
    const t = e.get(r);
    if (t !== void 0) return t;
    const n = {};
    e.set(r, n);
    for (const i of Object.getOwnPropertyNames(r)) r[i] !== void 0 && (n[i] = ea(r[i], e));
    return n;
  }
  if (Array.isArray(r)) {
    const t = e.get(r);
    if (t !== void 0) return t;
    const n = [];
    return e.set(r, n), r.forEach((i) => {
      n.push(ea(i, e));
    }), n;
  }
  return r;
}
function mr() {
  return Date.now() / 1e3;
}
const nt = (function() {
  const { performance: r } = ne;
  if (!r || !r.now) return mr;
  const e = Date.now() - r.now(), t = r.timeOrigin == null ? e : r.timeOrigin;
  return () => (t + r.now()) / 1e3;
})();
function Pe() {
  const r = ne, e = r.crypto || r.msCrypto;
  let t = () => 16 * Math.random();
  try {
    if (e && e.randomUUID) return e.randomUUID().replace(/-/g, "");
    e && e.getRandomValues && (t = () => {
      const n = new Uint8Array(1);
      return e.getRandomValues(n), n[0];
    });
  } catch {
  }
  return ("10000000100040008000" + 1e11).replace(/[018]/g, (n) => (n ^ (15 & t()) >> n / 4).toString(16));
}
function Zd(r) {
  return r.exception && r.exception.values ? r.exception.values[0] : void 0;
}
function dt(r) {
  const { message: e, event_id: t } = r;
  if (e) return e;
  const n = Zd(r);
  return n ? n.type && n.value ? `${n.type}: ${n.value}` : n.type || n.value || t || "<unknown>" : t || "<unknown>";
}
function ta(r, e, t) {
  const n = r.exception = r.exception || {}, i = n.values = n.values || [], s = i[0] = i[0] || {};
  s.value || (s.value = e || ""), s.type || (s.type = "Error");
}
function Qt(r, e) {
  const t = Zd(r);
  if (!t) return;
  const n = t.mechanism;
  if (t.mechanism = { type: "generic", handled: !0, ...n, ...e }, e && "data" in e) {
    const i = { ...n && n.data, ...e.data };
    t.mechanism.data = i;
  }
}
function Do(r) {
  if ((function(e) {
    try {
      return e.__sentry_captured__;
    } catch {
    }
  })(r)) return !0;
  try {
    Pt(r, "__sentry_captured__", !0);
  } catch {
  }
  return !1;
}
var Ze;
function xt(r) {
  return new Te((e) => {
    e(r);
  });
}
function rn(r) {
  return new Te((e, t) => {
    t(r);
  });
}
(() => {
  const { performance: r } = ne;
  !r || !r.now || (r.now(), r.timing && r.timing.navigationStart);
})(), (function(r) {
  r[r.PENDING = 0] = "PENDING", r[r.RESOLVED = 1] = "RESOLVED", r[r.REJECTED = 2] = "REJECTED";
})(Ze || (Ze = {}));
class Te {
  constructor(e) {
    Te.prototype.__init.call(this), Te.prototype.__init2.call(this), Te.prototype.__init3.call(this), Te.prototype.__init4.call(this), this._state = Ze.PENDING, this._handlers = [];
    try {
      e(this._resolve, this._reject);
    } catch (t) {
      this._reject(t);
    }
  }
  then(e, t) {
    return new Te((n, i) => {
      this._handlers.push([!1, (s) => {
        if (e) try {
          n(e(s));
        } catch (a) {
          i(a);
        }
        else n(s);
      }, (s) => {
        if (t) try {
          n(t(s));
        } catch (a) {
          i(a);
        }
        else i(s);
      }]), this._executeHandlers();
    });
  }
  catch(e) {
    return this.then((t) => t, e);
  }
  finally(e) {
    return new Te((t, n) => {
      let i, s;
      return this.then((a) => {
        s = !1, i = a, e && e();
      }, (a) => {
        s = !0, i = a, e && e();
      }).then(() => {
        s ? n(i) : t(i);
      });
    });
  }
  __init() {
    this._resolve = (e) => {
      this._setResult(Ze.RESOLVED, e);
    };
  }
  __init2() {
    this._reject = (e) => {
      this._setResult(Ze.REJECTED, e);
    };
  }
  __init3() {
    this._setResult = (e, t) => {
      this._state === Ze.PENDING && (pn(t) ? t.then(this._resolve, this._reject) : (this._state = e, this._value = t, this._executeHandlers()));
    };
  }
  __init4() {
    this._executeHandlers = () => {
      if (this._state === Ze.PENDING) return;
      const e = this._handlers.slice();
      this._handlers = [], e.forEach((t) => {
        t[0] || (this._state === Ze.RESOLVED && t[1](this._value), this._state === Ze.REJECTED && t[2](this._value), t[0] = !0);
      });
    };
  }
}
function Xf(r) {
  const e = nt(), t = { sid: Pe(), init: !0, timestamp: e, started: e, duration: 0, status: "ok", errors: 0, ignoreDuration: !1, toJSON: () => (function(n) {
    return Oe({ sid: `${n.sid}`, init: n.init, started: new Date(1e3 * n.started).toISOString(), timestamp: new Date(1e3 * n.timestamp).toISOString(), status: n.status, errors: n.errors, did: typeof n.did == "number" || typeof n.did == "string" ? `${n.did}` : void 0, duration: n.duration, abnormal_mechanism: n.abnormal_mechanism, attrs: { release: n.release, environment: n.environment, ip_address: n.ipAddress, user_agent: n.userAgent } });
  })(t) };
  return r && Yt(t, r), t;
}
function Yt(r, e = {}) {
  if (e.user && (!r.ipAddress && e.user.ip_address && (r.ipAddress = e.user.ip_address), r.did || e.did || (r.did = e.user.id || e.user.email || e.user.username)), r.timestamp = e.timestamp || nt(), e.abnormal_mechanism && (r.abnormal_mechanism = e.abnormal_mechanism), e.ignoreDuration && (r.ignoreDuration = e.ignoreDuration), e.sid && (r.sid = e.sid.length === 32 ? e.sid : Pe()), e.init !== void 0 && (r.init = e.init), !r.did && e.did && (r.did = `${e.did}`), typeof e.started == "number" && (r.started = e.started), r.ignoreDuration) r.duration = void 0;
  else if (typeof e.duration == "number") r.duration = e.duration;
  else {
    const t = r.timestamp - r.started;
    r.duration = t >= 0 ? t : 0;
  }
  e.release && (r.release = e.release), e.environment && (r.environment = e.environment), !r.ipAddress && e.ipAddress && (r.ipAddress = e.ipAddress), !r.userAgent && e.userAgent && (r.userAgent = e.userAgent), typeof e.errors == "number" && (r.errors = e.errors), e.status && (r.status = e.status);
}
function Bo() {
  return Pe();
}
function ra() {
  return Pe().substring(16);
}
function gn(r, e, t = 2) {
  if (!e || typeof e != "object" || t <= 0) return e;
  if (r && e && Object.keys(e).length === 0) return r;
  const n = { ...r };
  for (const i in e) Object.prototype.hasOwnProperty.call(e, i) && (n[i] = gn(n[i], e[i], t - 1));
  return n;
}
const na = "_sentrySpan";
function Fo(r, e) {
  e ? Pt(r, na, e) : delete r[na];
}
function No(r) {
  return r[na];
}
class Fa {
  constructor() {
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = { traceId: Bo(), spanId: ra() };
  }
  clone() {
    const e = new Fa();
    return e._breadcrumbs = [...this._breadcrumbs], e._tags = { ...this._tags }, e._extra = { ...this._extra }, e._contexts = { ...this._contexts }, this._contexts.flags && (e._contexts.flags = { values: [...this._contexts.flags.values] }), e._user = this._user, e._level = this._level, e._session = this._session, e._transactionName = this._transactionName, e._fingerprint = this._fingerprint, e._eventProcessors = [...this._eventProcessors], e._requestSession = this._requestSession, e._attachments = [...this._attachments], e._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, e._propagationContext = { ...this._propagationContext }, e._client = this._client, e._lastEventId = this._lastEventId, Fo(e, No(this)), e;
  }
  setClient(e) {
    this._client = e;
  }
  setLastEventId(e) {
    this._lastEventId = e;
  }
  getClient() {
    return this._client;
  }
  lastEventId() {
    return this._lastEventId;
  }
  addScopeListener(e) {
    this._scopeListeners.push(e);
  }
  addEventProcessor(e) {
    return this._eventProcessors.push(e), this;
  }
  setUser(e) {
    return this._user = e || { email: void 0, id: void 0, ip_address: void 0, username: void 0 }, this._session && Yt(this._session, { user: e }), this._notifyScopeListeners(), this;
  }
  getUser() {
    return this._user;
  }
  getRequestSession() {
    return this._requestSession;
  }
  setRequestSession(e) {
    return this._requestSession = e, this;
  }
  setTags(e) {
    return this._tags = { ...this._tags, ...e }, this._notifyScopeListeners(), this;
  }
  setTag(e, t) {
    return this._tags = { ...this._tags, [e]: t }, this._notifyScopeListeners(), this;
  }
  setExtras(e) {
    return this._extra = { ...this._extra, ...e }, this._notifyScopeListeners(), this;
  }
  setExtra(e, t) {
    return this._extra = { ...this._extra, [e]: t }, this._notifyScopeListeners(), this;
  }
  setFingerprint(e) {
    return this._fingerprint = e, this._notifyScopeListeners(), this;
  }
  setLevel(e) {
    return this._level = e, this._notifyScopeListeners(), this;
  }
  setTransactionName(e) {
    return this._transactionName = e, this._notifyScopeListeners(), this;
  }
  setContext(e, t) {
    return t === null ? delete this._contexts[e] : this._contexts[e] = t, this._notifyScopeListeners(), this;
  }
  setSession(e) {
    return e ? this._session = e : delete this._session, this._notifyScopeListeners(), this;
  }
  getSession() {
    return this._session;
  }
  update(e) {
    if (!e) return this;
    const t = typeof e == "function" ? e(this) : e, [n, i] = t instanceof gt ? [t.getScopeData(), t.getRequestSession()] : Kt(t) ? [e, e.requestSession] : [], { tags: s, extra: a, user: c, contexts: u, level: l, fingerprint: f = [], propagationContext: p } = n || {};
    return this._tags = { ...this._tags, ...s }, this._extra = { ...this._extra, ...a }, this._contexts = { ...this._contexts, ...u }, c && Object.keys(c).length && (this._user = c), l && (this._level = l), f.length && (this._fingerprint = f), p && (this._propagationContext = p), i && (this._requestSession = i), this;
  }
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._session = void 0, Fo(this, void 0), this._attachments = [], this.setPropagationContext({ traceId: Bo() }), this._notifyScopeListeners(), this;
  }
  addBreadcrumb(e, t) {
    const n = typeof t == "number" ? t : 100;
    if (n <= 0) return this;
    const i = { timestamp: mr(), ...e };
    return this._breadcrumbs.push(i), this._breadcrumbs.length > n && (this._breadcrumbs = this._breadcrumbs.slice(-n), this._client && this._client.recordDroppedEvent("buffer_overflow", "log_item")), this._notifyScopeListeners(), this;
  }
  getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }
  clearBreadcrumbs() {
    return this._breadcrumbs = [], this._notifyScopeListeners(), this;
  }
  addAttachment(e) {
    return this._attachments.push(e), this;
  }
  clearAttachments() {
    return this._attachments = [], this;
  }
  getScopeData() {
    return { breadcrumbs: this._breadcrumbs, attachments: this._attachments, contexts: this._contexts, tags: this._tags, extra: this._extra, user: this._user, level: this._level, fingerprint: this._fingerprint || [], eventProcessors: this._eventProcessors, propagationContext: this._propagationContext, sdkProcessingMetadata: this._sdkProcessingMetadata, transactionName: this._transactionName, span: No(this) };
  }
  setSDKProcessingMetadata(e) {
    return this._sdkProcessingMetadata = gn(this._sdkProcessingMetadata, e, 2), this;
  }
  setPropagationContext(e) {
    return this._propagationContext = { spanId: ra(), ...e }, this;
  }
  getPropagationContext() {
    return this._propagationContext;
  }
  captureException(e, t) {
    const n = t && t.event_id ? t.event_id : Pe();
    if (!this._client) return K.warn("No client configured on scope - will not capture exception!"), n;
    const i = new Error("Sentry syntheticException");
    return this._client.captureException(e, { originalException: e, syntheticException: i, ...t, event_id: n }, this), n;
  }
  captureMessage(e, t, n) {
    const i = n && n.event_id ? n.event_id : Pe();
    if (!this._client) return K.warn("No client configured on scope - will not capture message!"), i;
    const s = new Error(e);
    return this._client.captureMessage(e, t, { originalException: e, syntheticException: s, ...n, event_id: i }, this), i;
  }
  captureEvent(e, t) {
    const n = t && t.event_id ? t.event_id : Pe();
    return this._client ? (this._client.captureEvent(e, { ...t, event_id: n }, this), n) : (K.warn("No client configured on scope - will not capture event!"), n);
  }
  _notifyScopeListeners() {
    this._notifyingListeners || (this._notifyingListeners = !0, this._scopeListeners.forEach((e) => {
      e(this);
    }), this._notifyingListeners = !1);
  }
}
const gt = Fa;
class Zf {
  constructor(e, t) {
    let n, i;
    n = e || new gt(), i = t || new gt(), this._stack = [{ scope: n }], this._isolationScope = i;
  }
  withScope(e) {
    const t = this._pushScope();
    let n;
    try {
      n = e(t);
    } catch (i) {
      throw this._popScope(), i;
    }
    return pn(n) ? n.then((i) => (this._popScope(), i), (i) => {
      throw this._popScope(), i;
    }) : (this._popScope(), n);
  }
  getClient() {
    return this.getStackTop().client;
  }
  getScope() {
    return this.getStackTop().scope;
  }
  getIsolationScope() {
    return this._isolationScope;
  }
  getStackTop() {
    return this._stack[this._stack.length - 1];
  }
  _pushScope() {
    const e = this.getScope().clone();
    return this._stack.push({ client: this.getClient(), scope: e }), e;
  }
  _popScope() {
    return !(this._stack.length <= 1) && !!this._stack.pop();
  }
}
function Xt() {
  const r = La(hn());
  return r.stack = r.stack || new Zf(en("defaultCurrentScope", () => new gt()), en("defaultIsolationScope", () => new gt()));
}
function ep(r) {
  return Xt().withScope(r);
}
function tp(r, e) {
  const t = Xt();
  return t.withScope(() => (t.getStackTop().scope = r, e(r)));
}
function $o(r) {
  return Xt().withScope(() => r(Xt().getIsolationScope()));
}
function Na(r) {
  const e = La(r);
  return e.acs ? e.acs : { withIsolationScope: $o, withScope: ep, withSetScope: tp, withSetIsolationScope: (t, n) => $o(n), getCurrentScope: () => Xt().getScope(), getIsolationScope: () => Xt().getIsolationScope() };
}
function Dt() {
  return Na(hn()).getCurrentScope();
}
function vr() {
  return Na(hn()).getIsolationScope();
}
function ve() {
  return Dt().getClient();
}
function rp(r) {
  const e = r.getPropagationContext(), { traceId: t, spanId: n, parentSpanId: i } = e;
  return Oe({ trace_id: t, span_id: n, parent_span_id: i });
}
function np(r) {
  const e = r._sentryMetrics;
  if (!e) return;
  const t = {};
  for (const [, [n, i]] of e)
    (t[n] || (t[n] = [])).push(Oe(i));
  return t;
}
const ip = /^sentry-/;
function sp(r) {
  const e = (function(n) {
    if (!(!n || !tt(n) && !Array.isArray(n)))
      return Array.isArray(n) ? n.reduce((i, s) => {
        const a = qo(s);
        return Object.entries(a).forEach(([c, u]) => {
          i[c] = u;
        }), i;
      }, {}) : qo(n);
  })(r);
  if (!e) return;
  const t = Object.entries(e).reduce((n, [i, s]) => (i.match(ip) && (n[i.slice(7)] = s), n), {});
  return Object.keys(t).length > 0 ? t : void 0;
}
function qo(r) {
  return r.split(",").map((e) => e.split("=").map((t) => decodeURIComponent(t.trim()))).reduce((e, [t, n]) => (t && n && (e[t] = n), e), {});
}
let Uo = !1;
function ap(r) {
  const { spanId: e, traceId: t, isRemote: n } = r.spanContext();
  return Oe({ parent_span_id: n ? e : $a(r).parent_span_id, span_id: n ? ra() : e, trace_id: t });
}
function Vo(r) {
  return typeof r == "number" ? zo(r) : Array.isArray(r) ? r[0] + r[1] / 1e9 : r instanceof Date ? zo(r.getTime()) : nt();
}
function zo(r) {
  return r > 9999999999 ? r / 1e3 : r;
}
function $a(r) {
  if ((function(e) {
    return typeof e.getSpanJSON == "function";
  })(r)) return r.getSpanJSON();
  try {
    const { spanId: e, traceId: t } = r.spanContext();
    if ((function(n) {
      const i = n;
      return !!(i.attributes && i.startTime && i.name && i.endTime && i.status);
    })(r)) {
      const { attributes: n, startTime: i, name: s, endTime: a, parentSpanId: c, status: u } = r;
      return Oe({ span_id: e, trace_id: t, data: n, description: s, parent_span_id: c, start_timestamp: Vo(i), timestamp: Vo(a) || void 0, status: op(u), op: n["sentry.op"], origin: n["sentry.origin"], _metrics_summary: np(r) });
    }
    return { span_id: e, trace_id: t };
  } catch {
    return {};
  }
}
function op(r) {
  if (r && r.code !== 0) return r.code === 1 ? "ok" : r.message || "unknown_error";
}
function eh(r) {
  return r._sentryRootSpan || r;
}
function cp() {
  Uo || (gr(() => {
    console.warn("[Sentry] Deprecation warning: Returning null from `beforeSendSpan` will be disallowed from SDK version 9.0.0 onwards. The callback will only support mutating spans. To drop certain spans, configure the respective integrations directly.");
  }), Uo = !0);
}
const qa = "production";
function th(r, e) {
  const t = e.getOptions(), { publicKey: n } = e.getDsn() || {}, i = Oe({ environment: t.environment || qa, release: t.release, public_key: n, trace_id: r });
  return e.emit("createDsc", i), i;
}
function up(r) {
  const e = ve();
  if (!e) return {};
  const t = eh(r), n = t._frozenDsc;
  if (n) return n;
  const i = t.spanContext().traceState, s = i && i.get("sentry.dsc"), a = s && sp(s);
  if (a) return a;
  const c = th(r.spanContext().traceId, e), u = $a(t), l = u.data || {}, f = l["sentry.sample_rate"];
  f != null && (c.sample_rate = `${f}`);
  const p = l["sentry.source"], y = u.description;
  return p !== "url" && y && (c.transaction = y), (function(M) {
    if (typeof __SENTRY_TRACING__ == "boolean" && !__SENTRY_TRACING__) return !1;
    const b = ve(), v = b && b.getOptions();
    return !!v && (v.enableTracing || "tracesSampleRate" in v || "tracesSampler" in v);
  })() && (c.sampled = String((function(M) {
    const { traceFlags: b } = M.spanContext();
    return b === 1;
  })(t))), e.emit("createDsc", c, t), c;
}
const lp = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function nn(r, e = !1) {
  const { host: t, path: n, pass: i, port: s, projectId: a, protocol: c, publicKey: u } = r;
  return `${c}://${u}${e && i ? `:${i}` : ""}@${t}${s ? `:${s}` : ""}/${n && `${n}/`}${a}`;
}
function Wo(r) {
  return { protocol: r.protocol, publicKey: r.publicKey || "", pass: r.pass || "", host: r.host, port: r.port || "", path: r.path || "", projectId: r.projectId };
}
function dp(r) {
  const e = typeof r == "string" ? (function(t) {
    const n = lp.exec(t);
    if (!n) return void gr(() => {
      console.error(`Invalid Sentry Dsn: ${t}`);
    });
    const [i, s, a = "", c = "", u = "", l = ""] = n.slice(1);
    let f = "", p = l;
    const y = p.split("/");
    if (y.length > 1 && (f = y.slice(0, -1).join("/"), p = y.pop()), p) {
      const M = p.match(/^\d+/);
      M && (p = M[0]);
    }
    return Wo({ host: c, pass: a, path: f, projectId: p, port: u, protocol: i, publicKey: s });
  })(r) : Wo(r);
  if (e && (function(t) {
    if (!jt) return !0;
    const { port: n, projectId: i, protocol: s } = t;
    return !(["protocol", "publicKey", "host", "projectId"].find((a) => !t[a] && (K.error(`Invalid Sentry Dsn: ${a} missing`), !0)) || (i.match(/^\d+$/) ? /* @__PURE__ */ (function(a) {
      return a === "http" || a === "https";
    })(s) ? n && isNaN(parseInt(n, 10)) && (K.error(`Invalid Sentry Dsn: Invalid port ${n}`), 1) : (K.error(`Invalid Sentry Dsn: Invalid protocol ${s}`), 1) : (K.error(`Invalid Sentry Dsn: Invalid projectId ${i}`), 1)));
  })(e)) return e;
}
function et(r, e = 100, t = 1 / 0) {
  try {
    return ia("", r, e, t);
  } catch (n) {
    return { ERROR: `**non-serializable** (${n})` };
  }
}
function rh(r, e = 3, t = 102400) {
  const n = et(r, e);
  return i = n, (function(s) {
    return ~-encodeURI(s).split(/%..|./).length;
  })(JSON.stringify(i)) > t ? rh(r, e - 1, t) : n;
  var i;
}
function ia(r, e, t = 1 / 0, n = 1 / 0, i = /* @__PURE__ */ (function() {
  const s = typeof WeakSet == "function", a = s ? /* @__PURE__ */ new WeakSet() : [];
  return [function(c) {
    if (s) return !!a.has(c) || (a.add(c), !1);
    for (let u = 0; u < a.length; u++) if (a[u] === c) return !0;
    return a.push(c), !1;
  }, function(c) {
    if (s) a.delete(c);
    else for (let u = 0; u < a.length; u++) if (a[u] === c) {
      a.splice(u, 1);
      break;
    }
  }];
})()) {
  const [s, a] = i;
  if (e == null || ["boolean", "string"].includes(typeof e) || typeof e == "number" && Number.isFinite(e)) return e;
  const c = (function(M, b) {
    try {
      if (M === "domain" && b && typeof b == "object" && b._events) return "[Domain]";
      if (M === "domainEmitter") return "[DomainEmitter]";
      if (typeof global < "u" && b === global) return "[Global]";
      if (typeof window < "u" && b === window) return "[Window]";
      if (typeof document < "u" && b === document) return "[Document]";
      if (Kd(b)) return "[VueViewModel]";
      if (Kt(v = b) && "nativeEvent" in v && "preventDefault" in v && "stopPropagation" in v) return "[SyntheticEvent]";
      if (typeof b == "number" && !Number.isFinite(b)) return `[${b}]`;
      if (typeof b == "function") return `[Function: ${pt(b)}]`;
      if (typeof b == "symbol") return `[${String(b)}]`;
      if (typeof b == "bigint") return `[BigInt: ${String(b)}]`;
      const C = (function(E) {
        const O = Object.getPrototypeOf(E);
        return O ? O.constructor.name : "null prototype";
      })(b);
      return /^HTML(\w*)Element$/.test(C) ? `[HTMLElement: ${C}]` : `[object ${C}]`;
    } catch (C) {
      return `**non-serializable** (${C})`;
    }
    var v;
  })(r, e);
  if (!c.startsWith("[object ")) return c;
  if (e.__sentry_skip_normalization__) return e;
  const u = typeof e.__sentry_override_normalization_depth__ == "number" ? e.__sentry_override_normalization_depth__ : t;
  if (u === 0) return c.replace("object ", "");
  if (s(e)) return "[Circular ~]";
  const l = e;
  if (l && typeof l.toJSON == "function") try {
    return ia("", l.toJSON(), u - 1, n, i);
  } catch {
  }
  const f = Array.isArray(e) ? [] : {};
  let p = 0;
  const y = Xd(e);
  for (const M in y) {
    if (!Object.prototype.hasOwnProperty.call(y, M)) continue;
    if (p >= n) {
      f[M] = "[MaxProperties ~]";
      break;
    }
    const b = y[M];
    f[M] = ia(M, b, u - 1, n, i), p++;
  }
  return a(e), f;
}
function pr(r, e = []) {
  return [r, e];
}
function hp(r, e) {
  const [t, n] = r;
  return [t, [...n, e]];
}
function Go(r, e) {
  const t = r[1];
  for (const n of t)
    if (e(n, n[0].type)) return !0;
  return !1;
}
function sa(r) {
  return ne.__SENTRY__ && ne.__SENTRY__.encodePolyfill ? ne.__SENTRY__.encodePolyfill(r) : new TextEncoder().encode(r);
}
function fp(r) {
  const [e, t] = r;
  let n = JSON.stringify(e);
  function i(s) {
    typeof n == "string" ? n = typeof s == "string" ? n + s : [sa(n), s] : n.push(typeof s == "string" ? sa(s) : s);
  }
  for (const s of t) {
    const [a, c] = s;
    if (i(`
${JSON.stringify(a)}
`), typeof c == "string" || c instanceof Uint8Array) i(c);
    else {
      let u;
      try {
        u = JSON.stringify(c);
      } catch {
        u = JSON.stringify(et(c));
      }
      i(u);
    }
  }
  return typeof n == "string" ? n : (function(s) {
    const a = s.reduce((l, f) => l + f.length, 0), c = new Uint8Array(a);
    let u = 0;
    for (const l of s) c.set(l, u), u += l.length;
    return c;
  })(n);
}
function pp(r) {
  const e = typeof r.data == "string" ? sa(r.data) : r.data;
  return [Oe({ type: "attachment", length: e.length, filename: r.filename, content_type: r.contentType, attachment_type: r.attachmentType }), e];
}
const gp = { session: "session", sessions: "session", attachment: "attachment", transaction: "transaction", event: "error", client_report: "internal", user_report: "default", profile: "profile", profile_chunk: "profile", replay_event: "replay", replay_recording: "replay", check_in: "monitor", feedback: "feedback", span: "span", statsd: "metric_bucket", raw_security: "security" };
function Jo(r) {
  return gp[r];
}
function nh(r) {
  if (!r || !r.sdk) return;
  const { name: e, version: t } = r.sdk;
  return { name: e, version: t };
}
function mp(r, e, t, n) {
  const i = nh(t), s = r.type && r.type !== "replay_event" ? r.type : "event";
  (function(c, u) {
    u && (c.sdk = c.sdk || {}, c.sdk.name = c.sdk.name || u.name, c.sdk.version = c.sdk.version || u.version, c.sdk.integrations = [...c.sdk.integrations || [], ...u.integrations || []], c.sdk.packages = [...c.sdk.packages || [], ...u.packages || []]);
  })(r, t && t.sdk);
  const a = (function(c, u, l, f) {
    const p = c.sdkProcessingMetadata && c.sdkProcessingMetadata.dynamicSamplingContext;
    return { event_id: c.event_id, sent_at: (/* @__PURE__ */ new Date()).toISOString(), ...u && { sdk: u }, ...!!l && f && { dsn: nn(f) }, ...p && { trace: Oe({ ...p }) } };
  })(r, i, n, e);
  return delete r.sdkProcessingMetadata, pr(a, [[{ type: s }, r]]);
}
function aa(r, e, t, n = 0) {
  return new Te((i, s) => {
    const a = r[n];
    if (e === null || typeof a != "function") i(e);
    else {
      const c = a({ ...e }, t);
      ae && a.id && c === null && K.log(`Event processor "${a.id}" dropped event`), pn(c) ? c.then((u) => aa(r, u, t, n + 1).then(i)).then(null, s) : aa(r, c, t, n + 1).then(i).then(null, s);
    }
  });
}
let Lr, Ho, Tn;
function vp(r, e) {
  const { fingerprint: t, span: n, breadcrumbs: i, sdkProcessingMetadata: s } = e;
  (function(a, c) {
    const { extra: u, tags: l, user: f, contexts: p, level: y, transactionName: M } = c, b = Oe(u);
    b && Object.keys(b).length && (a.extra = { ...b, ...a.extra });
    const v = Oe(l);
    v && Object.keys(v).length && (a.tags = { ...v, ...a.tags });
    const C = Oe(f);
    C && Object.keys(C).length && (a.user = { ...C, ...a.user });
    const E = Oe(p);
    E && Object.keys(E).length && (a.contexts = { ...E, ...a.contexts }), y && (a.level = y), M && a.type !== "transaction" && (a.transaction = M);
  })(r, e), n && (function(a, c) {
    a.contexts = { trace: ap(c), ...a.contexts }, a.sdkProcessingMetadata = { dynamicSamplingContext: up(c), ...a.sdkProcessingMetadata };
    const u = eh(c), l = $a(u).description;
    l && !a.transaction && a.type === "transaction" && (a.transaction = l);
  })(r, n), (function(a, c) {
    a.fingerprint = a.fingerprint ? Array.isArray(a.fingerprint) ? a.fingerprint : [a.fingerprint] : [], c && (a.fingerprint = a.fingerprint.concat(c)), a.fingerprint && !a.fingerprint.length && delete a.fingerprint;
  })(r, t), (function(a, c) {
    const u = [...a.breadcrumbs || [], ...c];
    a.breadcrumbs = u.length ? u : void 0;
  })(r, i), (function(a, c) {
    a.sdkProcessingMetadata = { ...a.sdkProcessingMetadata, ...c };
  })(r, s);
}
function Ko(r, e) {
  const { extra: t, tags: n, user: i, contexts: s, level: a, sdkProcessingMetadata: c, breadcrumbs: u, fingerprint: l, eventProcessors: f, attachments: p, propagationContext: y, transactionName: M, span: b } = e;
  Rr(r, "extra", t), Rr(r, "tags", n), Rr(r, "user", i), Rr(r, "contexts", s), r.sdkProcessingMetadata = gn(r.sdkProcessingMetadata, c, 2), a && (r.level = a), M && (r.transactionName = M), b && (r.span = b), u.length && (r.breadcrumbs = [...r.breadcrumbs, ...u]), l.length && (r.fingerprint = [...r.fingerprint, ...l]), f.length && (r.eventProcessors = [...r.eventProcessors, ...f]), p.length && (r.attachments = [...r.attachments, ...p]), r.propagationContext = { ...r.propagationContext, ...y };
}
function Rr(r, e, t) {
  r[e] = gn(r[e], t, 1);
}
function bp(r, e, t, n, i, s) {
  const { normalizeDepth: a = 3, normalizeMaxBreadth: c = 1e3 } = r, u = { ...e, event_id: e.event_id || t.event_id || Pe(), timestamp: e.timestamp || mr() }, l = t.integrations || r.integrations.map((b) => b.name);
  (function(b, v) {
    const { environment: C, release: E, dist: O, maxValueLength: I = 250 } = v;
    b.environment = b.environment || C || qa, !b.release && E && (b.release = E), !b.dist && O && (b.dist = O), b.message && (b.message = Wt(b.message, I));
    const k = b.exception && b.exception.values && b.exception.values[0];
    k && k.value && (k.value = Wt(k.value, I));
    const S = b.request;
    S && S.url && (S.url = Wt(S.url, I));
  })(u, r), (function(b, v) {
    v.length > 0 && (b.sdk = b.sdk || {}, b.sdk.integrations = [...b.sdk.integrations || [], ...v]);
  })(u, l), i && i.emit("applyFrameMetadata", e), e.type === void 0 && (function(b, v) {
    const C = (function(E) {
      const O = ne._sentryDebugIds;
      if (!O) return {};
      const I = Object.keys(O);
      return Tn && I.length === Ho || (Ho = I.length, Tn = I.reduce((k, S) => {
        Lr || (Lr = {});
        const T = Lr[S];
        if (T) k[T[0]] = T[1];
        else {
          const L = E(S);
          for (let D = L.length - 1; D >= 0; D--) {
            const N = L[D], $ = N && N.filename, U = O[S];
            if ($ && U) {
              k[$] = U, Lr[S] = [$, U];
              break;
            }
          }
        }
        return k;
      }, {})), Tn;
    })(v);
    try {
      b.exception.values.forEach((E) => {
        E.stacktrace.frames.forEach((O) => {
          C && O.filename && (O.debug_id = C[O.filename]);
        });
      });
    } catch {
    }
  })(u, r.stackParser);
  const f = (function(b, v) {
    if (!v) return b;
    const C = b ? b.clone() : new gt();
    return C.update(v), C;
  })(n, t.captureContext);
  t.mechanism && Qt(u, t.mechanism);
  const p = i ? i.getEventProcessors() : [], y = en("globalScope", () => new gt()).getScopeData();
  s && Ko(y, s.getScopeData()), f && Ko(y, f.getScopeData());
  const M = [...t.attachments || [], ...y.attachments];
  return M.length && (t.attachments = M), vp(u, y), aa([...p, ...y.eventProcessors], u, t).then((b) => (b && (function(v) {
    const C = {};
    try {
      v.exception.values.forEach((O) => {
        O.stacktrace.frames.forEach((I) => {
          I.debug_id && (I.abs_path ? C[I.abs_path] = I.debug_id : I.filename && (C[I.filename] = I.debug_id), delete I.debug_id);
        });
      });
    } catch {
    }
    if (Object.keys(C).length === 0) return;
    v.debug_meta = v.debug_meta || {}, v.debug_meta.images = v.debug_meta.images || [];
    const E = v.debug_meta.images;
    Object.entries(C).forEach(([O, I]) => {
      E.push({ type: "sourcemap", code_file: O, debug_id: I });
    });
  })(b), typeof a == "number" && a > 0 ? (function(v, C, E) {
    if (!v) return null;
    const O = { ...v, ...v.breadcrumbs && { breadcrumbs: v.breadcrumbs.map((I) => ({ ...I, ...I.data && { data: et(I.data, C, E) } })) }, ...v.user && { user: et(v.user, C, E) }, ...v.contexts && { contexts: et(v.contexts, C, E) }, ...v.extra && { extra: et(v.extra, C, E) } };
    return v.contexts && v.contexts.trace && O.contexts && (O.contexts.trace = v.contexts.trace, v.contexts.trace.data && (O.contexts.trace.data = et(v.contexts.trace.data, C, E))), v.spans && (O.spans = v.spans.map((I) => ({ ...I, ...I.data && { data: et(I.data, C, E) } }))), v.contexts && v.contexts.flags && O.contexts && (O.contexts.flags = et(v.contexts.flags, 3, E)), O;
  })(b, a, c) : b));
}
function Qo(r, e) {
  return Dt().captureEvent(r, e);
}
function Yo(r) {
  const e = ve(), t = vr(), n = Dt(), { release: i, environment: s = qa } = e && e.getOptions() || {}, { userAgent: a } = ne.navigator || {}, c = Xf({ release: i, environment: s, user: n.getUser() || t.getUser(), ...a && { userAgent: a }, ...r }), u = t.getSession();
  return u && u.status === "ok" && Yt(u, { status: "exited" }), ih(), t.setSession(c), n.setSession(c), c;
}
function ih() {
  const r = vr(), e = Dt(), t = e.getSession() || r.getSession();
  t && (function(n, i) {
    let s = {};
    n.status === "ok" && (s = { status: "exited" }), Yt(n, s);
  })(t), sh(), r.setSession(), e.setSession();
}
function sh() {
  const r = vr(), e = Dt(), t = ve(), n = e.getSession() || r.getSession();
  n && t && t.captureSession(n);
}
function Xo(r = !1) {
  r ? ih() : sh();
}
function yp(r, e, t) {
  return e || `${(function(n) {
    return `${(function(i) {
      const s = i.protocol ? `${i.protocol}:` : "", a = i.port ? `:${i.port}` : "";
      return `${s}//${i.host}${a}${i.path ? `/${i.path}` : ""}/api/`;
    })(n)}${n.projectId}/envelope/`;
  })(r)}?${(function(n, i) {
    const s = { sentry_version: "7" };
    return n.publicKey && (s.sentry_key = n.publicKey), i && (s.sentry_client = `${i.name}/${i.version}`), new URLSearchParams(s).toString();
  })(r, t)}`;
}
const Zo = [];
function ec(r, e) {
  for (const t of e) t && t.afterAllSetup && t.afterAllSetup(r);
}
function tc(r, e, t) {
  if (t[e.name]) ae && K.log(`Integration skipped because it was already installed: ${e.name}`);
  else {
    if (t[e.name] = e, Zo.indexOf(e.name) === -1 && typeof e.setupOnce == "function" && (e.setupOnce(), Zo.push(e.name)), e.setup && typeof e.setup == "function" && e.setup(r), typeof e.preprocessEvent == "function") {
      const n = e.preprocessEvent.bind(e);
      r.on("preprocessEvent", (i, s) => n(i, s, r));
    }
    if (typeof e.processEvent == "function") {
      const n = e.processEvent.bind(e), i = Object.assign((s, a) => n(s, a, r), { id: e.name });
      r.addEventProcessor(i);
    }
    ae && K.log(`Integration installed: ${e.name}`);
  }
}
class Be extends Error {
  constructor(e, t = "warn") {
    super(e), this.message = e, this.logLevel = t;
  }
}
const rc = "Not capturing exception because it's already been captured.";
class _p {
  constructor(e) {
    if (this._options = e, this._integrations = {}, this._numProcessing = 0, this._outcomes = {}, this._hooks = {}, this._eventProcessors = [], e.dsn ? this._dsn = dp(e.dsn) : ae && K.warn("No DSN provided, client will not send events."), this._dsn) {
      const n = yp(this._dsn, e.tunnel, e._metadata ? e._metadata.sdk : void 0);
      this._transport = e.transport({ tunnel: this._options.tunnel, recordDroppedEvent: this.recordDroppedEvent.bind(this), ...e.transportOptions, url: n });
    }
    const t = ["enableTracing", "tracesSampleRate", "tracesSampler"].find((n) => n in e && e[n] == null);
    t && gr(() => {
      console.warn(`[Sentry] Deprecation warning: \`${t}\` is set to undefined, which leads to tracing being enabled. In v9, a value of \`undefined\` will result in tracing being disabled.`);
    });
  }
  captureException(e, t, n) {
    const i = Pe();
    if (Do(e)) return ae && K.log(rc), i;
    const s = { event_id: i, ...t };
    return this._process(this.eventFromException(e, s).then((a) => this._captureEvent(a, s, n))), s.event_id;
  }
  captureMessage(e, t, n, i) {
    const s = { event_id: Pe(), ...n }, a = ja(e) ? e : String(e), c = Zs(e) ? this.eventFromMessage(a, t, s) : this.eventFromException(e, s);
    return this._process(c.then((u) => this._captureEvent(u, s, i))), s.event_id;
  }
  captureEvent(e, t, n) {
    const i = Pe();
    if (t && t.originalException && Do(t.originalException)) return ae && K.log(rc), i;
    const s = { event_id: i, ...t }, a = (e.sdkProcessingMetadata || {}).capturedSpanScope;
    return this._process(this._captureEvent(e, s, a || n)), s.event_id;
  }
  captureSession(e) {
    typeof e.release != "string" ? ae && K.warn("Discarded session because of missing or non-string release") : (this.sendSession(e), Yt(e, { init: !1 }));
  }
  getDsn() {
    return this._dsn;
  }
  getOptions() {
    return this._options;
  }
  getSdkMetadata() {
    return this._options._metadata;
  }
  getTransport() {
    return this._transport;
  }
  flush(e) {
    const t = this._transport;
    return t ? (this.emit("flush"), this._isClientDoneProcessing(e).then((n) => t.flush(e).then((i) => n && i))) : xt(!0);
  }
  close(e) {
    return this.flush(e).then((t) => (this.getOptions().enabled = !1, this.emit("close"), t));
  }
  getEventProcessors() {
    return this._eventProcessors;
  }
  addEventProcessor(e) {
    this._eventProcessors.push(e);
  }
  init() {
    (this._isEnabled() || this._options.integrations.some(({ name: e }) => e.startsWith("Spotlight"))) && this._setupIntegrations();
  }
  getIntegrationByName(e) {
    return this._integrations[e];
  }
  addIntegration(e) {
    const t = this._integrations[e.name];
    tc(this, e, this._integrations), t || ec(this, [e]);
  }
  sendEvent(e, t = {}) {
    this.emit("beforeSendEvent", e, t);
    let n = mp(e, this._dsn, this._options._metadata, this._options.tunnel);
    for (const s of t.attachments || []) n = hp(n, pp(s));
    const i = this.sendEnvelope(n);
    i && i.then((s) => this.emit("afterSendEvent", e, s), null);
  }
  sendSession(e) {
    const t = (function(n, i, s, a) {
      const c = nh(s);
      return pr({ sent_at: (/* @__PURE__ */ new Date()).toISOString(), ...c && { sdk: c }, ...!!a && i && { dsn: nn(i) } }, ["aggregates" in n ? [{ type: "sessions" }, n] : [{ type: "session" }, n.toJSON()]]);
    })(e, this._dsn, this._options._metadata, this._options.tunnel);
    this.sendEnvelope(t);
  }
  recordDroppedEvent(e, t, n) {
    if (this._options.sendClientReports) {
      const i = typeof n == "number" ? n : 1, s = `${e}:${t}`;
      ae && K.log(`Recording outcome: "${s}"${i > 1 ? ` (${i} times)` : ""}`), this._outcomes[s] = (this._outcomes[s] || 0) + i;
    }
  }
  on(e, t) {
    const n = this._hooks[e] = this._hooks[e] || [];
    return n.push(t), () => {
      const i = n.indexOf(t);
      i > -1 && n.splice(i, 1);
    };
  }
  emit(e, ...t) {
    const n = this._hooks[e];
    n && n.forEach((i) => i(...t));
  }
  sendEnvelope(e) {
    return this.emit("beforeEnvelope", e), this._isEnabled() && this._transport ? this._transport.send(e).then(null, (t) => (ae && K.error("Error while sending envelope:", t), t)) : (ae && K.error("Transport disabled"), xt({}));
  }
  _setupIntegrations() {
    const { integrations: e } = this._options;
    this._integrations = (function(t, n) {
      const i = {};
      return n.forEach((s) => {
        s && tc(t, s, i);
      }), i;
    })(this, e), ec(this, e);
  }
  _updateSessionFromEvent(e, t) {
    let n = t.level === "fatal", i = !1;
    const s = t.exception && t.exception.values;
    if (s) {
      i = !0;
      for (const c of s) {
        const u = c.mechanism;
        if (u && u.handled === !1) {
          n = !0;
          break;
        }
      }
    }
    const a = e.status === "ok";
    (a && e.errors === 0 || a && n) && (Yt(e, { ...n && { status: "crashed" }, errors: e.errors || Number(i || n) }), this.captureSession(e));
  }
  _isClientDoneProcessing(e) {
    return new Te((t) => {
      let n = 0;
      const i = setInterval(() => {
        this._numProcessing == 0 ? (clearInterval(i), t(!0)) : (n += 1, e && n >= e && (clearInterval(i), t(!1)));
      }, 1);
    });
  }
  _isEnabled() {
    return this.getOptions().enabled !== !1 && this._transport !== void 0;
  }
  _prepareEvent(e, t, n = Dt(), i = vr()) {
    const s = this.getOptions(), a = Object.keys(this._integrations);
    return !t.integrations && a.length > 0 && (t.integrations = a), this.emit("preprocessEvent", e, t), e.type || i.setLastEventId(e.event_id || t.event_id), bp(s, e, t, n, this, i).then((c) => {
      if (c === null) return c;
      c.contexts = { trace: rp(n), ...c.contexts };
      const u = (function(l, f) {
        const p = f.getPropagationContext();
        return p.dsc || th(p.traceId, l);
      })(this, n);
      return c.sdkProcessingMetadata = { dynamicSamplingContext: u, ...c.sdkProcessingMetadata }, c;
    });
  }
  _captureEvent(e, t = {}, n) {
    return this._processEvent(e, t, n).then((i) => i.event_id, (i) => {
      ae && (i instanceof Be && i.logLevel === "log" ? K.log(i.message) : K.warn(i));
    });
  }
  _processEvent(e, t, n) {
    const i = this.getOptions(), { sampleRate: s } = i, a = ic(e), c = nc(e), u = e.type || "error", l = `before send for type \`${u}\``, f = s === void 0 ? void 0 : (function(M) {
      if (typeof M == "boolean") return Number(M);
      const b = typeof M == "string" ? parseFloat(M) : M;
      if (!(typeof b != "number" || isNaN(b) || b < 0 || b > 1)) return b;
      ae && K.warn(`[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(M)} of type ${JSON.stringify(typeof M)}.`);
    })(s);
    if (c && typeof f == "number" && Math.random() > f) return this.recordDroppedEvent("sample_rate", "error", e), rn(new Be(`Discarding event because it's not included in the random sample (sampling rate = ${s})`, "log"));
    const p = u === "replay_event" ? "replay" : u, y = (e.sdkProcessingMetadata || {}).capturedSpanIsolationScope;
    return this._prepareEvent(e, t, n, y).then((M) => {
      if (M === null) throw this.recordDroppedEvent("event_processor", p, e), new Be("An event processor returned `null`, will not send event.", "log");
      if (t.data && t.data.__sentry__ === !0) return M;
      const b = (function(v, C, E, O) {
        const { beforeSend: I, beforeSendTransaction: k, beforeSendSpan: S } = C;
        if (nc(E) && I) return I(E, O);
        if (ic(E)) {
          if (E.spans && S) {
            const T = [];
            for (const L of E.spans) {
              const D = S(L);
              D ? T.push(D) : (cp(), v.recordDroppedEvent("before_send", "span"));
            }
            E.spans = T;
          }
          if (k) {
            if (E.spans) {
              const T = E.spans.length;
              E.sdkProcessingMetadata = { ...E.sdkProcessingMetadata, spanCountBeforeProcessing: T };
            }
            return k(E, O);
          }
        }
        return E;
      })(this, i, M, t);
      return (function(v, C) {
        const E = `${C} must return \`null\` or a valid event.`;
        if (pn(v)) return v.then((O) => {
          if (!Kt(O) && O !== null) throw new Be(E);
          return O;
        }, (O) => {
          throw new Be(`${C} rejected with ${O}`);
        });
        if (!Kt(v) && v !== null) throw new Be(E);
        return v;
      })(b, l);
    }).then((M) => {
      if (M === null) {
        if (this.recordDroppedEvent("before_send", p, e), a) {
          const C = 1 + (e.spans || []).length;
          this.recordDroppedEvent("before_send", "span", C);
        }
        throw new Be(`${l} returned \`null\`, will not send event.`, "log");
      }
      const b = n && n.getSession();
      if (!a && b && this._updateSessionFromEvent(b, M), a) {
        const C = (M.sdkProcessingMetadata && M.sdkProcessingMetadata.spanCountBeforeProcessing || 0) - (M.spans ? M.spans.length : 0);
        C > 0 && this.recordDroppedEvent("before_send", "span", C);
      }
      const v = M.transaction_info;
      if (a && v && M.transaction !== e.transaction) {
        const C = "custom";
        M.transaction_info = { ...v, source: C };
      }
      return this.sendEvent(M, t), M;
    }).then(null, (M) => {
      throw M instanceof Be ? M : (this.captureException(M, { data: { __sentry__: !0 }, originalException: M }), new Be(`Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${M}`));
    });
  }
  _process(e) {
    this._numProcessing++, e.then((t) => (this._numProcessing--, t), (t) => (this._numProcessing--, t));
  }
  _clearOutcomes() {
    const e = this._outcomes;
    return this._outcomes = {}, Object.entries(e).map(([t, n]) => {
      const [i, s] = t.split(":");
      return { reason: i, category: s, quantity: n };
    });
  }
  _flushOutcomes() {
    ae && K.log("Flushing outcomes...");
    const e = this._clearOutcomes();
    if (e.length === 0) return void (ae && K.log("No outcomes to send"));
    if (!this._dsn) return void (ae && K.log("No dsn provided, will not send outcomes"));
    ae && K.log("Sending outcomes:", e);
    const t = (n = e, pr((i = this._options.tunnel && nn(this._dsn)) ? { dsn: i } : {}, [[{ type: "client_report" }, { timestamp: s || mr(), discarded_events: n }]]));
    var n, i, s;
    this.sendEnvelope(t);
  }
}
function nc(r) {
  return r.type === void 0;
}
function ic(r) {
  return r.type === "transaction";
}
function wp(r) {
  const e = [];
  function t(n) {
    return e.splice(e.indexOf(n), 1)[0] || Promise.resolve(void 0);
  }
  return { $: e, add: function(n) {
    if (!(r === void 0 || e.length < r)) return rn(new Be("Not adding Promise because buffer limit was reached."));
    const i = n();
    return e.indexOf(i) === -1 && e.push(i), i.then(() => t(i)).then(null, () => t(i).then(null, () => {
    })), i;
  }, drain: function(n) {
    return new Te((i, s) => {
      let a = e.length;
      if (!a) return i(!0);
      const c = setTimeout(() => {
        n && n > 0 && i(!1);
      }, n);
      e.forEach((u) => {
        xt(u).then(() => {
          --a || (clearTimeout(c), i(!0));
        }, s);
      });
    });
  } };
}
function Sp(r, { statusCode: e, headers: t }, n = Date.now()) {
  const i = { ...r }, s = t && t["x-sentry-rate-limits"], a = t && t["retry-after"];
  if (s) for (const c of s.trim().split(",")) {
    const [u, l, , , f] = c.split(":", 5), p = parseInt(u, 10), y = 1e3 * (isNaN(p) ? 60 : p);
    if (l) for (const M of l.split(";")) M === "metric_bucket" && f && !f.split(";").includes("custom") || (i[M] = n + y);
    else i.all = n + y;
  }
  else a ? i.all = n + (function(c, u = Date.now()) {
    const l = parseInt(`${c}`, 10);
    if (!isNaN(l)) return 1e3 * l;
    const f = Date.parse(`${c}`);
    return isNaN(f) ? 6e4 : f - u;
  })(a, n) : e === 429 && (i.all = n + 6e4);
  return i;
}
function kp(r, e, t = wp(r.bufferSize || 64)) {
  let n = {};
  return { send: function(i) {
    const s = [];
    if (Go(i, (u, l) => {
      const f = Jo(l);
      if ((function(p, y, M = Date.now()) {
        return (function(b, v) {
          return b[v] || b.all || 0;
        })(p, y) > M;
      })(n, f)) {
        const p = sc(u, l);
        r.recordDroppedEvent("ratelimit_backoff", f, p);
      } else s.push(u);
    }), s.length === 0) return xt({});
    const a = pr(i[0], s), c = (u) => {
      Go(a, (l, f) => {
        const p = sc(l, f);
        r.recordDroppedEvent(u, Jo(f), p);
      });
    };
    return t.add(() => e({ body: fp(a) }).then((u) => (u.statusCode !== void 0 && (u.statusCode < 200 || u.statusCode >= 300) && ae && K.warn(`Sentry responded with status code ${u.statusCode} to sent event.`), n = Sp(n, u), u), (u) => {
      throw c("network_error"), u;
    })).then((u) => u, (u) => {
      if (u instanceof Be) return ae && K.error("Skipped sending event because buffer is full."), c("queue_overflow"), xt({});
      throw u;
    });
  }, flush: (i) => t.drain(i) };
}
function sc(r, e) {
  if (e === "event" || e === "transaction") return Array.isArray(r) ? r[1] : void 0;
}
const Mp = 100;
function yt(r, e) {
  const t = ve(), n = vr();
  if (!t) return;
  const { beforeBreadcrumb: i = null, maxBreadcrumbs: s = Mp } = t.getOptions();
  if (s <= 0) return;
  const a = { timestamp: mr(), ...r }, c = i ? gr(() => i(a, e)) : a;
  c !== null && (t.emit && t.emit("beforeAddBreadcrumb", c, e), n.addBreadcrumb(c, s));
}
let ac;
const oc = /* @__PURE__ */ new WeakMap(), Cp = () => ({ name: "FunctionToString", setupOnce() {
  ac = Function.prototype.toString;
  try {
    Function.prototype.toString = function(...r) {
      const e = Ba(this), t = oc.has(ve()) && e !== void 0 ? e : this;
      return ac.apply(t, r);
    };
  } catch {
  }
}, setup(r) {
  oc.set(r, !0);
} }), Ep = [/^Script error\.?$/, /^Javascript error: Script error\.? on line 0$/, /^ResizeObserver loop completed with undelivered notifications.$/, /^Cannot redefine property: googletag$/, /^Can't find variable: gmo$/, "undefined is not an object (evaluating 'a.L')", `can't redefine non-configurable property "solana"`, "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)", "Can't find variable: _AutofillCallbackHandler", /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:simulateEvent, ParamCount:\d+$/, /^Java exception was raised during method invocation$/], Ap = (r = {}) => ({ name: "InboundFilters", processEvent(e, t, n) {
  const i = n.getOptions(), s = (function(a = {}, c = {}) {
    return { allowUrls: [...a.allowUrls || [], ...c.allowUrls || []], denyUrls: [...a.denyUrls || [], ...c.denyUrls || []], ignoreErrors: [...a.ignoreErrors || [], ...c.ignoreErrors || [], ...a.disableErrorDefaults ? [] : Ep], ignoreTransactions: [...a.ignoreTransactions || [], ...c.ignoreTransactions || []], ignoreInternal: a.ignoreInternal === void 0 || a.ignoreInternal };
  })(r, i);
  return (function(a, c) {
    return c.ignoreInternal && (function(u) {
      try {
        return u.exception.values[0].type === "SentryError";
      } catch {
      }
      return !1;
    })(a) ? (ae && K.warn(`Event dropped due to being internal Sentry Error.
Event: ${dt(a)}`), !0) : (function(u, l) {
      return u.type || !l || !l.length ? !1 : (function(f) {
        const p = [];
        f.message && p.push(f.message);
        let y;
        try {
          y = f.exception.values[f.exception.values.length - 1];
        } catch {
        }
        return y && y.value && (p.push(y.value), y.type && p.push(`${y.type}: ${y.value}`)), p;
      })(u).some((f) => Ir(f, l));
    })(a, c.ignoreErrors) ? (ae && K.warn(`Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${dt(a)}`), !0) : (function(u) {
      return u.type || !u.exception || !u.exception.values || u.exception.values.length === 0 ? !1 : !u.message && !u.exception.values.some((l) => l.stacktrace || l.type && l.type !== "Error" || l.value);
    })(a) ? (ae && K.warn(`Event dropped due to not having an error message, error type or stacktrace.
Event: ${dt(a)}`), !0) : (function(u, l) {
      if (u.type !== "transaction" || !l || !l.length) return !1;
      const f = u.transaction;
      return !!f && Ir(f, l);
    })(a, c.ignoreTransactions) ? (ae && K.warn(`Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${dt(a)}`), !0) : (function(u, l) {
      if (!l || !l.length) return !1;
      const f = jr(u);
      return !!f && Ir(f, l);
    })(a, c.denyUrls) ? (ae && K.warn(`Event dropped due to being matched by \`denyUrls\` option.
Event: ${dt(a)}.
Url: ${jr(a)}`), !0) : (function(u, l) {
      if (!l || !l.length) return !0;
      const f = jr(u);
      return !f || Ir(f, l);
    })(a, c.allowUrls) ? !1 : (ae && K.warn(`Event dropped due to not being matched by \`allowUrls\` option.
Event: ${dt(a)}.
Url: ${jr(a)}`), !0);
  })(e, s) ? null : e;
} });
function jr(r) {
  try {
    let e;
    try {
      e = r.exception.values[0].stacktrace.frames;
    } catch {
    }
    return e ? (function(t = []) {
      for (let n = t.length - 1; n >= 0; n--) {
        const i = t[n];
        if (i && i.filename !== "<anonymous>" && i.filename !== "[native code]") return i.filename || null;
      }
      return null;
    })(e) : null;
  } catch {
    return ae && K.error(`Cannot extract url for event ${dt(r)}`), null;
  }
}
function Tp(r, e, t = 250, n, i, s, a) {
  if (!(s.exception && s.exception.values && a && Ot(a.originalException, Error))) return;
  const c = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
  var u, l;
  c && (s.exception.values = (u = oa(r, e, i, a.originalException, n, s.exception.values, c, 0), l = t, u.map((f) => (f.value && (f.value = Wt(f.value, l)), f))));
}
function oa(r, e, t, n, i, s, a, c) {
  if (s.length >= t + 1) return s;
  let u = [...s];
  if (Ot(n[i], Error)) {
    cc(a, c);
    const l = r(e, n[i]), f = u.length;
    uc(l, i, f, c), u = oa(r, e, t, n[i], i, [l, ...u], l, f);
  }
  return Array.isArray(n.errors) && n.errors.forEach((l, f) => {
    if (Ot(l, Error)) {
      cc(a, c);
      const p = r(e, l), y = u.length;
      uc(p, `errors[${f}]`, y, c), u = oa(r, e, t, l, i, [p, ...u], p, y);
    }
  }), u;
}
function cc(r, e) {
  r.mechanism = r.mechanism || { type: "generic", handled: !0 }, r.mechanism = { ...r.mechanism, ...r.type === "AggregateError" && { is_exception_group: !0 }, exception_id: e };
}
function uc(r, e, t, n) {
  r.mechanism = r.mechanism || { type: "generic", handled: !0 }, r.mechanism = { ...r.mechanism, type: "chained", source: e, exception_id: t, parent_id: n };
}
function On(r) {
  if (!r) return {};
  const e = r.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!e) return {};
  const t = e[6] || "", n = e[8] || "";
  return { host: e[4], path: e[5], protocol: e[2], search: t, hash: n, relative: e[5] + t + n };
}
function Op() {
  "console" in ne && Xs.forEach(function(r) {
    r in ne.console && we(ne.console, r, function(e) {
      return tn[r] = e, function(...t) {
        Ne("console", { args: t, level: r });
        const n = tn[r];
        n && n.apply(ne.console, t);
      };
    });
  });
}
function Pp(r) {
  return r === "warn" ? "warning" : ["fatal", "error", "warning", "log", "info", "debug"].includes(r) ? r : "log";
}
const xp = () => {
  let r;
  return { name: "Dedupe", processEvent(e) {
    if (e.type) return e;
    try {
      if ((function(t, n) {
        return n ? !!((function(i, s) {
          const a = i.message, c = s.message;
          return !(!a && !c || a && !c || !a && c || a !== c || !dc(i, s) || !lc(i, s));
        })(t, n) || (function(i, s) {
          const a = hc(s), c = hc(i);
          return !(!a || !c || a.type !== c.type || a.value !== c.value || !dc(i, s) || !lc(i, s));
        })(t, n)) : !1;
      })(e, r)) return ae && K.warn("Event dropped due to being a duplicate of previously captured event."), null;
    } catch {
    }
    return r = e;
  } };
};
function lc(r, e) {
  let t = Po(r), n = Po(e);
  if (!t && !n) return !0;
  if (t && !n || !t && n || n.length !== t.length) return !1;
  for (let i = 0; i < n.length; i++) {
    const s = n[i], a = t[i];
    if (s.filename !== a.filename || s.lineno !== a.lineno || s.colno !== a.colno || s.function !== a.function) return !1;
  }
  return !0;
}
function dc(r, e) {
  let t = r.fingerprint, n = e.fingerprint;
  if (!t && !n) return !0;
  if (t && !n || !t && n) return !1;
  try {
    return t.join("") === n.join("");
  } catch {
    return !1;
  }
}
function hc(r) {
  return r.exception && r.exception.values && r.exception.values[0];
}
function fc(r) {
  return r === void 0 ? void 0 : r >= 400 && r < 500 ? "warning" : r >= 500 ? "error" : void 0;
}
const Pn = ne;
function ca(r) {
  return r && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(r.toString());
}
function Ip() {
  if (typeof EdgeRuntime == "string") return !0;
  if (!(function() {
    if (!("fetch" in Pn)) return !1;
    try {
      return new Headers(), new Request("http://www.example.com"), new Response(), !0;
    } catch {
      return !1;
    }
  })()) return !1;
  if (ca(Pn.fetch)) return !0;
  let r = !1;
  const e = Pn.document;
  if (e && typeof e.createElement == "function") try {
    const t = e.createElement("iframe");
    t.hidden = !0, e.head.appendChild(t), t.contentWindow && t.contentWindow.fetch && (r = ca(t.contentWindow.fetch)), e.head.removeChild(t);
  } catch (t) {
    jt && K.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", t);
  }
  return r;
}
function Lp(r, e) {
  const t = "fetch";
  At(t, r), Tt(t, () => (function(n, i = !1) {
    i && !Ip() || we(ne, "fetch", function(s) {
      return function(...a) {
        const c = new Error(), { method: u, url: l } = (function(p) {
          if (p.length === 0) return { method: "GET", url: "" };
          if (p.length === 2) {
            const [M, b] = p;
            return { url: pc(M), method: ua(b, "method") ? String(b.method).toUpperCase() : "GET" };
          }
          const y = p[0];
          return { url: pc(y), method: ua(y, "method") ? String(y.method).toUpperCase() : "GET" };
        })(a), f = { args: a, fetchData: { method: u, url: l }, startTimestamp: 1e3 * nt(), virtualError: c };
        return n || Ne("fetch", { ...f }), s.apply(ne, a).then(async (p) => (n ? n(p) : Ne("fetch", { ...f, endTimestamp: 1e3 * nt(), response: p }), p), (p) => {
          throw Ne("fetch", { ...f, endTimestamp: 1e3 * nt(), error: p }), Ra(p) && p.stack === void 0 && (p.stack = c.stack, Pt(p, "framesToPop", 1)), p;
        });
      };
    });
  })(void 0, e));
}
function ua(r, e) {
  return !!r && typeof r == "object" && !!r[e];
}
function pc(r) {
  return typeof r == "string" ? r : r ? ua(r, "url") ? r.url : r.toString ? r.toString() : "" : "";
}
const Dr = ne, ue = ne;
let la = 0;
function gc() {
  return la > 0;
}
function Zt(r, e = {}) {
  if (!/* @__PURE__ */ (function(n) {
    return typeof n == "function";
  })(r)) return r;
  try {
    const n = r.__sentry_wrapped__;
    if (n) return typeof n == "function" ? n : r;
    if (Ba(r)) return r;
  } catch {
    return r;
  }
  const t = function(...n) {
    try {
      const i = n.map((s) => Zt(s, e));
      return r.apply(this, i);
    } catch (i) {
      throw la++, setTimeout(() => {
        la--;
      }), (function(...s) {
        const a = Na(hn());
        if (s.length === 2) {
          const [c, u] = s;
          return c ? a.withSetScope(c, u) : a.withScope(u);
        }
        a.withScope(s[0]);
      })((s) => {
        var a;
        s.addEventProcessor((c) => (e.mechanism && (ta(c, void 0), Qt(c, e.mechanism)), c.extra = { ...c.extra, arguments: n }, c)), a = i, Dt().captureException(a, void 0);
      }), i;
    }
  };
  try {
    for (const n in r) Object.prototype.hasOwnProperty.call(r, n) && (t[n] = r[n]);
  } catch {
  }
  Yd(t, r), Pt(r, "__sentry_wrapped__", t);
  try {
    Object.getOwnPropertyDescriptor(t, "name").configurable && Object.defineProperty(t, "name", { get: () => r.name });
  } catch {
  }
  return t;
}
const mn = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Ua(r, e) {
  const t = Va(r, e), n = { type: Dp(e), value: Bp(e) };
  return t.length && (n.stacktrace = { frames: t }), n.type === void 0 && n.value === "" && (n.value = "Unrecoverable error caught"), n;
}
function Rp(r, e, t, n) {
  const i = ve(), s = i && i.getOptions().normalizeDepth, a = (function(l) {
    for (const f in l) if (Object.prototype.hasOwnProperty.call(l, f)) {
      const p = l[f];
      if (p instanceof Error) return p;
    }
  })(e), c = { __serialized__: rh(e, s) };
  if (a) return { exception: { values: [Ua(r, a)] }, extra: c };
  const u = { exception: { values: [{ type: fn(e) ? e.constructor.name : n ? "UnhandledRejection" : "Error", value: Fp(e, { isUnhandledRejection: n }) }] }, extra: c };
  if (t) {
    const l = Va(r, t);
    l.length && (u.exception.values[0].stacktrace = { frames: l });
  }
  return u;
}
function xn(r, e) {
  return { exception: { values: [Ua(r, e)] } };
}
function Va(r, e) {
  const t = e.stacktrace || e.stack || "", n = (function(s) {
    return s && jp.test(s.message) ? 1 : 0;
  })(e), i = (function(s) {
    return typeof s.framesToPop == "number" ? s.framesToPop : 0;
  })(e);
  try {
    return r(t, n, i);
  } catch {
  }
  return [];
}
const jp = /Minified React error #\d+;/i;
function ah(r) {
  return typeof WebAssembly < "u" && WebAssembly.Exception !== void 0 && r instanceof WebAssembly.Exception;
}
function Dp(r) {
  const e = r && r.name;
  return !e && ah(r) ? r.message && Array.isArray(r.message) && r.message.length == 2 ? r.message[0] : "WebAssembly.Exception" : e;
}
function Bp(r) {
  const e = r && r.message;
  return e ? e.error && typeof e.error.message == "string" ? e.error.message : ah(r) && Array.isArray(r.message) && r.message.length == 2 ? r.message[1] : e : "No error message";
}
function da(r, e, t, n, i) {
  let s;
  if (Hd(e) && e.error)
    return xn(r, e.error);
  if (Io(e) || er(e, "DOMException")) {
    const a = e;
    if ("stack" in e) s = xn(r, e);
    else {
      const c = a.name || (Io(a) ? "DOMError" : "DOMException"), u = a.message ? `${c}: ${a.message}` : c;
      s = ha(r, u, t, n), ta(s, u);
    }
    return "code" in a && (s.tags = { ...s.tags, "DOMException.code": `${a.code}` }), s;
  }
  return Ra(e) ? xn(r, e) : Kt(e) || fn(e) ? (s = Rp(r, e, t, i), Qt(s, { synthetic: !0 }), s) : (s = ha(r, e, t, n), ta(s, `${e}`), Qt(s, { synthetic: !0 }), s);
}
function ha(r, e, t, n) {
  const i = {};
  if (n && t) {
    const s = Va(r, t);
    s.length && (i.exception = { values: [{ value: e, stacktrace: { frames: s } }] }), Qt(i, { synthetic: !0 });
  }
  if (ja(e)) {
    const { __sentry_template_string__: s, __sentry_template_values__: a } = e;
    return i.logentry = { message: s, params: a }, i;
  }
  return i.message = e, i;
}
function Fp(r, { isUnhandledRejection: e }) {
  const t = (function(i, s = 40) {
    const a = Object.keys(Xd(i));
    a.sort();
    const c = a[0];
    if (!c) return "[object has no keys]";
    if (c.length >= s) return Wt(c, s);
    for (let u = a.length; u > 0; u--) {
      const l = a.slice(0, u).join(", ");
      if (!(l.length > s)) return u === a.length ? l : Wt(l, s);
    }
    return "";
  })(r), n = e ? "promise rejection" : "exception";
  return Hd(r) ? `Event \`ErrorEvent\` captured as ${n} with message \`${r.message}\`` : fn(r) ? `Event \`${(function(i) {
    try {
      const s = Object.getPrototypeOf(i);
      return s ? s.constructor.name : void 0;
    } catch {
    }
  })(r)}\` (type=${r.type}) captured as ${n}` : `Object captured as ${n} with keys: ${t}`;
}
class Np extends _p {
  constructor(e) {
    const t = { parentSpanIsAlwaysRootSpan: !0, ...e };
    (function(n, i, s = [i], a = "npm") {
      const c = n._metadata || {};
      c.sdk || (c.sdk = { name: `sentry.javascript.${i}`, packages: s.map((u) => ({ name: `${a}:@sentry/${u}`, version: Et })), version: Et }), n._metadata = c;
    })(t, "browser", ["browser"], ue.SENTRY_SDK_SOURCE || "npm"), super(t), t.sendClientReports && ue.document && ue.document.addEventListener("visibilitychange", () => {
      ue.document.visibilityState === "hidden" && this._flushOutcomes();
    });
  }
  eventFromException(e, t) {
    return (function(n, i, s, a) {
      const c = da(n, i, s && s.syntheticException || void 0, a);
      return Qt(c), c.level = "error", s && s.event_id && (c.event_id = s.event_id), xt(c);
    })(this._options.stackParser, e, t, this._options.attachStacktrace);
  }
  eventFromMessage(e, t = "info", n) {
    return (function(i, s, a = "info", c, u) {
      const l = ha(i, s, c && c.syntheticException || void 0, u);
      return l.level = a, c && c.event_id && (l.event_id = c.event_id), xt(l);
    })(this._options.stackParser, e, t, n, this._options.attachStacktrace);
  }
  captureUserFeedback(e) {
    if (!this._isEnabled()) return void (mn && K.warn("SDK not enabled, will not capture user feedback."));
    const t = (function(n, { metadata: i, tunnel: s, dsn: a }) {
      const c = { event_id: n.event_id, sent_at: (/* @__PURE__ */ new Date()).toISOString(), ...i && i.sdk && { sdk: { name: i.sdk.name, version: i.sdk.version } }, ...!!s && !!a && { dsn: nn(a) } };
      return pr(c, [/* @__PURE__ */ (function(l) {
        return [{ type: "user_report" }, l];
      })(n)]);
    })(e, { metadata: this.getSdkMetadata(), dsn: this.getDsn(), tunnel: this.getOptions().tunnel });
    this.sendEnvelope(t);
  }
  _prepareEvent(e, t, n) {
    return e.platform = e.platform || "javascript", super._prepareEvent(e, t, n);
  }
}
const $p = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, ye = ne;
let mc, In, Ln, Br;
function qp() {
  if (!ye.document) return;
  const r = Ne.bind(null, "dom"), e = vc(r, !0);
  ye.document.addEventListener("click", e, !1), ye.document.addEventListener("keypress", e, !1), ["EventTarget", "Node"].forEach((t) => {
    const n = ye[t], i = n && n.prototype;
    i && i.hasOwnProperty && i.hasOwnProperty("addEventListener") && (we(i, "addEventListener", function(s) {
      return function(a, c, u) {
        if (a === "click" || a == "keypress") try {
          const l = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {}, f = l[a] = l[a] || { refCount: 0 };
          if (!f.handler) {
            const p = vc(r);
            f.handler = p, s.call(this, a, p, u);
          }
          f.refCount++;
        } catch {
        }
        return s.call(this, a, c, u);
      };
    }), we(i, "removeEventListener", function(s) {
      return function(a, c, u) {
        if (a === "click" || a == "keypress") try {
          const l = this.__sentry_instrumentation_handlers__ || {}, f = l[a];
          f && (f.refCount--, f.refCount <= 0 && (s.call(this, a, f.handler, u), f.handler = void 0, delete l[a]), Object.keys(l).length === 0 && delete this.__sentry_instrumentation_handlers__);
        } catch {
        }
        return s.call(this, a, c, u);
      };
    }));
  });
}
function vc(r, e = !1) {
  return (t) => {
    if (!t || t._sentryCaptured) return;
    const n = (function(s) {
      try {
        return s.target;
      } catch {
        return null;
      }
    })(t);
    if ((function(s, a) {
      return s === "keypress" && (!a || !a.tagName || a.tagName !== "INPUT" && a.tagName !== "TEXTAREA" && !a.isContentEditable);
    })(t.type, n)) return;
    Pt(t, "_sentryCaptured", !0), n && !n._sentryId && Pt(n, "_sentryId", Pe());
    const i = t.type === "keypress" ? "input" : t.type;
    (function(s) {
      if (s.type !== In) return !1;
      try {
        if (!s.target || s.target._sentryId !== Ln) return !1;
      } catch {
      }
      return !0;
    })(t) || (r({ event: t, name: i, global: e }), In = t.type, Ln = n ? n._sentryId : void 0), clearTimeout(mc), mc = ye.setTimeout(() => {
      Ln = void 0, In = void 0;
    }, 1e3);
  };
}
function oh(r) {
  const e = "history";
  At(e, r), Tt(e, Up);
}
function Up() {
  if (!(function() {
    const t = Dr.chrome, n = t && t.app && t.app.runtime, i = "history" in Dr && !!Dr.history.pushState && !!Dr.history.replaceState;
    return !n && i;
  })()) return;
  const r = ye.onpopstate;
  function e(t) {
    return function(...n) {
      const i = n.length > 2 ? n[2] : void 0;
      if (i) {
        const s = Br, a = String(i);
        Br = a, Ne("history", { from: s, to: a });
      }
      return t.apply(this, n);
    };
  }
  ye.onpopstate = function(...t) {
    const n = ye.location.href, i = Br;
    if (Br = n, Ne("history", { from: i, to: n }), r) try {
      return r.apply(this, t);
    } catch {
    }
  }, we(ye.history, "pushState", e), we(ye.history, "replaceState", e);
}
const Jr = {};
function bc(r) {
  Jr[r] = void 0;
}
const ar = "__sentry_xhr_v3__";
function Vp() {
  if (!ye.XMLHttpRequest) return;
  const r = XMLHttpRequest.prototype;
  r.open = new Proxy(r.open, { apply(e, t, n) {
    const i = new Error(), s = 1e3 * nt(), a = tt(n[0]) ? n[0].toUpperCase() : void 0, c = (function(l) {
      if (tt(l)) return l;
      try {
        return l.toString();
      } catch {
      }
    })(n[1]);
    if (!a || !c) return e.apply(t, n);
    t[ar] = { method: a, url: c, request_headers: {} }, a === "POST" && c.match(/sentry_key/) && (t.__sentry_own_request__ = !0);
    const u = () => {
      const l = t[ar];
      if (l && t.readyState === 4) {
        try {
          l.status_code = t.status;
        } catch {
        }
        Ne("xhr", { endTimestamp: 1e3 * nt(), startTimestamp: s, xhr: t, virtualError: i });
      }
    };
    return "onreadystatechange" in t && typeof t.onreadystatechange == "function" ? t.onreadystatechange = new Proxy(t.onreadystatechange, { apply: (l, f, p) => (u(), l.apply(f, p)) }) : t.addEventListener("readystatechange", u), t.setRequestHeader = new Proxy(t.setRequestHeader, { apply(l, f, p) {
      const [y, M] = p, b = f[ar];
      return b && tt(y) && tt(M) && (b.request_headers[y.toLowerCase()] = M), l.apply(f, p);
    } }), e.apply(t, n);
  } }), r.send = new Proxy(r.send, { apply(e, t, n) {
    const i = t[ar];
    return i ? (n[0] !== void 0 && (i.body = n[0]), Ne("xhr", { startTimestamp: 1e3 * nt(), xhr: t }), e.apply(t, n)) : e.apply(t, n);
  } });
}
function zp(r, e = (function(t) {
  const n = Jr[t];
  if (n) return n;
  let i = ye[t];
  if (ca(i)) return Jr[t] = i.bind(ye);
  const s = ye.document;
  if (s && typeof s.createElement == "function") try {
    const a = s.createElement("iframe");
    a.hidden = !0, s.head.appendChild(a);
    const c = a.contentWindow;
    c && c[t] && (i = c[t]), s.head.removeChild(a);
  } catch (a) {
    $p && K.warn(`Could not create sandbox iframe for ${t} check, bailing to window.${t}: `, a);
  }
  return i && (Jr[t] = i.bind(ye));
})("fetch")) {
  let t = 0, n = 0;
  return kp(r, function(i) {
    const s = i.body.length;
    t += s, n++;
    const a = { body: i.body, method: "POST", referrerPolicy: "origin", headers: r.headers, keepalive: t <= 6e4 && n < 15, ...r.fetchOptions };
    if (!e) return bc("fetch"), rn("No fetch implementation available");
    try {
      return e(r.url, a).then((c) => (t -= s, n--, { statusCode: c.status, headers: { "x-sentry-rate-limits": c.headers.get("X-Sentry-Rate-Limits"), "retry-after": c.headers.get("Retry-After") } }));
    } catch (c) {
      return bc("fetch"), t -= s, n--, rn(c);
    }
  });
}
function Rn(r, e, t, n) {
  const i = { filename: r, function: e === "<anonymous>" ? Ct : e, in_app: !0 };
  return t !== void 0 && (i.lineno = t), n !== void 0 && (i.colno = n), i;
}
const Wp = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i, Gp = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i, Jp = /\((\S*)(?::(\d+))(?::(\d+))\)/, Hp = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i, Kp = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i, Qp = (function(...r) {
  const e = r.sort((t, n) => t[0] - n[0]).map((t) => t[1]);
  return (t, n = 0, i = 0) => {
    const s = [], a = t.split(`
`);
    for (let c = n; c < a.length; c++) {
      const u = a[c];
      if (u.length > 1024) continue;
      const l = Ao.test(u) ? u.replace(Ao, "$1") : u;
      if (!l.match(/\S*Error: /)) {
        for (const f of e) {
          const p = f(l);
          if (p) {
            s.push(p);
            break;
          }
        }
        if (s.length >= 50 + i) break;
      }
    }
    return (function(c) {
      if (!c.length) return [];
      const u = Array.from(c);
      return /sentryWrapped/.test(xr(u).function || "") && u.pop(), u.reverse(), To.test(xr(u).function || "") && (u.pop(), To.test(xr(u).function || "") && u.pop()), u.slice(0, 50).map((l) => ({ ...l, filename: l.filename || xr(u).filename, function: l.function || Ct }));
    })(s.slice(i));
  };
})([30, (r) => {
  const e = Wp.exec(r);
  if (e) {
    const [, n, i, s] = e;
    return Rn(n, Ct, +i, +s);
  }
  const t = Gp.exec(r);
  if (t) {
    if (t[2] && t[2].indexOf("eval") === 0) {
      const s = Jp.exec(t[2]);
      s && (t[2] = s[1], t[3] = s[2], t[4] = s[3]);
    }
    const [n, i] = yc(t[1] || Ct, t[2]);
    return Rn(i, n, t[3] ? +t[3] : void 0, t[4] ? +t[4] : void 0);
  }
}], [50, (r) => {
  const e = Hp.exec(r);
  if (e) {
    if (e[3] && e[3].indexOf(" > eval") > -1) {
      const i = Kp.exec(e[3]);
      i && (e[1] = e[1] || "eval", e[3] = i[1], e[4] = i[2], e[5] = "");
    }
    let t = e[3], n = e[1] || Ct;
    return [n, t] = yc(n, t), Rn(t, n, e[4] ? +e[4] : void 0, e[5] ? +e[5] : void 0);
  }
}]), yc = (r, e) => {
  const t = r.indexOf("safari-extension") !== -1, n = r.indexOf("safari-web-extension") !== -1;
  return t || n ? [r.indexOf("@") !== -1 ? r.split("@")[0] : Ct, t ? `safari-extension:${e}` : `safari-web-extension:${e}`] : [r, e];
}, _c = 1024, Yp = (r = {}) => {
  const e = { console: !0, dom: !0, fetch: !0, history: !0, sentry: !0, xhr: !0, ...r };
  return { name: "Breadcrumbs", setup(t) {
    var n;
    e.console && (function(i) {
      const s = "console";
      At(s, i), Tt(s, Op);
    })(/* @__PURE__ */ (function(i) {
      return function(s) {
        if (ve() !== i) return;
        const a = { category: "console", data: { arguments: s.args, logger: "console" }, level: Pp(s.level), message: Lo(s.args, " ") };
        if (s.level === "assert") {
          if (s.args[0] !== !1) return;
          a.message = `Assertion failed: ${Lo(s.args.slice(1), " ") || "console.assert"}`, a.data.arguments = s.args.slice(1);
        }
        yt(a, { input: s.args, level: s.level });
      };
    })(t)), e.dom && (n = /* @__PURE__ */ (function(i, s) {
      return function(a) {
        if (ve() !== i) return;
        let c, u, l = typeof s == "object" ? s.serializeAttribute : void 0, f = typeof s == "object" && typeof s.maxStringLength == "number" ? s.maxStringLength : void 0;
        f && f > _c && (mn && K.warn(`\`dom.maxStringLength\` cannot exceed 1024, but a value of ${f} was configured. Sentry will use 1024 instead.`), f = _c), typeof l == "string" && (l = [l]);
        try {
          const y = a.event, M = (function(b) {
            return !!b && !!b.target;
          })(y) ? y.target : y;
          c = Qd(M, { keyAttrs: l, maxStringLength: f }), u = (function(b) {
            if (!Da.HTMLElement) return null;
            let v = b;
            for (let C = 0; C < 5; C++) {
              if (!v) return null;
              if (v instanceof HTMLElement) {
                if (v.dataset.sentryComponent) return v.dataset.sentryComponent;
                if (v.dataset.sentryElement) return v.dataset.sentryElement;
              }
              v = v.parentNode;
            }
            return null;
          })(M);
        } catch {
          c = "<unknown>";
        }
        if (c.length === 0) return;
        const p = { category: `ui.${a.name}`, message: c };
        u && (p.data = { "ui.component_name": u }), yt(p, { event: a.event, name: a.name, global: a.global });
      };
    })(t, e.dom), At("dom", n), Tt("dom", qp)), e.xhr && (function(i) {
      At("xhr", i), Tt("xhr", Vp);
    })(/* @__PURE__ */ (function(i) {
      return function(s) {
        if (ve() !== i) return;
        const { startTimestamp: a, endTimestamp: c } = s, u = s.xhr[ar];
        if (!a || !c || !u) return;
        const { method: l, url: f, status_code: p, body: y } = u, M = { method: l, url: f, status_code: p }, b = { xhr: s.xhr, input: y, startTimestamp: a, endTimestamp: c };
        yt({ category: "xhr", data: M, type: "http", level: fc(p) }, b);
      };
    })(t)), e.fetch && Lp(/* @__PURE__ */ (function(i) {
      return function(s) {
        if (ve() !== i) return;
        const { startTimestamp: a, endTimestamp: c } = s;
        if (c && (!s.fetchData.url.match(/sentry_key/) || s.fetchData.method !== "POST")) if (s.error)
          yt({ category: "fetch", data: s.fetchData, level: "error", type: "http" }, { data: s.error, input: s.args, startTimestamp: a, endTimestamp: c });
        else {
          const u = s.response, l = { ...s.fetchData, status_code: u && u.status }, f = { input: s.args, response: u, startTimestamp: a, endTimestamp: c };
          yt({ category: "fetch", data: l, type: "http", level: fc(l.status_code) }, f);
        }
      };
    })(t)), e.history && oh(/* @__PURE__ */ (function(i) {
      return function(s) {
        if (ve() !== i) return;
        let a = s.from, c = s.to;
        const u = On(ue.location.href);
        let l = a ? On(a) : void 0;
        const f = On(c);
        l && l.path || (l = u), u.protocol === f.protocol && u.host === f.host && (c = f.relative), u.protocol === l.protocol && u.host === l.host && (a = l.relative), yt({ category: "navigation", data: { from: a, to: c } });
      };
    })(t)), e.sentry && t.on("beforeSendEvent", /* @__PURE__ */ (function(i) {
      return function(s) {
        ve() === i && yt({ category: "sentry." + (s.type === "transaction" ? "transaction" : "event"), event_id: s.event_id, level: s.level, message: dt(s) }, { event: s });
      };
    })(t));
  } };
}, Xp = ["EventTarget", "Window", "Node", "ApplicationCache", "AudioTrackList", "BroadcastChannel", "ChannelMergerNode", "CryptoOperation", "EventSource", "FileReader", "HTMLUnknownElement", "IDBDatabase", "IDBRequest", "IDBTransaction", "KeyOperation", "MediaController", "MessagePort", "ModalWindow", "Notification", "SVGElementInstance", "Screen", "SharedWorker", "TextTrack", "TextTrackCue", "TextTrackList", "WebSocket", "WebSocketWorker", "Worker", "XMLHttpRequest", "XMLHttpRequestEventTarget", "XMLHttpRequestUpload"], Zp = (r = {}) => {
  const e = { XMLHttpRequest: !0, eventTarget: !0, requestAnimationFrame: !0, setInterval: !0, setTimeout: !0, ...r };
  return { name: "BrowserApiErrors", setupOnce() {
    e.setTimeout && we(ue, "setTimeout", wc), e.setInterval && we(ue, "setInterval", wc), e.requestAnimationFrame && we(ue, "requestAnimationFrame", eg), e.XMLHttpRequest && "XMLHttpRequest" in ue && we(XMLHttpRequest.prototype, "send", tg);
    const t = e.eventTarget;
    t && (Array.isArray(t) ? t : Xp).forEach(rg);
  } };
};
function wc(r) {
  return function(...e) {
    const t = e[0];
    return e[0] = Zt(t, { mechanism: { data: { function: pt(r) }, handled: !1, type: "instrument" } }), r.apply(this, e);
  };
}
function eg(r) {
  return function(e) {
    return r.apply(this, [Zt(e, { mechanism: { data: { function: "requestAnimationFrame", handler: pt(r) }, handled: !1, type: "instrument" } })]);
  };
}
function tg(r) {
  return function(...e) {
    const t = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((n) => {
      n in t && typeof t[n] == "function" && we(t, n, function(i) {
        const s = { mechanism: { data: { function: n, handler: pt(i) }, handled: !1, type: "instrument" } }, a = Ba(i);
        return a && (s.mechanism.data.handler = pt(a)), Zt(i, s);
      });
    }), r.apply(this, e);
  };
}
function rg(r) {
  const e = ue[r], t = e && e.prototype;
  t && t.hasOwnProperty && t.hasOwnProperty("addEventListener") && (we(t, "addEventListener", function(n) {
    return function(i, s, a) {
      try {
        typeof s.handleEvent == "function" && (s.handleEvent = Zt(s.handleEvent, { mechanism: { data: { function: "handleEvent", handler: pt(s), target: r }, handled: !1, type: "instrument" } }));
      } catch {
      }
      return n.apply(this, [i, Zt(s, { mechanism: { data: { function: "addEventListener", handler: pt(s), target: r }, handled: !1, type: "instrument" } }), a]);
    };
  }), we(t, "removeEventListener", function(n) {
    return function(i, s, a) {
      try {
        const c = s.__sentry_wrapped__;
        c && n.call(this, i, c, a);
      } catch {
      }
      return n.call(this, i, s, a);
    };
  }));
}
const ng = () => ({ name: "BrowserSession", setupOnce() {
  ue.document !== void 0 ? (Yo({ ignoreDuration: !0 }), Xo(), oh(({ from: r, to: e }) => {
    r !== void 0 && r !== e && (Yo({ ignoreDuration: !0 }), Xo());
  })) : mn && K.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.");
} }), ig = (r = {}) => {
  const e = { onerror: !0, onunhandledrejection: !0, ...r };
  return { name: "GlobalHandlers", setupOnce() {
    Error.stackTraceLimit = 50;
  }, setup(t) {
    e.onerror && ((function(n) {
      (function(i) {
        const s = "error";
        At(s, i), Tt(s, Hf);
      })((i) => {
        const { stackParser: s, attachStacktrace: a } = kc();
        if (ve() !== n || gc()) return;
        const { msg: c, url: u, line: l, column: f, error: p } = i, y = (function(M, b, v, C) {
          const E = M.exception = M.exception || {}, O = E.values = E.values || [], I = O[0] = O[0] || {}, k = I.stacktrace = I.stacktrace || {}, S = k.frames = k.frames || [], T = C, L = v, D = tt(b) && b.length > 0 ? b : (function() {
            try {
              return Da.document.location.href;
            } catch {
              return "";
            }
          })();
          return S.length === 0 && S.push({ colno: T, filename: D, function: Ct, in_app: !0, lineno: L }), M;
        })(da(s, p || c, void 0, a, !1), u, l, f);
        y.level = "error", Qo(y, { originalException: p, mechanism: { handled: !1, type: "onerror" } });
      });
    })(t), Sc("onerror")), e.onunhandledrejection && ((function(n) {
      (function(i) {
        const s = "unhandledrejection";
        At(s, i), Tt(s, Kf);
      })((i) => {
        const { stackParser: s, attachStacktrace: a } = kc();
        if (ve() !== n || gc()) return;
        const c = (function(l) {
          if (Zs(l)) return l;
          try {
            if ("reason" in l) return l.reason;
            if ("detail" in l && "reason" in l.detail) return l.detail.reason;
          } catch {
          }
          return l;
        })(i), u = Zs(c) ? { exception: { values: [{ type: "UnhandledRejection", value: `Non-Error promise rejection captured with value: ${String(c)}` }] } } : da(s, c, void 0, a, !0);
        u.level = "error", Qo(u, { originalException: c, mechanism: { handled: !1, type: "onunhandledrejection" } });
      });
    })(t), Sc("onunhandledrejection"));
  } };
};
function Sc(r) {
  mn && K.log(`Global Handler attached: ${r}`);
}
function kc() {
  const r = ve();
  return r && r.getOptions() || { stackParser: () => [], attachStacktrace: !1 };
}
const sg = () => ({ name: "HttpContext", preprocessEvent(r) {
  if (!ue.navigator && !ue.location && !ue.document) return;
  const e = r.request && r.request.url || ue.location && ue.location.href, { referrer: t } = ue.document || {}, { userAgent: n } = ue.navigator || {}, i = { ...r.request && r.request.headers, ...t && { Referer: t }, ...n && { "User-Agent": n } }, s = { ...r.request, ...e && { url: e }, headers: i };
  r.request = s;
} }), ag = (r = {}) => {
  const e = r.limit || 5, t = r.key || "cause";
  return { name: "LinkedErrors", preprocessEvent(n, i, s) {
    const a = s.getOptions();
    Tp(Ua, a.stackParser, a.maxValueLength, t, e, n, i);
  } };
};
var Mc = "new", Cc = "loading", Ec = "loaded", fa = "joining-meeting", Mt = "joined-meeting", at = "left-meeting", ot = "error", og = "playable", jn = "unknown", cg = "full", ug = "base", Ac = "no-room", lg = "end-of-life", dg = "connection-error", hg = "iframe-ready-for-launch-config", fg = "iframe-launch-config", pg = "theme-updated", gg = "loading", mg = "load-attempt-failed", Tc = "loaded", vg = "started-camera", bg = "camera-error", yg = "joining-meeting", _g = "joined-meeting", wg = "left-meeting", Sg = "participant-joined", kg = "participant-updated", Mg = "participant-left", Cg = "participant-counts-updated", Eg = "access-state-updated", Ag = "meeting-session-summary-updated", Tg = "meeting-session-state-updated", Og = "waiting-participant-added", Pg = "waiting-participant-updated", xg = "waiting-participant-removed", Ig = "track-started", Lg = "track-stopped", Rg = "transcription-started", jg = "transcription-stopped", Dg = "transcription-error", Oc = "recording-started", Pc = "recording-stopped", Bg = "recording-stats", Fg = "recording-error", Ng = "recording-upload-completed", $g = "recording-data", qg = "app-message", Ug = "transcription-message", Vg = "remote-media-player-started", zg = "remote-media-player-updated", Wg = "remote-media-player-stopped", Gg = "local-screen-share-started", Jg = "local-screen-share-stopped", Hg = "local-screen-share-canceled", Kg = "active-speaker-change", Qg = "active-speaker-mode-change", Yg = "network-quality-change", Xg = "network-connection", Zg = "cpu-load-change", em = "face-counts-updated", Fr = "fullscreen", Nr = "exited-fullscreen", tm = "live-streaming-started", rm = "live-streaming-updated", nm = "live-streaming-stopped", im = "live-streaming-error", sm = "lang-updated", am = "receive-settings-updated", xc = "input-settings-updated", Ic = "nonfatal-error", Lc = "error", Dn = 4096, Rc = 102400, Bn = "iframe-call-message", jc = "local-screen-start", Dc = "daily-method-update-live-streaming-endpoints", $r = "transmit-log", rt = "daily-custom-track", Hr = { NONE: "none", BGBLUR: "background-blur", BGIMAGE: "background-image", FACE_DETECTION: "face-detection" }, ch = { NONE: "none", NOISE_CANCELLATION: "noise-cancellation" }, pa = { PLAY: "play", PAUSE: "pause" }, qr = "daily", Fn = "signalwire", Nn = ["jpg", "png", "jpeg"], om = "add-endpoints", cm = "remove-endpoints", Bc = "sip-call-transfer";
function xe() {
  return !ee() && typeof window < "u" && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : "";
}
function ee() {
  return typeof navigator < "u" && navigator.product && navigator.product === "ReactNative";
}
function uh() {
  return navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}
function um() {
  return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && ((function(r, e) {
    if (!r || !e) return !0;
    switch (r) {
      case "Chrome":
        return e.major >= 75;
      case "Safari":
        return RTCRtpTransceiver.prototype.hasOwnProperty("currentDirection") && !(e.major === 13 && e.minor === 0 && e.point === 0);
      case "Firefox":
        return e.major >= 67;
    }
    return !0;
  })(It(), sn()) || ee());
}
function Fc() {
  if (ee() || !document) return !1;
  var r = document.createElement("iframe");
  return !!r.requestFullscreen || !!r.webkitRequestFullscreen;
}
var ga = "none", lm = "software", dm = "hardware", hm = (function() {
  try {
    var r, e = document.createElement("canvas"), t = !1;
    (r = e.getContext("webgl2", { failIfMajorPerformanceCaveat: !0 })) || (t = !0, r = e.getContext("webgl2"));
    var n = r != null;
    return e.remove(), n ? t ? lm : dm : ga;
  } catch {
    return ga;
  }
})();
function lh() {
  var r = arguments.length > 0 && arguments[0] !== void 0 && arguments[0];
  return !ee() && hm !== ga && (r ? (function() {
    return Nc() ? !1 : ["Chrome", "Firefox"].includes(It());
  })() : (function() {
    if (Nc()) return !1;
    var e = It();
    if (e === "Safari") {
      var t = Wa();
      if (t.major < 15 || t.major === 15 && t.minor < 4) return !1;
    }
    return e === "Chrome" ? za().major >= 77 : e === "Firefox" ? Ga().major >= 97 : ["Chrome", "Firefox", "Safari"].includes(e);
  })());
}
function dh() {
  if (ee() || hh() || typeof AudioWorkletNode > "u") return !1;
  switch (It()) {
    case "Chrome":
    case "Firefox":
      return !0;
    case "Safari":
      var r = sn();
      return r.major > 17 || r.major === 17 && r.minor >= 4;
  }
  return !1;
}
function $n() {
  return uh() && typeof MediaStreamTrack < "u" && !(function() {
    var r, e = It();
    if (!xe()) return !0;
    switch (e) {
      case "Chrome":
        return (r = za()).major && r.major > 0 && r.major < 75;
      case "Firefox":
        return (r = Ga()).major < 91;
      case "Safari":
        return (r = Wa()).major < 13 || r.major === 13 && r.minor < 1;
      default:
        return !0;
    }
  })();
}
function hh() {
  return xe().match(/Linux; Android/);
}
function Nc() {
  var r, e = xe(), t = e.match(/Mac/) && (!ee() && typeof window < "u" && (r = window) !== null && r !== void 0 && (r = r.navigator) !== null && r !== void 0 && r.maxTouchPoints ? window.navigator.maxTouchPoints : 0) >= 5;
  return !!(e.match(/Mobi/) || e.match(/Android/) || t) || !!xe().match(/DailyAnd\//) || void 0;
}
function It() {
  if (typeof window < "u") {
    var r = xe();
    return fh() ? "Safari" : r.indexOf("Edge") > -1 ? "Edge" : r.match(/Chrome\//) ? "Chrome" : r.indexOf("Safari") > -1 || ph() ? "Safari" : r.indexOf("Firefox") > -1 ? "Firefox" : r.indexOf("MSIE") > -1 || r.indexOf(".NET") > -1 ? "IE" : "Unknown Browser";
  }
}
function sn() {
  switch (It()) {
    case "Chrome":
      return za();
    case "Safari":
      return Wa();
    case "Firefox":
      return Ga();
    case "Edge":
      return (function() {
        var r = 0, e = 0;
        if (typeof window < "u") {
          var t = xe().match(/Edge\/(\d+).(\d+)/);
          if (t) try {
            r = parseInt(t[1]), e = parseInt(t[2]);
          } catch {
          }
        }
        return { major: r, minor: e };
      })();
  }
}
function za() {
  var r = 0, e = 0, t = 0, n = 0, i = !1;
  if (typeof window < "u") {
    var s = xe(), a = s.match(/Chrome\/(\d+).(\d+).(\d+).(\d+)/);
    if (a) try {
      r = parseInt(a[1]), e = parseInt(a[2]), t = parseInt(a[3]), n = parseInt(a[4]), i = s.indexOf("OPR/") > -1;
    } catch {
    }
  }
  return { major: r, minor: e, build: t, patch: n, opera: i };
}
function fh() {
  return !!xe().match(/\((iPad|iPhone|iPod)/i) && uh();
}
function ph() {
  return xe().indexOf("AppleWebKit/605.1.15") > -1;
}
function Wa() {
  var r = 0, e = 0, t = 0;
  if (typeof window < "u") {
    var n = xe().match(/Version\/(\d+).(\d+)(.(\d+))?/);
    if (n) try {
      r = parseInt(n[1]), e = parseInt(n[2]), t = parseInt(n[4]);
    } catch {
    }
    else (fh() || ph()) && (r = 14, e = 0, t = 3);
  }
  return { major: r, minor: e, point: t };
}
function Ga() {
  var r = 0, e = 0;
  if (typeof window < "u") {
    var t = xe().match(/Firefox\/(\d+).(\d+)/);
    if (t) try {
      r = parseInt(t[1]), e = parseInt(t[2]);
    } catch {
    }
  }
  return { major: r, minor: e };
}
var gh = (function() {
  return Ce(function r() {
    Me(this, r);
  }, [{ key: "addListenerForMessagesFromCallMachine", value: function(r, e, t) {
    nr();
  } }, { key: "addListenerForMessagesFromDailyJs", value: function(r, e, t) {
    nr();
  } }, { key: "sendMessageToCallMachine", value: function(r, e, t, n) {
    nr();
  } }, { key: "sendMessageToDailyJs", value: function(r, e) {
    nr();
  } }, { key: "removeListener", value: function(r) {
    nr();
  } }]);
})();
function $c(r, e) {
  var t = Object.keys(r);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(r);
    e && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(r, i).enumerable;
    })), t.push.apply(t, n);
  }
  return t;
}
function qn(r) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? $c(Object(t), !0).forEach(function(n) {
      Je(r, n, t[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : $c(Object(t)).forEach(function(n) {
      Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n));
    });
  }
  return r;
}
function mh() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (mh = function() {
    return !!r;
  })();
}
var fm = (function() {
  function r() {
    var e, t, n, i;
    return Me(this, r), t = this, n = $e(n = r), (e = un(t, mh() ? Reflect.construct(n, [], $e(t).constructor) : n.apply(t, i)))._wrappedListeners = {}, e._messageCallbacks = {}, e;
  }
  return ln(r, gh), Ce(r, [{ key: "addListenerForMessagesFromCallMachine", value: function(e, t, n) {
    var i = this, s = function(a) {
      if (a.data && a.data.what === "iframe-call-message" && (!a.data.callClientId || a.data.callClientId === t) && (!a.data.from || a.data.from !== "module")) {
        var c = qn({}, a.data);
        if (delete c.from, c.callbackStamp && i._messageCallbacks[c.callbackStamp]) {
          var u = c.callbackStamp;
          i._messageCallbacks[u].call(n, c), delete i._messageCallbacks[u];
        }
        delete c.what, delete c.callbackStamp, e.call(n, c);
      }
    };
    this._wrappedListeners[e] = s, window.addEventListener("message", s);
  } }, { key: "addListenerForMessagesFromDailyJs", value: function(e, t, n) {
    var i = function(s) {
      var a;
      if (!(!s.data || s.data.what !== Bn || !s.data.action || s.data.from && s.data.from !== "module" || s.data.callClientId && t && s.data.callClientId !== t || s != null && (a = s.data) !== null && a !== void 0 && a.callFrameId)) {
        var c = s.data;
        e.call(n, c);
      }
    };
    this._wrappedListeners[e] = i, window.addEventListener("message", i);
  } }, { key: "sendMessageToCallMachine", value: function(e, t, n, i) {
    if (!n) throw new Error("undefined callClientId. Are you trying to use a DailyCall instance previously destroyed?");
    var s = qn({}, e);
    if (s.what = Bn, s.from = "module", s.callClientId = n, t) {
      var a = dn();
      this._messageCallbacks[a] = t, s.callbackStamp = a;
    }
    var c = i ? i.contentWindow : window, u = this._callMachineTargetOrigin(i);
    u && c.postMessage(s, u);
  } }, { key: "sendMessageToDailyJs", value: function(e, t) {
    e.what = Bn, e.callClientId = t, e.from = "embedded", window.postMessage(e, this._targetOriginFromWindowLocation());
  } }, { key: "removeListener", value: function(e) {
    var t = this._wrappedListeners[e];
    t && (window.removeEventListener("message", t), delete this._wrappedListeners[e]);
  } }, { key: "forwardPackagedMessageToCallMachine", value: function(e, t, n) {
    var i = qn({}, e);
    i.callClientId = n;
    var s = t ? t.contentWindow : window, a = this._callMachineTargetOrigin(t);
    a && s.postMessage(i, a);
  } }, { key: "addListenerForPackagedMessagesFromCallMachine", value: function(e, t) {
    var n = function(i) {
      if (i.data && i.data.what === "iframe-call-message" && (!i.data.callClientId || i.data.callClientId === t) && (!i.data.from || i.data.from !== "module")) {
        var s = i.data;
        e(s);
      }
    };
    return this._wrappedListeners[e] = n, window.addEventListener("message", n), e;
  } }, { key: "removeListenerForPackagedMessagesFromCallMachine", value: function(e) {
    var t = this._wrappedListeners[e];
    t && (window.removeEventListener("message", t), delete this._wrappedListeners[e]);
  } }, { key: "_callMachineTargetOrigin", value: function(e) {
    return e ? e.src ? new URL(e.src).origin : void 0 : this._targetOriginFromWindowLocation();
  } }, { key: "_targetOriginFromWindowLocation", value: function() {
    return window.location.protocol === "file:" ? "*" : window.location.origin;
  } }]);
})();
function qc(r, e) {
  var t = Object.keys(r);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(r);
    e && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(r, i).enumerable;
    })), t.push.apply(t, n);
  }
  return t;
}
function vh() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (vh = function() {
    return !!r;
  })();
}
var pm = (function() {
  function r() {
    var e, t, n, i;
    return Me(this, r), t = this, n = $e(n = r), e = un(t, vh() ? Reflect.construct(n, [], $e(t).constructor) : n.apply(t, i)), global.callMachineToDailyJsEmitter = global.callMachineToDailyJsEmitter || new Ys.EventEmitter(), global.dailyJsToCallMachineEmitter = global.dailyJsToCallMachineEmitter || new Ys.EventEmitter(), e._wrappedListeners = {}, e._messageCallbacks = {}, e;
  }
  return ln(r, gh), Ce(r, [{ key: "addListenerForMessagesFromCallMachine", value: function(e, t, n) {
    this._addListener(e, global.callMachineToDailyJsEmitter, t, n, "received call machine message");
  } }, { key: "addListenerForMessagesFromDailyJs", value: function(e, t, n) {
    this._addListener(e, global.dailyJsToCallMachineEmitter, t, n, "received daily-js message");
  } }, { key: "sendMessageToCallMachine", value: function(e, t, n) {
    this._sendMessage(e, global.dailyJsToCallMachineEmitter, n, t, "sending message to call machine");
  } }, { key: "sendMessageToDailyJs", value: function(e, t) {
    this._sendMessage(e, global.callMachineToDailyJsEmitter, t, null, "sending message to daily-js");
  } }, { key: "removeListener", value: function(e) {
    var t = this._wrappedListeners[e];
    t && (global.callMachineToDailyJsEmitter.removeListener("message", t), global.dailyJsToCallMachineEmitter.removeListener("message", t), delete this._wrappedListeners[e]);
  } }, { key: "_addListener", value: function(e, t, n, i, s) {
    var a = this, c = function(u) {
      if (u.callClientId === n) {
        if (u.callbackStamp && a._messageCallbacks[u.callbackStamp]) {
          var l = u.callbackStamp;
          a._messageCallbacks[l].call(i, u), delete a._messageCallbacks[l];
        }
        e.call(i, u);
      }
    };
    this._wrappedListeners[e] = c, t.addListener("message", c);
  } }, { key: "_sendMessage", value: function(e, t, n, i, s) {
    var a = (function(u) {
      for (var l = 1; l < arguments.length; l++) {
        var f = arguments[l] != null ? arguments[l] : {};
        l % 2 ? qc(Object(f), !0).forEach(function(p) {
          Je(u, p, f[p]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(u, Object.getOwnPropertyDescriptors(f)) : qc(Object(f)).forEach(function(p) {
          Object.defineProperty(u, p, Object.getOwnPropertyDescriptor(f, p));
        });
      }
      return u;
    })({}, e);
    if (a.callClientId = n, i) {
      var c = dn();
      this._messageCallbacks[c] = i, a.callbackStamp = c;
    }
    t.emit("message", a);
  } }]);
})(), ma = "replace", va = "shallow-merge", Uc = [ma, va], gm = (function() {
  function r() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = e.data, n = e.mergeStrategy, i = n === void 0 ? ma : n;
    Me(this, r), r._validateMergeStrategy(i), r._validateData(t, i), this.mergeStrategy = i, this.data = t;
  }
  return Ce(r, [{ key: "isNoOp", value: function() {
    return r.isNoOpUpdate(this.data, this.mergeStrategy);
  } }], [{ key: "isNoOpUpdate", value: function(e, t) {
    return Object.keys(e).length === 0 && t === va;
  } }, { key: "_validateMergeStrategy", value: function(e) {
    if (!Uc.includes(e)) throw Error("Unrecognized mergeStrategy provided. Options are: [".concat(Uc, "]"));
  } }, { key: "_validateData", value: function(e, t) {
    if (!(function(c) {
      if (c == null || te(c) !== "object") return !1;
      var u = Object.getPrototypeOf(c);
      return u == null || u === Object.prototype;
    })(e)) throw Error("Meeting session data must be a plain (map-like) object");
    var n;
    try {
      if (n = JSON.stringify(e), t === ma) {
        var i = JSON.parse(n);
        be(i, e) || console.warn("The meeting session data provided will be modified when serialized.", i, e);
      } else if (t === va) {
        for (var s in e) if (Object.hasOwnProperty.call(e, s) && e[s] !== void 0) {
          var a = JSON.parse(JSON.stringify(e[s]));
          be(e[s], a) || console.warn("At least one key in the meeting session data provided will be modified when serialized.", a, e[s]);
        }
      }
    } catch (c) {
      throw Error("Meeting session data must be serializable to JSON: ".concat(c));
    }
    if (n.length > Rc) throw Error("Meeting session data is too large (".concat(n.length, " characters). Maximum size suppported is ").concat(Rc, "."));
  } }]);
})();
function bh() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (bh = function() {
    return !!r;
  })();
}
function ba(r) {
  var e = typeof Map == "function" ? /* @__PURE__ */ new Map() : void 0;
  return ba = function(t) {
    if (t === null || !(function(i) {
      try {
        return Function.toString.call(i).indexOf("[native code]") !== -1;
      } catch {
        return typeof i == "function";
      }
    })(t)) return t;
    if (typeof t != "function") throw new TypeError("Super expression must either be null or a function");
    if (e !== void 0) {
      if (e.has(t)) return e.get(t);
      e.set(t, n);
    }
    function n() {
      return (function(i, s, a) {
        if (bh()) return Reflect.construct.apply(null, arguments);
        var c = [null];
        c.push.apply(c, s);
        var u = new (i.bind.apply(i, c))();
        return a && fr(u, a.prototype), u;
      })(t, arguments, $e(this).constructor);
    }
    return n.prototype = Object.create(t.prototype, { constructor: { value: n, enumerable: !1, writable: !0, configurable: !0 } }), fr(n, t);
  }, ba(r);
}
function yh() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (yh = function() {
    return !!r;
  })();
}
function Vc(r) {
  var e, t = (e = window._daily) === null || e === void 0 ? void 0 : e.pendings;
  if (t) {
    var n = t.indexOf(r);
    n !== -1 && t.splice(n, 1);
  }
}
var mm = (function() {
  return Ce(function r(e) {
    Me(this, r), this._currentLoad = null, this._callClientId = e, this._publicPath = null;
  }, [{ key: "load", value: function() {
    var r, e = this, t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, n = arguments.length > 1 ? arguments[1] : void 0, i = arguments.length > 2 ? arguments[2] : void 0;
    if (this.loaded) return window._daily.instances[this._callClientId].callMachine.reset(), window._daily.instances[this._callClientId].publicPath = this._publicPath, void n(!0);
    r = this._callClientId, window._daily.pendings.push(r), this._currentLoad && this._currentLoad.cancel(), this._currentLoad = new vm(t, function(s) {
      var a = s.substring(0, s.lastIndexOf("/"));
      a.length && a.slice(-1) !== "/" && (a += "/"), e._publicPath = a, window._daily.instances[e._callClientId].publicPath = a, n(!1);
    }, function(s, a) {
      a || Vc(e._callClientId), i(s, a);
    }), this._currentLoad.start();
  } }, { key: "cancel", value: function() {
    this._currentLoad && this._currentLoad.cancel(), Vc(this._callClientId);
  } }, { key: "loaded", get: function() {
    return this._currentLoad && this._currentLoad.succeeded;
  } }]);
})(), vm = (function() {
  return Ce(function r() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 ? arguments[2] : void 0;
    Me(this, r), this._attemptsRemaining = 3, this._currentAttempt = null, this._dailyConfig = e, this._successCallback = t, this._failureCallback = n;
  }, [{ key: "start", value: function() {
    var r = this;
    if (!this._currentAttempt) {
      var e = function(t) {
        r._currentAttempt.cancelled || (r._attemptsRemaining--, r._failureCallback(t, r._attemptsRemaining > 0), r._attemptsRemaining <= 0 || setTimeout(function() {
          r._currentAttempt.cancelled || (r._currentAttempt = new zc(r._dailyConfig, r._successCallback, e), r._currentAttempt.start());
        }, 3e3));
      };
      this._currentAttempt = new zc(this._dailyConfig, this._successCallback, e), this._currentAttempt.start();
    }
  } }, { key: "cancel", value: function() {
    this._currentAttempt && this._currentAttempt.cancel();
  } }, { key: "cancelled", get: function() {
    return this._currentAttempt && this._currentAttempt.cancelled;
  } }, { key: "succeeded", get: function() {
    return this._currentAttempt && this._currentAttempt.succeeded;
  } }]);
})(), Un = (function() {
  function r() {
    return Me(this, r), e = this, n = arguments, t = $e(t = r), un(e, yh() ? Reflect.construct(t, n || [], $e(e).constructor) : t.apply(e, n));
    var e, t, n;
  }
  return ln(r, ba(Error)), Ce(r);
})(), an = 2e4, zc = (function() {
  return Ce(function e(t, n, i) {
    Me(this, e), this._loadAttemptImpl = ee() || !t.avoidEval ? new bm(t, n, i) : new ym(t, n, i);
  }, [{ key: "start", value: (r = J(function* () {
    return this._loadAttemptImpl.start();
  }), function() {
    return r.apply(this, arguments);
  }) }, { key: "cancel", value: function() {
    this._loadAttemptImpl.cancel();
  } }, { key: "cancelled", get: function() {
    return this._loadAttemptImpl.cancelled;
  } }, { key: "succeeded", get: function() {
    return this._loadAttemptImpl.succeeded;
  } }]);
  var r;
})(), bm = (function() {
  return Ce(function i(s, a, c) {
    Me(this, i), this.cancelled = !1, this.succeeded = !1, this._networkTimedOut = !1, this._networkTimeout = null, this._iosCache = typeof iOSCallObjectBundleCache < "u" && iOSCallObjectBundleCache, this._refetchHeaders = null, this._dailyConfig = s, this._successCallback = a, this._failureCallback = c;
  }, [{ key: "start", value: (n = J(function* () {
    var i = Xr(this._dailyConfig);
    !(yield this._tryLoadFromIOSCache(i)) && this._loadFromNetwork(i);
  }), function() {
    return n.apply(this, arguments);
  }) }, { key: "cancel", value: function() {
    clearTimeout(this._networkTimeout), this.cancelled = !0;
  } }, { key: "_tryLoadFromIOSCache", value: (t = J(function* (i) {
    if (!this._iosCache) return !1;
    try {
      var s = yield this._iosCache.get(i);
      return !!this.cancelled || !!s && (s.code ? (Function('"use strict";' + s.code)(), this.succeeded = !0, this._successCallback(i), !0) : (this._refetchHeaders = s.refetchHeaders, !1));
    } catch {
      return !1;
    }
  }), function(i) {
    return t.apply(this, arguments);
  }) }, { key: "_loadFromNetwork", value: (e = J(function* (i) {
    var s = this;
    this._networkTimeout = setTimeout(function() {
      s._networkTimedOut = !0, s._failureCallback({ msg: "Timed out (>".concat(an, " ms) when loading call object bundle ").concat(i), type: "timeout" });
    }, an);
    try {
      var a = this._refetchHeaders ? { headers: this._refetchHeaders } : {}, c = yield fetch(i, a);
      if (clearTimeout(this._networkTimeout), this.cancelled || this._networkTimedOut) throw new Un();
      var u = yield this._getBundleCodeFromResponse(i, c);
      if (this.cancelled) throw new Un();
      Function('"use strict";' + u)(), this._iosCache && this._iosCache.set(i, u, c.headers), this.succeeded = !0, this._successCallback(i);
    } catch (l) {
      if (clearTimeout(this._networkTimeout), l instanceof Un || this.cancelled || this._networkTimedOut) return;
      this._failureCallback({ msg: "Failed to load call object bundle ".concat(i, ": ").concat(l), type: l.message });
    }
  }), function(i) {
    return e.apply(this, arguments);
  }) }, { key: "_getBundleCodeFromResponse", value: (r = J(function* (i, s) {
    if (s.ok) return yield s.text();
    if (this._iosCache && s.status === 304) return (yield this._iosCache.renew(i, s.headers)).code;
    throw new Error("Received ".concat(s.status, " response"));
  }), function(i, s) {
    return r.apply(this, arguments);
  }) }]);
  var r, e, t, n;
})(), ym = (function() {
  return Ce(function r(e, t, n) {
    Me(this, r), this.cancelled = !1, this.succeeded = !1, this._dailyConfig = e, this._successCallback = t, this._failureCallback = n, this._attemptId = dn(), this._networkTimeout = null, this._scriptElement = null;
  }, [{ key: "start", value: function() {
    window._dailyCallMachineLoadWaitlist || (window._dailyCallMachineLoadWaitlist = /* @__PURE__ */ new Set());
    var r = Xr(this._dailyConfig);
    (typeof document > "u" ? "undefined" : te(document)) === "object" ? this._startLoading(r) : this._failureCallback({ msg: "Call object bundle must be loaded in a DOM/web context", type: "missing context" });
  } }, { key: "cancel", value: function() {
    this._stopLoading(), this.cancelled = !0;
  } }, { key: "_startLoading", value: function(r) {
    var e = this;
    this._signUpForCallMachineLoadWaitlist(), this._networkTimeout = setTimeout(function() {
      e._stopLoading(), e._failureCallback({ msg: "Timed out (>".concat(an, " ms) when loading call object bundle ").concat(r), type: "timeout" });
    }, an);
    var t = document.getElementsByTagName("head")[0], n = document.createElement("script");
    this._scriptElement = n, n.onload = function() {
      e._stopLoading(), e.succeeded = !0, e._successCallback(r);
    }, n.onerror = function(i) {
      e._stopLoading(), e._failureCallback({ msg: "Failed to load call object bundle ".concat(i.target.src), type: i.message });
    }, n.src = r, t.appendChild(n);
  } }, { key: "_stopLoading", value: function() {
    this._withdrawFromCallMachineLoadWaitlist(), clearTimeout(this._networkTimeout), this._scriptElement && (this._scriptElement.onload = null, this._scriptElement.onerror = null);
  } }, { key: "_signUpForCallMachineLoadWaitlist", value: function() {
    window._dailyCallMachineLoadWaitlist.add(this._attemptId);
  } }, { key: "_withdrawFromCallMachineLoadWaitlist", value: function() {
    window._dailyCallMachineLoadWaitlist.delete(this._attemptId);
  } }]);
})(), Ur = function(r, e, t) {
  return wm(r.local, e, t) === !0;
}, _m = function(r, e, t) {
  return r.local.streams && r.local.streams[e] && r.local.streams[e].stream && r.local.streams[e].stream["get".concat(t === "video" ? "Video" : "Audio", "Tracks")]()[0];
}, zt = function(r, e, t, n) {
  var i = Sm(r, e, t, n);
  return i && i.pendingTrack;
}, wm = function(r, e, t) {
  if (!r) return !1;
  var n = function(s) {
    switch (s) {
      case "avatar":
        return !0;
      case "staged":
        return s;
      default:
        return !!s;
    }
  }, i = r.public.subscribedTracks;
  return i && i[e] ? ["cam-audio", "cam-video", "screen-video", "screen-audio", "rmpAudio", "rmpVideo"].indexOf(t) === -1 && i[e].custom ? [!0, "staged"].includes(i[e].custom) ? n(i[e].custom) : n(i[e].custom[t]) : n(i[e][t]) : !i || n(i.ALL);
}, Sm = function(r, e, t, n) {
  var i = Object.values(r.streams || {}).filter(function(s) {
    return s.participantId === e && s.type === t && s.pendingTrack && s.pendingTrack.kind === n;
  }).sort(function(s, a) {
    return new Date(a.starttime) - new Date(s.starttime);
  });
  return i && i[0];
}, km = function(r, e) {
  var t = r.local.public.customTracks;
  if (t && t[e]) return t[e].track;
};
function Wc(r, e) {
  for (var t = e.getState(), n = 0, i = ["cam", "screen"]; n < i.length; n++) for (var s = i[n], a = 0, c = ["video", "audio"]; a < c.length; a++) {
    var u = c[a], l = s === "cam" ? u : "screen".concat(u.charAt(0).toUpperCase() + u.slice(1)), f = r.tracks[l];
    if (f) {
      var p = r.local ? _m(t, s, u) : zt(t, r.session_id, s, u);
      f.state === "playable" && (f.track = p), f.persistentTrack = p;
    }
  }
}
function Gc(r, e) {
  try {
    var t = e.getState();
    for (var n in r.tracks) if (!Mm(n)) {
      var i = r.tracks[n].kind;
      if (i) {
        var s = r.tracks[n];
        if (s) {
          var a = r.local ? km(t, n) : zt(t, r.session_id, n, i);
          s.state === "playable" && (r.tracks[n].track = a), s.persistentTrack = a;
        }
      } else console.error("unknown type for custom track");
    }
  } catch (c) {
    console.error(c);
  }
}
function Mm(r) {
  return ["video", "audio", "screenVideo", "screenAudio"].includes(r);
}
function Jc(r, e, t) {
  var n = t.getState();
  if (r.local) {
    if (r.audio) try {
      r.audioTrack = n.local.streams.cam.stream.getAudioTracks()[0], r.audioTrack || (r.audio = !1);
    } catch {
    }
    if (r.video) try {
      r.videoTrack = n.local.streams.cam.stream.getVideoTracks()[0], r.videoTrack || (r.video = !1);
    } catch {
    }
    if (r.screen) try {
      r.screenVideoTrack = n.local.streams.screen.stream.getVideoTracks()[0], r.screenAudioTrack = n.local.streams.screen.stream.getAudioTracks()[0], r.screenVideoTrack || r.screenAudioTrack || (r.screen = !1);
    } catch {
    }
  } else {
    var i = !0;
    try {
      var s = n.participants[r.session_id];
      s && s.public && s.public.rtcType && s.public.rtcType.impl === "peer-to-peer" && s.private && !["connected", "completed"].includes(s.private.peeringState) && (i = !1);
    } catch (f) {
      console.error(f);
    }
    if (!i) return r.audio = !1, r.audioTrack = !1, r.video = !1, r.videoTrack = !1, r.screen = !1, void (r.screenTrack = !1);
    try {
      if (n.streams, r.audio && Ur(n, r.session_id, "cam-audio")) {
        var a = zt(n, r.session_id, "cam", "audio");
        a && (e && e.audioTrack && e.audioTrack.id === a.id ? r.audioTrack = a : a.muted || (r.audioTrack = a)), r.audioTrack || (r.audio = !1);
      }
      if (r.video && Ur(n, r.session_id, "cam-video")) {
        var c = zt(n, r.session_id, "cam", "video");
        c && (e && e.videoTrack && e.videoTrack.id === c.id ? r.videoTrack = c : c.muted || (r.videoTrack = c)), r.videoTrack || (r.video = !1);
      }
      if (r.screen && Ur(n, r.session_id, "screen-audio")) {
        var u = zt(n, r.session_id, "screen", "audio");
        u && (e && e.screenAudioTrack && e.screenAudioTrack.id === u.id ? r.screenAudioTrack = u : u.muted || (r.screenAudioTrack = u));
      }
      if (r.screen && Ur(n, r.session_id, "screen-video")) {
        var l = zt(n, r.session_id, "screen", "video");
        l && (e && e.screenVideoTrack && e.screenVideoTrack.id === l.id ? r.screenVideoTrack = l : l.muted || (r.screenVideoTrack = l));
      }
      r.screenVideoTrack || r.screenAudioTrack || (r.screen = !1);
    } catch (f) {
      console.error("unexpected error matching up tracks", f);
    }
  }
}
function Cm(r, e) {
  var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = (function(u, l) {
      if (u) {
        if (typeof u == "string") return Hc(u, l);
        var f = {}.toString.call(u).slice(8, -1);
        return f === "Object" && u.constructor && (f = u.constructor.name), f === "Map" || f === "Set" ? Array.from(u) : f === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(f) ? Hc(u, l) : void 0;
      }
    })(r)) || e) {
      t && (r = t);
      var n = 0, i = function() {
      };
      return { s: i, n: function() {
        return n >= r.length ? { done: !0 } : { done: !1, value: r[n++] };
      }, e: function(u) {
        throw u;
      }, f: i };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  var s, a = !0, c = !1;
  return { s: function() {
    t = t.call(r);
  }, n: function() {
    var u = t.next();
    return a = u.done, u;
  }, e: function(u) {
    c = !0, s = u;
  }, f: function() {
    try {
      a || t.return == null || t.return();
    } finally {
      if (c) throw s;
    }
  } };
}
function Hc(r, e) {
  (e == null || e > r.length) && (e = r.length);
  for (var t = 0, n = Array(e); t < e; t++) n[t] = r[t];
  return n;
}
var We = /* @__PURE__ */ new Map(), Gt = null;
function Em(r, e) {
  var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = (function(u, l) {
      if (u) {
        if (typeof u == "string") return Kc(u, l);
        var f = {}.toString.call(u).slice(8, -1);
        return f === "Object" && u.constructor && (f = u.constructor.name), f === "Map" || f === "Set" ? Array.from(u) : f === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(f) ? Kc(u, l) : void 0;
      }
    })(r)) || e) {
      t && (r = t);
      var n = 0, i = function() {
      };
      return { s: i, n: function() {
        return n >= r.length ? { done: !0 } : { done: !1, value: r[n++] };
      }, e: function(u) {
        throw u;
      }, f: i };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  var s, a = !0, c = !1;
  return { s: function() {
    t = t.call(r);
  }, n: function() {
    var u = t.next();
    return a = u.done, u;
  }, e: function(u) {
    c = !0, s = u;
  }, f: function() {
    try {
      a || t.return == null || t.return();
    } finally {
      if (c) throw s;
    }
  } };
}
function Kc(r, e) {
  (e == null || e > r.length) && (e = r.length);
  for (var t = 0, n = Array(e); t < e; t++) n[t] = r[t];
  return n;
}
var Ge = /* @__PURE__ */ new Map(), dr = null;
function Am(r) {
  _h() ? (function(e) {
    We.has(e) || (We.set(e, {}), navigator.mediaDevices.enumerateDevices().then(function(t) {
      We.has(e) && (We.get(e).lastDevicesString = JSON.stringify(t), Gt || (Gt = (function() {
        var n = J(function* () {
          var i, s = yield navigator.mediaDevices.enumerateDevices(), a = Cm(We.keys());
          try {
            for (a.s(); !(i = a.n()).done; ) {
              var c = i.value, u = JSON.stringify(s);
              u !== We.get(c).lastDevicesString && (We.get(c).lastDevicesString = u, c(s));
            }
          } catch (l) {
            a.e(l);
          } finally {
            a.f();
          }
        });
        return function() {
          return n.apply(this, arguments);
        };
      })(), navigator.mediaDevices.addEventListener("devicechange", Gt)));
    }).catch(function() {
    }));
  })(r) : (function(e) {
    Ge.has(e) || (Ge.set(e, {}), navigator.mediaDevices.enumerateDevices().then(function(t) {
      Ge.has(e) && (Ge.get(e).lastDevicesString = JSON.stringify(t), dr || (dr = setInterval(J(function* () {
        var n, i = yield navigator.mediaDevices.enumerateDevices(), s = Em(Ge.keys());
        try {
          for (s.s(); !(n = s.n()).done; ) {
            var a = n.value, c = JSON.stringify(i);
            c !== Ge.get(a).lastDevicesString && (Ge.get(a).lastDevicesString = c, a(i));
          }
        } catch (u) {
          s.e(u);
        } finally {
          s.f();
        }
      }), 3e3)));
    }));
  })(r);
}
function Tm(r) {
  _h() ? (function(e) {
    We.has(e) && (We.delete(e), We.size === 0 && Gt && (navigator.mediaDevices.removeEventListener("devicechange", Gt), Gt = null));
  })(r) : (function(e) {
    Ge.has(e) && (Ge.delete(e), Ge.size === 0 && dr && (clearInterval(dr), dr = null));
  })(r);
}
function _h() {
  var r;
  return ee() || ((r = navigator.mediaDevices) === null || r === void 0 ? void 0 : r.ondevicechange) !== void 0;
}
var Om = /* @__PURE__ */ new Set();
function Pm(r, e) {
  return r && r.readyState === "live" && !(function(t, n) {
    return t.muted && !Om.has(t.id);
  })(r);
}
function Qc(r, e) {
  var t = Object.keys(r);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(r);
    e && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(r, i).enumerable;
    })), t.push.apply(t, n);
  }
  return t;
}
function ct(r) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Qc(Object(t), !0).forEach(function(n) {
      Je(r, n, t[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : Qc(Object(t)).forEach(function(n) {
      Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n));
    });
  }
  return r;
}
var or = Object.freeze({ VIDEO: "video", AUDIO: "audio", SCREEN_VIDEO: "screenVideo", SCREEN_AUDIO: "screenAudio", CUSTOM_VIDEO: "customVideo", CUSTOM_AUDIO: "customAudio" }), xm = Object.freeze({ PARTICIPANTS: "participants", STREAMING: "streaming", TRANSCRIPTION: "transcription" }), hr = Object.values(or), Yc = ["v", "a", "sv", "sa", "cv", "ca"];
Object.freeze(hr.reduce(function(r, e, t) {
  return r[e] = Yc[t], r;
}, {})), Object.freeze(Yc.reduce(function(r, e, t) {
  return r[e] = hr[t], r;
}, {}));
var Im = [or.VIDEO, or.AUDIO, or.SCREEN_VIDEO, or.SCREEN_AUDIO], Xc = Object.values(xm), Zc = ["p", "s", "t"];
Object.freeze(Xc.reduce(function(r, e, t) {
  return r[e] = Zc[t], r;
}, {})), Object.freeze(Zc.reduce(function(r, e, t) {
  return r[e] = Xc[t], r;
}, {}));
var wh = (function() {
  function r() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = e.base, n = e.byUserId, i = e.byParticipantId;
    Me(this, r), this.base = t, this.byUserId = n, this.byParticipantId = i;
  }
  return Ce(r, [{ key: "clone", value: function() {
    var e = new r();
    if (this.base instanceof fe ? e.base = this.base.clone() : e.base = this.base, this.byUserId !== void 0) for (var t in e.byUserId = {}, this.byUserId) {
      var n = this.byUserId[t];
      e.byUserId[t] = n instanceof fe ? n.clone() : n;
    }
    if (this.byParticipantId !== void 0) for (var i in e.byParticipantId = {}, this.byParticipantId) {
      var s = this.byParticipantId[i];
      e.byParticipantId[i] = s instanceof fe ? s.clone() : s;
    }
    return e;
  } }, { key: "toJSONObject", value: function() {
    var e = {};
    if (typeof this.base == "boolean" ? e.base = this.base : this.base instanceof fe && (e.base = this.base.toJSONObject()), this.byUserId !== void 0) for (var t in e.byUserId = {}, this.byUserId) {
      var n = this.byUserId[t];
      e.byUserId[t] = n instanceof fe ? n.toJSONObject() : n;
    }
    if (this.byParticipantId !== void 0) for (var i in e.byParticipantId = {}, this.byParticipantId) {
      var s = this.byParticipantId[i];
      e.byParticipantId[i] = s instanceof fe ? s.toJSONObject() : s;
    }
    return e;
  } }, { key: "toMinifiedJSONObject", value: function() {
    var e = {};
    if (this.base !== void 0 && (typeof this.base == "boolean" ? e.b = this.base : e.b = this.base.toMinifiedJSONObject()), this.byUserId !== void 0) for (var t in e.u = {}, this.byUserId) {
      var n = this.byUserId[t];
      e.u[t] = typeof n == "boolean" ? n : n.toMinifiedJSONObject();
    }
    if (this.byParticipantId !== void 0) for (var i in e.p = {}, this.byParticipantId) {
      var s = this.byParticipantId[i];
      e.p[i] = typeof s == "boolean" ? s : s.toMinifiedJSONObject();
    }
    return e;
  } }, { key: "normalize", value: function() {
    return this.base instanceof fe && (this.base = this.base.normalize()), this.byUserId && (this.byUserId = Object.fromEntries(Object.entries(this.byUserId).map(function(e) {
      var t = le(e, 2), n = t[0], i = t[1];
      return [n, i instanceof fe ? i.normalize() : i];
    }))), this.byParticipantId && (this.byParticipantId = Object.fromEntries(Object.entries(this.byParticipantId).map(function(e) {
      var t = le(e, 2), n = t[0], i = t[1];
      return [n, i instanceof fe ? i.normalize() : i];
    }))), this;
  } }], [{ key: "fromJSONObject", value: function(e) {
    var t, n, i;
    if (e.base !== void 0 && (t = typeof e.base == "boolean" ? e.base : fe.fromJSONObject(e.base)), e.byUserId !== void 0) for (var s in n = {}, e.byUserId) {
      var a = e.byUserId[s];
      n[s] = typeof a == "boolean" ? a : fe.fromJSONObject(a);
    }
    if (e.byParticipantId !== void 0) for (var c in i = {}, e.byParticipantId) {
      var u = e.byParticipantId[c];
      i[c] = typeof u == "boolean" ? u : fe.fromJSONObject(u);
    }
    return new r({ base: t, byUserId: n, byParticipantId: i });
  } }, { key: "fromMinifiedJSONObject", value: function(e) {
    var t, n, i;
    if (e.b !== void 0 && (t = typeof e.b == "boolean" ? e.b : fe.fromMinifiedJSONObject(e.b)), e.u !== void 0) for (var s in n = {}, e.u) {
      var a = e.u[s];
      n[s] = typeof a == "boolean" ? a : fe.fromMinifiedJSONObject(a);
    }
    if (e.p !== void 0) for (var c in i = {}, e.p) {
      var u = e.p[c];
      i[c] = typeof u == "boolean" ? u : fe.fromMinifiedJSONObject(u);
    }
    return new r({ base: t, byUserId: n, byParticipantId: i });
  } }, { key: "validateJSONObject", value: function(e) {
    if (te(e) !== "object") return [!1, "canReceive must be an object"];
    for (var t = ["base", "byUserId", "byParticipantId"], n = 0, i = Object.keys(e); n < i.length; n++) {
      var s = i[n];
      if (!t.includes(s)) return [!1, "canReceive can only contain keys (".concat(t.join(", "), ")")];
      if (s === "base") {
        var a = le(fe.validateJSONObject(e.base, !0), 2), c = a[0], u = a[1];
        if (!c) return [!1, u];
      } else {
        if (te(e[s]) !== "object") return [!1, "invalid (non-object) value for field '".concat(s, "' in canReceive")];
        for (var l = 0, f = Object.values(e[s]); l < f.length; l++) {
          var p = f[l], y = le(fe.validateJSONObject(p), 2), M = y[0], b = y[1];
          if (!M) return [!1, b];
        }
      }
    }
    return [!0];
  } }]);
})(), fe = (function() {
  function r() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = e.video, n = e.audio, i = e.screenVideo, s = e.screenAudio, a = e.customVideo, c = e.customAudio;
    Me(this, r), this.video = t, this.audio = n, this.screenVideo = i, this.screenAudio = s, this.customVideo = a, this.customAudio = c;
  }
  return Ce(r, [{ key: "clone", value: function() {
    var e = new r();
    return this.video !== void 0 && (e.video = this.video), this.audio !== void 0 && (e.audio = this.audio), this.screenVideo !== void 0 && (e.screenVideo = this.screenVideo), this.screenAudio !== void 0 && (e.screenAudio = this.screenAudio), this.customVideo !== void 0 && (e.customVideo = ct({}, this.customVideo)), this.customAudio !== void 0 && (e.customAudio = ct({}, this.customAudio)), e;
  } }, { key: "toJSONObject", value: function() {
    var e = {};
    return this.video !== void 0 && (e.video = this.video), this.audio !== void 0 && (e.audio = this.audio), this.screenVideo !== void 0 && (e.screenVideo = this.screenVideo), this.screenAudio !== void 0 && (e.screenAudio = this.screenAudio), this.customVideo !== void 0 && (e.customVideo = ct({}, this.customVideo)), this.customAudio !== void 0 && (e.customAudio = ct({}, this.customAudio)), e;
  } }, { key: "toMinifiedJSONObject", value: function() {
    var e = {};
    return this.video !== void 0 && (e.v = this.video), this.audio !== void 0 && (e.a = this.audio), this.screenVideo !== void 0 && (e.sv = this.screenVideo), this.screenAudio !== void 0 && (e.sa = this.screenAudio), this.customVideo !== void 0 && (e.cv = ct({}, this.customVideo)), this.customAudio !== void 0 && (e.ca = ct({}, this.customAudio)), e;
  } }, { key: "normalize", value: function() {
    function e(t, n) {
      return t && Object.keys(t).length === 1 && t["*"] === n;
    }
    return !(this.video !== !0 || this.audio !== !0 || this.screenVideo !== !0 || this.screenAudio !== !0 || !e(this.customVideo, !0) || !e(this.customAudio, !0)) || (this.video !== !1 || this.audio !== !1 || this.screenVideo !== !1 || this.screenAudio !== !1 || !e(this.customVideo, !1) || !e(this.customAudio, !1)) && this;
  } }], [{ key: "fromBoolean", value: function(e) {
    return new r({ video: e, audio: e, screenVideo: e, screenAudio: e, customVideo: { "*": e }, customAudio: { "*": e } });
  } }, { key: "fromJSONObject", value: function(e) {
    return new r({ video: e.video, audio: e.audio, screenVideo: e.screenVideo, screenAudio: e.screenAudio, customVideo: e.customVideo !== void 0 ? ct({}, e.customVideo) : void 0, customAudio: e.customAudio !== void 0 ? ct({}, e.customAudio) : void 0 });
  } }, { key: "fromMinifiedJSONObject", value: function(e) {
    return new r({ video: e.v, audio: e.a, screenVideo: e.sv, screenAudio: e.sa, customVideo: e.cv, customAudio: e.ca });
  } }, { key: "validateJSONObject", value: function(e, t) {
    if (typeof e == "boolean") return [!0];
    if (te(e) !== "object") return [!1, "invalid (non-object, non-boolean) value in canReceive"];
    for (var n = Object.keys(e), i = 0, s = n; i < s.length; i++) {
      var a = s[i];
      if (!hr.includes(a)) return [!1, "invalid media type '".concat(a, "' in canReceive")];
      if (Im.includes(a)) {
        if (typeof e[a] != "boolean") return [!1, "invalid (non-boolean) value for media type '".concat(a, "' in canReceive")];
      } else {
        if (te(e[a]) !== "object") return [!1, "invalid (non-object) value for media type '".concat(a, "' in canReceive")];
        for (var c = 0, u = Object.values(e[a]); c < u.length; c++)
          if (typeof u[c] != "boolean") return [!1, "invalid (non-boolean) value for entry within '".concat(a, "' in canReceive")];
        if (t && e[a]["*"] === void 0) return [!1, `canReceive "base" permission must specify "*" as an entry within '`.concat(a, "'")];
      }
    }
    return t && n.length !== hr.length ? [!1, 'canReceive "base" permission must specify all media types: '.concat(hr.join(", "), " (or be set to a boolean shorthand)")] : [!0];
  } }]);
})(), Lm = ["result"], Rm = ["preserveIframe"];
function eu(r, e) {
  var t = Object.keys(r);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(r);
    e && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(r, i).enumerable;
    })), t.push.apply(t, n);
  }
  return t;
}
function B(r) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? eu(Object(t), !0).forEach(function(n) {
      Je(r, n, t[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : eu(Object(t)).forEach(function(n) {
      Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n));
    });
  }
  return r;
}
function Sh() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (Sh = function() {
    return !!r;
  })();
}
function ya(r, e) {
  var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = (function(u, l) {
      if (u) {
        if (typeof u == "string") return tu(u, l);
        var f = {}.toString.call(u).slice(8, -1);
        return f === "Object" && u.constructor && (f = u.constructor.name), f === "Map" || f === "Set" ? Array.from(u) : f === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(f) ? tu(u, l) : void 0;
      }
    })(r)) || e) {
      t && (r = t);
      var n = 0, i = function() {
      };
      return { s: i, n: function() {
        return n >= r.length ? { done: !0 } : { done: !1, value: r[n++] };
      }, e: function(u) {
        throw u;
      }, f: i };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  var s, a = !0, c = !1;
  return { s: function() {
    t = t.call(r);
  }, n: function() {
    var u = t.next();
    return a = u.done, u;
  }, e: function(u) {
    c = !0, s = u;
  }, f: function() {
    try {
      a || t.return == null || t.return();
    } finally {
      if (c) throw s;
    }
  } };
}
function tu(r, e) {
  (e == null || e > r.length) && (e = r.length);
  for (var t = 0, n = Array(e); t < e; t++) n[t] = r[t];
  return n;
}
var _t = {}, ru = "video", jm = "voice", nu = ee() ? { data: {} } : { data: {}, topology: "none" }, iu = { present: 0, hidden: 0 }, kh = { maxBitrate: { min: 1e5, max: 25e5 }, maxFramerate: { min: 1, max: 30 }, scaleResolutionDownBy: { min: 1, max: 8 } }, Vn = Object.keys(kh), su = ["state", "volume", "simulcastEncodings"], au = { androidInCallNotification: { title: "string", subtitle: "string", iconName: "string", disableForCustomOverride: "boolean" }, disableAutoDeviceManagement: { audio: "boolean", video: "boolean" } }, on = { id: { iconPath: "string", iconPathDarkMode: "string", label: "string", tooltip: "string", visualState: "'default' | 'sidebar-open' | 'active'" } }, _a = { id: { allow: "string", controlledBy: "'*' | 'owners' | string[]", csp: "string", iconURL: "string", label: "string", loading: "'eager' | 'lazy'", location: "'main' | 'sidebar'", name: "string", referrerPolicy: "string", sandbox: "string", src: "string", srcdoc: "string", shared: "string[] | 'owners' | boolean" } }, Mh = /^[a-zA-Z0-9_-]+$/;
function ou(r) {
  if (r != null && te(r) === "object" && !Array.isArray(r)) {
    var e, t = {}, n = ya(Object.entries(r).slice(0, 10));
    try {
      for (n.s(); !(e = n.n()).done; ) {
        var i = le(e.value, 2), s = i[0], a = i[1];
        typeof s != "string" || s.length > 64 || Mh.test(s) && typeof a == "string" && (t[s] = a.slice(0, 256));
      }
    } catch (c) {
      n.e(c);
    } finally {
      n.f();
    }
    return Object.keys(t).length ? t : void 0;
  }
}
var wt = { customIntegrations: { validate: Ih, help: Ph() }, customTrayButtons: { validate: xh, help: "customTrayButtons should be a dictionary of the type ".concat(JSON.stringify(on)) }, url: { validate: function(r) {
  return typeof r == "string";
}, help: "url should be a string" }, baseUrl: { validate: function(r) {
  return console.warn("baseUrl is deprecated and has no effect"), typeof r == "string";
}, help: "baseUrl should be a string" }, token: { validate: function(r) {
  return typeof r == "string";
}, help: "token should be a string", queryString: "t" }, dailyConfig: { validate: function(r, e) {
  try {
    return e.validateDailyConfig(r), !0;
  } catch (t) {
    console.error("Failed to validate dailyConfig", t);
  }
  return !1;
}, help: "Unsupported dailyConfig. Check error logs for detailed info." }, reactNativeConfig: { validate: function(r) {
  return Lh(r, au);
}, help: "reactNativeConfig should look like ".concat(JSON.stringify(au), ", all fields optional") }, lang: { validate: function(r) {
  return ["da", "de", "en-us", "en", "es", "fi", "fr", "it", "jp", "ka", "nl", "no", "pl", "pt", "pt-BR", "ru", "sv", "tr", "user"].includes(r);
}, help: "language not supported. Options are: da, de, en-us, en, es, fi, fr, it, jp, ka, nl, no, pl, pt, pt-BR, ru, sv, tr, user" }, userName: !0, userData: { validate: function(r) {
  try {
    return Ch(r), !0;
  } catch (e) {
    return console.error(e), !1;
  }
}, help: "invalid userData type provided" }, startVideoOff: !0, startAudioOff: !0, allowLocalVideo: !0, allowLocalAudio: !0, activeSpeakerMode: !0, showLeaveButton: !0, showLocalVideo: !0, showParticipantsBar: !0, showFullscreenButton: !0, showUserNameChangeUI: !0, iframeStyle: !0, customLayout: !0, cssFile: !0, cssText: !0, bodyClass: !0, videoSource: { validate: function(r, e) {
  if (typeof r == "boolean") return e._preloadCache.allowLocalVideo = r, !0;
  var t;
  if (r instanceof MediaStreamTrack) e._sharedTracks.videoTrack = r, t = { customTrack: rt };
  else {
    if (delete e._sharedTracks.videoTrack, typeof r != "string") return console.error("videoSource must be a MediaStreamTrack, boolean, or a string"), !1;
    t = { deviceId: r };
  }
  return e._updatePreloadCacheInputSettings({ video: { settings: t } }, !1), !0;
} }, audioSource: { validate: function(r, e) {
  if (typeof r == "boolean") return e._preloadCache.allowLocalAudio = r, !0;
  var t;
  if (r instanceof MediaStreamTrack) e._sharedTracks.audioTrack = r, t = { customTrack: rt };
  else {
    if (delete e._sharedTracks.audioTrack, typeof r != "string") return console.error("audioSource must be a MediaStreamTrack, boolean, or a string"), !1;
    t = { deviceId: r };
  }
  return e._updatePreloadCacheInputSettings({ audio: { settings: t } }, !1), !0;
} }, subscribeToTracksAutomatically: { validate: function(r, e) {
  return e._preloadCache.subscribeToTracksAutomatically = r, !0;
} }, theme: { validate: function(r) {
  var e = ["accent", "accentText", "background", "backgroundAccent", "baseText", "border", "mainAreaBg", "mainAreaBgAccent", "mainAreaText", "supportiveText"], t = function(n) {
    for (var i = 0, s = Object.keys(n); i < s.length; i++) {
      var a = s[i];
      if (!e.includes(a)) return console.error('unsupported color "'.concat(a, '". Valid colors: ').concat(e.join(", "))), !1;
      if (!n[a].match(/^#[0-9a-f]{6}|#[0-9a-f]{3}$/i)) return console.error("".concat(a, ' theme color should be provided in valid hex color format. Received: "').concat(n[a], '"')), !1;
    }
    return !0;
  };
  return te(r) === "object" && ("light" in r && "dark" in r || "colors" in r) ? "light" in r && "dark" in r ? "colors" in r.light ? "colors" in r.dark ? t(r.light.colors) && t(r.dark.colors) : (console.error('Dark theme is missing "colors" property.', r), !1) : (console.error('Light theme is missing "colors" property.', r), !1) : t(r.colors) : (console.error('Theme must contain either both "light" and "dark" properties, or "colors".', r), !1);
}, help: "unsupported theme configuration. Check error logs for detailed info." }, layoutConfig: { validate: function(r) {
  if ("grid" in r) {
    var e = r.grid;
    if ("maxTilesPerPage" in e) {
      if (!Number.isInteger(e.maxTilesPerPage)) return console.error("grid.maxTilesPerPage should be an integer. You passed ".concat(e.maxTilesPerPage, ".")), !1;
      if (e.maxTilesPerPage > 49) return console.error("grid.maxTilesPerPage can't be larger than 49 without sacrificing browser performance. Please contact us at https://www.daily.co/contact to talk about your use case."), !1;
    }
    if ("minTilesPerPage" in e) {
      if (!Number.isInteger(e.minTilesPerPage)) return console.error("grid.minTilesPerPage should be an integer. You passed ".concat(e.minTilesPerPage, ".")), !1;
      if (e.minTilesPerPage < 1) return console.error("grid.minTilesPerPage can't be lower than 1."), !1;
      if ("maxTilesPerPage" in e && e.minTilesPerPage > e.maxTilesPerPage) return console.error("grid.minTilesPerPage can't be higher than grid.maxTilesPerPage."), !1;
    }
  }
  return !0;
}, help: "unsupported layoutConfig. Check error logs for detailed info." }, receiveSettings: { validate: function(r) {
  return Eh(r, { allowAllParticipantsKey: !1 });
}, help: Oh({ allowAllParticipantsKey: !1 }) }, sendSettings: { validate: function(r, e) {
  return !!(function(t, n) {
    try {
      return n.validateUpdateSendSettings(t), !0;
    } catch (i) {
      return console.error("Failed to validate send settings", i), !1;
    }
  })(r, e) && (e._preloadCache.sendSettings = r, !0);
}, help: "Invalid sendSettings provided. Check error logs for detailed info." }, inputSettings: { validate: function(r, e) {
  var t;
  return !!Ah(r) && (e._inputSettings || (e._inputSettings = {}), Th(r, (t = e.properties) === null || t === void 0 ? void 0 : t.dailyConfig, e._sharedTracks), e._updatePreloadCacheInputSettings(r, !0), !0);
}, help: wa() }, layout: { validate: function(r) {
  return r === "custom-v1" || r === "browser" || r === "none";
}, help: 'layout may only be set to "custom-v1"', queryString: "layout" }, emb: { queryString: "emb" }, embHref: { queryString: "embHref" }, dailyJsVersion: { queryString: "dailyJsVersion" }, aboutClient: { validate: function(r) {
  if (r == null) return !0;
  if (te(r) !== "object" || Array.isArray(r)) return !1;
  var e = Object.entries(r);
  if (e.length > 10) return !1;
  for (var t = 0, n = e; t < n.length; t++) {
    var i = le(n[t], 2), s = i[0], a = i[1];
    if (typeof s != "string" || s.length > 64 || !Mh.test(s) || typeof a != "string" || a.length > 256) return !1;
  }
  return !0;
}, help: "aboutClient must be an object with up to ".concat(10, " entries; keys must be strings made up of characters (a-z, 0-9, _, -) and a max length of ").concat(64, "; values must be strings with a max length of ").concat(256) }, proxy: { queryString: "proxy" }, strictMode: !0, allowMultipleCallInstances: !0 }, Vr = { styles: { validate: function(r) {
  for (var e in r) if (e !== "cam" && e !== "screen") return !1;
  if (r.cam) {
    for (var t in r.cam) if (t !== "div" && t !== "video") return !1;
  }
  if (r.screen) {
    for (var n in r.screen) if (n !== "div" && n !== "video") return !1;
  }
  return !0;
}, help: "styles format should be a subset of: { cam: {div: {}, video: {}}, screen: {div: {}, video: {}} }" }, setSubscribedTracks: { validate: function(r, e) {
  if (e._preloadCache.subscribeToTracksAutomatically) return !1;
  var t = [!0, !1, "staged"];
  if (t.includes(r) || !ee() && r === "avatar") return !0;
  var n = ["audio", "video", "screenAudio", "screenVideo", "rmpAudio", "rmpVideo"], i = function(s) {
    var a = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
    for (var c in s) if (c === "custom") {
      if (!t.includes(s[c]) && !i(s[c], !0)) return !1;
    } else {
      var u = !a && !n.includes(c), l = !t.includes(s[c]);
      if (u || l) return !1;
    }
    return !0;
  };
  return i(r);
}, help: "setSubscribedTracks cannot be used when setSubscribeToTracksAutomatically is enabled, and should be of the form: " + "true".concat(ee() ? "" : " | 'avatar'", " | false | 'staged' | { [audio: true|false|'staged'], [video: true|false|'staged'], [screenAudio: true|false|'staged'], [screenVideo: true|false|'staged'] }") }, setAudio: !0, setVideo: !0, setScreenShare: { validate: function(r) {
  return r === !1;
}, help: "setScreenShare must be false, as it's only meant for stopping remote participants' screen shares" }, eject: !0, updatePermissions: { validate: function(r) {
  for (var e = 0, t = Object.entries(r); e < t.length; e++) {
    var n = le(t[e], 2), i = n[0], s = n[1];
    switch (i) {
      case "hasPresence":
        if (typeof s != "boolean") return !1;
        break;
      case "canSend":
        if (s instanceof Set || s instanceof Array || Array.isArray(s)) {
          var a, c = ["video", "audio", "screenVideo", "screenAudio", "customVideo", "customAudio"], u = ya(s);
          try {
            for (u.s(); !(a = u.n()).done; ) {
              var l = a.value;
              if (!c.includes(l)) return !1;
            }
          } catch (E) {
            u.e(E);
          } finally {
            u.f();
          }
        } else if (typeof s != "boolean") return !1;
        (s instanceof Array || Array.isArray(s)) && (r.canSend = new Set(s));
        break;
      case "canReceive":
        var f = le(wh.validateJSONObject(s), 2), p = f[0], y = f[1];
        if (!p) return console.error(y), !1;
        break;
      case "canAdmin":
        if (s instanceof Set || s instanceof Array || Array.isArray(s)) {
          var M, b = ["participants", "streaming", "transcription"], v = ya(s);
          try {
            for (v.s(); !(M = v.n()).done; ) {
              var C = M.value;
              if (!b.includes(C)) return !1;
            }
          } catch (E) {
            v.e(E);
          } finally {
            v.f();
          }
        } else if (typeof s != "boolean") return !1;
        (s instanceof Array || Array.isArray(s)) && (r.canAdmin = new Set(s));
        break;
      default:
        return !1;
    }
  }
  return !0;
}, help: "updatePermissions can take hasPresence, canSend, canReceive, and canAdmin permissions. hasPresence must be a boolean. canSend can be a boolean or an Array or Set of media types (video, audio, screenVideo, screenAudio, customVideo, customAudio). canReceive must be an object specifying base, byUserId, and/or byParticipantId fields (see documentation for more details). canAdmin can be a boolean or an Array or Set of admin types (participants, streaming, transcription)." } };
Promise.any || (Promise.any = (function() {
  var r = J(function* (e) {
    return new Promise(function(t, n) {
      var i = [];
      e.forEach(function(s) {
        return Promise.resolve(s).then(function(a) {
          t(a);
        }).catch(function(a) {
          i.push(a), i.length === e.length && n(i);
        });
      });
    });
  });
  return function(e) {
    return r.apply(this, arguments);
  };
})());
var cu = (function() {
  function r(o) {
    var h, d, g, m, A, P, x = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (Me(this, r), g = this, m = $e(m = r), Je(d = un(g, Sh() ? Reflect.construct(m, [], $e(g).constructor) : m.apply(g, A)), "startListeningForDeviceChanges", function() {
      Am(d.handleDeviceChange);
    }), Je(d, "stopListeningForDeviceChanges", function() {
      Tm(d.handleDeviceChange);
    }), Je(d, "handleDeviceChange", function(H) {
      H = H.map(function(Q) {
        return JSON.parse(JSON.stringify(Q));
      }), d.emitDailyJSEvent({ action: "available-devices-updated", availableDevices: H });
    }), Je(d, "handleNativeAppStateChange", (function() {
      var H = J(function* (Q) {
        if (Q === "destroyed") return console.warn("App has been destroyed before leaving the meeting. Cleaning up all the resources!"), void (yield d.destroy());
        var Ee = Q === "active";
        d.disableReactNativeAutoDeviceManagement("video") || (Ee ? d.camUnmutedBeforeLosingNativeActiveState && d.setLocalVideo(!0) : (d.camUnmutedBeforeLosingNativeActiveState = d.localVideo(), d.camUnmutedBeforeLosingNativeActiveState && d.setLocalVideo(!1)));
      });
      return function(Q) {
        return H.apply(this, arguments);
      };
    })()), Je(d, "handleNativeAudioFocusChange", function(H) {
      d.disableReactNativeAutoDeviceManagement("audio") || (d._hasNativeAudioFocus = H, d.toggleParticipantAudioBasedOnNativeAudioFocus(), d._hasNativeAudioFocus ? d.micUnmutedBeforeLosingNativeAudioFocus && d.setLocalAudio(!0) : (d.micUnmutedBeforeLosingNativeAudioFocus = d.localAudio(), d.setLocalAudio(!1)));
    }), Je(d, "handleNativeSystemScreenCaptureStop", function() {
      d.stopScreenShare();
    }), !$n() && !ee()) throw new Error("WebRTC not supported or suppressed");
    if (d.strictMode = x.strictMode === void 0 || x.strictMode, d.allowMultipleCallInstances = (h = x.allowMultipleCallInstances) !== null && h !== void 0 && h, Object.keys(_t).length && (d._logDuplicateInstanceAttempt(), !d.allowMultipleCallInstances)) {
      if (d.strictMode) throw new Error("Duplicate DailyIframe instances are not allowed");
      console.warn("Using strictMode: false to allow multiple call instances is now deprecated. Set `allowMultipleCallInstances: true`");
    }
    if (window._daily || (window._daily = { pendings: [], instances: {} }), d.callClientId = dn(), _t[(P = d).callClientId] = P, window._daily.instances[d.callClientId] = {}, d._sharedTracks = {}, window._daily.instances[d.callClientId].tracks = d._sharedTracks, x.dailyJsVersion = r.version(), x.aboutClient !== void 0 && (x.aboutClient = ou(x.aboutClient)), d._iframe = o, d._callObjectMode = x.layout === "none" && !d._iframe, d._preloadCache = { subscribeToTracksAutomatically: !0, outputDeviceId: null, inputSettings: null, sendSettings: null, videoTrackForNetworkConnectivityTest: null, videoTrackForConnectionQualityTest: null }, x.showLocalVideo !== void 0 ? d._callObjectMode ? console.error("showLocalVideo is not available in call object mode") : d._showLocalVideo = !!x.showLocalVideo : d._showLocalVideo = !0, x.showParticipantsBar !== void 0 ? d._callObjectMode ? console.error("showParticipantsBar is not available in call object mode") : d._showParticipantsBar = !!x.showParticipantsBar : d._showParticipantsBar = !0, x.customIntegrations !== void 0 ? d._callObjectMode ? console.error("customIntegrations is not available in call object mode") : d._customIntegrations = x.customIntegrations : d._customIntegrations = {}, x.customTrayButtons !== void 0 ? d._callObjectMode ? console.error("customTrayButtons is not available in call object mode") : d._customTrayButtons = x.customTrayButtons : d._customTrayButtons = {}, x.activeSpeakerMode !== void 0 ? d._callObjectMode ? console.error("activeSpeakerMode is not available in call object mode") : d._activeSpeakerMode = !!x.activeSpeakerMode : d._activeSpeakerMode = !1, x.receiveSettings ? d._callObjectMode ? d._receiveSettings = x.receiveSettings : console.error("receiveSettings is only available in call object mode") : d._receiveSettings = {}, d.validateProperties(x), d.properties = B({}, x), d.properties.aboutClient !== void 0 && (d.properties.aboutClient = ou(d.properties.aboutClient)), d._inputSettings || (d._inputSettings = {}), d._callObjectLoader = d._callObjectMode ? new mm(d.callClientId) : null, d._callState = Mc, d._isPreparingToJoin = !1, d._accessState = { access: jn }, d._meetingSessionSummary = {}, d._finalSummaryOfPrevSession = {}, d._meetingSessionState = Gn(nu, d._callObjectMode), d._nativeInCallAudioMode = ru, d._participants = {}, d._isScreenSharing = !1, d._participantCounts = iu, d._rmpPlayerState = {}, d._waitingParticipants = {}, d._network = { threshold: "good", quality: 100, networkState: "unknown", stats: {} }, d._activeSpeaker = {}, d._localAudioLevel = 0, d._isLocalAudioLevelObserverRunning = !1, d._remoteParticipantsAudioLevel = {}, d._isRemoteParticipantsAudioLevelObserverRunning = !1, d._maxAppMessageSize = Dn, d._messageChannel = ee() ? new pm() : new fm(), d._iframe && (d._iframe.requestFullscreen ? d._iframe.addEventListener("fullscreenchange", function() {
      document.fullscreenElement === d._iframe ? (d.emitDailyJSEvent({ action: Fr }), d.sendMessageToCallMachine({ action: Fr })) : (d.emitDailyJSEvent({ action: Nr }), d.sendMessageToCallMachine({ action: Nr }));
    }) : d._iframe.webkitRequestFullscreen && d._iframe.addEventListener("webkitfullscreenchange", function() {
      document.webkitFullscreenElement === d._iframe ? (d.emitDailyJSEvent({ action: Fr }), d.sendMessageToCallMachine({ action: Fr })) : (d.emitDailyJSEvent({ action: Nr }), d.sendMessageToCallMachine({ action: Nr }));
    })), ee()) {
      var j = d.nativeUtils();
      j.addAudioFocusChangeListener && j.removeAudioFocusChangeListener && j.addAppStateChangeListener && j.removeAppStateChangeListener && j.addSystemScreenCaptureStopListener && j.removeSystemScreenCaptureStopListener || console.warn("expected (add|remove)(AudioFocusChange|AppActiveStateChange|SystemScreenCaptureStop)Listener to be available in React Native"), d._hasNativeAudioFocus = !0, j.addAudioFocusChangeListener(d.handleNativeAudioFocusChange), j.addAppStateChangeListener(d.handleNativeAppStateChange), j.addSystemScreenCaptureStopListener(d.handleNativeSystemScreenCaptureStop);
    }
    return d._callObjectMode && d.startListeningForDeviceChanges(), d._messageChannel.addListenerForMessagesFromCallMachine(d.handleMessageFromCallMachine, d.callClientId, d), d;
  }
  return ln(r, Pr), Ce(r, [{ key: "destroy", value: (Er = J(function* () {
    var o;
    try {
      yield this.leave();
    } catch {
    }
    var h = this._iframe;
    if (h) {
      var d = h.parentElement;
      d && d.removeChild(h);
    }
    if (this._messageChannel.removeListener(this.handleMessageFromCallMachine), ee()) {
      var g = this.nativeUtils();
      g.removeAudioFocusChangeListener(this.handleNativeAudioFocusChange), g.removeAppStateChangeListener(this.handleNativeAppStateChange), g.removeSystemScreenCaptureStopListener(this.handleNativeSystemScreenCaptureStop);
    }
    this._callObjectMode && this.stopListeningForDeviceChanges(), this.resetMeetingDependentVars(), this._destroyed = !0, this.emitDailyJSEvent({ action: "call-instance-destroyed" }), delete _t[this.callClientId], !((o = window) === null || o === void 0 || (o = o._daily) === null || o === void 0) && o.instances && delete window._daily.instances[this.callClientId], this.strictMode && (this.callClientId = void 0);
  }), function() {
    return Er.apply(this, arguments);
  }) }, { key: "isDestroyed", value: function() {
    return !!this._destroyed;
  } }, { key: "loadCss", value: function(o) {
    var h = o.bodyClass, d = o.cssFile, g = o.cssText;
    return Z(), this.sendMessageToCallMachine({ action: "load-css", cssFile: this.absoluteUrl(d), bodyClass: h, cssText: g }), this;
  } }, { key: "iframe", value: function() {
    return Z(), this._iframe;
  } }, { key: "meetingState", value: function() {
    return this._callState;
  } }, { key: "accessState", value: function() {
    return Re(this._callObjectMode, "accessState()"), this._accessState;
  } }, { key: "participants", value: function() {
    return this._participants;
  } }, { key: "participantCounts", value: function() {
    return this._participantCounts;
  } }, { key: "waitingParticipants", value: function() {
    return Re(this._callObjectMode, "waitingParticipants()"), this._waitingParticipants;
  } }, { key: "validateParticipantProperties", value: function(o, h) {
    for (var d in h) {
      if (!Vr[d]) throw new Error("unrecognized updateParticipant property ".concat(d));
      if (Vr[d].validate && !Vr[d].validate(h[d], this, this._participants[o])) throw new Error(Vr[d].help);
    }
  } }, { key: "updateParticipant", value: function(o, h) {
    return this._participants.local && this._participants.local.session_id === o && (o = "local"), o && h && (this.validateParticipantProperties(o, h), this.sendMessageToCallMachine({ action: "update-participant", id: o, properties: h })), this;
  } }, { key: "updateParticipants", value: function(o) {
    var h = this._participants.local && this._participants.local.session_id;
    for (var d in o) d === h && (d = "local"), d && o[d] && this.validateParticipantProperties(d, o[d]);
    return this.sendMessageToCallMachine({ action: "update-participants", participants: o }), this;
  } }, { key: "updateWaitingParticipant", value: (Cr = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "", d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (Re(this._callObjectMode, "updateWaitingParticipant()"), ie(this._callState, "updateWaitingParticipant()"), typeof h != "string" || te(d) !== "object") throw new Error("updateWaitingParticipant() must take an id string and a updates object");
    return new Promise(function(g, m) {
      o.sendMessageToCallMachine({ action: "daily-method-update-waiting-participant", id: h, updates: d }, function(A) {
        A.error && m(A.error), A.id || m(new Error("unknown error in updateWaitingParticipant()")), g({ id: A.id });
      });
    });
  }), function() {
    return Cr.apply(this, arguments);
  }) }, { key: "updateWaitingParticipants", value: (Mr = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (Re(this._callObjectMode, "updateWaitingParticipants()"), ie(this._callState, "updateWaitingParticipants()"), te(h) !== "object") throw new Error("updateWaitingParticipants() must take a mapping between ids and update objects");
    return new Promise(function(d, g) {
      o.sendMessageToCallMachine({ action: "daily-method-update-waiting-participants", updatesById: h }, function(m) {
        m.error && g(m.error), m.ids || g(new Error("unknown error in updateWaitingParticipants()")), d({ ids: m.ids });
      });
    });
  }), function() {
    return Mr.apply(this, arguments);
  }) }, { key: "requestAccess", value: (kr = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, d = h.access, g = d === void 0 ? { level: cg } : d, m = h.name, A = m === void 0 ? "" : m;
    return Re(this._callObjectMode, "requestAccess()"), ie(this._callState, "requestAccess()"), new Promise(function(P, x) {
      o.sendMessageToCallMachine({ action: "daily-method-request-access", access: g, name: A }, function(j) {
        j.error && x(j.error), j.access || x(new Error("unknown error in requestAccess()")), P({ access: j.access, granted: j.granted });
      });
    });
  }), function() {
    return kr.apply(this, arguments);
  }) }, { key: "localAudio", value: function() {
    return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.audio.state) : null;
  } }, { key: "localVideo", value: function() {
    return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.video.state) : null;
  } }, { key: "setLocalAudio", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    return "forceDiscardTrack" in h && (ee() ? (console.warn("forceDiscardTrack option not supported in React Native; ignoring"), h = {}) : o && (console.warn("forceDiscardTrack option only supported when calling setLocalAudio(false); ignoring"), h = {})), this.sendMessageToCallMachine({ action: "local-audio", state: o, options: h }), this;
  } }, { key: "localScreenAudio", value: function() {
    return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.screenAudio.state) : null;
  } }, { key: "localScreenVideo", value: function() {
    return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.screenVideo.state) : null;
  } }, { key: "updateScreenShare", value: function(o) {
    if (this._isScreenSharing) return this.sendMessageToCallMachine({ action: "local-screen-update", options: o }), this;
    console.warn("There is no screen share in progress. Try calling startScreenShare first.");
  } }, { key: "setLocalVideo", value: function(o) {
    return this.sendMessageToCallMachine({ action: "local-video", state: o }), this;
  } }, { key: "_setAllowLocalAudio", value: function(o) {
    if (this._preloadCache.allowLocalAudio = o, this._callMachineInitialized) return this.sendMessageToCallMachine({ action: "set-allow-local-audio", state: o }), this;
  } }, { key: "_setAllowLocalVideo", value: function(o) {
    if (this._preloadCache.allowLocalVideo = o, this._callMachineInitialized) return this.sendMessageToCallMachine({ action: "set-allow-local-video", state: o }), this;
  } }, { key: "getReceiveSettings", value: (rr = J(function* (o) {
    var h = this, d = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}).showInheritedValues, g = d !== void 0 && d;
    if (Re(this._callObjectMode, "getReceiveSettings()"), !this._callMachineInitialized) return this._receiveSettings;
    switch (te(o)) {
      case "string":
        return new Promise(function(m) {
          h.sendMessageToCallMachine({ action: "get-single-participant-receive-settings", id: o, showInheritedValues: g }, function(A) {
            m(A.receiveSettings);
          });
        });
      case "undefined":
        return this._receiveSettings;
      default:
        throw new Error('first argument to getReceiveSettings() must be a participant id (or "base"), or there should be no arguments');
    }
  }), function(o) {
    return rr.apply(this, arguments);
  }) }, { key: "updateReceiveSettings", value: (Sr = J(function* (o) {
    var h = this;
    if (Re(this._callObjectMode, "updateReceiveSettings()"), !Eh(o, { allowAllParticipantsKey: !0 })) throw new Error(Oh({ allowAllParticipantsKey: !0 }));
    return ie(this._callState, "updateReceiveSettings()", "To specify receive settings earlier, use the receiveSettings config property."), new Promise(function(d) {
      h.sendMessageToCallMachine({ action: "update-receive-settings", receiveSettings: o }, function(g) {
        d({ receiveSettings: g.receiveSettings });
      });
    });
  }), function(o) {
    return Sr.apply(this, arguments);
  }) }, { key: "_prepInputSettingsForSharing", value: function(o, h) {
    if (o) {
      var d = {};
      if (o.audio) {
        var g, m, A;
        o.audio.settings && (!Object.keys(o.audio.settings).length && h || (d.audio = { settings: B({}, o.audio.settings) })), h && (g = d.audio) !== null && g !== void 0 && (g = g.settings) !== null && g !== void 0 && g.customTrack && (d.audio.settings = { customTrack: this._sharedTracks.audioTrack });
        var P = ((m = o.audio.processor) === null || m === void 0 ? void 0 : m.type) === "none" && ((A = o.audio.processor) === null || A === void 0 ? void 0 : A._isDefaultWhenNone);
        if (o.audio.processor && !P) {
          var x = B({}, o.audio.processor);
          delete x._isDefaultWhenNone, d.audio = B(B({}, d.audio), {}, { processor: x });
        }
      }
      if (o.video) {
        var j, H, Q;
        o.video.settings && (!Object.keys(o.video.settings).length && h || (d.video = { settings: B({}, o.video.settings) })), h && (j = d.video) !== null && j !== void 0 && (j = j.settings) !== null && j !== void 0 && j.customTrack && (d.video.settings = { customTrack: this._sharedTracks.videoTrack });
        var Ee = ((H = o.video.processor) === null || H === void 0 ? void 0 : H.type) === "none" && ((Q = o.video.processor) === null || Q === void 0 ? void 0 : Q._isDefaultWhenNone);
        if (o.video.processor && !Ee) {
          var Y = B({}, o.video.processor);
          delete Y._isDefaultWhenNone, d.video = B(B({}, d.video), {}, { processor: Y });
        }
      }
      return d;
    }
  } }, { key: "getInputSettings", value: function() {
    var o = this;
    return Z(), new Promise(function(h) {
      h(o._getInputSettings());
    });
  } }, { key: "_getInputSettings", value: function() {
    var o, h, d, g, m, A, P = { processor: { type: "none", _isDefaultWhenNone: !0 } };
    this._inputSettings ? (o = ((d = this._inputSettings) === null || d === void 0 ? void 0 : d.video) || P, h = ((g = this._inputSettings) === null || g === void 0 ? void 0 : g.audio) || P) : (o = ((m = this._preloadCache) === null || m === void 0 || (m = m.inputSettings) === null || m === void 0 ? void 0 : m.video) || P, h = ((A = this._preloadCache) === null || A === void 0 || (A = A.inputSettings) === null || A === void 0 ? void 0 : A.audio) || P);
    var x = { audio: h, video: o };
    return this._prepInputSettingsForSharing(x, !0);
  } }, { key: "_updatePreloadCacheInputSettings", value: function(o, h) {
    var d = this._inputSettings || {}, g = {};
    if (o.video) {
      var m, A, P;
      g.video = {}, o.video.settings ? (g.video.settings = {}, h || o.video.settings.customTrack || (P = d.video) === null || P === void 0 || !P.settings ? g.video.settings = o.video.settings : g.video.settings = B(B({}, d.video.settings), o.video.settings), Object.keys(g.video.settings).length || delete g.video.settings) : (m = d.video) !== null && m !== void 0 && m.settings && (g.video.settings = d.video.settings), o.video.processor ? g.video.processor = o.video.processor : (A = d.video) !== null && A !== void 0 && A.processor && (g.video.processor = d.video.processor);
    } else d.video && (g.video = d.video);
    if (o.audio) {
      var x, j, H;
      g.audio = {}, o.audio.settings ? (g.audio.settings = {}, h || o.audio.settings.customTrack || (H = d.audio) === null || H === void 0 || !H.settings ? g.audio.settings = o.audio.settings : g.audio.settings = B(B({}, d.audio.settings), o.audio.settings), Object.keys(g.audio.settings).length || delete g.audio.settings) : (x = d.audio) !== null && x !== void 0 && x.settings && (g.audio.settings = d.audio.settings), o.audio.processor ? g.audio.processor = o.audio.processor : (j = d.audio) !== null && j !== void 0 && j.processor && (g.audio.processor = d.audio.processor);
    } else d.audio && (g.audio = d.audio);
    this._maybeUpdateInputSettings(g);
  } }, { key: "_devicesFromInputSettings", value: function(o) {
    var h, d, g = (o == null || (h = o.video) === null || h === void 0 || (h = h.settings) === null || h === void 0 ? void 0 : h.deviceId) || null, m = (o == null || (d = o.audio) === null || d === void 0 || (d = d.settings) === null || d === void 0 ? void 0 : d.deviceId) || null, A = this._preloadCache.outputDeviceId || null;
    return { camera: g ? { deviceId: g } : {}, mic: m ? { deviceId: m } : {}, speaker: A ? { deviceId: A } : {} };
  } }, { key: "updateInputSettings", value: (wr = J(function* (o) {
    var h = this;
    return Z(), Ah(o) ? o.video || o.audio ? (Th(o, this.properties.dailyConfig, this._sharedTracks), this._callObjectMode && !this._callMachineInitialized ? (this._updatePreloadCacheInputSettings(o, !0), this._getInputSettings()) : new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "update-input-settings", inputSettings: o }, function(m) {
        if (m.error) g(m.error);
        else {
          if (m.returnPreloadCache) return h._updatePreloadCacheInputSettings(o, !0), void d(h._getInputSettings());
          h._maybeUpdateInputSettings(m.inputSettings), d(h._prepInputSettingsForSharing(m.inputSettings, !0));
        }
      });
    })) : this._getInputSettings() : (console.error(wa()), Promise.reject(wa()));
  }), function(o) {
    return wr.apply(this, arguments);
  }) }, { key: "setBandwidth", value: function(o) {
    var h = o.kbs, d = o.trackConstraints;
    if (Z(), this._callMachineInitialized) return this.sendMessageToCallMachine({ action: "set-bandwidth", kbs: h, trackConstraints: d }), this;
  } }, { key: "getDailyLang", value: function() {
    var o = this;
    if (Z(), this._callMachineInitialized) return new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-daily-lang" }, function(d) {
        delete d.action, delete d.callbackStamp, h(d);
      });
    });
  } }, { key: "setDailyLang", value: function(o) {
    return Z(), this.sendMessageToCallMachine({ action: "set-daily-lang", lang: o }), this;
  } }, { key: "setProxyUrl", value: function(o) {
    return this.sendMessageToCallMachine({ action: "set-proxy-url", proxyUrl: o }), this;
  } }, { key: "setIceConfig", value: function(o) {
    return this.sendMessageToCallMachine({ action: "set-ice-config", iceConfig: o }), this;
  } }, { key: "meetingSessionSummary", value: function() {
    return [at, ot].includes(this._callState) ? this._finalSummaryOfPrevSession : this._meetingSessionSummary;
  } }, { key: "getMeetingSession", value: (_r = J(function* () {
    var o = this;
    return console.warn("getMeetingSession() is deprecated: use meetingSessionSummary(), which will return immediately"), ie(this._callState, "getMeetingSession()"), new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-meeting-session" }, function(d) {
        delete d.action, delete d.callbackStamp, h(d);
      });
    });
  }), function() {
    return _r.apply(this, arguments);
  }) }, { key: "meetingSessionState", value: function() {
    return ie(this._callState, "meetingSessionState"), this._meetingSessionState;
  } }, { key: "setMeetingSessionData", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "replace";
    Re(this._callObjectMode, "setMeetingSessionData()"), ie(this._callState, "setMeetingSessionData");
    try {
      (function(d, g) {
        new gm({ data: d, mergeStrategy: g });
      })(o, h);
    } catch (d) {
      throw console.error(d), d;
    }
    try {
      this.sendMessageToCallMachine({ action: "set-session-data", data: o, mergeStrategy: h });
    } catch (d) {
      throw new Error("Error setting meeting session data: ".concat(d));
    }
  } }, { key: "setUserName", value: function(o, h) {
    var d = this;
    return this.properties.userName = o, new Promise(function(g) {
      d.sendMessageToCallMachine({ action: "set-user-name", name: o ?? "", thisMeetingOnly: ee() || !!h && !!h.thisMeetingOnly }, function(m) {
        delete m.action, delete m.callbackStamp, g(m);
      });
    });
  } }, { key: "setUserData", value: (vt = J(function* (o) {
    var h = this;
    try {
      Ch(o);
    } catch (d) {
      throw console.error(d), d;
    }
    if (this.properties.userData = o, this._callMachineInitialized) return new Promise(function(d) {
      try {
        h.sendMessageToCallMachine({ action: "set-user-data", userData: o }, function(g) {
          delete g.action, delete g.callbackStamp, d(g);
        });
      } catch (g) {
        throw new Error("Error setting user data: ".concat(g));
      }
    });
  }), function(o) {
    return vt.apply(this, arguments);
  }) }, { key: "validateAudioLevelInterval", value: function(o) {
    if (o && (o < 100 || typeof o != "number")) throw new Error("The interval must be a number greater than or equal to 100 milliseconds.");
  } }, { key: "startLocalAudioLevelObserver", value: function(o) {
    var h = this;
    if (typeof AudioWorkletNode > "u" && !ee()) throw new Error("startLocalAudioLevelObserver() is not supported on this browser");
    if (this.validateAudioLevelInterval(o), this._callMachineInitialized) return this._isLocalAudioLevelObserverRunning = !0, new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "start-local-audio-level-observer", interval: o }, function(m) {
        h._isLocalAudioLevelObserverRunning = !m.error, m.error ? g({ error: m.error }) : d();
      });
    });
    this._preloadCache.localAudioLevelObserver = { enabled: !0, interval: o };
  } }, { key: "isLocalAudioLevelObserverRunning", value: function() {
    return this._isLocalAudioLevelObserverRunning;
  } }, { key: "stopLocalAudioLevelObserver", value: function() {
    this._preloadCache.localAudioLevelObserver = null, this._localAudioLevel = 0, this._isLocalAudioLevelObserverRunning = !1, this.sendMessageToCallMachine({ action: "stop-local-audio-level-observer" });
  } }, { key: "startRemoteParticipantsAudioLevelObserver", value: function(o) {
    var h = this;
    if (this.validateAudioLevelInterval(o), this._callMachineInitialized) return this._isRemoteParticipantsAudioLevelObserverRunning = !0, new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "start-remote-participants-audio-level-observer", interval: o }, function(m) {
        h._isRemoteParticipantsAudioLevelObserverRunning = !m.error, m.error ? g({ error: m.error }) : d();
      });
    });
    this._preloadCache.remoteParticipantsAudioLevelObserver = { enabled: !0, interval: o };
  } }, { key: "isRemoteParticipantsAudioLevelObserverRunning", value: function() {
    return this._isRemoteParticipantsAudioLevelObserverRunning;
  } }, { key: "stopRemoteParticipantsAudioLevelObserver", value: function() {
    this._preloadCache.remoteParticipantsAudioLevelObserver = null, this._remoteParticipantsAudioLevel = {}, this._isRemoteParticipantsAudioLevelObserverRunning = !1, this.sendMessageToCallMachine({ action: "stop-remote-participants-audio-level-observer" });
  } }, { key: "startCamera", value: (Le = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (Re(this._callObjectMode, "startCamera()"), zn(this._callState, this._isPreparingToJoin, "startCamera()", "Did you mean to use setLocalAudio() and/or setLocalVideo() instead?"), this.needsLoad()) try {
      yield this.load(h);
    } catch (d) {
      return Promise.reject(d);
    }
    else {
      if (this._didPreAuth) {
        if (h.url && h.url !== this.properties.url) return console.error("url in startCamera() is different than the one used in preAuth()"), Promise.reject();
        if (h.token && h.token !== this.properties.token) return console.error("token in startCamera() is different than the one used in preAuth()"), Promise.reject();
      }
      this.validateProperties(h), this.properties = B(B({}, this.properties), h);
    }
    return new Promise(function(d, g) {
      o._preloadCache.inputSettings = o._prepInputSettingsForSharing(o._inputSettings, !1), o.sendMessageToCallMachine({ action: "start-camera", properties: $t(o.properties, o.callClientId), preloadCache: $t(o._preloadCache, o.callClientId) }, function(m) {
        m.error ? g(m.error) : d({ camera: m.camera, mic: m.mic, speaker: m.speaker });
      });
    });
  }), function() {
    return Le.apply(this, arguments);
  }) }, { key: "validateCustomTrack", value: function(o, h, d) {
    if (d && d.length > 50) throw new Error("Custom track `trackName` must not be more than 50 characters");
    if (h && h !== "music" && h !== "speech" && !(h instanceof Object)) throw new Error("Custom track `mode` must be either `music` | `speech` | `DailyMicAudioModeSettings` or `undefined`");
    if (d && ["cam-audio", "cam-video", "screen-video", "screen-audio", "rmpAudio", "rmpVideo", "customVideoDefaults"].includes(d)) throw new Error("Custom track `trackName` must not match a track name already used by daily: cam-audio, cam-video, customVideoDefaults, screen-video, screen-audio, rmpAudio, rmpVideo");
    if (!(o instanceof MediaStreamTrack)) throw new Error("Custom tracks provided must be instances of MediaStreamTrack");
  } }, { key: "startCustomTrack", value: function() {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : { track, mode, trackName, ignoreAudioLevel };
    return Z(), ie(this._callState, "startCustomTrack()"), this.validateCustomTrack(h.track, h.mode, h.trackName), new Promise(function(d, g) {
      o._sharedTracks.customTrack = h.track, h.track = rt, o.sendMessageToCallMachine({ action: "start-custom-track", properties: h }, function(m) {
        m.error ? g({ error: m.error }) : d(m.mediaTag);
      });
    });
  } }, { key: "stopCustomTrack", value: function(o) {
    var h = this;
    return Z(), ie(this._callState, "stopCustomTrack()"), new Promise(function(d) {
      h.sendMessageToCallMachine({ action: "stop-custom-track", mediaTag: o }, function(g) {
        d(g.mediaTag);
      });
    });
  } }, { key: "setCamera", value: function(o) {
    var h = this;
    return ir(), zr(this._callMachineInitialized, "setCamera()"), new Promise(function(d) {
      h.sendMessageToCallMachine({ action: "set-camera", cameraDeviceId: o }, function(g) {
        d({ device: g.device });
      });
    });
  } }, { key: "setAudioDevice", value: (de = J(function* (o) {
    return ir(), this.nativeUtils().setAudioDevice(o), { deviceId: yield this.nativeUtils().getAudioDevice() };
  }), function(o) {
    return de.apply(this, arguments);
  }) }, { key: "cycleCamera", value: function() {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    return new Promise(function(d) {
      o.sendMessageToCallMachine({ action: "cycle-camera", properties: h }, function(g) {
        d({ device: g.device });
      });
    });
  } }, { key: "cycleMic", value: function() {
    var o = this;
    return Z(), new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "cycle-mic" }, function(d) {
        h({ device: d.device });
      });
    });
  } }, { key: "getCameraFacingMode", value: function() {
    var o = this;
    return ir(), new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-camera-facing-mode" }, function(d) {
        h(d.facingMode);
      });
    });
  } }, { key: "setInputDevicesAsync", value: (U = J(function* (o) {
    var h = this, d = o.audioDeviceId, g = o.videoDeviceId, m = o.audioSource, A = o.videoSource;
    if (Z(), m !== void 0 && (d = m), A !== void 0 && (g = A), typeof d == "boolean" && (this._setAllowLocalAudio(d), d = void 0), typeof g == "boolean" && (this._setAllowLocalVideo(g), g = void 0), !d && !g) return yield this.getInputDevices();
    var P = {};
    return d && (d instanceof MediaStreamTrack ? (this._sharedTracks.audioTrack = d, d = rt, P.audio = { settings: { customTrack: d } }) : (delete this._sharedTracks.audioTrack, P.audio = { settings: { deviceId: d } })), g && (g instanceof MediaStreamTrack ? (this._sharedTracks.videoTrack = g, g = rt, P.video = { settings: { customTrack: g } }) : (delete this._sharedTracks.videoTrack, P.video = { settings: { deviceId: g } })), this._callObjectMode && this.needsLoad() ? (this._updatePreloadCacheInputSettings(P, !1), this._devicesFromInputSettings(this._inputSettings)) : new Promise(function(x) {
      h.sendMessageToCallMachine({ action: "set-input-devices", audioDeviceId: d, videoDeviceId: g }, function(j) {
        if (delete j.action, delete j.callbackStamp, j.returnPreloadCache) return h._updatePreloadCacheInputSettings(P, !1), void x(h._devicesFromInputSettings(h._inputSettings));
        x(j);
      });
    });
  }), function(o) {
    return U.apply(this, arguments);
  }) }, { key: "setOutputDeviceAsync", value: ($ = J(function* (o) {
    var h = this, d = o.outputDeviceId;
    if (Z(), !d || typeof d != "string") throw new Error("outputDeviceId must be provided and must be a valid device id");
    return this._preloadCache.outputDeviceId = d, this._callObjectMode && this.needsLoad() ? this._devicesFromInputSettings(this._inputSettings) : new Promise(function(g, m) {
      h.sendMessageToCallMachine({ action: "set-output-device", outputDeviceId: d }, function(A) {
        if (delete A.action, delete A.callbackStamp, A.error) {
          var P = new Error(A.error.message);
          return P.type = A.error.type, void m(P);
        }
        A.returnPreloadCache ? g(h._devicesFromInputSettings(h._inputSettings)) : g(A);
      });
    });
  }), function(o) {
    return $.apply(this, arguments);
  }) }, { key: "getInputDevices", value: (N = J(function* () {
    var o = this;
    return this._callObjectMode && this.needsLoad() ? this._devicesFromInputSettings(this._inputSettings) : new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-input-devices" }, function(d) {
        d.returnPreloadCache ? h(o._devicesFromInputSettings(o._inputSettings)) : h({ camera: d.camera, mic: d.mic, speaker: d.speaker });
      });
    });
  }), function() {
    return N.apply(this, arguments);
  }) }, { key: "nativeInCallAudioMode", value: function() {
    return ir(), this._nativeInCallAudioMode;
  } }, { key: "setNativeInCallAudioMode", value: function(o) {
    if (ir(), [ru, jm].includes(o)) {
      if (o !== this._nativeInCallAudioMode) return this._nativeInCallAudioMode = o, !this.disableReactNativeAutoDeviceManagement("audio") && Kr(this._callState, this._isPreparingToJoin) && this.nativeUtils().setAudioMode(this._nativeInCallAudioMode), this;
    } else console.error("invalid in-call audio mode specified: ", o);
  } }, { key: "preAuth", value: (D = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (Re(this._callObjectMode, "preAuth()"), zn(this._callState, this._isPreparingToJoin, "preAuth()"), this.needsLoad() && (yield this.load(h)), !h.url) throw new Error("preAuth() requires at least a url to be provided");
    return this.validateProperties(h), this.properties = B(B({}, this.properties), h), new Promise(function(d, g) {
      o._preloadCache.inputSettings = o._prepInputSettingsForSharing(o._inputSettings, !1), o.sendMessageToCallMachine({ action: "daily-method-preauth", properties: $t(o.properties, o.callClientId), preloadCache: $t(o._preloadCache, o.callClientId) }, function(m) {
        return m.error ? g(m.error) : m.access ? (o._didPreAuth = !0, void d({ access: m.access })) : g(new Error("unknown error in preAuth()"));
      });
    });
  }), function() {
    return D.apply(this, arguments);
  }) }, { key: "load", value: (L = J(function* (o) {
    var h = this;
    if (this.needsLoad()) {
      if (this._destroyed && (this._logUseAfterDestroy(), this.strictMode)) throw new Error("Use after destroy");
      if (o && (this.validateProperties(o), this.properties = B(B({}, this.properties), o)), !this._callObjectMode && !this.properties.url) throw new Error("can't load iframe meeting because url property isn't set");
      return this._updateCallState(Cc), this.emitDailyJSEvent({ action: gg }), this._callObjectMode ? new Promise(function(d, g) {
        h._callObjectLoader.cancel();
        var m = Date.now();
        h._callObjectLoader.load(h.properties.dailyConfig, function(A) {
          h._bundleLoadTime = A ? "no-op" : Date.now() - m, h._updateCallState(Ec), A && h.emitDailyJSEvent({ action: Tc }), d();
        }, function(A, P) {
          if (h.emitDailyJSEvent({ action: mg }), !P) {
            h._updateCallState(ot), h.resetMeetingDependentVars();
            var x = { action: Lc, errorMsg: A.msg, error: { type: "connection-error", msg: "Failed to load call object bundle.", details: { on: "load", sourceError: A, bundleUrl: Xr(h.properties.dailyConfig) } } };
            h._maybeSendToSentry(x), h.emitDailyJSEvent(x), g(A.msg);
          }
        });
      }) : (this._iframe.src = Gd(this.assembleMeetingUrl(), this.properties.dailyConfig), new Promise(function(d, g) {
        h._loadedCallback = function(m) {
          h._callState !== ot ? (h._updateCallState(Ec), (h.properties.cssFile || h.properties.cssText) && h.loadCss(h.properties), d()) : g(m);
        };
      }));
    }
  }), function(o) {
    return L.apply(this, arguments);
  }) }, { key: "join", value: (T = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (this._testCallInProgress && this.stopTestCallQuality(), !h.url && !this.properties.url) {
      var d = "No room URL has been provided";
      return console.error(d), Promise.reject(new Error(d));
    }
    var g = !1;
    if (this.needsLoad()) {
      this.updateIsPreparingToJoin(!0);
      try {
        yield this.load(h);
      } catch (m) {
        return this.updateIsPreparingToJoin(!1), Promise.reject(m);
      }
    } else {
      if (g = !(!this.properties.cssFile && !this.properties.cssText), this._didPreAuth) {
        if (h.url && h.url !== this.properties.url) return console.error("url in join() is different than the one used in preAuth()"), this.updateIsPreparingToJoin(!1), Promise.reject();
        if (h.token && h.token !== this.properties.token) return console.error("token in join() is different than the one used in preAuth()"), this.updateIsPreparingToJoin(!1), Promise.reject();
      }
      if (h.url && !this._callObjectMode && h.url && h.url !== this.properties.url) return console.error("url in join() is different than the one used in load() (".concat(this.properties.url, " -> ").concat(h.url, ")")), this.updateIsPreparingToJoin(!1), Promise.reject();
      this.validateProperties(h), this.properties = B(B({}, this.properties), h);
    }
    return h.showLocalVideo !== void 0 && (this._callObjectMode ? console.error("showLocalVideo is not available in callObject mode") : this._showLocalVideo = !!h.showLocalVideo), h.showParticipantsBar !== void 0 && (this._callObjectMode ? console.error("showParticipantsBar is not available in callObject mode") : this._showParticipantsBar = !!h.showParticipantsBar), this._callState === Mt || this._callState === fa ? (console.warn("already joined meeting, call leave() before joining again"), void this.updateIsPreparingToJoin(!1)) : (this._updateCallState(fa, !1), this.emitDailyJSEvent({ action: yg }), this._preloadCache.inputSettings = this._prepInputSettingsForSharing(this._inputSettings || {}, !1), this.sendMessageToCallMachine({ action: "join-meeting", properties: $t(this.properties, this.callClientId), preloadCache: $t(this._preloadCache, this.callClientId) }, function(m) {
      m.error && o._joinedCallback && (o._joinedCallback(null, m.error), o._joinedCallback = null);
    }), new Promise(function(m, A) {
      o._joinedCallback = function(P, x) {
        if (o._callState !== ot) {
          if (x) return o._updateCallState(at), void A(x);
          if (o._updateCallState(Mt), P) for (var j in P) {
            if (o._callObjectMode) {
              var H = o._callMachine().store;
              Wc(P[j], H), Gc(P[j], H), Jc(P[j], o._participants[j], H);
            }
            o._participants[j] = B({}, P[j]), o.toggleParticipantAudioBasedOnNativeAudioFocus();
          }
          g && o.loadCss(o.properties), m(P);
        } else A(x);
      };
    }));
  }), function() {
    return T.apply(this, arguments);
  }) }, { key: "leave", value: (S = J(function* () {
    var o = this;
    return this._testCallInProgress && this.stopTestCallQuality(), new Promise(function(h) {
      o._callState === at || o._callState === ot ? h() : o._callObjectLoader && !o._callObjectLoader.loaded ? (o._callObjectLoader.cancel(), o._updateCallState(at), o.resetMeetingDependentVars(), o.emitDailyJSEvent({ action: at }), h()) : (o._resolveLeave = h, o.sendMessageToCallMachine({ action: "leave-meeting" }));
    });
  }), function() {
    return S.apply(this, arguments);
  }) }, { key: "startScreenShare", value: (k = J(function* () {
    var o = this, h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (zr(this._callMachineInitialized, "startScreenShare()"), h.screenVideoSendSettings && this._validateVideoSendSettings("screenVideo", h.screenVideoSendSettings), h.mediaStream && (this._sharedTracks.screenMediaStream = h.mediaStream, h.mediaStream = rt), typeof DailyNativeUtils < "u" && DailyNativeUtils.isIOS !== void 0 && DailyNativeUtils.isIOS) {
      var d = this.nativeUtils();
      if (yield d.isScreenBeingCaptured()) return void this.emitDailyJSEvent({ action: Ic, type: "screen-share-error", errorMsg: "Could not start the screen sharing. The screen is already been captured!" });
      d.setSystemScreenCaptureStartCallback(function() {
        d.setSystemScreenCaptureStartCallback(null), o.sendMessageToCallMachine({ action: jc, captureOptions: h });
      }), d.presentSystemScreenCapturePrompt();
    } else this.sendMessageToCallMachine({ action: jc, captureOptions: h });
  }), function() {
    return k.apply(this, arguments);
  }) }, { key: "stopScreenShare", value: function() {
    zr(this._callMachineInitialized, "stopScreenShare()"), this.sendMessageToCallMachine({ action: "local-screen-stop" });
  } }, { key: "startRecording", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, h = o.type;
    if (h && h !== "cloud" && h !== "cloud-audio-only" && h !== "raw-tracks" && h !== "local") throw new Error("invalid type: ".concat(h, ", allowed values 'cloud', 'cloud-audio-only', 'raw-tracks', or 'local'"));
    this.sendMessageToCallMachine(B({ action: "local-recording-start" }, o));
  } }, { key: "updateRecording", value: function(o) {
    var h = o.layout, d = h === void 0 ? { preset: "default" } : h, g = o.instanceId;
    this.sendMessageToCallMachine({ action: "daily-method-update-recording", layout: d, instanceId: g });
  } }, { key: "stopRecording", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.sendMessageToCallMachine(B({ action: "local-recording-stop" }, o));
  } }, { key: "startLiveStreaming", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.sendMessageToCallMachine(B({ action: "daily-method-start-live-streaming" }, o));
  } }, { key: "updateLiveStreaming", value: function(o) {
    var h = o.layout, d = h === void 0 ? { preset: "default" } : h, g = o.instanceId;
    this.sendMessageToCallMachine({ action: "daily-method-update-live-streaming", layout: d, instanceId: g });
  } }, { key: "addLiveStreamingEndpoints", value: function(o) {
    var h = o.endpoints, d = o.instanceId;
    this.sendMessageToCallMachine({ action: Dc, endpointsOp: om, endpoints: h, instanceId: d });
  } }, { key: "removeLiveStreamingEndpoints", value: function(o) {
    var h = o.endpoints, d = o.instanceId;
    this.sendMessageToCallMachine({ action: Dc, endpointsOp: cm, endpoints: h, instanceId: d });
  } }, { key: "stopLiveStreaming", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.sendMessageToCallMachine(B({ action: "daily-method-stop-live-streaming" }, o));
  } }, { key: "validateDailyConfig", value: function(o) {
    o.camSimulcastEncodings && (console.warn("camSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide camera simulcast settings."), this.validateSimulcastEncodings(o.camSimulcastEncodings)), o.screenSimulcastEncodings && console.warn("screenSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide screen simulcast settings."), hh() && o.noAutoDefaultDeviceChange && console.warn("noAutoDefaultDeviceChange is not supported on Android, and will be ignored.");
  } }, { key: "validateSimulcastEncodings", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null, d = arguments.length > 2 && arguments[2] !== void 0 && arguments[2];
    if (o) {
      if (!(o instanceof Array || Array.isArray(o))) throw new Error("encodings must be an Array");
      if (!fu(o.length, 1, 3)) throw new Error("encodings must be an Array with between 1 to ".concat(3, " layers"));
      for (var g = 0; g < o.length; g++) {
        var m = o[g];
        for (var A in this._validateEncodingLayerHasValidProperties(m), m) if (Vn.includes(A)) {
          if (typeof m[A] != "number") throw new Error("".concat(A, " must be a number"));
          if (h) {
            var P = h[A], x = P.min, j = P.max;
            if (!fu(m[A], x, j)) throw new Error("".concat(A, " value not in range. valid range: ").concat(x, " to ").concat(j));
          }
        } else if (!["active", "scalabilityMode"].includes(A)) throw new Error("Invalid key ".concat(A, ", valid keys are:") + Object.values(Vn));
        if (d && !m.hasOwnProperty("maxBitrate")) throw new Error("maxBitrate is not specified");
      }
    }
  } }, { key: "startRemoteMediaPlayer", value: (I = J(function* (o) {
    var h = this, d = o.url, g = o.settings, m = g === void 0 ? { state: pa.PLAY } : g;
    try {
      (function(A) {
        if (typeof A != "string") throw new Error('url parameter must be "string" type');
      })(d), hu(m), (function(A) {
        for (var P in A) if (!su.includes(P)) throw new Error("Invalid key ".concat(P, ", valid keys are: ").concat(su));
        A.simulcastEncodings && this.validateSimulcastEncodings(A.simulcastEncodings, kh, !0);
      })(m);
    } catch (A) {
      throw console.error("invalid argument Error: ".concat(A)), console.error(`startRemoteMediaPlayer arguments must be of the form:
  { url: "playback url",
  settings?:
  {state: "play"|"pause", simulcastEncodings?: [{}] } }`), A;
    }
    return new Promise(function(A, P) {
      h.sendMessageToCallMachine({ action: "daily-method-start-remote-media-player", url: d, settings: m }, function(x) {
        x.error ? P({ error: x.error, errorMsg: x.errorMsg }) : A({ session_id: x.session_id, remoteMediaPlayerState: { state: x.state, settings: x.settings } });
      });
    });
  }), function(o) {
    return I.apply(this, arguments);
  }) }, { key: "stopRemoteMediaPlayer", value: (O = J(function* (o) {
    var h = this;
    if (typeof o != "string") throw new Error(" remotePlayerID must be of type string");
    return new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "daily-method-stop-remote-media-player", session_id: o }, function(m) {
        m.error ? g({ error: m.error, errorMsg: m.errorMsg }) : d();
      });
    });
  }), function(o) {
    return O.apply(this, arguments);
  }) }, { key: "updateRemoteMediaPlayer", value: (E = J(function* (o) {
    var h = this, d = o.session_id, g = o.settings;
    try {
      hu(g);
    } catch (m) {
      throw console.error("invalid argument Error: ".concat(m)), console.error(`updateRemoteMediaPlayer arguments must be of the form:
  session_id: "participant session",
  { settings?: {state: "play"|"pause"} }`), m;
    }
    return new Promise(function(m, A) {
      h.sendMessageToCallMachine({ action: "daily-method-update-remote-media-player", session_id: d, settings: g }, function(P) {
        P.error ? A({ error: P.error, errorMsg: P.errorMsg }) : m({ session_id: P.session_id, remoteMediaPlayerState: { state: P.state, settings: P.settings } });
      });
    });
  }), function(o) {
    return E.apply(this, arguments);
  }) }, { key: "startTranscription", value: function(o) {
    ie(this._callState, "startTranscription()"), this.sendMessageToCallMachine(B({ action: "daily-method-start-transcription" }, o));
  } }, { key: "updateTranscription", value: function(o) {
    if (ie(this._callState, "updateTranscription()"), !o) throw new Error("updateTranscription Error: options is mandatory");
    if (te(o) !== "object") throw new Error("updateTranscription Error: options must be object type");
    if (o.participants && !Array.isArray(o.participants)) throw new Error("updateTranscription Error: participants must be an array");
    this.sendMessageToCallMachine(B({ action: "daily-method-update-transcription" }, o));
  } }, { key: "stopTranscription", value: function(o) {
    if (ie(this._callState, "stopTranscription()"), o && te(o) !== "object") throw new Error("stopTranscription Error: options must be object type");
    if (o && !o.instanceId) throw new Error('"instanceId" not provided');
    this.sendMessageToCallMachine(B({ action: "daily-method-stop-transcription" }, o));
  } }, { key: "startDialOut", value: (C = J(function* (o) {
    var h = this;
    ie(this._callState, "startDialOut()");
    var d = function(P) {
      if (P) {
        if (!Array.isArray(P)) throw new Error("Error starting dial out: audio codec must be an array");
        if (P.length <= 0) throw new Error("Error starting dial out: audio codec array specified but empty");
        P.forEach(function(x) {
          if (typeof x != "string") throw new Error("Error starting dial out: audio codec must be a string");
          if (x !== "OPUS" && x !== "PCMU" && x !== "PCMA" && x !== "G722") throw new Error("Error starting dial out: audio codec must be one of OPUS, PCMU, PCMA, G722");
        });
      }
    };
    if (!o.sipUri && !o.phoneNumber) throw new Error("Error starting dial out: either a sip uri or phone number must be provided");
    if (o.sipUri && o.phoneNumber) throw new Error("Error starting dial out: only one of sip uri or phone number must be provided");
    if (o.sipUri) {
      if (typeof o.sipUri != "string") throw new Error("Error starting dial out: sipUri must be a string");
      if (!o.sipUri.startsWith("sip:")) throw new Error("Error starting dial out: Invalid SIP URI, must start with 'sip:'");
      if (o.video && typeof o.video != "boolean") throw new Error("Error starting dial out: video must be a boolean value");
      (function(P) {
        if (P && (d(P.audio), P.video)) {
          if (!Array.isArray(P.video)) throw new Error("Error starting dial out: video codec must be an array");
          if (P.video.length <= 0) throw new Error("Error starting dial out: video codec array specified but empty");
          P.video.forEach(function(x) {
            if (typeof x != "string") throw new Error("Error starting dial out: video codec must be a string");
            if (x !== "H264" && x !== "VP8") throw new Error("Error starting dial out: video codec must be H264 or VP8");
          });
        }
      })(o.codecs);
    }
    if (o.phoneNumber) {
      if (typeof o.phoneNumber != "string") throw new Error("Error starting dial out: phoneNumber must be a string");
      if (!/^\+\d{1,}$/.test(o.phoneNumber)) throw new Error("Error starting dial out: Invalid phone number, must be valid phone number as per E.164");
      o.codecs && d(o.codecs.audio);
    }
    if (o.callerId) {
      if (typeof o.callerId != "string") throw new Error("Error starting dial out: callerId must be a string");
      if (o.sipUri) throw new Error("Error starting dial out: callerId not allowed with sipUri");
    }
    if (o.displayName) {
      if (typeof o.displayName != "string") throw new Error("Error starting dial out: displayName must be a string");
      if (o.displayName.length >= 200) throw new Error("Error starting dial out: displayName length must be less than 200");
    }
    if (o.userId) {
      if (typeof o.userId != "string") throw new Error("Error starting dial out: userId must be a string");
      if (o.userId.length > 36) throw new Error("Error starting dial out: userId length must be less than or equal to 36");
    }
    if (uu(o), o.permissions && o.permissions.canReceive) {
      var g = le(wh.validateJSONObject(o.permissions.canReceive), 2), m = g[0], A = g[1];
      if (!m) throw new Error(A);
    }
    if (o.provider) {
      if (o.provider !== qr && o.provider !== Fn) throw new Error("Error: provider can be set only to '".concat(qr, "' or '").concat(Fn, "', got: ").concat(o.provider));
      if (o.phoneNumber) throw new Error("Error starting dial out: provider valid only for sipUri, not phoneNumber");
      o.provider === qr && console.warn("(pre-beta) provider=".concat(qr, " is currently in pre-beta, things might break!"));
    } else o.provider = Fn;
    return new Promise(function(P, x) {
      h.sendMessageToCallMachine(B({ action: "dialout-start" }, o), function(j) {
        j.error ? x(j.error) : P(j);
      });
    });
  }), function(o) {
    return C.apply(this, arguments);
  }) }, { key: "stopDialOut", value: function(o) {
    var h = this;
    return ie(this._callState, "stopDialOut()"), new Promise(function(d, g) {
      h.sendMessageToCallMachine(B({ action: "dialout-stop" }, o), function(m) {
        m.error ? g(m.error) : d(m);
      });
    });
  } }, { key: "sipCallTransfer", value: (v = J(function* (o) {
    var h = this;
    if (ie(this._callState, "sipCallTransfer()"), !o) throw new Error("sipCallTransfer() requires a sessionId and toEndPoint");
    return o.useSipRefer = !1, du(o, "sipCallTransfer"), uu(o), new Promise(function(d, g) {
      h.sendMessageToCallMachine(B({ action: Bc }, o), function(m) {
        m.error ? g(m.error) : d(m);
      });
    });
  }), function(o) {
    return v.apply(this, arguments);
  }) }, { key: "sipRefer", value: (b = J(function* (o) {
    var h = this;
    if (ie(this._callState, "sipRefer()"), !o) throw new Error("sessionId and toEndPoint are mandatory parameter");
    return o.useSipRefer = !0, du(o, "sipRefer"), new Promise(function(d, g) {
      h.sendMessageToCallMachine(B({ action: Bc }, o), function(m) {
        m.error ? g(m.error) : d(m);
      });
    });
  }), function(o) {
    return b.apply(this, arguments);
  }) }, { key: "sendDTMF", value: (M = J(function* (o) {
    var h = this;
    return ie(this._callState, "sendDTMF()"), (function(d) {
      var g = d.sessionId, m = d.tones, A = d.method, P = d.digitDurationMs;
      if (!g || !m) throw new Error("sessionId and tones are mandatory parameter");
      if (typeof g != "string" || typeof m != "string") throw new Error("sessionId and tones should be of string type");
      if (m.length > 20) throw new Error("tones string must be upto 20 characters");
      var x = /[^0-9A-D*#]/g, j = m.match(x);
      if (j && j[0]) throw new Error("".concat(j[0], " is not valid DTMF tone"));
      if (A && !["sip-info", "telephone-event", "auto"].includes(A)) throw new Error("method must be one of 'sip-info', 'telephone-event', or 'auto'");
      if (P !== void 0) {
        if (typeof P != "number") throw new Error("digitDurationMs must be a number");
        if (!Number.isFinite(P) || !Number.isInteger(P)) throw new Error("digitDurationMs must be a finite integer number");
        if (P < 50 || P > 2e3) throw new Error("digitDurationMs must be between 50ms and 2000ms");
      }
    })(o), o.method = o.method || "auto", o.digitDurationMs = o.digitDurationMs || 500, new Promise(function(d, g) {
      h.sendMessageToCallMachine(B({ action: "send-dtmf" }, o), function(m) {
        m.error ? g(m.error) : d(m);
      });
    });
  }), function(o) {
    return M.apply(this, arguments);
  }) }, { key: "getNetworkStats", value: function() {
    var o = this;
    return this._callState !== Mt ? Promise.resolve(B({ stats: { latest: {} } }, this._network)) : new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-calc-stats" }, function(d) {
        h(B(B({}, o._network), {}, { stats: d.stats }));
      });
    });
  } }, { key: "testWebsocketConnectivity", value: (y = J(function* () {
    var o = this;
    if (Wn(this._testCallInProgress, "testWebsocketConnectivity()"), this.needsLoad()) try {
      yield this.load();
    } catch (h) {
      return Promise.reject(h);
    }
    return new Promise(function(h, d) {
      o.sendMessageToCallMachine({ action: "test-websocket-connectivity" }, function(g) {
        g.error ? d(g.error) : h(g.results);
      });
    });
  }), function() {
    return y.apply(this, arguments);
  }) }, { key: "abortTestWebsocketConnectivity", value: function() {
    this.sendMessageToCallMachine({ action: "abort-test-websocket-connectivity" });
  } }, { key: "_validateVideoTrackForNetworkTests", value: function(o) {
    return o ? o instanceof MediaStreamTrack ? !!Pm(o) || (console.error("Video track is not playable. This test needs a live video track."), !1) : (console.error("Video track needs to be of type `MediaStreamTrack`."), !1) : (console.error("Missing video track. You must provide a video track in order to run this test."), !1);
  } }, { key: "testCallQuality", value: (p = J(function* () {
    var o = this;
    Z(), Re(this._callObjectMode, "testCallQuality()"), zr(this._callMachineInitialized, "testCallQuality()", null, !0), zn(this._callState, this._isPreparingToJoin, "testCallQuality()");
    var h = this._testCallAlreadyInProgress, d = function(m) {
      h || (o._testCallInProgress = m);
    };
    if (d(!0), this.needsLoad()) try {
      var g = this._callState;
      yield this.load(), this._callState = g;
    } catch (m) {
      return d(!1), Promise.reject(m);
    }
    return new Promise(function(m) {
      o.sendMessageToCallMachine({ action: "test-call-quality", dailyJsVersion: o.properties.dailyJsVersion }, function(A) {
        var P = A.results, x = P.result, j = yo(P, Lm);
        if (x === "failed") {
          var H, Q = B({}, j);
          (H = j.error) !== null && H !== void 0 && H.details ? (j.error.details = JSON.parse(j.error.details), Q.error = B(B({}, Q.error), {}, { details: B({}, Q.error.details) }), Q.error.details.duringTest = "testCallQuality") : (Q.error = Q.error ? B({}, Q.error) : {}, Q.error.details = { duringTest: "testCallQuality" }), o._maybeSendToSentry(Q);
        }
        d(!1), m(B({ result: x }, j));
      });
    });
  }), function() {
    return p.apply(this, arguments);
  }) }, { key: "stopTestCallQuality", value: function() {
    this.sendMessageToCallMachine({ action: "stop-test-call-quality" });
  } }, { key: "testConnectionQuality", value: (f = J(function* (o) {
    var h;
    ee() ? (console.warn("testConnectionQuality() is deprecated: use testPeerToPeerCallQuality() instead"), h = yield this.testPeerToPeerCallQuality(o)) : (console.warn("testConnectionQuality() is deprecated: use testCallQuality() instead"), h = yield this.testCallQuality());
    var d = { result: h.result, secondsElapsed: h.secondsElapsed };
    return h.data && (d.data = { maxRTT: h.data.maxRoundTripTime, packetLoss: h.data.avgRecvPacketLoss }), d;
  }), function(o) {
    return f.apply(this, arguments);
  }) }, { key: "testPeerToPeerCallQuality", value: (l = J(function* (o) {
    var h = this;
    if (Wn(this._testCallInProgress, "testPeerToPeerCallQuality()"), this.needsLoad()) try {
      yield this.load();
    } catch (m) {
      return Promise.reject(m);
    }
    var d = o.videoTrack, g = o.duration;
    if (!this._validateVideoTrackForNetworkTests(d)) throw new Error("Video track error");
    return this._sharedTracks.videoTrackForConnectionQualityTest = d, new Promise(function(m, A) {
      h.sendMessageToCallMachine({ action: "test-p2p-call-quality", duration: g }, function(P) {
        P.error ? A(P.error) : m(P.results);
      });
    });
  }), function(o) {
    return l.apply(this, arguments);
  }) }, { key: "stopTestConnectionQuality", value: function() {
    ee() ? (console.warn("stopTestConnectionQuality() is deprecated: use testPeerToPeerCallQuality() and stopTestPeerToPeerCallQuality() instead"), this.stopTestPeerToPeerCallQuality()) : (console.warn("stopTestConnectionQuality() is deprecated: use testCallQuality() and stopTestCallQuality() instead"), this.stopTestCallQuality());
  } }, { key: "stopTestPeerToPeerCallQuality", value: function() {
    this.sendMessageToCallMachine({ action: "stop-test-p2p-call-quality" });
  } }, { key: "testNetworkConnectivity", value: (u = J(function* (o) {
    var h = this;
    if (Wn(this._testCallInProgress, "testNetworkConnectivity()"), this.needsLoad()) try {
      yield this.load();
    } catch (d) {
      return Promise.reject(d);
    }
    if (!this._validateVideoTrackForNetworkTests(o)) throw new Error("Video track error");
    return this._sharedTracks.videoTrackForNetworkConnectivityTest = o, new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "test-network-connectivity" }, function(m) {
        m.error ? g(m.error) : d(m.results);
      });
    });
  }), function(o) {
    return u.apply(this, arguments);
  }) }, { key: "abortTestNetworkConnectivity", value: function() {
    this.sendMessageToCallMachine({ action: "abort-test-network-connectivity" });
  } }, { key: "getCpuLoadStats", value: function() {
    var o = this;
    return new Promise(function(h) {
      o._callState === Mt ? o.sendMessageToCallMachine({ action: "get-cpu-load-stats" }, function(d) {
        h(d.cpuStats);
      }) : h({ cpuLoadState: void 0, cpuLoadStateReason: void 0, stats: {} });
    });
  } }, { key: "_validateEncodingLayerHasValidProperties", value: function(o) {
    var h;
    if (!(((h = Object.keys(o)) === null || h === void 0 ? void 0 : h.length) > 0)) throw new Error("Empty encoding is not allowed. At least one of these valid keys should be specified:" + Object.values(Vn));
  } }, { key: "_validateVideoSendSettings", value: function(o, h) {
    var d = o === "screenVideo" ? ["default-screen-video", "detail-optimized", "motion-optimized", "motion-and-detail-balanced"] : ["default-video", "bandwidth-optimized", "bandwidth-and-quality-balanced", "quality-optimized", "adaptive-2-layers", "adaptive-3-layers"], g = "Video send settings should be either an object or one of the supported presets: ".concat(d.join());
    if (typeof h == "string") {
      if (!d.includes(h)) throw new Error(g);
    } else {
      if (te(h) !== "object") throw new Error(g);
      if (!h.maxQuality && !h.encodings && h.allowAdaptiveLayers === void 0) throw new Error("Video send settings must contain at least maxQuality, allowAdaptiveLayers or encodings attribute");
      if (h.maxQuality && ["low", "medium", "high"].indexOf(h.maxQuality) === -1) throw new Error("maxQuality must be either low, medium or high");
      if (h.encodings) {
        var m = !1;
        switch (Object.keys(h.encodings).length) {
          case 1:
            m = !h.encodings.low;
            break;
          case 2:
            m = !h.encodings.low || !h.encodings.medium;
            break;
          case 3:
            m = !h.encodings.low || !h.encodings.medium || !h.encodings.high;
            break;
          default:
            m = !0;
        }
        if (m) throw new Error("Encodings must be defined as: low, low and medium, or low, medium and high.");
        h.encodings.low && this._validateEncodingLayerHasValidProperties(h.encodings.low), h.encodings.medium && this._validateEncodingLayerHasValidProperties(h.encodings.medium), h.encodings.high && this._validateEncodingLayerHasValidProperties(h.encodings.high);
      }
    }
  } }, { key: "validateUpdateSendSettings", value: function(o) {
    var h = this;
    if (!o || Object.keys(o).length === 0) throw new Error("Send settings must contain at least information for one track!");
    Object.entries(o).forEach(function(d) {
      var g = le(d, 2), m = g[0], A = g[1];
      h._validateVideoSendSettings(m, A);
    });
  } }, { key: "updateSendSettings", value: function(o) {
    var h = this;
    return this.validateUpdateSendSettings(o), this.needsLoad() ? (this._preloadCache.sendSettings = o, { sendSettings: this._preloadCache.sendSettings }) : new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "update-send-settings", sendSettings: o }, function(m) {
        m.error ? g(m.error) : d(m.sendSettings);
      });
    });
  } }, { key: "getSendSettings", value: function() {
    return this._sendSettings || this._preloadCache.sendSettings;
  } }, { key: "getLocalAudioLevel", value: function() {
    return this._localAudioLevel;
  } }, { key: "getRemoteParticipantsAudioLevel", value: function() {
    return this._remoteParticipantsAudioLevel;
  } }, { key: "getActiveSpeaker", value: function() {
    return Z(), this._activeSpeaker;
  } }, { key: "setActiveSpeakerMode", value: function(o) {
    return Z(), this.sendMessageToCallMachine({ action: "set-active-speaker-mode", enabled: o }), this;
  } }, { key: "activeSpeakerMode", value: function() {
    return Z(), this._activeSpeakerMode;
  } }, { key: "subscribeToTracksAutomatically", value: function() {
    return this._preloadCache.subscribeToTracksAutomatically;
  } }, { key: "setSubscribeToTracksAutomatically", value: function(o) {
    return ie(this._callState, "setSubscribeToTracksAutomatically()", "Use the subscribeToTracksAutomatically configuration property."), this._preloadCache.subscribeToTracksAutomatically = o, this.sendMessageToCallMachine({ action: "daily-method-subscribe-to-tracks-automatically", enabled: o }), this;
  } }, { key: "enumerateDevices", value: (c = J(function* () {
    var o = this;
    if (this._callObjectMode) {
      var h = yield navigator.mediaDevices.enumerateDevices();
      return It() === "Firefox" && sn().major > 115 && sn().major < 123 && (h = h.filter(function(d) {
        return d.kind !== "audiooutput";
      })), { devices: h.map(function(d) {
        var g = JSON.parse(JSON.stringify(d));
        if (!ee() && d.kind === "videoinput" && d.getCapabilities) {
          var m, A = d.getCapabilities();
          g.facing = (A == null || (m = A.facingMode) === null || m === void 0 ? void 0 : m.length) >= 1 ? A.facingMode[0] : void 0;
        }
        return g;
      }) };
    }
    return new Promise(function(d) {
      o.sendMessageToCallMachine({ action: "enumerate-devices" }, function(g) {
        d({ devices: g.devices });
      });
    });
  }), function() {
    return c.apply(this, arguments);
  }) }, { key: "sendAppMessage", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "*";
    if (ie(this._callState, "sendAppMessage()"), JSON.stringify(o).length > this._maxAppMessageSize) throw new Error("Message data too large. Max size is " + this._maxAppMessageSize);
    return this.sendMessageToCallMachine({ action: "app-msg", data: o, to: h }), this;
  } }, { key: "addFakeParticipant", value: function(o) {
    return Z(), ie(this._callState, "addFakeParticipant()"), this.sendMessageToCallMachine(B({ action: "add-fake-participant" }, o)), this;
  } }, { key: "setShowNamesMode", value: function(o) {
    return _e(this._callObjectMode, "setShowNamesMode()"), Z(), o && o !== "always" && o !== "never" ? (console.error('setShowNamesMode argument should be "always", "never", or false'), this) : (this.sendMessageToCallMachine({ action: "set-show-names", mode: o }), this);
  } }, { key: "setShowLocalVideo", value: function() {
    var o = !(arguments.length > 0 && arguments[0] !== void 0) || arguments[0];
    return _e(this._callObjectMode, "setShowLocalVideo()"), Z(), ie(this._callState, "setShowLocalVideo()"), typeof o != "boolean" ? (console.error("setShowLocalVideo only accepts a boolean value"), this) : (this.sendMessageToCallMachine({ action: "set-show-local-video", show: o }), this._showLocalVideo = o, this);
  } }, { key: "showLocalVideo", value: function() {
    return _e(this._callObjectMode, "showLocalVideo()"), Z(), this._showLocalVideo;
  } }, { key: "setShowParticipantsBar", value: function() {
    var o = !(arguments.length > 0 && arguments[0] !== void 0) || arguments[0];
    return _e(this._callObjectMode, "setShowParticipantsBar()"), Z(), ie(this._callState, "setShowParticipantsBar()"), typeof o != "boolean" ? (console.error("setShowParticipantsBar only accepts a boolean value"), this) : (this.sendMessageToCallMachine({ action: "set-show-participants-bar", show: o }), this._showParticipantsBar = o, this);
  } }, { key: "showParticipantsBar", value: function() {
    return _e(this._callObjectMode, "showParticipantsBar()"), Z(), this._showParticipantsBar;
  } }, { key: "customIntegrations", value: function() {
    return Z(), _e(this._callObjectMode, "customIntegrations()"), this._customIntegrations;
  } }, { key: "setCustomIntegrations", value: function(o) {
    return Z(), _e(this._callObjectMode, "setCustomIntegrations()"), ie(this._callState, "setCustomIntegrations()"), Ih(o) ? (this.sendMessageToCallMachine({ action: "set-custom-integrations", integrations: o }), this._customIntegrations = o, this) : this;
  } }, { key: "startCustomIntegrations", value: function(o) {
    var h = this;
    if (Z(), _e(this._callObjectMode, "startCustomIntegrations()"), ie(this._callState, "startCustomIntegrations()"), Array.isArray(o) && o.some(function(m) {
      return typeof m != "string";
    }) || !Array.isArray(o) && typeof o != "string") return console.error("startCustomIntegrations() only accepts string | string[]"), this;
    var d = typeof o == "string" ? [o] : o, g = d.filter(function(m) {
      return !(m in h._customIntegrations);
    });
    return g.length ? (console.error(`Can't find custom integration(s): "`.concat(g.join(", "), '"')), this) : (this.sendMessageToCallMachine({ action: "start-custom-integrations", ids: d }), this);
  } }, { key: "stopCustomIntegrations", value: function(o) {
    var h = this;
    if (Z(), _e(this._callObjectMode, "stopCustomIntegrations()"), ie(this._callState, "stopCustomIntegrations()"), Array.isArray(o) && o.some(function(m) {
      return typeof m != "string";
    }) || !Array.isArray(o) && typeof o != "string") return console.error("stopCustomIntegrations() only accepts string | string[]"), this;
    var d = typeof o == "string" ? [o] : o, g = d.filter(function(m) {
      return !(m in h._customIntegrations);
    });
    return g.length ? (console.error(`Can't find custom integration(s): "`.concat(g.join(", "), '"')), this) : (this.sendMessageToCallMachine({ action: "stop-custom-integrations", ids: d }), this);
  } }, { key: "customTrayButtons", value: function() {
    return _e(this._callObjectMode, "customTrayButtons()"), Z(), this._customTrayButtons;
  } }, { key: "updateCustomTrayButtons", value: function(o) {
    return _e(this._callObjectMode, "updateCustomTrayButtons()"), Z(), ie(this._callState, "updateCustomTrayButtons()"), xh(o) ? (this.sendMessageToCallMachine({ action: "update-custom-tray-buttons", btns: o }), this._customTrayButtons = o, this) : (console.error("updateCustomTrayButtons only accepts a dictionary of the type ".concat(JSON.stringify(on))), this);
  } }, { key: "theme", value: function() {
    return _e(this._callObjectMode, "theme()"), this.properties.theme;
  } }, { key: "setTheme", value: function(o) {
    var h = this;
    return _e(this._callObjectMode, "setTheme()"), new Promise(function(d, g) {
      try {
        h.validateProperties({ theme: o }), h.properties.theme = B({}, o), h.sendMessageToCallMachine({ action: "set-theme", theme: h.properties.theme });
        try {
          h.emitDailyJSEvent({ action: pg, theme: h.properties.theme });
        } catch (m) {
          console.log("could not emit 'theme-updated'", m);
        }
        d(h.properties.theme);
      } catch (m) {
        g(m);
      }
    });
  } }, { key: "requestFullscreen", value: (a = J(function* () {
    if (Z(), this._iframe && !document.fullscreenElement && Fc()) try {
      (yield this._iframe.requestFullscreen) ? this._iframe.requestFullscreen() : this._iframe.webkitRequestFullscreen();
    } catch (o) {
      console.log("could not make video call fullscreen", o);
    }
  }), function() {
    return a.apply(this, arguments);
  }) }, { key: "exitFullscreen", value: function() {
    Z(), document.fullscreenElement ? document.exitFullscreen() : document.webkitFullscreenElement && document.webkitExitFullscreen();
  } }, { key: "getSidebarView", value: (s = J(function* () {
    var o = this;
    return this._callObjectMode ? (console.error("getSidebarView is not available in callObject mode"), Promise.resolve(null)) : new Promise(function(h) {
      o.sendMessageToCallMachine({ action: "get-sidebar-view" }, function(d) {
        h(d.view);
      });
    });
  }), function() {
    return s.apply(this, arguments);
  }) }, { key: "setSidebarView", value: function(o) {
    return this._callObjectMode ? (console.error("setSidebarView is not available in callObject mode"), this) : (this.sendMessageToCallMachine({ action: "set-sidebar-view", view: o }), this);
  } }, { key: "room", value: (i = J(function* () {
    var o = this, h = (arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}).includeRoomConfigDefaults, d = h === void 0 || h;
    return this._accessState.access === jn || this.needsLoad() ? this.properties.url ? { roomUrlPendingJoin: this.properties.url } : null : new Promise(function(g) {
      o.sendMessageToCallMachine({ action: "lib-room-info", includeRoomConfigDefaults: d }, function(m) {
        delete m.action, delete m.callbackStamp, g(m);
      });
    });
  }), function() {
    return i.apply(this, arguments);
  }) }, { key: "geo", value: (n = J(function* () {
    return console.error("The geo() function is no longer supported. Geographical decisions now depend upon domain and room settings."), { current: "" };
  }), function() {
    return n.apply(this, arguments);
  }) }, { key: "setNetworkTopology", value: (t = J(function* (o) {
    var h = this;
    return Z(), ie(this._callState, "setNetworkTopology()"), new Promise(function(d, g) {
      h.sendMessageToCallMachine({ action: "set-network-topology", opts: o }, function(m) {
        m.error ? g({ error: m.error }) : d({ workerId: m.workerId });
      });
    });
  }), function(o) {
    return t.apply(this, arguments);
  }) }, { key: "getNetworkTopology", value: (e = J(function* () {
    var o = this;
    return new Promise(function(h, d) {
      o.needsLoad() && h({ topology: "none" }), o.sendMessageToCallMachine({ action: "get-network-topology" }, function(g) {
        g.error ? d({ error: g.error }) : h({ topology: g.topology });
      });
    });
  }), function() {
    return e.apply(this, arguments);
  }) }, { key: "setPlayNewParticipantSound", value: function(o) {
    if (Z(), typeof o != "number" && o !== !0 && o !== !1) throw new Error("argument to setShouldPlayNewParticipantSound should be true, false, or a number, but is ".concat(o));
    this.sendMessageToCallMachine({ action: "daily-method-set-play-ding", arg: o });
  } }, { key: "on", value: function(o, h) {
    return Pr.prototype.on.call(this, o, h);
  } }, { key: "once", value: function(o, h) {
    return Pr.prototype.once.call(this, o, h);
  } }, { key: "off", value: function(o, h) {
    return Pr.prototype.off.call(this, o, h);
  } }, { key: "validateProperties", value: function(o) {
    var h, d;
    if (o != null && (h = o.dailyConfig) !== null && h !== void 0 && h.userMediaAudioConstraints) {
      var g, m;
      ee() || console.warn("userMediaAudioConstraints is deprecated. You can override constraints with inputSettings.audio.settings, found in DailyCallOptions.");
      var A = o.inputSettings || {};
      A.audio = ((g = o.inputSettings) === null || g === void 0 ? void 0 : g.audio) || {}, A.audio.settings = ((m = o.inputSettings) === null || m === void 0 || (m = m.audio) === null || m === void 0 ? void 0 : m.settings) || {}, A.audio.settings = B(B({}, A.audio.settings), o.dailyConfig.userMediaAudioConstraints), o.inputSettings = A, delete o.dailyConfig.userMediaAudioConstraints;
    }
    if (o != null && (d = o.dailyConfig) !== null && d !== void 0 && d.userMediaVideoConstraints) {
      var P, x;
      ee() || console.warn("userMediaVideoConstraints is deprecated. You can override constraints with inputSettings.video.settings, found in DailyCallOptions.");
      var j = o.inputSettings || {};
      j.video = ((P = o.inputSettings) === null || P === void 0 ? void 0 : P.video) || {}, j.video.settings = ((x = o.inputSettings) === null || x === void 0 || (x = x.video) === null || x === void 0 ? void 0 : x.settings) || {}, j.video.settings = B(B({}, j.video.settings), o.dailyConfig.userMediaVideoConstraints), o.inputSettings = j, delete o.dailyConfig.userMediaVideoConstraints;
    }
    for (var H in o) if (wt[H]) {
      if (wt[H].validate && !wt[H].validate(o[H], this)) throw new Error("property '".concat(H, "': ").concat(wt[H].help));
    } else console.warn("Ignoring unrecognized property '".concat(H, "'")), delete o[H];
  } }, { key: "assembleMeetingUrl", value: function() {
    var o, h, d = B(B({}, this.properties), {}, { emb: this.callClientId, embHref: encodeURIComponent(window.location.href), proxy: (o = this.properties.dailyConfig) !== null && o !== void 0 && o.proxyUrl ? encodeURIComponent((h = this.properties.dailyConfig) === null || h === void 0 ? void 0 : h.proxyUrl) : void 0 }), g = d.url.match(/\?/) ? "&" : "?";
    return d.url + g + Object.keys(wt).filter(function(m) {
      return wt[m].queryString && d[m] !== void 0;
    }).map(function(m) {
      return "".concat(wt[m].queryString, "=").concat(d[m]);
    }).join("&");
  } }, { key: "needsLoad", value: function() {
    return [Mc, Cc, at, ot].includes(this._callState);
  } }, { key: "sendMessageToCallMachine", value: function(o, h) {
    if (this._destroyed && (this._logUseAfterDestroy(), this.strictMode)) throw new Error("Use after destroy");
    this._messageChannel.sendMessageToCallMachine(o, h, this.callClientId, this._iframe);
  } }, { key: "forwardPackagedMessageToCallMachine", value: function(o) {
    this._messageChannel.forwardPackagedMessageToCallMachine(o, this._iframe, this.callClientId);
  } }, { key: "addListenerForPackagedMessagesFromCallMachine", value: function(o) {
    return this._messageChannel.addListenerForPackagedMessagesFromCallMachine(o, this.callClientId);
  } }, { key: "removeListenerForPackagedMessagesFromCallMachine", value: function(o) {
    this._messageChannel.removeListenerForPackagedMessagesFromCallMachine(o);
  } }, { key: "handleMessageFromCallMachine", value: function(o) {
    switch (o.action) {
      case hg:
        this.sendMessageToCallMachine(B({ action: fg }, this.properties));
        break;
      case "call-machine-initialized":
        this._callMachineInitialized = !0;
        var h = { action: $r, level: "log", code: 1011, stats: { event: "bundle load", time: this._bundleLoadTime === "no-op" ? 0 : this._bundleLoadTime, preLoaded: this._bundleLoadTime === "no-op", url: Xr(this.properties.dailyConfig) } };
        this.sendMessageToCallMachine(h), this._delayDuplicateInstanceLog && this._logDuplicateInstanceAttempt();
        break;
      case Tc:
        this._loadedCallback && (this._loadedCallback(), this._loadedCallback = null), this.emitDailyJSEvent(o);
        break;
      case _g:
        var d, g = B({}, o);
        delete g.internal, this._maxAppMessageSize = ((d = o.internal) === null || d === void 0 ? void 0 : d._maxAppMessageSize) || Dn, this._joinedCallback && (this._joinedCallback(o.participants), this._joinedCallback = null), this.emitDailyJSEvent(g);
        break;
      case Sg:
      case kg:
        if (this._callState === at) return;
        if (o.participant && o.participant.session_id) {
          var m = o.participant.local ? "local" : o.participant.session_id;
          if (this._callObjectMode) {
            var A = this._callMachine().store;
            Wc(o.participant, A), Gc(o.participant, A), Jc(o.participant, this._participants[m], A);
          }
          try {
            this.maybeParticipantTracksStopped(this._participants[m], o.participant), this.maybeParticipantTracksStarted(this._participants[m], o.participant), this.maybeEventRecordingStopped(this._participants[m], o.participant), this.maybeEventRecordingStarted(this._participants[m], o.participant);
          } catch (kn) {
            console.error("track events error", kn);
          }
          this.compareEqualForParticipantUpdateEvent(o.participant, this._participants[m]) || (this._participants[m] = B({}, o.participant), this.toggleParticipantAudioBasedOnNativeAudioFocus(), this.emitDailyJSEvent(o));
        }
        break;
      case Mg:
        if (o.participant && o.participant.session_id) {
          var P = this._participants[o.participant.session_id];
          P && this.maybeParticipantTracksStopped(P, null), delete this._participants[o.participant.session_id], this.emitDailyJSEvent(o);
        }
        break;
      case Cg:
        be(this._participantCounts, o.participantCounts) || (this._participantCounts = o.participantCounts, this.emitDailyJSEvent(o));
        break;
      case Eg:
        var x = { access: o.access };
        o.awaitingAccess && (x.awaitingAccess = o.awaitingAccess), be(this._accessState, x) || (this._accessState = x, this.emitDailyJSEvent(o));
        break;
      case Ag:
        if (o.meetingSession) {
          this._meetingSessionSummary = o.meetingSession, this.emitDailyJSEvent(o);
          var j = B(B({}, o), {}, { action: "meeting-session-updated" });
          this.emitDailyJSEvent(j);
        }
        break;
      case Lc:
        var H;
        this._iframe && !o.preserveIframe && (this._iframe.src = ""), this._updateCallState(ot), this.resetMeetingDependentVars(), this._loadedCallback && (this._loadedCallback(o.errorMsg), this._loadedCallback = null), o.preserveIframe;
        var Q = yo(o, Rm);
        Q != null && (H = Q.error) !== null && H !== void 0 && H.details && (Q.error.details = JSON.parse(Q.error.details)), this._maybeSendToSentry(o), this._joinedCallback && (this._joinedCallback(null, Q), this._joinedCallback = null), this.emitDailyJSEvent(Q);
        break;
      case wg:
        this._callState !== ot && this._updateCallState(at), this.resetMeetingDependentVars(), this._resolveLeave && (this._resolveLeave(), this._resolveLeave = null), this.emitDailyJSEvent(o);
        break;
      case "selected-devices-updated":
        o.devices && this.emitDailyJSEvent(o);
        break;
      case Yg:
        var Ee = o.state, Y = o.threshold, Ke = o.quality, X = Ee.state, se = Ee.reasons;
        X === this._network.networkState && be(se, this._network.networkStateReasons) && Y === this._network.threshold && Ke === this._network.quality || (this._network.networkState = X, this._network.networkStateReasons = se, this._network.quality = Ke, this._network.threshold = Y, o.networkState = X, se.length && (o.networkStateReasons = se), delete o.state, this.emitDailyJSEvent(o));
        break;
      case Zg:
        o && o.cpuLoadState && this.emitDailyJSEvent(o);
        break;
      case em:
        o && o.faceCounts !== void 0 && this.emitDailyJSEvent(o);
        break;
      case Kg:
        var he = o.activeSpeaker;
        this._activeSpeaker.peerId !== he.peerId && (this._activeSpeaker.peerId = he.peerId, this.emitDailyJSEvent({ action: o.action, activeSpeaker: this._activeSpeaker }));
        break;
      case "show-local-video-changed":
        if (this._callObjectMode) return;
        var Qe = o.show;
        this._showLocalVideo = Qe, this.emitDailyJSEvent({ action: o.action, show: Qe });
        break;
      case Qg:
        var Ve = o.enabled;
        this._activeSpeakerMode !== Ve && (this._activeSpeakerMode = Ve, this.emitDailyJSEvent({ action: o.action, enabled: this._activeSpeakerMode }));
        break;
      case Og:
      case Pg:
      case xg:
        this._waitingParticipants = o.allWaitingParticipants, this.emitDailyJSEvent({ action: o.action, participant: o.participant });
        break;
      case am:
        be(this._receiveSettings, o.receiveSettings) || (this._receiveSettings = o.receiveSettings, this.emitDailyJSEvent({ action: o.action, receiveSettings: o.receiveSettings }));
        break;
      case xc:
        this._maybeUpdateInputSettings(o.inputSettings);
        break;
      case "send-settings-updated":
        be(this._sendSettings, o.sendSettings) || (this._sendSettings = o.sendSettings, this._preloadCache.sendSettings = null, this.emitDailyJSEvent({ action: o.action, sendSettings: o.sendSettings }));
        break;
      case "local-audio-level":
        this._localAudioLevel = o.audioLevel, this._preloadCache.localAudioLevelObserver = null, this.emitDailyJSEvent(o);
        break;
      case "remote-participants-audio-level":
        this._remoteParticipantsAudioLevel = o.participantsAudioLevel, this._preloadCache.remoteParticipantsAudioLevelObserver = null, this.emitDailyJSEvent(o);
        break;
      case Vg:
        var Ae = o.session_id;
        this._rmpPlayerState[Ae] = o.playerState, this.emitDailyJSEvent(o);
        break;
      case Wg:
        delete this._rmpPlayerState[o.session_id], this.emitDailyJSEvent(o);
        break;
      case zg:
        var ce = o.session_id, ze = this._rmpPlayerState[ce];
        ze && this.compareEqualForRMPUpdateEvent(ze, o.remoteMediaPlayerState) || (this._rmpPlayerState[ce] = o.remoteMediaPlayerState, this.emitDailyJSEvent(o));
        break;
      case "custom-button-click":
      case "sidebar-view-changed":
      case "pip-started":
      case "pip-stopped":
        this.emitDailyJSEvent(o);
        break;
      case Tg:
        var Ft = this._meetingSessionState.topology !== (o.meetingSessionState && o.meetingSessionState.topology);
        this._meetingSessionState = Gn(o.meetingSessionState, this._callObjectMode), (this._callObjectMode || Ft) && this.emitDailyJSEvent(o);
        break;
      case Gg:
        this._isScreenSharing = !0, this.emitDailyJSEvent(o);
        break;
      case Jg:
      case Hg:
        this._isScreenSharing = !1, this.emitDailyJSEvent(o);
        break;
      case Oc:
      case Pc:
      case Bg:
      case Fg:
      case Ng:
      case Rg:
      case jg:
      case Dg:
      case vg:
      case bg:
      case qg:
      case Ug:
      case "test-completed":
      case Xg:
      case $g:
      case tm:
      case rm:
      case nm:
      case im:
      case Ic:
      case sm:
      case "dialin-ready":
      case "dialin-connected":
      case "dialin-error":
      case "dialin-stopped":
      case "dialin-warning":
      case "dialout-connected":
      case "dtmf-event":
      case "dialout-answered":
      case "dialout-error":
      case "dialout-stopped":
      case "dialout-warning":
        this.emitDailyJSEvent(o);
        break;
      case "request-fullscreen":
        this.requestFullscreen();
        break;
      case "request-exit-fullscreen":
        this.exitFullscreen();
    }
  } }, { key: "maybeEventRecordingStopped", value: function(o, h) {
    var d = "record";
    o && (h.local || h[d] !== !1 || o[d] === h[d] || this.emitDailyJSEvent({ action: Pc }));
  } }, { key: "maybeEventRecordingStarted", value: function(o, h) {
    var d = "record";
    o && (h.local || h[d] !== !0 || o[d] === h[d] || this.emitDailyJSEvent({ action: Oc }));
  } }, { key: "_trackStatePlayable", value: function(o) {
    return !(!o || o.state !== og);
  } }, { key: "_trackChanged", value: function(o, h) {
    return o?.id !== h?.id;
  } }, { key: "maybeEventTrackStopped", value: function(o, h, d) {
    var g, m, A = (g = h?.tracks[o]) !== null && g !== void 0 ? g : null, P = (m = d?.tracks[o]) !== null && m !== void 0 ? m : null, x = A?.track;
    if (x) {
      var j = this._trackStatePlayable(A), H = this._trackStatePlayable(P), Q = this._trackChanged(x, P?.track);
      j && (H && !Q || this.emitDailyJSEvent({ action: Lg, track: x, participant: d ?? h, type: o }));
    }
  } }, { key: "maybeEventTrackStarted", value: function(o, h, d) {
    var g, m, A = (g = h?.tracks[o]) !== null && g !== void 0 ? g : null, P = (m = d?.tracks[o]) !== null && m !== void 0 ? m : null, x = P?.track;
    if (x) {
      var j = this._trackStatePlayable(A), H = this._trackStatePlayable(P), Q = this._trackChanged(A?.track, x);
      H && (j && !Q || this.emitDailyJSEvent({ action: Ig, track: x, participant: d, type: o }));
    }
  } }, { key: "maybeParticipantTracksStopped", value: function(o, h) {
    if (o) for (var d in o.tracks) this.maybeEventTrackStopped(d, o, h);
  } }, { key: "maybeParticipantTracksStarted", value: function(o, h) {
    if (h) for (var d in h.tracks) this.maybeEventTrackStarted(d, o, h);
  } }, { key: "compareEqualForRMPUpdateEvent", value: function(o, h) {
    var d, g;
    return o.state === h.state && ((d = o.settings) === null || d === void 0 ? void 0 : d.volume) === ((g = h.settings) === null || g === void 0 ? void 0 : g.volume);
  } }, { key: "emitDailyJSEvent", value: function(o) {
    try {
      o.callClientId = this.callClientId, this.emit(o.action, o);
    } catch (h) {
      console.log("could not emit", o, h);
    }
  } }, { key: "compareEqualForParticipantUpdateEvent", value: function(o, h) {
    return !!be(o, h) && (!o.videoTrack || !h.videoTrack || o.videoTrack.id === h.videoTrack.id && o.videoTrack.muted === h.videoTrack.muted && o.videoTrack.enabled === h.videoTrack.enabled) && (!o.audioTrack || !h.audioTrack || o.audioTrack.id === h.audioTrack.id && o.audioTrack.muted === h.audioTrack.muted && o.audioTrack.enabled === h.audioTrack.enabled);
  } }, { key: "nativeUtils", value: function() {
    return ee() ? typeof DailyNativeUtils > "u" ? (console.warn("in React Native, DailyNativeUtils is expected to be available"), null) : DailyNativeUtils : null;
  } }, { key: "updateIsPreparingToJoin", value: function(o) {
    this._updateCallState(this._callState, o);
  } }, { key: "_updateCallState", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this._isPreparingToJoin;
    if (o !== this._callState || h !== this._isPreparingToJoin) {
      var d = this._callState, g = this._isPreparingToJoin;
      this._callState = o, this._isPreparingToJoin = h;
      var m = this._callState === Mt;
      this.updateShowAndroidOngoingMeetingNotification(m);
      var A = Kr(d, g), P = Kr(this._callState, this._isPreparingToJoin);
      A !== P && (this.updateKeepDeviceAwake(P), this.updateDeviceAudioMode(P), this.updateNoOpRecordingEnsuringBackgroundContinuity(P));
    }
  } }, { key: "resetMeetingDependentVars", value: function() {
    this._participants = {}, this._participantCounts = iu, this._waitingParticipants = {}, this._activeSpeaker = {}, this._activeSpeakerMode = !1, this._didPreAuth = !1, this._accessState = { access: jn }, this._finalSummaryOfPrevSession = this._meetingSessionSummary, this._meetingSessionSummary = {}, this._meetingSessionState = Gn(nu, this._callObjectMode), this._isScreenSharing = !1, this._receiveSettings = {}, this._inputSettings = void 0, this._sendSettings = {}, this._localAudioLevel = 0, this._isLocalAudioLevelObserverRunning = !1, this._remoteParticipantsAudioLevel = {}, this._isRemoteParticipantsAudioLevelObserverRunning = !1, this._maxAppMessageSize = Dn, this._callMachineInitialized = !1, this._bundleLoadTime = void 0, this._preloadCache;
  } }, { key: "updateKeepDeviceAwake", value: function(o) {
    ee() && this.nativeUtils().setKeepDeviceAwake(o, this.callClientId);
  } }, { key: "updateDeviceAudioMode", value: function(o) {
    if (ee() && !this.disableReactNativeAutoDeviceManagement("audio")) {
      var h = o ? this._nativeInCallAudioMode : "idle";
      this.nativeUtils().setAudioMode(h);
    }
  } }, { key: "updateShowAndroidOngoingMeetingNotification", value: function(o) {
    if (ee() && this.nativeUtils().setShowOngoingMeetingNotification) {
      var h, d, g, m;
      if (this.properties.reactNativeConfig && this.properties.reactNativeConfig.androidInCallNotification) {
        var A = this.properties.reactNativeConfig.androidInCallNotification;
        h = A.title, d = A.subtitle, g = A.iconName, m = A.disableForCustomOverride;
      }
      m && (o = !1), this.nativeUtils().setShowOngoingMeetingNotification(o, h, d, g, this.callClientId);
    }
  } }, { key: "updateNoOpRecordingEnsuringBackgroundContinuity", value: function(o) {
    ee() && this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity && this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity(o);
  } }, { key: "toggleParticipantAudioBasedOnNativeAudioFocus", value: function() {
    var o;
    if (ee()) {
      var h = (o = this._callMachine()) === null || o === void 0 || (o = o.store) === null || o === void 0 ? void 0 : o.getState();
      for (var d in h?.streams) {
        var g = h.streams[d];
        g && g.pendingTrack && g.pendingTrack.kind === "audio" && (g.pendingTrack.enabled = this._hasNativeAudioFocus);
      }
    }
  } }, { key: "disableReactNativeAutoDeviceManagement", value: function(o) {
    return this.properties.reactNativeConfig && this.properties.reactNativeConfig.disableAutoDeviceManagement && this.properties.reactNativeConfig.disableAutoDeviceManagement[o];
  } }, { key: "absoluteUrl", value: function(o) {
    if (o !== void 0) {
      var h = document.createElement("a");
      return h.href = o, h.href;
    }
  } }, { key: "sayHello", value: function() {
    var o = "hello, world.";
    return console.log(o), o;
  } }, { key: "_logUseAfterDestroy", value: function() {
    var o = Object.values(_t)[0];
    if (this.needsLoad())
      if (o && !o.needsLoad()) {
        var h = { action: $r, level: "error", code: this.strictMode ? 9995 : 9997 };
        o.sendMessageToCallMachine(h);
      } else this.strictMode || console.error("You are are attempting to use a call instance that was previously destroyed, which is unsupported. Please remove `strictMode: false` from your constructor properties to enable strict mode to track down and fix this unsupported usage.");
    else {
      var d = { action: $r, level: "error", code: this.strictMode ? 9995 : 9997 };
      this._messageChannel.sendMessageToCallMachine(d, null, this.callClientId, this._iframe);
    }
  } }, { key: "_logDuplicateInstanceAttempt", value: function() {
    for (var o = 0, h = Object.values(_t); o < h.length; o++) {
      var d = h[o];
      d._callMachineInitialized ? (d.sendMessageToCallMachine({ action: $r, level: "warn", code: this.allowMultipleCallInstances ? 9993 : 9992 }), d._delayDuplicateInstanceLog = !1) : d._delayDuplicateInstanceLog = !0;
    }
  } }, { key: "_maybeSendToSentry", value: function(o) {
    var h, d, g, m, A;
    if (!((h = o.error) !== null && h !== void 0 && h.type && (![dg, lg, Ac].includes(o.error.type) || o.error.type === Ac && o.error.msg.includes("deleted")))) {
      var P = (d = this.properties) !== null && d !== void 0 && d.url ? new URL(this.properties.url) : void 0, x = "production";
      P && P.host.includes(".staging.daily") && (x = "staging");
      var j, H, Q, Ee, Y, Ke = (function(ce) {
        const ze = [Ap(), Cp(), Zp(), Yp(), ig(), ag(), xp(), sg()];
        return ce.autoSessionTracking !== !1 && ze.push(ng()), ze;
      })({}).filter(function(ce) {
        return !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(ce.name);
      }), X = new Np({ dsn: "https://f10f1c81e5d44a4098416c0867a8b740@o77906.ingest.sentry.io/168844", transport: zp, stackParser: Qp, integrations: Ke, environment: x }), se = new gt();
      if (se.setClient(X), X.init(), !((g = this._participants) === null || g === void 0 || (g = g.local) === null || g === void 0) && g.session_id && se.setExtra("sessionId", this._participants.local.session_id), this.properties) {
        var he = B({}, this.properties);
        he.userName = he.userName ? "[Filtered]" : void 0, he.userData = he.userData ? "[Filtered]" : void 0, he.token = he.token ? "[Filtered]" : void 0, se.setExtra("properties", he);
      }
      if (P) {
        var Qe = P.searchParams.get("domain");
        if (!Qe) {
          var Ve = P.host.match(/(.*?)\./);
          Qe = Ve && Ve[1] || "";
        }
        Qe && se.setTag("domain", Qe);
      }
      o.error && (se.setTag("fatalErrorType", o.error.type), se.setExtra("errorDetails", o.error.details), !((j = o.error.details) === null || j === void 0) && j.uri && se.setTag("serverAddress", o.error.details.uri), !((H = o.error.details) === null || H === void 0) && H.workerGroup && se.setTag("workerGroup", o.error.details.workerGroup), !((Q = o.error.details) === null || Q === void 0) && Q.geoGroup && se.setTag("geoGroup", o.error.details.geoGroup), !((Ee = o.error.details) === null || Ee === void 0) && Ee.on && se.setTag("connectionAttempt", o.error.details.on), (Y = o.error.details) !== null && Y !== void 0 && Y.bundleUrl && (se.setTag("bundleUrl", o.error.details.bundleUrl), se.setTag("bundleError", o.error.details.sourceError.type))), se.setTags({ callMode: this._callObjectMode ? ee() ? "reactNative" : (m = this.properties) !== null && m !== void 0 && (m = m.dailyConfig) !== null && m !== void 0 && (m = m.callMode) !== null && m !== void 0 && m.includes("prebuilt") ? this.properties.dailyConfig.callMode : "custom" : "prebuilt-frame", version: r.version() });
      var Ae = ((A = o.error) === null || A === void 0 ? void 0 : A.msg) || o.errorMsg;
      se.captureException(new Error(Ae));
    }
  } }, { key: "_callMachine", value: function() {
    var o;
    return (o = window._daily) === null || o === void 0 || (o = o.instances) === null || o === void 0 || (o = o[this.callClientId]) === null || o === void 0 ? void 0 : o.callMachine;
  } }, { key: "_maybeUpdateInputSettings", value: function(o) {
    if (!be(this._inputSettings, o)) {
      var h = this._getInputSettings();
      this._inputSettings = o;
      var d = this._getInputSettings();
      be(h, d) || this.emitDailyJSEvent({ action: xc, inputSettings: d });
    }
  } }], [{ key: "supportedBrowser", value: function() {
    if (ee()) return { supported: !0, mobile: !0, name: "React Native", version: null, supportsScreenShare: !0, supportsSfu: !0, supportsVideoProcessing: !1, supportsAudioProcessing: !1 };
    var o = Jf.getParser(xe());
    return { supported: !!$n(), mobile: o.getPlatformType() === "mobile", name: o.getBrowserName(), version: o.getBrowserVersion(), supportsFullscreen: !!Fc(), supportsScreenShare: !!um(), supportsSfu: !!$n(), supportsVideoProcessing: lh(), supportsAudioProcessing: dh() };
  } }, { key: "version", value: function() {
    return "0.90.0";
  } }, { key: "createCallObject", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    return o.layout = "none", new r(null, o);
  } }, { key: "wrap", value: function(o) {
    var h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (Z(), !o || !o.contentWindow || typeof o.src != "string") throw new Error("DailyIframe::Wrap needs an iframe-like first argument");
    return h.layout || (h.customLayout ? h.layout = "custom-v1" : h.layout = "browser"), new r(o, h);
  } }, { key: "createFrame", value: function(o, h) {
    var d, g;
    Z(), o && h ? (d = o, g = h) : o && o.append ? (d = o, g = {}) : (d = document.body, g = o || {});
    var m = g.iframeStyle;
    m || (m = d === document.body ? { position: "fixed", border: "1px solid black", backgroundColor: "white", width: "375px", height: "450px", right: "1em", bottom: "1em" } : { border: 0, width: "100%", height: "100%" });
    var A = document.createElement("iframe");
    window.navigator && window.navigator.userAgent.match(/Chrome\/61\./) ? A.allow = "microphone, camera" : A.allow = "microphone; camera; autoplay; display-capture; screen-wake-lock; compute-pressure;", A.style.visibility = "hidden", d.appendChild(A), A.style.visibility = null, Object.keys(m).forEach(function(P) {
      return A.style[P] = m[P];
    }), g.layout || (g.customLayout ? g.layout = "custom-v1" : g.layout = "browser");
    try {
      return new r(A, g);
    } catch (P) {
      throw d.removeChild(A), P;
    }
  } }, { key: "createTransparentFrame", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Z();
    var h = document.createElement("iframe");
    return h.allow = "microphone; camera; autoplay", h.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
      pointer-events: none;
    `, document.body.appendChild(h), o.layout || (o.layout = "custom-v1"), r.wrap(h, o);
  } }, { key: "getCallInstance", value: function() {
    var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : void 0;
    return o ? _t[o] : Object.values(_t)[0];
  } }]);
  var e, t, n, i, s, a, c, u, l, f, p, y, M, b, v, C, E, O, I, k, S, T, L, D, N, $, U, de, Le, vt, _r, wr, Sr, rr, kr, Mr, Cr, Er;
})();
function uu(r) {
  if (r.extension) {
    if (typeof r.extension != "string") throw new Error("Error starting dial out: extension must be a string");
    if (r.extension.length > 20) throw new Error("Error starting dial out: extension length must be less than or equal to 20");
  }
  if (r.waitBeforeExtensionDialSec) {
    if (typeof r.waitBeforeExtensionDialSec != "number") throw new Error("Error starting dial out: waitBeforeExtensionDialSec must be a number");
    if (r.waitBeforeExtensionDialSec > 60) throw new Error("Error starting dial out: waitBeforeExtensionDialSec must be less than or equal to 60");
    if (!r.extension) throw new Error("Error starting dial out: waitBeforeExtensionDialSec requires a phoneNumber and extension");
  }
}
function $t(r, e) {
  var t = {};
  for (var n in r) if (r[n] instanceof MediaStreamTrack) console.warn("MediaStreamTrack found in props or cache.", n), t[n] = rt;
  else if (n === "dailyConfig") {
    if (r[n].modifyLocalSdpHook) {
      var i = window._daily.instances[e].customCallbacks || {};
      i.modifyLocalSdpHook = r[n].modifyLocalSdpHook, window._daily.instances[e].customCallbacks = i, delete r[n].modifyLocalSdpHook;
    }
    if (r[n].modifyRemoteSdpHook) {
      var s = window._daily.instances[e].customCallbacks || {};
      s.modifyRemoteSdpHook = r[n].modifyRemoteSdpHook, window._daily.instances[e].customCallbacks = s, delete r[n].modifyRemoteSdpHook;
    }
    t[n] = r[n];
  } else t[n] = r[n];
  return t;
}
function ie(r) {
  var e = arguments.length > 2 ? arguments[2] : void 0;
  if (r !== Mt) {
    var t = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " only supported after join.");
    throw e && (t += " ".concat(e)), console.error(t), new Error(t);
  }
}
function Kr(r, e) {
  return [fa, Mt].includes(r) || e;
}
function zn(r, e) {
  var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "This daily-js method", n = arguments.length > 3 ? arguments[3] : void 0;
  if (Kr(r, e)) {
    var i = "".concat(t, " not supported after joining a meeting.");
    throw n && (i += " ".concat(n)), console.error(i), new Error(i);
  }
}
function zr(r) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", t = arguments.length > 2 ? arguments[2] : void 0;
  if (!r) {
    var n = "".concat(e, arguments.length > 3 && arguments[3] !== void 0 && arguments[3] ? " requires preAuth() or startCamera() to initialize call state." : " requires preAuth(), startCamera(), or join() to initialize call state.");
    throw t && (n += " ".concat(t)), console.error(n), new Error(n);
  }
}
function Wn(r) {
  if (r) {
    var e = "A pre-call quality test is in progress. Please try ".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " again once testing has completed. Use stopTestCallQuality() to end it early.");
    throw console.error(e), new Error(e);
  }
}
function Re(r) {
  if (!r) {
    var e = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " is only supported on custom callObject instances");
    throw console.error(e), new Error(e);
  }
}
function _e(r) {
  if (r) {
    var e = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " is only supported as part of Daily's Prebuilt");
    throw console.error(e), new Error(e);
  }
}
function Z() {
  if (ee()) throw new Error("This daily-js method is not currently supported in React Native");
}
function ir() {
  if (!ee()) throw new Error("This daily-js method is only supported in React Native");
}
function Ch(r) {
  if (r === void 0) return !0;
  var e;
  if (typeof r == "string") e = r;
  else try {
    e = JSON.stringify(r), be(JSON.parse(e), r) || console.warn("The userData provided will be modified when serialized.");
  } catch (t) {
    throw Error("userData must be serializable to JSON: ".concat(t));
  }
  if (e.length > 4096) throw Error("userData is too large (".concat(e.length, " characters). Maximum size suppported is ").concat(4096, "."));
  return !0;
}
function Eh(r, e) {
  for (var t = e.allowAllParticipantsKey, n = function(p) {
    var y = ["local"];
    return t || y.push("*"), p && !y.includes(p);
  }, i = function(p) {
    return !!(p.layer === void 0 || Number.isInteger(p.layer) && p.layer >= 0 || p.layer === "inherit");
  }, s = function(p) {
    return !!p && !(p.video && !i(p.video)) && !(p.screenVideo && !i(p.screenVideo));
  }, a = 0, c = Object.entries(r); a < c.length; a++) {
    var u = le(c[a], 2), l = u[0], f = u[1];
    if (!n(l) || !s(f)) return !1;
  }
  return !0;
}
function Ah(r) {
  if (te(r) !== "object") return !1;
  for (var e = 0, t = Object.entries(r); e < t.length; e++) {
    var n = le(t[e], 2), i = n[0], s = n[1];
    switch (i) {
      case "video":
        if (te(s) !== "object") return !1;
        for (var a = 0, c = Object.entries(s); a < c.length; a++) {
          var u = le(c[a], 2), l = u[0], f = u[1];
          switch (l) {
            case "processor":
              if (!Bm(f)) return !1;
              break;
            case "settings":
              if (!lu(f)) return !1;
              break;
            default:
              return !1;
          }
        }
        break;
      case "audio":
        if (te(s) !== "object") return !1;
        for (var p = 0, y = Object.entries(s); p < y.length; p++) {
          var M = le(y[p], 2), b = M[0], v = M[1];
          switch (b) {
            case "processor":
              if (!Dm(v)) return !1;
              break;
            case "settings":
              if (!lu(v)) return !1;
              break;
            default:
              return !1;
          }
        }
        break;
      default:
        return !1;
    }
  }
  return !0;
}
function Th(r, e, t) {
  var n, i = [];
  r.video && r.video.processor && (lh((n = e?.useLegacyVideoProcessor) !== null && n !== void 0 && n) || (r.video.settings ? delete r.video.processor : delete r.video, i.push("video"))), r.audio && r.audio.processor && (dh() || (r.audio.settings ? delete r.audio.processor : delete r.audio, i.push("audio"))), i.length > 0 && console.error("Ignoring settings for browser- or platform-unsupported input processor(s): ".concat(i.join(", "))), r.audio && r.audio.settings && (r.audio.settings.customTrack ? (t.audioTrack = r.audio.settings.customTrack, r.audio.settings = { customTrack: rt }) : delete t.audioTrack), r.video && r.video.settings && (r.video.settings.customTrack ? (t.videoTrack = r.video.settings.customTrack, r.video.settings = { customTrack: rt }) : delete t.videoTrack);
}
function Dm(r) {
  if (ee()) return console.warn("Video processing is not yet supported in React Native"), !1;
  var e = ["type"];
  return !!r && te(r) === "object" && (Object.keys(r).filter(function(t) {
    return !e.includes(t);
  }).forEach(function(t) {
    console.warn("invalid key inputSettings -> audio -> processor : ".concat(t)), delete r[t];
  }), !!(function(t) {
    return typeof t != "string" ? !1 : Object.values(ch).includes(t) ? !0 : (console.error("inputSettings audio processor type invalid"), !1);
  })(r.type));
}
function Bm(r) {
  if (ee()) return console.warn("Video processing is not yet supported in React Native"), !1;
  var e = ["type", "config"];
  return !r || te(r) !== "object" || !(function(t) {
    return typeof t != "string" ? !1 : Object.values(Hr).includes(t) ? !0 : (console.error("inputSettings video processor type invalid"), !1);
  })(r.type) || r.config && (te(r.config) !== "object" || !(function(t, n) {
    var i = Object.keys(n);
    if (i.length === 0) return !0;
    var s = "invalid object in inputSettings -> video -> processor -> config";
    switch (t) {
      case Hr.BGBLUR:
        return i.length > 1 || i[0] !== "strength" ? (console.error(s), !1) : !(typeof n.strength != "number" || n.strength <= 0 || n.strength > 1 || isNaN(n.strength)) || (console.error("".concat(s, "; expected: {0 < strength <= 1}, got: ").concat(n.strength)), !1);
      case Hr.BGIMAGE:
        return !(n.source !== void 0 && !(function(a) {
          if (a.source === "default") return a.type = "default", !0;
          if (a.source instanceof ArrayBuffer) return !0;
          if (Zr(a.source)) return a.type = "url", !!(function(l) {
            var f = new URL(l), p = f.pathname;
            if (f.protocol === "data:") try {
              var y = p.substring(p.indexOf(":") + 1, p.indexOf(";")).split("/")[1];
              return Nn.includes(y);
            } catch (b) {
              return console.error("failed to deduce blob content type", b), !1;
            }
            var M = p.split(".").at(-1).toLowerCase().trim();
            return Nn.includes(M);
          })(a.source) || (console.error("invalid image type; supported types: [".concat(Nn.join(", "), "]")), !1);
          return c = a.source, u = Number(c), isNaN(u) || !Number.isInteger(u) || u <= 0 || u > 10 ? (console.error("invalid image selection; must be an int, > 0, <= ".concat(10)), !1) : (a.type = "daily-preselect", !0);
          var c, u;
        })(n));
      default:
        return !0;
    }
  })(r.type, r.config)) ? !1 : (Object.keys(r).filter(function(t) {
    return !e.includes(t);
  }).forEach(function(t) {
    console.warn("invalid key inputSettings -> video -> processor : ".concat(t)), delete r[t];
  }), !0);
}
function lu(r) {
  return te(r) === "object" && (!r.customTrack || r.customTrack instanceof MediaStreamTrack);
}
function wa() {
  var r = Object.values(Hr).join(" | "), e = Object.values(ch).join(" | ");
  return "inputSettings must be of the form: { video?: { processor?: { type: [ ".concat(r, " ], config?: {} } }, audio?: { processor: {type: [ ").concat(e, " ] } } }");
}
function Oh(r) {
  var e = r.allowAllParticipantsKey;
  return "receiveSettings must be of the form { [<remote participant id> | ".concat(ug).concat(e ? ' | "'.concat("*", '"') : "", "]: ") + '{ [video: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]], [screenVideo: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]] }}}';
}
function Ph() {
  return "customIntegrations should be an object of type ".concat(JSON.stringify(_a), ".");
}
function xh(r) {
  if (r && te(r) !== "object" || Array.isArray(r)) return console.error("customTrayButtons should be an Object of the type ".concat(JSON.stringify(on), ".")), !1;
  if (r) for (var e = 0, t = Object.entries(r); e < t.length; e++) for (var n = le(t[e], 1)[0], i = 0, s = Object.entries(r[n]); i < s.length; i++) {
    var a = le(s[i], 2), c = a[0], u = a[1], l = on.id[c];
    if (!l) return console.error("customTrayButton does not support key ".concat(c)), !1;
    switch (c) {
      case "iconPath":
      case "iconPathDarkMode":
        if (!Zr(u)) return console.error("customTrayButton ".concat(c, " should be a url.")), !1;
        break;
      case "visualState":
        if (!["default", "sidebar-open", "active"].includes(u)) return console.error("customTrayButton ".concat(c, " should be ").concat(l, ". Got: ").concat(u)), !1;
        break;
      default:
        if (te(u) !== l) return console.error("customTrayButton ".concat(c, " should be a ").concat(l, ".")), !1;
    }
  }
  return !0;
}
function Ih(r) {
  if (!r || r && te(r) !== "object" || Array.isArray(r)) return console.error(Ph()), !1;
  for (var e = function(p) {
    return "".concat(p, " should be ").concat(_a.id[p]);
  }, t = function(p, y) {
    return console.error("customIntegration ".concat(p, ": ").concat(y));
  }, n = 0, i = Object.entries(r); n < i.length; n++) {
    var s = le(i[n], 1)[0];
    if (!("label" in r[s])) return t(s, "label is required"), !1;
    if (!("location" in r[s])) return t(s, "location is required"), !1;
    if (!("src" in r[s]) && !("srcdoc" in r[s])) return t(s, "src or srcdoc is required"), !1;
    for (var a = 0, c = Object.entries(r[s]); a < c.length; a++) {
      var u = le(c[a], 2), l = u[0], f = u[1];
      switch (l) {
        case "allow":
        case "csp":
        case "name":
        case "referrerPolicy":
        case "sandbox":
          if (typeof f != "string") return t(s, e(l)), !1;
          break;
        case "iconURL":
          if (!Zr(f)) return t(s, "".concat(l, " should be a url")), !1;
          break;
        case "src":
          if ("srcdoc" in r[s]) return t(s, "cannot have both src and srcdoc"), !1;
          if (!Zr(f)) return t(s, 'src "'.concat(f, '" is not a valid URL')), !1;
          break;
        case "srcdoc":
          if ("src" in r[s]) return t(s, "cannot have both src and srcdoc"), !1;
          if (typeof f != "string") return t(s, e(l)), !1;
          break;
        case "location":
          if (!["main", "sidebar"].includes(f)) return t(s, e(l)), !1;
          break;
        case "controlledBy":
          if (f !== "*" && f !== "owners" && (!Array.isArray(f) || f.some(function(p) {
            return typeof p != "string";
          }))) return t(s, e(l)), !1;
          break;
        case "shared":
          if ((!Array.isArray(f) || f.some(function(p) {
            return typeof p != "string";
          })) && f !== "owners" && typeof f != "boolean") return t(s, e(l)), !1;
          break;
        default:
          if (!_a.id[l]) return console.error("customIntegration does not support key ".concat(l)), !1;
      }
    }
  }
  return !0;
}
function Lh(r, e) {
  if (e === void 0) return !1;
  switch (te(e)) {
    case "string":
      return te(r) === e;
    case "object":
      if (te(r) !== "object") return !1;
      for (var t in r) if (!Lh(r[t], e[t])) return !1;
      return !0;
    default:
      return !1;
  }
}
function du(r, e) {
  var t = r.sessionId, n = r.toEndPoint, i = r.callerId, s = r.useSipRefer;
  if (!t || !n) throw new Error("".concat(e, "() requires a sessionId and toEndPoint"));
  if (typeof t != "string" || typeof n != "string") throw new Error("Invalid paramater: sessionId and toEndPoint must be of type string");
  if (s && !n.startsWith("sip:")) throw new Error('"toEndPoint" must be a "sip" address');
  if (!n.startsWith("sip:") && !n.startsWith("+")) throw new Error("toEndPoint: ".concat(n, ' must starts with either "sip:" or "+"'));
  if (i && typeof i != "string") throw new Error("callerId must be of type string");
  if (i && !n.startsWith("+")) throw new Error("callerId is only valid when transferring to a PSTN number");
}
function hu(r) {
  if (te(r) !== "object") throw new Error('RemoteMediaPlayerSettings: must be "object" type');
  if (r.state && !Object.values(pa).includes(r.state)) throw new Error("Invalid value for RemoteMediaPlayerSettings.state, valid values are: " + JSON.stringify(pa));
  if (r.volume) {
    if (typeof r.volume != "number") throw new Error('RemoteMediaPlayerSettings.volume: must be "number" type');
    if (r.volume < 0 || r.volume > 2) throw new Error("RemoteMediaPlayerSettings.volume: must be between 0.0 - 2.0");
  }
}
function fu(r, e, t) {
  return !(typeof r != "number" || r < e || r > t);
}
function Gn(r, e) {
  return r && !e && delete r.data, r;
}
var Jn, pu;
function Fm() {
  if (pu) return Jn;
  pu = 1;
  function r() {
    this.__data__ = [], this.size = 0;
  }
  return Jn = r, Jn;
}
var Hn, gu;
function Rh() {
  if (gu) return Hn;
  gu = 1;
  function r(e, t) {
    return e === t || e !== e && t !== t;
  }
  return Hn = r, Hn;
}
var Kn, mu;
function vn() {
  if (mu) return Kn;
  mu = 1;
  var r = Rh();
  function e(t, n) {
    for (var i = t.length; i--; )
      if (r(t[i][0], n))
        return i;
    return -1;
  }
  return Kn = e, Kn;
}
var Qn, vu;
function Nm() {
  if (vu) return Qn;
  vu = 1;
  var r = vn(), e = Array.prototype, t = e.splice;
  function n(i) {
    var s = this.__data__, a = r(s, i);
    if (a < 0)
      return !1;
    var c = s.length - 1;
    return a == c ? s.pop() : t.call(s, a, 1), --this.size, !0;
  }
  return Qn = n, Qn;
}
var Yn, bu;
function $m() {
  if (bu) return Yn;
  bu = 1;
  var r = vn();
  function e(t) {
    var n = this.__data__, i = r(n, t);
    return i < 0 ? void 0 : n[i][1];
  }
  return Yn = e, Yn;
}
var Xn, yu;
function qm() {
  if (yu) return Xn;
  yu = 1;
  var r = vn();
  function e(t) {
    return r(this.__data__, t) > -1;
  }
  return Xn = e, Xn;
}
var Zn, _u;
function Um() {
  if (_u) return Zn;
  _u = 1;
  var r = vn();
  function e(t, n) {
    var i = this.__data__, s = r(i, t);
    return s < 0 ? (++this.size, i.push([t, n])) : i[s][1] = n, this;
  }
  return Zn = e, Zn;
}
var ei, wu;
function bn() {
  if (wu) return ei;
  wu = 1;
  var r = Fm(), e = Nm(), t = $m(), n = qm(), i = Um();
  function s(a) {
    var c = -1, u = a == null ? 0 : a.length;
    for (this.clear(); ++c < u; ) {
      var l = a[c];
      this.set(l[0], l[1]);
    }
  }
  return s.prototype.clear = r, s.prototype.delete = e, s.prototype.get = t, s.prototype.has = n, s.prototype.set = i, ei = s, ei;
}
var ti, Su;
function Vm() {
  if (Su) return ti;
  Su = 1;
  var r = bn();
  function e() {
    this.__data__ = new r(), this.size = 0;
  }
  return ti = e, ti;
}
var ri, ku;
function zm() {
  if (ku) return ri;
  ku = 1;
  function r(e) {
    var t = this.__data__, n = t.delete(e);
    return this.size = t.size, n;
  }
  return ri = r, ri;
}
var ni, Mu;
function Wm() {
  if (Mu) return ni;
  Mu = 1;
  function r(e) {
    return this.__data__.get(e);
  }
  return ni = r, ni;
}
var ii, Cu;
function Gm() {
  if (Cu) return ii;
  Cu = 1;
  function r(e) {
    return this.__data__.has(e);
  }
  return ii = r, ii;
}
var si, Eu;
function jh() {
  if (Eu) return si;
  Eu = 1;
  var r = typeof Ar == "object" && Ar && Ar.Object === Object && Ar;
  return si = r, si;
}
var ai, Au;
function He() {
  if (Au) return ai;
  Au = 1;
  var r = jh(), e = typeof self == "object" && self && self.Object === Object && self, t = r || e || Function("return this")();
  return ai = t, ai;
}
var oi, Tu;
function Ja() {
  if (Tu) return oi;
  Tu = 1;
  var r = He(), e = r.Symbol;
  return oi = e, oi;
}
var ci, Ou;
function Jm() {
  if (Ou) return ci;
  Ou = 1;
  var r = Ja(), e = Object.prototype, t = e.hasOwnProperty, n = e.toString, i = r ? r.toStringTag : void 0;
  function s(a) {
    var c = t.call(a, i), u = a[i];
    try {
      a[i] = void 0;
      var l = !0;
    } catch {
    }
    var f = n.call(a);
    return l && (c ? a[i] = u : delete a[i]), f;
  }
  return ci = s, ci;
}
var ui, Pu;
function Hm() {
  if (Pu) return ui;
  Pu = 1;
  var r = Object.prototype, e = r.toString;
  function t(n) {
    return e.call(n);
  }
  return ui = t, ui;
}
var li, xu;
function yn() {
  if (xu) return li;
  xu = 1;
  var r = Ja(), e = Jm(), t = Hm(), n = "[object Null]", i = "[object Undefined]", s = r ? r.toStringTag : void 0;
  function a(c) {
    return c == null ? c === void 0 ? i : n : s && s in Object(c) ? e(c) : t(c);
  }
  return li = a, li;
}
var di, Iu;
function br() {
  if (Iu) return di;
  Iu = 1;
  function r(e) {
    var t = typeof e;
    return e != null && (t == "object" || t == "function");
  }
  return di = r, di;
}
var hi, Lu;
function Dh() {
  if (Lu) return hi;
  Lu = 1;
  var r = yn(), e = br(), t = "[object AsyncFunction]", n = "[object Function]", i = "[object GeneratorFunction]", s = "[object Proxy]";
  function a(c) {
    if (!e(c))
      return !1;
    var u = r(c);
    return u == n || u == i || u == t || u == s;
  }
  return hi = a, hi;
}
var fi, Ru;
function Km() {
  if (Ru) return fi;
  Ru = 1;
  var r = He(), e = r["__core-js_shared__"];
  return fi = e, fi;
}
var pi, ju;
function Qm() {
  if (ju) return pi;
  ju = 1;
  var r = Km(), e = (function() {
    var n = /[^.]+$/.exec(r && r.keys && r.keys.IE_PROTO || "");
    return n ? "Symbol(src)_1." + n : "";
  })();
  function t(n) {
    return !!e && e in n;
  }
  return pi = t, pi;
}
var gi, Du;
function Bh() {
  if (Du) return gi;
  Du = 1;
  var r = Function.prototype, e = r.toString;
  function t(n) {
    if (n != null) {
      try {
        return e.call(n);
      } catch {
      }
      try {
        return n + "";
      } catch {
      }
    }
    return "";
  }
  return gi = t, gi;
}
var mi, Bu;
function Ym() {
  if (Bu) return mi;
  Bu = 1;
  var r = Dh(), e = Qm(), t = br(), n = Bh(), i = /[\\^$.*+?()[\]{}|]/g, s = /^\[object .+?Constructor\]$/, a = Function.prototype, c = Object.prototype, u = a.toString, l = c.hasOwnProperty, f = RegExp(
    "^" + u.call(l).replace(i, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
  );
  function p(y) {
    if (!t(y) || e(y))
      return !1;
    var M = r(y) ? f : s;
    return M.test(n(y));
  }
  return mi = p, mi;
}
var vi, Fu;
function Xm() {
  if (Fu) return vi;
  Fu = 1;
  function r(e, t) {
    return e?.[t];
  }
  return vi = r, vi;
}
var bi, Nu;
function Bt() {
  if (Nu) return bi;
  Nu = 1;
  var r = Ym(), e = Xm();
  function t(n, i) {
    var s = e(n, i);
    return r(s) ? s : void 0;
  }
  return bi = t, bi;
}
var yi, $u;
function Ha() {
  if ($u) return yi;
  $u = 1;
  var r = Bt(), e = He(), t = r(e, "Map");
  return yi = t, yi;
}
var _i, qu;
function _n() {
  if (qu) return _i;
  qu = 1;
  var r = Bt(), e = r(Object, "create");
  return _i = e, _i;
}
var wi, Uu;
function Zm() {
  if (Uu) return wi;
  Uu = 1;
  var r = _n();
  function e() {
    this.__data__ = r ? r(null) : {}, this.size = 0;
  }
  return wi = e, wi;
}
var Si, Vu;
function ev() {
  if (Vu) return Si;
  Vu = 1;
  function r(e) {
    var t = this.has(e) && delete this.__data__[e];
    return this.size -= t ? 1 : 0, t;
  }
  return Si = r, Si;
}
var ki, zu;
function tv() {
  if (zu) return ki;
  zu = 1;
  var r = _n(), e = "__lodash_hash_undefined__", t = Object.prototype, n = t.hasOwnProperty;
  function i(s) {
    var a = this.__data__;
    if (r) {
      var c = a[s];
      return c === e ? void 0 : c;
    }
    return n.call(a, s) ? a[s] : void 0;
  }
  return ki = i, ki;
}
var Mi, Wu;
function rv() {
  if (Wu) return Mi;
  Wu = 1;
  var r = _n(), e = Object.prototype, t = e.hasOwnProperty;
  function n(i) {
    var s = this.__data__;
    return r ? s[i] !== void 0 : t.call(s, i);
  }
  return Mi = n, Mi;
}
var Ci, Gu;
function nv() {
  if (Gu) return Ci;
  Gu = 1;
  var r = _n(), e = "__lodash_hash_undefined__";
  function t(n, i) {
    var s = this.__data__;
    return this.size += this.has(n) ? 0 : 1, s[n] = r && i === void 0 ? e : i, this;
  }
  return Ci = t, Ci;
}
var Ei, Ju;
function iv() {
  if (Ju) return Ei;
  Ju = 1;
  var r = Zm(), e = ev(), t = tv(), n = rv(), i = nv();
  function s(a) {
    var c = -1, u = a == null ? 0 : a.length;
    for (this.clear(); ++c < u; ) {
      var l = a[c];
      this.set(l[0], l[1]);
    }
  }
  return s.prototype.clear = r, s.prototype.delete = e, s.prototype.get = t, s.prototype.has = n, s.prototype.set = i, Ei = s, Ei;
}
var Ai, Hu;
function sv() {
  if (Hu) return Ai;
  Hu = 1;
  var r = iv(), e = bn(), t = Ha();
  function n() {
    this.size = 0, this.__data__ = {
      hash: new r(),
      map: new (t || e)(),
      string: new r()
    };
  }
  return Ai = n, Ai;
}
var Ti, Ku;
function av() {
  if (Ku) return Ti;
  Ku = 1;
  function r(e) {
    var t = typeof e;
    return t == "string" || t == "number" || t == "symbol" || t == "boolean" ? e !== "__proto__" : e === null;
  }
  return Ti = r, Ti;
}
var Oi, Qu;
function wn() {
  if (Qu) return Oi;
  Qu = 1;
  var r = av();
  function e(t, n) {
    var i = t.__data__;
    return r(n) ? i[typeof n == "string" ? "string" : "hash"] : i.map;
  }
  return Oi = e, Oi;
}
var Pi, Yu;
function ov() {
  if (Yu) return Pi;
  Yu = 1;
  var r = wn();
  function e(t) {
    var n = r(this, t).delete(t);
    return this.size -= n ? 1 : 0, n;
  }
  return Pi = e, Pi;
}
var xi, Xu;
function cv() {
  if (Xu) return xi;
  Xu = 1;
  var r = wn();
  function e(t) {
    return r(this, t).get(t);
  }
  return xi = e, xi;
}
var Ii, Zu;
function uv() {
  if (Zu) return Ii;
  Zu = 1;
  var r = wn();
  function e(t) {
    return r(this, t).has(t);
  }
  return Ii = e, Ii;
}
var Li, el;
function lv() {
  if (el) return Li;
  el = 1;
  var r = wn();
  function e(t, n) {
    var i = r(this, t), s = i.size;
    return i.set(t, n), this.size += i.size == s ? 0 : 1, this;
  }
  return Li = e, Li;
}
var Ri, tl;
function dv() {
  if (tl) return Ri;
  tl = 1;
  var r = sv(), e = ov(), t = cv(), n = uv(), i = lv();
  function s(a) {
    var c = -1, u = a == null ? 0 : a.length;
    for (this.clear(); ++c < u; ) {
      var l = a[c];
      this.set(l[0], l[1]);
    }
  }
  return s.prototype.clear = r, s.prototype.delete = e, s.prototype.get = t, s.prototype.has = n, s.prototype.set = i, Ri = s, Ri;
}
var ji, rl;
function hv() {
  if (rl) return ji;
  rl = 1;
  var r = bn(), e = Ha(), t = dv(), n = 200;
  function i(s, a) {
    var c = this.__data__;
    if (c instanceof r) {
      var u = c.__data__;
      if (!e || u.length < n - 1)
        return u.push([s, a]), this.size = ++c.size, this;
      c = this.__data__ = new t(u);
    }
    return c.set(s, a), this.size = c.size, this;
  }
  return ji = i, ji;
}
var Di, nl;
function fv() {
  if (nl) return Di;
  nl = 1;
  var r = bn(), e = Vm(), t = zm(), n = Wm(), i = Gm(), s = hv();
  function a(c) {
    var u = this.__data__ = new r(c);
    this.size = u.size;
  }
  return a.prototype.clear = e, a.prototype.delete = t, a.prototype.get = n, a.prototype.has = i, a.prototype.set = s, Di = a, Di;
}
var Bi, il;
function pv() {
  if (il) return Bi;
  il = 1;
  function r(e, t) {
    for (var n = -1, i = e == null ? 0 : e.length; ++n < i && t(e[n], n, e) !== !1; )
      ;
    return e;
  }
  return Bi = r, Bi;
}
var Fi, sl;
function gv() {
  if (sl) return Fi;
  sl = 1;
  var r = Bt(), e = (function() {
    try {
      var t = r(Object, "defineProperty");
      return t({}, "", {}), t;
    } catch {
    }
  })();
  return Fi = e, Fi;
}
var Ni, al;
function Fh() {
  if (al) return Ni;
  al = 1;
  var r = gv();
  function e(t, n, i) {
    n == "__proto__" && r ? r(t, n, {
      configurable: !0,
      enumerable: !0,
      value: i,
      writable: !0
    }) : t[n] = i;
  }
  return Ni = e, Ni;
}
var $i, ol;
function Nh() {
  if (ol) return $i;
  ol = 1;
  var r = Fh(), e = Rh(), t = Object.prototype, n = t.hasOwnProperty;
  function i(s, a, c) {
    var u = s[a];
    (!(n.call(s, a) && e(u, c)) || c === void 0 && !(a in s)) && r(s, a, c);
  }
  return $i = i, $i;
}
var qi, cl;
function Sn() {
  if (cl) return qi;
  cl = 1;
  var r = Nh(), e = Fh();
  function t(n, i, s, a) {
    var c = !s;
    s || (s = {});
    for (var u = -1, l = i.length; ++u < l; ) {
      var f = i[u], p = a ? a(s[f], n[f], f, s, n) : void 0;
      p === void 0 && (p = n[f]), c ? e(s, f, p) : r(s, f, p);
    }
    return s;
  }
  return qi = t, qi;
}
var Ui, ul;
function mv() {
  if (ul) return Ui;
  ul = 1;
  function r(e, t) {
    for (var n = -1, i = Array(e); ++n < e; )
      i[n] = t(n);
    return i;
  }
  return Ui = r, Ui;
}
var Vi, ll;
function yr() {
  if (ll) return Vi;
  ll = 1;
  function r(e) {
    return e != null && typeof e == "object";
  }
  return Vi = r, Vi;
}
var zi, dl;
function vv() {
  if (dl) return zi;
  dl = 1;
  var r = yn(), e = yr(), t = "[object Arguments]";
  function n(i) {
    return e(i) && r(i) == t;
  }
  return zi = n, zi;
}
var Wi, hl;
function bv() {
  if (hl) return Wi;
  hl = 1;
  var r = vv(), e = yr(), t = Object.prototype, n = t.hasOwnProperty, i = t.propertyIsEnumerable, s = r(/* @__PURE__ */ (function() {
    return arguments;
  })()) ? r : function(a) {
    return e(a) && n.call(a, "callee") && !i.call(a, "callee");
  };
  return Wi = s, Wi;
}
var Gi, fl;
function Ka() {
  if (fl) return Gi;
  fl = 1;
  var r = Array.isArray;
  return Gi = r, Gi;
}
var cr = { exports: {} }, Ji, pl;
function yv() {
  if (pl) return Ji;
  pl = 1;
  function r() {
    return !1;
  }
  return Ji = r, Ji;
}
cr.exports;
var gl;
function $h() {
  return gl || (gl = 1, (function(r, e) {
    var t = He(), n = yv(), i = e && !e.nodeType && e, s = i && !0 && r && !r.nodeType && r, a = s && s.exports === i, c = a ? t.Buffer : void 0, u = c ? c.isBuffer : void 0, l = u || n;
    r.exports = l;
  })(cr, cr.exports)), cr.exports;
}
var Hi, ml;
function _v() {
  if (ml) return Hi;
  ml = 1;
  var r = 9007199254740991, e = /^(?:0|[1-9]\d*)$/;
  function t(n, i) {
    var s = typeof n;
    return i = i ?? r, !!i && (s == "number" || s != "symbol" && e.test(n)) && n > -1 && n % 1 == 0 && n < i;
  }
  return Hi = t, Hi;
}
var Ki, vl;
function qh() {
  if (vl) return Ki;
  vl = 1;
  var r = 9007199254740991;
  function e(t) {
    return typeof t == "number" && t > -1 && t % 1 == 0 && t <= r;
  }
  return Ki = e, Ki;
}
var Qi, bl;
function wv() {
  if (bl) return Qi;
  bl = 1;
  var r = yn(), e = qh(), t = yr(), n = "[object Arguments]", i = "[object Array]", s = "[object Boolean]", a = "[object Date]", c = "[object Error]", u = "[object Function]", l = "[object Map]", f = "[object Number]", p = "[object Object]", y = "[object RegExp]", M = "[object Set]", b = "[object String]", v = "[object WeakMap]", C = "[object ArrayBuffer]", E = "[object DataView]", O = "[object Float32Array]", I = "[object Float64Array]", k = "[object Int8Array]", S = "[object Int16Array]", T = "[object Int32Array]", L = "[object Uint8Array]", D = "[object Uint8ClampedArray]", N = "[object Uint16Array]", $ = "[object Uint32Array]", U = {};
  U[O] = U[I] = U[k] = U[S] = U[T] = U[L] = U[D] = U[N] = U[$] = !0, U[n] = U[i] = U[C] = U[s] = U[E] = U[a] = U[c] = U[u] = U[l] = U[f] = U[p] = U[y] = U[M] = U[b] = U[v] = !1;
  function de(Le) {
    return t(Le) && e(Le.length) && !!U[r(Le)];
  }
  return Qi = de, Qi;
}
var Yi, yl;
function Qa() {
  if (yl) return Yi;
  yl = 1;
  function r(e) {
    return function(t) {
      return e(t);
    };
  }
  return Yi = r, Yi;
}
var ur = { exports: {} };
ur.exports;
var _l;
function Ya() {
  return _l || (_l = 1, (function(r, e) {
    var t = jh(), n = e && !e.nodeType && e, i = n && !0 && r && !r.nodeType && r, s = i && i.exports === n, a = s && t.process, c = (function() {
      try {
        var u = i && i.require && i.require("util").types;
        return u || a && a.binding && a.binding("util");
      } catch {
      }
    })();
    r.exports = c;
  })(ur, ur.exports)), ur.exports;
}
var Xi, wl;
function Sv() {
  if (wl) return Xi;
  wl = 1;
  var r = wv(), e = Qa(), t = Ya(), n = t && t.isTypedArray, i = n ? e(n) : r;
  return Xi = i, Xi;
}
var Zi, Sl;
function Uh() {
  if (Sl) return Zi;
  Sl = 1;
  var r = mv(), e = bv(), t = Ka(), n = $h(), i = _v(), s = Sv(), a = Object.prototype, c = a.hasOwnProperty;
  function u(l, f) {
    var p = t(l), y = !p && e(l), M = !p && !y && n(l), b = !p && !y && !M && s(l), v = p || y || M || b, C = v ? r(l.length, String) : [], E = C.length;
    for (var O in l)
      (f || c.call(l, O)) && !(v && // Safari 9 has enumerable `arguments.length` in strict mode.
      (O == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
      M && (O == "offset" || O == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
      b && (O == "buffer" || O == "byteLength" || O == "byteOffset") || // Skip index properties.
      i(O, E))) && C.push(O);
    return C;
  }
  return Zi = u, Zi;
}
var es, kl;
function Xa() {
  if (kl) return es;
  kl = 1;
  var r = Object.prototype;
  function e(t) {
    var n = t && t.constructor, i = typeof n == "function" && n.prototype || r;
    return t === i;
  }
  return es = e, es;
}
var ts, Ml;
function Vh() {
  if (Ml) return ts;
  Ml = 1;
  function r(e, t) {
    return function(n) {
      return e(t(n));
    };
  }
  return ts = r, ts;
}
var rs, Cl;
function kv() {
  if (Cl) return rs;
  Cl = 1;
  var r = Vh(), e = r(Object.keys, Object);
  return rs = e, rs;
}
var ns, El;
function Mv() {
  if (El) return ns;
  El = 1;
  var r = Xa(), e = kv(), t = Object.prototype, n = t.hasOwnProperty;
  function i(s) {
    if (!r(s))
      return e(s);
    var a = [];
    for (var c in Object(s))
      n.call(s, c) && c != "constructor" && a.push(c);
    return a;
  }
  return ns = i, ns;
}
var is, Al;
function zh() {
  if (Al) return is;
  Al = 1;
  var r = Dh(), e = qh();
  function t(n) {
    return n != null && e(n.length) && !r(n);
  }
  return is = t, is;
}
var ss, Tl;
function Za() {
  if (Tl) return ss;
  Tl = 1;
  var r = Uh(), e = Mv(), t = zh();
  function n(i) {
    return t(i) ? r(i) : e(i);
  }
  return ss = n, ss;
}
var as, Ol;
function Cv() {
  if (Ol) return as;
  Ol = 1;
  var r = Sn(), e = Za();
  function t(n, i) {
    return n && r(i, e(i), n);
  }
  return as = t, as;
}
var os, Pl;
function Ev() {
  if (Pl) return os;
  Pl = 1;
  function r(e) {
    var t = [];
    if (e != null)
      for (var n in Object(e))
        t.push(n);
    return t;
  }
  return os = r, os;
}
var cs, xl;
function Av() {
  if (xl) return cs;
  xl = 1;
  var r = br(), e = Xa(), t = Ev(), n = Object.prototype, i = n.hasOwnProperty;
  function s(a) {
    if (!r(a))
      return t(a);
    var c = e(a), u = [];
    for (var l in a)
      l == "constructor" && (c || !i.call(a, l)) || u.push(l);
    return u;
  }
  return cs = s, cs;
}
var us, Il;
function eo() {
  if (Il) return us;
  Il = 1;
  var r = Uh(), e = Av(), t = zh();
  function n(i) {
    return t(i) ? r(i, !0) : e(i);
  }
  return us = n, us;
}
var ls, Ll;
function Tv() {
  if (Ll) return ls;
  Ll = 1;
  var r = Sn(), e = eo();
  function t(n, i) {
    return n && r(i, e(i), n);
  }
  return ls = t, ls;
}
var lr = { exports: {} };
lr.exports;
var Rl;
function Ov() {
  return Rl || (Rl = 1, (function(r, e) {
    var t = He(), n = e && !e.nodeType && e, i = n && !0 && r && !r.nodeType && r, s = i && i.exports === n, a = s ? t.Buffer : void 0, c = a ? a.allocUnsafe : void 0;
    function u(l, f) {
      if (f)
        return l.slice();
      var p = l.length, y = c ? c(p) : new l.constructor(p);
      return l.copy(y), y;
    }
    r.exports = u;
  })(lr, lr.exports)), lr.exports;
}
var ds, jl;
function Pv() {
  if (jl) return ds;
  jl = 1;
  function r(e, t) {
    var n = -1, i = e.length;
    for (t || (t = Array(i)); ++n < i; )
      t[n] = e[n];
    return t;
  }
  return ds = r, ds;
}
var hs, Dl;
function xv() {
  if (Dl) return hs;
  Dl = 1;
  function r(e, t) {
    for (var n = -1, i = e == null ? 0 : e.length, s = 0, a = []; ++n < i; ) {
      var c = e[n];
      t(c, n, e) && (a[s++] = c);
    }
    return a;
  }
  return hs = r, hs;
}
var fs, Bl;
function Wh() {
  if (Bl) return fs;
  Bl = 1;
  function r() {
    return [];
  }
  return fs = r, fs;
}
var ps, Fl;
function to() {
  if (Fl) return ps;
  Fl = 1;
  var r = xv(), e = Wh(), t = Object.prototype, n = t.propertyIsEnumerable, i = Object.getOwnPropertySymbols, s = i ? function(a) {
    return a == null ? [] : (a = Object(a), r(i(a), function(c) {
      return n.call(a, c);
    }));
  } : e;
  return ps = s, ps;
}
var gs, Nl;
function Iv() {
  if (Nl) return gs;
  Nl = 1;
  var r = Sn(), e = to();
  function t(n, i) {
    return r(n, e(n), i);
  }
  return gs = t, gs;
}
var ms, $l;
function Gh() {
  if ($l) return ms;
  $l = 1;
  function r(e, t) {
    for (var n = -1, i = t.length, s = e.length; ++n < i; )
      e[s + n] = t[n];
    return e;
  }
  return ms = r, ms;
}
var vs, ql;
function Jh() {
  if (ql) return vs;
  ql = 1;
  var r = Vh(), e = r(Object.getPrototypeOf, Object);
  return vs = e, vs;
}
var bs, Ul;
function Hh() {
  if (Ul) return bs;
  Ul = 1;
  var r = Gh(), e = Jh(), t = to(), n = Wh(), i = Object.getOwnPropertySymbols, s = i ? function(a) {
    for (var c = []; a; )
      r(c, t(a)), a = e(a);
    return c;
  } : n;
  return bs = s, bs;
}
var ys, Vl;
function Lv() {
  if (Vl) return ys;
  Vl = 1;
  var r = Sn(), e = Hh();
  function t(n, i) {
    return r(n, e(n), i);
  }
  return ys = t, ys;
}
var _s, zl;
function Kh() {
  if (zl) return _s;
  zl = 1;
  var r = Gh(), e = Ka();
  function t(n, i, s) {
    var a = i(n);
    return e(n) ? a : r(a, s(n));
  }
  return _s = t, _s;
}
var ws, Wl;
function Rv() {
  if (Wl) return ws;
  Wl = 1;
  var r = Kh(), e = to(), t = Za();
  function n(i) {
    return r(i, t, e);
  }
  return ws = n, ws;
}
var Ss, Gl;
function jv() {
  if (Gl) return Ss;
  Gl = 1;
  var r = Kh(), e = Hh(), t = eo();
  function n(i) {
    return r(i, t, e);
  }
  return Ss = n, Ss;
}
var ks, Jl;
function Dv() {
  if (Jl) return ks;
  Jl = 1;
  var r = Bt(), e = He(), t = r(e, "DataView");
  return ks = t, ks;
}
var Ms, Hl;
function Bv() {
  if (Hl) return Ms;
  Hl = 1;
  var r = Bt(), e = He(), t = r(e, "Promise");
  return Ms = t, Ms;
}
var Cs, Kl;
function Fv() {
  if (Kl) return Cs;
  Kl = 1;
  var r = Bt(), e = He(), t = r(e, "Set");
  return Cs = t, Cs;
}
var Es, Ql;
function Nv() {
  if (Ql) return Es;
  Ql = 1;
  var r = Bt(), e = He(), t = r(e, "WeakMap");
  return Es = t, Es;
}
var As, Yl;
function ro() {
  if (Yl) return As;
  Yl = 1;
  var r = Dv(), e = Ha(), t = Bv(), n = Fv(), i = Nv(), s = yn(), a = Bh(), c = "[object Map]", u = "[object Object]", l = "[object Promise]", f = "[object Set]", p = "[object WeakMap]", y = "[object DataView]", M = a(r), b = a(e), v = a(t), C = a(n), E = a(i), O = s;
  return (r && O(new r(new ArrayBuffer(1))) != y || e && O(new e()) != c || t && O(t.resolve()) != l || n && O(new n()) != f || i && O(new i()) != p) && (O = function(I) {
    var k = s(I), S = k == u ? I.constructor : void 0, T = S ? a(S) : "";
    if (T)
      switch (T) {
        case M:
          return y;
        case b:
          return c;
        case v:
          return l;
        case C:
          return f;
        case E:
          return p;
      }
    return k;
  }), As = O, As;
}
var Ts, Xl;
function $v() {
  if (Xl) return Ts;
  Xl = 1;
  var r = Object.prototype, e = r.hasOwnProperty;
  function t(n) {
    var i = n.length, s = new n.constructor(i);
    return i && typeof n[0] == "string" && e.call(n, "index") && (s.index = n.index, s.input = n.input), s;
  }
  return Ts = t, Ts;
}
var Os, Zl;
function qv() {
  if (Zl) return Os;
  Zl = 1;
  var r = He(), e = r.Uint8Array;
  return Os = e, Os;
}
var Ps, ed;
function no() {
  if (ed) return Ps;
  ed = 1;
  var r = qv();
  function e(t) {
    var n = new t.constructor(t.byteLength);
    return new r(n).set(new r(t)), n;
  }
  return Ps = e, Ps;
}
var xs, td;
function Uv() {
  if (td) return xs;
  td = 1;
  var r = no();
  function e(t, n) {
    var i = n ? r(t.buffer) : t.buffer;
    return new t.constructor(i, t.byteOffset, t.byteLength);
  }
  return xs = e, xs;
}
var Is, rd;
function Vv() {
  if (rd) return Is;
  rd = 1;
  var r = /\w*$/;
  function e(t) {
    var n = new t.constructor(t.source, r.exec(t));
    return n.lastIndex = t.lastIndex, n;
  }
  return Is = e, Is;
}
var Ls, nd;
function zv() {
  if (nd) return Ls;
  nd = 1;
  var r = Ja(), e = r ? r.prototype : void 0, t = e ? e.valueOf : void 0;
  function n(i) {
    return t ? Object(t.call(i)) : {};
  }
  return Ls = n, Ls;
}
var Rs, id;
function Wv() {
  if (id) return Rs;
  id = 1;
  var r = no();
  function e(t, n) {
    var i = n ? r(t.buffer) : t.buffer;
    return new t.constructor(i, t.byteOffset, t.length);
  }
  return Rs = e, Rs;
}
var js, sd;
function Gv() {
  if (sd) return js;
  sd = 1;
  var r = no(), e = Uv(), t = Vv(), n = zv(), i = Wv(), s = "[object Boolean]", a = "[object Date]", c = "[object Map]", u = "[object Number]", l = "[object RegExp]", f = "[object Set]", p = "[object String]", y = "[object Symbol]", M = "[object ArrayBuffer]", b = "[object DataView]", v = "[object Float32Array]", C = "[object Float64Array]", E = "[object Int8Array]", O = "[object Int16Array]", I = "[object Int32Array]", k = "[object Uint8Array]", S = "[object Uint8ClampedArray]", T = "[object Uint16Array]", L = "[object Uint32Array]";
  function D(N, $, U) {
    var de = N.constructor;
    switch ($) {
      case M:
        return r(N);
      case s:
      case a:
        return new de(+N);
      case b:
        return e(N, U);
      case v:
      case C:
      case E:
      case O:
      case I:
      case k:
      case S:
      case T:
      case L:
        return i(N, U);
      case c:
        return new de();
      case u:
      case p:
        return new de(N);
      case l:
        return t(N);
      case f:
        return new de();
      case y:
        return n(N);
    }
  }
  return js = D, js;
}
var Ds, ad;
function Jv() {
  if (ad) return Ds;
  ad = 1;
  var r = br(), e = Object.create, t = /* @__PURE__ */ (function() {
    function n() {
    }
    return function(i) {
      if (!r(i))
        return {};
      if (e)
        return e(i);
      n.prototype = i;
      var s = new n();
      return n.prototype = void 0, s;
    };
  })();
  return Ds = t, Ds;
}
var Bs, od;
function Hv() {
  if (od) return Bs;
  od = 1;
  var r = Jv(), e = Jh(), t = Xa();
  function n(i) {
    return typeof i.constructor == "function" && !t(i) ? r(e(i)) : {};
  }
  return Bs = n, Bs;
}
var Fs, cd;
function Kv() {
  if (cd) return Fs;
  cd = 1;
  var r = ro(), e = yr(), t = "[object Map]";
  function n(i) {
    return e(i) && r(i) == t;
  }
  return Fs = n, Fs;
}
var Ns, ud;
function Qv() {
  if (ud) return Ns;
  ud = 1;
  var r = Kv(), e = Qa(), t = Ya(), n = t && t.isMap, i = n ? e(n) : r;
  return Ns = i, Ns;
}
var $s, ld;
function Yv() {
  if (ld) return $s;
  ld = 1;
  var r = ro(), e = yr(), t = "[object Set]";
  function n(i) {
    return e(i) && r(i) == t;
  }
  return $s = n, $s;
}
var qs, dd;
function Xv() {
  if (dd) return qs;
  dd = 1;
  var r = Yv(), e = Qa(), t = Ya(), n = t && t.isSet, i = n ? e(n) : r;
  return qs = i, qs;
}
var Us, hd;
function Zv() {
  if (hd) return Us;
  hd = 1;
  var r = fv(), e = pv(), t = Nh(), n = Cv(), i = Tv(), s = Ov(), a = Pv(), c = Iv(), u = Lv(), l = Rv(), f = jv(), p = ro(), y = $v(), M = Gv(), b = Hv(), v = Ka(), C = $h(), E = Qv(), O = br(), I = Xv(), k = Za(), S = eo(), T = 1, L = 2, D = 4, N = "[object Arguments]", $ = "[object Array]", U = "[object Boolean]", de = "[object Date]", Le = "[object Error]", vt = "[object Function]", _r = "[object GeneratorFunction]", wr = "[object Map]", Sr = "[object Number]", rr = "[object Object]", kr = "[object RegExp]", Mr = "[object Set]", Cr = "[object String]", Er = "[object Symbol]", o = "[object WeakMap]", h = "[object ArrayBuffer]", d = "[object DataView]", g = "[object Float32Array]", m = "[object Float64Array]", A = "[object Int8Array]", P = "[object Int16Array]", x = "[object Int32Array]", j = "[object Uint8Array]", H = "[object Uint8ClampedArray]", Q = "[object Uint16Array]", Ee = "[object Uint32Array]", Y = {};
  Y[N] = Y[$] = Y[h] = Y[d] = Y[U] = Y[de] = Y[g] = Y[m] = Y[A] = Y[P] = Y[x] = Y[wr] = Y[Sr] = Y[rr] = Y[kr] = Y[Mr] = Y[Cr] = Y[Er] = Y[j] = Y[H] = Y[Q] = Y[Ee] = !0, Y[Le] = Y[vt] = Y[o] = !1;
  function Ke(X, se, he, Qe, Ve, Ae) {
    var ce, ze = se & T, Ft = se & L, kn = se & D;
    if (he && (ce = Ve ? he(X, Qe, Ve, Ae) : he(X)), ce !== void 0)
      return ce;
    if (!O(X))
      return X;
    var oo = v(X);
    if (oo) {
      if (ce = y(X), !ze)
        return a(X, ce);
    } else {
      var Nt = p(X), co = Nt == vt || Nt == _r;
      if (C(X))
        return s(X, ze);
      if (Nt == rr || Nt == N || co && !Ve) {
        if (ce = Ft || co ? {} : b(X), !ze)
          return Ft ? u(X, i(ce, X)) : c(X, n(ce, X));
      } else {
        if (!Y[Nt])
          return Ve ? X : {};
        ce = M(X, Nt, ze);
      }
    }
    Ae || (Ae = new r());
    var uo = Ae.get(X);
    if (uo)
      return uo;
    Ae.set(X, ce), I(X) ? X.forEach(function(st) {
      ce.add(Ke(st, se, he, st, X, Ae));
    }) : E(X) && X.forEach(function(st, bt) {
      ce.set(bt, Ke(st, se, he, bt, X, Ae));
    });
    var ef = kn ? Ft ? f : l : Ft ? S : k, lo = oo ? void 0 : ef(X);
    return e(lo || X, function(st, bt) {
      lo && (bt = st, st = X[bt]), t(ce, bt, Ke(st, se, he, bt, X, Ae));
    }), ce;
  }
  return Us = Ke, Us;
}
var Vs, fd;
function eb() {
  if (fd) return Vs;
  fd = 1;
  var r = Zv(), e = 1, t = 4;
  function n(i) {
    return r(i, e | t);
  }
  return Vs = n, Vs;
}
var tb = eb();
const rb = /* @__PURE__ */ wd(tb);
function nb(r, e, t, n) {
  Object.defineProperty(r, e, { get: t, set: n, enumerable: !0, configurable: !0 });
}
class Fe {
  /**
  * Converts Float32Array of amplitude data to ArrayBuffer in Int16Array format
  * @param {Float32Array} float32Array
  * @returns {ArrayBuffer}
  */
  static floatTo16BitPCM(e) {
    const t = new ArrayBuffer(e.length * 2), n = new DataView(t);
    let i = 0;
    for (let s = 0; s < e.length; s++, i += 2) {
      let a = Math.max(-1, Math.min(1, e[s]));
      n.setInt16(i, a < 0 ? a * 32768 : a * 32767, !0);
    }
    return t;
  }
  /**
  * Concatenates two ArrayBuffers
  * @param {ArrayBuffer} leftBuffer
  * @param {ArrayBuffer} rightBuffer
  * @returns {ArrayBuffer}
  */
  static mergeBuffers(e, t) {
    const n = new Uint8Array(e.byteLength + t.byteLength);
    return n.set(new Uint8Array(e), 0), n.set(new Uint8Array(t), e.byteLength), n.buffer;
  }
  /**
  * Packs data into an Int16 format
  * @private
  * @param {number} size 0 = 1x Int16, 1 = 2x Int16
  * @param {number} arg value to pack
  * @returns
  */
  _packData(e, t) {
    return [
      new Uint8Array([
        t,
        t >> 8
      ]),
      new Uint8Array([
        t,
        t >> 8,
        t >> 16,
        t >> 24
      ])
    ][e];
  }
  /**
  * Packs audio into "audio/wav" Blob
  * @param {number} sampleRate
  * @param {{bitsPerSample: number, channels: Array<Float32Array>, data: Int16Array}} audio
  * @returns {WavPackerAudioType}
  */
  pack(e, t) {
    if (t?.bitsPerSample) if (t?.channels) {
      if (!t?.data) throw new Error('Missing "data"');
    } else throw new Error('Missing "channels"');
    else throw new Error('Missing "bitsPerSample"');
    const { bitsPerSample: n, channels: i, data: s } = t, a = [
      // Header
      "RIFF",
      this._packData(1, 52),
      "WAVE",
      // chunk 1
      "fmt ",
      this._packData(1, 16),
      this._packData(0, 1),
      this._packData(0, i.length),
      this._packData(1, e),
      this._packData(1, e * i.length * n / 8),
      this._packData(0, i.length * n / 8),
      this._packData(0, n),
      // chunk 2
      "data",
      this._packData(1, i[0].length * i.length * n / 8),
      s
    ], c = new Blob(a, {
      type: "audio/mpeg"
    }), u = URL.createObjectURL(c);
    return {
      blob: c,
      url: u,
      channelCount: i.length,
      sampleRate: e,
      duration: s.byteLength / (i.length * e * 2)
    };
  }
}
globalThis.WavPacker = Fe;
const pd = [
  4186.01,
  4434.92,
  4698.63,
  4978.03,
  5274.04,
  5587.65,
  5919.91,
  6271.93,
  6644.88,
  7040,
  7458.62,
  7902.13
], ib = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
], ft = [], io = [];
for (let r = 1; r <= 8; r++) for (let e = 0; e < pd.length; e++) {
  const t = pd[e];
  ft.push(t / Math.pow(2, 8 - r)), io.push(ib[e] + r);
}
const cn = [
  32,
  2e3
], gd = ft.filter((r, e) => ft[e] > cn[0] && ft[e] < cn[1]), sb = io.filter((r, e) => ft[e] > cn[0] && ft[e] < cn[1]);
class tr {
  /**
  * Retrieves frequency domain data from an AnalyserNode adjusted to a decibel range
  * returns human-readable formatting and labels
  * @param {AnalyserNode} analyser
  * @param {number} sampleRate
  * @param {Float32Array} [fftResult]
  * @param {"frequency"|"music"|"voice"} [analysisType]
  * @param {number} [minDecibels] default -100
  * @param {number} [maxDecibels] default -30
  * @returns {AudioAnalysisOutputType}
  */
  static getFrequencies(e, t, n, i = "frequency", s = -100, a = -30) {
    n || (n = new Float32Array(e.frequencyBinCount), e.getFloatFrequencyData(n));
    const c = t / 2, u = 1 / n.length * c;
    let l, f, p;
    if (i === "music" || i === "voice") {
      const b = i === "voice" ? gd : ft, v = Array(b.length).fill(s);
      for (let C = 0; C < n.length; C++) {
        const E = C * u, O = n[C];
        for (let I = b.length - 1; I >= 0; I--) if (E > b[I]) {
          v[I] = Math.max(v[I], O);
          break;
        }
      }
      l = v, f = i === "voice" ? gd : ft, p = i === "voice" ? sb : io;
    } else
      l = Array.from(n), f = l.map((b, v) => u * v), p = f.map((b) => `${b.toFixed(2)} Hz`);
    const y = l.map((b) => Math.max(0, Math.min((b - s) / (a - s), 1)));
    return {
      values: new Float32Array(y),
      frequencies: f,
      labels: p
    };
  }
  /**
  * Creates a new AudioAnalysis instance for an HTMLAudioElement
  * @param {HTMLAudioElement} audioElement
  * @param {AudioBuffer|null} [audioBuffer] If provided, will cache all frequency domain data from the buffer
  * @returns {AudioAnalysis}
  */
  constructor(e, t = null) {
    if (this.fftResults = [], t) {
      const { length: n, sampleRate: i } = t, s = new OfflineAudioContext({
        length: n,
        sampleRate: i
      }), a = s.createBufferSource();
      a.buffer = t;
      const c = s.createAnalyser();
      c.fftSize = 8192, c.smoothingTimeConstant = 0.1, a.connect(c);
      const u = 1 / 60, l = n / i, f = (p) => {
        const y = u * p;
        y < l && s.suspend(y).then(() => {
          const M = new Float32Array(c.frequencyBinCount);
          c.getFloatFrequencyData(M), this.fftResults.push(M), f(p + 1);
        }), p === 1 ? s.startRendering() : s.resume();
      };
      a.start(0), f(1), this.audio = e, this.context = s, this.analyser = c, this.sampleRate = i, this.audioBuffer = t;
    } else {
      const n = new AudioContext(), i = n.createMediaElementSource(e), s = n.createAnalyser();
      s.fftSize = 8192, s.smoothingTimeConstant = 0.1, i.connect(s), s.connect(n.destination), this.audio = e, this.context = n, this.analyser = s, this.sampleRate = this.context.sampleRate, this.audioBuffer = null;
    }
  }
  /**
  * Gets the current frequency domain data from the playing audio track
  * @param {"frequency"|"music"|"voice"} [analysisType]
  * @param {number} [minDecibels] default -100
  * @param {number} [maxDecibels] default -30
  * @returns {AudioAnalysisOutputType}
  */
  getFrequencies(e = "frequency", t = -100, n = -30) {
    let i = null;
    if (this.audioBuffer && this.fftResults.length) {
      const s = this.audio.currentTime / this.audio.duration, a = Math.min(s * this.fftResults.length | 0, this.fftResults.length - 1);
      i = this.fftResults[a];
    }
    return tr.getFrequencies(this.analyser, this.sampleRate, i, e, t, n);
  }
  /**
  * Resume the internal AudioContext if it was suspended due to the lack of
  * user interaction when the AudioAnalysis was instantiated.
  * @returns {Promise<true>}
  */
  async resumeIfSuspended() {
    return this.context.state === "suspended" && await this.context.resume(), !0;
  }
}
globalThis.AudioAnalysis = tr;
const ab = `
class StreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.hasStarted = false;
    this.hasInterrupted = false;
    this.outputBuffers = [];
    this.bufferLength = 128;
    this.write = { buffer: new Float32Array(this.bufferLength), trackId: null };
    this.writeOffset = 0;
    this.trackSampleOffsets = {};
    this.port.onmessage = (event) => {
      if (event.data) {
        const payload = event.data;
        if (payload.event === 'write') {
          const int16Array = payload.buffer;
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x8000; // Convert Int16 to Float32
          }
          this.writeData(float32Array, payload.trackId);
        } else if (
          payload.event === 'offset' ||
          payload.event === 'interrupt'
        ) {
          const requestId = payload.requestId;
          const trackId = this.write.trackId;
          const offset = this.trackSampleOffsets[trackId] || 0;
          this.port.postMessage({
            event: 'offset',
            requestId,
            trackId,
            offset,
          });
          if (payload.event === 'interrupt') {
            this.hasInterrupted = true;
          }
        } else {
          throw new Error(\`Unhandled event "\${payload.event}"\`);
        }
      }
    };
  }

  writeData(float32Array, trackId = null) {
    let { buffer } = this.write;
    let offset = this.writeOffset;
    for (let i = 0; i < float32Array.length; i++) {
      buffer[offset++] = float32Array[i];
      if (offset >= buffer.length) {
        this.outputBuffers.push(this.write);
        this.write = { buffer: new Float32Array(this.bufferLength), trackId };
        buffer = this.write.buffer;
        offset = 0;
      }
    }
    this.writeOffset = offset;
    return true;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannelData = output[0];
    const outputBuffers = this.outputBuffers;
    if (this.hasInterrupted) {
      this.port.postMessage({ event: 'stop' });
      return false;
    } else if (outputBuffers.length) {
      this.hasStarted = true;
      const { buffer, trackId } = outputBuffers.shift();
      for (let i = 0; i < outputChannelData.length; i++) {
        outputChannelData[i] = buffer[i] || 0;
      }
      if (trackId) {
        this.trackSampleOffsets[trackId] =
          this.trackSampleOffsets[trackId] || 0;
        this.trackSampleOffsets[trackId] += buffer.length;
      }
      return true;
    } else if (this.hasStarted) {
      this.port.postMessage({ event: 'stop' });
      return false;
    } else {
      return true;
    }
  }
}

registerProcessor('stream_processor', StreamProcessor);
`, ob = new Blob([
  ab
], {
  type: "application/javascript"
}), cb = URL.createObjectURL(ob), ub = cb;
class so {
  /**
  * Creates a new WavStreamPlayer instance
  * @param {{sampleRate?: number}} options
  * @returns {WavStreamPlayer}
  */
  constructor({ sampleRate: e = 44100 } = {}) {
    this.scriptSrc = ub, this.sampleRate = e, this.context = null, this.stream = null, this.analyser = null, this.trackSampleOffsets = {}, this.interruptedTrackIds = {};
  }
  /**
  * Connects the audio context and enables output to speakers
  * @returns {Promise<true>}
  */
  async connect() {
    this.context = new AudioContext({
      sampleRate: this.sampleRate
    }), this._speakerID && this.context.setSinkId(this._speakerID), this.context.state === "suspended" && await this.context.resume();
    try {
      await this.context.audioWorklet.addModule(this.scriptSrc);
    } catch (t) {
      throw console.error(t), new Error(`Could not add audioWorklet module: ${this.scriptSrc}`);
    }
    const e = this.context.createAnalyser();
    return e.fftSize = 8192, e.smoothingTimeConstant = 0.1, this.analyser = e, !0;
  }
  /**
  * Gets the current frequency domain data from the playing track
  * @param {"frequency"|"music"|"voice"} [analysisType]
  * @param {number} [minDecibels] default -100
  * @param {number} [maxDecibels] default -30
  * @returns {import('./analysis/audio_analysis.js').AudioAnalysisOutputType}
  */
  getFrequencies(e = "frequency", t = -100, n = -30) {
    if (!this.analyser) throw new Error("Not connected, please call .connect() first");
    return tr.getFrequencies(this.analyser, this.sampleRate, null, e, t, n);
  }
  /**
  * @param {string} speaker deviceId
  */
  async updateSpeaker(e) {
    const t = this._speakerID;
    if (this._speakerID = e, this.context) try {
      e === "default" ? await this.context.setSinkId() : await this.context.setSinkId(e);
    } catch (n) {
      console.error(`Could not set sinkId to ${e}: ${n}`), this._speakerID = t;
    }
  }
  /**
  * Starts audio streaming
  * @private
  * @returns {Promise<true>}
  */
  _start() {
    const e = new AudioWorkletNode(this.context, "stream_processor");
    return e.connect(this.context.destination), e.port.onmessage = (t) => {
      const { event: n } = t.data;
      if (n === "stop")
        e.disconnect(), this.stream = null;
      else if (n === "offset") {
        const { requestId: i, trackId: s, offset: a } = t.data, c = a / this.sampleRate;
        this.trackSampleOffsets[i] = {
          trackId: s,
          offset: a,
          currentTime: c
        };
      }
    }, this.analyser.disconnect(), e.connect(this.analyser), this.stream = e, !0;
  }
  /**
  * Adds 16BitPCM data to the currently playing audio stream
  * You can add chunks beyond the current play point and they will be queued for play
  * @param {ArrayBuffer|Int16Array} arrayBuffer
  * @param {string} [trackId]
  * @returns {Int16Array}
  */
  add16BitPCM(e, t = "default") {
    if (typeof t != "string") throw new Error("trackId must be a string");
    if (this.interruptedTrackIds[t]) return;
    this.stream || this._start();
    let n;
    if (e instanceof Int16Array) n = e;
    else if (e instanceof ArrayBuffer) n = new Int16Array(e);
    else throw new Error("argument must be Int16Array or ArrayBuffer");
    return this.stream.port.postMessage({
      event: "write",
      buffer: n,
      trackId: t
    }), n;
  }
  /**
  * Gets the offset (sample count) of the currently playing stream
  * @param {boolean} [interrupt]
  * @returns {{trackId: string|null, offset: number, currentTime: number}}
  */
  async getTrackSampleOffset(e = !1) {
    if (!this.stream) return null;
    const t = crypto.randomUUID();
    this.stream.port.postMessage({
      event: e ? "interrupt" : "offset",
      requestId: t
    });
    let n;
    for (; !n; )
      n = this.trackSampleOffsets[t], await new Promise((s) => setTimeout(() => s(), 1));
    const { trackId: i } = n;
    return e && i && (this.interruptedTrackIds[i] = !0), n;
  }
  /**
  * Strips the current stream and returns the sample offset of the audio
  * @param {boolean} [interrupt]
  * @returns {{trackId: string|null, offset: number, currentTime: number}}
  */
  async interrupt() {
    return this.getTrackSampleOffset(!0);
  }
}
globalThis.WavStreamPlayer = so;
const lb = `
class AudioProcessor extends AudioWorkletProcessor {

  constructor() {
    super();
    this.port.onmessage = this.receive.bind(this);
    this.initialize();
  }

  initialize() {
    this.foundAudio = false;
    this.recording = false;
    this.chunks = [];
  }

  /**
   * Concatenates sampled chunks into channels
   * Format is chunk[Left[], Right[]]
   */
  readChannelData(chunks, channel = -1, maxChannels = 9) {
    let channelLimit;
    if (channel !== -1) {
      if (chunks[0] && chunks[0].length - 1 < channel) {
        throw new Error(
          \`Channel \${channel} out of range: max \${chunks[0].length}\`
        );
      }
      channelLimit = channel + 1;
    } else {
      channel = 0;
      channelLimit = Math.min(chunks[0] ? chunks[0].length : 1, maxChannels);
    }
    const channels = [];
    for (let n = channel; n < channelLimit; n++) {
      const length = chunks.reduce((sum, chunk) => {
        return sum + chunk[n].length;
      }, 0);
      const buffers = chunks.map((chunk) => chunk[n]);
      const result = new Float32Array(length);
      let offset = 0;
      for (let i = 0; i < buffers.length; i++) {
        result.set(buffers[i], offset);
        offset += buffers[i].length;
      }
      channels[n] = result;
    }
    return channels;
  }

  /**
   * Combines parallel audio data into correct format,
   * channels[Left[], Right[]] to float32Array[LRLRLRLR...]
   */
  formatAudioData(channels) {
    if (channels.length === 1) {
      // Simple case is only one channel
      const float32Array = channels[0].slice();
      const meanValues = channels[0].slice();
      return { float32Array, meanValues };
    } else {
      const float32Array = new Float32Array(
        channels[0].length * channels.length
      );
      const meanValues = new Float32Array(channels[0].length);
      for (let i = 0; i < channels[0].length; i++) {
        const offset = i * channels.length;
        let meanValue = 0;
        for (let n = 0; n < channels.length; n++) {
          float32Array[offset + n] = channels[n][i];
          meanValue += channels[n][i];
        }
        meanValues[i] = meanValue / channels.length;
      }
      return { float32Array, meanValues };
    }
  }

  /**
   * Converts 32-bit float data to 16-bit integers
   */
  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  /**
   * Retrieves the most recent amplitude values from the audio stream
   * @param {number} channel
   */
  getValues(channel = -1) {
    const channels = this.readChannelData(this.chunks, channel);
    const { meanValues } = this.formatAudioData(channels);
    return { meanValues, channels };
  }

  /**
   * Exports chunks as an audio/wav file
   */
  export() {
    const channels = this.readChannelData(this.chunks);
    const { float32Array, meanValues } = this.formatAudioData(channels);
    const audioData = this.floatTo16BitPCM(float32Array);
    return {
      meanValues: meanValues,
      audio: {
        bitsPerSample: 16,
        channels: channels,
        data: audioData,
      },
    };
  }

  receive(e) {
    const { event, id } = e.data;
    let receiptData = {};
    switch (event) {
      case 'start':
        this.recording = true;
        break;
      case 'stop':
        this.recording = false;
        break;
      case 'clear':
        this.initialize();
        break;
      case 'export':
        receiptData = this.export();
        break;
      case 'read':
        receiptData = this.getValues();
        break;
      default:
        break;
    }
    // Always send back receipt
    this.port.postMessage({ event: 'receipt', id, data: receiptData });
  }

  sendChunk(chunk) {
    const channels = this.readChannelData([chunk]);
    const { float32Array, meanValues } = this.formatAudioData(channels);
    const rawAudioData = this.floatTo16BitPCM(float32Array);
    const monoAudioData = this.floatTo16BitPCM(meanValues);
    this.port.postMessage({
      event: 'chunk',
      data: {
        mono: monoAudioData,
        raw: rawAudioData,
      },
    });
  }

  process(inputList, outputList, parameters) {
    // Copy input to output (e.g. speakers)
    // Note that this creates choppy sounds with Mac products
    const sourceLimit = Math.min(inputList.length, outputList.length);
    for (let inputNum = 0; inputNum < sourceLimit; inputNum++) {
      const input = inputList[inputNum];
      const output = outputList[inputNum];
      const channelCount = Math.min(input.length, output.length);
      for (let channelNum = 0; channelNum < channelCount; channelNum++) {
        input[channelNum].forEach((sample, i) => {
          output[channelNum][i] = sample;
        });
      }
    }
    const inputs = inputList[0];
    // There's latency at the beginning of a stream before recording starts
    // Make sure we actually receive audio data before we start storing chunks
    let sliceIndex = 0;
    if (!this.foundAudio) {
      for (const channel of inputs) {
        sliceIndex = 0; // reset for each channel
        if (this.foundAudio) {
          break;
        }
        if (channel) {
          for (const value of channel) {
            if (value !== 0) {
              // find only one non-zero entry in any channel
              this.foundAudio = true;
              break;
            } else {
              sliceIndex++;
            }
          }
        }
      }
    }
    if (inputs && inputs[0] && this.foundAudio && this.recording) {
      // We need to copy the TypedArray, because the \`process\`
      // internals will reuse the same buffer to hold each input
      const chunk = inputs.map((input) => input.slice(sliceIndex));
      this.chunks.push(chunk);
      this.sendChunk(chunk);
    }
    return true;
  }
}

registerProcessor('audio_processor', AudioProcessor);
`, db = new Blob([
  lb
], {
  type: "application/javascript"
}), hb = URL.createObjectURL(db), Qh = hb;
class Yh {
  /**
  * Create a new WavRecorder instance
  * @param {{sampleRate?: number, outputToSpeakers?: boolean, debug?: boolean}} [options]
  * @returns {WavRecorder}
  */
  constructor({ sampleRate: e = 44100, outputToSpeakers: t = !1, debug: n = !1 } = {}) {
    this.scriptSrc = Qh, this.sampleRate = e, this.outputToSpeakers = t, this.debug = !!n, this._deviceChangeCallback = null, this._deviceErrorCallback = null, this._devices = [], this.deviceSelection = null, this.stream = null, this.processor = null, this.source = null, this.node = null, this.recording = !1, this._lastEventId = 0, this.eventReceipts = {}, this.eventTimeout = 5e3, this._chunkProcessor = () => {
    }, this._chunkProcessorSize = void 0, this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    };
  }
  /**
  * Decodes audio data from multiple formats to a Blob, url, Float32Array and AudioBuffer
  * @param {Blob|Float32Array|Int16Array|ArrayBuffer|number[]} audioData
  * @param {number} sampleRate
  * @param {number} fromSampleRate
  * @returns {Promise<DecodedAudioType>}
  */
  static async decode(e, t = 44100, n = -1) {
    const i = new AudioContext({
      sampleRate: t
    });
    let s, a;
    if (e instanceof Blob) {
      if (n !== -1) throw new Error('Can not specify "fromSampleRate" when reading from Blob');
      a = e, s = await a.arrayBuffer();
    } else if (e instanceof ArrayBuffer) {
      if (n !== -1) throw new Error('Can not specify "fromSampleRate" when reading from ArrayBuffer');
      s = e, a = new Blob([
        s
      ], {
        type: "audio/wav"
      });
    } else {
      let f, p;
      if (e instanceof Int16Array) {
        p = e, f = new Float32Array(e.length);
        for (let v = 0; v < e.length; v++) f[v] = e[v] / 32768;
      } else if (e instanceof Float32Array) f = e;
      else if (e instanceof Array) f = new Float32Array(e);
      else throw new Error('"audioData" must be one of: Blob, Float32Arrray, Int16Array, ArrayBuffer, Array<number>');
      if (n === -1) throw new Error('Must specify "fromSampleRate" when reading from Float32Array, In16Array or Array');
      if (n < 3e3) throw new Error('Minimum "fromSampleRate" is 3000 (3kHz)');
      p || (p = Fe.floatTo16BitPCM(f));
      const y = {
        bitsPerSample: 16,
        channels: [
          f
        ],
        data: p
      };
      a = new Fe().pack(n, y).blob, s = await a.arrayBuffer();
    }
    const c = await i.decodeAudioData(s), u = c.getChannelData(0), l = URL.createObjectURL(a);
    return {
      blob: a,
      url: l,
      values: u,
      audioBuffer: c
    };
  }
  /**
  * Logs data in debug mode
  * @param {...any} arguments
  * @returns {true}
  */
  log() {
    return this.debug && this.log(...arguments), !0;
  }
  /**
  * Retrieves the current sampleRate for the recorder
  * @returns {number}
  */
  getSampleRate() {
    return this.sampleRate;
  }
  /**
  * Retrieves the current status of the recording
  * @returns {"ended"|"paused"|"recording"}
  */
  getStatus() {
    return this.processor ? this.recording ? "recording" : "paused" : "ended";
  }
  /**
  * Sends an event to the AudioWorklet
  * @private
  * @param {string} name
  * @param {{[key: string]: any}} data
  * @param {AudioWorkletNode} [_processor]
  * @returns {Promise<{[key: string]: any}>}
  */
  async _event(e, t = {}, n = null) {
    if (n = n || this.processor, !n) throw new Error("Can not send events without recording first");
    const i = {
      event: e,
      id: this._lastEventId++,
      data: t
    };
    n.port.postMessage(i);
    const s = (/* @__PURE__ */ new Date()).valueOf();
    for (; !this.eventReceipts[i.id]; ) {
      if ((/* @__PURE__ */ new Date()).valueOf() - s > this.eventTimeout) throw new Error(`Timeout waiting for "${e}" event`);
      await new Promise((c) => setTimeout(() => c(!0), 1));
    }
    const a = this.eventReceipts[i.id];
    return delete this.eventReceipts[i.id], a;
  }
  /**
  * Sets device change callback, remove if callback provided is `null`
  * @param {(Array<MediaDeviceInfo & {default: boolean}>): void|null} callback
  * @returns {true}
  */
  listenForDeviceChange(e) {
    if (e === null && this._deviceChangeCallback)
      navigator.mediaDevices.removeEventListener("devicechange", this._deviceChangeCallback), this._deviceChangeCallback = null;
    else if (e !== null) {
      let t = 0, n = [];
      const i = (a) => a.map((c) => c.deviceId).sort().join(","), s = async () => {
        let a = ++t;
        const c = await this.listDevices();
        a === t && i(n) !== i(c) && (n = c, e(c.slice()));
      };
      navigator.mediaDevices.addEventListener("devicechange", s), s(), this._deviceChangeCallback = s;
    }
    return !0;
  }
  /**
  * Provide a callback for if/when device errors occur
  * @param {(({devices: Array<"cam" | "mic">, type: string, error?: Error}) => void) | null} callback
  * @returns {true}
  */
  listenForDeviceErrors(e) {
    this._deviceErrorCallback = e;
  }
  /**
  * Manually request permission to use the microphone
  * @returns {Promise<true>}
  */
  async requestPermission() {
    const e = await navigator.permissions.query({
      name: "microphone"
    });
    if (e.state === "denied")
      this._deviceErrorCallback && this._deviceErrorCallback({
        devices: [
          "mic"
        ],
        type: "unknown",
        error: new Error("Microphone access denied")
      });
    else if (e.state === "prompt") try {
      (await navigator.mediaDevices.getUserMedia({
        audio: !0
      })).getTracks().forEach((i) => i.stop());
    } catch (t) {
      console.error("Error accessing microphone."), this._deviceErrorCallback && this._deviceErrorCallback({
        devices: [
          "mic"
        ],
        type: "unknown",
        error: t
      });
    }
    return !0;
  }
  /**
  * List all eligible devices for recording, will request permission to use microphone
  * @returns {Promise<Array<MediaDeviceInfo & {default: boolean}>>}
  */
  async listDevices() {
    if (!navigator.mediaDevices || !("enumerateDevices" in navigator.mediaDevices)) throw new Error("Could not request user devices");
    return await this.requestPermission(), (await navigator.mediaDevices.enumerateDevices()).filter((n) => n.kind === "audioinput");
  }
  /**
  * Begins a recording session and requests microphone permissions if not already granted
  * Microphone recording indicator will appear on browser tab but status will be "paused"
  * @param {string} [deviceId] if no device provided, default device will be used
  * @returns {Promise<true>}
  */
  async begin(e) {
    if (this.processor) throw new Error("Already connected: please call .end() to start a new session");
    if (!navigator.mediaDevices || !("getUserMedia" in navigator.mediaDevices))
      throw this._deviceErrorCallback && this._deviceErrorCallback({
        devices: [
          "mic",
          "cam"
        ],
        type: "undefined-mediadevices"
      }), new Error("Could not request user media");
    e = e ?? this.deviceSelection?.deviceId;
    try {
      const c = {
        audio: !0
      };
      e && (c.audio = {
        deviceId: {
          exact: e
        }
      }), this.stream = await navigator.mediaDevices.getUserMedia(c);
    } catch (c) {
      throw this._deviceErrorCallback && this._deviceErrorCallback({
        devices: [
          "mic"
        ],
        type: "unknown",
        error: c
      }), new Error("Could not start media stream");
    }
    this.listDevices().then((c) => {
      e = this.stream.getAudioTracks()[0].getSettings().deviceId, console.log("find current device", c, e, this.stream.getAudioTracks()[0].getSettings()), this.deviceSelection = c.find((u) => u.deviceId === e), console.log("current device", this.deviceSelection);
    });
    const t = new AudioContext({
      sampleRate: this.sampleRate
    }), n = t.createMediaStreamSource(this.stream);
    try {
      await t.audioWorklet.addModule(this.scriptSrc);
    } catch (c) {
      throw console.error(c), new Error(`Could not add audioWorklet module: ${this.scriptSrc}`);
    }
    const i = new AudioWorkletNode(t, "audio_processor");
    i.port.onmessage = (c) => {
      const { event: u, id: l, data: f } = c.data;
      if (u === "receipt") this.eventReceipts[l] = f;
      else if (u === "chunk")
        if (this._chunkProcessorSize) {
          const p = this._chunkProcessorBuffer;
          this._chunkProcessorBuffer = {
            raw: Fe.mergeBuffers(p.raw, f.raw),
            mono: Fe.mergeBuffers(p.mono, f.mono)
          }, this._chunkProcessorBuffer.mono.byteLength >= this._chunkProcessorSize && (this._chunkProcessor(this._chunkProcessorBuffer), this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
          });
        } else this._chunkProcessor(f);
    };
    const s = n.connect(i), a = t.createAnalyser();
    return a.fftSize = 8192, a.smoothingTimeConstant = 0.1, s.connect(a), this.outputToSpeakers && (console.warn(`Warning: Output to speakers may affect sound quality,
especially due to system audio feedback preventative measures.
use only for debugging`), a.connect(t.destination)), this.source = n, this.node = s, this.analyser = a, this.processor = i, console.log("begin completed"), !0;
  }
  /**
  * Gets the current frequency domain data from the recording track
  * @param {"frequency"|"music"|"voice"} [analysisType]
  * @param {number} [minDecibels] default -100
  * @param {number} [maxDecibels] default -30
  * @returns {import('./analysis/audio_analysis.js').AudioAnalysisOutputType}
  */
  getFrequencies(e = "frequency", t = -100, n = -30) {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return tr.getFrequencies(this.analyser, this.sampleRate, null, e, t, n);
  }
  /**
  * Pauses the recording
  * Keeps microphone stream open but halts storage of audio
  * @returns {Promise<true>}
  */
  async pause() {
    if (this.processor) {
      if (!this.recording) throw new Error("Already paused: please call .record() first");
    } else throw new Error("Session ended: please call .begin() first");
    return this._chunkProcessorBuffer.raw.byteLength && this._chunkProcessor(this._chunkProcessorBuffer), this.log("Pausing ..."), await this._event("stop"), this.recording = !1, !0;
  }
  /**
  * Start recording stream and storing to memory from the connected audio source
  * @param {(data: { mono: Int16Array; raw: Int16Array }) => any} [chunkProcessor]
  * @param {number} [chunkSize] chunkProcessor will not be triggered until this size threshold met in mono audio
  * @returns {Promise<true>}
  */
  async record(e = () => {
  }, t = 8192) {
    if (this.processor) {
      if (this.recording) throw new Error("Already recording: please call .pause() first");
      if (typeof e != "function") throw new Error("chunkProcessor must be a function");
    } else throw new Error("Session ended: please call .begin() first");
    return this._chunkProcessor = e, this._chunkProcessorSize = t, this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    }, this.log("Recording ..."), await this._event("start"), this.recording = !0, !0;
  }
  /**
  * Clears the audio buffer, empties stored recording
  * @returns {Promise<true>}
  */
  async clear() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return await this._event("clear"), !0;
  }
  /**
  * Reads the current audio stream data
  * @returns {Promise<{meanValues: Float32Array, channels: Array<Float32Array>}>}
  */
  async read() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return this.log("Reading ..."), await this._event("read");
  }
  /**
  * Saves the current audio stream to a file
  * @param {boolean} [force] Force saving while still recording
  * @returns {Promise<import('./wav_packer.js').WavPackerAudioType>}
  */
  async save(e = !1) {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    if (!e && this.recording) throw new Error("Currently recording: please call .pause() first, or call .save(true) to force");
    this.log("Exporting ...");
    const t = await this._event("export");
    return new Fe().pack(this.sampleRate, t.audio);
  }
  /**
  * Ends the current recording session and saves the result
  * @returns {Promise<import('./wav_packer.js').WavPackerAudioType>}
  */
  async end() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    const e = this.processor;
    this.log("Stopping ..."), await this._event("stop"), this.recording = !1, this.stream.getTracks().forEach((a) => a.stop()), this.log("Exporting ...");
    const n = await this._event("export", {}, e);
    return this.processor.disconnect(), this.source.disconnect(), this.node.disconnect(), this.analyser.disconnect(), this.stream = null, this.processor = null, this.source = null, this.node = null, new Fe().pack(this.sampleRate, n.audio);
  }
  /**
  * Performs a full cleanup of WavRecorder instance
  * Stops actively listening via microphone and removes existing listeners
  * @returns {Promise<true>}
  */
  async quit() {
    return this.listenForDeviceChange(null), this.deviceSelection = null, this.processor && await this.end(), !0;
  }
}
globalThis.WavRecorder = Yh;
function md(r, e, t) {
  if (e === t) return r;
  const n = new Int16Array(r), i = e / t, s = Math.round(n.length / i), a = new ArrayBuffer(s * 2), c = new Int16Array(a);
  for (let u = 0; u < s; u++) {
    const l = u * i, f = Math.floor(l), p = Math.min(f + 1, n.length - 1), y = l - f;
    c[u] = Math.round(n[f] * (1 - y) + n[p] * y);
  }
  return a;
}
class fb {
  /**
  * Create a new MediaStreamRecorder instance
  * @param {{sampleRate?: number, outputToSpeakers?: boolean, debug?: boolean}} [options]
  * @returns {MediaStreamRecorder}
  */
  constructor({ sampleRate: e = 44100, outputToSpeakers: t = !1, debug: n = !1 } = {}) {
    this.scriptSrc = Qh, this.sampleRate = e, this.outputToSpeakers = t, this.debug = !!n, this.stream = null, this.processor = null, this.source = null, this.node = null, this.recording = !1, this._lastEventId = 0, this.eventReceipts = {}, this.eventTimeout = 5e3, this._chunkProcessor = () => {
    }, this._chunkProcessorSize = void 0, this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    };
  }
  /**
  * Logs data in debug mode
  * @param {...any} arguments
  * @returns {true}
  */
  log() {
    return this.debug && this.log(...arguments), !0;
  }
  /**
  * Retrieves the current sampleRate for the recorder
  * @returns {number}
  */
  getSampleRate() {
    return this.sampleRate;
  }
  /**
  * Retrieves the current status of the recording
  * @returns {"ended"|"paused"|"recording"}
  */
  getStatus() {
    return this.processor ? this.recording ? "recording" : "paused" : "ended";
  }
  /**
  * Sends an event to the AudioWorklet
  * @private
  * @param {string} name
  * @param {{[key: string]: any}} data
  * @param {AudioWorkletNode} [_processor]
  * @returns {Promise<{[key: string]: any}>}
  */
  async _event(e, t = {}, n = null) {
    if (n = n || this.processor, !n) throw new Error("Can not send events without recording first");
    const i = {
      event: e,
      id: this._lastEventId++,
      data: t
    };
    n.port.postMessage(i);
    const s = (/* @__PURE__ */ new Date()).valueOf();
    for (; !this.eventReceipts[i.id]; ) {
      if ((/* @__PURE__ */ new Date()).valueOf() - s > this.eventTimeout) throw new Error(`Timeout waiting for "${e}" event`);
      await new Promise((c) => setTimeout(() => c(!0), 1));
    }
    const a = this.eventReceipts[i.id];
    return delete this.eventReceipts[i.id], a;
  }
  /**
  * Begins a recording session for the given audioTrack
  * Microphone recording indicator will appear on browser tab but status will be "paused"
  * @param {MediaStreamTrack} [audioTrack] if no device provided, default device will be used
  * @returns {Promise<true>}
  */
  async begin(e) {
    if (this.processor) throw new Error("Already connected: please call .end() to start a new session");
    if (!e || e.kind !== "audio") throw new Error("No audio track provided");
    this.stream = new MediaStream([
      e
    ]);
    const t = navigator.userAgent.toLowerCase().includes("firefox");
    let n;
    t ? n = new AudioContext() : n = new AudioContext({
      sampleRate: this.sampleRate
    });
    const i = n.sampleRate, s = n.createMediaStreamSource(this.stream);
    try {
      await n.audioWorklet.addModule(this.scriptSrc);
    } catch (l) {
      throw console.error(l), new Error(`Could not add audioWorklet module: ${this.scriptSrc}`);
    }
    const a = new AudioWorkletNode(n, "audio_processor");
    a.port.onmessage = (l) => {
      const { event: f, id: p, data: y } = l.data;
      if (f === "receipt") this.eventReceipts[p] = y;
      else if (f === "chunk") {
        const M = {
          raw: md(y.raw, i, this.sampleRate),
          mono: md(y.mono, i, this.sampleRate)
        };
        if (this._chunkProcessorSize) {
          const b = this._chunkProcessorBuffer;
          this._chunkProcessorBuffer = {
            raw: Fe.mergeBuffers(b.raw, M.raw),
            mono: Fe.mergeBuffers(b.mono, M.mono)
          }, this._chunkProcessorBuffer.mono.byteLength >= this._chunkProcessorSize && (this._chunkProcessor(this._chunkProcessorBuffer), this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
          });
        } else this._chunkProcessor(M);
      }
    };
    const c = s.connect(a), u = n.createAnalyser();
    return u.fftSize = 8192, u.smoothingTimeConstant = 0.1, c.connect(u), this.outputToSpeakers && (console.warn(`Warning: Output to speakers may affect sound quality,
especially due to system audio feedback preventative measures.
use only for debugging`), u.connect(n.destination)), this.source = s, this.node = c, this.analyser = u, this.processor = a, !0;
  }
  /**
  * Gets the current frequency domain data from the recording track
  * @param {"frequency"|"music"|"voice"} [analysisType]
  * @param {number} [minDecibels] default -100
  * @param {number} [maxDecibels] default -30
  * @returns {import('./analysis/audio_analysis.js').AudioAnalysisOutputType}
  */
  getFrequencies(e = "frequency", t = -100, n = -30) {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return tr.getFrequencies(this.analyser, this.sampleRate, null, e, t, n);
  }
  /**
  * Pauses the recording
  * Keeps microphone stream open but halts storage of audio
  * @returns {Promise<true>}
  */
  async pause() {
    if (this.processor) {
      if (!this.recording) throw new Error("Already paused: please call .record() first");
    } else throw new Error("Session ended: please call .begin() first");
    return this._chunkProcessorBuffer.raw.byteLength && this._chunkProcessor(this._chunkProcessorBuffer), this.log("Pausing ..."), await this._event("stop"), this.recording = !1, !0;
  }
  /**
  * Start recording stream and storing to memory from the connected audio source
  * @param {(data: { mono: Int16Array; raw: Int16Array }) => any} [chunkProcessor]
  * @param {number} [chunkSize] chunkProcessor will not be triggered until this size threshold met in mono audio
  * @returns {Promise<true>}
  */
  async record(e = () => {
  }, t = 8192) {
    if (this.processor) {
      if (this.recording) throw new Error("Already recording: HELLO please call .pause() first");
      if (typeof e != "function") throw new Error("chunkProcessor must be a function");
    } else throw new Error("Session ended: please call .begin() first");
    return this._chunkProcessor = e, this._chunkProcessorSize = t, this._chunkProcessorBuffer = {
      raw: new ArrayBuffer(0),
      mono: new ArrayBuffer(0)
    }, this.log("Recording ..."), await this._event("start"), this.recording = !0, !0;
  }
  /**
  * Clears the audio buffer, empties stored recording
  * @returns {Promise<true>}
  */
  async clear() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return await this._event("clear"), !0;
  }
  /**
  * Reads the current audio stream data
  * @returns {Promise<{meanValues: Float32Array, channels: Array<Float32Array>}>}
  */
  async read() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    return this.log("Reading ..."), await this._event("read");
  }
  /**
  * Saves the current audio stream to a file
  * @param {boolean} [force] Force saving while still recording
  * @returns {Promise<import('./wav_packer.js').WavPackerAudioType>}
  */
  async save(e = !1) {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    if (!e && this.recording) throw new Error("Currently recording: please call .pause() first, or call .save(true) to force");
    this.log("Exporting ...");
    const t = await this._event("export");
    return new Fe().pack(this.sampleRate, t.audio);
  }
  /**
  * Ends the current recording session and saves the result
  * @returns {Promise<import('./wav_packer.js').WavPackerAudioType>}
  */
  async end() {
    if (!this.processor) throw new Error("Session ended: please call .begin() first");
    const e = this.processor;
    this.log("Stopping ..."), await this._event("stop"), this.recording = !1, this.log("Exporting ...");
    const t = await this._event("export", {}, e);
    return this.processor.disconnect(), this.source.disconnect(), this.node.disconnect(), this.analyser.disconnect(), this.stream = null, this.processor = null, this.source = null, this.node = null, new Fe().pack(this.sampleRate, t.audio);
  }
  /**
  * Performs a full cleanup of WavRecorder instance
  * Stops actively listening via microphone and removes existing listeners
  * @returns {Promise<true>}
  */
  async quit() {
    return this.listenForDeviceChange(null), this.processor && await this.end(), !0;
  }
}
globalThis.WavRecorder = WavRecorder;
var pb = /* @__PURE__ */ (function() {
  var r = function(e, t) {
    return r = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function(n, i) {
      n.__proto__ = i;
    } || function(n, i) {
      for (var s in i) Object.prototype.hasOwnProperty.call(i, s) && (n[s] = i[s]);
    }, r(e, t);
  };
  return function(e, t) {
    if (typeof t != "function" && t !== null) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
    r(e, t);
    function n() {
      this.constructor = e;
    }
    e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype, new n());
  };
})(), St = function(r, e, t, n) {
  function i(s) {
    return s instanceof t ? s : new t(function(a) {
      a(s);
    });
  }
  return new (t || (t = Promise))(function(s, a) {
    function c(f) {
      try {
        l(n.next(f));
      } catch (p) {
        a(p);
      }
    }
    function u(f) {
      try {
        l(n.throw(f));
      } catch (p) {
        a(p);
      }
    }
    function l(f) {
      f.done ? s(f.value) : i(f.value).then(c, u);
    }
    l((n = n.apply(r, e || [])).next());
  });
}, kt = function(r, e) {
  var t = {
    label: 0,
    sent: function() {
      if (s[0] & 1) throw s[1];
      return s[1];
    },
    trys: [],
    ops: []
  }, n, i, s, a = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
  return a.next = c(0), a.throw = c(1), a.return = c(2), typeof Symbol == "function" && (a[Symbol.iterator] = function() {
    return this;
  }), a;
  function c(l) {
    return function(f) {
      return u([
        l,
        f
      ]);
    };
  }
  function u(l) {
    if (n) throw new TypeError("Generator is already executing.");
    for (; a && (a = 0, l[0] && (t = 0)), t; ) try {
      if (n = 1, i && (s = l[0] & 2 ? i.return : l[0] ? i.throw || ((s = i.return) && s.call(i), 0) : i.next) && !(s = s.call(i, l[1])).done) return s;
      switch (i = 0, s && (l = [
        l[0] & 2,
        s.value
      ]), l[0]) {
        case 0:
        case 1:
          s = l;
          break;
        case 4:
          return t.label++, {
            value: l[1],
            done: !1
          };
        case 5:
          t.label++, i = l[1], l = [
            0
          ];
          continue;
        case 7:
          l = t.ops.pop(), t.trys.pop();
          continue;
        default:
          if (s = t.trys, !(s = s.length > 0 && s[s.length - 1]) && (l[0] === 6 || l[0] === 2)) {
            t = 0;
            continue;
          }
          if (l[0] === 3 && (!s || l[1] > s[0] && l[1] < s[3])) {
            t.label = l[1];
            break;
          }
          if (l[0] === 6 && t.label < s[1]) {
            t.label = s[1], s = l;
            break;
          }
          if (s && t.label < s[2]) {
            t.label = s[2], t.ops.push(l);
            break;
          }
          s[2] && t.ops.pop(), t.trys.pop();
          continue;
      }
      l = e.call(r, t);
    } catch (f) {
      l = [
        6,
        f
      ], i = 0;
    } finally {
      n = s = 0;
    }
    if (l[0] & 5) throw l[1];
    return {
      value: l[0] ? l[1] : void 0,
      done: !0
    };
  }
}, Xh = (
  /** @class */
  (function() {
    function r() {
      this._callbacks = {}, this._micEnabled = !0, this._camEnabled = !1, this._supportsScreenShare = !1;
    }
    return r.prototype.setUserAudioCallback = function(e) {
      this._userAudioCallback = e;
    }, r.prototype.setClientOptions = function(e, t) {
      var n, i, s;
      t === void 0 && (t = !1), !(this._options && !t) && (this._options = e, this._callbacks = (n = e.callbacks) !== null && n !== void 0 ? n : {}, this._micEnabled = (i = e.enableMic) !== null && i !== void 0 ? i : !0, this._camEnabled = (s = e.enableCam) !== null && s !== void 0 ? s : !1);
    }, Object.defineProperty(r.prototype, "supportsScreenShare", {
      get: function() {
        return this._supportsScreenShare;
      },
      enumerable: !1,
      configurable: !0
    }), r;
  })()
);
(function(r) {
  pb(e, r);
  function e(t, n) {
    t === void 0 && (t = void 0), n === void 0 && (n = 24e3);
    var i = r.call(this) || this;
    return i._initialized = !1, i._recorderChunkSize = void 0, i._recorderChunkSize = t, i._wavRecorder = new Yh({
      sampleRate: n
    }), i._wavStreamPlayer = new so({
      sampleRate: 24e3
    }), i;
  }
  return e.prototype.initialize = function() {
    return St(this, void 0, Promise, function() {
      return kt(this, function(t) {
        switch (t.label) {
          case 0:
            return t.trys.push([
              0,
              2,
              ,
              3
            ]), [
              4,
              this._wavRecorder.begin()
            ];
          case 1:
            return t.sent(), [
              3,
              3
            ];
          case 2:
            return t.sent(), [
              3,
              3
            ];
          case 3:
            return this._wavRecorder.listenForDeviceChange(null), this._wavRecorder.listenForDeviceChange(this._handleAvailableDevicesUpdated.bind(this)), this._wavRecorder.listenForDeviceErrors(null), this._wavRecorder.listenForDeviceErrors(this._handleDeviceError.bind(this)), [
              4,
              this._wavStreamPlayer.connect()
            ];
          case 4:
            return t.sent(), this._initialized = !0, [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype.connect = function() {
    return St(this, void 0, Promise, function() {
      var t;
      return kt(this, function(n) {
        switch (n.label) {
          case 0:
            return this._initialized ? [
              3,
              2
            ] : [
              4,
              this.initialize()
            ];
          case 1:
            n.sent(), n.label = 2;
          case 2:
            return t = this._wavRecorder.getStatus() == "recording", this._micEnabled && !t ? [
              4,
              this._startRecording()
            ] : [
              3,
              4
            ];
          case 3:
            n.sent(), n.label = 4;
          case 4:
            return this._camEnabled && console.warn("WavMediaManager does not support video input."), [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype.disconnect = function() {
    return St(this, void 0, Promise, function() {
      return kt(this, function(t) {
        switch (t.label) {
          case 0:
            return this._initialized ? [
              4,
              this._wavRecorder.end()
            ] : [
              2
              /*return*/
            ];
          case 1:
            return t.sent(), [
              4,
              this._wavStreamPlayer.interrupt()
            ];
          case 2:
            return t.sent(), this._initialized = !1, [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype.userStartedSpeaking = function() {
    return St(this, void 0, Promise, function() {
      return kt(this, function(t) {
        return [
          2,
          this._wavStreamPlayer.interrupt()
        ];
      });
    });
  }, e.prototype.bufferBotAudio = function(t, n) {
    return this._wavStreamPlayer.add16BitPCM(t, n);
  }, e.prototype.getAllMics = function() {
    return this._wavRecorder.listDevices();
  }, e.prototype.getAllCams = function() {
    return Promise.resolve([]);
  }, e.prototype.getAllSpeakers = function() {
    return Promise.resolve([]);
  }, e.prototype.updateMic = function(t) {
    return St(this, void 0, Promise, function() {
      var n, i, s, a;
      return kt(this, function(c) {
        switch (c.label) {
          case 0:
            return n = this._wavRecorder.deviceSelection, this._wavRecorder.getStatus() === "ended" ? [
              3,
              2
            ] : [
              4,
              this._wavRecorder.end()
            ];
          case 1:
            c.sent(), c.label = 2;
          case 2:
            return c.trys.push([
              2,
              6,
              ,
              7
            ]), [
              4,
              this._wavRecorder.begin(t)
            ];
          case 3:
            return c.sent(), this._micEnabled ? [
              4,
              this._startRecording()
            ] : [
              3,
              5
            ];
          case 4:
            c.sent(), c.label = 5;
          case 5:
            return i = this._wavRecorder.deviceSelection, i && n && n.label !== i.label && ((a = (s = this._callbacks).onMicUpdated) === null || a === void 0 || a.call(s, i)), [
              3,
              7
            ];
          case 6:
            return c.sent(), [
              3,
              7
            ];
          case 7:
            return [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype.updateCam = function(t) {
  }, e.prototype.updateSpeaker = function(t) {
  }, Object.defineProperty(e.prototype, "selectedMic", {
    get: function() {
      var t;
      return (t = this._wavRecorder.deviceSelection) !== null && t !== void 0 ? t : {};
    },
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(e.prototype, "selectedCam", {
    get: function() {
      return {};
    },
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(e.prototype, "selectedSpeaker", {
    get: function() {
      return {};
    },
    enumerable: !1,
    configurable: !0
  }), e.prototype.enableMic = function(t) {
    return St(this, void 0, Promise, function() {
      var n = this;
      return kt(this, function(i) {
        switch (i.label) {
          case 0:
            return this._micEnabled = t, this._wavRecorder.stream ? (this._wavRecorder.stream.getAudioTracks().forEach(function(s) {
              var a, c;
              s.enabled = t, t || (c = (a = n._callbacks).onTrackStopped) === null || c === void 0 || c.call(a, s, vd());
            }), t ? [
              4,
              this._startRecording()
            ] : [
              3,
              2
            ]) : [
              2
              /*return*/
            ];
          case 1:
            return i.sent(), [
              3,
              4
            ];
          case 2:
            return [
              4,
              this._wavRecorder.pause()
            ];
          case 3:
            i.sent(), i.label = 4;
          case 4:
            return [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype.enableCam = function(t) {
    console.warn("WavMediaManager does not support video input.");
  }, e.prototype.enableScreenShare = function(t) {
    console.warn("WavMediaManager does not support screen sharing.");
  }, Object.defineProperty(e.prototype, "isCamEnabled", {
    get: function() {
      return !1;
    },
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(e.prototype, "isMicEnabled", {
    get: function() {
      return this._micEnabled;
    },
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(e.prototype, "isSharingScreen", {
    get: function() {
      return !1;
    },
    enumerable: !1,
    configurable: !0
  }), e.prototype.tracks = function() {
    var t, n = (t = this._wavRecorder.stream) === null || t === void 0 ? void 0 : t.getTracks()[0];
    return {
      local: n ? {
        audio: n
      } : {}
    };
  }, e.prototype._startRecording = function() {
    return St(this, void 0, void 0, function() {
      var t, n = this, i, s, a;
      return kt(this, function(c) {
        switch (c.label) {
          case 0:
            return [
              4,
              this._wavRecorder.record(function(u) {
                var l;
                (l = n._userAudioCallback) === null || l === void 0 || l.call(n, u.mono);
              }, this._recorderChunkSize)
            ];
          case 1:
            return c.sent(), t = (i = this._wavRecorder.stream) === null || i === void 0 ? void 0 : i.getAudioTracks()[0], t && ((a = (s = this._callbacks).onTrackStarted) === null || a === void 0 || a.call(s, t, vd())), [
              2
              /*return*/
            ];
        }
      });
    });
  }, e.prototype._handleAvailableDevicesUpdated = function(t) {
    var n, i, s, a;
    (i = (n = this._callbacks).onAvailableCamsUpdated) === null || i === void 0 || i.call(n, t.filter(function(l) {
      return l.kind === "videoinput";
    })), (a = (s = this._callbacks).onAvailableMicsUpdated) === null || a === void 0 || a.call(s, t.filter(function(l) {
      return l.kind === "audioinput";
    }));
    var c = t.find(function(l) {
      return l.deviceId === "default";
    }), u = this._wavRecorder.deviceSelection;
    u && (!t.some(function(l) {
      return l.deviceId === u.deviceId;
    }) || u.deviceId === "default" && u.label !== c?.label) && this.updateMic("");
  }, e.prototype._handleDeviceError = function(t) {
    var n, i, s = t.devices, a = t.type, c = t.error, u = new Xe(s, a, c?.message, c ? {
      sourceError: c
    } : void 0);
    (i = (n = this._callbacks).onDeviceError) === null || i === void 0 || i.call(n, u);
  }, e;
})(Xh);
var vd = function() {
  return {
    id: "local",
    name: "",
    local: !0
  };
}, gb = /* @__PURE__ */ (function() {
  var r = function(e, t) {
    return r = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function(n, i) {
      n.__proto__ = i;
    } || function(n, i) {
      for (var s in i) Object.prototype.hasOwnProperty.call(i, s) && (n[s] = i[s]);
    }, r(e, t);
  };
  return function(e, t) {
    if (typeof t != "function" && t !== null) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
    r(e, t);
    function n() {
      this.constructor = e;
    }
    e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype, new n());
  };
})(), je = function(r, e, t, n) {
  function i(s) {
    return s instanceof t ? s : new t(function(a) {
      a(s);
    });
  }
  return new (t || (t = Promise))(function(s, a) {
    function c(f) {
      try {
        l(n.next(f));
      } catch (p) {
        a(p);
      }
    }
    function u(f) {
      try {
        l(n.throw(f));
      } catch (p) {
        a(p);
      }
    }
    function l(f) {
      f.done ? s(f.value) : i(f.value).then(c, u);
    }
    l((n = n.apply(r, e || [])).next());
  });
}, De = function(r, e) {
  var t = {
    label: 0,
    sent: function() {
      if (s[0] & 1) throw s[1];
      return s[1];
    },
    trys: [],
    ops: []
  }, n, i, s, a = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
  return a.next = c(0), a.throw = c(1), a.return = c(2), typeof Symbol == "function" && (a[Symbol.iterator] = function() {
    return this;
  }), a;
  function c(l) {
    return function(f) {
      return u([
        l,
        f
      ]);
    };
  }
  function u(l) {
    if (n) throw new TypeError("Generator is already executing.");
    for (; a && (a = 0, l[0] && (t = 0)), t; ) try {
      if (n = 1, i && (s = l[0] & 2 ? i.return : l[0] ? i.throw || ((s = i.return) && s.call(i), 0) : i.next) && !(s = s.call(i, l[1])).done) return s;
      switch (i = 0, s && (l = [
        l[0] & 2,
        s.value
      ]), l[0]) {
        case 0:
        case 1:
          s = l;
          break;
        case 4:
          return t.label++, {
            value: l[1],
            done: !1
          };
        case 5:
          t.label++, i = l[1], l = [
            0
          ];
          continue;
        case 7:
          l = t.ops.pop(), t.trys.pop();
          continue;
        default:
          if (s = t.trys, !(s = s.length > 0 && s[s.length - 1]) && (l[0] === 6 || l[0] === 2)) {
            t = 0;
            continue;
          }
          if (l[0] === 3 && (!s || l[1] > s[0] && l[1] < s[3])) {
            t.label = l[1];
            break;
          }
          if (l[0] === 6 && t.label < s[1]) {
            t.label = s[1], s = l;
            break;
          }
          if (s && t.label < s[2]) {
            t.label = s[2], t.ops.push(l);
            break;
          }
          s[2] && t.ops.pop(), t.trys.pop();
          continue;
      }
      l = e.call(r, t);
    } catch (f) {
      l = [
        6,
        f
      ], i = 0;
    } finally {
      n = s = 0;
    }
    if (l[0] & 5) throw l[1];
    return {
      value: l[0] ? l[1] : void 0,
      done: !0
    };
  }
}, mb = (
  /** @class */
  (function(r) {
    gb(e, r);
    function e(t, n, i, s, a, c, u) {
      t === void 0 && (t = !0), n === void 0 && (n = !0), a === void 0 && (a = void 0), c === void 0 && (c = 24e3), u === void 0 && (u = 24e3);
      var l, f = r.call(this) || this;
      return f._selectedCam = {}, f._selectedMic = {}, f._selectedSpeaker = {}, f._remoteAudioLevelInterval = null, f._recorderChunkSize = void 0, f._initialized = !1, f._connected = !1, f._currentAudioTrack = null, f._connectResolve = null, f.onTrackStartedCallback = i, f.onTrackStoppedCallback = s, f._recorderChunkSize = a, f._supportsScreenShare = !0, f._daily = (l = cu.getCallInstance()) !== null && l !== void 0 ? l : cu.createCallObject(), n && (f._mediaStreamRecorder = new fb({
        sampleRate: c
      })), t && (f._wavStreamPlayer = new so({
        sampleRate: u
      })), f._daily.on("track-started", f.handleTrackStarted.bind(f)), f._daily.on("track-stopped", f.handleTrackStopped.bind(f)), f._daily.on("available-devices-updated", f._handleAvailableDevicesUpdated.bind(f)), f._daily.on("selected-devices-updated", f._handleSelectedDevicesUpdated.bind(f)), f._daily.on("camera-error", f.handleDeviceError.bind(f)), f._daily.on("local-audio-level", f._handleLocalAudioLevel.bind(f)), f;
    }
    return e.prototype.initialize = function() {
      return je(this, void 0, Promise, function() {
        var t, n, i, s, a, c = this, u, l, f, p, y, M, b, v, C, E, O, I;
        return De(this, function(k) {
          switch (k.label) {
            case 0:
              return this._initialized ? (console.warn("DailyMediaManager already initialized"), [
                2
                /*return*/
              ]) : [
                4,
                this._daily.startCamera({
                  startVideoOff: !this._camEnabled,
                  startAudioOff: !this._micEnabled,
                  dailyConfig: {
                    useDevicePreferenceCookies: !0
                  }
                })
              ];
            case 1:
              return t = k.sent(), [
                4,
                this._daily.enumerateDevices()
              ];
            case 2:
              return n = k.sent().devices, i = n.filter(function(S) {
                return S.kind === "videoinput";
              }), s = n.filter(function(S) {
                return S.kind === "audioinput";
              }), a = n.filter(function(S) {
                return S.kind === "audiooutput";
              }), (l = (u = this._callbacks).onAvailableCamsUpdated) === null || l === void 0 || l.call(u, i), (p = (f = this._callbacks).onAvailableMicsUpdated) === null || p === void 0 || p.call(f, s), (M = (y = this._callbacks).onAvailableSpeakersUpdated) === null || M === void 0 || M.call(y, a), this._selectedCam = t.camera, (v = (b = this._callbacks).onCamUpdated) === null || v === void 0 || v.call(b, t.camera), this._selectedMic = t.mic, (E = (C = this._callbacks).onMicUpdated) === null || E === void 0 || E.call(C, t.mic), this._selectedSpeaker = t.speaker, (I = (O = this._callbacks).onSpeakerUpdated) === null || I === void 0 || I.call(O, t.speaker), this._daily.isLocalAudioLevelObserverRunning() ? [
                3,
                4
              ] : [
                4,
                this._daily.startLocalAudioLevelObserver(100)
              ];
            case 3:
              k.sent(), k.label = 4;
            case 4:
              return this._wavStreamPlayer ? [
                4,
                this._wavStreamPlayer.connect()
              ] : [
                3,
                6
              ];
            case 5:
              k.sent(), this._remoteAudioLevelInterval || (this._remoteAudioLevelInterval = setInterval(function() {
                var S, T = c._wavStreamPlayer.getFrequencies(), L = 0;
                !((S = T.values) === null || S === void 0) && S.length && (L = T.values.reduce(function(D, N) {
                  return D + N;
                }, 0) / T.values.length), c._handleRemoteAudioLevel(L);
              }, 100)), k.label = 6;
            case 6:
              return this._initialized = !0, [
                2
                /*return*/
              ];
          }
        });
      });
    }, e.prototype.connect = function() {
      return je(this, void 0, Promise, function() {
        var t = this;
        return De(this, function(n) {
          return this._connected ? (console.warn("DailyMediaManager already connected"), [
            2
            /*return*/
          ]) : (this._connected = !0, this._initialized ? (this._micEnabled && this._startRecording(), [
            2
            /*return*/
          ]) : [
            2,
            new Promise(function(i) {
              (function() {
                return je(t, void 0, void 0, function() {
                  return De(this, function(s) {
                    switch (s.label) {
                      case 0:
                        return this._connectResolve = i, [
                          4,
                          this.initialize()
                        ];
                      case 1:
                        return s.sent(), [
                          2
                          /*return*/
                        ];
                    }
                  });
                });
              })();
            })
          ]);
        });
      });
    }, e.prototype.disconnect = function() {
      return je(this, void 0, Promise, function() {
        var t, n;
        return De(this, function(i) {
          switch (i.label) {
            case 0:
              return this._remoteAudioLevelInterval && clearInterval(this._remoteAudioLevelInterval), this._remoteAudioLevelInterval = null, this._daily.leave(), this._currentAudioTrack = null, [
                4,
                (t = this._mediaStreamRecorder) === null || t === void 0 ? void 0 : t.end()
              ];
            case 1:
              return i.sent(), (n = this._wavStreamPlayer) === null || n === void 0 || n.interrupt(), this._initialized = !1, this._connected = !1, [
                2
                /*return*/
              ];
          }
        });
      });
    }, e.prototype.userStartedSpeaking = function() {
      return je(this, void 0, Promise, function() {
        var t;
        return De(this, function(n) {
          return [
            2,
            (t = this._wavStreamPlayer) === null || t === void 0 ? void 0 : t.interrupt()
          ];
        });
      });
    }, e.prototype.bufferBotAudio = function(t, n) {
      var i;
      return (i = this._wavStreamPlayer) === null || i === void 0 ? void 0 : i.add16BitPCM(t, n);
    }, e.prototype.getAllMics = function() {
      return je(this, void 0, Promise, function() {
        var t;
        return De(this, function(n) {
          switch (n.label) {
            case 0:
              return [
                4,
                this._daily.enumerateDevices()
              ];
            case 1:
              return t = n.sent().devices, [
                2,
                t.filter(function(i) {
                  return i.kind === "audioinput";
                })
              ];
          }
        });
      });
    }, e.prototype.getAllCams = function() {
      return je(this, void 0, Promise, function() {
        var t;
        return De(this, function(n) {
          switch (n.label) {
            case 0:
              return [
                4,
                this._daily.enumerateDevices()
              ];
            case 1:
              return t = n.sent().devices, [
                2,
                t.filter(function(i) {
                  return i.kind === "videoinput";
                })
              ];
          }
        });
      });
    }, e.prototype.getAllSpeakers = function() {
      return je(this, void 0, Promise, function() {
        var t;
        return De(this, function(n) {
          switch (n.label) {
            case 0:
              return [
                4,
                this._daily.enumerateDevices()
              ];
            case 1:
              return t = n.sent().devices, [
                2,
                t.filter(function(i) {
                  return i.kind === "audiooutput";
                })
              ];
          }
        });
      });
    }, e.prototype.updateMic = function(t) {
      var n = this;
      this._daily.setInputDevicesAsync({
        audioDeviceId: t
      }).then(function(i) {
        n._selectedMic = i.mic;
      });
    }, e.prototype.updateCam = function(t) {
      var n = this;
      this._daily.setInputDevicesAsync({
        videoDeviceId: t
      }).then(function(i) {
        n._selectedCam = i.camera;
      });
    }, e.prototype.updateSpeaker = function(t) {
      return je(this, void 0, Promise, function() {
        var n, i, s, a, c, u, l = this, f, p, y, M;
        return De(this, function(b) {
          switch (b.label) {
            case 0:
              if (this._wavStreamPlayer) return [
                3,
                5
              ];
              b.label = 1;
            case 1:
              return b.trys.push([
                1,
                3,
                ,
                4
              ]), [
                4,
                this._daily.setOutputDeviceAsync({
                  outputDeviceId: t
                })
              ];
            case 2:
              return n = b.sent(), this._selectedSpeaker = n.speaker, (p = (f = this._callbacks).onSpeakerUpdated) === null || p === void 0 || p.call(f, this._selectedSpeaker), [
                3,
                4
              ];
            case 3:
              return i = b.sent(), console.error("Error setting output device", i), [
                3,
                4
              ];
            case 4:
              return [
                2
                /*return*/
              ];
            case 5:
              return t !== "default" && this._selectedSpeaker.deviceId === t ? [
                2
                /*return*/
              ] : (s = t, s !== "default" ? [
                3,
                7
              ] : [
                4,
                this.getAllSpeakers()
              ]);
            case 6:
              if (a = b.sent(), c = a.find(function(v) {
                return v.deviceId === "default";
              }), !c)
                return console.warn("No default speaker found"), [
                  2
                  /*return*/
                ];
              a.splice(a.indexOf(c), 1), u = a.find(function(v) {
                return c.label.includes(v.label);
              }), s = (y = u?.deviceId) !== null && y !== void 0 ? y : t, b.label = 7;
            case 7:
              return (M = this._wavStreamPlayer) === null || M === void 0 || M.updateSpeaker(s).then(function() {
                var v, C;
                l._selectedSpeaker = {
                  deviceId: t
                }, (C = (v = l._callbacks).onSpeakerUpdated) === null || C === void 0 || C.call(v, l._selectedSpeaker);
              }), [
                2
                /*return*/
              ];
          }
        });
      });
    }, Object.defineProperty(e.prototype, "selectedMic", {
      get: function() {
        return this._selectedMic;
      },
      enumerable: !1,
      configurable: !0
    }), Object.defineProperty(e.prototype, "selectedCam", {
      get: function() {
        return this._selectedCam;
      },
      enumerable: !1,
      configurable: !0
    }), Object.defineProperty(e.prototype, "selectedSpeaker", {
      get: function() {
        return this._selectedSpeaker;
      },
      enumerable: !1,
      configurable: !0
    }), e.prototype.enableMic = function(t) {
      return je(this, void 0, Promise, function() {
        var n;
        return De(this, function(i) {
          return this._micEnabled = t, !((n = this._daily.participants()) === null || n === void 0) && n.local ? (this._daily.setLocalAudio(t), this._mediaStreamRecorder && (t ? this._mediaStreamRecorder.getStatus() === "paused" && this._startRecording() : this._mediaStreamRecorder.getStatus() === "recording" && this._mediaStreamRecorder.pause()), [
            2
            /*return*/
          ]) : [
            2
            /*return*/
          ];
        });
      });
    }, e.prototype.enableCam = function(t) {
      this._camEnabled = t, this._daily.setLocalVideo(t);
    }, e.prototype.enableScreenShare = function(t) {
      t ? this._daily.startScreenShare() : this._daily.stopScreenShare();
    }, Object.defineProperty(e.prototype, "isCamEnabled", {
      get: function() {
        return this._daily.localVideo();
      },
      enumerable: !1,
      configurable: !0
    }), Object.defineProperty(e.prototype, "isMicEnabled", {
      get: function() {
        return this._daily.localAudio();
      },
      enumerable: !1,
      configurable: !0
    }), Object.defineProperty(e.prototype, "isSharingScreen", {
      get: function() {
        return this._daily.localScreenAudio() || this._daily.localScreenVideo();
      },
      enumerable: !1,
      configurable: !0
    }), e.prototype.tracks = function() {
      var t, n, i, s, a, c, u, l, f, p, y, M, b = this._daily.participants();
      return {
        local: {
          audio: (i = (n = (t = b?.local) === null || t === void 0 ? void 0 : t.tracks) === null || n === void 0 ? void 0 : n.audio) === null || i === void 0 ? void 0 : i.persistentTrack,
          screenAudio: (c = (a = (s = b?.local) === null || s === void 0 ? void 0 : s.tracks) === null || a === void 0 ? void 0 : a.screenAudio) === null || c === void 0 ? void 0 : c.persistentTrack,
          screenVideo: (f = (l = (u = b?.local) === null || u === void 0 ? void 0 : u.tracks) === null || l === void 0 ? void 0 : l.screenVideo) === null || f === void 0 ? void 0 : f.persistentTrack,
          video: (M = (y = (p = b?.local) === null || p === void 0 ? void 0 : p.tracks) === null || y === void 0 ? void 0 : y.video) === null || M === void 0 ? void 0 : M.persistentTrack
        }
      };
    }, e.prototype._startRecording = function() {
      var t = this;
      if (!(!this._connected || !this._mediaStreamRecorder))
        try {
          this._mediaStreamRecorder.record(function(i) {
            t._userAudioCallback(i.mono);
          }, this._recorderChunkSize);
        } catch (i) {
          var n = i;
          n.message.includes("Already recording") || console.error("Error starting recording", i);
        }
    }, e.prototype._handleAvailableDevicesUpdated = function(t) {
      var n, i, s, a, c, u;
      (i = (n = this._callbacks).onAvailableCamsUpdated) === null || i === void 0 || i.call(n, t.availableDevices.filter(function(l) {
        return l.kind === "videoinput";
      })), (a = (s = this._callbacks).onAvailableMicsUpdated) === null || a === void 0 || a.call(s, t.availableDevices.filter(function(l) {
        return l.kind === "audioinput";
      })), (u = (c = this._callbacks).onAvailableSpeakersUpdated) === null || u === void 0 || u.call(c, t.availableDevices.filter(function(l) {
        return l.kind === "audiooutput";
      })), this._selectedSpeaker.deviceId === "default" && this.updateSpeaker("default");
    }, e.prototype._handleSelectedDevicesUpdated = function(t) {
      var n, i, s, a, c, u;
      ((n = this._selectedCam) === null || n === void 0 ? void 0 : n.deviceId) !== t.devices.camera && (this._selectedCam = t.devices.camera, (s = (i = this._callbacks).onCamUpdated) === null || s === void 0 || s.call(i, t.devices.camera)), ((a = this._selectedMic) === null || a === void 0 ? void 0 : a.deviceId) !== t.devices.mic && (this._selectedMic = t.devices.mic, (u = (c = this._callbacks).onMicUpdated) === null || u === void 0 || u.call(c, t.devices.mic));
    }, e.prototype.handleDeviceError = function(t) {
      var n, i, s = function(a) {
        var c = [];
        switch (a.type) {
          case "permissions":
            return a.blockedMedia.forEach(function(u) {
              c.push(u === "video" ? "cam" : "mic");
            }), new Xe(c, a.type, a.msg, {
              blockedBy: a.blockedBy
            });
          case "not-found":
            return a.missingMedia.forEach(function(u) {
              c.push(u === "video" ? "cam" : "mic");
            }), new Xe(c, a.type, a.msg);
          case "constraints":
            return a.failedMedia.forEach(function(u) {
              c.push(u === "video" ? "cam" : "mic");
            }), new Xe(c, a.type, a.msg, {
              reason: a.reason
            });
          case "cam-in-use":
            return c.push("cam"), new Xe(c, "in-use", a.msg);
          case "mic-in-use":
            return c.push("mic"), new Xe(c, "in-use", a.msg);
          case "cam-mic-in-use":
            return c.push("cam"), c.push("mic"), new Xe(c, "in-use", a.msg);
          case "undefined-mediadevices":
          case "unknown":
          default:
            return c.push("cam"), c.push("mic"), new Xe(c, a.type, a.msg);
        }
      };
      (i = (n = this._callbacks).onDeviceError) === null || i === void 0 || i.call(n, s(t.error));
    }, e.prototype._handleLocalAudioLevel = function(t) {
      var n, i;
      (i = (n = this._callbacks).onLocalAudioLevel) === null || i === void 0 || i.call(n, t.audioLevel);
    }, e.prototype._handleRemoteAudioLevel = function(t) {
      var n, i;
      (i = (n = this._callbacks).onRemoteAudioLevel) === null || i === void 0 || i.call(n, t, vb());
    }, e.prototype.handleTrackStarted = function(t) {
      return je(this, void 0, void 0, function() {
        var n, i, s, a, c, u;
        return De(this, function(l) {
          switch (l.label) {
            case 0:
              if (!(!((s = t.participant) === null || s === void 0) && s.local)) return [
                2
                /*return*/
              ];
              if (t.track.kind !== "audio") return [
                3,
                15
              ];
              if (!this._mediaStreamRecorder) return [
                3,
                14
              ];
              switch (n = this._mediaStreamRecorder.getStatus(), i = n, i) {
                case "ended":
                  return [
                    3,
                    1
                  ];
                case "paused":
                  return [
                    3,
                    5
                  ];
                case "recording":
                  return [
                    3,
                    6
                  ];
              }
              return [
                3,
                6
              ];
            case 1:
              return l.trys.push([
                1,
                3,
                ,
                4
              ]), [
                4,
                this._mediaStreamRecorder.begin(t.track)
              ];
            case 2:
              return l.sent(), this._connected && (this._startRecording(), this._connectResolve && (this._connectResolve(), this._connectResolve = null)), [
                3,
                4
              ];
            case 3:
              return l.sent(), [
                3,
                4
              ];
            case 4:
              return [
                3,
                14
              ];
            case 5:
              return this._startRecording(), [
                3,
                14
              ];
            case 6:
              return this._currentAudioTrack === t.track ? [
                3,
                12
              ] : [
                4,
                this._mediaStreamRecorder.end()
              ];
            case 7:
              l.sent(), l.label = 8;
            case 8:
              return l.trys.push([
                8,
                10,
                ,
                11
              ]), [
                4,
                this._mediaStreamRecorder.begin(t.track)
              ];
            case 9:
              return l.sent(), this._startRecording(), [
                3,
                11
              ];
            case 10:
              return l.sent(), [
                3,
                11
              ];
            case 11:
              return [
                3,
                13
              ];
            case 12:
              console.warn("track-started event received for current track and already recording"), l.label = 13;
            case 13:
              return [
                3,
                14
              ];
            case 14:
              this._currentAudioTrack = t.track, l.label = 15;
            case 15:
              return (c = (a = this._callbacks).onTrackStarted) === null || c === void 0 || c.call(a, t.track, t.participant ? bd(t.participant) : void 0), (u = this.onTrackStartedCallback) === null || u === void 0 || u.call(this, t), [
                2
                /*return*/
              ];
          }
        });
      });
    }, e.prototype.handleTrackStopped = function(t) {
      var n, i, s, a;
      !((n = t.participant) === null || n === void 0) && n.local && (t.track.kind === "audio" && this._mediaStreamRecorder && this._mediaStreamRecorder.getStatus() === "recording" && this._mediaStreamRecorder.pause(), (s = (i = this._callbacks).onTrackStopped) === null || s === void 0 || s.call(i, t.track, t.participant ? bd(t.participant) : void 0), (a = this.onTrackStoppedCallback) === null || a === void 0 || a.call(this, t));
    }, e;
  })(Xh)
), bd = function(r) {
  return {
    id: r.user_id,
    local: r.local,
    name: r.user_name
  };
}, vb = function() {
  return {
    id: "bot",
    local: !1,
    name: "Bot"
  };
}, bb = {};
nb(bb, "SmallWebRTCTransport", () => ao);
class qt {
  constructor(e, t) {
    this.type = "trackStatus", this.receiver_index = e, this.enabled = t;
  }
}
class yb {
  constructor(e) {
    this.track = e, this.status = "new";
  }
}
const _b = "renegotiate", wb = "peerLeft", Zh = "signalling";
class Sb {
  constructor(e) {
    this.type = Zh, this.message = e;
  }
}
const zs = 0, Ws = 1, Gs = 2;
class ao extends qd {
  constructor(e = {}) {
    super(), this._webrtcRequest = null, this._connectResolved = null, this._connectFailed = null, this.pc = null, this.dc = null, this.audioCodec = null, this.videoCodec = null, this.pc_id = null, this.offerUrlTemplate = null, this.reconnectionAttempts = 0, this.maxReconnectionAttempts = 3, this.isReconnecting = !1, this.keepAliveInterval = null, this._iceServers = [], this._incomingTracks = /* @__PURE__ */ new Map(), this._canSendIceCandidates = !1, this._candidateQueue = [], this.__flushTimeout = null, this._flushDelay = 200, this._iceServers = e.iceServers ?? [], this._waitForICEGathering = e.waitForICEGathering ?? !1, this.audioCodec = e.audioCodec ?? null, this.videoCodec = e.videoCodec ?? null, this.offerUrlTemplate = e.offerUrlTemplate ?? null, this._webrtcRequest = this._resolveRequestInfo(e), this.mediaManager = e.mediaManager || new mb(!1, !1, async (t) => {
      this.pc && (t.type == "audio" ? (R.info("SmallWebRTCMediaManager replacing audio track"), await this.getAudioTransceiver().sender.replaceTrack(t.track)) : t.type == "video" ? (R.info("SmallWebRTCMediaManager replacing video track"), await this.getVideoTransceiver().sender.replaceTrack(t.track)) : t.type == "screenVideo" ? (R.info("SmallWebRTCMediaManager replacing screen video track"), await this.getScreenVideoTransceiver().sender.replaceTrack(t.track)) : t.type == "screenAudio" && R.info("SmallWebRTCMediaManager does not yet support screen audio. Track is ignored."));
    }, (t) => R.debug("SmallWebRTCMediaManager Track stopped:", t));
  }
  initialize(e, t) {
    this._options = e, this._callbacks = e.callbacks ?? {}, this._onMessage = t, this.mediaManager.setClientOptions(e), this.state = "disconnected", R.debug("[RTVI Transport] Initialized");
  }
  async initDevices() {
    this.state = "initializing", await this.mediaManager.initialize(), this.state = "initialized";
  }
  setAudioCodec(e) {
    this.audioCodec = e;
  }
  setVideoCodec(e) {
    this.videoCodec = e;
  }
  _resolveRequestInfo(e) {
    let t = null;
    const n = e.webrtcUrl ?? e.connectionUrl ?? null;
    if (n) {
      const i = e.webrtcUrl ? "webrtcUrl" : "connectionUrl";
      R.warn(`${i} is deprecated. Use webrtcRequestParams instead.`), e.webrtcRequestParams ? R.warn(`Both ${i} and webrtcRequestParams provided. Using webrtcRequestParams.`) : typeof n == "string" ? t = {
        endpoint: n
      } : R.error(`Invalid ${i} provided in params. Ignoring.`);
    }
    return e.webrtcRequestParams && (Ta(e.webrtcRequestParams) ? t = e.webrtcRequestParams : R.error("Invalid webrtcRequestParams provided in params. Ignoring.")), t ?? this._webrtcRequest;
  }
  _getStartEndpointAsString() {
    const e = this.startBotParams?.endpoint;
    switch (typeof e) {
      case "string":
        return e;
      case "object":
        if (e instanceof URL) return e.toString();
        if (typeof Request < "u" && e instanceof Request) return e.url;
    }
  }
  _isValidObject(e) {
    if (e == null) return !1;
    if (typeof e != "object") throw new Se("Invalid connection parameters");
    return !0;
  }
  _fixConnectionOptionsParams(e, t) {
    const n = (a) => a.replace(/_([a-z,A-Z])/g, (c, u) => u.toUpperCase());
    let i = {}, s;
    for (const [a, c] of Object.entries(e)) {
      const u = n(a);
      if (u === "sessionId") {
        s = c;
        continue;
      }
      if (!t.includes(u)) {
        R.warn(`Unrecognized connection parameter: ${a}. Ignored.`);
        continue;
      }
      i[u] = c;
    }
    return s && this._shouldUseStartBotFallback(i) && (i.webrtcRequestParams = this._buildRequestParamsBasedOnStartBotParams(s)), i;
  }
  _shouldUseStartBotFallback(e) {
    const t = !!this._getStartEndpointAsString(), n = !e.webrtcUrl && !e.connectionUrl && !e.webrtcRequestParams;
    return t && n;
  }
  _buildRequestParamsBasedOnStartBotParams(e) {
    const t = this._getStartEndpointAsString(), n = this.offerUrlTemplate ? this.offerUrlTemplate.replace(":sessionId", e) : t.replace("/start", `/sessions/${e}/api/offer`);
    return typeof Request < "u" && this.startBotParams.endpoint instanceof Request ? {
      endpoint: new Request(n, this.startBotParams?.endpoint)
    } : {
      endpoint: n,
      headers: this.startBotParams.headers
    };
  }
  _validateConnectionParams(e) {
    if (!this._isValidObject(e)) return;
    const t = e, n = [
      "webrtcUrl",
      "connectionUrl",
      "webrtcRequestParams",
      "iceConfig"
    ], i = this._fixConnectionOptionsParams(t, n), s = this._resolveRequestInfo(i);
    if (s && (i.webrtcRequestParams = s), delete i.connectionUrl, delete i.webrtcUrl, Object.keys(i).length !== 0)
      return i;
  }
  async _connect(e) {
    if (!this._abortController?.signal.aborted) {
      if (this.state = "connecting", e?.iceConfig?.iceServers && (this._iceServers = e?.iceConfig?.iceServers), this._webrtcRequest = e?.webrtcRequestParams ?? this._webrtcRequest, !this._webrtcRequest)
        throw R.error("No request details provided for WebRTC connection"), this.state = "error", new Ks();
      await this.mediaManager.connect(), await this.startNewPeerConnection(), !this._abortController?.signal.aborted && (this.dc?.readyState !== "open" && await new Promise((t, n) => {
        this._connectResolved = t, this._connectFailed = n;
      }), this.state = "connected", this._callbacks.onConnected?.(), this._callbacks.onBotConnected?.(yd(this.pc_id)));
    }
  }
  syncTrackStatus() {
    this.sendSignallingMessage(new qt(zs, this.mediaManager.isMicEnabled)), this.sendSignallingMessage(new qt(Ws, this.mediaManager.isCamEnabled)), this.mediaManager.supportsScreenShare && this.sendSignallingMessage(new qt(Gs, this.mediaManager.isSharingScreen && !!this.mediaManager.tracks().local.screenVideo));
  }
  sendReadyMessage() {
    this.state = "ready", this.sendMessage(oe.clientReady());
  }
  sendMessage(e) {
    if (!this.dc || this.dc.readyState !== "open") {
      R.warn(`Datachannel is not ready. Message not sent: ${e}`);
      return;
    }
    if (!Ia(e, this._maxMessageSize)) throw new ka("Message data too large. Max size is " + this._maxMessageSize);
    this.dc?.send(JSON.stringify(e));
  }
  sendSignallingMessage(e) {
    if (!this.dc || this.dc.readyState !== "open") {
      R.warn(`Datachannel is not ready. Message not sent: ${e}`);
      return;
    }
    const t = new Sb(e);
    this.dc?.send(JSON.stringify(t));
  }
  async _disconnect() {
    this.state = "disconnecting", await this.stop(), this.state = "disconnected";
  }
  createPeerConnection() {
    const e = {
      iceServers: this._iceServers
    };
    let t = new RTCPeerConnection(e);
    return t.onicecandidate = async (n) => {
      n.candidate ? (R.debug("New ICE candidate:", n.candidate), await this.sendIceCandidate(n.candidate)) : R.info("All ICE candidates have been sent.");
    }, t.addEventListener("icegatheringstatechange", () => {
      t.iceGatheringState === "complete" && t.iceConnectionState === "checking" && this._waitForICEGathering && (R.info("Ice gathering completed and connection is still checking. Trying to reconnect."), this.attemptReconnection(!1));
    }), t.addEventListener("iceconnectionstatechange", () => this.handleICEConnectionStateChange()), R.debug(`iceConnectionState: ${t.iceConnectionState}`), t.addEventListener("signalingstatechange", () => {
      R.debug(`signalingState: ${this.pc.signalingState}`), this.pc.signalingState == "stable" && this.handleReconnectionCompleted();
    }), R.debug(`signalingState: ${t.signalingState}`), t.addEventListener("track", (n) => {
      const i = n.transceiver ? n.transceiver.mid === "0" ? "microphone" : n.transceiver.mid === "1" ? "camera" : "screenVideo" : null;
      if (!i) {
        R.warn("Received track without transceiver mid", n);
        return;
      }
      R.debug(`Received new remote track for ${i}`), this._incomingTracks.set(i, new yb(n.track)), n.track.addEventListener("unmute", () => {
        const s = this._incomingTracks.get(i);
        s && (R.debug(`Remote track unmuted: ${i}`), s.status = "unmuted", this._callbacks.onTrackStarted?.(n.track));
      }), n.track.addEventListener("mute", () => {
        const s = this._incomingTracks.get(i);
        !s || s.status !== "unmuted" || (R.debug(`Remote track muted: ${i}`), s.status = "muted", this._callbacks.onTrackStopped?.(n.track));
      }), n.track.addEventListener("ended", () => {
        R.debug(`Remote track ended: ${i}`), this._callbacks.onTrackStopped?.(n.track), this._incomingTracks.delete(i);
      });
    }), t;
  }
  handleICEConnectionStateChange() {
    this.pc && (R.debug(`ICE Connection State: ${this.pc.iceConnectionState}`), this.pc.iceConnectionState === "failed" ? (R.debug("ICE connection failed, attempting restart."), this.attemptReconnection(!0)) : this.pc.iceConnectionState === "disconnected" && setTimeout(() => {
      this.pc?.iceConnectionState === "disconnected" && (R.debug("Still disconnected, attempting reconnection."), this.attemptReconnection(!0));
    }, 5e3));
  }
  handleReconnectionCompleted() {
    this.reconnectionAttempts = 0, this.isReconnecting = !1;
  }
  async attemptReconnection(e = !1) {
    if (this.isReconnecting) {
      R.debug("Reconnection already in progress, skipping.");
      return;
    }
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      R.debug("Max reconnection attempts reached. Stopping transport."), await this.stop();
      return;
    }
    if (this.isReconnecting = !0, this.reconnectionAttempts++, R.debug(`Reconnection attempt ${this.reconnectionAttempts}...`), e) {
      const t = this.pc;
      await this.startNewPeerConnection(e), t && (R.debug("closing old peer connection"), this.closePeerConnection(t));
    } else await this.negotiate();
  }
  async waitForIceGatheringComplete(e = 2e3) {
    const t = this.pc;
    if (t.iceGatheringState !== "complete")
      return R.info("Waiting for ICE gathering to complete. Current state:", t.iceGatheringState), new Promise((n) => {
        let i;
        const s = () => {
          t.removeEventListener("icegatheringstatechange", a), clearTimeout(i);
        }, a = () => {
          R.debug("icegatheringstatechange:", t.iceGatheringState), t.iceGatheringState === "complete" && (s(), n());
        }, c = () => {
          R.debug(`ICE gathering timed out after ${e} ms.`), s(), n();
        };
        t.addEventListener("icegatheringstatechange", a), i = setTimeout(c, e), a();
      });
  }
  async sendIceCandidate(e) {
    if (!this._webrtcRequest) {
      R.error("No request details provided for WebRTC connection");
      return;
    }
    this._candidateQueue.push(e), this.__flushTimeout || (this.__flushTimeout = setTimeout(() => this.flushIceCandidates(), this._flushDelay));
  }
  async flushIceCandidates() {
    if (this.__flushTimeout = null, !this._webrtcRequest || this._candidateQueue.length === 0 || !this._canSendIceCandidates) return;
    const e = this._candidateQueue.splice(0, this._candidateQueue.length);
    let t;
    try {
      typeof Request < "u" && this._webrtcRequest.endpoint instanceof Request ? (console.log("Using Request object headers"), t = this._webrtcRequest.endpoint.headers) : t = new Headers({
        "Content-Type": "application/json",
        ...Object.fromEntries((this._webrtcRequest.headers ?? new Headers()).entries())
      });
      const n = {
        pc_id: this.pc_id,
        candidates: e.map((i) => ({
          candidate: i.candidate,
          sdp_mid: i.sdpMid,
          sdp_mline_index: i.sdpMLineIndex
        }))
      };
      await fetch(this._webrtcRequest.endpoint, {
        method: "PATCH",
        headers: t,
        body: JSON.stringify(n)
      });
    } catch (n) {
      R.error(`Failed to send ICE candidate: ${n}`);
    }
  }
  async negotiate(e = !1) {
    if (!this.pc) return Promise.reject("Peer connection is not initialized");
    if (!this._webrtcRequest)
      throw R.error("No request details provided for WebRTC connection"), this.state = "error", new Ks();
    try {
      const t = await this.pc.createOffer();
      await this.pc.setLocalDescription(t), this._waitForICEGathering && await this.waitForIceGatheringComplete();
      let n = this.pc.localDescription;
      this.audioCodec && this.audioCodec !== "default" && (n.sdp = this.sdpFilterCodec("audio", this.audioCodec, n.sdp)), this.videoCodec && this.videoCodec !== "default" && (n.sdp = this.sdpFilterCodec("video", this.videoCodec, n.sdp)), R.debug(`Will create offer for peerId: ${this.pc_id}`);
      const i = {
        sdp: n.sdp,
        type: n.type,
        pc_id: this.pc_id,
        restart_pc: e
      };
      let s;
      typeof Request < "u" && this._webrtcRequest.endpoint instanceof Request ? s = {
        endpoint: new Request(this._webrtcRequest.endpoint, {
          body: JSON.stringify(i)
        })
      } : (s = rb(this._webrtcRequest), this._webrtcRequest.requestData && (i.requestData = this._webrtcRequest.requestData), s.requestData = i);
      const a = await Oa(s);
      this.pc_id = a.pc_id, R.debug(`Received answer for peer connection id ${a.pc_id}`), await this.pc.setRemoteDescription(a);
    } catch (t) {
      R.debug(`Reconnection attempt ${this.reconnectionAttempts} failed: ${t}`), this.isReconnecting = !1, setTimeout(() => this.attemptReconnection(!0), 2e3);
    }
  }
  addInitialTransceivers() {
    this.pc.addTransceiver("audio", {
      direction: "sendrecv"
    }), this.pc.addTransceiver("video", {
      direction: "sendrecv"
    }), this.mediaManager.supportsScreenShare && this.pc.addTransceiver("video", {
      direction: "sendonly"
    });
  }
  getAudioTransceiver() {
    return this.pc.getTransceivers()[zs];
  }
  getVideoTransceiver() {
    return this.pc.getTransceivers()[Ws];
  }
  getScreenVideoTransceiver() {
    return this.pc.getTransceivers()[Gs];
  }
  async startNewPeerConnection(e = !1) {
    this.pc = this.createPeerConnection(), this.addInitialTransceivers(), this.dc = this.createDataChannel("chat", {
      ordered: !0
    }), await this.addUserMedia(), await this.negotiate(e), this._canSendIceCandidates = !0, await this.flushIceCandidates();
  }
  async addUserMedia() {
    R.debug(`addUserMedia this.tracks(): ${this.tracks()}`);
    let e = this.tracks().local.audio;
    R.debug(`addUserMedia audioTrack: ${e}`), e && await this.getAudioTransceiver().sender.replaceTrack(e);
    let t = this.tracks().local.video;
    R.debug(`addUserMedia videoTrack: ${t}`), t && await this.getVideoTransceiver().sender.replaceTrack(t), this.mediaManager.supportsScreenShare && (t = this.tracks().local.screenVideo, R.debug(`addUserMedia screenVideoTrack: ${t}`), t && await this.getScreenVideoTransceiver().sender.replaceTrack(t));
  }
  // Method to handle a general message (this can be expanded for other types of messages)
  handleMessage(e) {
    try {
      const t = JSON.parse(e);
      R.debug("received message:", t), t.type === Zh ? this.handleSignallingMessage(t) : t.label === "rtvi-ai" && this._onMessage({
        id: t.id,
        type: t.type,
        data: t.data
      });
    } catch (t) {
      R.error("Failed to parse JSON message:", t);
    }
  }
  // Method to handle signalling messages specifically
  async handleSignallingMessage(e) {
    const t = e;
    switch (t.message.type) {
      case _b:
        this.attemptReconnection(!1);
        break;
      case wb:
        this._callbacks.onBotDisconnected?.(yd(this.pc_id));
        break;
      default:
        R.warn("Unknown signalling message:", t.message);
    }
  }
  createDataChannel(e, t) {
    const n = this.pc.createDataChannel(e, t);
    return n.addEventListener("close", () => {
      R.debug("datachannel closed"), this.keepAliveInterval && (clearInterval(this.keepAliveInterval), this.keepAliveInterval = null);
    }), n.addEventListener("open", () => {
      R.debug("datachannel opened"), this._maxMessageSize = this.pc?.sctp?.maxMessageSize ?? 65536, this._connectResolved && (this.syncTrackStatus(), this._connectResolved(), this._connectResolved = null, this._connectFailed = null), this.keepAliveInterval = setInterval(() => {
        const i = "ping: " + (/* @__PURE__ */ new Date()).getTime();
        n.send(i);
      }, 1e3);
    }), n.addEventListener("message", (i) => {
      let s = i.data;
      this.handleMessage(s);
    }), n;
  }
  closePeerConnection(e) {
    e.getTransceivers().forEach((t) => {
      t.stop && t.stop();
    }), e.getSenders().forEach((t) => {
      t.track?.stop();
    }), e.close();
  }
  async stop() {
    if (!this.pc) {
      R.debug("Peer connection is already closed or null.");
      return;
    }
    this.dc && this.dc.close(), this.closePeerConnection(this.pc), this.pc = null, await this.mediaManager.disconnect(), this.pc_id = null, this.reconnectionAttempts = 0, this.isReconnecting = !1, this._callbacks.onDisconnected?.(), this._candidateQueue = [], this._canSendIceCandidates = !1, this._connectFailed && this._connectFailed(), this._connectFailed = null, this._connectResolved = null;
  }
  getAllMics() {
    return this.mediaManager.getAllMics();
  }
  getAllCams() {
    return this.mediaManager.getAllCams();
  }
  getAllSpeakers() {
    return this.mediaManager.getAllSpeakers();
  }
  async updateMic(e) {
    return this.mediaManager.updateMic(e);
  }
  updateCam(e) {
    return this.mediaManager.updateCam(e);
  }
  updateSpeaker(e) {
    return this.mediaManager.updateSpeaker(e);
  }
  get selectedMic() {
    return this.mediaManager.selectedMic;
  }
  get selectedCam() {
    return this.mediaManager.selectedCam;
  }
  get selectedSpeaker() {
    return this.mediaManager.selectedSpeaker;
  }
  set iceServers(e) {
    this._iceServers = e;
  }
  get iceServers() {
    return this._iceServers;
  }
  enableMic(e) {
    this.mediaManager.enableMic(e), this.sendSignallingMessage(new qt(zs, e));
  }
  enableCam(e) {
    this.mediaManager.enableCam(e), this.sendSignallingMessage(new qt(Ws, e));
  }
  async enableScreenShare(e) {
    if (!this.mediaManager.supportsScreenShare) throw new Ut("enableScreenShare", "mediaManager", "Screen sharing is not supported by the current media manager");
    this.mediaManager.enableScreenShare(e), this.sendSignallingMessage(new qt(Gs, e));
  }
  get isCamEnabled() {
    return this.mediaManager.isCamEnabled;
  }
  get isMicEnabled() {
    return this.mediaManager.isMicEnabled;
  }
  get isSharingScreen() {
    return this.mediaManager.isSharingScreen;
  }
  get state() {
    return this._state;
  }
  set state(e) {
    this._state !== e && (this._state = e, this._callbacks.onTransportStateChanged?.(e));
  }
  tracks() {
    return this.mediaManager.tracks();
  }
  sdpFilterCodec(e, t, n) {
    const i = [], s = new RegExp("a=fmtp:(\\d+) apt=(\\d+)\\r$"), a = new RegExp("a=rtpmap:([0-9]+) " + this.escapeRegExp(t)), c = new RegExp("(m=" + e + " .*?)( ([0-9]+))*\\s*$"), u = n.split(`
`);
    let l = !1;
    for (let y = 0; y < u.length; y++)
      if (u[y].startsWith("m=" + e + " ") ? l = !0 : u[y].startsWith("m=") && (l = !1), l) {
        const M = u[y].match(a);
        M && i.push(parseInt(M[1]));
        const b = u[y].match(s);
        b && i.includes(parseInt(b[2])) && i.push(parseInt(b[1]));
      }
    const f = "a=(fmtp|rtcp-fb|rtpmap):([0-9]+)";
    let p = "";
    l = !1;
    for (let y = 0; y < u.length; y++)
      if (u[y].startsWith("m=" + e + " ") ? l = !0 : u[y].startsWith("m=") && (l = !1), l) {
        const M = u[y].match(f);
        if (M && !i.includes(parseInt(M[2]))) continue;
        u[y].match(c) ? p += u[y].replace(c, "$1 " + i.join(" ")) + `
` : p += u[y] + `
`;
      } else p += u[y] + `
`;
    return p;
  }
  escapeRegExp(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
ao.SERVICE_NAME = "small-webrtc-transport";
const yd = (r) => ({
  id: r || "bot",
  local: !1,
  name: "bot"
});
function _d(r) {
  return JSON.parse(JSON.stringify(r));
}
async function kb(r) {
  let e = !1;
  const t = /* @__PURE__ */ new Map(), n = (s, a) => {
    if (!(!r.onAudioSpectrum || t.has(s.id)))
      try {
        const c = new AudioContext({ latencyHint: "interactive" }), u = new MediaStream([s]), l = c.createMediaStreamSource(u), f = c.createAnalyser();
        f.fftSize = 256, f.minDecibels = -92, f.maxDecibels = -18, f.smoothingTimeConstant = 0.58, l.connect(f);
        const p = new Float32Array(f.frequencyBinCount);
        let y = 0, M = !1;
        const b = (E, O) => {
          const I = c.sampleRate / 2, k = Math.max(0, Math.floor(E / I * p.length)), S = Math.min(p.length - 1, Math.ceil(O / I * p.length));
          let T = 0, L = 0;
          for (let D = k; D <= S; D += 1) {
            const N = p[D] ?? f.minDecibels, $ = Math.max(0, Math.min(1, (N - f.minDecibels) / 74));
            T += $ * $, L += 1;
          }
          return L > 0 ? Math.sqrt(T / L) : 0;
        }, v = () => {
          M || (f.getFloatFrequencyData(p), r.onAudioSpectrum?.(a, {
            bass: b(75, 320),
            mid: b(320, 2400),
            treble: b(2400, 7200)
          }), y = requestAnimationFrame(v));
        }, C = () => {
          M || (M = !0, cancelAnimationFrame(y), l.disconnect(), f.disconnect(), t.delete(s.id), c.close().catch(() => {
          }));
        };
        t.set(s.id, C), s.addEventListener("ended", C, { once: !0 }), c.resume().catch(() => {
        }), y = requestAnimationFrame(v);
      } catch {
      }
  }, i = new ke({
    transport: new ao(),
    enableMic: !0,
    enableCam: !1,
    callbacks: {
      onTransportStateChanged: (s) => {
        (s === "connecting" || s === "authenticating") && r.onState("connecting");
      },
      onBotReady: () => r.onState("listening"),
      onUserStartedSpeaking: () => r.onState("listening"),
      onUserStoppedSpeaking: () => r.onState("thinking"),
      onBotStartedSpeaking: () => r.onState("speaking"),
      onBotStoppedSpeaking: () => r.onState("listening"),
      onUserTranscript: (s) => r.onUserTranscript(s.text, s.final),
      onBotLlmText: (s) => r.onAssistantDelta(s.text),
      onLocalAudioLevel: (s) => r.onAudioLevel?.("user", s),
      onRemoteAudioLevel: (s) => r.onAudioLevel?.("assistant", s),
      onServerMessage: (s) => {
        const a = s?.data ?? s;
        (a?.type === "voomate-turn-started" || a?.type === "voomate-turn-complete") && typeof a.conversationId == "string" && r.onConversationId(a.conversationId), a?.type === "voomate-turn-complete" && Array.isArray(a.clientCommands) && r.onClientCommands?.(a.clientCommands);
      },
      onTrackStarted: (s, a) => {
        if (s.kind !== "audio") return;
        const c = a?.local ? "user" : "assistant";
        n(s, c), a?.local || (r.audioElement.srcObject = new MediaStream([s]), r.audioElement.play().catch(() => {
        }));
      },
      onDisconnected: () => r.onState("ended"),
      onError: () => r.onError("Voice connection failed. You can continue by chat."),
      onDeviceError: () => r.onError("Microphone access is unavailable. Chat still works.")
    }
  });
  return r.onState("connecting"), await i.startBotAndConnect({
    endpoint: r.endpoint,
    timeout: 15e3,
    requestData: {
      transport: "webrtc",
      createDailyRoom: !1,
      enableDefaultIceServers: !0,
      body: {
        sessionToken: r.sessionToken,
        conversationId: r.conversationId ?? null,
        pageUrl: r.pageUrl,
        ...r.pageContext ? { pageContext: _d(r.pageContext) } : {}
      }
    }
  }), {
    async disconnect() {
      r.audioElement.srcObject = null;
      for (const s of t.values()) s();
      t.clear(), await i.disconnect();
    },
    updatePageContext(s, a) {
      i.sendClientMessage("voomate-page-context", {
        pageUrl: s,
        ...a ? { pageContext: _d(a) } : {}
      });
    },
    setMuted(s) {
      e = s, i.enableMic(!s);
    },
    get muted() {
      return e;
    }
  };
}
export {
  kb as createVoiceSession
};
//# sourceMappingURL=voice-client.js.map
