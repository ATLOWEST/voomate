'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  ExternalLink,
  Headphones,
  Maximize2,
  Mic,
  Radio,
  RefreshCw,
  Sparkles,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VoiceStudioTabProps {
  voiceEdgeUrl?: string;
}

const SAMPLE_VOICE_PROMPTS = [
  { label: 'Check Order Status', prompt: 'Where is my order DEMO-1001?' },
  { label: 'Return Policy FAQ', prompt: 'What is your 30-day return policy?' },
  { label: 'Product Advisor', prompt: 'Can you recommend lightweight wireless headphones under $100?' },
  { label: 'Cancel Item Tool', prompt: 'I want to cancel the jacket in my recent order.' },
  { label: 'Support Working Hours', prompt: 'What are your customer support working hours?' },
];

export function VoiceStudioTab({ voiceEdgeUrl = 'http://127.0.0.1:7860/client/' }: VoiceStudioTabProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [latency, setLatency] = useState(240);
  const [activeEngine, setActiveEngine] = useState('AWS Bedrock Nova 2 (Sonic)');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0.42);

  useEffect(() => {
    // Dynamic simulated latency variance (P50 around 220-260ms)
    const interval = setInterval(() => {
      setLatency(Math.floor(215 + Math.random() * 40));
      setAudioLevel(0.2 + Math.random() * 0.6);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard?.writeText(prompt);
    setCopiedPrompt(prompt);
    setTimeout(() => setCopiedPrompt(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md transition-all hover:border-border hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider">WebRTC Transport</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wifi className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">Connected</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">RTVI 1.7.0 Client · Opus 48kHz Audio</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md transition-all hover:border-border hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider">Turnaround Latency</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono text-foreground">{latency} ms</span>
            <Badge tone="positive">
              Optimal SLA
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">STT + Bedrock Nova + Polly Stream</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md transition-all hover:border-border hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider">Active Voice Engine</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400">
              <Radio className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 truncate">
            <span className="text-base font-bold text-foreground truncate">{activeEngine}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Multimodal Bidirectional Voice</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md transition-all hover:border-border hover:shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider">Voice Edge Cluster</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Activity className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 truncate">
            <span className="text-base font-mono font-semibold text-foreground truncate">127.0.0.1:7860</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Pipecat WebRTC Python Worker</p>
        </div>
      </div>

      {/* Main Studio Frame Area */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-[var(--surface-sunken)]/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-950/70 text-accent-700 dark:text-accent-300 ring-1 ring-accent-500/20">
              <Mic className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pipecat Voice Edge Studio</h3>
              <p className="text-[11.5px] text-muted-foreground">Direct low-latency WebRTC speech synthesizer and audio stream tester</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3.5" />
              Reload Studio
            </Button>
            <a
              href={voiceEdgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <ExternalLink className="size-3.5" />
              Open Standalone
            </a>
          </div>
        </div>

        {/* Embedded Iframe */}
        <div className="relative aspect-[16/10] w-full min-h-[660px] bg-background">
          <iframe
            key={iframeKey}
            src={voiceEdgeUrl}
            title="Pipecat Voice Edge Playground"
            allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
            className="size-full border-0"
          />
        </div>
      </div>

      {/* Quick Test Voice Prompts */}
      <div className="rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent-50 dark:bg-accent-950 text-accent-600">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Diagnostic Speech Test Prompts</h4>
              <p className="text-xs text-muted-foreground">Click any prompt to copy it for immediate speech validation and tool invocation testing.</p>
            </div>
          </div>
          {copiedPrompt && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Copied to clipboard
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_VOICE_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleCopyPrompt(item.prompt)}
              className="group flex flex-col items-start gap-1 rounded-xl border border-border/70 bg-background/80 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent-500/40 hover:bg-accent-50/40 dark:hover:bg-accent-950/20 hover:shadow-sm"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-accent-600">{item.label}</span>
                <Copy className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <span className="text-xs text-muted-foreground line-clamp-1 italic">"{item.prompt}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
