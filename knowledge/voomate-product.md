# Voomate product overview

Voomate is an AI agent operating system for small and medium businesses. It lets a business build
one practical AI operating team for customer conversations and approved real work across phone,
web, applications, and connected business systems. Voomate is designed around real actions, not a
chatbot that only answers generic questions.

## Agent catalog and workspace choice

The current delivery sequence is explicit:

1. The **Web Agent** is available now for grounded chat and voice inside a website or application,
   verified navigation, live reads, and separately permissioned actions.
2. The **CRM Tool Agent** is in design for governed customer-record and follow-up workflows.
3. The **SEO Agent** is planned after the CRM Tool Agent for governed search-visibility and content
   workflows.
4. The **Calling Agent** follows the SEO milestone for inbound and outbound phone workflows.

The dashboard may show planned types so owners can understand the roadmap, but only released types
can be added. It must never pretend that a planned agent was provisioned. This sequence is not a
permanent ceiling: more first-party or certified agent types can use the same catalog contract.
A workspace activates only what it needs and can pause or archive an instance. Every instance is
tenant-scoped, permissioned, traceable, and subject to plan limits.

Connections, tools, calendars, payments, messaging, and client-server capabilities remain a
governed platform layer shared by compatible agents. Calling that layer an agent in older material
does not make it an unrestricted credential holder or a mandatory workspace slot.

The architecture is universal rather than industry-specific. A clinic, restaurant, law firm,
service business, or shop uses the same agent, workflow, and tool contracts. Voomate infers useful
business context from approved evidence; the owner does not choose an industry preset.

## Operating Panel and client connection

The Voomate dashboard is the business's live Operating Panel. It is where an authorized operator:

- activates, configures, tests, pauses, resumes, archives, or restores agents;
- reviews and changes explicit agent-to-agent connection scopes;
- sees SDK/Edge heartbeat, configuration revision, connection health, and capabilities;
- reviews conversations, workflow runs, approvals, logs, quality, cost, and usage by agent;
- inspects and corrects what Voomate understands about the business.

Dashboard state is operational only after the server authorizes and records it. Pause and archive
must immediately stop new work at Voomate's control plane, revoke the agent's execution lease, and
then synchronize the new desired state to the SDK or Voomate Edge running in client
infrastructure. The UI must never claim success for a local-only animation.

The Web Agent works on React, WordPress, Shopify, plain HTML, and other website stacks. Its Web
Component runs inside Shadow DOM so host-site CSS does not interfere with it. The browser receives
only a public, domain-restricted agent key. Model access, cloud credentials, tenant identity,
knowledge retrieval, policies, and tool execution remain on Voomate's backend.

Voomate grounds answers in tenant-scoped knowledge and gets changing facts from controlled live
reads. Every sensitive action is permission-checked and logged. Tool output is reduced to approved
public-safe fields before it can reach a customer. When verified knowledge or an enabled tool
cannot support an answer, the agent is honest and offers the closest useful next step.

## Why Voomate exists

1. Small and medium businesses often cannot staff customer operations around the clock. Voomate
   makes a capable, always-available operating team practical without enterprise staffing costs.
2. The central difference is real action, not only answers. Knowledge handles stable questions,
   live reads check current state, and separately approved tools handle work such as bookings,
   carts, and refunds.
3. A governed catalog and universal workflow/tool contracts let one product serve unlike
   businesses and grow beyond the launch agents without rebuilding the runtime for every industry.
4. Becoming AI-native means customer operations can flow through coordinated agents inside the
   business's phone, website, application, and connected systems. It is more than adding a Q&A
   bubble.
5. Trust is the foundation. Tenant isolation, read-only live data, public-field projection,
   permissioned writes, execution leases, trace logs, evaluations, and human approval gates let a
   business delegate work without surrendering control.

## Voomate onboarding path

1. On the public site, create an account or sign in. Public assistance cannot inspect a private
   workspace or guess whether an agent already exists.
2. In the signed-in Operating Panel, open Agents. A bounded workspace-state read determines whether
   to add the first available agent or configure an existing one.
3. Choose from the available catalog and activate only the agents the business needs. Planned agent
   types are visible as planned and cannot be provisioned.
4. Add public business knowledge, policies, products, services, and purpose so the shared Business
   Operating Profile can be reviewed and approved.
5. Open Integrations and connect current data through named read-only capabilities. Add writes
   separately with the narrow permission and confirmation policy each action requires.
6. Connect compatible active agents with explicit scopes. "Connect all" means all reviewed,
   compatible links, not unrestricted permission sharing.
7. Test realistic customer questions and actions, inspect Logs, then publish the customer-facing
   agents.
8. Monitor Edge health, conversations, feedback, approvals, quality, cost, and per-agent usage from
   the Operating Panel.
