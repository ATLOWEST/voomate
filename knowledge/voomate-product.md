# Voomate product overview

Voomate is an AI agent platform for small and medium businesses. It gives each business a
practical AI team that handles customer conversations and approved real tasks across phone calls,
website chat and voice, and connected business tools. Voomate is designed around real actions,
not a chatbot that only answers generic questions.

Every Voomate business account has exactly three fixed agents:

1. The Voice Calling Agent answers and makes phone calls. With the right connected tools it can
   help book or reschedule appointments, check orders, and escalate to a human when it is unsure.
2. The Web Agent is an embeddable chat and voice assistant for the business's website, web app, or
   online store. This website assistant is also called the Voomate widget. A business installs it
   with one script tag. Visitors can type or speak in the same
   conversation, and the agent can perform permission-approved actions such as checking an order,
   navigating to a page, managing a cart, or booking a slot when those tools are enabled.
3. The Integration Agent connects external services such as calendars, payments, messaging, and
   CRM systems. The Voice Calling Agent and Web Agent can use these connections to complete tasks.

The three-agent structure is universal rather than industry-specific. A clinic, restaurant, law
firm, service business, or shop uses the same agent system and enables only the knowledge and tools
it needs.

The Web Agent works on React, WordPress, Shopify, plain HTML, and other website stacks. Its Web
Component runs inside Shadow DOM so host-site CSS does not interfere with it. The browser receives
only a public, domain-restricted agent key. Model access, AWS credentials, tenant identity,
knowledge retrieval, and tool execution remain on Voomate's backend.

Voomate grounds answers in the business's own tenant-scoped knowledge and gets changing facts from
controlled live tools. Every sensitive action is permission-checked and logged. Tool output is
reduced to explicitly public-safe fields before it can reach a customer. When verified knowledge
or an enabled tool cannot support an answer, the agent should be honest and offer human help rather
than inventing a fact.

## Why Voomate exists

1. Small and medium businesses often cannot staff support and sales around the clock. Voomate's
   three agents are designed to become a practical, always-available operating team for those
   businesses rather than an enterprise-only automation layer.
2. The product's central difference is real action, not only answers. Knowledge handles stable
   questions, live reads check current state, and separately approved tools handle work such as
   bookings, carts, and refunds.
3. Exactly three universal agent slots keep the product understandable and scalable. A clinic,
   restaurant, store, or professional service configures the same system with different knowledge
   and tools; Voomate does not create industry-specific agent types.
4. Becoming AI-native means customer operations can flow through capable agents inside the
   business's phone, website, app, and connected systems. It is more than adding a Q&A bubble.
5. Trust is the product foundation. Tenant isolation, read-only live data, public-field projection,
   permissioned write tools, trace logs, evaluations, and human approval gates let a business hand
   over real interactions without handing over uncontrolled access.

## Voomate onboarding path

1. Open Agents and configure the existing Voice Calling, Web, and Integration agent slots. Every
   account already has these three slots; creating a duplicate or fourth agent is not required.
2. Add public business knowledge such as products, services, policies, FAQs, and the business's
   purpose. Voomate uses this for stable grounded answers.
3. Open Integrations and connect current business data through named read-only capabilities. Add
   write tools separately, with the narrow permission and confirmation policy each action needs.
4. Test realistic customer questions and actions in the Web Agent, then inspect Logs to see which
   sources and tools were used.
5. Publish the Web Agent to the website or app with the domain-restricted embed key, then review
   conversations, feedback, approvals, and usage from the dashboard.
