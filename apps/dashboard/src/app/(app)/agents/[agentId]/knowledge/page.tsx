import type { Metadata } from 'next';
import { KnowledgePanels } from './knowledge';

export const metadata: Metadata = { title: 'Knowledge' };

export default function KnowledgePage() {
  return <KnowledgePanels />;
}
