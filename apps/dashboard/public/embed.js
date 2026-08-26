/* global CSSStyleSheet, HTMLElement, URL, console, customElements, document, window */
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
  const widgetModule = new URL('/embed/v2/widget.js', assetOrigin).href;

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
          await mountWidget(this, { publicKey, apiOrigin });
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

  // This request is both the real installation verification and the policy gate. The launcher
  // is not shown until the control plane confirms that this exact origin and page are allowed
  // and the agent is live. Draft agents therefore prove their SDK installation without exposing
  // a misleading button that cannot answer yet.
  const verifyAndMount = async () => {
    try {
      const response = await fetch(`${apiOrigin}/api/web-agent/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publicKey, pageUrl: window.location.href }),
        credentials: 'omit',
        cache: 'no-store',
      });
      script.dataset.voomateStatus = response.ok ? 'active' : 'not-active';
      if (response.ok) mountLauncher();
    } catch {
      // A temporary network failure must not interrupt the host product. The next page load
      // retries verification; the agent never renders a broken or unauthorized launcher.
      script.dataset.voomateStatus = 'unavailable';
    }
  };

  void verifyAndMount();
})();
