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
