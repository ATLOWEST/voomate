'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Lock, Eye } from 'lucide-react';

type AuditEntry = {
  id: string;
  tool: string;
  risk: 'low' | 'medium' | 'high';
  status: 'approved' | 'gated' | 'blocked';
  detail: string;
  timestamp: string;
};

const AUDIT_LOG: AuditEntry[] = [
  {
    id: 't-001',
    tool: 'check_order_status',
    risk: 'low',
    status: 'approved',
    detail: 'Auto-approved · scoped read',
    timestamp: '0.02s',
  },
  {
    id: 't-002',
    tool: 'apply_coupon',
    risk: 'low',
    status: 'approved',
    detail: 'Coupon FIRST10 applied',
    timestamp: '0.08s',
  },
  {
    id: 't-003',
    tool: 'issue_refund',
    risk: 'high',
    status: 'gated',
    detail: '₹4,200 > ₹2,000 limit · Owner approval required',
    timestamp: '0.11s',
  },
  {
    id: 't-004',
    tool: 'cancel_order',
    risk: 'medium',
    status: 'gated',
    detail: 'Customer confirm required in-chat',
    timestamp: '0.05s',
  },
  {
    id: 't-005',
    tool: 'check_availability',
    risk: 'low',
    status: 'approved',
    detail: 'Read-only tool · auto-approved',
    timestamp: '0.03s',
  },
];

const riskColor = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
const statusIcon = { approved: '✓', gated: '⏸', blocked: '✕' };
const statusColor = { approved: '#10B981', gated: '#F59E0B', blocked: '#EF4444' };

export function QualityAudit() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    let i = 0;
    const addNext = () => {
      if (i >= AUDIT_LOG.length) {
        setTimeout(() => {
          setVisibleCount(0);
          i = 0;
          addNext();
        }, 2000);
        return;
      }
      setVisibleCount(i + 1);
      i++;
      setTimeout(addNext, 900);
    };
    const t = setTimeout(addNext, 400);
    return () => clearTimeout(t);
  }, []);

  const visible = AUDIT_LOG.slice(0, visibleCount);

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
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#EDE0CE] px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8590C] to-[#B33208] flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#1A1510]">Secure Execution Harness</p>
              <p className="text-[10px] text-[#9A8B7A]">Every action audited in real time</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            <Lock size={9} className="text-emerald-600" />
            <span className="text-[9px] font-bold text-emerald-700">ACTIVE</span>
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-2xl border border-[#EDE0CE] overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#F5EDE2] bg-[#FFF8F2]">
            <Eye size={11} className="text-[#9A8B7A]" />
            <span className="text-[10px] font-bold text-[#9A8B7A] uppercase tracking-wider">
              Immutable Audit Log
            </span>
          </div>
          <div className="divide-y divide-[#F5EDE2] min-h-[180px]">
            <AnimatePresence>
              {visible.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className={`px-4 py-2.5 ${entry.status === 'gated' ? 'bg-amber-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <motion.div
                        className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
                        style={{ backgroundColor: statusColor[entry.status] }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                      >
                        {statusIcon[entry.status]}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[#1A1510] font-mono truncate">
                          {entry.tool}()
                        </p>
                        <p className="text-[10px] text-[#9A8B7A] leading-snug">{entry.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: riskColor[entry.risk] }}
                      />
                      <span className="text-[9px] text-[#9A8B7A] tabular-nums">
                        {entry.timestamp}
                      </span>
                    </div>
                  </div>
                  {entry.status === 'gated' && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-amber-100 rounded-lg"
                    >
                      <AlertTriangle size={10} className="text-amber-600 flex-shrink-0" />
                      <span className="text-[9px] font-bold text-amber-700">
                        Awaiting owner approval
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Risk legend */}
        <div className="flex items-center justify-center gap-4">
          {(['low', 'medium', 'high'] as const).map((r) => (
            <div key={r} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColor[r] }} />
              <span className="text-[10px] text-[#9A8B7A] capitalize">{r} risk</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
