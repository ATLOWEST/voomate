'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart2, MessageSquare, PhoneCall, ShoppingBag, TrendingUp } from 'lucide-react';

type CRMEntry = {
  id: string;
  channel: 'chat' | 'voice' | 'whatsapp';
  type: 'lead' | 'order' | 'appointment' | 'complaint';
  customer: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  value?: string;
  time: string;
};

const channelIcon = {
  chat: <MessageSquare size={11} className="text-[#E8590C]" />,
  voice: <PhoneCall size={11} className="text-[#7C3AED]" />,
  whatsapp: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366">
      <path d="M12.05 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.74.45 3.42 1.31 4.93L2 22l5.3-1.39c1.47.81 3.12 1.24 4.8 1.24 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.05 2zm5.46 14.18c-.23.64-1.28 1.19-1.78 1.23-.46.04-1.06.13-3.37-.82-2.77-1.14-4.54-4-4.66-4.16-.12-.16-1.12-1.48-1.12-2.82 0-1.34.7-2 1-2.31.25-.26.56-.32.74-.32.18 0 .37 0 .52.01.17.01.4 0 .62.53.23.56.76 1.84.82 1.97.06.13.11.29.02.48-.09.2-.14.32-.27.48-.13.16-.29.35-.4.47-.13.13-.26.27-.12.51.14.24.63 1.04 1.35 1.68.93.83 1.71 1.08 1.95 1.2.24.12.38.1.53-.08.14-.18.63-.73.8-1 .17-.26.34-.22.56-.14.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.59-.17 1.23z" />
    </svg>
  ),
};
const sentimentColor = { positive: '#10B981', neutral: '#9A8B7A', negative: '#EF4444' };
const typeColor = {
  lead: '#7C3AED',
  order: '#E8590C',
  appointment: '#059669',
  complaint: '#EF4444',
};

const CRM_FEED: CRMEntry[] = [
  {
    id: 'c1',
    channel: 'chat',
    type: 'order',
    customer: 'Priya S.',
    summary: 'Added Blue Horizon Tee to cart',
    sentiment: 'positive',
    value: '₹1,299',
    time: 'just now',
  },
  {
    id: 'c2',
    channel: 'voice',
    type: 'appointment',
    customer: 'Rahul M.',
    summary: 'Booked dentist: Tomorrow 10:30 AM',
    sentiment: 'positive',
    time: '2m ago',
  },
  {
    id: 'c3',
    channel: 'whatsapp',
    type: 'lead',
    customer: 'Anita K.',
    summary: 'Qualified lead · ₹80L budget, Bandra',
    sentiment: 'positive',
    value: '₹80L',
    time: '5m ago',
  },
  {
    id: 'c4',
    channel: 'chat',
    type: 'complaint',
    customer: 'Dev P.',
    summary: 'Wrong item received · Flagged for review',
    sentiment: 'negative',
    time: '8m ago',
  },
];

export function ShopkeeperActions() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [stats, setStats] = useState({ leads: 0, orders: 0, resolved: 0 });

  useEffect(() => {
    setVisibleCount(0);
    setStats({ leads: 0, orders: 0, resolved: 0 });
    let i = 0;
    const addNext = () => {
      if (i >= CRM_FEED.length) {
        setTimeout(() => {
          setVisibleCount(0);
          setStats({ leads: 0, orders: 0, resolved: 0 });
          i = 0;
          addNext();
        }, 2000);
        return;
      }
      const e = CRM_FEED[i];
      setVisibleCount(i + 1);
      setStats((s) => ({
        leads: s.leads + (e.type === 'lead' ? 1 : 0),
        orders: s.orders + (e.type === 'order' ? 1 : 0),
        resolved: s.resolved + (e.sentiment === 'positive' ? 1 : 0),
      }));
      i++;
      setTimeout(addNext, 1000);
    };
    const t = setTimeout(addNext, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF4ED] to-[#FFFBF5] relative overflow-hidden p-5">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-3">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'New Leads',
              value: stats.leads,
              icon: <TrendingUp size={12} />,
              color: '#7C3AED',
            },
            {
              label: 'Orders',
              value: stats.orders,
              icon: <ShoppingBag size={12} />,
              color: '#E8590C',
            },
            {
              label: 'Resolved',
              value: stats.resolved,
              icon: <BarChart2 size={12} />,
              color: '#059669',
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="bg-white rounded-xl border border-[#EDE0CE] px-3 py-2 text-center shadow-sm"
            >
              <div
                className="flex items-center justify-center gap-1 mb-0.5"
                style={{ color: s.color }}
              >
                {s.icon}
              </div>
              <motion.p
                className="text-[18px] font-black tabular-nums"
                style={{ color: s.color }}
                key={s.value}
              >
                {s.value}
              </motion.p>
              <p className="text-[9px] text-[#9A8B7A]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* CRM feed */}
        <div className="bg-white rounded-2xl border border-[#EDE0CE] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#F5EDE2] bg-[#FFF8F2]">
            <span className="text-[10px] font-bold text-[#9A8B7A] uppercase tracking-wider">
              Live CRM Feed
            </span>
            <span className="text-[9px] text-[#9A8B7A]">Auto-populated · no manual entry</span>
          </div>
          <div className="divide-y divide-[#F5EDE2] min-h-[160px]">
            <AnimatePresence>
              {CRM_FEED.slice(0, visibleCount).map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  className="px-4 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        {channelIcon[entry.channel]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-[#1A1510] truncate">
                            {entry.customer}
                          </p>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                            style={{ backgroundColor: typeColor[entry.type] }}
                          >
                            {entry.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#9A8B7A] leading-snug">{entry.summary}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {entry.value && (
                        <span className="text-[10px] font-bold text-[#E8590C]">{entry.value}</span>
                      )}
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sentimentColor[entry.sentiment] }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#9A8B7A]">
          Every action across every channel → one structured record
        </p>
      </div>
    </div>
  );
}
