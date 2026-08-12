/* global CSSStyleSheet, document, fetch, navigator, window */
const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(`
  :host{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111827;color-scheme:light}
  *{box-sizing:border-box}
  .panel{width:min(390px,calc(100vw - 24px));height:min(620px,calc(100dvh - 24px));display:grid;grid-template-rows:auto 1fr auto auto;background:#fff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.24)}
  header{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#4f46e5;color:#fff}
  .identity{min-width:0;flex:1}.name{font-size:15px;font-weight:700}.presence{font-size:12px;opacity:.85}
  .icon{width:40px;height:40px;border:0;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;font:600 18px/1 system-ui}
  .icon:focus-visible,.send:focus-visible,input:focus-visible{outline:3px solid #c7d2fe;outline-offset:2px}
  .messages{overflow:auto;padding:18px 14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;scroll-behavior:smooth}
  .message{max-width:84%;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
  .assistant{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px}.visitor{align-self:flex-end;background:#4f46e5;color:#fff;border-bottom-right-radius:4px}
  .status{font-size:12px;color:#64748b;padding:0 2px}.composer{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;background:#fff;border-top:1px solid #e5e7eb}
  input{min-width:0;height:44px;border:1px solid #d1d5db;border-radius:12px;padding:0 12px;background:#fff;color:#111827;font:14px/1.2 inherit}
  .send{height:44px;border:0;border-radius:12px;padding:0 16px;background:#4f46e5;color:#fff;cursor:pointer;font:700 14px/1 inherit}.send:disabled{opacity:.55;cursor:not-allowed}
  .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  @media (max-width:520px){:host{inset:0}.panel{width:100vw;height:100dvh;border:0;border-radius:0}.message{max-width:90%}}
  @media (prefers-reduced-motion:reduce){.messages{scroll-behavior:auto}}
`);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The assistant could not be reached.');
  return payload;
}

export async function mountWidget(host, config) {
  const root = host.shadowRoot;
  root.replaceChildren();
  root.adoptedStyleSheets = [stylesheet];

  const panel = element('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Business assistant');
  const header = element('header');
  const identity = element('div', 'identity');
  const name = element('div', 'name', 'Assistant');
  const presence = element('div', 'presence', 'Connecting…');
  identity.append(name, presence);
  const close = element('button', 'icon', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close assistant');
  close.addEventListener('click', () => {
    host.remove();
  });
  header.append(identity, close);

  const messages = element('div', 'messages');
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-live', 'polite');
  const status = element('div', 'status');
  status.setAttribute('role', 'status');

  const form = element('form', 'composer');
  const label = element('label', 'sr', 'Message');
  label.htmlFor = 'voomate-message';
  const input = element('input');
  input.id = 'voomate-message';
  input.name = 'message';
  input.autocomplete = 'off';
  input.placeholder = 'Type a message…';
  input.maxLength = 4000;
  const send = element('button', 'send', 'Send');
  send.type = 'submit';
  form.append(label, input, send);
  panel.append(header, messages, status, form);
  root.append(panel);

  let token;
  let conversationId;
  const addMessage = (role, text) => {
    messages.append(element('div', `message ${role}`, text));
    messages.scrollTop = messages.scrollHeight;
  };

  try {
    const session = await postJson(`${config.apiOrigin}/api/web-agent/session`, {
      publicKey: config.publicKey,
    });
    token = session.session.token;
    name.textContent = session.agent.displayName;
    presence.textContent = 'Online · Chat';
    addMessage('assistant', session.agent.greeting);

    const micAvailable = Boolean(navigator.mediaDevices?.getUserMedia);
    if (session.agent.voiceEnabled && !micAvailable) presence.textContent = 'Online · Chat only';
    input.focus();
  } catch (error) {
    presence.textContent = 'Unavailable';
    addMessage('assistant', error instanceof Error ? error.message : 'Assistant unavailable.');
    input.disabled = true;
    send.disabled = true;
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || !token) return;
    addMessage('visitor', message);
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    status.textContent = `${name.textContent} is thinking…`;
    try {
      const response = await postJson(
        `${config.apiOrigin}/api/web-agent/messages`,
        { message, conversationId, pageUrl: window.location.href },
        token,
      );
      conversationId = response.conversationId;
      addMessage('assistant', response.message);
    } catch (error) {
      addMessage(
        'assistant',
        error instanceof Error ? error.message : 'I could not complete that request.',
      );
    } finally {
      status.textContent = '';
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  });
}
