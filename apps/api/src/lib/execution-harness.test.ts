import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { executeToolHarness, redactForAudit } from './execution-harness.js';
import { registerTool } from './tools/registry.js';

const execute = vi.fn(async (input: { value: string }) => ({ echoed: input.value }));
registerTool({
  name: 'security_test_builtin',
  description: 'Test-only built-in tool.',
  builtin: true,
  schema: z.object({ value: z.string() }).strict(),
  execute,
});

const restrictedExecute = vi.fn(async () => ({ ok: true }));
registerTool({
  name: 'security_test_restricted',
  description: 'Test-only merchant-granted tool.',
  schema: z.object({}).strict(),
  execute: restrictedExecute,
});

function fakeDb(options: { failAuditAt?: number; selectResults?: unknown[][] } = {}) {
  const events: string[] = [];
  let auditCount = 0;
  const selectResults = options.selectResults ?? [[{ id: 'agent' }]];
  return {
    events,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => selectResults.shift() ?? [],
          }),
        }),
      }),
      insert: () => ({
        values: async (value: { status: string }) => {
          auditCount += 1;
          if (auditCount === options.failAuditAt) throw new Error('audit unavailable');
          events.push(`audit:${value.status}`);
        },
      }),
      query: { organizationIntegrations: { findFirst: async () => undefined } },
    },
  };
}

describe('executeToolHarness security boundary', () => {
  it('writes durable intent before execution and a receipt afterward', async () => {
    execute.mockImplementationOnce(async (input) => {
      state.events.push('execute');
      return { echoed: input.value };
    });
    const state = fakeDb();
    const result = await executeToolHarness({
      db: state.db as never,
      organizationId: 'org',
      agentId: 'agent',
      toolName: 'security_test_builtin',
      toolInput: { value: 'safe' },
    });
    expect(result.status).toBe('success');
    expect(state.events).toEqual(['audit:gated', 'execute', 'audit:success']);
  });

  it('never executes when the durable intent cannot be written', async () => {
    execute.mockClear();
    const state = fakeDb({ failAuditAt: 1 });
    const result = await executeToolHarness({
      db: state.db as never,
      organizationId: 'org',
      agentId: 'agent',
      toolName: 'security_test_builtin',
      toolInput: { value: 'safe' },
    });
    expect(result).toEqual({
      status: 'error',
      error: 'CRITICAL_AUDIT_FAILURE: Action was blocked before execution.',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects extra input fields before execution', async () => {
    execute.mockClear();
    const state = fakeDb();
    const result = await executeToolHarness({
      db: state.db as never,
      organizationId: 'org',
      agentId: 'agent',
      toolName: 'security_test_builtin',
      toolInput: { value: 'safe', injected: true },
    });
    expect(result.status).toBe('error');
    expect(execute).not.toHaveBeenCalled();
    expect(state.events).toEqual(['audit:error']);
  });

  it('rejects a conversation that is outside the tenant and agent scope', async () => {
    execute.mockClear();
    const state = fakeDb({ selectResults: [[{ id: 'agent' }], []] });
    const result = await executeToolHarness({
      db: state.db as never,
      organizationId: 'org',
      agentId: 'agent',
      conversationId: '00000000-0000-4000-8000-000000000099',
      toolName: 'security_test_builtin',
      toolInput: { value: 'safe' },
    });
    expect(result.status).toBe('error');
    expect(execute).not.toHaveBeenCalled();
    expect(state.events).toEqual(['audit:error']);
  });

  it('requires an active per-agent grant for non-built-in tools', async () => {
    restrictedExecute.mockClear();
    const state = fakeDb({ selectResults: [[{ id: 'agent' }], []] });
    const result = await executeToolHarness({
      db: state.db as never,
      organizationId: 'org',
      agentId: 'agent',
      toolName: 'security_test_restricted',
      toolInput: {},
    });
    expect(result.status).toBe('error');
    expect(restrictedExecute).not.toHaveBeenCalled();
    expect(state.events).toEqual(['audit:error']);
  });

  it('redacts credential-shaped values before audit storage', () => {
    expect(
      redactForAudit({
        orderId: 'order-1',
        accessToken: 'secret-value',
        nested: { authorization: 'Bearer secret', status: 'ok' },
      }),
    ).toEqual({
      orderId: 'order-1',
      accessToken: '[REDACTED]',
      nested: { authorization: '[REDACTED]', status: 'ok' },
    });
  });
});
