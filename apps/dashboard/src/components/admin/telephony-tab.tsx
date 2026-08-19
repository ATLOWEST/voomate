'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Headphones,
  PhoneCall,
  Radio,
  Server,
  ShieldCheck,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LiveRoomSession {
  roomId: string;
  merchantName: string;
  agentName: string;
  transport: 'WebRTC / RTVI' | 'SIP Inbound' | 'WebSocket';
  duration: string;
  bitrate: string;
  packetLoss: string;
  status: 'active' | 'connecting' | 'idle';
}

const MOCK_ROOMS: LiveRoomSession[] = [
  {
    roomId: 'room_webrtc_829471',
    merchantName: 'Voomate Dogfood Demo Store',
    agentName: 'Voomate Dogfood Assistant',
    transport: 'WebRTC / RTVI',
    duration: '02:45',
    bitrate: '48.2 kbps',
    packetLoss: '0.00%',
    status: 'active',
  },
  {
    roomId: 'room_webrtc_910482',
    merchantName: 'Lumina Luxury Apparel',
    agentName: 'Lumina VIP Personal Stylist',
    transport: 'WebRTC / RTVI',
    duration: '04:12',
    bitrate: '50.1 kbps',
    packetLoss: '0.04%',
    status: 'active',
  },
  {
    roomId: 'room_sip_391048',
    merchantName: 'Apex Outdoor & Athletic',
    agentName: 'Apex Gear Support Bot',
    transport: 'SIP Inbound',
    duration: '01:18',
    bitrate: '64.0 kbps',
    packetLoss: '0.00%',
    status: 'active',
  },
];

export function TelephonyTab() {
  return (
    <div className="space-y-6">
      {/* Telephony Cluster Telemetry */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Active WebRTC Sessions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">3</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Concurrent live speech streams</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">STUN / TURN Relays</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">Global Cluster</span>
            <Badge tone="positive">
              100% SLA
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Zero-packet-loss audio routing</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Audio Codec</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">Opus Fullband</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">48 kHz · 20ms Frame Time</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">SIP Trunks Connected</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">4 Trunks</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Twilio & LiveKit Inbound SIP</p>
        </div>
      </div>

      {/* Provider Matrix */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Speech-to-Text & Synthesizer Provider Matrix</h3>
        <p className="mt-1 text-xs text-muted-foreground">Real-time status of underlying speech, transcription, and telephony providers.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-accent-100 dark:bg-accent-950 text-accent-600">
                <Radio className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Pipecat Voice Edge</div>
                <div className="text-[10.5px] text-muted-foreground">Port 7860 · RTVI 1.7</div>
              </div>
            </div>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600">
                <Zap className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">AWS Bedrock Nova</div>
                <div className="text-[10.5px] text-muted-foreground">us-east-1 Converse API</div>
              </div>
            </div>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                <Volume2 className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Amazon Polly Neural</div>
                <div className="text-[10.5px] text-muted-foreground">Low latency TTS Stream</div>
              </div>
            </div>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600">
                <PhoneCall className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">SIP Inbound Gateway</div>
                <div className="text-[10.5px] text-muted-foreground">Twilio Live Relay</div>
              </div>
            </div>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Active Live Rooms */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/80 bg-[var(--surface-sunken)]/60 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">Active Concurrent Voice Rooms</h3>
          <p className="text-xs text-muted-foreground">Live WebRTC audio channels streaming right now across customer storefronts.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-[var(--surface-sunken)]/40 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Room Session ID</th>
                <th className="px-4 py-3">Customer & Agent</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Audio Bitrate</th>
                <th className="px-4 py-3">Packet Loss</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {MOCK_ROOMS.map((room) => (
                <tr key={room.roomId} className="transition-colors hover:bg-accent-50/30 dark:hover:bg-accent-950/15">
                  <td className="px-5 py-3.5 font-mono text-xs font-medium text-foreground">
                    {room.roomId}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-xs text-foreground">{room.merchantName}</div>
                    <div className="text-[11px] text-muted-foreground">{room.agentName}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone="neutral">
                      {room.transport}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                    {room.duration}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {room.bitrate}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {room.packetLoss}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Streaming
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
