import type { Metadata } from 'next';
import { InstallPanels } from './install';

export const metadata: Metadata = { title: 'Install' };

export default function InstallPage() {
  return <InstallPanels />;
}
