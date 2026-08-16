'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Read from the DOM rather than localStorage: the bootstrap script in the root layout has
  // already resolved the OS preference, so the attribute is the source of truth by now.
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('voomate-theme', next ? 'dark' : 'light');
    } catch {
      // Private browsing with storage disabled. The theme still applies for this session.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Use light theme' : 'Use dark theme'}
      className="theme-toggle grid size-9 place-items-center rounded-lg text-[var(--text-secondary)] transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:translate-y-px"
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
