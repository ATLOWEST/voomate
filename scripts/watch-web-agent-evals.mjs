import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watched = [join(root, 'apps/dashboard/harness'), join(root, 'evals/web-agent')];

let timer;
let running = false;
let rerun = false;

function run() {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  const child = spawn('npm', ['run', 'eval:web-agent'], { cwd: root, stdio: 'inherit' });
  child.on('exit', () => {
    running = false;
    if (rerun) {
      rerun = false;
      run();
    }
  });
}

for (const directory of watched) {
  watch(directory, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(run, 400);
  });
}

console.log('Watching the Web Agent harness and eval suite. Press Ctrl+C to stop.');
run();
