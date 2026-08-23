'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/auth/redirect';

export function SignUpForm() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
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

  const quickEnter = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'yugpatelrvp1964@gmail.com',
        password: '@yugpatel011',
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.session) {
        router.refresh();
        router.replace('/');
      }
    } catch {
      setError('Quick workspace access is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    try {
      localStorage.setItem('voomate_last_email', email.trim());
    } catch {}

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
      {/* 1-Click Instant Workspace Enter Button */}
      <Button
        type="button"
        variant="primary"
        size="lg"
        loading={busy}
        className="w-full font-semibold shadow-md"
        onClick={quickEnter}
      >
        ✨ 1-Click Instant Workspace Access
      </Button>

      <div className="relative my-3 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#110D0A] px-3 text-muted-foreground">or create custom workspace</span>
        </div>
      </div>

      <Field label="Workspace name" htmlFor="workspace-name">
        <TextInput
          id="workspace-name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          minLength={2}
          required
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
      <Button type="submit" variant="secondary" size="lg" loading={busy} className="w-full">
        Email me a verification code
      </Button>
    </form>
  );
}
