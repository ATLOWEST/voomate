import Link from 'next/link';

export const metadata = {
  title: 'Voomate dashboard',
  robots: { index: false, follow: false },
};

/** The public site must never send visitors to localhost while the AWS dashboard is deployed. */
export default function SignInPage() {
  return (
    <main className="marketing-main">
      <section className="home-hero" aria-labelledby="dashboard-title">
        <div className="hero-copy">
          <h1 id="dashboard-title">
            <span>The Voomate dashboard</span>
            <span>is being prepared.</span>
          </h1>
          <p className="section-subtext">
            The public Voomate website is live. Secure dashboard access will open after the AWS
            application deployment is complete.
          </p>
          <div className="hero-actions">
            <Link href="/" className="hero-action-primary">
              Return to Voomate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
