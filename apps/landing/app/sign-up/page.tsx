import Link from 'next/link';

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://app.atlowest.in');

export default function SignUpPage() {
  const targetUrl = `${DASHBOARD_URL}/sign-up`;

  return (
    <main className="marketing-main">
      <head>
        <title>Redirecting to Voomate Dashboard...</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="refresh" content={`0;url=${targetUrl}`} />
      </head>
      <section className="home-hero" aria-labelledby="dashboard-title">
        <div className="hero-copy">
          <h1 id="dashboard-title">
            <span>Opening Voomate</span>
            <span>Dashboard...</span>
          </h1>
          <p className="section-subtext">Taking you to workspace creation.</p>
          <div className="hero-actions">
            <a href={targetUrl} className="hero-action-primary">
              Click here if not redirected &rarr;
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
