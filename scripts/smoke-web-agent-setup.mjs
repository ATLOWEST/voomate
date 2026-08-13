import assert from 'node:assert/strict';

const dashboard = (process.env.WEB_AGENT_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const publicKey = process.env.WEB_AGENT_PUBLIC_KEY ?? 'test-embed-key';

async function startSession(origin) {
  const response = await fetch(`${dashboard}/api/web-agent/session`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ publicKey }),
  });
  assert.equal(response.status, 201, `Widget session failed for ${origin}.`);
  return (await response.json()).session;
}

async function turn(origin, message, pageContext) {
  const session = await startSession(origin);
  const response = await fetch(`${dashboard}/api/web-agent/messages/stream`, {
    method: 'POST',
    headers: {
      origin,
      authorization: `Bearer ${session.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message, channel: 'text', imageIds: [], pageContext }),
  });
  assert.equal(response.status, 200, `Agent turn failed for ${origin}.`);

  let buffer = '';
  let answer = '';
  for await (const chunk of response.body) {
    buffer += new TextDecoder().decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'delta') answer += event.text;
      if (event.type === 'error') throw new Error(event.error);
    }
  }
  return answer.trim();
}

const publicOrigin = 'http://localhost:3000';
const dashboardOrigin = 'http://localhost:3001';
const landingContext = {
  url: `${publicOrigin}/`,
  title: 'Voomate',
  description: 'The public Voomate product site.',
  headings: ['Your business deserves an AI team'],
  navigation: [],
  surface: {
    id: 'home',
    title: 'Voomate',
    description: 'The public Voomate product site.',
  },
};
const dashboardContext = (total, active, draft, paused) => ({
  url: `${dashboardOrigin}/agents`,
  title: 'Agents',
  description: 'Choose and operate agents.',
  headings: ['Agents'],
  navigation: [],
  surface: {
    id: 'agents',
    title: 'Agents',
    description: 'Choose and operate agents.',
  },
  operatingState: {
    source: 'host_ui',
    agentInventory: { total, active, draft, paused },
  },
});

const publicSetup = await turn(publicOrigin, 'How do I set up my business?', landingContext);
assert.match(publicSetup, /create an account or sign in/i);
assert.doesNotMatch(publicSetup, /this workspace has no agents/i);

const emptySetup = await turn(
  dashboardOrigin,
  'How do I set up my business?',
  dashboardContext(0, 0, 0, 0),
);
assert.match(emptySetup, /no agents yet/i);
assert.match(emptySetup, /add agent/i);

const configuredInventory = await turn(
  dashboardOrigin,
  'Do I have any agents configured?',
  dashboardContext(3, 1, 1, 1),
);
assert.match(configuredInventory, /3 agents: 1 active, 1 draft, and 1 paused/i);

process.stdout.write(
  `${JSON.stringify({
    passed: true,
    publicStateStayedPrivate: true,
    emptyWorkspaceGuidedToAdd: true,
    configuredWorkspaceCountVerified: true,
  })}\n`,
);
