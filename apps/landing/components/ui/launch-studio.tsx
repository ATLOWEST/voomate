'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  Check,
  Code2,
  MessageSquareText,
  PlugZap,
  ShieldCheck,
} from 'lucide-react';

const STEPS = [
  {
    id: 'embed',
    eyebrow: 'Embed',
    title: 'Install one line',
    summary: 'Add the Web Agent without rebuilding your site.',
    headline: 'One script. Any website stack.',
    body: 'Paste a tenant-scoped public embed key into Shopify, WordPress, React, or plain HTML. The Web Component keeps its layout and styles isolated from the host page.',
    icon: Code2,
    visual: 'code',
    proof: ['Framework independent', 'Shadow DOM isolated', 'Chat and voice together'],
  },
  {
    id: 'connect',
    eyebrow: 'Ground',
    title: 'Connect what is true',
    summary: 'Give the team approved knowledge and live tools.',
    headline: 'Knowledge for answers. Tools for live work.',
    body: 'Descriptions and policies become searchable context. Orders, calendars, inventory, and customer actions stay behind authenticated server-side tools.',
    icon: PlugZap,
    visual: 'connect',
    proof: ['Tenant-scoped retrieval', 'Typed tool permissions', 'Safe output fields only'],
  },
  {
    id: 'launch',
    eyebrow: 'Publish',
    title: 'Test, publish, improve',
    summary: 'See the full path before customers use it.',
    headline: 'A real conversation becomes a visible workflow.',
    body: 'Run a test, publish the agent, and inspect conversations, retrieval, tool actions, latency, and usage from the same operator workspace.',
    icon: ShieldCheck,
    visual: 'launch',
    proof: ['Playground before publish', 'Traceable actions', 'Human review when needed'],
  },
] as const;

export function LaunchStudio() {
  const [activeId, setActiveId] = useState<(typeof STEPS)[number]['id']>('embed');
  const active = STEPS.find((step) => step.id === activeId) ?? STEPS[0];

  return (
    <div className="launch-studio" data-media-reveal>
      <div className="launch-studio__tabs" role="tablist" aria-label="Voomate setup steps">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const selected = step.id === active.id;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="launch-studio-panel"
              onClick={() => setActiveId(step.id)}
            >
              <span>{step.eyebrow}</span>
              <Icon size={18} />
              <span>
                <strong>{step.title}</strong>
                <small>{step.summary}</small>
              </span>
              <ArrowRight size={16} />
            </button>
          );
        })}
      </div>

      <div className="launch-studio__panel" id="launch-studio-panel" role="tabpanel">
        <div className="launch-studio__copy">
          <p>{active.eyebrow}</p>
          <h3>{active.headline}</h3>
          <p>{active.body}</p>
          <ul>
            {active.proof.map((item) => (
              <li key={item}>
                <Check size={15} /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="launch-studio__visual" data-mode={active.visual} aria-hidden="true">
          {active.visual === 'code' ? (
            <div className="launch-code">
              <div><i /><i /><i /><span>YOUR WEBSITE</span></div>
              <code>&lt;script src=&quot;widget.voomate.com/embed.js&quot;</code>
              <code>&nbsp;&nbsp;data-agent=&quot;pk_live_••••&quot;&gt;&lt;/script&gt;</code>
              <span><Check size={15} /> Web Agent mounted</span>
            </div>
          ) : null}

          {active.visual === 'connect' ? (
            <div className="launch-connect">
              <span><BookOpenText size={19} /> Knowledge</span>
              <i />
              <strong>Integration Agent</strong>
              <i />
              <span><PlugZap size={19} /> Live tools</span>
              <small>Scoped permissions</small>
            </div>
          ) : null}

          {active.visual === 'launch' ? (
            <div className="launch-thread">
              <span><MessageSquareText size={16} /> Customer asks</span>
              <p>Can you check my order and change the delivery slot?</p>
              <div>
                <i><Check size={13} /></i>
                <span><strong>Order checked</strong><small>Public-safe status returned</small></span>
              </div>
              <div>
                <i><Check size={13} /></i>
                <span><strong>Change confirmed</strong><small>Approved tool action logged</small></span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
