import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Instant Dashboard Access · Voomate',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-amber-500" /> Instant Demo & Dashboard Access
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Select Your Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Authentication is currently bypassed. Select which platform experience you would like to explore.
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/overview"
            className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-foreground/30 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Merchant Dashboard</h2>
                  <p className="text-xs text-muted-foreground">Storefront & Customer Operations</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <p className="mt-1 text-xs text-secondary leading-relaxed">
              Configure Web Agents, Voice Prompts, live customer chat transcripts, Shopify/Stripe integrations, and team settings.
            </p>
          </Link>

          <Link
            href="/admin/merchants"
            className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-foreground/30 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Super Admin Platform</h2>
                  <p className="text-xs text-muted-foreground">Internal Governance & Cluster Edge</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <p className="mt-1 text-xs text-secondary leading-relaxed">
              Global multi-tenant registry, AWS Bedrock LLM routing, real-time Voice Edge Studio, and cluster health logs.
            </p>
          </Link>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to Marketing Landing Page
          </Link>
        </div>
      </div>
    </main>
  );
}
