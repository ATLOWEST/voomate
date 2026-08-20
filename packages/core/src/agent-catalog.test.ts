import { describe, expect, it } from 'vitest';
import { AGENT_CATALOG, AgentCatalogType, isReleasedAgentType } from './agent-catalog.js';

describe('agent catalog contract', () => {
  it('releases only the Web Agent until every pack exists', () => {
    expect(AGENT_CATALOG.map(({ id }) => id)).toEqual(['web', 'crm', 'seo', 'calling']);
    expect(isReleasedAgentType(AgentCatalogType.WEB)).toBe(true);
    expect(isReleasedAgentType(AgentCatalogType.CRM)).toBe(false);
    expect(isReleasedAgentType(AgentCatalogType.SEO)).toBe(false);
    expect(isReleasedAgentType(AgentCatalogType.CALLING)).toBe(false);
  });
});
