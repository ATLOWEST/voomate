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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const accountCreated = searchParams.get('created') === '1';

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('voomate_last_email');
      if (remembered) setEmail(remembered);
    } catch {
      // The session is managed by secure Supabase cookies. This only pre-fills an email hint.
    }
  }, []);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      localStorage.setItem('voomate_last_email', email.trim());
    } catch {
      // A browser that blocks storage can still sign in normally.
    }
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) {
        setError('We could not sign you in with those details. Check your email and password.');
        return;
      }
      router.refresh();
      router.replace(safeInternalPath(searchParams.get('next')));
    } catch {
      setError('Sign-in is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submitPassword} className="auth-form" noValidate>
      {accountCreated && (
        <p className="auth-notice" role="status">
          Your workspace is ready. Sign in with the password you just created.
        </p>
      )}
      <Field label="Email" htmlFor="email">
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
      <Field label="Password" htmlFor="password" error={error}>
        <div className="auth-input-with-action">
          <TextInput
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            placeholder="Your password"
          />
          <button
            type="button"
            className="auth-input-action"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </Field>
      <p className="text-xs leading-5 text-secondary">
        On a private device, your secure session is remembered so returning is quick.
      </p>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Sign in securely
      </Button>
    </form>
  );
}
