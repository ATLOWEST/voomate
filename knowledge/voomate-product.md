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
