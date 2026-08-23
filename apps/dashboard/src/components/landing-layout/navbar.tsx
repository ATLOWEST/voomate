'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Globe2,
  Menu,
  Mic2,
  PlugZap,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? '';

const PRODUCT_ITEMS = [
  {
    title: 'Web Agent',
    description: 'Embeddable website AI for product search, answers & instant customer actions.',
    href: '/product#web-agent',
    icon: Globe2,
    tag: 'Web',
  },
  {
    title: 'Voice Calling Agent',
    description: 'Sub-second real-time voice calling, natural interruptions & telephony.',
    href: '/product#calling-agent',
    icon: Mic2,
    tag: 'Voice OS',
  },
  {
    title: 'Integration Agent',
    description: 'Unified live context across Shopify, ERP, CRM, and internal databases.',
    href: '/integrations',
    icon: PlugZap,
    tag: 'Connected',
  },
];

const NAV_LINKS = [
  { href: '/#features', label: 'How it works' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProductOpen(false);
    setOpen(false);
  }, [pathname]);

  return (
    <header className={cn('site-header', scrolled && 'site-header--scrolled')}>
      <nav
        className={cn('site-nav', scrolled && 'site-nav--scrolled')}
        aria-label="Primary navigation"
      >
        {/* Brand Lockup (Always full logo mark + text) */}
        <Link href="/" className="brand-lockup" aria-label="Voomate home">
          <div className="brand-logo-container">
            <img src="/voomate-logo.png" alt="Voomate" className="brand-logo-mark" />
            <div className="brand-logo-letters brand-logo-letters--visible">
              {[...Array(7)].map((_, i) => (
                <img
                  key={i}
                  src={`/letters/letter-${i}.png`}
                  alt=""
                  className="brand-letter brand-letter--visible"
                />
              ))}
            </div>
          </div>
        </Link>

        {/* Navigation Links & Dropdown (Right-aligned) */}
        <ul className="site-nav__links">
          {/* Product Dropdown */}
          <li
            className="nav-dropdown"
            ref={dropdownRef}
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
            <button
              type="button"
              className={cn(
                'nav-link nav-dropdown__trigger',
                (productOpen || pathname.startsWith('/product')) && 'nav-link--active',
              )}
              onClick={() => setProductOpen((prev) => !prev)}
              aria-expanded={productOpen}
              aria-haspopup="true"
            >
              <span>Product</span>
              <ChevronDown
                size={13}
                className={cn(
                  'nav-dropdown__chevron transition-transform duration-200',
                  productOpen && 'rotate-180 text-[var(--marketing-ink)]',
                )}
              />
            </button>

            {/* Dropdown Card */}
            {productOpen && (
              <div className="nav-dropdown__menu animate-in fade-in zoom-in-95 duration-150">
                <div className="nav-dropdown__header">
                  <span className="nav-dropdown__category">The Voomate System</span>
                  <Link
                    href="/product"
                    className="nav-dropdown__all-link"
                    onClick={() => setProductOpen(false)}
                  >
                    Overview <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="nav-dropdown__items">
                  {PRODUCT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="nav-dropdown__item"
                        onClick={() => setProductOpen(false)}
                      >
                        <div className="nav-dropdown__icon-wrap">
                          <Icon size={16} />
                        </div>
                        <div className="nav-dropdown__text">
                          <div className="nav-dropdown__title-row">
                            <span className="nav-dropdown__title">{item.title}</span>
                            <span className="nav-dropdown__tag">{item.tag}</span>
                          </div>
                          <p className="nav-dropdown__desc">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </li>

          {/* Standard Navigation Links */}
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.label}>
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

        {/* Action Buttons */}
        <div className="site-nav__actions">
          <Link href="/overview" className="site-nav__sign-in">
            Sign in
          </Link>
          <Link href="/overview" className="site-nav__sign-up">
            Dashboard <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Mobile menu toggle */}
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

      {/* Mobile Menu Drawer */}
      {open && (
        <div className="site-nav__mobile">
          <div className="site-nav__mobile-section">
            <span className="site-nav__mobile-category">Products</span>
            {PRODUCT_ITEMS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="site-nav__mobile-link site-nav__mobile-link--sub"
                onClick={() => setOpen(false)}
              >
                <span>{item.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--marketing-line)] text-[var(--marketing-ink-soft)] font-bold">
                  {item.tag}
                </span>
              </Link>
            ))}
          </div>

          <div className="site-nav__mobile-section">
            <span className="site-nav__mobile-category">Menu</span>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-nav__mobile-link"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="site-nav__mobile-actions">
            <Link
              href="/overview"
              className="site-nav__mobile-sign-in"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/overview"
              className="site-nav__mobile-sign-up"
              onClick={() => setOpen(false)}
            >
              Dashboard <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
