import { NextResponse } from 'next/server';
import { getUser, isPlatformAdministrator } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Decides the initial portal after a password sign-in.
 *
 * This is deliberately server-side: the browser never receives a role map or decides that an
 * email is an administrator. The admin layout repeats the allowlist check before rendering.
 */
export async function GET() {
  const user = await getUser();
  if (user === null) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const destination = (await isPlatformAdministrator(user.id)) ? '/admin/merchants' : '/overview';

  return NextResponse.json(
    { destination },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
