'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

type Stage = 'details' | 'verify' | 'creating' | 'complete';

const countryOptions = [
  ['IN', 'India'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['AE', 'United Arab Emirates'],
  ['AU', 'Australia'],
  ['CA', 'Canada'],
  ['SG', 'Singapore'],
  ['Other', 'Other'],
] as const;

const flagFor = (country: string) =>
  country.length === 2
    ? String.fromCodePoint(...[...country].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))
    : '🌐';

const detectedCountry = () => {
  try {
    const region = new Intl.Locale(navigator.language).region;
    if (region && countryOptions.some(([code]) => code === region)) return region;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Kolkata') return 'IN';
    if (zone.startsWith('America/')) return 'US';
    if (zone === 'Europe/London') return 'GB';
  } catch {
    // Country is optional context. The user can always choose it themselves.
  }
  return 'IN';
};

const passwordFeedback = (value: string) => {
  const checks = [value.length >= 12, /[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value)];
  return {
    strong: checks.every(Boolean),
    label: checks.every(Boolean)
      ? 'Strong password'
      : 'Use 12+ characters with upper, lower, and a number',
  };
};

export function SignUpForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('details');
  const [workspaceName, setWorkspaceName] = useState('');
  const [country, setCountry] = useState('IN');
  const [businessAreas, setBusinessAreas] = useState<string[]>([]);
  const [areaDraft, setAreaDraft] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const passwordState = useMemo(() => passwordFeedback(password), [password]);

  useEffect(() => {
    setCountry(detectedCountry());
    try {
      const remembered = localStorage.getItem('voomate_last_email');
      if (remembered) setEmail(remembered);
    } catch {
      // Browser storage is a convenience only, never an authentication dependency.
    }
  }, []);

  const addArea = () => {
    const value = areaDraft.trim();
    if (!value || businessAreas.includes(value) || businessAreas.length === 5) return;
    setBusinessAreas((current) => [...current, value]);
    setAreaDraft('');
  };

  const beginSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordState.strong) {
      setError('Choose a stronger password before continuing.');
      return;
    }
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      localStorage.setItem('voomate_last_email', email.trim());
    } catch {
      // The Supabase session is the real remembered sign-in. This is only an email hint.
    }
    try {
      const supabase = createClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            workspace_name: workspaceName.trim(),
            country,
            business_areas: businessAreas,
            business_email: businessEmail.trim() || undefined,
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message || 'We could not create your account. Please try again.');
        return;
      }
      // With email confirmation enabled, Supabase returns an obfuscated user for an email
      // that already belongs to a confirmed account. Do not claim a code was sent when no
      // message will be delivered; route the person to the one valid path instead.
      if (signUpData.user?.identities?.length === 0) {
        setError('An account already exists for this email. Sign in with your password instead.');
        return;
      }
      setStage('verify');
      setNotice(`We sent a six-digit code to ${email.trim()}. It expires in 10 minutes.`);
    } catch {
      setError('Account setup is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  const resendSignupCode = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) {
        setError(resendError.message || 'We could not resend the code. Please try again.');
        return;
      }
      setNotice(`We sent a fresh six-digit code to ${email.trim()}. It expires in 10 minutes.`);
    } catch {
      setError('We could not resend the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyAndCreateWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'signup',
      });
      if (verifyError || !data.session?.access_token) {
        setError('That code is invalid or expired. Request a new code and try again.');
        return;
      }
      setStage('creating');
      await api.post(
        '/v1/organizations',
        { name: workspaceName.trim() },
        { accessToken: data.session.access_token },
      );
      await supabase.auth.signOut();
      setStage('complete');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        await createClient().auth.signOut();
        setStage('complete');
        return;
      }
      setStage('verify');
      setError(
        'Your account is verified, but we could not create the workspace. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'creating')
    return (
      <div className="auth-form mt-7" aria-live="polite">
        <div className="auth-notice">
          <strong className="block text-sm text-foreground">Creating your workspace</strong>
          <span>Setting up your private merchant workspace now. This usually takes a moment.</span>
        </div>
      </div>
    );

  if (stage === 'complete')
    return (
      <div className="auth-form mt-7" aria-live="polite">
        <div className="rounded-2xl border border-positive/25 bg-positive-soft p-5 text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-positive text-xl font-bold text-white">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-foreground">Workspace created</h2>
          <p className="mt-1 text-sm text-secondary">
            Your account is ready. Sign in with your email and password to enter your merchant
            dashboard.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.replace('/sign-in?created=1')}
        >
          Continue to sign in
        </Button>
      </div>
    );

  if (stage === 'verify')
    return (
      <form onSubmit={verifyAndCreateWorkspace} className="auth-form mt-7" noValidate>
        <Field
          label="Verification code"
          htmlFor="otp"
          hint="Enter the six-digit code from the secure email we sent."
          error={error}
        >
          <TextInput
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            minLength={6}
            maxLength={6}
            required
            autoFocus
            className="text-center font-mono text-xl tracking-[0.45em]"
            placeholder="000000"
          />
        </Field>
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Verify and create workspace
        </Button>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">
          <button
            type="button"
            className="auth-text-button"
            disabled={busy}
            onClick={() => void resendSignupCode()}
          >
            Resend code
          </button>
          <button
            type="button"
            className="auth-text-button"
            disabled={busy}
            onClick={() => {
              setStage('details');
              setOtp('');
              setError(undefined);
            }}
          >
            Edit account details
          </button>
        </div>
      </form>
    );

  return (
    <form onSubmit={beginSignup} className="auth-form mt-7" noValidate>
      <Field
        label="Workspace name"
        htmlFor="workspace-name"
        hint="This is the private workspace for your business."
      >
        <TextInput
          id="workspace-name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          minLength={2}
          maxLength={80}
          autoComplete="organization"
          required
          placeholder="Your business"
        />
      </Field>
      <Field
        label="Country"
        htmlFor="country"
        hint="Preselected from your browser settings. You can change it."
      >
        <select
          id="country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="h-14 rounded-2xl border border-border bg-card px-4 text-sm text-foreground"
          required
        >
          {countryOptions.map(([code, label]) => (
            <option key={code} value={code}>
              {flagFor(code)} {label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Business areas"
        htmlFor="business-area"
        hint="Add up to five areas in your own words. This does not change your agent setup."
      >
        <div className="flex gap-2">
          <TextInput
            id="business-area"
            value={areaDraft}
            onChange={(event) => setAreaDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addArea();
              }
            }}
            maxLength={40}
            placeholder="e.g. Online retail"
          />
          <button
            type="button"
            className="rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
            onClick={addArea}
          >
            Add
          </button>
        </div>
        {businessAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {businessAreas.map((area) => (
              <button
                type="button"
                key={area}
                className="rounded-full bg-muted px-3 py-1 text-xs text-secondary"
                onClick={() =>
                  setBusinessAreas((current) => current.filter((item) => item !== area))
                }
              >
                {area} ×
              </button>
            ))}
          </div>
        )}
      </Field>
      <Field
        label="Business email (optional)"
        htmlFor="business-email"
        hint="Leave empty if it is the same as your sign-in email."
      >
        <TextInput
          id="business-email"
          type="email"
          value={businessEmail}
          onChange={(event) => setBusinessEmail(event.target.value)}
          autoComplete="email"
          placeholder="hello@yourbusiness.com"
        />
      </Field>
      <Field label="Sign-in email" htmlFor="email" error={error}>
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Password" htmlFor="password" hint={passwordState.label}>
        <TextInput
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={12}
          required
          placeholder="Create a strong password"
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Send secure code
      </Button>
    </form>
  );
}
