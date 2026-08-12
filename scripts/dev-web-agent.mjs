import { spawn } from 'node:child_process';
import process from 'node:process';

const STARTUP_TIMEOUT_MS = 45_000;
const HEALTH_INTERVAL_MS = 350;

const services = [
  {
    name: 'Web Agent API',
    command: ['run', 'dev:api'],
    url: 'http://127.0.0.1:4000/health',
  },
  {
    name: 'Widget runtime',
    command: ['run', 'dev:dashboard'],
    url: 'http://127.0.0.1:3001/embed.js',
  },
  {
    name: 'Landing site',
    command: ['run', 'dev:landing'],
    url: 'http://127.0.0.1:3000',
  },
];

const children = new Map();

const delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

async function isReady(url) {
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function start(service) {
  const child = spawn('npm', service.command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  children.set(service.name, child);
  child.once('exit', (code, signal) => {
    children.delete(service.name);
    if (!shuttingDown && code !== 0) {
      console.error(
        `[Voomate] ${service.name} stopped before shutdown (${signal ?? `exit ${code}`}).`,
      );
    }
  });
}

async function waitUntilReady(service) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isReady(service.url)) return;
    const child = children.get(service.name);
    if (child && child.exitCode !== null) {
      throw new Error(`${service.name} exited with code ${child.exitCode}.`);
    }
    await delay(HEALTH_INTERVAL_MS);
  }
  throw new Error(`${service.name} did not become healthy within 45 seconds.`);
}

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Voomate] ${signal}: stopping services started by this command...`);
  for (const child of children.values()) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1_500).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

try {
  for (const service of services) {
    if (await isReady(service.url)) {
      console.log(`[Voomate] ${service.name} already healthy at ${service.url}`);
      continue;
    }
    console.log(`[Voomate] Starting ${service.name}...`);
    start(service);
  }

  await Promise.all(services.map(waitUntilReady));
  console.log('\n[Voomate] Web Agent development stack is ready:');
  console.log('  Landing + installed widget  http://localhost:3000');
  console.log('  Dashboard + widget runtime  http://localhost:3001');
  console.log('  Connect/control API         http://localhost:4000');
  console.log('\nPress Ctrl+C to stop only the services started by this command.');

  // Keep the supervisor alive even when every service was already running.
  await new Promise(() => {});
} catch (error) {
  console.error(`[Voomate] Startup failed: ${error instanceof Error ? error.message : error}`);
  shutdown('startup failure');
  process.exitCode = 1;
}
