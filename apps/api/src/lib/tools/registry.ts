import type { Database } from '@voomate/db';
import type { Tool, ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface VoomateToolContext {
  db: Database;
  organizationId: string;
  agentId: string;
  conversationId?: string;
  config: Record<string, unknown>;
}

export interface VoomateTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  /** Built-in safety workflows are available without a merchant tool grant. */
  builtin?: boolean;
  /** Placeholder tools are never shown to a model or executed in any environment. */
  implementation?: 'production' | 'placeholder';
  provider?: 'shopify' | 'calendly' | 'whatsapp' | 'hubspot' | 'razorpay' | 'stripe' | 'zendesk';
  schema: ZodType<TInput>;
  execute: (input: TInput, ctx: VoomateToolContext) => Promise<TOutput>;
}

const registry = new Map<string, VoomateTool<unknown, unknown>>();

export type BedrockDocument =
  null | boolean | number | string | BedrockDocument[] | { [key: string]: BedrockDocument };

/** Convert an unknown tool value to Bedrock's JSON document shape without unsafe casts. */
export const toBedrockDocument = (value: unknown): BedrockDocument => {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(toBedrockDocument);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) =>
        child === undefined ? [] : [[key, toBedrockDocument(child)]],
      ),
    );
  }
  return String(value);
};

export const registerTool = <TInput, TOutput>(tool: VoomateTool<TInput, TOutput>) => {
  if (registry.has(tool.name)) {
    throw new Error(`Tool ${tool.name} is already registered.`);
  }
  registry.set(tool.name, tool as unknown as VoomateTool<unknown, unknown>);
};

export const getTool = (name: string): VoomateTool | undefined => {
  return registry.get(name);
};

export const getAllTools = (): VoomateTool[] => {
  return Array.from(registry.values());
};

/**
 * Converts a list of VoomateTools into the Bedrock Converse API ToolConfiguration format.
 */
export const buildToolConfig = (tools: VoomateTool[]): ToolConfiguration | undefined => {
  const productionTools = tools.filter((tool) => tool.implementation !== 'placeholder');
  if (productionTools.length === 0) return undefined;

  const bedrockTools: Tool[] = productionTools.map((t) => {
    // zodToJsonSchema converts our Zod schemas into JSON Schema Draft-07
    // which Bedrock Nova models natively expect.
    const { $schema: _schema, ...jsonSchema } = zodToJsonSchema(t.schema, {
      target: 'jsonSchema7',
    });

    const specification: Tool.ToolSpecMember = {
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: toBedrockDocument(jsonSchema),
        },
      },
    };
    return specification;
  });

  return {
    tools: bedrockTools,
  };
};
