'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  Building2,
  ExternalLink,
  FlaskConical,
  Mic,
  PhoneCall,
  Radio,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { VoiceStudioTab } from '@/components/admin/voice-studio-tab';
import { MerchantsTab } from '@/components/admin/merchants-tab';
import { AgentFleetTab } from '@/components/admin/agent-fleet-tab';
import { TelephonyTab } from '@/components/admin/telephony-tab';
import { ClusterHealthTab } from '@/components/admin/cluster-health-tab';

type AdminTab = 'voice-studio' | 'merchants' | 'agents' | 'telephony' | 'health';

const ADMIN_TABS = [
  { id: 'voice-studio', name: 'Voice Studio', icon: Mic },
  { id: 'merchants', name: 'Merchants', icon: Building2 },
  { id: 'agents', name: 'Agents', icon: Bot },
  { id: 'telephony', name: 'Telephony', icon: PhoneCall },
  { id: 'health', name: 'Health & Logs', icon: Activity },
];

function SuperAdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as AdminTab) || 'voice-studio';
  const [currentTab, setCurrentTab] = useState<AdminTab>(initialTab);
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
    }, 600);
  };

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="Super Admin"
        description="Global platform governance, live voice edge studio, and customer fleet management."
        action={
          <Button size="sm" onClick={handleSync} loading={syncing}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Sync
          </Button>
        }
        below={
          <div className="mx-auto max-w-[1280px] px-5 pb-3 sm:px-8 lg:px-10">
            <nav
              className="agent-tab-rail flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-[var(--surface-soft)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Super Admin sections"
            >
              {ADMIN_TABS.map((tab) => {
                const active = currentTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id as AdminTab)}
                    aria-current={active ? 'page' : undefined}
                    data-active={active}
                    className={cn(
                      'agent-tab group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-[12.5px] font-medium transition-[background-color,color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px',
                      active
                        ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(20,20,18,0.05),0_5px_14px_rgba(20,20,18,0.05)] dark:bg-white/[0.08] dark:shadow-none'
                        : 'text-muted-foreground hover:-translate-y-0.5 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.045]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-6 place-items-center rounded-md transition-[background-color,color,transform] duration-500 group-hover:scale-105',
                        active
                          ? 'bg-accent-100 text-accent-700 dark:bg-accent-950/55 dark:text-accent-200'
                          : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={1.8} />
                    </span>
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        }
      />

      <PageBody>
        {currentTab === 'voice-studio' && <VoiceStudioTab />}
        {currentTab === 'merchants' && <MerchantsTab />}
        {currentTab === 'agents' && <AgentFleetTab />}
        {currentTab === 'telephony' && <TelephonyTab />}
        {currentTab === 'health' && <ClusterHealthTab />}
      </PageBody>
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
