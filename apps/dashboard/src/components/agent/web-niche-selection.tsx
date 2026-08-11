'use client';

import { useState } from 'react';
import { Store, Code2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function WebAgentNicheSelection() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Choose your Web Agent integration
        </h1>
        <p className="text-muted-foreground text-[15px] max-w-xl mx-auto">
          How do you want to integrate your Web Agent? Select Shopify for an out-of-the-box
          ecommerce experience, or Custom App for a generic website embed.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Shopify Option */}
        <button
          onClick={() => alert('Shopify integration coming soon!')}
          className="group relative flex flex-col items-start p-8 rounded-2xl border border-border/50 bg-card/50 opacity-60 transition-all text-left overflow-hidden cursor-not-allowed"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 translate-x-4 transition-all text-[#FF5722]">
            <ArrowRight className="w-6 h-6" />
          </div>

          <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
            <Store className="w-7 h-7" />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-foreground">Shopify Store</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF5722]/10 text-[#FF5722] text-[11px] font-bold uppercase tracking-widest">
              Recommended
            </span>
          </div>

          <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
            The ultimate AI shopping assistant. Automatically syncs with your Shopify products,
            handles customer support tickets, processes returns, and drives conversions.
          </p>

          <div className="mt-auto pt-6 border-t border-border/50 w-full flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">1-Click Install</span>
            <span className="text-[13px] text-muted-foreground">Full API access</span>
          </div>
        </button>

        {/* Custom App Option */}
        <button
          onClick={() => router.push('/agents/web?niche=custom')}
          className="group relative flex flex-col items-start p-8 rounded-2xl border border-border/50 bg-card hover:border-blue-500 hover:shadow-lg transition-all text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500">
            <ArrowRight className="w-6 h-6" />
          </div>

          <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
            <Code2 className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">Custom Website</h2>

          <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
            Embed the Web Agent into any website via a JavaScript snippet. Train it on your own
            knowledge base and define custom capabilities via webhooks.
          </p>

          <div className="mt-auto pt-6 border-t border-border/50 w-full flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">JS Embed</span>
            <span className="text-[13px] text-muted-foreground">Custom API</span>
          </div>
        </button>
      </div>
    </div>
  );
}
