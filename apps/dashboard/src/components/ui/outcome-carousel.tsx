'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';

const OUTCOMES = [
  {
    eyebrow: 'Customer view',
    title: 'A direct answer and a completed next step.',
    body: 'The customer stays in one natural conversation while the agent moves from question to verified action.',
    metric: 'One thread',
    detail: 'Chat, voice, and action context remain together.',
    icon: CheckCircle2,
  },
  {
    eyebrow: 'Operator view',
    title: 'Every important decision remains inspectable.',
    body: 'Retrieval, tool requests, safe outputs, approvals, latency, and usage appear in the same workspace.',
    metric: 'Full path',
    detail: 'See what happened without reconstructing the session.',
    icon: Clock3,
  },
  {
    eyebrow: 'Security view',
    title: 'The browser can request work, never bypass controls.',
    body: 'Tenant identity, credentials, permissions, validation, and filtering remain in the trusted backend boundary.',
    metric: 'Server-side',
    detail: 'Sensitive credentials never enter the public widget.',
    icon: ShieldCheck,
  },
] as const;

export function OutcomeCarousel() {
  const [index, setIndex] = useState(0);
  const item = OUTCOMES[index];
  const Icon = item.icon;
  const move = (direction: number) =>
    setIndex((current) => (current + direction + OUTCOMES.length) % OUTCOMES.length);

  return (
    <div className="outcome-carousel" data-media-reveal>
      <div className="outcome-carousel__copy" aria-live="polite">
        <span>{item.eyebrow}</span>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
      <div className="outcome-carousel__metric">
        <Icon size={25} />
        <strong>{item.metric}</strong>
        <p>{item.detail}</p>
      </div>
      <div className="outcome-carousel__controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous outcome">
          <ArrowLeft size={17} />
        </button>
        <span>{String(index + 1).padStart(2, '0')} / 03</span>
        <button type="button" onClick={() => move(1)} aria-label="Next outcome">
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
