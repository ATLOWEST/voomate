const required = [
  'WEB_AGENT_URL',
  'WEB_AGENT_PUBLIC_KEY',
  'WEB_AGENT_ORIGIN',
  'WEB_AGENT_ORDER_ID',
  'WEB_AGENT_ORDER_EMAIL',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const baseUrl = process.env.WEB_AGENT_URL.replace(/\/$/, '');
const origin = process.env.WEB_AGENT_ORIGIN;

async function post(path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

const session = await post('/api/web-agent/session', {
  publicKey: process.env.WEB_AGENT_PUBLIC_KEY,
});

for (let attempt = 1; attempt <= 10; attempt += 1) {
  const result = await post(
    '/api/web-agent/messages',
    {
      message: `Please check order ${process.env.WEB_AGENT_ORDER_ID}. The checkout email is ${process.env.WEB_AGENT_ORDER_EMAIL}.`,
      pageUrl: `${origin}/smoke-test`,
    },
    session.session.token,
  );
  if (!result.message || !result.conversationId) throw new Error(`Attempt ${attempt} failed.`);
  console.log(`${attempt}/10`, result.message);
}

console.log('Web Agent loop passed 10/10. Confirm the corresponding traces in Dashboard → Logs.');
