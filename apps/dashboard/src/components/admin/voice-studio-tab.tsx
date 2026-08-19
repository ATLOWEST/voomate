'use client';

import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

interface VoiceStudioTabProps {
  voiceEdgeUrl?: string;
}

export function VoiceStudioTab({ voiceEdgeUrl = 'http://127.0.0.1:7860/client/' }: VoiceStudioTabProps) {
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Pipecat Voice Studio"
          description="Real-time WebRTC audio tester and speech agent console running on port 7860."
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleRefresh}>
                <RefreshCw className="size-3.5 mr-1.5" />
                Reload
              </Button>
              <a
                href={voiceEdgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-[var(--surface-hover)]"
              >
                <ExternalLink className="size-3.5" />
                Open standalone
              </a>
            </div>
          }
        />
        <PanelBody className="p-0">
          <div className="relative w-full min-h-[660px] bg-background">
            <iframe
              key={iframeKey}
              src={voiceEdgeUrl}
              title="Pipecat Voice Edge Playground"
              allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
              className="w-full min-h-[660px] border-0"
            />
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
