'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Zap, MessageSquare, Bot, ShieldCheck, LineChart } from 'lucide-react';

const NODES = [
  {
    id: 0,
    title: 'Crawl & Ingest',
    desc: 'Reads your catalog, FAQs, and policies. Zero hallucinations.',
    Icon: Database,
  },
  {
    id: 1,
    title: 'Deploy Agent',
    desc: 'One script tag. Live across voice, chat, and email in 5 minutes.',
    Icon: Zap,
  },
  {
    id: 2,
    title: 'Handle Queries',
    desc: 'Responds in 1.3 s in 30+ languages including Hinglish.',
    Icon: MessageSquare,
  },
  {
    id: 3,
    title: 'Execute Actions',
    desc: 'Adds to cart, tracks orders, processes returns — real transactions.',
    Icon: Bot,
  },
  {
    id: 4,
    title: 'Audit & Learn',
    desc: 'Every conversation reviewed automatically. No manual QA.',
    Icon: ShieldCheck,
  },
  {
    id: 5,
    title: 'Insights & Scale',
    desc: 'Revenue influenced, resolution rates, language breakdown — always visible.',
    Icon: LineChart,
  },
];

export default function EnterpriseAIPipeline() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % NODES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full">
      {/* Node grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {NODES.map((node) => {
          const { Icon } = node;
          const isActive = active === node.id;
          const isPast = active > node.id;
          return (
            <motion.button
              key={node.id}
              onClick={() => setActive(node.id)}
              className="relative flex flex-col items-start text-left rounded-2xl border p-5 transition-all cursor-pointer"
              animate={{
                backgroundColor: isActive ? '#FFFFFF' : isPast ? '#FAF4EC' : '#FFFDF9',
                borderColor: isActive ? '#E8590C' : '#EAD9C4',
                boxShadow: isActive
                  ? '0 4px 24px rgba(232,89,12,0.18), 0 1px 4px rgba(28,20,16,0.06)'
                  : '0 1px 3px rgba(28,20,16,0.04)',
              }}
              transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Number */}
              <span
                className="text-[10px] font-black text-[#EAD9C4] mb-3 tabular-nums"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {String(node.id + 1).padStart(2, '0')}
              </span>

              {/* Icon box */}
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                animate={{
                  background: isActive ? 'linear-gradient(135deg, #E8590C, #A33A07)' : '#F7EFE3',
                }}
                transition={{ duration: 0.4 }}
              >
                <Icon
                  className="w-5 h-5 transition-colors duration-400"
                  style={{ color: isActive ? '#FFFFFF' : '#8C7B6B' }}
                />
              </motion.div>

              <h3 className="text-[14px] font-bold text-[#1C1410] mb-1.5 leading-tight">
                {node.title}
              </h3>
              <p className="text-[12px] text-[#8C7B6B] leading-relaxed">{node.desc}</p>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl"
                  style={{ background: 'linear-gradient(to right, #E8590C, #FFA85C)' }}
                  layoutId="active-line"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Progress strip */}
      <div className="mt-8 flex items-center gap-3">
        <span className="text-[11px] font-semibold text-[#8C7B6B] shrink-0">
          Stage {active + 1} of {NODES.length}
        </span>
        <div className="flex-1 h-1 rounded-full bg-[#EAD9C4] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(to right, #E8590C, #FFA85C)' }}
            animate={{ width: `${((active + 1) / NODES.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[11px] font-semibold text-[#1C1410] shrink-0">
          {NODES[active].title}
        </span>
      </div>
    </div>
  );
}
