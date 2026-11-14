import { test, expect } from '@playwright/test';
test('live 3D demo, material comparison, camera controls, and navigation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Know it fits.',
  );
  const scene = page.getByTestId('room-scene');
  await expect(scene).toHaveAttribute('data-ready', 'true');
  const canvas = scene.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: 'test-results/room-before.png' });
  const furnished = await canvas.screenshot();
  await page.getByRole('button', { name: 'Before', exact: true }).click();
  await expect(scene).toHaveAttribute('data-furnished', 'false');
  // Demand rendering needs a frame after the React commit, beyond the state attribute change.
  await expect
    .poll(async () => Buffer.compare(furnished, await canvas.screenshot()))
    .not.toBe(0);
  await page.getByRole('button', { name: 'After', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(scene).toHaveAttribute('data-furnished', 'true');
  await page
    .getByRole('button', { name: 'Earth & olive', exact: true })
    .click();
  await expect(scene).toHaveAttribute('data-palette', 'earthy');
  await expect
    .poll(async () => Buffer.compare(furnished, await canvas.screenshot()))
    .not.toBe(0);
  await page.getByRole('button', { name: 'Front camera view' }).click();
  await expect(
    page.getByRole('button', { name: 'Front camera view' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reset camera' }).click();
  await expect(
    page.getByRole('button', { name: 'Front camera view' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(scene).toHaveAttribute('data-ready', 'true');
  const beforeOrbit = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas has no visible bounds');
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 25,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Buffer.compare(beforeOrbit, await canvas.screenshot()))
    .not.toBe(0);
  await page.getByRole('button', { name: 'Reset camera' }).click();
  await page.getByRole('button', { name: 'Animate camera' }).click();
  await expect(scene).toHaveAttribute('data-motion', 'true');
  await page.getByRole('button', { name: 'Pause camera motion' }).click();
  await expect(scene).toHaveAttribute('data-motion', 'false');
  await page.screenshot({
    path: 'test-results/landing-desktop.png',
    fullPage: true,
  });
  await page
    .getByRole('link', { name: 'Start Designing', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/workspace');
  await expect(
    page.getByText('THE WORKSPACE · COMING IN PHASE 2'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const width of [360, 768, 1440])
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole('link', { name: 'Start Designing', exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
  });
test('reduced motion and concept selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('button', {
      name: 'Camera motion disabled by reduced-motion preference',
    }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'CONCEPT 03 Quiet contrast' }).click();
  await expect(page.getByTestId('room-scene')).toHaveAttribute(
    'data-palette',
    'contrast',
  );
  await expect(page.getByTestId('room-scene')).toHaveAttribute(
    'data-motion',
    'false',
  );
});
test('missing WebGL remains navigable', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'The room needs WebGL' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'For professionals', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/business');
  await expect(
    page.getByText('FOR PROFESSIONALS · PLANNED FOR PHASE 8'),
  ).toBeVisible();
});

test('WebGL context loss shows a recoverable fallback', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('room-scene')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas.dispatchEvent(new Event('webglcontextlost')),
    );
  await expect(
    page.getByRole('heading', { name: 'The room needs WebGL' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reload preview' }),
  ).toBeEnabled();
});
