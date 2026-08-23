import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Headphones,
  MessageSquareText,
  PlugZap,
  Sparkles,
} from 'lucide-react';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://dashboard.atlowest.in';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-36 sm:pb-28 lg:pb-32 lg:pt-44">
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.04fr_.96fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="badge-ember animate-fade">
            <Sparkles size={13} /> Your AI business operation
          </p>
          <h1
            className="hero-title mt-6 animate-rise"
            style={{ '--delay': '70ms' } as React.CSSProperties}
          >
            Your business deserves a team that{' '}
            <span className="text-ember-gradient">never clocks out.</span>
          </h1>
          <p
            className="mt-6 max-w-xl text-[17px] leading-8 text-[#5C4A38] animate-fade"
            style={{ '--delay': '150ms' } as React.CSSProperties}
          >
            Voomate gives every business one connected AI team: it speaks to customers, understands
            your business, and safely gets work done across your tools.
          </p>
          <div className="hero-actions" data-reveal>
            <Link href="/overview" className="hero-action-primary">
              <span>Start now</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/#features" className="hero-action-secondary">
              <span>See how it works</span> <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-[#5C4A38]">
            {['No code required', 'Start with one agent', 'Keep every action in your control'].map(
              (item) => (
                <span className="inline-flex items-center gap-1.5" key={item}>
                  <CheckCircle2 size={15} className="text-[#E8590C]" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <div
          className="relative animate-rise"
          style={{ '--delay': '130ms' } as React.CSSProperties}
        >
          <div className="operation-window">
            <div className="operation-window__top">
              <span className="operation-window__mark">
                <Sparkles size={15} />
              </span>
              <div>
                <p>Voomate operation</p>
                <span>Everything connected</span>
              </div>
              <span className="operation-window__live">
                <i /> Live
              </span>
            </div>
            <div className="operation-window__body">
              <div className="operation-message">
                <span className="operation-avatar">A</span>
                <div>
                  <small>Customer asks</small>
                  <p>“Can you help me find the right option?”</p>
                </div>
              </div>
              <div className="operation-route">
                <span>
                  <MessageSquareText size={15} /> Understand
                </span>
                <b />
                <span>
                  <PlugZap size={15} /> Connect
                </span>
                <b />
                <span>
                  <Headphones size={15} /> Respond
                </span>
              </div>
              <div className="operation-result">
                <span className="operation-check">
                  <CheckCircle2 size={16} />
                </span>
                <div>
                  <small>Your agent</small>
                  <p>
                    Found the answer, checked your system, and helped the customer move forward.
                  </p>
                </div>
              </div>
            </div>
            <div className="operation-window__footer">
              <span>Web chat</span>
              <span>Website voice</span>
              <span>Phone calls</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-4 rounded-2xl border border-[#EAD9C4] bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(92,74,56,.12)] backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8C7B6B]">
              One shared brain
            </p>
            <p className="mt-1 text-[13px] font-bold text-[#1C1410]">
              Knowledge · Tools · Customers
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
