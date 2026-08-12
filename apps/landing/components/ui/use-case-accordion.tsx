'use client';

import { useState } from 'react';
import { Activity, BookOpenText, CalendarDays, Search, Siren, UserRoundPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UseCase = {
  name: string;
  headline: string;
  body: string;
  tasks: string[];
  Icon: LucideIcon;
};

export const WORKFLOW_USE_CASES: UseCase[] = [
  {
    name: 'Find and recommend',
    headline: 'Help a customer move from a broad question to a useful option.',
    body: 'Use approved descriptions and live catalogue or service data to narrow choices, explain tradeoffs, and guide the customer to the right page or next step.',
    tasks: ['Understand intent', 'Search approved options', 'Guide the next step'],
    Icon: Search,
  },
  {
    name: 'Answer and explain',
    headline: 'Turn business knowledge into a concise, grounded answer.',
    body: 'Retrieve relevant policies, product facts, service details, or help content from that tenant’s knowledge and answer without inventing missing information.',
    tasks: ['Retrieve relevant content', 'Answer with context', 'Admit uncertainty'],
    Icon: BookOpenText,
  },
  {
    name: 'Check live status',
    headline: 'Read the current fact from the system that owns it.',
    body: 'When a question depends on inventory, an order, a payment, an appointment, or an account, request a scoped tool instead of relying on stored knowledge.',
    tasks: ['Verify identity when required', 'Call a read tool', 'Return safe fields only'],
    Icon: Activity,
  },
  {
    name: 'Schedule and coordinate',
    headline: 'Move from an enquiry to a confirmed time without breaking the thread.',
    body: 'Explain the service, collect the required details, read live availability, confirm the selection, and request the booking through the Integration Agent.',
    tasks: ['Collect required details', 'Check availability', 'Confirm before booking'],
    Icon: CalendarDays,
  },
  {
    name: 'Capture and follow up',
    headline: 'Carry useful context into the business system once the customer is ready.',
    body: 'Collect only the permitted contact and request details, then create a lead, note, ticket, or follow-up task through a typed CRM or support tool.',
    tasks: ['Collect explicit fields', 'Create a record', 'Preserve conversation context'],
    Icon: UserRoundPlus,
  },
  {
    name: 'Approve or escalate',
    headline: 'Know when automation should pause and a person should decide.',
    body: 'Low confidence, explicit human requests, failed tools, and sensitive actions can stop the automated path and create an approval or handoff event.',
    tasks: ['Detect the boundary', 'Summarize the request', 'Queue review or handoff'],
    Icon: Siren,
  },
];

export function UseCaseAccordion({ cases = WORKFLOW_USE_CASES }: { cases?: UseCase[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="use-case-accordion" data-reveal>
      {cases.map(({ name, headline, body, tasks, Icon }, index) => {
        const selected = active === index;
        return (
          <article className="use-case-panel" data-active={selected} key={name}>
            <button
              type="button"
              aria-expanded={selected}
              aria-controls={`use-case-${index}`}
              onClick={() => setActive(index)}
            >
              <span className="use-case-panel__icon">
                <Icon size={19} strokeWidth={1.7} />
              </span>
              <span>{name}</span>
              <span className="use-case-panel__rail" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
            <div
              className="use-case-panel__content"
              id={`use-case-${index}`}
              aria-hidden={!selected}
            >
              <div>
                <Icon size={31} strokeWidth={1.45} aria-hidden="true" />
                <h3>{headline}</h3>
                <p>{body}</p>
                <div className="use-case-panel__map" aria-hidden="true">
                  <span>Customer</span>
                  <i />
                  <strong>Voomate</strong>
                  <i />
                  <span>Next step</span>
                </div>
                <ul>
                  {tasks.map((task) => (
                    <li key={task}>
                      <span aria-hidden="true" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
