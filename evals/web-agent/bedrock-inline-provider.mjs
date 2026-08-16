import { randomUUID } from 'node:crypto';
import {
  BedrockAgentRuntimeClient,
  InvokeInlineAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { setTimeout as sleep } from 'node:timers/promises';

function isThrottle(error) {
  const value = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return value.includes('throttl') || value.includes('rate is too high') || value.includes('quota');
}

export default class BedrockInlineProvider {
  constructor(options = {}) {
    this.config = options.config ?? {};
    this.client = new BedrockAgentRuntimeClient({
      region: this.config.region ?? 'us-east-1',
      maxAttempts: 1,
    });
  }

  id() {
    return 'voomate-bedrock-inline-agent';
  }

  async callApi(prompt) {
    const messages = JSON.parse(prompt);
    const system = messages.find((message) => message.role === 'system')?.content?.[0]?.text ?? '';
    const inputText =
      messages.findLast((message) => message.role === 'user')?.content?.[0]?.text ?? '';
    let lastError;
    for (const delay of [0, 2_500, 6_000, 12_000]) {
      if (delay) await sleep(delay);
      try {
        const response = await this.client.send(
        new InvokeInlineAgentCommand({
          foundationModel: this.config.model ?? 'us.amazon.nova-pro-v1:0',
          agentName: 'VoomateHarnessEvaluator',
          instruction: system,
          inputText,
          sessionId: randomUUID(),
          idleSessionTTLInSeconds: 60,
          bedrockModelConfigurations: { performanceConfig: { latency: 'optimized' } },
          actionGroups: [
            {
              actionGroupName: 'EvalSafeActions',
              actionGroupExecutor: { customControl: 'RETURN_CONTROL' },
              functionSchema: {
                functions: [
                  {
                    name: 'check_order_status',
                    description: 'Check an order after collecting an order ID and checkout email.',
                    parameters: {
                      orderId: { type: 'string', required: true },
                      email: { type: 'string', required: true },
                    },
                  },
                ],
              },
            },
          ],
          streamingConfigurations: { streamFinalResponse: true },
        }),
        );
        let output = '';
        let action;
        for await (const event of response.completion ?? []) {
          if (event.chunk?.bytes) output += new TextDecoder().decode(event.chunk.bytes);
          if (event.returnControl?.invocationInputs?.length) {
            action = event.returnControl.invocationInputs
              .map((input) => input.functionInvocationInput?.function)
              .filter(Boolean)
              .join(', ');
          }
        }
        return { output: action ? `${output}\n${action}`.trim() : output.trim() };
      } catch (error) {
        lastError = error;
        if (!isThrottle(error)) break;
      }
    }
    return {
      error: lastError instanceof Error ? lastError.message : 'Inline Agent evaluation failed.',
    };
  }
}
