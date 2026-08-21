import Link from 'next/link';

export const metadata = {
  title: 'Voomate Dashboard Access',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : 'https://dashboard.atlowest.in');

  return (
    <main className="marketing-main">
      <section className="home-hero" aria-labelledby="dashboard-title">
        <div className="hero-copy">
          <h1 id="dashboard-title">
            <span>Voomate Dashboard</span>
            <span>& Agent Control Plane</span>
          </h1>
          <p className="section-subtext">
            Access your active agents, real-time voice sessions, knowledge base, and business
            approvals directly in the Voomate Dashboard.
          </p>
          <div className="hero-actions">
            <a href={`${dashboardUrl}/sign-in`} className="hero-action-primary">
              Open Dashboard Sign In &rarr;
            </a>
            <Link href="/" className="hero-action-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
