import type { Metadata } from 'next';
import { BehaviourForm } from './behaviour';

export const metadata: Metadata = { title: 'Behaviour' };

export default function BehaviourPage() {
  return <BehaviourForm />;
}
