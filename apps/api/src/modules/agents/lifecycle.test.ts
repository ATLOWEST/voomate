import { describe, expect, it } from 'vitest';
import { AgentStatus } from '@voomate/core';
import { nextAgentLifecycleStatus } from './lifecycle.js';

describe('agent lifecycle contract', () => {
  it('supports the governed happy path and idempotent controls', () => {
    expect(nextAgentLifecycleStatus(AgentStatus.DRAFT, 'activate')).toBe(AgentStatus.ACTIVE);
    expect(nextAgentLifecycleStatus(AgentStatus.ACTIVE, 'activate')).toBe(AgentStatus.ACTIVE);
    expect(nextAgentLifecycleStatus(AgentStatus.ACTIVE, 'pause')).toBe(AgentStatus.PAUSED);
    expect(nextAgentLifecycleStatus(AgentStatus.PAUSED, 'pause')).toBe(AgentStatus.PAUSED);
    expect(nextAgentLifecycleStatus(AgentStatus.PAUSED, 'activate')).toBe(AgentStatus.ACTIVE);
    expect(nextAgentLifecycleStatus(AgentStatus.ACTIVE, 'archive')).toBe(AgentStatus.ARCHIVED);
    expect(nextAgentLifecycleStatus(AgentStatus.ARCHIVED, 'restore')).toBe(AgentStatus.PAUSED);
  });

  it('fails closed for invalid transitions', () => {
    expect(() => nextAgentLifecycleStatus(AgentStatus.DRAFT, 'pause')).toThrow();
    expect(() => nextAgentLifecycleStatus(AgentStatus.ARCHIVED, 'activate')).toThrow();
    expect(() => nextAgentLifecycleStatus(AgentStatus.ACTIVE, 'restore')).toThrow();
  });
});
