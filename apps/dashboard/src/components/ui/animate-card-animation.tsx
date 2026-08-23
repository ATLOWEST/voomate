'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Card {
  id: number;
  contentType: 1 | 2 | 3;
}

const cardData = {
  1: {
    title: 'Voice Pipeline',
    description: '1.3s Real-time Speech Engine',
    gradient: 'linear-gradient(135deg, #E8590C, #B33208)',
  },
  2: {
    title: 'Chat & Multilingual',
    description: 'Auto-detects 30+ Languages',
    gradient: 'linear-gradient(135deg, #FFA866, #E8590C)',
  },
  3: {
    title: 'Action System',
    description: 'Order & Return Automation',
    gradient: 'linear-gradient(135deg, #FFCB99, #FFA866)',
  },
};

const initialCards: Card[] = [
  { id: 1, contentType: 1 },
  { id: 2, contentType: 2 },
  { id: 3, contentType: 3 },
];

const positionStyles = [
  { scale: 1, y: 12 },
  { scale: 0.95, y: -16 },
  { scale: 0.9, y: -44 },
];

const exitAnimation = {
  y: 340,
  scale: 1,
  zIndex: 10,
};

const enterAnimation = {
  y: -16,
  scale: 0.9,
};

function CardContent({ contentType }: { contentType: 1 | 2 | 3 }) {
  const data = cardData[contentType];

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="-outline-offset-1 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl outline outline-black/5 relative">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 opacity-90" style={{ background: data.gradient }} />
        {/* Rough texture overlay (matches our theme) */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Geometric Abstract Graphic */}
        <motion.div
          className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md absolute border border-white/30"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-sm absolute border border-white/20"
          style={{ transform: 'rotate(45deg)' }}
          animate={{ rotate: [45, 135, 225] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="flex w-full items-center justify-between gap-2 px-3 pb-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold text-[#1A1510] tracking-tight">{data.title}</span>
          <span className="text-[13px] font-medium text-[#9A8B7A]">{data.description}</span>
        </div>
        <button className="flex h-9 shrink-0 cursor-pointer select-none items-center gap-0.5 rounded-full bg-[#E8590C] pl-4 pr-3 text-[13px] font-semibold text-white shadow-sm hover:bg-[#D4410B] transition-colors">
          View
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
          >
            <path d="M9.5 18L15.5 12L9.5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AnimatedCard({
  card,
  index,
  isAnimating,
}: {
  card: Card;
  index: number;
  isAnimating: boolean;
}) {
  const { scale, y } = positionStyles[index] ?? positionStyles[2];
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index;

  const exitAnim = index === 0 ? exitAnimation : undefined;
  const initialAnim = index === 2 ? enterAnimation : undefined;

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale }}
      exit={exitAnim}
      transition={{
        type: 'spring',
        duration: 1,
        bounce: 0,
      }}
      style={{
        zIndex,
        left: '50%',
        x: '-50%',
        bottom: 0,
      }}
      className="absolute flex h-[290px] w-[324px] items-center justify-center overflow-hidden rounded-t-2xl border-x border-t border-[#EDE0CE] bg-white p-1.5 shadow-[0_4px_24px_rgba(26,21,16,0.08)] will-change-transform sm:w-[420px]"
    >
      <CardContent contentType={card.contentType} />
    </motion.div>
  );
}

export default function AnimatedCardStack() {
  const [cards, setCards] = useState(initialCards);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextId, setNextId] = useState(4);

  const handleAnimate = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const nextContentType = ((cards[2].contentType % 3) + 1) as 1 | 2 | 3;

    setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }]);
    setNextId((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 500); // Reset after animation starts
  };

  return (
    <div className="flex w-full flex-col items-center justify-center pt-2">
      <div className="relative h-[380px] w-full overflow-hidden sm:w-[480px]">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-10 -mt-px flex w-full items-center justify-center pt-2 pb-6">
        <button
          onClick={handleAnimate}
          className="flex h-10 cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border border-[#EDE0CE] bg-white px-5 font-semibold text-[#5A4D40] shadow-sm transition-all hover:bg-[#FAF5EE] hover:text-[#1A1510] active:scale-[0.98]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Cycle Feature
        </button>
      </div>
    </div>
  );
}
