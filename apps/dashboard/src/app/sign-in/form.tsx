'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeSent, setChallengeSent] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('voomate_last_email');
      if (remembered) setEmail(remembered);
    } catch {}
  }, []);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    try {
      localStorage.setItem('voomate_last_email', email.trim());
    } catch {}

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password. Please try again.');
        return;
      }

      if (data.session) {
        router.refresh();
        router.replace(safeInternalPath(searchParams.get('next')));
      }
    } catch {
      setError('Sign-in is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendOtpCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    try {
      localStorage.setItem('voomate_last_email', email.trim());
    } catch {}

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError('We could not send a sign-in code. Check the email address and try again.');
        return;
      }

      setChallengeSent(true);
      setNotice(`A 6-digit code has been sent to ${email.trim()}.`);
    } catch {
      setError('Secure sign-in is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtpCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });

      if (verifyError) {
        setError('That code is invalid or expired. Request a new code and try again.');
        return;
      }

      router.refresh();
      router.replace(safeInternalPath(searchParams.get('next')));
    } catch {
      setError('Secure sign-in is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'otp' && challengeSent) {
    return (
      <form onSubmit={verifyOtpCode} className="auth-form space-y-4">
        <Field
          label="6-digit verification code"
          htmlFor="otp"
          hint="Enter the six-digit code from your email."
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
            className="tracking-widest text-center text-xl font-mono"
            placeholder="000000"
          />
        </Field>
        {notice && (
          <p role="status" className="text-sm text-secondary">
            {notice}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Verify and sign in
        </Button>
        <button
          type="button"
          className="w-full text-sm font-medium text-secondary underline underline-offset-4"
          onClick={() => {
            setChallengeSent(false);
            setOtp('');
            setError(undefined);
          }}
        >
          Use a different email
        </button>
      </form>
    );
  }

  if (mode === 'otp') {
    return (
      <form onSubmit={sendOtpCode} className="auth-form space-y-4">
        <Field label="Email" htmlFor="email" error={error}>
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
            placeholder="you@company.com"
          />
        </Field>
        {notice && (
          <p role="status" className="text-sm text-secondary">
            {notice}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Email me a 6-digit code
        </Button>
        <button
          type="button"
          className="w-full text-sm font-medium text-secondary underline underline-offset-4"
          onClick={() => {
            setMode('password');
            setError(undefined);
            setNotice(undefined);
          }}
        >
          Sign in with password instead
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="auth-form space-y-4">
      <Field label="Email" htmlFor="email">
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          autoFocus
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Password" htmlFor="password" error={error}>
        <div className="relative">
          <TextInput
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Sign in
      </Button>
      <button
        type="button"
        className="w-full text-sm font-medium text-secondary underline underline-offset-4 pt-1"
        onClick={() => {
          setMode('otp');
          setError(undefined);
          setNotice(undefined);
        }}
      >
        Sign in with 1-click email OTP code instead
      </button>
    </form>
  );
}
