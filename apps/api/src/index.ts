import { serverConfig } from './config.js';
import { buildServer } from './server.js';

const start = async (): Promise<void> => {
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
