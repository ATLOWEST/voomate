'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { PhoneCall, PhoneOutgoing, Mic, Clock } from 'lucide-react';

const CALLS = [
  {
    type: 'inbound',
    lang: 'English',
    query: 'I need to book a dentist appointment for tomorrow',
    action: 'check_availability',
    result: 'Slot confirmed: 10:30 AM',
  },
  {
    type: 'outbound',
    lang: 'हिन्दी',
    query: 'Reminder: Your appointment is at 10:30 AM',
    action: 'send_reminder',
    result: 'Call delivered',
  },
  {
    type: 'inbound',
    lang: 'Tamil',
    query: "What's the status of my order #4821?",
    action: 'check_order_status',
    result: 'Out for delivery',
  },
];

const LANGS = ['English', 'हिन्दी', 'Français', 'Tamil', 'বাংলা'];

export function VoiceWaveform() {
  const [callIdx, setCallIdx] = useState(0);
  const [phase, setPhase] = useState<'ringing' | 'speaking' | 'processing' | 'resolved'>('ringing');
  const [timer, setTimer] = useState(0);
  const [langIdx, setLangIdx] = useState(0);
  const bars = [4, 8, 12, 7, 5, 10, 14, 8, 5, 11, 9, 6, 13, 10, 4, 8, 14, 7, 5, 9];

  useEffect(() => {
    const langTimer = setInterval(() => setLangIdx((i) => (i + 1) % LANGS.length), 2000);
    return () => clearInterval(langTimer);
  }, []);

  useEffect(() => {
    setPhase('ringing');
    setTimer(0);
    const t1 = setTimeout(() => setPhase('speaking'), 800);
    const t2 = setTimeout(() => setPhase('processing'), 2200);
    const t3 = setTimeout(() => setPhase('resolved'), 3400);
    const t4 = setTimeout(() => {
      setCallIdx((i) => (i + 1) % CALLS.length);
    }, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [callIdx]);

  useEffect(() => {
    if (phase !== 'processing') return;
    setTimer(0);
    const t = setInterval(() => setTimer((n) => +(n + 0.05).toFixed(2)), 50);
    return () => clearInterval(t);
  }, [phase]);

  const call = CALLS[callIdx];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF4ED] to-[#FFFBF5] relative overflow-hidden p-6">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-4">
        {/* Call header */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#EDE0CE] px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background:
                  call.type === 'inbound'
                    ? 'linear-gradient(135deg,#E8590C,#B33208)'
                    : 'linear-gradient(135deg,#7C3AED,#4C1D95)',
              }}
              animate={{ scale: phase === 'ringing' ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.5, repeat: phase === 'ringing' ? Infinity : 0 }}
            >
              {call.type === 'inbound' ? (
                <PhoneCall size={16} className="text-white" />
              ) : (
                <PhoneOutgoing size={16} className="text-white" />
              )}
            </motion.div>
            <div>
              <p className="text-[11px] font-bold text-[#9A8B7A] uppercase tracking-wider">
                {call.type} call
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={callIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[13px] font-bold text-[#1A1510]"
                >
                  {phase === 'ringing'
                    ? 'Connecting…'
                    : phase === 'speaking'
                      ? 'Customer speaking'
                      : phase === 'processing'
                        ? 'Agent processing'
                        : 'Resolved ✓'}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF0E8] rounded-full">
            <div
              className={`w-1.5 h-1.5 rounded-full ${phase === 'resolved' ? 'bg-emerald-500' : 'bg-[#E8590C] animate-pulse'}`}
            />
            <span className="text-[10px] font-bold text-[#E8590C]">LIVE</span>
          </div>
        </div>

        {/* Waveform / query display */}
        <AnimatePresence mode="wait">
          {phase === 'speaking' && (
            <motion.div
              key="waveform"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-[#EDE0CE] px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Mic size={12} className="text-[#E8590C]" />
                <span className="text-[10px] font-bold text-[#9A8B7A] uppercase tracking-wider">
                  Transcribing — {call.lang}
                </span>
              </div>
              <p className="text-[13px] text-[#1A1510] leading-relaxed italic">"{call.query}"</p>
              <div className="flex items-center gap-[2px] h-6 mt-2">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-[#E8590C]"
                    style={{ opacity: 0.6 + (i % 3) * 0.13 }}
                    animate={{ height: [`${h * 2}px`, `${h * 3.5}px`, `${h * 2}px`] }}
                    transition={{
                      duration: 0.5 + (i % 4) * 0.12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.03,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-[#EDE0CE] px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#9A8B7A] uppercase tracking-wider">
                  Tool call: {call.action}()
                </span>
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-[#E8590C]" />
                  <span className="text-[11px] font-bold tabular-nums text-[#E8590C]">
                    {Math.min(timer, 1.3).toFixed(2)}s
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-[#F5E8DC] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#FA732F] to-[#E8590C] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {phase === 'resolved' && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-[#EDE0CE] px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9A8B7A]">Action completed</p>
                  <p className="text-[13px] font-bold text-[#1A1510]">{call.result}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language indicator */}
        <div className="flex items-center gap-2 justify-center">
          <span className="text-[10px] text-[#9A8B7A]">30+ languages</span>
          {LANGS.map((l, i) => (
            <motion.div
              key={l}
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: i === langIdx ? '#E8590C' : '#EDE0CE',
                scale: i === langIdx ? 1.4 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
          <AnimatePresence mode="wait">
            <motion.span
              key={langIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-bold text-[#E8590C]"
            >
              {LANGS[langIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
