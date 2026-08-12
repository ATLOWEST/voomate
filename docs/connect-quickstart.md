# Voomate Connect: three-step setup

`@voomate/connect` sends approved public business content from a trusted server into the same
tenant-scoped knowledge pipeline used by the Web Agent.

## What runs where

```text
Customer browser
  -> embed.js + public domain-restricted key
  -> Voomate Web Agent backend

Business backend / webhook / deploy job
  -> @voomate/connect + tenant secret key
  -> approved descriptive content -> shared knowledge pipeline

Voomate agent runtime
  -> tenant-scoped, permission-checked tools
  -> current orders, inventory, appointments, and other live facts
  -> public-safe response fields only
```

The browser bootstrap is visible by design because browsers must download it. It grants no model,
tool, database, or write access. The Connect SDK is a server dependency: if it appears in browser
developer tools or a `NEXT_PUBLIC_*` variable, the integration is incorrect and the key must be
rotated immediately.

## 1. Install and protect the key

```bash
npm install @voomate/connect
```

Create an agent-bound Connect key in Voomate, store it in your backend's secret manager as
`VOOMATE_TENANT_KEY`, and rotate it before its expiry date. Never expose it in browser JavaScript,
a Shopify theme, a mobile bundle, source control, logs, or a `NEXT_PUBLIC_*` variable.

## 2. Map public fields explicitly

```ts
import { voomate } from '@voomate/connect';

export async function onProductUpdated(product: Product) {
  await voomate.sync({
    tenantKey: process.env.VOOMATE_TENANT_KEY!,
    type: 'product',
    id: product.id,
    content: [
      product.publicName,
      product.publicDescription,
      `Price: ${product.displayPrice}`,
    ].join('\n\n'),
    metadata: {
      title: product.publicName,
      sourceUrl: product.publicUrl,
      tags: product.publicTags,
    },
  });
}
```

Never serialize an entire database object. Build `content` from an explicit allowlist, excluding
cost, margin, credentials, internal notes, customer data, unpublished content, and access-control
fields. Voomate also rejects common credential patterns server-side, but that is a backstop rather
than permission to send private records.

## 3. Verify one update

Change one public fact, run the handler, and ask the Web Agent a question whose answer depends on
that fact. The first sync should report `synced`; an identical repeat should report `unchanged`
with zero embedding tokens. Check the Logs and Usage tabs for the tenant-scoped event.

Use Connect for descriptive content and deliberate updates. Real-time inventory, order details,
appointments, and customer identity belong in authenticated Voomate tools so authorization is
checked at the moment of access.

That split also keeps responses fast: descriptive content is pre-indexed once, while volatile facts
are fetched only when the request needs them. Do not continuously copy an entire store database into
Voomate; expose narrowly scoped backend actions such as `check_order_status` or
`get_inventory_level`, require the customer-specific verification each action needs, and return an
explicit public-safe field allowlist.
