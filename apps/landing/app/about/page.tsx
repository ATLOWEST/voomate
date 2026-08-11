import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'About — Voomate',
  description:
    'Voomate is an AI commerce automation company. We build AI virtual shopkeepers that handle every customer conversation for merchants — voice, chat, and 30+ languages.',
};

const PRINCIPLES = [
  {
    n: '01',
    title: 'Honesty over hype.',
    body: "Every answer Voomate gives is grounded in your content. When it doesn't know something, it says so. We built it that way deliberately — because hallucinating product information costs merchants far more than a polite 'I'm not sure, let me connect you to someone.'",
  },
  {
    n: '02',
    title: 'Language is not a barrier.',
    body: "India alone has 22 official languages. Southeast Asia has hundreds more. The AI agents built for enterprise Fortune 500 companies don't serve these markets — so we built one that does. Auto-detection, code-switching, multilingual from day one.",
  },
  {
    n: '03',
    title: 'Your data stays yours.',
    body: "Every merchant gets a fully isolated knowledge base with Row-Level Security. One tenant cannot see another's data. Ever. We built this constraint in at the database level, not as a policy afterthought.",
  },
  {
    n: '04',
    title: 'Speed is a product feature.',
    body: '1.3 seconds from the moment a customer stops speaking to the first word of a response. We obsess over this number because every extra second of silence is a customer reconsidering. Voice is unforgiving — so we are too.',
  },
];

const TECH = [
  { label: 'Voice transport', value: 'WebSocket + AWS Transcribe Streaming' },
  { label: 'Language detection', value: 'Amazon Bedrock multilingual embeddings' },
  { label: 'Knowledge retrieval', value: 'pgvector RAG with tenant isolation' },
  { label: 'Response generation', value: 'Bedrock Nova + grounding guardrails' },
  { label: 'Latency target', value: '< 1.5s speech-to-first-audio' },
  { label: 'Widget delivery', value: '< 3kb async, zero Lighthouse impact' },
];

export default function AboutPage() {
  return (
    <div className="paper-grain">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          {/* Mission */}
          <div className="mb-16">
            <p className="section-label mb-3">About Voomate</p>
            <h1 className="section-title mb-6 max-w-3xl">
              Every merchant deserves a full-time sales assistant. We built the AI version.
            </h1>
            <p className="section-subtitle mb-4">
              Voomate started from a simple observation: the merchants who need great customer
              communication the most — the D2C brand with 10 people, the clinic with 3 staff, the
              EdTech platform serving students who speak regional languages — are the ones least
              able to afford the headcount to deliver it.
            </p>
            <p className="section-subtitle">
              We're building AI agents that handle the full customer conversation lifecycle — from
              "do you have this in blue?" to "where's my order?" to "I'd like to return this" —
              across every channel, in every language, without a human in the loop.
            </p>
          </div>

          {/* Principles */}
          <div className="mb-16">
            <h2 className="section-title mb-8">How we build.</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {PRINCIPLES.map(({ n, title, body }) => (
                <div key={n} className="card rounded-2xl p-6">
                  <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-[#E8590C]">
                    {n}
                  </span>
                  <h3 className="text-[1.05rem] font-bold text-[#1A1510] mt-3 mb-2">{title}</h3>
                  <p className="text-[13.5px] text-[#5A4D40] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div className="mb-16">
            <h2 className="section-title mb-2">Under the hood.</h2>
            <p className="section-subtitle mb-8">
              We believe transparency about our technology builds trust. Here's what powers Voomate.
            </p>
            <div className="card rounded-2xl overflow-hidden">
              {TECH.map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < TECH.length - 1 ? 'border-b border-[#F5EAD8]' : ''
                  }`}
                >
                  <span className="text-[13.5px] font-semibold text-[#5A4D40]">{label}</span>
                  <span className="text-[13px] text-[#1A1510] font-medium text-right max-w-[60%]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="section-subtitle mb-6 max-w-xl mx-auto">
              We're a small, focused team. If you're building for merchants, or you <em>are</em> a
              merchant who wants to get rid of your support backlog — we'd like to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001'}/sign-in`}
                className="btn-ember px-8 py-3.5 text-[1rem]"
              >
                Build your AI team →
              </a>
              <Link href="/contact" className="btn-outline px-8 py-3.5 text-[1rem]">
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
