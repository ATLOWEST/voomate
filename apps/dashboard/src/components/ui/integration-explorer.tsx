'use client';

import { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  DatabaseZap,
  MessageSquareText,
  PackageSearch,
  PlugZap,
  UserRoundPlus,
} from 'lucide-react';

const GROUPS = [
  {
    id: 'actions',
    label: 'Action tools',
    detail: 'Typed work',
    Icon: PlugZap,
    intro: 'Typed functions that turn a customer request into a bounded task.',
    items: [
      {
        name: 'Order and catalogue',
        reads: 'Products, availability, order status',
        action: 'Search, check, redirect, cart request',
        gate: 'Identity check for customer-specific data',
        Icon: PackageSearch,
      },
      {
        name: 'Scheduling',
        reads: 'Services and current availability',
        action: 'Book or reschedule a slot',
        gate: 'Confirmation before the final write',
        Icon: CalendarDays,
      },
      {
        name: 'Payments',
        reads: 'Payment or invoice status',
        action: 'Send an approved payment path',
        gate: 'No raw card data; sensitive changes need approval',
        Icon: CircleDollarSign,
      },
      {
        name: 'Lead and CRM',
        reads: 'Permitted customer and account fields',
        action: 'Create or update a lead record',
        gate: 'Explicit public-field mapping',
        Icon: UserRoundPlus,
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    detail: 'Shared context',
    Icon: MessageSquareText,
    intro: 'Conversation surfaces that share knowledge and route the same approved capabilities.',
    items: [
      {
        name: 'Website chat',
        reads: 'Page context and conversation history',
        action: 'Answer, guide, or request a tool',
        gate: 'Origin-bound session and domain allowlist',
        Icon: MessageSquareText,
      },
      {
        name: 'Website voice',
        reads: 'Streaming transcript and shared thread',
        action: 'Speak, interrupt, resume, or use a tool',
        gate: 'Short-lived session with usage limits',
        Icon: MessageSquareText,
      },
      {
        name: 'Phone calls',
        reads: 'Call transcript and approved customer context',
        action: 'Handle inbound or outbound flows',
        gate: 'Disclosure, retention controls, escalation path',
        Icon: MessageSquareText,
      },
      {
        name: 'Human handoff',
        reads: 'Conversation summary and failure reason',
        action: 'Pause automation and notify the team',
        gate: 'Triggered by confidence, policy, or customer request',
        Icon: UserRoundPlus,
      },
    ],
  },
  {
    id: 'connections',
    label: 'System connections',
    detail: 'Private boundary',
    Icon: DatabaseZap,
    intro:
      'Tenant-scoped adapters that keep credentials and business APIs out of the browser and model.',
    items: [
      {
        name: 'Commerce systems',
        reads: 'Catalogue, inventory, orders',
        action: 'Expose approved commerce tools',
        gate: 'Narrow scopes and public-safe fields',
        Icon: PackageSearch,
      },
      {
        name: 'Calendar systems',
        reads: 'Availability and appointment records',
        action: 'Expose booking tools',
        gate: 'Tenant credentials and action confirmation',
        Icon: CalendarDays,
      },
      {
        name: 'CRM and support',
        reads: 'Permitted contact or ticket context',
        action: 'Create a lead, note, or escalation',
        gate: 'Field allowlist and audit trail',
        Icon: DatabaseZap,
      },
      {
        name: 'Custom backend',
        reads: 'Whatever the business explicitly exposes',
        action: 'Typed REST, webhook, or SDK-backed tools',
        gate: 'Schema validation and server-side execution',
        Icon: PlugZap,
      },
    ],
  },
];

export function IntegrationExplorer() {
  const [active, setActive] = useState(0);
  const group = GROUPS[active];

  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keyMoves: Record<string, number> = {
      ArrowRight: (index + 1) % GROUPS.length,
      ArrowLeft: (index - 1 + GROUPS.length) % GROUPS.length,
      ArrowDown: (index + 1) % GROUPS.length,
      ArrowUp: (index - 1 + GROUPS.length) % GROUPS.length,
      Home: 0,
      End: GROUPS.length - 1,
    };
    const next = keyMoves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    requestAnimationFrame(() =>
      document.getElementById(`integration-tab-${GROUPS[next].id}`)?.focus(),
    );
  };

  return (
    <div className="integration-explorer" data-reveal>
      <div
        className="integration-explorer__tabs"
        role="tablist"
        aria-label="Voomate capability groups"
      >
        {GROUPS.map((item, index) => {
          const GroupIcon = item.Icon;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls={`integration-panel-${item.id}`}
              id={`integration-tab-${item.id}`}
              tabIndex={active === index ? 0 : -1}
              key={item.id}
              onClick={() => setActive(index)}
              onKeyDown={(event) => moveTab(event, index)}
            >
              <span className="integration-explorer__tab-icon" aria-hidden="true">
                <GroupIcon size={17} strokeWidth={1.7} />
              </span>
              <span className="integration-explorer__tab-copy">
                <small>{item.detail}</small>
                <strong>{item.label}</strong>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <section
        className="integration-explorer__panel"
        role="tabpanel"
        id={`integration-panel-${group.id}`}
        aria-labelledby={`integration-tab-${group.id}`}
      >
        <header>
          <p>{group.intro}</p>
          <div className="integration-explorer__signal" aria-hidden="true">
            <span>Request</span>
            <i />
            <strong>Voomate</strong>
            <i />
            <span>Approved system</span>
          </div>
        </header>
        <div className="integration-explorer__table" role="table" aria-label={group.label}>
          <div className="integration-explorer__table-head" role="row">
            <span role="columnheader">Capability</span>
            <span role="columnheader">Reads</span>
            <span role="columnheader">Can request</span>
            <span role="columnheader">Control</span>
          </div>
          {group.items.map(({ name, reads, action, gate, Icon }) => (
            <div className="integration-explorer__row" role="row" key={name}>
              <strong role="cell">
                <Icon size={18} />
                {name}
              </strong>
              <span role="cell">{reads}</span>
              <span role="cell">{action}</span>
              <span role="cell">
                <CheckCircle2 size={14} />
                {gate}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
