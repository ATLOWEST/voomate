import { api } from '@/lib/api';
import type { Organization } from '@/lib/session';

/**
 * Read the signed-in user's workspace memberships once, without ever selecting one implicitly.
 * Pages can decide whether to open the operating panel or continue workspace setup.
 */
export async function getOrganizations(accessToken: string): Promise<Organization[]> {
  const result = await api.get<{ organizations: Organization[] }>('/v1/organizations', {
    accessToken,
  });

  return result.organizations;
}
