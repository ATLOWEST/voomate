'use client';

import { useState } from 'react';
import { Bot, Phone, Globe, Database, Plus, Link as LinkIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';

export type AgentSlotId = 'voice' | 'web' | 'integration';

export interface AgentSlot {
  id: AgentSlotId;
  name: string;
  type: AgentSlotId;
  status: 'not_set_up' | 'active' | 'paused';
  lastActivity?: string;
  conversations?: number;
  sparklineData?: number[];
  connectedTo?: AgentSlotId[];
}

const mockSlots: AgentSlot[] = [
  {
    id: 'voice',
    name: 'Voice Calling Agent',
    type: 'voice',
    status: 'not_set_up',
    connectedTo: [],
  },
  {
    id: 'web',
    name: 'Web Agent',
    type: 'web',
    status: 'not_set_up',
    connectedTo: [],
  },
  {
    id: 'integration',
    name: 'Integration Hub',
    type: 'integration',
    status: 'not_set_up',
    connectedTo: [],
  },
];

function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min;

  return (
    <div className="flex items-end h-8 gap-0.5">
      {data.map((val, i) => (
        <div
          key={i}
          className={cn('w-1.5 rounded-[1px] opacity-70', colorClass)}
          style={{ height: `${Math.max(10, ((val - min) / (range || 1)) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function AgentGrid() {
  const router = useRouter();
  const [slots, setSlots] = useState<AgentSlot[]>(mockSlots);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Connection state
  const [anchorId, setAnchorId] = useState<AgentSlotId | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const activeSlots = slots.filter((s) => s.status !== 'not_set_up');

  const getServiceIcon = (type: AgentSlotId) => {
    switch (type) {
      case 'voice':
        return <Phone className="w-5 h-5" />;
      case 'web':
        return <Globe className="w-5 h-5" />;
      case 'integration':
        return <Database className="w-5 h-5" />;
    }
  };

  const getServiceTitle = (type: AgentSlotId) => {
    switch (type) {
      case 'voice':
        return 'Voice Calling Agent';
      case 'web':
        return 'Web Agent';
      case 'integration':
        return 'Integration Agent';
    }
  };

  const getStatusColor = (status: AgentSlot['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      case 'paused':
        return 'bg-muted-foreground';
      default:
        return 'bg-transparent';
    }
  };

  const handleCardClick = (slot: AgentSlot) => {
    // Connection Mode Logic
    if (anchorId) {
      if (anchorId === slot.id) {
        setAnchorId(null); // Deselect anchor
        return;
      }

      // Attempt connection
      const anchor = slots.find((s) => s.id === anchorId);
      if (!anchor) return;

      const isCompatible =
        (anchor.id === 'integration' && (slot.id === 'voice' || slot.id === 'web')) ||
        (slot.id === 'integration' && (anchor.id === 'voice' || anchor.id === 'web'));

      if (isCompatible) {
        // Toggle Connection
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id === anchor.id || s.id === slot.id) {
              const partnerId = s.id === anchor.id ? slot.id : anchor.id;
              const currentlyConnected = s.connectedTo?.includes(partnerId);
              return {
                ...s,
                connectedTo: currentlyConnected
                  ? (s.connectedTo || []).filter((id) => id !== partnerId)
                  : [...(s.connectedTo || []), partnerId],
              };
            }
            return s;
          }),
        );

        const wasConnected = anchor.connectedTo?.includes(slot.id);
        setToast({
          message: wasConnected
            ? `Disconnected ${anchor.name} from ${slot.name}.`
            : `${anchor.name} is now connected to ${slot.name}.`,
          type: 'success',
        });
        setTimeout(() => setToast(null), 3000);
      }

      setAnchorId(null);
    } else {
      // If not in connection mode, click goes to config
      router.push(`/agents/${slot.id}`);
    }
  };

  const isCompatibleWithAnchor = (slotId: AgentSlotId) => {
    if (!anchorId || anchorId === slotId) return false;
    // Voice and Web can connect to Integration. They cannot connect to each other.
    return (
      (anchorId === 'integration' && (slotId === 'voice' || slotId === 'web')) ||
      (slotId === 'integration' && (anchorId === 'voice' || anchorId === 'web'))
    );
  };

  return (
    <div className="w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {anchorId
              ? 'Select a compatible agent to connect or disconnect.'
              : 'Manage your agents. Click an active agent to connect it to others.'}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-lg text-[13px] font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      {/* Add Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div>
                <h2 className="text-[16px] font-bold text-foreground">Add New Agent</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Select a service to set up.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(['voice', 'web', 'integration'] as AgentSlotId[]).map((type) => {
                const isAlreadyAdded = slots.find((s) => s.id === type)?.status !== 'not_set_up';
                return (
                  <button
                    key={type}
                    disabled={isAlreadyAdded}
                    onClick={() => {
                      setSlots((prev) =>
                        prev.map((s) =>
                          s.id === type
                            ? {
                                ...s,
                                status: 'active',
                                lastActivity: 'Just now',
                                sparklineData: [0, 20, 10, 40, 50, 80, 100],
                              }
                            : s,
                        ),
                      );
                      setIsAddModalOpen(false);
                      setToast({
                        message: `${getServiceTitle(type)} added successfully.`,
                        type: 'success',
                      });
                      setTimeout(() => setToast(null), 3000);
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                      isAlreadyAdded
                        ? 'opacity-50 grayscale cursor-not-allowed border-border/50 bg-black/5 dark:bg-white/5'
                        : 'hover:border-[#FF5722] border-border/50 bg-card hover:shadow-md group',
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#FF5722]/10 group-hover:text-[#FF5722] transition-colors">
                      {getServiceIcon(type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-foreground">
                        {getServiceTitle(type)}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {isAlreadyAdded ? 'Already set up' : 'Click to set up this service'}
                      </div>
                    </div>
                    {!isAlreadyAdded && (
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-[#FF5722]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-lg text-[13px] font-medium shadow-xl animate-in slide-in-from-top-4 fade-in">
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeSlots.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-muted-foreground">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-[16px] font-bold text-foreground mb-1">No agents found</h3>
            <p className="text-[13px] text-muted-foreground mb-6">
              You haven't set up any agents yet.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-[13px] font-bold transition-colors"
            >
              Add your first agent
            </button>
          </div>
        ) : (
          activeSlots.map((slot) => {
            const isAnchor = anchorId === slot.id;
            const isCompatible = anchorId && isCompatibleWithAnchor(slot.id);
            const isDimmed = anchorId && !isAnchor && !isCompatible;
            const isConnectedToAnchor = anchorId && slot.connectedTo?.includes(anchorId);

            return (
              <div
                key={slot.id}
                onClick={() => handleCardClick(slot)}
                className={cn(
                  'group flex flex-col bg-card border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer relative',
                  isAnchor
                    ? 'border-[#FF5722] shadow-[0_0_0_1px_rgba(255,87,34,0.2)] shadow-md'
                    : 'border-border/50',
                  isCompatible
                    ? 'border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] shadow-md animate-pulse'
                    : '',
                  isDimmed
                    ? 'opacity-50 grayscale pointer-events-none'
                    : 'hover:border-border hover:shadow-md',
                )}
              >
                {/* Card Header (Active) */}
                <div className="p-5 pb-4 relative z-0">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                        isAnchor ? 'bg-[#FF5722] text-white' : 'bg-black/5 dark:bg-white/5',
                        slot.id === 'voice' && !isAnchor && 'text-amber-500',
                        slot.id === 'web' && !isAnchor && 'text-blue-500',
                        slot.id === 'integration' && !isAnchor && 'text-purple-500',
                      )}
                    >
                      {getServiceIcon(slot.type)}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                      {isConnectedToAnchor && (
                        <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded">
                          <LinkIcon className="w-3 h-3" /> Connected
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {slot.status.replace('_', ' ')}
                      </span>
                      <span className="relative flex h-2.5 w-2.5">
                        {slot.status === 'active' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span
                          className={cn(
                            'relative inline-flex rounded-full h-2.5 w-2.5',
                            getStatusColor(slot.status),
                          )}
                        ></span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3
                      className="text-[16px] font-bold text-foreground mb-1 group-hover:text-[#FF5722] transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/agents/${slot.id}`);
                      }}
                    >
                      {slot.name}
                    </h3>
                    <div className="text-[12px] font-medium text-muted-foreground">
                      {getServiceTitle(slot.type)}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-auto border-t border-border/50 bg-black/[0.02] dark:bg-white/[0.02] p-5 py-3 flex items-center justify-between relative z-0">
                  <div className="flex flex-col gap-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Activity
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-foreground">
                        {slot.lastActivity || '--'}
                      </span>
                      {slot.sparklineData && (
                        <Sparkline
                          data={slot.sparklineData}
                          colorClass={
                            slot.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Connections
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchorId(slot.id);
                        }}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors',
                          isAnchor
                            ? 'bg-[#FF5722] text-white'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground',
                        )}
                      >
                        <LinkIcon className="w-3 h-3" />
                        {isAnchor ? 'Cancel' : 'Connect'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agents/${slot.id}`);
                        }}
                        className="px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground rounded text-[11px] font-bold transition-colors"
                      >
                        Config
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connect Instruction Overlay (shows on compatible targets when hovering) */}
                {isCompatible && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/60 backdrop-blur-[1px]">
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 shadow-lg">
                      {isConnectedToAnchor ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      {isConnectedToAnchor ? 'Disconnect' : 'Connect'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
