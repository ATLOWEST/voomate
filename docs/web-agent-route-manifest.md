# Web Agent route manifest

The Voomate Web Agent SDK never scans a customer's source code. A browser cannot safely know
every private, dynamic, or permission-dependent route. For exact, repeatable coverage, publish a
small route manifest beside the SDK script in the host application.

```html
<script type="application/json" data-voomate-route-manifest>
{
  "version": 1,
  "surfaces": [
    { "id": "customer-workspace", "name": "Customer workspace", "pathPrefixes": ["/workspace", "/orders"] },
    { "id": "operations", "name": "Operations console", "pathPrefixes": ["/admin"] },
    { "id": "help", "name": "Help centre", "pathPrefixes": ["/help"] }
  ]
}
</script>
<script async src="https://app.atlowest.in/embed.js" data-agent="YOUR_PUBLIC_KEY"></script>
```

Names are shown to the merchant in Voomate, so use the language their team already uses. The
manifest may describe any dashboard, portal, website, or nested route; `/admin` has no special
meaning. The merchant decides which named surface is enabled and can exclude a sensitive child
path in the Info tab.

The SDK also reports the current route and visible same-origin navigation as *suggestions*. Those
observations cannot enable an agent, never include query strings/fragments/page source, and are
always checked against the tenant's saved origin and path policy before a launcher appears.

## Cross-origin destinations

An account portal, dashboard, or customer application hosted on another domain must be declared
explicitly. It is not discovered from source code, browser history, or a model response.

```html
<script type="application/json" data-voomate-ui-manifest>
{
  "version": 1,
  "pages": [
    { "id": "home", "title": "Home", "path": "/", "description": "Public website." }
  ],
  "trustedDestinations": [
    {
      "id": "dashboard",
      "title": "Dashboard",
      "url": "https://app.example.com/",
      "description": "Sign in to manage the workspace.",
      "aliases": ["dashboard", "workspace", "my account"]
    }
  ]
}
</script>
```

The runtime accepts a `trustedDestinations` entry only when its HTTPS origin and path also appear
as an enabled surface in that tenant's saved deployment policy. The browser checks the returned
command again, then performs a full-page handoff. The destination's own authentication and access
rules remain in force. A dashboard route is therefore declared and governed, rather than learned
from private UI state or guessed from a visitor's wording.
