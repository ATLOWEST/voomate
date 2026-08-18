/**
 * The loader — the only code of ours that runs on the merchant's page.
 *
 * Responsibilities, and nothing beyond them:
 *   1. Read config from the <script> tag.
 *   2. Create the launcher bubble and the (lazily created) iframe.
 *   3. Bridge postMessage between the page and the iframe, with origin checks.
 *
 * Constraints this file lives under:
 *   - < 5kb gzipped. It loads for every visitor on every page.
 *   - No dependencies. No framework.
 *   - No inline <style> or eval — merchants with a strict CSP must be able to install it
 *     without weakening their policy, and `unsafe-inline` is the most common blocker.
 *   - Never touch the host page's globals beyond the single namespace below.
 */
// Imported from the subpath, never the '@voomate/core' barrel. The barrel re-exports
// contracts.ts, which pulls in zod — measured at ~12kb gzipped, on every merchant page,
// to validate a message shape this file already narrows by hand. widget-protocol.ts has
// no imports of its own, so this entry point stays dependency-free.
import {
  parseFrameEnvelope,
  wrapHostMessage,
  WIDGET_PROTOCOL_VERSION,
  type FrameToHostMessage,
  type HostToFrameMessage,
} from '@voomate/core/widget-protocol';

interface LoaderConfig {
  embedKey: string;
  origin: string;
  position: 'bottom-right' | 'bottom-left';
}

const NAMESPACE = '__voomate';

const readConfig = (): LoaderConfig | undefined => {
  // `document.currentScript` is correct during synchronous execution; the querySelector
  // fallback covers async/deferred loading, where currentScript is null.
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-voomate-key]');

  const embedKey = script?.dataset.voomateKey;
  if (script === null || embedKey === undefined || embedKey === '') {
    // Fail quietly but visibly in the console. Throwing here would surface as an error in
    // the merchant's own monitoring and get blamed on their code.
    console.error('[voomate] Missing data-voomate-key on the embed script.');
    return undefined;
  }

  return {
    embedKey,
    // Defaults to the origin the script itself was served from, so a self-hosted or
    // region-specific deployment works without extra configuration.
    origin: script.dataset.voomateOrigin ?? new URL(script.src).origin,
    position: script.dataset.voomatePosition === 'bottom-left' ? 'bottom-left' : 'bottom-right',
  };
};

const init = (config: LoaderConfig): void => {
  const globals = window as unknown as Record<string, unknown>;
  if (globals[NAMESPACE] !== undefined) return; // already initialised
  globals[NAMESPACE] = { version: WIDGET_PROTOCOL_VERSION };

  let frame: HTMLIFrameElement | undefined;
  let open = false;

  const container = document.createElement('div');
  container.setAttribute('data-voomate-container', '');
  // Positioned via cssText rather than a stylesheet so we never mutate the merchant's CSS,
  // and via a high z-index because merchant layouts routinely use large values.
  container.style.cssText = [
    'position:fixed',
    'bottom:20px',
    config.position === 'bottom-left' ? 'left:20px' : 'right:20px',
    'z-index:2147483000',
    'width:0',
    'height:0',
  ].join(';');

  /**
   * The iframe is created on first open, not at page load. A visitor who never opens the
   * widget therefore pays only for this loader — no second document, no app bundle.
   */
  const ensureFrame = (): HTMLIFrameElement => {
    if (frame !== undefined) return frame;

    const created = document.createElement('iframe');
    created.src = `${config.origin}/widget?key=${encodeURIComponent(config.embedKey)}`;
    created.title = 'Assistant';
    // Microphone must be delegated explicitly: permission is granted to the iframe's
    // origin, and without this attribute getUserMedia fails inside a cross-origin frame.
    created.allow = 'microphone; autoplay';
    created.setAttribute('aria-label', 'Assistant');
    created.style.cssText = [
      'position:absolute',
      'bottom:0',
      config.position === 'bottom-left' ? 'left:0' : 'right:0',
      'width:368px',
      'height:540px',
      'max-width:100vw',
      'max-height:100vh',
      'border:0',
      'border-radius:16px',
      'box-shadow:0 12px 48px rgba(0,0,0,.18)',
      'display:none',
      'color-scheme:normal',
    ].join(';');

    container.appendChild(created);
    frame = created;
    return created;
  };

  const send = (payload: HostToFrameMessage): void => {
    // Targeted at the exact expected origin — never '*', which would broadcast the message
    // to whatever document happens to occupy the frame.
    frame?.contentWindow?.postMessage(wrapHostMessage(payload), config.origin);
  };

  const setOpen = (next: boolean): void => {
    open = next;
    const element = ensureFrame();
    element.style.display = next ? 'block' : 'none';
    send({ type: next ? 'open' : 'close' });
  };

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open assistant');
  launcher.style.cssText = [
    'position:absolute',
    'bottom:0',
    config.position === 'bottom-left' ? 'left:0' : 'right:0',
    'width:57px',
    'height:57px',
    'border:0',
    'border-radius:50%',
    'cursor:pointer',
    'background:#4F46E5',
    'box-shadow:0 6px 20px rgba(0,0,0,.22)',
  ].join(';');
  launcher.addEventListener('click', () => {
    setOpen(!open);
  });

  container.appendChild(launcher);
  document.body.appendChild(container);

  const handleFrameMessage = (payload: FrameToHostMessage): void => {
    switch (payload.type) {
      case 'ready':
        if (payload.protocolVersion !== WIDGET_PROTOCOL_VERSION) {
          // A merchant may be serving a long-cached loader against a current iframe. Say so
          // rather than failing in some subtler way further along.
          console.warn(
            `[voomate] Protocol mismatch: loader v${WIDGET_PROTOCOL_VERSION}, ` +
              `frame v${payload.protocolVersion}. Clear your CDN cache.`,
          );
        }
        send({
          type: 'init',
          embedKey: config.embedKey,
          pageUrl: window.location.href,
          browserLanguage: navigator.language,
        });
        break;

      case 'resize':
        if (frame !== undefined) {
          frame.style.width = `${payload.width}px`;
          frame.style.height = `${payload.height}px`;
        }
        break;

      case 'closed':
        open = false;
        if (frame !== undefined) frame.style.display = 'none';
        break;

      case 'mic-permission-denied':
        console.warn('[voomate] Microphone permission denied.');
        break;

      case 'error':
        console.error(`[voomate] ${payload.code}: ${payload.message}`);
        break;

      default:
        break;
    }
  };

  window.addEventListener('message', (event: MessageEvent) => {
    // Both checks are required, in this order. The origin check is what makes the message
    // trustworthy; the envelope check is what makes it ours — other scripts on the page
    // also post messages, and some of them post from our origin's opener chain.
    if (event.origin !== config.origin) return;
    const envelope = parseFrameEnvelope(event.data);
    if (envelope === undefined) return;
    handleFrameMessage(envelope.payload);
  });
};

const config = readConfig();
if (config !== undefined) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(config));
  } else {
    init(config);
  }
}
