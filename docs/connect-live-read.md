# Voomate Connect: secure live reads

Use static `voomate.sync()` for descriptions, policies, FAQs, and other knowledge that belongs in
RAG. Use `createReadOnlyHandler()` for volatile facts such as inventory, order status, appointment
availability, or account state. Live data is read at answer time and is never embedded.

```ts
// app/api/voomate/read/route.ts (Next.js)
import { createReadOnlyHandler } from '@voomate/connect/server';
import { storeDb } from '@/server/store-db';

const handler = createReadOnlyHandler({
  connectionId: process.env.VOOMATE_CONNECTION_ID!,
  secret: process.env.VOOMATE_CONNECTION_SECRET!,
  capabilities: {
    get_inventory: {
      name: 'get_inventory',
      description: 'Read current sellable inventory for one public product SKU.',
      sensitivity: 'public',
      parameters: {
        sku: { type: 'string', required: true, maxLength: 80, description: 'Public product SKU' },
      },
      publicFields: ['sku', 'available', 'restockDate'],
      read: async ({ sku }) => storeDb.inventory.findUnique({ where: { sku: String(sku) } }),
    },
  },
});

export const POST = handler;
```

The callback should use a database user with `SELECT` permission only. The SDK has no generic SQL
or URL proxy and cannot mutate the client's system. Voomate signs each request and response,
rejects replays, enforces timeouts and size limits, and discards every result field not present in
`publicFields` before it leaves the client's server.

Setup is four steps:

1. Create a live-read connection in Voomate for the Web Agent.
2. Copy the returned connection ID and one-time secret into server-only environment variables.
3. Deploy the route over HTTPS, then verify the connection in Voomate.
4. Ask the widget a question that needs the named capability and inspect the metadata-only Logs event.

For multi-instance deployments, provide a shared `nonceStore` backed by Redis so replay protection
is enforced across all instances. Never put the connection secret in browser code or logs.
