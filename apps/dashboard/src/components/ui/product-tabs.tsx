'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  Cable,
  CheckCircle2,
  Headphones,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const AGENTS = [
  {
    id: 'web',
    short: 'Web',
    name: 'Web Agent',
    eyebrow: 'Customer surface',
    signal: 'Website-ready',
    headline: 'Chat and voice, embedded.',
    description:
      'A framework-independent chat and voice widget that keeps the conversation on the business website and uses approved tools when the customer needs a real action.',
    outcomes: [
      'Answer from approved knowledge',
      'Check live business information',
      'Run permitted website actions',
    ],
    details: [
      { label: 'Surface', value: 'Website chat and website voice' },
      { label: 'Context', value: 'Business knowledge and current conversation' },
      { label: 'Connection', value: 'Web Agent ↔ Integration Agent' },
      { label: 'Delivery', value: 'One Shadow DOM script embed' },
    ],
    Icon: MessageSquareText,
  },
  {
    id: 'voice',
    short: 'Voice',
    name: 'Voice Calling Agent',
    eyebrow: 'Live conversation',
    signal: 'Streaming voice',
    headline: 'A natural call, held in context.',
    description:
      'Handles inbound and outbound phone conversations with streaming speech, shared business context, interruption support, and a path to connected tools or a human.',
    outcomes: [
      'Handle natural phone conversations',
      'Keep context across turns',
      'Use approved tools during a call',
    ],
    details: [
      { label: 'Surface', value: 'Inbound and outbound phone calls' },
      { label: 'Context', value: 'Shared knowledge and conversation state' },
      { label: 'Connection', value: 'Voice Agent ↔ Integration Agent' },
      { label: 'Voice path', value: 'Streaming STT → reasoning → streaming TTS' },
    ],
    Icon: Mic2,
  },
  {
    id: 'integration',
    short: 'Integration',
    name: 'Integration Agent',
    eyebrow: 'Control plane',
    signal: 'Server-controlled',
    headline: 'The controlled path to live business systems.',
    description:
      'Holds the business connections and typed tools that the Web and Voice Calling Agents can request. Credentials and execution remain behind Voomate’s backend.',
    outcomes: [
      'Read current system data',
      'Run validated actions',
      'Queue sensitive work for approval',
    ],
    details: [
      { label: 'Surface', value: 'Server-side tools and adapters' },
      { label: 'Context', value: 'Tenant permissions and scoped credentials' },
      { label: 'Connections', value: 'Calendar, commerce, CRM, payments, custom APIs' },
      { label: 'Control', value: 'Validation, approval, filtering, and logs' },
    ],
    Icon: Workflow,
  },
];

export function ProductTabs() {
  const [active, setActive] = useState(0);
  const agent = AGENTS[active];
  const Icon = agent.Icon;

  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keyMoves: Record<string, number> = {
      ArrowRight: (index + 1) % AGENTS.length,
      ArrowLeft: (index - 1 + AGENTS.length) % AGENTS.length,
      Home: 0,
      End: AGENTS.length - 1,
    };
    const next = keyMoves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    requestAnimationFrame(() => document.getElementById(`agent-tab-${AGENTS[next].id}`)?.focus());
  };

  return (
    <div className="product-tabs" data-reveal>
      <div className="product-tabs__list" role="tablist" aria-label="Voomate agents">
        {AGENTS.map((item, index) => {
          const TabIcon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`agent-tab-${item.id}`}
              aria-controls={`agent-panel-${item.id}`}
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => moveTab(event, index)}
            >
              <span className="product-tabs__tab-icon" aria-hidden="true">
                <TabIcon size={17} strokeWidth={1.7} />
              </span>
              <span className="product-tabs__tab-copy">
                <small>{item.eyebrow}</small>
                <strong>{item.name}</strong>
              </span>
              <span className="product-tabs__tab-signal">{item.signal}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <section
        className="product-tabs__panel"
        role="tabpanel"
        id={`agent-panel-${agent.id}`}
        aria-labelledby={`agent-tab-${agent.id}`}
      >
        <div className="product-tabs__summary">
          <span className="product-tabs__symbol">
            <Icon size={25} strokeWidth={1.5} />
          </span>
          <p className="editorial-index">{agent.name}</p>
          <h3>{agent.headline}</h3>
          <p className="product-tabs__description">{agent.description}</p>
          <ul>
            {agent.outcomes.map((outcome) => (
              <li key={outcome}>
                <CheckCircle2 size={16} />
                {outcome}
              </li>
            ))}
          </ul>
        </div>

        <div className="product-tabs__detail">
          <div className="agent-path" aria-label={`${agent.name} operating path`}>
            <span>
              <Headphones size={17} /> Customer
            </span>
            <i />
            <span>
              <BookOpenText size={17} /> Knowledge
            </span>
            <i />
            <span>
              <Cable size={17} /> Tool
            </span>
            <i />
            <span>
              <ShieldCheck size={17} /> Safe result
            </span>
          </div>
          <div className="agent-signal-map" aria-label={`${agent.name} information flow`}>
            <span>Customer signal</span>
            <i aria-hidden="true" />
            <strong>{agent.short}</strong>
            <i aria-hidden="true" />
            <span>Controlled outcome</span>
          </div>
          <dl>
            {agent.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
