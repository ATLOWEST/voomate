// Must come first: it populates process.env, and every import below reads config at load time.
import './load-env.js';
import { serverConfig } from './config.js';
import { buildServer } from './server.js';
import { registerTool } from './lib/tools/registry.js';
import { registerEcommerceTools } from './lib/tools/ecommerce.js';
import { checkAvailabilityTool, bookAppointmentTool } from './lib/tools/calendar.js';
import { generatePaymentLinkTool, checkPaymentStatusTool } from './lib/tools/payments.js';
import { createStripePaymentLinkTool, checkStripePaymentStatusTool } from './lib/tools/stripe.js';
import { createHubspotLeadTool } from './lib/tools/crm.js';
import { escalateToHumanTool } from './lib/tools/escalate.js';
import { requestApprovalTool } from './lib/tools/request_approval.js';

const start = async (): Promise<void> => {
  registerEcommerceTools();
  registerTool(checkAvailabilityTool);
  registerTool(bookAppointmentTool);
  registerTool(generatePaymentLinkTool);
  registerTool(checkPaymentStatusTool);
  registerTool(createStripePaymentLinkTool);
  registerTool(checkStripePaymentStatusTool);
  registerTool(createHubspotLeadTool);
  registerTool(escalateToHumanTool);
  registerTool(requestApprovalTool);
  const app = await buildServer();

  // Drain in-flight requests before exiting. A voice session cut mid-turn is a bad
  // experience; a deploy should not produce one.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'Shutting down');
      void app.close().then(() => process.exit(0));
    });
  }

  try {
    await app.listen({ port: serverConfig.API_PORT, host: serverConfig.API_HOST });
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

void start();
