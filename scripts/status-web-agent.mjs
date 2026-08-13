import { performance } from 'node:perf_hooks';

const services = [
  ['Landing site', 'http://127.0.0.1:3000'],
  ['Dashboard + widget runtime', 'http://127.0.0.1:3001/embed.js'],
  ['Connect/control API', 'http://127.0.0.1:4000/health'],
];

const checks = await Promise.all(
  services.map(async ([name, url]) => {
    const startedAt = performance.now();
    const controller = new globalThis.AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      return {
        name,
        url,
        ok: response.ok,
        status: response.status,
        ms: Math.round(performance.now() - startedAt),
      };
    } catch {
      return { name, url, ok: false, status: 0, ms: Math.round(performance.now() - startedAt) };
    } finally {
      clearTimeout(timeout);
    }
  }),
);

for (const check of checks) {
  console.log(
    `${check.ok ? 'READY' : 'DOWN '}  ${check.name.padEnd(28)} ${String(check.ms).padStart(4)}ms  ${check.url}`,
  );
}
if (checks.some(({ ok }) => !ok)) {
  console.error('\nStart the complete stack with: npm run dev:web-agent');
  process.exitCode = 1;
}
