# @soniq/dashboard

Next.js App Router. The surface merchants judge the product by.

```
src/
  app/
    (app)/                    authenticated shell — sidebar, org switcher, theme
      agents/
        [agentId]/            overview · knowledge · voice · behaviour · install
      conversations/
      usage/
      settings/
  components/
    ui/                       design system — Button, Panel, Field, Badge, EmptyState
    shell/                    navigation, page header, theme toggle
  lib/
    api.ts                    typed control-plane client
    cn.ts
```

## Design rules

**Colour lives in `globals.css` and nowhere else.** Components reference semantic variables
(`--surface-panel`, `--text-secondary`), not the palette ramp. Dark mode is one re-binding of
those variables rather than a `dark:` class on every element, and a component reaching for a
raw hex is a bug.

**No webfont.** `next/font/google` fetches at build time, making builds depend on the network
for a result the native system stack already delivers instantly.

**Focus rings stay visible.** Enterprise procurement asks about WCAG.

**`prefers-reduced-motion` is honoured globally.** Voice UIs animate constantly and some
users cannot tolerate it.

## Two things that are load-bearing

1. **Auth guards belong in `(app)/layout.tsx`**, a server component. A client-side guard
   renders the shell — org name, navigation, agent list — before it redirects.
2. **`x-organization-id` on every API call.** The API refuses to infer the tenant from the
   session (see [apps/api/src/plugins/auth.ts](../api/src/plugins/auth.ts)); omitting the
   header gives a 403 rather than a quiet read of the wrong tenant.

The Voice & Languages screen renders `LAUNCH_LANGUAGES` from
[@soniq/i18n](../../packages/i18n/) directly, so the UI cannot offer a language the pipeline
can't actually speak.

## Status

Phase 0: shell, design system, and route structure. Screens render their real layout with
data wiring marked `TODO(phase-1)` — that lands when Supabase auth is connected. See
[docs/roadmap.md](../../docs/roadmap.md).
