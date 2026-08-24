import { NextResponse, type NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * Password sign-in and signup confirmation are completed inside the Dashboard form.
 * Keep legacy links from becoming an accidental session-exchange path.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/sign-in', request.url));
}
