'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  ExternalLink,
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
  { label: 'Check Order', prompt: 'Where is my order DEMO-1001?' },
  { label: 'Return Policy', prompt: 'What is your 30-day return policy?' },
  { label: 'Product Recommendation', prompt: 'Can you recommend lightweight wireless headphones under $100?' },
  { label: 'Cancel Item', prompt: 'I want to cancel the jacket in my recent order.' },
  { label: 'Store Hours', prompt: 'What are your customer support working hours?' },
];

export function VoiceStudioTab({ voiceEdgeUrl = 'http://127.0.0.1:7860/client/' }: VoiceStudioTabProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [latency, setLatency] = useState(240);
  const [isOnline, setIsOnline] = useState(true);
  const [activeEngine, setActiveEngine] = useState('AWS Bedrock Nova 2 (Sonic)');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Dynamic simulated latency variance (P50 around 220-260ms)
    const interval = setInterval(() => {
      setLatency(Math.floor(215 + Math.random() * 45));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleCopyPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    navigator.clipboard?.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wider">WebRTC Transport</span>
            <Wifi className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">Connected</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">RTVI 1.7.0 Client · Opus 48kHz</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wider">Turnaround Latency</span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">{latency} ms</span>
            <Badge tone="positive">
              Optimal
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">STT + Bedrock LLM + TTS Pipeline</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wider">Active Voice Engine</span>
            <Radio className="size-4 text-accent-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 truncate">
            <span className="text-base font-bold text-foreground truncate">{activeEngine}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Streaming Multimodal Speech</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wider">Voice Edge Endpoint</span>
            <Activity className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 truncate">
            <span className="text-base font-mono font-semibold text-foreground truncate">127.0.0.1:7860</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Pipecat Local Python Worker</p>
        </div>
      </div>

      {/* Main Studio Frame Area */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-[var(--surface-sunken)]/60 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300">
              <Mic className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pipecat Voice Edge Studio</h3>
              <p className="text-[11.5px] text-muted-foreground">Real-time WebRTC audio tester & conversation playground</p>
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
        <div className="relative aspect-[16/10] w-full min-h-[640px] bg-background">
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
      <div className="rounded-xl border border-border/80 bg-card/75 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-600" />
            <h4 className="text-[13px] font-semibold text-foreground">Quick Diagnostic Speech Prompts</h4>
          </div>
          {copied && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Prompt copied to clipboard!
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Click any prompt below to copy and speak or send it into the live voice studio to test tool routing & RAG retrieval.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_VOICE_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleCopyPrompt(item.prompt)}
              className="group flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-xs transition-all hover:border-accent-500/40 hover:bg-accent-50/50 dark:hover:bg-accent-950/20"
            >
              <span className="font-semibold text-foreground group-hover:text-accent-600">{item.label}:</span>
              <span className="text-muted-foreground truncate max-w-[280px]">"{item.prompt}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
