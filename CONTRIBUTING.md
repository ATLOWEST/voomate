# Contributing to Voomate

Voomate is a multi-tenant agent platform. A change is complete only when its product behavior,
tenant boundary, and operational evidence agree.

## Development loop

1. Copy `.env.example` to `.env`; use only local or non-production credentials.
2. Work in a focused branch and keep generated output, logs, and secrets out of Git.
3. Run `npm run check`, `npm test`, and the app/package tests affected by the change.
4. For agent, widget, connection, or dashboard work, read
   [`docs/agent-operating-system-north-star.md`](docs/agent-operating-system-north-star.md) and
   preserve tenant, agent, lifecycle, and capability scope in every new data path.
5. Include the user-visible behavior, tests, and any operational migration/release notes in the
   pull request description.

## Security boundaries

- Never add a client-side provider credential, a generic database tool, or an unscoped provider
  proxy. Browser code is public by design.
- Tenant and agent scoping must be enforced in the query or tool boundary; RLS is a backstop.
- Treat crawled content, page context, model output, and visitor input as untrusted. They cannot
  grant permissions, choose a tool, or alter policy.
- Connections expose named capabilities and explicit public result fields. Customer reads require
  declared verification inputs. Writes need their own authorization and audit path.
- Report a suspected vulnerability privately under [SECURITY.md](SECURITY.md), never in an issue.

## Review standard

Reviewers should be able to answer these questions from the change itself:

- What is the controlled input, output, and failure mode?
- Which organization and agent own the data or execution?
- What audit event proves the action or denial occurred?
- Which test would fail if the boundary regressed?

Do not merge a feature just because its happy path works locally. A release needs a clean CI run,
the correct service image, and a post-deploy health check.
