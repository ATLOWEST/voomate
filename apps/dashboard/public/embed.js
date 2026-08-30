/* global CSS, CSSStyleSheet, HTMLElement, MutationObserver, URL, console, customElements, document, fetch, window */
(() => {
  'use strict';

  const script = document.currentScript;
  if (!script) return;
  const publicKey = script.dataset.agent;
  if (!publicKey) {
    console.error('[Voomate] data-agent is required.');
    return;
  }

  const assetOrigin = new URL(script.src, document.baseURI).origin;
  const apiOrigin = script.dataset.api || assetOrigin;
  let identityToken = script.dataset.userToken;
  const identityEndpoint = script.dataset.identityEndpoint;
  // Legacy installations may still provide a same-origin server claim endpoint. New installs use
  // a short-lived well-known domain challenge, so public sites need no permanent server key or
  // framework-specific POST route merely to prove where the SDK is installed.
  const setupEndpoint = script.dataset.setupEndpoint;
  const widgetModule = new URL('/embed/v2/widget.js', assetOrigin).href;

  // This observes only public, same-origin route hints that the browser is already rendering.
  // It is not a source-code scan and it never changes authorization. A host can make coverage
  // exact by publishing its named paths in data-voomate-route-manifest (see the SDK guide).
  const collectRouteInventory = () => {
    const routes = [];
    const seen = new Set();
    const add = (pathname, name, source) => {
      if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('..'))
        return;
      const normalized = pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/';
      if (seen.has(normalized) || routes.length >= 240) return;
      seen.add(normalized);
      routes.push({
        pathname: normalized,
        ...(typeof name === 'string' && name.trim() ? { name: name.trim().slice(0, 120) } : {}),
        source,
      });
    };
    // Path-only discovery is enough to let the merchant control placement. Page titles and
    // content are deliberately not collected before the route policy has allowed a session.
    add(window.location.pathname, undefined, 'current');
    const manifest = document.querySelector(
      'script[type="application/json"][data-voomate-route-manifest]',
    );
    if (manifest?.textContent) {
      try {
        const parsed = JSON.parse(manifest.textContent);
        for (const surface of Array.isArray(parsed?.surfaces) ? parsed.surfaces : []) {
          for (const prefix of Array.isArray(surface?.pathPrefixes) ? surface.pathPrefixes : []) {
            add(prefix, surface?.name, 'manifest');
          }
        }
      } catch {
        /* Invalid host manifest is ignored; the product must keep working. */
      }
    }
    for (const link of document.querySelectorAll('a[href]')) {
      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin === window.location.origin) add(url.pathname, undefined, 'navigation');
      } catch {
        /* Ignore malformed host links. */
      }
    }
    return { version: 1, routes };
  };

  const callSameOriginEndpoint = async (value, body) => {
    const endpoint = new URL(value, window.location.href);
    if (endpoint.origin !== window.location.origin) {
      throw new Error('Voomate setup endpoints must use the current site origin.');
    }
    const response = await fetch(endpoint.href, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Voomate server setup verification failed.');
    return payload;
  };

  const announceInstallation = async (inventory) => {
    if (!setupEndpoint) return;
    const payload = await callSameOriginEndpoint(setupEndpoint, {
      pageUrl: window.location.href,
      routes: inventory.routes,
    });
    if (typeof payload.token === 'string' && payload.token.length <= 4_096) {
      identityToken = payload.token;
    }
  };

  // A public observation gives the merchant instant installation feedback. It deliberately uses
  // a CORS-safelisted request: before a domain is verified it cannot be in the API's dashboard
  // CORS allowlist, and a JSON preflight would prevent the receipt from ever reaching Voomate.
  // `data-agent` is the unique public installation ID for exactly one agent and tenant. It is
  // not an approval: only the backend-verified well-known installation challenge (or a legacy
  // server claim) can authorize the domain and make the agent eligible to run.
  const observeInstallation = async (inventory) => {
    const endpoint = new URL('/api/v1/widget/installations/observe', apiOrigin);
    await fetch(endpoint.href, {
      method: 'POST',
      // no-cors + a string body is intentionally fire-and-forget. The browser sends an Origin
      // header, while the API never needs to reveal any response to this public operation.
      mode: 'no-cors',
      body: JSON.stringify({
        embedKey: publicKey,
        pathname: window.location.pathname,
        routes: inventory.routes,
      }),
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
    });
  };

  class VoomateAgent extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.loaded = false;
    }

    connectedCallback() {
      if (this.loaded || !this.shadowRoot) return;
      const css = new CSSStyleSheet();
      css.replaceSync(`
        :host{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;font-family:Geist,"Helvetica Neue",Arial,sans-serif;color-scheme:light}
        *{box-sizing:border-box}
        button{height:59px;display:flex;align-items:center;gap:10px;padding:5px 16px 5px 5px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:#0a0a0a;color:#fff;box-shadow:0 18px 46px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.12);cursor:pointer;animation:voomate-arrive .72s cubic-bezier(.16,1,.3,1) both;font:600 12.5px/1.1 inherit;letter-spacing:-.01em}
        button:hover{transform:translateY(-3px);box-shadow:0 22px 54px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.14)}
        button:active{transform:translateY(-1px) scale(.98)}
        button:focus-visible{outline:3px solid rgba(66,118,255,.35);outline-offset:4px}
        button:disabled{cursor:wait;opacity:.72}
        .mark{position:relative;width:45px;height:45px;display:grid;place-items:center;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 34% 28%,#fff 0 4%,#aac5ff 16%,#5b6fff 35%,#151515 72%);box-shadow:inset 0 0 14px rgba(255,255,255,.22)}
        .mark::before,.mark::after{content:"";position:absolute;border:1px solid rgba(255,255,255,.52);border-radius:50%;animation:voomate-orbit 4s linear infinite}
        .mark::before{width:31px;height:12px}.mark::after{width:12px;height:31px;animation-direction:reverse}
        .copy{display:grid;gap:3px;text-align:left;white-space:nowrap}.title{font-size:12.5px}.hint{font-size:9.5px;font-weight:500;color:rgba(255,255,255,.56);letter-spacing:.01em}
        @keyframes voomate-arrive{from{opacity:0;transform:translate3d(30px,16px,0) scale(.86)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
        @keyframes voomate-orbit{to{transform:rotate(1turn)}}
        @media(max-width:520px){:host{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.copy{display:none}button{width:57px;height:57px;padding:5px}.mark{width:45px;height:45px}}
        @media(prefers-reduced-motion:reduce){button{animation:none;transition:none}.mark::before,.mark::after{animation:none}}
      `);
      this.shadowRoot.adoptedStyleSheets = [css];
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Open assistant');
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'copy';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = 'Ask Voomate';
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = 'Chat or speak';
      copy.append(title, hint);
      button.append(mark, copy);
      const mount = async () => {
        if (this.loaded) return;
        button.disabled = true;
        try {
          const { mountWidget } = await import(widgetModule);
          this.loaded = true;
          await mountWidget(this, { publicKey, apiOrigin, identityToken, identityEndpoint });
          this.setAttribute('data-voomate-mounted', 'true');
        } catch (error) {
          button.disabled = false;
          console.error('[Voomate] Widget failed to load.', error);
        }
      };
      button.addEventListener('click', mount);
      this.shadowRoot.append(button);

      try {
        const stored = JSON.parse(
          window.sessionStorage.getItem(`voomate:v2:journey:${String(publicKey).slice(0, 80)}`) ??
            'null',
        );
        if (stored?.version === 1 && typeof stored.continuationToken === 'string') {
          window.setTimeout(() => void mount(), 0);
        }
      } catch {
        // The normal click-to-open path remains available when storage is disabled or malformed.
      }
    }
  }

  if (!customElements.get('voomate-agent')) customElements.define('voomate-agent', VoomateAgent);
  const mountLauncher = () => {
    if (document.querySelector(`voomate-agent[data-voomate-agent="${CSS.escape(publicKey)}"]`)) {
      return;
    }
    const element = document.createElement('voomate-agent');
    element.setAttribute('data-agent', publicKey);
    element.setAttribute('data-voomate-agent', publicKey);
    document.body.append(element);
  };
  const unmountLauncher = () => {
    document
      .querySelector(`voomate-agent[data-voomate-agent="${CSS.escape(publicKey)}"]`)
      ?.remove();
  };

  let accessCheckSequence = 0;
  const checkAccess = async () => {
    const sequence = ++accessCheckSequence;
    const response = await fetch(`${apiOrigin}/api/web-agent/access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicKey, pageUrl: window.location.href }),
      credentials: 'omit',
      cache: 'no-store',
    });
    if (sequence !== accessCheckSequence) return response.ok;
    script.dataset.voomateStatus = response.ok ? 'active' : 'not-active';
    if (response.ok) mountLauncher();
    else unmountLauncher();
    return response.ok;
  };

  // This request is both the real installation verification and the policy gate. The launcher
  // is not shown until the control plane confirms that this exact origin and page are allowed
  // and the agent is live. Draft agents therefore prove their SDK installation without exposing
  // a misleading button that cannot answer yet.
  let lastReportedInventory = '';
  const verifyAndMount = async () => {
    try {
      const routeInventory = collectRouteInventory();
      const inventorySignature = JSON.stringify(routeInventory.routes);
      if (inventorySignature !== lastReportedInventory) {
        // Reporting is path-only and never grants access. The backend challenge proves domain
        // ownership; a temporary legacy setup-endpoint failure must not break a live agent.
        await Promise.all([
          observeInstallation(routeInventory).catch(() => undefined),
          announceInstallation(routeInventory).catch(() => undefined),
        ]);
        lastReportedInventory = inventorySignature;
      }
      await checkAccess();
    } catch {
      // A temporary network failure must not interrupt the host product. The next page load
      // retries verification; the agent never renders a broken or unauthorized launcher.
      script.dataset.voomateStatus = 'unavailable';
      unmountLauncher();
    }
  };

  let verificationTimer;
  let lastScheduledUrl = '';
  const scheduleVerification = (force = false) => {
    const nextUrl = window.location.href;
    if (!force && nextUrl === lastScheduledUrl) return;
    lastScheduledUrl = nextUrl;
    window.clearTimeout(verificationTimer);
    verificationTimer = window.setTimeout(() => void verifyAndMount(), 120);
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method];
    window.history[method] = function voomateHistoryUpdate(...args) {
      const result = original.apply(this, args);
      scheduleVerification();
      return result;
    };
  }
  window.addEventListener('popstate', scheduleVerification);
  window.addEventListener('hashchange', scheduleVerification);
  window.addEventListener('voomate:agent-configuration-updated', () => scheduleVerification(true));

  // Framework routers and permission-aware menus often reveal links after the first render.
  // Observe those real anchors, then send only their normalized paths when the set changes.
  const routeObserver = new MutationObserver(() => {
    const inventorySignature = JSON.stringify(collectRouteInventory().routes);
    if (inventorySignature !== lastReportedInventory) scheduleVerification(true);
  });
  routeObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Existing sessions are invalidated immediately by the server lease rotation. This small
  // heartbeat also removes the visible launcher within two seconds on already-open pages.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void checkAccess().catch(unmountLauncher);
  }, 2_000);
  scheduleVerification();
})();
