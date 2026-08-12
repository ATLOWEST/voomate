'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BookOpenText, Cable, Check, MessageSquareText, MoveRight, PhoneCall } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    verb: 'Understand',
    title: 'Understands the request',
    body: 'The Web Agent or Voice Calling Agent follows the conversation, keeps its context, and identifies what the customer actually needs.',
    Icon: MessageSquareText,
  },
  {
    verb: 'Ground',
    title: 'Retrieves the trusted source',
    body: 'It checks tenant-scoped knowledge for stable business facts and identifies when the answer depends on current system data instead.',
    Icon: BookOpenText,
  },
  {
    verb: 'Act',
    title: 'Requests an approved tool',
    body: 'The Integration Agent exposes only the typed tools enabled for that business. The backend validates the input and executes with scoped credentials.',
    Icon: Cable,
  },
  {
    verb: 'Respond',
    title: 'Returns a safe result',
    body: 'Private fields are removed, sensitive actions can pause for approval, and the customer gets the useful outcome while the complete path is logged.',
    Icon: Check,
  },
];

export function OperatingFlow() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
        const section = root.current;
        const cards = gsap.utils.toArray<HTMLElement>('[data-flow-card]', section ?? undefined);

        if (!section || cards.length === 0) return;

        cards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { autoAlpha: index === 0 ? 0.75 : 0.35, y: 44, scale: 0.94 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                end: 'top 42%',
                scrub: 0.65,
              },
            },
          );

          const nextCard = cards[index + 1];
          if (nextCard) {
            gsap.to(card, {
              autoAlpha: 0.38,
              scale: 0.965,
              ease: 'none',
              scrollTrigger: {
                trigger: nextCard,
                start: 'top 78%',
                end: 'top 40%',
                scrub: 0.65,
              },
            });
          }
        });
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="flow-story" aria-labelledby="flow-title">
      <div className="flow-stage" data-flow-stage>
        <div className="flow-copy" data-flow-copy>
          <p className="editorial-index">How one request moves</p>
          <h2 id="flow-title" data-scrub>
            One conversation.
            <br />
            One shared brain.
          </h2>
          <p
            className="flow-narrative"
            data-word-scrub
            aria-label="Every channel uses the same knowledge, permissions, and conversation history. Your customer never has to start over when the work moves from an answer to an action."
          >
            {'Every channel uses the same knowledge, permissions, and conversation history. Your customer never has to start over when the work moves from an answer to an action.'
              .split(' ')
              .map((word, index) => (
                <span aria-hidden="true" key={`${word}-${index}`}>
                  {word}{' '}
                </span>
              ))}
          </p>
          <div className="flow-channel-row" aria-label="Supported conversation surfaces">
            <span>
              <MessageSquareText size={15} /> Website
            </span>
            <MoveRight size={16} aria-hidden="true" />
            <span>
              <PhoneCall size={15} /> Voice
            </span>
            <MoveRight size={16} aria-hidden="true" />
            <span>
              <Cable size={15} /> Tools
            </span>
          </div>
        </div>

        <div className="flow-cards">
          {STEPS.map(({ verb, title, body, Icon }) => (
            <article className="flow-card" data-flow-card key={verb}>
              <div className="flow-card__topline">
                <span>{verb}</span>
                <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="flow-card__diagram" aria-hidden="true">
                <span>Signal</span>
                <i />
                <strong>{verb}</strong>
                <i />
                <span>Outcome</span>
              </div>
              <div className="flow-card__proof">
                <Check size={15} aria-hidden="true" />
                Controlled by your business rules
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
