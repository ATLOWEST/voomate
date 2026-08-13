/* global document, sessionStorage, window */
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const landingOrigin = process.env.VOOMATE_NAVIGATION_SMOKE_ORIGIN ?? 'http://localhost:3000';
const dashboardOrigin =
  process.env.VOOMATE_DASHBOARD_NAVIGATION_SMOKE_ORIGIN ?? 'http://localhost:3001';
const browser = await chromium.launch({ headless: true });

async function assertManifestRoutes(origin) {
  const html = await (await fetch(`${origin}/`)).text();
  const source = html.match(/data-voomate-ui-manifest="true">([^<]+)/)?.[1];
  assert.ok(source, `No UI manifest was rendered at ${origin}.`);
  const manifest = JSON.parse(source);
  assert.ok(Array.isArray(manifest.pages) && manifest.pages.length > 0);
  for (const destination of manifest.pages) {
    const url = new URL(destination.path, origin);
    const response = await fetch(url, { redirect: 'follow' });
    assert.ok(response.ok, `Manifest route failed: ${url.href} (${response.status})`);
    assert.equal(new URL(response.url).origin, new URL(origin).origin);
  }
  return manifest.pages.length;
}

async function openWidget(page, origin) {
  await page.goto(`${origin}/`);
  const host = page.locator('voomate-agent');
  await host.waitFor({ timeout: 15_000 });
  const launcher = host.locator('button[aria-label="Open assistant"]');
  if (await launcher.count()) await launcher.click();
  await host.locator('#voomate-message').waitFor({ timeout: 15_000 });
  await page.waitForFunction(
    () => !document.querySelector('voomate-agent')?.shadowRoot?.querySelector('input')?.disabled,
    undefined,
    { timeout: 15_000 },
  );
  return host;
}

async function sendMessage(page, host, message) {
  const count = await host.locator('.message-copy').count();
  await host.locator('#voomate-message').fill(message);
  await host.locator('#voomate-message').press('Enter');
  await page.waitForFunction(
    ({ selector, previousCount }) => {
      const root = document.querySelector(selector)?.shadowRoot;
      return (
        (root?.querySelectorAll('.message-copy').length ?? 0) >= previousCount + 2 &&
        !root?.querySelector('form.composer')?.classList.contains('busy')
      );
    },
    { selector: 'voomate-agent', previousCount: count },
    { timeout: 30_000 },
  );
  return (await host.locator('.message-copy').allTextContents()).at(-1) ?? '';
}

async function expectNavigation(page, host, message, expectedPath) {
  const identity = await host.getAttribute('data-navigation-smoke-identity');
  const response = await sendMessage(page, host, message);
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 15_000 });
  assert.match(response, /opening/i, `Navigation did not acknowledge: ${message}`);
  assert.equal(
    await page.locator('voomate-agent').getAttribute('data-navigation-smoke-identity'),
    identity,
    `SPA navigation replaced the live widget for: ${message}`,
  );
}

async function expectNoNavigation(page, host, message, expectedReply) {
  const before = new URL(page.url()).pathname;
  const response = await sendMessage(page, host, message);
  assert.equal(new URL(page.url()).pathname, before, `Unexpected redirect for: ${message}`);
  if (expectedReply) assert.match(response, expectedReply, `Unexpected reply for: ${message}`);
  assert.doesNotMatch(response, /need (?:the|a) url|provide (?:the|a) url/i);
}

async function assertHardReloadContinuation(page, host) {
  const transcriptBeforeReload = await host.locator('.message-copy').allTextContents();
  await page.reload();
  const resumedHost = page.locator('voomate-agent[data-voomate-mounted="true"]');
  await resumedHost.waitFor({ timeout: 15_000 });
  await page.waitForFunction(
    () => !document.querySelector('voomate-agent')?.shadowRoot?.querySelector('input')?.disabled,
    undefined,
    { timeout: 15_000 },
  );
  const transcriptAfterReload = await resumedHost.locator('.message-copy').allTextContents();
  for (const expectedMessage of transcriptBeforeReload.slice(-6)) {
    assert.ok(
      transcriptAfterReload.includes(expectedMessage),
      `Conversation did not resume after a full reload: ${expectedMessage}`,
    );
  }
}

async function testLanding() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const host = await openWidget(page, landingOrigin);
  await host.evaluate((element) => {
    element.dataset.navigationSmokeIdentity = 'landing-preserved';
  });

  await expectNavigation(page, host, 'hi can you place take me to priing pages', '/pricing');
  await expectNoNavigation(
    page,
    host,
    'What is the pricing and how much does it cost?',
    /starter is free/i,
  );
  await expectNavigation(page, host, 'take me to use cases', '/industries');
  await expectNavigation(page, host, 'open the compny story', '/about');
  await expectNavigation(page, host, 'take me back to the homepage', '/');
  await expectNoNavigation(page, host, 'go to refunds', /I can open/i);

  const journey = await page.evaluate(() =>
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('voomate:v2:journey:'))
      .map((key) => JSON.parse(sessionStorage.getItem(key) ?? 'null')),
  );
  assert.ok(journey[0]?.conversationId, 'Landing conversation continuation was not persisted.');
  assert.ok(journey[0]?.continuationToken, 'Landing signed continuation was not persisted.');
  await assertHardReloadContinuation(page, host);
  await page.close();
}

async function testDashboard() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const host = await openWidget(page, dashboardOrigin);
  await host.evaluate((element) => {
    element.dataset.navigationSmokeIdentity = 'dashboard-preserved';
  });

  await expectNoNavigation(
    page,
    host,
    'What is this dashboard about and how do I use it?',
    /agent operating system|live operating overview|live Operating Panel/i,
  );
  await expectNavigation(page, host, 'take me to agnets pages', '/agents');
  await expectNavigation(page, host, 'open webagent', '/agents/web');
  await expectNavigation(page, host, 'open the web agent playgrond', '/agents/web/playground');
  await expectNavigation(page, host, 'take me to the phone agnet', '/agents/voice');
  await expectNavigation(page, host, 'visit approval qeuue', '/approvals');
  await expectNavigation(page, host, 'open audit trial', '/logs');
  await expectNavigation(page, host, 'go to workspace setings', '/settings');
  await expectNoNavigation(page, host, 'open agent', /Did you mean/i);
  await expectNoNavigation(page, host, 'take me to refunds', /I can open/i);
  await page.close();
}

async function testMobileLanding() {
  const page = await browser.newPage({ ...devices['iPhone 13'] });
  const host = await openWidget(page, landingOrigin);
  await host.evaluate((element) => {
    element.dataset.navigationSmokeIdentity = 'mobile-preserved';
  });
  await expectNavigation(page, host, 'can you take me to priing', '/pricing');
  const box = await host.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && viewport && box.width <= viewport.width && box.height <= viewport.height);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    0,
    'The mobile navigation flow introduced horizontal overflow.',
  );
  await page.close();
}

try {
  const [landingRouteCount, dashboardRouteCount] = await Promise.all([
    assertManifestRoutes(landingOrigin),
    assertManifestRoutes(dashboardOrigin),
  ]);
  await testLanding();
  await testDashboard();
  await testMobileLanding();
  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      landing: {
        currentDesign: true,
        informationalNoRedirect: true,
        typoNavigation: true,
        aliases: true,
        unknownFailClosed: true,
        fullPageConversationResumed: true,
        routeCount: landingRouteCount,
      },
      dashboard: {
        pageExplanation: true,
        typoNavigation: true,
        nestedFeatures: true,
        aliases: true,
        ambiguityFailClosed: true,
        unknownFailClosed: true,
        routeCount: dashboardRouteCount,
      },
      spaWidgetPreserved: true,
      mobile: true,
    })}\n`,
  );
} finally {
  await browser.close();
}
