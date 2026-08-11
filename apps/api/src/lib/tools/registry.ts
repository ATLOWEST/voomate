import type { Tool, ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Database } from '@voomate/db';

export interface VoomateToolContext {
  db: Database;
  organizationId: string;
  agentId: string;
  conversationId?: string;
  config: Record<string, any>;
}

export interface VoomateTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  provider?: 'shopify' | 'calendly' | 'whatsapp' | 'hubspot' | 'razorpay' | 'stripe' | 'zendesk';
  schema: z.ZodType<TInput>;
  execute: (input: TInput, ctx: VoomateToolContext) => Promise<TOutput>;
}

const registry = new Map<string, VoomateTool>();

export const registerTool = (tool: VoomateTool) => {
  if (registry.has(tool.name)) {
    throw new Error(`Tool ${tool.name} is already registered.`);
  }
  registry.set(tool.name, tool);
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
  if (tools.length === 0) return undefined;

  const bedrockTools: Tool[] = tools.map((t) => {
    // zodToJsonSchema converts our Zod schemas into JSON Schema Draft-07
    // which Bedrock Nova models natively expect.
    const jsonSchema = zodToJsonSchema(t.schema, { target: 'jsonSchema7' }) as any;

    // Zodtojsonschema wraps the schema in `{ type: "object", properties: ... }`
    // We just need to remove the top level $schema if it exists
    delete jsonSchema.$schema;

    return {
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: jsonSchema,
        },
      },
    };
  });

  return {
    tools: bedrockTools,
  };
};
