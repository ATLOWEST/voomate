'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SupportAgentFlow } from '@/components/ui/feature-graphics/support-agent-flow';
import { VisualIntelligence } from '@/components/ui/feature-graphics/visual-intelligence';
import { VoiceWaveform } from '@/components/ui/feature-graphics/voice-waveform';
import { QualityAudit } from '@/components/ui/feature-graphics/quality-audit';
import { ShopkeeperActions } from '@/components/ui/feature-graphics/shopkeeper-actions';

const SERVICES = [
  {
    id: '01',
    title: 'Web agent',
    description:
      'Replace a passive chat widget with a helpful AI teammate. It answers questions, guides customers, and can take the approved actions your business needs.',
    Graphic: SupportAgentFlow,
  },
  {
    id: '02',
    title: 'Voice conversations',
    description:
      'Let customers speak naturally on your website today, with calling as your team grows. The same agent remembers the same business context across every conversation.',
    Graphic: VoiceWaveform,
  },
  {
    id: '03',
    title: 'Connected actions',
    description:
      'Your agent can do more than talk: find products, book appointments, qualify leads, create tickets, and use the tools you approve for your business.',
    Graphic: VisualIntelligence,
  },
  {
    id: '04',
    title: 'Control built in',
    description:
      'You decide what an agent can access, what it can change, and what needs your approval. Every important action is visible and traceable.',
    Graphic: QualityAudit,
  },
  {
    id: '05',
    title: 'One business memory',
    description:
      'Bring conversations, customer context, knowledge and results into one place—so every channel feels like one continuous conversation.',
    Graphic: ShopkeeperActions,
  },
];

const AUTO_PLAY_DURATION = 5000;

export function VerticalTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % SERVICES.length);
  }, []);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + SERVICES.length) % SERVICES.length);
  }, []);

  const handleTabClick = (index: number) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
    setIsPaused(false);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(handleNext, AUTO_PLAY_DURATION);
    return () => clearInterval(interval);
  }, [activeIndex, isPaused, handleNext]);

  const variants = {
    enter: (d: number) => ({ y: d > 0 ? '-100%' : '100%', opacity: 0 }),
    center: { zIndex: 1, y: 0, opacity: 1 },
    exit: (d: number) => ({ zIndex: 0, y: d > 0 ? '100%' : '-100%', opacity: 0 }),
  };

  const ActiveGraphic = SERVICES[activeIndex].Graphic;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left — Tab List */}
        <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1 pt-4">
          <div className="mb-10">
            <p className="section-label mb-3">One connected operation</p>
            <h2 className="section-title">
              One AI team.
              <br />
              Every channel.
              <br />
              Work that moves forward.
            </h2>
          </div>

          <div className="flex flex-col space-y-0">
            {SERVICES.map((service, index) => {
              const isActive = activeIndex === index;
              return (
                <button
                  key={service.id}
                  onClick={() => handleTabClick(index)}
                  className={cn(
                    'group relative flex items-start gap-4 py-5 md:py-6 text-left transition-all duration-500 border-t border-[#EAD9C4] first:border-0',
                    isActive ? 'text-[#1C1410]' : 'text-[#8C7B6B] hover:text-[#5C4A38]',
                  )}
                >
                  {/* Progress bar */}
                  <div className="absolute left-[-16px] md:left-[-24px] top-0 bottom-0 w-[2px] bg-[#EAD9C4]">
                    {isActive && (
                      <motion.div
                        key={`${index}-${isPaused}`}
                        className="absolute top-0 left-0 w-full bg-[#E8590C] origin-top"
                        initial={{ height: '0%' }}
                        animate={isPaused ? { height: '0%' } : { height: '100%' }}
                        transition={{ duration: AUTO_PLAY_DURATION / 1000, ease: 'linear' }}
                      />
                    )}
                  </div>

                  <span className="text-[10px] font-bold mt-1.5 tabular-nums opacity-50">
                    /{service.id}
                  </span>

                  <div className="flex flex-col gap-1.5 flex-1">
                    <span
                      className={cn(
                        'text-[1.1rem] font-bold tracking-tight transition-colors duration-500',
                        isActive ? 'text-[#1A1510]' : '',
                      )}
                    >
                      {service.title}
                    </span>

                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                          className="text-[13px] text-[#5C4A38] leading-relaxed max-w-sm overflow-hidden"
                        >
                          {service.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — Animated Graphic Panel */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div
            className="relative group/gallery"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="relative h-[460px] rounded-3xl overflow-hidden border border-[#EAD9C4] shadow-[0_4px_32px_rgba(28,20,16,0.07)]"
              style={{ background: 'linear-gradient(145deg, #FFF4EC 0%, #FFFFFF 60%)' }}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={activeIndex}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    y: { type: 'spring', stiffness: 260, damping: 32 },
                    opacity: { duration: 0.4 },
                  }}
                  className="absolute inset-0 w-full h-full cursor-pointer"
                  onClick={handleNext}
                >
                  <ActiveGraphic />
                </motion.div>
              </AnimatePresence>

              {/* Navigation arrows */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#EDE0CE] flex items-center justify-center text-[#1A1510] hover:bg-white transition-all active:scale-90 shadow-sm"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#EDE0CE] flex items-center justify-center text-[#1A1510] hover:bg-white transition-all active:scale-90 shadow-sm"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {SERVICES.map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 rounded-full cursor-pointer"
                    animate={{
                      width: i === activeIndex ? '20px' : '6px',
                      backgroundColor: i === activeIndex ? '#E8590C' : '#EAD9C4',
                    }}
                    transition={{ duration: 0.3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTabClick(i);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerticalTabs;
