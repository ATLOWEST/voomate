'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';

export function SignUpForm() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: { workspace_name: workspaceName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (otpError) {
        setError(
          otpError.message ||
            'We could not send a verification code. Please check your email and try again.',
        );
        return;
      }

      setChallengeSent(true);
      setNotice(`A 6-digit verification code was sent to ${email.trim()}.`);
    } catch {
      setError('Verification is temporarily unavailable. Please reload and try again.');
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
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });

      if (verifyError) {
        setError('That code is invalid or expired. Request a new code and try again.');
        return;
      }

      const accessToken = data.session?.access_token;
      if (accessToken && workspaceName.trim()) {
        try {
          await api.post(
            '/v1/organizations',
            { name: workspaceName.trim() },
            { accessToken },
          );
        } catch {
          // If creation fails or already exists, onboarding fallback handles it safely
        }
      }

      router.refresh();
      router.replace(
        workspaceName.trim()
          ? `/onboarding?workspace=${encodeURIComponent(workspaceName.trim())}`
          : '/',
      );
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (challengeSent) {
    return (
      <form onSubmit={verifyCode} className="auth-form mt-6 space-y-4">
        <Field
          label="6-digit verification code"
          htmlFor="otp"
          hint="Enter the 6-digit code sent to your email."
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
          Verify and enter workspace
        </Button>
        <button
          type="button"
          className="w-full text-sm font-medium text-secondary underline underline-offset-4"
          onClick={() => {
            setChallengeSent(false);
            setOtp('');
            setError(undefined);
            setNotice(undefined);
          }}
        >
          Use a different email or workspace
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="auth-form mt-6 space-y-4">
      <Field label="Workspace name" htmlFor="workspace-name">
        <TextInput
          id="workspace-name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          minLength={2}
          required
          autoFocus
          autoComplete="organization"
          placeholder="e.g. Acme Store"
        />
      </Field>
      <Field label="Email" htmlFor="email" error={error}>
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
      {notice && (
        <p role="status" className="text-sm text-secondary">
          {notice}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Email me a verification code
      </Button>
    </form>
  );
}
