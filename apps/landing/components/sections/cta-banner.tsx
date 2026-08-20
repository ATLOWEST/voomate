import Link from 'next/link';
import { SplineScene } from '@/components/ui/splite';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://atlowest.in';

const GUARANTEES = [
  { label: 'No credit card', sub: 'Start with 100 free conversations' },
  { label: 'Live in 5 minutes', sub: 'One script tag, nothing else' },
  { label: 'Cancel any time', sub: 'No contracts, no lock-in' },
];

export function CTASection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Full-width banner wrapper */}
        <div className="rounded-3xl relative">
          {/* Top ember accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background:
                'linear-gradient(to right, transparent, #E8590C 30%, #FFA85C 70%, transparent)',
            }}
          />

          {/* Subtle radial glow */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-50 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 70% 30%, #FFE5CC, transparent 70%)' }}
          />

          <div className="flex flex-col lg:flex-row items-center gap-12 p-10 md:p-14">
            {/* Left — copy */}
            <div className="flex-1 relative z-10">
              <h2 className="section-title mb-4 max-w-md">
                Deploy your AI shopkeeper
                <br />
                in 5 minutes flat.
              </h2>
              <p className="section-subtitle mb-8 max-w-md">
                No engineers. No training data. No ongoing maintenance. Paste one tag — Voomate
                handles every customer conversation, in every language, 24 hours a day.
              </p>

              <div className="mb-8">
                <a href={`${DASHBOARD_URL}/sign-in`} className="hero-action-primary">
                  <span>Start now</span> →
                </a>
              </div>

              {/* Guarantee trio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {GUARANTEES.map((g) => (
                  <div
                    key={g.label}
                    className="bg-white/70 backdrop-blur-sm border border-[#EAD9C4] rounded-2xl px-4 py-3.5"
                  >
                    <p className="text-[13px] font-bold text-[#1C1410]">{g.label}</p>
                    <p className="text-[11px] text-[#8C7B6B] mt-0.5">{g.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — 3D Spline agent */}
            <div className="flex-1 w-full h-[380px] lg:h-[440px] relative">
              <div
                className="absolute inset-0 rounded-full opacity-60 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, #FFE5CC, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full relative z-10"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
