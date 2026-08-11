'use client';

/**
 * Session and organization context.
 *
 * Every tenant-scoped API call needs two things: the user's access token, and the ID of the
 * organization they are acting in. The API refuses to infer the second from the first — a user
 * can belong to several organizations, and picking one for them silently is exactly how a
 * write lands in the wrong tenant. So both travel together, from here, on every request.
 *
 * The selected organization is mirrored into a cookie so a page reload and any server
 * component land on the same one. It is a *preference*, not a credential: the API re-checks
 * membership on every request, so tampering with the cookie gets a 403 rather than access.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorCode } from '@voomate/core';
import { createClient } from '@/lib/supabase/client';
import { api, ApiError } from '@/lib/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface SessionValue {
  userId: string;
  email: string;
  organizations: Organization[];
  organization: Organization | undefined;
  selectOrganization: (id: string) => void;
  /** Fresh access token, refreshing it first if it is close to expiry. */
  getToken: () => Promise<string>;
  signOut: () => Promise<void>;
  /** Re-read the organization list — after creating one, for instance. */
  refreshOrganizations: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const ORG_COOKIE = 'voomate-org';

export function SessionProvider({
  userId,
  email,
  initialOrganizations,
  initialOrganizationId,
  children,
}: {
  userId: string;
  email: string;
  initialOrganizations: Organization[];
  initialOrganizationId: string | undefined;
  children: ReactNode;
}) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [selectedId, setSelectedId] = useState(
    initialOrganizationId ?? initialOrganizations[0]?.id,
  );

  const supabase = useMemo(() => createClient(), []);

  const getToken = useCallback(async () => {
    // `getSession` refreshes when the token is near expiry, which is what makes a long editing
    // session survive without the user being bounced to sign-in mid-form.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/sign-in';
      throw new Error('Session expired.');
    }
    return session.access_token;
  }, [supabase]);

  const selectOrganization = useCallback((id: string) => {
    setSelectedId(id);
    // `SameSite=Lax` and no `Secure` in dev; this is a UI preference, not a session token.
    document.cookie = `${ORG_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const refreshOrganizations = useCallback(async () => {
    const token = await getToken();
    const { organizations: next } = await api.get<{ organizations: Organization[] }>(
      '/v1/organizations',
      { accessToken: token },
    );
    setOrganizations(next);
    setSelectedId((current) => (next.some((o) => o.id === current) ? current : next[0]?.id));
  }, [getToken]);

  // A membership revoked in another tab would otherwise leave this one showing an org the API
  // now rejects, which reads as "the dashboard is broken" rather than "you were removed".
  useEffect(() => {
    if (selectedId !== undefined && !organizations.some((o) => o.id === selectedId)) {
      setSelectedId(organizations[0]?.id);
    }
  }, [organizations, selectedId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/sign-in';
  }, [supabase]);

  const value = useMemo<SessionValue>(
    () => ({
      userId,
      email,
      organizations,
      organization: organizations.find((o) => o.id === selectedId),
      selectOrganization,
      getToken,
      signOut,
      refreshOrganizations,
    }),
    [
      userId,
      email,
      organizations,
      selectedId,
      selectOrganization,
      getToken,
      signOut,
      refreshOrganizations,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === undefined) {
    throw new Error('useSession must be used inside the authenticated layout.');
  }
  return value;
}

/**
 * The credentials for one tenant-scoped API call.
 *
 * Returned as a single object because these two always travel together — splitting them is
 * how a call ends up authenticated but unscoped, which is a 403 at best.
 */
export function useApiAuth() {
  const { getToken, organization } = useSession();
  return useCallback(async () => {
    if (organization === undefined) {
      // Raised client-side, before the request leaves the browser, but shaped like a real API
      // error so callers have exactly one error type to handle.
      throw new ApiError(403, {
        error: { code: ErrorCode.FORBIDDEN, message: 'Select a workspace first.' },
      });
    }
    return { accessToken: await getToken(), organizationId: organization.id };
  }, [getToken, organization]);
}
