# @voomate/connect

Push trusted business content from your backend into the same Voomate knowledge pipeline used by
the Web Agent. Reusing the same stable `id` updates the existing item (`type` is descriptive);
unchanged content is not embedded again.

```bash
npm install @voomate/connect
```

Keep the key on the server. Never place it in browser code, a Shopify theme, logs, source control,
or a `NEXT_PUBLIC_*` environment variable. Production endpoints must use HTTPS.

```ts
import { voomate } from '@voomate/connect';

// Example: an application event fired after a product update is committed.
export async function onProductUpdated(product: Product) {
  const result = await voomate.sync({
    tenantKey: process.env.VOOMATE_TENANT_KEY!,
    type: 'product',
    id: product.id, // stable across every future update
    content: [
      product.name,
      product.description,
      `Price: ${product.displayPrice}`,
      `Support plan: ${product.supportPlan}`,
    ].join('\n\n'),
    metadata: {
      title: product.name,
      sourceUrl: `https://shop.example.com/products/${product.slug}`,
      tags: product.tags,
    },
  });

  // Optional observability only. sync() always resolves and never breaks this handler.
  if (!result.ok) console.warn('Voomate knowledge sync was skipped; the product update succeeded.');
}
```

Construct `content` from an explicit public-field allowlist. Do not serialize the full source
record: exclude cost/margin, credentials, internal notes, customer information, and unpublished
fields. The SDK and backend reject common credential patterns as a second layer of protection.

The SDK retries transient network, throttling, and server failures with bounded backoff. After a
few attempts it logs a credential-free warning and resolves `{ ok: false }`; it never rejects in a
way that can crash an application handler or fail a deployment.

For local or staging use, pass the complete `endpoint`, for example
`http://localhost:4000/v1/connect/sync`.

Connect is for descriptive business knowledge and deliberate updates. Minute-to-minute inventory,
customer identity, order status, and appointments stay behind Voomate's authenticated live tools.

## UI navigation manifest

Applications can expose a bounded list of pages to the Web Agent without exposing router methods,
DOM selectors, or arbitrary commands. The manifest supports same-origin browser routes and optional
iOS Universal Links, Android App Links, and official store fallbacks:

```ts
import { defineUiManifest, serializeUiManifest } from '@voomate/connect';

const manifest = defineUiManifest({
  pages: [
    {
      id: 'pricing',
      title: 'Pricing',
      path: '/pricing',
      description: 'Plans, included usage, and billing terms.',
      aliases: ['plans', 'billing plans', 'cost'],
      facts: ['Starter is free.', 'Growth includes 5,000 conversations each month.'],
      native: {
        ios: {
          url: 'https://app.example.com/pricing',
          storeUrl: 'https://apps.apple.com/app/id123456789',
        },
        android: {
          url: 'https://app.example.com/pricing',
          storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
        },
      },
    },
  ],
});

const json = serializeUiManifest(manifest);
```

Render `json` in a `script[type="application/json"][data-voomate-ui-manifest]` element. Explicit
movement requests may produce a verified navigation command. Information requests are answered in
the widget and do not redirect. Native store handoff is used only when the visitor explicitly asks
to install or download the app.

SPA hosts can cancel the `voomate:navigation-request` window event, route internally, then dispatch
`voomate:navigation-complete` with the same `requestId`. If no host accepts the event, the widget
performs a normal full-page browser navigation and resumes the signed conversation on the next page.
