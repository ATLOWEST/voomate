# Store backend example

This workspace is Voomate's own consumer test: it installs `@voomate/connect` exactly like a
merchant backend and calls it after a product update.

1. Create an agent-scoped Connect key in Voomate and save it as the server-only
   `VOOMATE_TENANT_KEY` environment variable. Never use `NEXT_PUBLIC_`, browser code, or a theme
   template.
2. Copy `src/store-sync.ts` into the server side of the store and map only fields that customers
   are allowed to see.
3. Call `syncStoreProduct()` after the store database update succeeds. The SDK retries briefly,
   never throws, and identical content is not embedded twice.

The `private` object is intentionally present in the example record but is never serialized. Live
inventory, customer identity, orders, and other rapidly changing/private records should be read
through Voomate's authenticated tool layer, not pushed into searchable knowledge.
