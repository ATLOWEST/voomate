/**
 * Enforces the loader's size budget.
 *
 * This exists because the budget was breached the first time the loader was built: importing
 * from the '@soniq/core' barrel instead of the '@soniq/core/widget-protocol' subpath pulled
 * zod onto every merchant page and took the bundle to 17.6kb gzipped — 3.5x the budget, with
 * nothing failing to signal it.
 *
 * The loader runs for every visitor on every page whether or not they open the widget, so it
 * is a direct tax on the merchant's Core Web Vitals. A number in a README does not hold; a
 * failing build does.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const BUDGET_BYTES = 5 * 1024;
const TARGET = new URL('../dist/loader/soniq.js', import.meta.url);

const raw = readFileSync(TARGET);
const gzipped = gzipSync(raw, { level: 9 }).byteLength;
const kb = (bytes) => `${(bytes / 1024).toFixed(2)}kb`;

if (gzipped > BUDGET_BYTES) {
  console.error(
    `\n✗ Loader is ${kb(gzipped)} gzipped, over the ${kb(BUDGET_BYTES)} budget.\n\n` +
      `  Most likely cause: an import that reaches the '@soniq/core' barrel (which re-exports\n` +
      `  zod-backed contracts) instead of a dependency-free subpath. Check the imports in\n` +
      `  src/loader/ before raising the budget — raising it is almost never the right fix.\n`,
  );
  process.exit(1);
}

console.log(`✓ Loader ${kb(gzipped)} gzipped (budget ${kb(BUDGET_BYTES)})`);
