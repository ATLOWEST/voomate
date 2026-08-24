import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthMode = 'sign-in' | 'sign-up' | 'workspace';

interface AuthShellProps {
  mode: AuthMode;
  children: ReactNode;
}

const copy: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  'sign-in': {
    eyebrow: 'Merchant workspace',
    title: 'Welcome back.',
    description: 'Sign in with your business email to continue to your operating panel.',
  },
  'sign-up': {
    eyebrow: 'Start with Voomate',
    title: 'Build a calmer way to operate.',
    description: 'Create your workspace, verify your email, and put your agents to work.',
  },
  workspace: {
    eyebrow: 'Workspace setup',
    title: 'Give your work a home.',
    description: 'Create one private workspace to continue to your operating panel.',
  },
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const content = copy[mode];

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-form" aria-label="Voomate authentication">
        <div className="auth-form-wrap">
          <header className="auth-brand-row">
            <Link href="/" className="auth-brand" aria-label="Voomate home">
              <span className="auth-brand-mark" aria-hidden="true">
                <img src="/voomate-logo-original.png" alt="" />
              </span>
              <span>Voomate</span>
            </Link>
            <span className="auth-secure-label">Secure access</span>
          </header>

          <div className="auth-heading">
            <p className="auth-eyebrow">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
          </div>

          {children}
        </div>

        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Voomate</span>
          <span className="auth-footer-rule" aria-hidden="true" />
          <span>Built for focused teams</span>
        </footer>
      </section>

      <aside className="auth-panel auth-panel-story" aria-label="About Voomate">
        <div className="auth-story-grid" aria-hidden="true" />
        <div className="auth-story-orbit auth-story-orbit-one" aria-hidden="true" />
        <div className="auth-story-orbit auth-story-orbit-two" aria-hidden="true" />
        <div className="auth-story-content">
          <div className="auth-story-mark">
            <img src="/voomate-logo-original.png" alt="" />
          </div>
          <p className="auth-story-kicker">The Voomate operating panel</p>
          <h2>Make every customer moment feel considered.</h2>
          <p>
            One clear workspace for the agents, conversations, and approved actions that move your
            business forward.
          </p>
        </div>
        <div className="auth-story-caption">
          <span className="auth-live-mark" aria-hidden="true" />
          <span>Secure by design. Multi-tenant by default.</span>
        </div>
      </aside>
    </main>
  );
}
