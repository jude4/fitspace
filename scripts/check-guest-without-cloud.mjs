import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const port = process.env.FITSPACE_GUEST_TEST_PORT ?? '3002',
  origin = `http://127.0.0.1:${port}`;
try {
  await fetch(origin, { signal: AbortSignal.timeout(500) });
  throw new Error(
    'The guest-test port is already occupied. Choose FITSPACE_GUEST_TEST_PORT.',
  );
} catch (e) {
  if (e.message?.includes('occupied')) throw e;
}
const server = spawn(
  'node_modules/.bin/next',
  ['start', '--hostname', '127.0.0.1', '--port', port],
  {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' },
  },
);
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) {
    if (server.exitCode !== null)
      throw new Error('The isolated test server exited.');
    try {
      if ((await fetch(origin + '/api/auth')).ok) break;
    } catch {
      // The owned server may not have bound its port yet.
    }
    if (Date.now() > deadline)
      throw new Error('The isolated test server did not start.');
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.deepEqual(await (await fetch(origin + '/api/auth')).json(), {
    configured: false,
    user: null,
  });
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  // The non-GPU path still has to support real canonical edits and local saving.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2' || type === 'webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto(origin + '/projects');
  await page
    .getByRole('heading', { name: 'Cloud projects aren’t enabled here' })
    .waitFor();
  await page.goto(origin + '/workspace');
  await page.getByLabel('width in meters', { exact: true }).fill('5.5');
  await page
    .getByRole('button', { name: 'Apply dimensions', exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="editor-viewport"]')
        ?.getAttribute('data-width') === '5.5',
  );
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="save-status"]')
      ?.textContent?.includes('Saved on this device'),
  );
  await page.setViewportSize({ width: 360, height: 900 });
  assert.equal(
    await page.getByRole('link', { name: 'Projects', exact: true }).isVisible(),
    true,
  );
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= 360),
  );
  assert.equal((await fetch(origin + '/api/projects')).status, 503);
  console.log(
    'No-cloud-config check passed: account availability, real guest edits/local saving, graphics fallback, and private API unavailability.',
  );
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // The owned process group may already have exited.
  }
}
