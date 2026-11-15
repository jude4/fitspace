import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type APIRequestContext,
} from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { uploadReference } from '../helpers/photo';
const enabled = process.env.FITSPACE_SUPABASE_E2E === '1';
test('photo-calibrated dimensions retain provenance through cloud save and reload while photos stay private', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const id = await createProject(page, 'Photo estimate room');
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await uploadReference(page);
  await page.getByLabel('Known reference length (meters)').fill('3');
  await page.getByRole('button', { name: 'Apply approximate width' }).click();
  await page
    .getByRole('button', { name: 'Return to room', exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6',
  );
  await expect(
    page.getByText('Photo estimate · uncertainty unknown'),
  ).toBeVisible();
  const record = await page.request.get(`/api/projects/${id}`);
  expect(record.ok()).toBe(true);
  const raw = await record.text();
  expect(raw).toContain('image_estimated');
  expect(raw).not.toContain('blob:');
  expect(raw).not.toContain('data:image');
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await expect(page.getByAltText('Your private room reference')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Return to room', exact: true })
    .click();
  await page.goto('/workspace');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '4',
  );
});
test.skip(
  !enabled,
  'Enable FITSPACE_SUPABASE_E2E=1 with the real local Supabase stack.',
);
async function codeFor(request: APIRequestContext, email: string) {
  let code = '';
  await expect
    .poll(
      async () => {
        const found = await request.get(
          `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:' + email)}`,
        );
        if (!found.ok()) return '';
        const list = await found.json();
        const id = list.messages?.[0]?.ID;
        if (!id) return '';
        const mail = await (
          await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`)
        ).json();
        code = (mail.Text + ' ' + mail.HTML).match(/\b\d{6}\b/)?.[0] ?? '';
        return code;
      },
      { timeout: 20000 },
    )
    .toMatch(/^\d{6}$/);
  return code;
}
async function signIn(
  page: Page,
  email = `fitspace-browser-${crypto.randomUUID()}@example.test`,
) {
  await page.goto('/projects');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page
    .getByRole('button', { name: 'Send sign-in code', exact: true })
    .click();
  await expect(page.getByLabel('Six-digit email code')).toBeVisible();
  await page
    .getByLabel('Six-digit email code')
    .fill(await codeFor(page.request, email));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(
    page.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
  return email;
}
async function createProject(page: Page, name = 'Browser room') {
  await page.getByLabel('Project name', { exact: true }).fill(name);
  await page
    .getByRole('button', { name: 'Create empty project', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace\/[a-f0-9-]{36}$/);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await expect(page.getByTestId('cloud-save-message')).toContainText('loaded');
  return page.url().split('/').pop()!;
}
async function width(page: Page, value: string) {
  await page.getByLabel('width in meters', { exact: true }).fill(value);
  await page
    .getByRole('button', { name: 'Apply dimensions', exact: true })
    .click();
}
async function saved(page: Page) {
  await expect(page.getByTestId('save-status')).toContainText('Saved to cloud');
  await expect(page.getByTestId('cloud-save-message')).toContainText(
    'Saved to cloud',
    { timeout: 20000 },
  );
}
async function explicitRequest(
  context: BrowserContext,
  path: string,
  method: string,
  data?: unknown,
) {
  return context.request.fetch(path, {
    method,
    headers: {
      Origin: 'http://127.0.0.1:3000',
      'Content-Type': 'application/json',
    },
    data,
  });
}

test('guest import, real passwordless auth, save/relogin, independent duplicate, rename and delete', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add Arc sofa to room', exact: true })
    .click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const guest = await page.evaluate(() =>
    localStorage.getItem('fitspace.scene.v1'),
  );
  const email = await signIn(page);
  const cookies = (await page.context().cookies()).filter((cookie) =>
    cookie.name.startsWith('sb-'),
  );
  expect(cookies.length).toBeGreaterThan(0);
  const crossSite = await page.request.post('/api/auth', {
    headers: { Origin: 'https://unrelated.example' },
    data: { action: 'logout' },
  });
  expect(crossSite.status()).toBe(403);
  expect(
    cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === 'Lax'),
  ).toBe(true);
  await page
    .getByLabel('Project name', { exact: true })
    .fill('Imported living room');
  await page
    .getByRole('button', { name: 'Import guest design', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace\/[a-f0-9-]{36}$/);
  const id = page.url().split('/').pop()!;
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
  await width(page, '6.75');
  await saved(page);
  expect(
    await page.evaluate(() => localStorage.getItem('fitspace.scene.v1')),
  ).toBe(guest);
  const original = await (await page.request.get(`/api/projects/${id}`)).json();
  await page.reload();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6.75',
  );
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Imported living room', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in or create an account' }),
  ).toBeVisible();
  await signIn(page, email);
  const card = page.locator('.project-card').filter({
    has: page.getByRole('link', {
      name: 'Imported living room',
      exact: true,
    }),
  });
  await card.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/[a-f0-9-]{36}$/);
  const copyId = page.url().split('/').pop()!;
  expect(copyId).not.toBe(id);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6.75',
  );
  const copy = await (await page.request.get(`/api/projects/${copyId}`)).json();
  expect(copy.current_scene.room.id).not.toBe(original.current_scene.room.id);
  expect(copy.current_scene.placements[0].id).not.toBe(
    original.current_scene.placements[0].id,
  );
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  const copyCard = page.locator('.project-card').filter({
    has: page.getByRole('link', {
      name: 'Imported living room copy',
      exact: true,
    }),
  });
  page.once('dialog', (dialog) => dialog.accept('Renamed independent room'));
  await copyCard.getByRole('button', { name: 'Rename', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Renamed independent room', exact: true }),
  ).toBeVisible();
  const renamed = page.locator('.project-card').filter({
    has: page.getByRole('link', {
      name: 'Renamed independent room',
      exact: true,
    }),
  });
  page.once('dialog', (dialog) => dialog.accept());
  await renamed.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Renamed independent room', exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get(`/api/projects/${copyId}`)).status()).toBe(
    404,
  );
  expect(
    (await page.request.get(`/api/projects/${id}/thumbnail`)).status(),
  ).toBe(200);
  await page.screenshot({
    path: 'test-results/cloud-projects.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('two-tab conflicts, explicit reload and lost acknowledgements preserve edits and revisions', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const email = await signIn(page);
  const id = await createProject(page, 'Conflict room');
  const second = await context.newPage();
  await second.setViewportSize({ width: 1440, height: 1000 });
  await second.goto(`/workspace/${id}`);
  await expect(second.getByTestId('editor-viewport')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await width(page, '7');
  await saved(page);
  await width(second, '8');
  await expect(second.getByTestId('cloud-save-message')).toContainText(
    'newer cloud revision',
  );
  await expect(second.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '8',
  );
  const downloadEvent = second.waitForEvent('download');
  await second
    .getByRole('button', { name: 'Export current scene', exact: true })
    .click();
  const backup = await downloadEvent;
  expect(
    JSON.parse(await readFile((await backup.path())!, 'utf8')).room.dimensions
      .width.meters,
  ).toBe(8);
  second.once('dialog', (dialog) => dialog.accept());
  await second
    .getByRole('button', { name: 'Reload cloud copy', exact: true })
    .click();
  await expect(second.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '7',
  );
  await second.route(`**/api/projects/${id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await width(second, '9');
  await expect(
    second.getByRole('button', { name: 'Retry cloud save', exact: true }),
  ).toBeVisible();
  await expect(second.getByTestId('save-status')).not.toContainText(
    'Saved to cloud',
  );
  const committed = await (
    await page.request.get(`/api/projects/${id}`)
  ).json();
  expect(committed.current_revision).toBe(3);
  await second.unroute(`**/api/projects/${id}`);
  await second
    .getByRole('button', { name: 'Retry cloud save', exact: true })
    .click();
  await saved(second);
  expect(
    (await (await page.request.get(`/api/projects/${id}`)).json())
      .current_revision,
  ).toBe(3);
  await second.screenshot({
    path: 'test-results/cloud-workspace.png',
    fullPage: true,
  });
  await context.clearCookies();
  await width(second, '10');
  await expect(second.getByTestId('cloud-save-message')).toContainText(
    'Sign in again',
  );
  await signIn(page, email);
  await saved(second);
  await expect(second.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '10',
  );
  await width(second, '11');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(second).toHaveURL(/\/projects$/);
  await expect(
    second.getByRole('heading', { name: 'Sign in or create an account' }),
  ).toBeVisible();
  await second.close();
});

test('shared snapshots are immutable, read-only, private and revocable', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const id = await createProject(page, 'Share room');
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add Arc sofa to room', exact: true })
    .click();
  await page.getByRole('button', { name: 'Floor', exact: true }).click();
  await width(page, '7');
  await saved(page);
  await page
    .getByRole('button', { name: 'Create snapshot link', exact: true })
    .click();
  const link = page.getByLabel('Copy this link now');
  await expect(link).toHaveValue(/\/share#[A-Za-z0-9_-]{43}$/);
  const url = await link.inputValue();
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const viewer = await anonymous.newPage();
  await viewer.goto(url);
  await expect(viewer.getByText('width: 7 m', { exact: false })).toBeVisible();
  await expect(viewer.locator('canvas')).toBeVisible();
  await expect(viewer.getByText('Arc sofa', { exact: true })).toBeVisible();
  const preview = viewer.locator('canvas');
  const beforePan = await preview.screenshot();
  await preview.focus();
  await viewer.keyboard.press('ArrowRight');
  await expect
    .poll(async () => Buffer.compare(beforePan, await preview.screenshot()))
    .not.toBe(0);
  await viewer
    .getByRole('button', { name: 'Reset shared view', exact: true })
    .click();
  expect(await viewer.locator('input,select,textarea').count()).toBe(0);
  expect((await viewer.request.get(`/api/projects/${id}`)).status()).toBe(401);
  await viewer.screenshot({
    path: 'test-results/shared-snapshot.png',
    fullPage: true,
  });
  await width(page, '9');
  await saved(page);
  await viewer.reload();
  await expect(viewer.getByText('width: 7 m', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Revoke revision \d+ link/ }).click();
  await viewer.reload();
  await expect(viewer.locator('.shared-page').getByRole('alert')).toContainText(
    'unavailable',
  );
  const attempt = await explicitRequest(
    anonymous,
    `http://127.0.0.1:3000/api/projects/${id}`,
    'PATCH',
    { expectedRevision: 3, requestId: crypto.randomUUID() },
  );
  expect(attempt.status()).toBe(401);
  await anonymous.close();
});

test('another owner cannot load, mutate or enumerate private project data', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const id = await createProject(page, 'Private owner room');
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect(
    (
      await other.request.get(`http://127.0.0.1:3000/api/projects/${id}`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.request.get(`http://127.0.0.1:3000/api/projects/${id}/shares`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.request.get(
        `http://127.0.0.1:3000/api/projects/${id}/thumbnail`,
      )
    ).status(),
  ).toBe(404);
  const mutation = await explicitRequest(
    other,
    `http://127.0.0.1:3000/api/projects/${id}`,
    'PATCH',
    {
      expectedRevision: 1,
      title: 'Stolen room',
      requestId: crypto.randomUUID(),
    },
  );
  expect(mutation.status()).toBe(404);
  expect(
    (
      await (
        await other.request.get('http://127.0.0.1:3000/api/projects')
      ).json()
    ).projects,
  ).toEqual([]);
  await other.close();
});

test('cloud account controls remain usable at 360px and reject invalid codes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/projects');
  const email = `fitspace-mobile-${crypto.randomUUID()}@example.test`;
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page
    .getByRole('button', { name: 'Send sign-in code', exact: true })
    .click();
  await page.getByLabel('Six-digit email code').fill('000000');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.locator('.account-form').getByRole('alert')).toContainText(
    'invalid or expired',
  );
  await page
    .getByLabel('Six-digit email code')
    .fill(await codeFor(page.request, email));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(
    page.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await createProject(page, 'Mobile room');
  await page
    .getByRole('button', { name: 'Create snapshot link', exact: true })
    .click();
  await expect(page.getByLabel('Copy this link now')).toHaveValue(/\/share#/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: 'test-results/cloud-mobile.png',
    fullPage: true,
  });
});
