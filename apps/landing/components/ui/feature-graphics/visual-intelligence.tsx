'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Search, ShoppingCart, MapPin, CalendarCheck, Tag } from 'lucide-react';

type Tool = {
  name: string;
  icon: React.ReactNode;
  input: string;
  output: string;
  color: string;
  industry: string;
};

const TOOLS: Tool[] = [
  {
    name: 'search_products',
    icon: <Search size={14} />,
    input: '"red shoes under ₹2000"',
    output: '14 results found',
    color: '#E8590C',
    industry: 'E-commerce',
  },
  {
    name: 'book_appointment',
    icon: <CalendarCheck size={14} />,
    input: '"dentist, tomorrow 10am"',
    output: 'Slot confirmed ✓',
    color: '#7C3AED',
    industry: 'Healthcare',
  },
  {
    name: 'apply_coupon',
    icon: <Tag size={14} />,
    input: '"FIRST10 discount code"',
    output: '₹340 savings applied',
    color: '#059669',
    industry: 'E-commerce',
  },
  {
    name: 'qualify_lead',
    icon: <MapPin size={14} />,
    input: '"budget: ₹80L, Bandra"',
    output: 'Lead score: 94/100',
    color: '#D97706',
    industry: 'Real Estate',
  },
  {
    name: 'add_to_cart',
    icon: <ShoppingCart size={14} />,
    input: '"Blue Horizon Tee / M"',
    output: 'Cart updated ✓',
    color: '#E8590C',
    industry: 'E-commerce',
  },
];

export function VisualIntelligence() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [execPhase, setExecPhase] = useState<'idle' | 'calling' | 'done'>('idle');

  useEffect(() => {
    const cycle = async () => {
      setExecPhase('calling');
      await new Promise((r) => setTimeout(r, 1400));
      setExecPhase('done');
      await new Promise((r) => setTimeout(r, 1800));
      setActiveIdx((i) => (i + 1) % TOOLS.length);
      setExecPhase('idle');
      await new Promise((r) => setTimeout(r, 300));
    };
    const t = setTimeout(cycle, 500);
    return () => clearTimeout(t);
  }, [activeIdx]);

  const tool = TOOLS[activeIdx];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF4ED] to-[#FFFBF5] relative overflow-hidden p-6">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-3">
        {/* Header */}
        <div className="text-center mb-2">
          <p className="text-[10px] font-bold text-[#9A8B7A] uppercase tracking-widest">
            Dynamic Tool Registry
          </p>
          <p className="text-[12px] text-[#5C4A38]">
            Agent executes real actions, not just answers
          </p>
        </div>

        {/* Tool queue */}
        <div className="flex gap-2 overflow-x-hidden justify-center flex-wrap">
          {TOOLS.map((t, i) => (
            <motion.div
              key={t.name}
              className="px-2 py-1 rounded-lg border text-[10px] font-bold"
              animate={{
                backgroundColor: i === activeIdx ? tool.color : '#FFFFFF',
                borderColor: i === activeIdx ? tool.color : '#EDE0CE',
                color: i === activeIdx ? '#FFFFFF' : '#9A8B7A',
                scale: i === activeIdx ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {t.name}
            </motion.div>
          ))}
        </div>

        {/* Active execution card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white rounded-2xl border border-[#EDE0CE] overflow-hidden shadow-sm"
          >
            {/* Function call header */}
            <div
              className="px-4 py-3 border-b border-[#F5EDE2]"
              style={{ backgroundColor: `${tool.color}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: tool.color }}
                  >
                    {tool.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#1A1510] font-mono">{tool.name}()</p>
                    <p className="text-[10px] text-[#9A8B7A]">{tool.industry}</p>
                  </div>
                </div>
                <motion.div
                  className="w-2 h-2 rounded-full"
                  animate={{
                    backgroundColor: execPhase === 'done' ? '#10B981' : tool.color,
                    scale: execPhase === 'calling' ? [1, 1.4, 1] : 1,
                  }}
                  transition={{ duration: 0.5, repeat: execPhase === 'calling' ? Infinity : 0 }}
                />
              </div>
            </div>

            {/* Input / Output */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-[10px] font-bold text-[#9A8B7A] w-10 flex-shrink-0 mt-0.5">
                  input
                </span>
                <code className="text-[11px] text-[#5C4A38] bg-[#FFF4ED] px-2 py-0.5 rounded">
                  {tool.input}
                </code>
              </div>

              <AnimatePresence>
                {execPhase === 'calling' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 py-1"
                  >
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tool.color }}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#9A8B7A]">executing…</span>
                  </motion.div>
                )}
                {execPhase === 'done' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 items-start"
                  >
                    <span className="text-[10px] font-bold text-[#9A8B7A] w-10 flex-shrink-0 mt-0.5">
                      output
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: tool.color }}>
                      {tool.output}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-1">
          {TOOLS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              animate={{
                width: i === activeIdx ? '20px' : '6px',
                backgroundColor: i === activeIdx ? tool.color : '#EDE0CE',
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
