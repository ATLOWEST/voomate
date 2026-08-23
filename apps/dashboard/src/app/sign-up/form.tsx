'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

export function SignUpForm() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { workspace_name: workspaceName.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    // If email confirmation is enabled, Supabase deliberately does not issue a session yet.
    // We wait until the user can prove their email before creating billable workspace data.
    if (!data.session) {
      setNotice('Check your email to confirm your account. Then sign in to create your workspace.');
      setBusy(false);
      return;
    }

    router.replace(`/onboarding?workspace=${encodeURIComponent(workspaceName.trim())}`);
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <Field label="Workspace name" htmlFor="workspace-name">
        <TextInput
          id="workspace-name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          minLength={2}
          required
          autoFocus
          autoComplete="organization"
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password" htmlFor="password" hint="Use at least 8 characters." error={error}>
        <TextInput
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[13px] text-secondary"
        >
          {notice}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={busy}
        className="w-full"
        disabled={notice !== undefined}
      >
        Create account
      </Button>
    </form>
  );
}
