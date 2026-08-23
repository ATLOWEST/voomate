'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeSent, setChallengeSent] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

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
        // Keep the response generic so this form does not reveal whether an email is registered.
        setError('We could not send a sign-in code. Check the email address and try again shortly.');
        return;
      }

      setChallengeSent(true);
      setNotice('If this email can sign in, a code is on its way. It expires shortly.');
    } catch {
      setError('Secure sign-in is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
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

  if (challengeSent) {
    return (
      <form onSubmit={verifyCode} className="auth-form">
        <Field
          label="One-time code"
          htmlFor="otp"
          hint="Enter the six-digit code from your email."
          error={error}
        >
          <TextInput
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
            minLength={6}
            maxLength={8}
            required
            autoFocus
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
          className="auth-text-button"
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

  return (
    <form onSubmit={sendCode} className="auth-form">
      <Field label="Email" htmlFor="email">
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          autoFocus
        />
      </Field>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={busy} className="auth-submit">
        Email me a sign-in code
      </Button>
    </form>
  );
}
