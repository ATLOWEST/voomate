'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ShoppingBag,
  Heart,
  GraduationCap,
  Home,
  Code,
  CreditCard,
  Plane,
  Utensils,
  Car,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  Heart,
  GraduationCap,
  Home,
  Code,
  CreditCard,
  Plane,
  Utensils,
  Car,
};

const INDUSTRIES = [
  {
    name: 'E-commerce & D2C',
    iconKey: 'ShoppingBag',
    metric: '72% fewer tickets',
    painPoint: '"Where is my order?" fills your inbox 24/7.',
    solution:
      'Handles WISMO, returns, and size guidance in any language — voice or chat, around the clock.',
    useCases: [
      'Order tracking automation',
      'Return & refund processing',
      'Size and variant guidance',
      'Cart recovery via voice',
    ],
  },
  {
    name: 'Healthcare',
    iconKey: 'Heart',
    metric: '3× faster booking',
    painPoint: 'Patients call to reschedule at 11 PM. Nobody answers.',
    solution:
      'Voice agent handles scheduling, prescription refills, and lab result queries — fully automated.',
    useCases: [
      'Appointment scheduling',
      'Prescription refill reminders',
      'Lab result delivery',
      'Insurance query resolution',
    ],
  },
  {
    name: 'Education',
    iconKey: 'GraduationCap',
    metric: '40% more enrolments',
    painPoint: "Students ask admission questions at midnight. Your team isn't there.",
    solution:
      'Chat agent answers fees, deadlines, and course details in regional languages — instantly, always.',
    useCases: [
      'Admission query handling',
      'Fee & deadline guidance',
      'Regional language support',
      'Lead qualification',
    ],
  },
  {
    name: 'Real Estate',
    iconKey: 'Home',
    metric: '2.5× faster lead response',
    painPoint: 'Leads go cold in 5 minutes. Your agents respond in 5 hours.',
    solution:
      'AI qualifies leads, schedules site visits, and sends brochures in seconds — not hours.',
    useCases: [
      'Lead qualification',
      'Site visit scheduling',
      'Brochure delivery automation',
      'Follow-up sequences',
    ],
  },
  {
    name: 'SaaS & Tech',
    iconKey: 'Code',
    metric: '81% first-contact resolved',
    painPoint: 'Tier-1 tickets eat engineering time that should go to product.',
    solution:
      'AI resolves password resets, billing queries, and feature questions — escalates only the complex 19%.',
    useCases: [
      'Password & access recovery',
      'Billing query resolution',
      'Feature documentation answers',
      'Escalation routing',
    ],
  },
  {
    name: 'Financial Services',
    iconKey: 'CreditCard',
    metric: '50% call centre savings',
    painPoint: "KYC and loan queries need multilingual support your team can't scale.",
    solution: 'Voice agent handles KYC status, EMI queries, and balance checks in 12+ languages.',
    useCases: [
      'KYC status updates',
      'EMI & loan queries',
      'Account balance checks',
      'Multilingual compliance support',
    ],
  },
  {
    name: 'Travel & Hospitality',
    iconKey: 'Plane',
    metric: '24/7 with zero staff',
    painPoint: 'Booking modifications at 2 AM go unanswered. Guests cancel.',
    solution:
      'AI modifies bookings, handles cancellations, and recommends upgrades — no front desk needed.',
    useCases: [
      'Booking modification',
      'Cancellation processing',
      'Upgrade upselling',
      'Late-night guest support',
    ],
  },
  {
    name: 'Food & Delivery',
    iconKey: 'Utensils',
    metric: '90% auto-resolved',
    painPoint: 'Damaged or wrong order photos sit in a queue for hours.',
    solution:
      'Visual AI reads the photo, classifies the issue, and auto-processes a refund or replacement instantly.',
    useCases: [
      'Photo-based complaint intake',
      'Damage classification',
      'Auto refund/replace',
      'Driver communication',
    ],
  },
  {
    name: 'Automotive',
    iconKey: 'Car',
    metric: '60% fewer missed bookings',
    painPoint: 'Service booking calls go unanswered. Customers go to a competitor.',
    solution:
      'Voice agent books service slots, checks parts availability, and sends quotes — across all dealerships.',
    useCases: [
      'Service appointment booking',
      'Parts availability checks',
      'Quote generation',
      'Multi-dealership routing',
    ],
  },
];

export function IndustriesSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (idx: number) => {
      setDirection(idx > active ? 1 : -1);
      setActive(idx);
    },
    [active],
  );

  const next = useCallback(() => {
    setDirection(1);
    setActive((a) => (a + 1) % INDUSTRIES.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setActive((a) => (a - 1 + INDUSTRIES.length) % INDUSTRIES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, next]);

  const ind = INDUSTRIES[active];
  const Icon = ICON_MAP[ind.iconKey];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '40%' : '-40%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-20%' : '20%', opacity: 0 }),
  };

  return (
    <section
      className="py-28 relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="section-label mb-3">(Industries)</p>
            <h2 className="section-title">Built for your market.</h2>
            <p className="section-subtitle mt-2 max-w-sm">
              Real use cases. Real metrics. Click to explore.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-[#EAD9C4] bg-white flex items-center justify-center text-[#5C4A38] hover:border-[#E8590C]/40 hover:text-[#E8590C] transition-all active:scale-90 shadow-sm"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-[#EAD9C4] bg-white flex items-center justify-center text-[#5C4A38] hover:border-[#E8590C]/40 hover:text-[#E8590C] transition-all active:scale-90 shadow-sm"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-stretch">
          {/* Left — slide */}
          <div className="relative h-[340px] rounded-3xl overflow-hidden bg-white border border-[#EAD9C4] shadow-[0_4px_24px_rgba(28,20,16,0.07)]">
            {/* Warm ember bg layer */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #FFF4EC 0%, #FFFFFF 60%)' }}
            />
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle, #FFE5CC, transparent 70%)',
                transform: 'translate(40%, -40%)',
              }}
            />

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={active}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 34 }}
                className="absolute inset-0 flex flex-col justify-end p-8"
                onClick={next}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#FFF4EC] border border-[#FFE5CC] flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-6 h-6 text-[#E8590C]" />
                </div>
                <h3
                  className="text-[1.7rem] font-black text-[#1C1410] leading-none mb-2 tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {ind.name}
                </h3>
                <p className="text-[14px] text-[#5C4A38] leading-relaxed max-w-md">
                  &ldquo;{ind.painPoint}&rdquo;
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-[#FFF4EC] border border-[#FFE5CC] rounded-full px-4 py-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8590C]" />
                  <span className="text-[13px] font-bold text-[#E8590C]">{ind.metric}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dot nav */}
            <div className="absolute bottom-5 right-6 flex gap-1.5 z-10">
              {INDUSTRIES.map((_, i) => (
                <motion.button
                  key={i}
                  className="h-1.5 rounded-full"
                  animate={{
                    width: i === active ? '18px' : '6px',
                    backgroundColor: i === active ? '#E8590C' : '#EAD9C4',
                  }}
                  transition={{ duration: 0.3 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    go(i);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right — solution + use cases */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 bg-white border border-[#EAD9C4] rounded-2xl p-6 shadow-[0_2px_12px_rgba(28,20,16,0.05)]">
              <p className="text-[10px] font-bold text-[#8C7B6B] uppercase tracking-[0.18em] mb-3">
                How Voomate solves it
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={active}
                  className="text-[14px] text-[#1C1410] leading-relaxed font-medium"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  {ind.solution}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="bg-white border border-[#EAD9C4] rounded-2xl p-6 shadow-[0_2px_12px_rgba(28,20,16,0.05)]">
              <p className="text-[10px] font-bold text-[#8C7B6B] uppercase tracking-[0.18em] mb-3">
                What it handles
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="grid grid-cols-1 gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {ind.useCases.map((uc) => (
                    <div key={uc} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E8590C] shrink-0" />
                      <span className="text-[13px] text-[#5C4A38] font-medium">{uc}</span>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Industry chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {INDUSTRIES.map((ind, i) => {
            const IIcon = ICON_MAP[ind.iconKey];
            return (
              <button
                key={ind.name}
                onClick={() => go(i)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-all ${
                  i === active
                    ? 'bg-[#E8590C] border-[#C94A09] text-white shadow-[0_2px_12px_rgba(232,89,12,0.25)]'
                    : 'bg-white border-[#EAD9C4] text-[#5C4A38] hover:border-[#E8590C]/40'
                }`}
              >
                <IIcon size={11} />
                {ind.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
