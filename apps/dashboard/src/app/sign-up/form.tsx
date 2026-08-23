'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

export function SignUpForm() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { workspace_name: workspaceName.trim() } },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // If email confirmation is enabled, Supabase deliberately does not issue a session yet.
      // We wait until the user can prove their email before creating billable workspace data.
      if (!data.session) {
        setNotice('Check your email to confirm your account. Then sign in to create your workspace.');
        return;
      }

      router.replace(`/onboarding?workspace=${encodeURIComponent(workspaceName.trim())}`);
    } catch {
      setError('Account creation is temporarily unavailable. Please reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
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
        <div className="auth-input-with-action">
          <TextInput
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            className="auth-input-action"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      {notice && (
        <p
          role="status"
          className="auth-notice"
        >
          {notice}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={busy}
        className="auth-submit"
        disabled={notice !== undefined}
      >
        Create account
      </Button>
    </form>
  );
}
