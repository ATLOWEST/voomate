'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          'w-full max-w-5xl flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-400',
          scrolled
            ? 'bg-white/92 backdrop-blur-lg border border-[#EAD9C4] shadow-[0_2px_24px_rgba(28,20,16,0.08)]'
            : 'bg-[#FFFDF9]/60 border border-transparent',
        )}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2.5 mr-2" aria-label="Voomate">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E8590C, #A33A07)' }}
          >
            <span className="text-white text-[12px] font-black tracking-tight">V</span>
          </div>
          <span
            className="text-[15px] font-bold tracking-[-0.04em] text-[#1C1410]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Voomate
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-0.5 ml-auto">
          {NAV.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="nav-link">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2 ml-4">
          <a
            href={`${DASHBOARD_URL}/sign-in`}
            className="text-[13.5px] font-medium text-[#5C4A38] hover:text-[#1C1410] transition-colors px-3 py-1.5"
          >
            Sign in
          </a>
          <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ember text-[13.5px] px-5 py-2.5">
            Start building →
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden ml-auto text-[#5C4A38] hover:text-[#1C1410] transition-colors p-1.5 rounded-lg"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-[#EAD9C4] rounded-2xl shadow-[0_8px_32px_rgba(28,20,16,0.12)] p-3 space-y-0.5 md:hidden">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-4 py-2.5 text-[15px] font-medium text-[#5C4A38] hover:text-[#1C1410] hover:bg-[#F7EFE3] rounded-xl transition-all"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 mt-1 border-t border-[#F2E5D0] flex flex-col gap-2">
            <a
              href={`${DASHBOARD_URL}/sign-in`}
              className="py-2 text-center text-[14px] font-medium text-[#5C4A38]"
            >
              Sign in
            </a>
            <a
              href={`${DASHBOARD_URL}/sign-in`}
              className="btn-ember w-full justify-center text-sm"
            >
              Start building →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
