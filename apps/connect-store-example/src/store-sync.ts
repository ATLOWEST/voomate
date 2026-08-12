import { voomate, type SyncResult } from '@voomate/connect';

/**
 * A representative record from a merchant's private backend. Only the fields marked `public`
 * below are intentionally mapped into agent knowledge. The remaining fields demonstrate data
 * that must stay inside the merchant system or behind an authenticated live tool.
 */
export interface StoreProduct {
  id: string;
  public: {
    name: string;
    description: string;
    displayPrice: string;
    supportPlan: string;
    url: string;
    tags?: readonly string[];
  };
  private?: {
    costPrice?: number;
    marginPercent?: number;
    supplierToken?: string;
    internalNotes?: string;
    lastCustomerEmail?: string;
  };
}

export interface StoreSyncOptions {
  tenantKey: string;
  product: StoreProduct;
  endpoint?: string;
}

/**
 * Call this after the store has committed a product update.
 *
 * This mapper is the important security boundary: it constructs content from an explicit public
 * allowlist instead of serializing the source object. SDK failures always resolve as a result and
 * therefore cannot roll back or crash the merchant's update handler.
 */
export const syncStoreProduct = async ({
  tenantKey,
  product,
  endpoint,
}: StoreSyncOptions): Promise<SyncResult> =>
  voomate.sync({
    tenantKey,
    endpoint,
    type: 'product',
    id: product.id,
    content: [
      `Product: ${product.public.name}`,
      product.public.description,
      `Public price: ${product.public.displayPrice}`,
      `Support plan: ${product.public.supportPlan}`,
    ].join('\n\n'),
    metadata: {
      title: product.public.name,
      sourceUrl: product.public.url,
      tags: product.public.tags,
    },
  });
