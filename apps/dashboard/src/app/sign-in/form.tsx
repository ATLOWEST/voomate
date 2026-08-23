'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    const next = searchParams.get('next');
    if (next && next.startsWith('/')) {
      router.refresh();
      router.push(next);
      return;
    }

    // Smart routing: Check if user is a platform administrator
    if (data.user) {
      const { data: adminRecord } = await supabase
        .from('platform_administrators')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      router.refresh();
      if (adminRecord) {
        router.push('/admin/merchants');
        return;
      }
    }

    // Standard merchant dashboard
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
