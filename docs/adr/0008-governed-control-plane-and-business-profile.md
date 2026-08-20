# ADR 0008: Governed control plane and Business Operating Profile

**Status:** Accepted
**Date:** 2026-08-20

## Context

The first Web Agent implementation used `draft`, `published`, and `paused`, inferred a small
business profile inside each turn, and physically deleted an agent from the dashboard. That was
enough for a single Web Agent demo but not for an extensible, multi-tenant operating system:

- a stale session could not be tied to the configuration revision that created it;
- “resume” was implemented as publish and lifecycle transitions were not a shared contract;
- deletion cascaded through operational evidence instead of performing safe retirement;
- agent types were a dashboard-only list;
- inferred business behavior was neither evidence-backed, reviewable, versioned, nor pinned;
- future Edge runtimes had no desired/observed state seam.

## Decision

1. Use the exact lifecycle `draft -> active <-> paused -> archived`. Keep `/publish` only as a
   compatibility route that executes the governed `activate` command.
2. Give every instance a catalog type/version, monotonic desired and observed revisions, and a
   revocable short-lived execution lease.
3. Bind widget and voice session tokens to both configuration revision and lease ID. Runtime gates
   re-check active state, revision, lease identity, and expiry.
4. Treat dashboard deletion as archival. Archival revokes leases, tool grants, agent connections,
   read connections, and live-read secret material while retaining configuration and audit rows.
5. Store one tenant-level, versioned Business Operating Profile. Proposals contain structured
   profile data plus evidence records, confidence, source references, inference version, and review
   state. Only an admin-approved version is pinned to agents and used in production guidance.
6. Keep turn-level inference advisory. It may help when no approved profile exists, but it cannot
   grant permissions or promote itself.
7. Keep the catalog in `@voomate/core`; unreleased types remain visible but cannot be created or
   activated.

## Consequences

- Pause, archive, configuration change, and profile promotion invalidate stale sessions.
- Control-plane-hosted Web Agents converge desired and observed revisions atomically. An external
  Edge runtime must acknowledge signed desired state before its catalog type can be released.
- Restoring an archived agent returns it to `paused`; revoked connections and credentials must be
  explicitly reviewed and reconnected.
- Physical erasure becomes a separate retention workflow, not a CRUD delete.
- Approved business learning is portable across channels without becoming a hidden prompt.

## Rejected alternatives

- **Prompt-only business memory:** invisible, difficult to diff, and unsafe to self-modify.
- **Long-lived bearer tokens:** pausing an agent would not reliably revoke already-issued work.
- **Hardcoded industry agents:** duplicates runtime logic and does not reflect how real businesses
  combine workflows.
- **Cascade delete from the dashboard:** destroys the evidence needed for incident review,
  recovery, billing reconciliation, and enterprise compliance.
