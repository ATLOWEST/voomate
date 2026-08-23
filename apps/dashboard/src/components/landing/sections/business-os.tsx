'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, forwardRef, useRef } from 'react';
import {
  MessageSquare,
  ShoppingCart,
  CalendarCheck,
  TrendingUp,
  Zap,
  Globe2,
  Shield,
  Database,
  BrainCircuit,
} from 'lucide-react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Live Business Feed ───────────────────────────────────────────────────────

type FeedEvent = {
  id: string;
  channel: 'chat' | 'whatsapp' | 'widget';
  industry: string;
  customer: string;
  message: string;
  intent: string;
  tool: string;
  result: string;
  crm: string;
};

const FEED_EVENTS: FeedEvent[] = [
  {
    id: 'e1',
    channel: 'widget',
    industry: 'E-commerce',
    customer: 'Priya S.',
    message: 'Show me blue sneakers under ₹2000',
    intent: 'product_search',
    tool: 'search_products()',
    result: '12 matches found',
    crm: 'Session logged · High intent',
  },
  {
    id: 'e2',
    channel: 'chat',
    industry: 'Clinic',
    customer: 'Rahul M.',
    message: 'I need an appointment with Dr. Sharma tomorrow',
    intent: 'book_appointment',
    tool: 'check_availability()',
    result: '10:30 AM confirmed',
    crm: 'Appointment logged · CRM updated',
  },
  {
    id: 'e3',
    channel: 'whatsapp',
    industry: 'Salon',
    customer: 'Anita K.',
    message: 'Can I book a hair spa for Saturday?',
    intent: 'book_slot',
    tool: 'book_appointment()',
    result: 'Sat 2:00 PM booked',
    crm: 'Booking synced · Reminder queued',
  },
  {
    id: 'e4',
    channel: 'widget',
    industry: 'Real Estate',
    customer: 'Dev P.',
    message: '2BHK flats in Bandra under 1.2Cr?',
    intent: 'qualify_lead',
    tool: 'qualify_lead()',
    result: 'Lead score: 91/100',
    crm: 'Lead captured · Assigned to agent',
  },
  {
    id: 'e5',
    channel: 'chat',
    industry: 'Restaurant',
    customer: 'Meera R.',
    message: 'Table for 4 tonight at 8?',
    intent: 'book_table',
    tool: 'check_table_availability()',
    result: 'Table 7 reserved',
    crm: 'Reservation logged · SMS sent',
  },
];

const channelColors: Record<string, string> = {
  chat: '#7C3AED',
  whatsapp: '#25D366',
  widget: '#E8590C',
};

const channelLabels: Record<string, string> = {
  chat: 'Chat',
  whatsapp: 'WhatsApp',
  widget: 'Widget',
};

type Phase = 'message' | 'intent' | 'tool' | 'crm';

function LiveFeedCard() {
  const [eventIdx, setEventIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('message');

  useEffect(() => {
    setPhase('message');
    const t1 = setTimeout(() => setPhase('intent'), 1000);
    const t2 = setTimeout(() => setPhase('tool'), 2200);
    const t3 = setTimeout(() => setPhase('crm'), 3400);
    const t4 = setTimeout(() => {
      setEventIdx((i) => (i + 1) % FEED_EVENTS.length);
    }, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [eventIdx]);

  const ev = FEED_EVENTS[eventIdx];
  const c = channelColors[ev.channel];

  return (
    <div className="h-full flex flex-col gap-3 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#9A8B7A] uppercase tracking-widest">
            Live Operations Feed
          </p>
          <p className="text-[13px] font-bold text-[#1A1510]">Your AI employee at work</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
        </div>
      </div>

      {/* Event card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={eventIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1 bg-white rounded-2xl border border-[#EDE0CE] overflow-hidden shadow-sm"
        >
          {/* Customer message */}
          <div className="px-4 py-3 border-b border-[#F5EDE2]">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: c }}
              >
                {channelLabels[ev.channel]}
              </div>
              <span className="text-[10px] text-[#9A8B7A]">
                {ev.industry} · {ev.customer}
              </span>
            </div>
            <p className="text-[13px] text-[#1A1510] italic">"{ev.message}"</p>
          </div>

          {/* Pipeline steps */}
          <div className="px-4 py-3 space-y-2">
            {/* Intent */}
            <AnimatePresence>
              {(phase === 'intent' || phase === 'tool' || phase === 'crm') && (
                <motion.div
                  key="intent"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-md bg-[#FFF0E8] flex items-center justify-center flex-shrink-0">
                    <BrainCircuit size={11} className="text-[#E8590C]" />
                  </div>
                  <span className="text-[11px] text-[#5C4A38]">
                    Intent: <span className="font-bold font-mono">{ev.intent}</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tool execution */}
            <AnimatePresence>
              {(phase === 'tool' || phase === 'crm') && (
                <motion.div
                  key="tool"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-5 h-5 rounded-md bg-[#FFF0E8] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap size={11} className="text-[#E8590C]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#E8590C]">
                      {ev.tool}
                    </span>
                    <span className="text-[11px] text-[#5C4A38] ml-2">→ {ev.result}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CRM log */}
            <AnimatePresence>
              {phase === 'crm' && (
                <motion.div
                  key="crm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Database size={11} className="text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold">{ev.crm}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Industry indicator */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {FEED_EVENTS.map((e, i) => (
          <motion.div
            key={e.id}
            className="h-1.5 rounded-full"
            animate={{
              width: i === eventIdx ? '20px' : '6px',
              backgroundColor: i === eventIdx ? '#E8590C' : '#EDE0CE',
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Tool Registry Card ───────────────────────────────────────────────────────

const TOOL_REGISTRY = [
  { name: 'search_products', industry: 'E-commerce', icon: ShoppingCart, color: '#E8590C' },
  { name: 'book_appointment', industry: 'Healthcare', icon: CalendarCheck, color: '#7C3AED' },
  { name: 'qualify_lead', industry: 'Real Estate', icon: TrendingUp, color: '#D97706' },
  { name: 'check_table', industry: 'Restaurant', icon: Globe2, color: '#059669' },
  { name: 'apply_coupon', industry: 'E-commerce', icon: Zap, color: '#E8590C' },
  { name: 'issue_refund', industry: 'E-commerce', icon: Shield, color: '#EF4444' },
];

function ToolRegistryCard() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % TOOL_REGISTRY.length), 1600);
    return () => clearInterval(t);
  }, []);

  const active = TOOL_REGISTRY[activeIdx];
  const Icon = active.icon;

  return (
    <div className="h-full flex flex-col gap-3 p-5">
      <div>
        <p className="text-[11px] font-bold text-[#9A8B7A] uppercase tracking-widest">
          Dynamic Tool Registry
        </p>
        <p className="text-[13px] font-bold text-[#1A1510]">Actions, not just answers</p>
      </div>

      {/* Active tool highlight */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1 bg-white rounded-2xl border border-[#EDE0CE] flex flex-col items-center justify-center gap-3 shadow-sm"
        >
          <motion.div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: active.color }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon size={22} />
          </motion.div>
          <div className="text-center">
            <p className="text-[14px] font-black font-mono text-[#1A1510]">{active.name}()</p>
            <p className="text-[11px] text-[#9A8B7A]">{active.industry}</p>
          </div>
          <div className="h-1.5 w-24 bg-[#F5EDE2] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: active.color }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              key={activeIdx}
              transition={{ duration: 1.6, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Tool grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {TOOL_REGISTRY.map((t, i) => {
          const TIcon = t.icon;
          const isActive = i === activeIdx;
          return (
            <motion.div
              key={t.name}
              className="rounded-xl px-2 py-1.5 flex flex-col items-center gap-1 border cursor-pointer"
              animate={{
                backgroundColor: isActive ? `${t.color}18` : '#FFFFFF',
                borderColor: isActive ? t.color : '#EDE0CE',
              }}
              transition={{ duration: 0.3 }}
              onClick={() => setActiveIdx(i)}
            >
              <TIcon size={12} style={{ color: isActive ? t.color : '#9A8B7A' }} />
              <p className="text-[8px] font-bold text-[#9A8B7A] truncate w-full text-center">
                {t.name}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Connectivity Beam Card ───────────────────────────────────────────────────

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn(
        'z-10 flex size-10 items-center justify-center rounded-full border-2 border-[#EAD9C4] bg-white shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  ),
);
Circle.displayName = 'Circle';

function ConnectivityCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shopifyRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const notionRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<HTMLDivElement>(null);
  const crmRef = useRef<HTMLDivElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full flex flex-col gap-3 p-5">
      <div>
        <p className="text-[11px] font-bold text-[#9A8B7A] uppercase tracking-widest">
          One Brain, All Channels
        </p>
        <p className="text-[13px] font-bold text-[#1A1510]">Connects everything you already use</p>
      </div>
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center">
        <div className="w-full h-full flex flex-col justify-between py-4">
          {/* Left column */}
          <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around">
            <Circle ref={shopifyRef}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.52 7.73l-6.8-2.61c-.48-.18-1.02-.18-1.5 0l-6.8 2.61c-.6.23-1 .81-1.01 1.45l-.46 9.8c-.03.73.55 1.35 1.28 1.35H20c.71 0 1.28-.58 1.28-1.29l.3-9.87c.01-.63-.38-1.2-1.06-1.44z"
                  fill="#95BF47"
                />
                <path
                  d="M15.48 10.7c-.24 0-.46.12-.59.32l-2.19 3.52-1.02-1.53c-.15-.22-.4-.36-.67-.36s-.52.14-.67.36l-2.51 3.76c-.22.34-.04.82.35.88l8.28 1.24c.39.06.74-.24.74-.63v-6.93c0-.35-.28-.63-.63-.63z"
                  fill="#FFFFFF"
                />
              </svg>
            </Circle>
            <Circle ref={whatsappRef}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M12.05 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.74.45 3.42 1.31 4.93L2 22l5.3-1.39c1.47.81 3.12 1.24 4.8 1.24 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.05 2zm5.46 14.18c-.23.64-1.28 1.19-1.78 1.23-.46.04-1.06.13-3.37-.82-2.77-1.14-4.54-4-4.66-4.16-.12-.16-1.12-1.48-1.12-2.82 0-1.34.7-2 1-2.31.25-.26.56-.32.74-.32h.52c.17.01.4 0 .62.53.23.56.76 1.84.82 1.97.06.13.11.29.02.48-.09.2-.27.48-.4.47-.13.13-.26.27-.12.51.14.24.63 1.04 1.35 1.68.93.83 1.71 1.08 1.95 1.2.24.12.38.1.53-.08.14-.18.63-.73.8-1 .17-.26.34-.22.56-.14.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.59-.17 1.23z" />
              </svg>
            </Circle>
            <Circle ref={notionRef}>
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
                <path
                  d="M6 4.3l55.3-4.1c6.8-.6 8.5-.2 12.8 2.9l17.7 12.4c2.9 2.1 3.9 2.7 3.9 5.1v68.2c0 4.3-1.6 6.8-7 7.2L24.5 100c-4.1.2-6-.4-8.2-3.1L3.3 79.9C1 76.8 0 74.4 0 71.8V11.1c0-3.5 1.6-6.4 6-6.8z"
                  fill="#fff"
                />
                <path
                  d="M61.4.2L6 4.3C1.6 4.7 0 7.6 0 11.1v60.7c0 2.7 1 5.1 3.3 8.2l13 16.9c2.1 2.7 4.1 3.3 8.2 3.1l64.3-3.9c5.4-.4 7-2.9 7-7.2V20.6c0-2.2-.9-2.8-3.4-4.7L74.2 3.1C69.9 0 68.2-.4 61.4.2zM25.9 19.5c-5.2.4-6.4.4-9.4-2L8.9 11.5c-.8-.8-.4-1.8 1.6-1.9l53.2-3.9c4.5-.4 6.8 1.2 8.5 2.5l9.1 6.6c.4.2 1.4 1.4.2 1.4L26.6 19.5l-.7.1v-.1zM19.8 88.3V30.4c0-2.5.8-3.7 3.1-3.9L86 22.8c2.1-.2 3.1 1.2 3.1 3.7v57.5c0 2.5-.4 4.7-3.9 4.9l-60.4 3.5c-3.5.2-5-.9-5-4.1zm59.6-54.8c.4 1.7 0 3.5-1.7 3.7l-2.9.6v42.8c-2.5 1.4-4.9 2.1-6.8 2.1-3.1 0-3.9-1-6.2-3.9l-19-29.9v28.9l6 1.4s0 3.5-4.9 3.5l-13.4.8c-.4-.8 0-2.7 1.4-3.1l3.5-1V38.3l-4.3-1.4c-.4-1.7.6-4.3 3.3-4.5l14.4-1 19.8 30.3V35.1l-5-.6c-.4-2.1 1.2-3.7 3.1-3.9l13.4-.8z"
                  fill="#000"
                  fillRule="evenodd"
                />
              </svg>
            </Circle>
          </div>

          {/* Center — Brain */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Circle
              ref={brainRef}
              className="size-14 border-none shadow-[0_4px_20px_rgba(232,89,12,0.3)] bg-gradient-to-br from-[#FA732F] to-[#E8590C]"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </Circle>
          </div>

          {/* Right column */}
          <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-around">
            <Circle ref={crmRef}>
              <Database size={16} className="text-[#7C3AED]" />
            </Circle>
            <Circle ref={dashRef}>
              <TrendingUp size={16} className="text-[#059669]" />
            </Circle>
            <Circle>
              <MessageSquare size={16} className="text-[#E8590C]" />
            </Circle>
          </div>
        </div>

        {/* Beams */}
        {shopifyRef.current && brainRef.current && (
          <>
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={shopifyRef}
              toRef={brainRef}
              curvature={-20}
            />
            <AnimatedBeam containerRef={containerRef} fromRef={whatsappRef} toRef={brainRef} />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={notionRef}
              toRef={brainRef}
              curvature={20}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={brainRef}
              toRef={crmRef}
              reverse
              curvature={-20}
            />
            <AnimatedBeam containerRef={containerRef} fromRef={brainRef} toRef={dashRef} reverse />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Exported Section ─────────────────────────────────────────────────────────

export function BusinessOSSection() {
  return (
    <section className="py-24 bg-white border-y border-[#EDE0CE] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="section-label mb-3">(Agentic OS in action)</p>
          <h2 className="section-title max-w-2xl mx-auto">
            Your AI employee,
            <br />
            handling operations 24/7.
          </h2>
          <p className="section-subtitle mt-4 max-w-xl mx-auto">
            Not a chatbot. A full business operating system — classifying intent, executing tools,
            and logging structured data without a human touching anything.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-fr">
          {/* Live Feed — large left card */}
          <div className="lg:col-span-5 lg:row-span-2 rounded-3xl border border-[#EDE0CE] bg-gradient-to-br from-[#FFF4EC] to-[#FFFFFF] shadow-[0_4px_32px_rgba(28,20,16,0.05)] overflow-hidden min-h-[420px]">
            <LiveFeedCard />
          </div>

          {/* Tool Registry — top right */}
          <div className="lg:col-span-4 rounded-3xl border border-[#EDE0CE] bg-gradient-to-br from-[#FFF4EC] to-[#FFFFFF] shadow-[0_4px_32px_rgba(28,20,16,0.05)] overflow-hidden min-h-[200px]">
            <ToolRegistryCard />
          </div>

          {/* Stats — top far right */}
          <div className="lg:col-span-3 rounded-3xl border border-[#EDE0CE] bg-gradient-to-br from-[#FFF4EC] to-[#FFFFFF] shadow-[0_4px_32px_rgba(28,20,16,0.05)] overflow-hidden min-h-[200px]">
            <div className="h-full flex flex-col justify-between p-5">
              <p className="text-[11px] font-bold text-[#9A8B7A] uppercase tracking-widest">
                By the numbers
              </p>
              <div className="space-y-4">
                {[
                  { value: '1.3s', label: 'Avg response time', color: '#E8590C' },
                  { value: '6×', label: 'Better than SMS callback', color: '#7C3AED' },
                  { value: '30+', label: 'Languages natively', color: '#059669' },
                  { value: '0', label: 'Engineers required', color: '#D97706' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[22px] font-black" style={{ color: s.color }}>
                      {s.value}
                    </p>
                    <p className="text-[11px] text-[#9A8B7A]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Connectivity — bottom right (spans 7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-[#EDE0CE] bg-gradient-to-br from-[#FFF4EC] to-[#FFFFFF] shadow-[0_4px_32px_rgba(28,20,16,0.05)] overflow-hidden min-h-[220px]">
            <ConnectivityCard />
          </div>
        </div>
      </div>
    </section>
  );
}
