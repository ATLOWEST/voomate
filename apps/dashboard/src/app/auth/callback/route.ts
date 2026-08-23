import { NextResponse, type NextRequest } from 'next/server';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles a Supabase email link if an administrator enables magic links as a fallback.
 * The normal Dashboard path verifies an email OTP directly in the sign-in form.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(
    new URL(safeInternalPath(request.nextUrl.searchParams.get('next')), request.url),
  );
}
