import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, Sparkles, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Instant Workspace Access · Voomate',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-amber-500" /> Instant Access Enabled
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create / Enter Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Registration is bypassed. You can jump directly into your interactive demo workspace.
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/overview"
            className="group relative flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm transition-all hover:border-primary/60 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Launch Demo Workspace</h2>
                  <p className="text-xs text-muted-foreground">Instant Provisioning · No Credit Card</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-2 text-xs text-secondary leading-relaxed">
              Explore pre-configured AI Web & Voice agents, interactive knowledge bases, and multi-channel conversation tools.
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
