'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

/**
 * Recovery for the rare case where an authenticated account predates workspace creation.
 * New customers always create their workspace in SignUpForm before they can sign in.
 */
export function WorkspaceRecoveryForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session?.access_token) {
        router.replace('/sign-in');
        return;
      }

      await api.post(
        '/v1/organizations',
        { name: name.trim() },
        { accessToken: session.access_token },
      );
      router.refresh();
      router.replace('/overview');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        router.refresh();
        router.replace('/overview');
        return;
      }
      setError('We could not create the workspace. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form mt-7" noValidate>
      <Field
        label="Workspace name"
        htmlFor="workspace-name"
        hint="This is the private workspace for your business. You can invite teammates later."
        error={error}
      >
        <TextInput
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={80}
          required
          autoFocus
          autoComplete="organization"
          placeholder="Your business"
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Create workspace
      </Button>
      {busy && (
        <p className="auth-notice" role="status" aria-live="polite">
          Creating your workspace. Please keep this page open while we finish setup.
        </p>
      )}
    </form>
  );
}
