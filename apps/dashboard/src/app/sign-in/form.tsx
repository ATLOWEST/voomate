'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Supabase already returns a deliberately vague "Invalid login credentials" for both a
      // wrong password and an unknown email, which is the right behaviour — distinguishing
      // them turns the form into an account-enumeration oracle. Pass it through unchanged.
      setError(signInError.message);
      setBusy(false);
      return;
    }

    // `refresh` before `push` so the server components re-render with the new session cookie.
    // Pushing first renders the authenticated shell against a stale server session, which
    // bounces straight back here.
    router.refresh();
    router.push('/agents');
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
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

      <Field label="Password" htmlFor="password" error={error}>
        <TextInput
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
