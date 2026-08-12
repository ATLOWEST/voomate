'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

const NAV = [
  { href: '/product', label: 'Product' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="site-header">
      <nav
        className={cn('site-nav', scrolled && 'site-nav--scrolled')}
        aria-label="Primary navigation"
      >
        <Link href="/" className="brand-lockup" aria-label="Voomate home">
          <span className="brand-mark">V</span>
          <span>Voomate</span>
        </Link>

        <ul className="site-nav__links">
          {NAV.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="nav-link"
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="site-nav__actions">
          <a href={`${DASHBOARD_URL}/sign-in`} className="site-nav__sign-in">
            Sign in
          </a>
          <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ink btn-nav">
            Start building <ArrowUpRight size={15} />
          </a>
        </div>

        <button
          type="button"
          className="site-nav__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="site-nav__mobile">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-nav__mobile-link"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={`${DASHBOARD_URL}/sign-in`}
            className="btn-ink justify-center"
            onClick={() => setOpen(false)}
          >
            Start building <ArrowUpRight size={15} />
          </a>
        </div>
      )}
    </header>
  );
}
