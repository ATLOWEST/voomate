'use client';

import {
  Mic,
  Globe2,
  BrainCircuit,
  Search,
  ShoppingCart,
  MessageSquareText,
  Volume2,
} from 'lucide-react';
import RadialOrbitalTimeline from '@/components/ui/radial-orbital-timeline';

const WORKFLOW_DATA = [
  {
    id: 1,
    title: 'Customer Intent',
    date: '0ms',
    content:
      'Customer speaks or types a query. WebSocket immediately streams audio/text to the pipeline.',
    category: 'Input',
    icon: Mic,
    relatedIds: [2, 3],
    status: 'completed' as const,
    energy: 100,
  },
  {
    id: 2,
    title: 'Language Detect',
    date: '+150ms',
    content:
      'Identifies the language and dialect (e.g., Hinglish, Spanish, Arabic) from the first audio chunks.',
    category: 'Processing',
    icon: Globe2,
    relatedIds: [3],
    status: 'completed' as const,
    energy: 95,
  },
  {
    id: 3,
    title: 'Intent Engine',
    date: '+300ms',
    content:
      'Classifies whether the user wants to buy a product, track an order, or ask a general question.',
    category: 'Processing',
    icon: BrainCircuit,
    relatedIds: [4, 5],
    status: 'in-progress' as const,
    energy: 90,
  },
  {
    id: 4,
    title: 'Knowledge RAG',
    date: '+450ms',
    content:
      'Searches the isolated vector database for product details, store policies, or FAQs to ground the response.',
    category: 'Data',
    icon: Search,
    relatedIds: [6],
    status: 'in-progress' as const,
    energy: 85,
  },
  {
    id: 5,
    title: 'Action System',
    date: '+500ms',
    content:
      'Interacts with Shopify or WooCommerce APIs to fetch real-time order status or stock availability.',
    category: 'Integration',
    icon: ShoppingCart,
    relatedIds: [6],
    status: 'in-progress' as const,
    energy: 80,
  },
  {
    id: 6,
    title: 'Response Gen',
    date: '+800ms',
    content:
      "LLM crafts a concise, human-like response in the customer's exact language and dialect.",
    category: 'Output',
    icon: MessageSquareText,
    relatedIds: [7],
    status: 'pending' as const,
    energy: 70,
  },
  {
    id: 7,
    title: 'Audio Synthesis',
    date: '+1.3s',
    content:
      'Streams the response back via low-latency TTS, playing audio to the customer while generation completes.',
    category: 'Output',
    icon: Volume2,
    relatedIds: [1],
    status: 'pending' as const,
    energy: 60,
  },
];

export function WorkflowSection() {
  return (
    <section className="py-24 bg-white border-y border-[#EDE0CE] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-12 text-center">
        <p className="section-label mb-3">Under the hood</p>
        <h2 className="section-title max-w-2xl mx-auto">1.3 seconds to a perfect response.</h2>
        <p className="section-subtitle mt-4 max-w-xl mx-auto">
          The Voomate cognitive engine orchestrates speech recognition, translation, RAG, and
          action-taking in real-time.
        </p>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        <RadialOrbitalTimeline timelineData={WORKFLOW_DATA} />
      </div>
    </section>
  );
}
