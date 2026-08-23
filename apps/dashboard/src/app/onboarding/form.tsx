'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export function WorkspaceOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get('workspace') ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      router.replace('/');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        router.refresh();
        router.replace('/');
        return;
      }
      setError('We could not create the workspace. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <Field
        label="Workspace name"
        htmlFor="workspace-name"
        hint="This is the private workspace for your business."
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
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        Create workspace
      </Button>
    </form>
  );
}
