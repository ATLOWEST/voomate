'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  Crown,
  Layers,
  Mic,
  PhoneCall,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoiceStudioTab } from '@/components/admin/voice-studio-tab';
import { MerchantsTab } from '@/components/admin/merchants-tab';
import { AgentFleetTab } from '@/components/admin/agent-fleet-tab';
import { TelephonyTab } from '@/components/admin/telephony-tab';
import { ClusterHealthTab } from '@/components/admin/cluster-health-tab';

type AdminTab = 'voice-studio' | 'merchants' | 'agents' | 'telephony' | 'health';

function SuperAdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as AdminTab) || 'voice-studio';
  const [currentTab, setCurrentTab] = useState<AdminTab>(initialTab);
  const [clusterUptime, setClusterUptime] = useState('99.98%');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as AdminTab;
    if (tabParam && tabParam !== currentTab) {
      setCurrentTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: AdminTab) => {
    setCurrentTab(tab);
    router.push(`/admin?tab=${tab}`);
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 800);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-6 py-6 md:px-10 md:py-10">
      {/* Super Admin Executive Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-[var(--surface-sunken)]/40 p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-80 rounded-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm ring-1 ring-amber-500/20">
                <Crown className="size-4" />
              </div>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Platform Console
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cluster Live
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-[2rem] leading-tight">
              Super Admin Command Center
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Global multi-tenant governance, live WebRTC voice edge diagnostics, customer fleet management, and multimodal LLM routing.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 text-right shadow-sm backdrop-blur-md">
              <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cluster SLA
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="text-base font-bold text-foreground font-mono">{clusterUptime}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={handleSync}
              className="h-11 px-4 gap-2 text-xs font-semibold shadow-sm hover:border-accent-500/30"
            >
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Cluster
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        {[
          { id: 'voice-studio', label: 'Voice Edge Studio', icon: Mic, badge: 'Pipecat Live' },
          { id: 'merchants', label: 'Merchants & Customers', icon: Building2, count: 6 },
          { id: 'agents', label: 'Agent Fleet & LLMs', icon: Bot, count: 4 },
          { id: 'telephony', label: 'Telephony & WebRTC', icon: PhoneCall, count: 3 },
          { id: 'health', label: 'Cluster Health & Logs', icon: Server, badge: '100% OK' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as AdminTab)}
              className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                isActive
                  ? 'bg-foreground text-background shadow-md shadow-foreground/5'
                  : 'bg-card/75 border border-border/80 text-muted-foreground hover:bg-accent-50/50 hover:text-foreground dark:hover:bg-accent-950/30'
              }`}
            >
              <Icon className={`size-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                    isActive
                      ? 'bg-background/20 text-background'
                      : 'bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 border border-accent-200/50 dark:border-accent-800/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-mono font-medium ${
                    isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Body */}
      <div className="pt-2 transition-opacity duration-300">
        {currentTab === 'voice-studio' && <VoiceStudioTab />}
        {currentTab === 'merchants' && <MerchantsTab />}
        {currentTab === 'agents' && <AgentFleetTab />}
        {currentTab === 'telephony' && <TelephonyTab />}
        {currentTab === 'health' && <ClusterHealthTab />}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
        </div>
      }
    >
      <SuperAdminContent />
    </Suspense>
  );
}
