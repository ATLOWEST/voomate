'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  {
    n: '01',
    title: 'Crawl & Ingest',
    sub: 'Voomate crawls your product pages, FAQs, and return policies. Builds a verified knowledge base with zero hallucinations.',
    angle: -90, // 12 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Deploy Agent',
    sub: 'One script tag on your site or install the Shopify app. Your AI shopkeeper goes live in under 5 minutes.',
    angle: -30, // 2 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Handle Queries',
    sub: 'Voice, chat, email — customers pick the channel. Voomate auto-detects language and responds in 1.3 seconds.',
    angle: 30, // 4 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    n: '04',
    title: 'Execute Actions',
    sub: 'Not just answers. Adds to cart, tracks orders, initiates returns, processes refunds — real transactions, zero staff.',
    angle: 90, // 6 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    n: '05',
    title: 'Audit & Learn',
    sub: 'Every conversation is auto-audited for quality. Patterns surface automatically. Agent improves without manual work.',
    angle: 150, // 8 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    n: '06',
    title: 'Insights & Scale',
    sub: 'Analytics surfaces resolution rates, language breakdowns, peak hours, and revenue influenced by your AI agent.',
    angle: 210, // 10 o'clock
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth={2}
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const R = 180; // orbit radius

export function OrbitDiagram() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((a) => (a + 1) % STAGES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 3500);
    return () => clearInterval(t);
  }, [paused, next]);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ height: 520 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* SVG orbit ring */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {/* Outer dashed orbit ring */}
        <circle
          cx="50%"
          cy="50%"
          r={R}
          fill="none"
          stroke="#EDE0CE"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        {/* Slow-spinning accent arc */}
        <motion.circle
          cx="50%"
          cy="50%"
          r={R}
          fill="none"
          stroke="#E8590C"
          strokeWidth="2"
          strokeDasharray={`${R * 0.6} ${R * 5.66}`}
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50% 50%' }}
          opacity={0.4}
        />
        {/* Connector line from active node to center */}
      </svg>

      {/* Center panel */}
      <div className="relative z-10 w-52 h-52 rounded-full bg-white border-2 border-[#EDE0CE] shadow-[0_4px_32px_rgba(26,21,16,0.08)] flex flex-col items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35 }}
          >
            <span
              className="text-[2rem] font-black text-[#E8590C] leading-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {STAGES[active].n}
            </span>
            <p className="text-[13px] font-bold text-[#1A1510] leading-tight">
              {STAGES[active].title}
            </p>
            <p className="text-[11px] text-[#9A8B7A] leading-relaxed">{STAGES[active].sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Orbit nodes — positioned via absolute transform */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {STAGES.map((stage, i) => {
          const rad = toRad(stage.angle);
          const x = R * Math.cos(rad);
          const y = R * Math.sin(rad);
          const isActive = i === active;

          return (
            <motion.button
              key={stage.n}
              className="absolute flex flex-col items-center gap-1.5 pointer-events-auto cursor-pointer"
              style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
              onClick={() => {
                setActive(i);
                setPaused(true);
                setTimeout(() => setPaused(false), 5000);
              }}
              whileHover={{ scale: 1.1 }}
            >
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md border-2"
                animate={{
                  backgroundColor: isActive ? '#E8590C' : '#FFFFFF',
                  borderColor: isActive ? '#B33208' : '#EDE0CE',
                  color: isActive ? '#FFFFFF' : '#5A4D40',
                  boxShadow: isActive
                    ? '0 4px 20px rgba(232,89,12,0.35)'
                    : '0 2px 8px rgba(26,21,16,0.06)',
                }}
                transition={{ duration: 0.35 }}
              >
                <div className={isActive ? 'text-white' : 'text-[#5A4D40]'}>{stage.icon}</div>
              </motion.div>
              <motion.span
                className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight max-w-[80px]"
                animate={{ color: isActive ? '#E8590C' : '#9A8B7A' }}
                transition={{ duration: 0.3 }}
              >
                {stage.title}
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {/* Dot progress */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
        {STAGES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full cursor-pointer"
            animate={{
              width: i === active ? '20px' : '6px',
              backgroundColor: i === active ? '#E8590C' : '#EDE0CE',
            }}
            transition={{ duration: 0.3 }}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
