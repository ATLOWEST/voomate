# Web Agents Required Improvements

## 1. The Current Problem

*Note to IDE / Agents: Always refer back to our previous conversations and this document to understand the full context before making architectural changes.*

### Problem Statement
Our web agent is struggling with conversational accuracy, context awareness, and hallucinations. Specifically:
1. **Speech-to-Text (STT) Inaccuracies:** The system is frequently mishearing words (e.g., "his roommate" instead of "Voomate", "Vy" instead of "By").
2. **Context Blindness & Hallucinations:** The agent does not know what page the user is currently on. When a user asks about something they can't see, the agent hallucinates generic advice (e.g., "please sign in to your Voomate account") even when the user is *already* in the dashboard. 
3. **Incorrect Terminology:** The agent uses SDK/code-level names instead of the exact, user-facing UI tab names, causing severe user confusion.

### Chat Logs of the Web Agent Failure
> **User:** "OK, so can you just tell me what is his roommate and how to set up this."
> **Agent:** "Overview is A live Operating Panel for active agents, SDK health, recent conversations, connections, approvals, and usage. Start with Agents to configure the team, Integrations to connect business systems, and Logs to see what each response consulted and why."
> **User:** "Vy overview, I can't see any overview panel."
> **Agent:** "To access the overview panel, please sign in to your Voomate account and navigate to the dashboard. The overview panel should be visible on the dashboard. If you are unable to see it, please ensure that you have the necessary permissions and that your account is active. If the issue persists, please contact Voomate support for further assistance."

### Required Actions for a Robust System
1. **Page Context Injection:** Build a robust system where the agent is explicitly fed the user's *exact current page* and the *exact UI tabs available*.
2. **UI-Verification Logic:** The agent must check its page context to see if a feature/tab actually exists before hallucinating navigation instructions.
3. **Terminology Mapping:** Map backend SDK/code names to exact user-facing UI labels so the agent speaks the user's language.
4. **Enhanced STT / NLP Tolerance:** Implement code intelligence steps to handle STT errors gracefully (e.g., fuzzily matching "his roommate" to "Voomate" based on context).

### Problem 2: Latency & TTS Synchronization
Our agents are experiencing significant delays, severely impacting the real-time conversational experience. Specifically:
1. **High Text Latency:** Text responses are taking 3-4 seconds to generate, which is far too long for a chat bot. We need sub-second latency.
2. **Desynced Voice (TTS):** In the voice agent, the text transcript appears early, but the Amazon Polly audio stream is delayed, creating a disjointed user experience.
3. **Geographic Routing:** The current infrastructure might be routed far from our primary users, causing unnecessary network overhead.

### Required Actions for Sub-Second Latency
1. **Migrate Infrastructure to India Region:** Shift the AWS services (Bedrock, Polly) and the PostgreSQL Database to India-based servers (e.g., `ap-south-1`) to drastically reduce round-trip ping times for our primary user base.
2. **Optimize Streaming Pipelines:** Investigate the Node.js to Python WebRTC bridge to ensure the Polly audio chunks are streamed and played instantly alongside the text deltas, rather than buffering.
3. **Database Query Optimization:** Ensure that any database queries fetching the `pageContext` or user session state are optimized and edge-cached if necessary to meet the sub-second requirement.

### Problem 3: Fragmented Navigation & Unifying the Framework (CTO Vision)
Currently, navigation works on some pages (like the landing page successfully navigating to "Pricing") but fails on others (like the dashboard failing with "The agent cannot perform navigation actions" when asked to go to the inbox). The current architecture is fragmented.
1. **Inconsistent Capabilities:** The Web Agent must be able to confidently navigate the user across *any* application it is embedded in, using the exact same framework.
2. **Divergent Voice vs. Text Logic:** The voice agent and text chat should not use different logic, stacks, or capabilities. They must be perfectly unified.

### Required Actions for the Unified "Agentic Tab" Architecture
*(Thinking like a CTO to future-proof the vision)*
1. **Universal Navigation Engine:** We will build a single, universal `clientCommands` and `pageContext` matching engine that powers navigation across the Landing Page, the Dashboard, Voice, Text, and all future Client deployments. If a page exists in the local manifest, the agent *will* find it, regardless of typos.
2. **Unified Omnichannel Stack:** We will consolidate the Voice and Text processing paths. Voice will simply be an audio interface on top of the exact same deterministic orchestration layer that powers the text chat, ensuring 100% feature parity.
3. **Cross-Domain Context Sharing:** By unifying this into an agnostic framework, our agents can intelligently operate across domains—meaning the same core intelligence powers our marketing site, our logged-in dashboard, and our B2B customers' sites without rebuilding the logic for each service.

### Problem 4: Hardened Multi-Tenant Isolation (Inspection Findings)
I have inspected your database architecture in `client.ts` and `10_rls_policies.sql`. Currently, your API connects to Supabase using the **Service Role**, which *completely bypasses* Postgres Row-Level Security (RLS). Isolation relies entirely on developers manually adding `tenantScope()` to every database query. If a single developer forgets to append this scope to a query, clients will see each other's agents and data.
1. **App-Layer Vulnerability:** Relying purely on the Node.js application layer (`tenantScope`) to prevent data merging is risky for a multi-tenant B2B platform.
2. **Missing DB-Layer Enforcement:** RLS policies exist in your database, but they are completely ignored by the backend API.

### Required Actions for Absolute Multi-Tenant Isolation
1. **Session-Level Database Enforcement:** Instead of bypassing RLS with a Service Role, we will use Postgres configuration variables (`set_config('app.current_tenant', ...)`). We will wrap all Drizzle database queries in a transaction that sets the current `organizationId` directly in Postgres.
2. **Fail-Safe RLS:** We will update the RLS policies so that the database engine itself rejects any query attempting to read or write an agent belonging to a different client. Even if a developer writes a completely unscoped query like `select * from agents`, the database will automatically filter it. This guarantees clients and their agents never get merged.

## 2. The "Agentic Tab" Dynamic Framework (Compulsory Guide)
When solving the problem above, the solution **must not** be hardcoded just for the Voomate dashboard. We must build an "Agentic Tab" that operates within a dynamic framework so it works seamlessly for **all of our clients**.

**Compulsory Guidelines:**
- **Multi-Tenant by Default:** The Agentic Tab must adapt its behavior, context, and capabilities based on the active client's `organizationId` and `agentId`. Do not hardcode Voomate-specific rules.
- **Dynamic Context Injection:** The tab should automatically pull in the specific client's live data, business profile, and tools without needing separate codebases.
- **Scalable UI:** The frontend component for the Agentic Tab must be embeddable and themeable so it visually integrates into any client's application as cleanly as it does in our dashboard.
- **Self-Evolving Orchestration:** The agent workflows behind this tab should use flexible routing to handle different industries dynamically.

## 3. Action Items
- [ ] Define the exact problem we are facing.
- [ ] Architect the Agentic Tab so it is dynamic for all clients.
- [ ] Implement the changes across the frontend and backend.
- [ ] Test the Agentic Tab in the Voomate dashboard AND a simulated client environment.

## 4. Completion
- [ ] **DELETE THIS FILE WHEN IT IS COMPLETED.**
