import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const FOOTER_LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Industries', href: '/industries' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__lead">
          <Link href="/" className="brand-lockup" aria-label="Voomate home">
            <span className="brand-mark">V</span>
            <span>Voomate</span>
          </Link>
          <p>One connected AI team for customer conversations and the work that follows.</p>
        </div>

        <nav aria-label="Footer navigation" className="site-footer__nav">
          {FOOTER_LINKS.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <a className="footer-contact" href="mailto:hello@voomate.com">
          hello@voomate.com <ArrowUpRight size={16} />
        </a>
      </div>

      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} Voomate, Inc.</p>
        <p className="site-footer__status">
          <span /> Systems monitored
        </p>
      </div>
    </footer>
  );
}
