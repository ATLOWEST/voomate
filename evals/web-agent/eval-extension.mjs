import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

export function afterAll(context) {
  const scores = context.results
    .map((result) => result.namedScores?.AIJudge)
    .filter((score) => Number.isFinite(score));
  let harnessVersion = 'unknown';
  try {
    const harness = readFileSync(
      resolve(process.cwd(), 'apps/dashboard/harness/web-agent.v2.md'),
      'utf8',
    );
    harnessVersion = harness.match(/^version:\s*(.+)$/m)?.[1]?.trim() ?? harnessVersion;
  } catch {
    // The eval remains valid when invoked from a packaged environment without the source file.
  }
  const historyFile = resolve(process.cwd(), 'evals/web-agent/results/history.ndjson');
  mkdirSync(dirname(historyFile), { recursive: true });
  appendFileSync(
    historyFile,
    `${JSON.stringify({
      recordedAt: new Date().toISOString(),
      evalId: context.evalId,
      harnessVersion,
      cases: context.results.length,
      passed: context.results.filter((result) => result.success).length,
      failed: context.results.filter((result) => !result.success).length,
      aiJudgeCases: scores.length,
      aiJudgeAverage:
        scores.length > 0
          ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(4))
          : null,
      aiJudgeMinimum: scores.length > 0 ? Math.min(...scores) : null,
    })}\n`,
    'utf8',
  );
}

export default { afterAll };
