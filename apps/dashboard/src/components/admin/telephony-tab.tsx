'use client';

import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';

interface LiveRoomSession {
  roomId: string;
  merchantName: string;
  agentName: string;
  transport: string;
  duration: string;
  bitrate: string;
  packetLoss: string;
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
  },
  {
    roomId: 'room_webrtc_910482',
    merchantName: 'Lumina Luxury Apparel',
    agentName: 'Lumina VIP Personal Stylist',
    transport: 'WebRTC / RTVI',
    duration: '04:12',
    bitrate: '50.1 kbps',
    packetLoss: '0.04%',
  },
  {
    roomId: 'room_sip_391048',
    merchantName: 'Apex Outdoor & Athletic',
    agentName: 'Apex Gear Support Bot',
    transport: 'SIP Inbound',
    duration: '01:18',
    bitrate: '64.0 kbps',
    packetLoss: '0.00%',
  },
];

export function TelephonyTab() {
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Active WebRTC Audio Rooms"
          description="Concurrent live voice streams currently connected to the Pipecat voice cluster."
        />
        <PanelBody className="p-0">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Room ID</th>
                <th className="px-4 py-3">Merchant & Agent</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Bitrate</th>
                <th className="px-4 py-3 text-right">Packet Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {MOCK_ROOMS.map((room) => (
                <tr key={room.roomId} className="hover:bg-[var(--surface-sunken)]/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                    {room.roomId}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-foreground">{room.merchantName}</div>
                    <div className="text-[11.5px] text-muted-foreground">{room.agentName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-foreground">
                    {room.transport}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                    {room.duration}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {room.bitrate}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-foreground">
                    {room.packetLoss}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelBody>
      </Panel>
    </div>
  );
}
