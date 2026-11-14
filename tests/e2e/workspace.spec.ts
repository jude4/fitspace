import { test, expect } from '@playwright/test';

test('measured room edits, materials, selection, display, views and undo/redo', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  const viewport = page.getByTestId('editor-viewport');
  await expect(viewport).toHaveAttribute('data-ready', 'true');
  await expect(viewport).toHaveAttribute('data-width', '4');
  await expect(viewport).toHaveAttribute('data-depth', '5');
  await expect(viewport).toHaveAttribute('data-height', '2.7');
  await expect(page.getByText('Width · 4 m', { exact: true })).toBeVisible();
  const canvas = viewport.locator('canvas');
  const original = await canvas.screenshot();
  await page.getByLabel('width in meters', { exact: true }).fill('6.25');
  await page
    .getByRole('button', { name: 'Apply dimensions', exact: true })
    .click();
  await expect(viewport).toHaveAttribute('data-width', '6.25');
  await expect(page.getByText('Width · 6.25 m', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(viewport).toHaveAttribute('data-width', '4');
  await page.getByRole('button', { name: 'Redo room edit' }).click();
  await expect(viewport).toHaveAttribute('data-width', '6.25');
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await page
    .getByLabel('Wall & ceiling finish', { exact: true })
    .selectOption('sage');
  await page.getByLabel('Floor finish', { exact: true }).selectOption('walnut');
  await expect(viewport).toHaveAttribute('data-wall-material', 'sage');
  await expect
    .poll(async () => Buffer.compare(original, await canvas.screenshot()))
    .not.toBe(0);
  await page.getByRole('button', { name: 'North wall', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'North wall', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '2D overhead', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-view', 'overhead');
  await page
    .getByRole('button', { name: 'Dimension indicators', exact: true })
    .click();
  await expect(page.getByText('Width · 4 m', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Dimension indicators', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Measurement grid', exact: true })
    .click();
  await expect(viewport).toHaveAttribute('data-grid', 'false');
  // In a top-down view the room center is floor, verifying actual raycast selection.
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('No canvas bounds');
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(
    page.getByRole('heading', { name: 'Floor', exact: true }),
  ).toBeVisible();
  const beforeZoom = await canvas.screenshot();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(beforeZoom, await canvas.screenshot()))
    .not.toBe(0);
  const beforePan = await canvas.screenshot();
  await page.getByRole('button', { name: 'Pan right', exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(beforePan, await canvas.screenshot()))
    .not.toBe(0);
  await page
    .getByRole('button', { name: 'Frame room and reset camera' })
    .click();
  await expect(viewport).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Show ceiling', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Hide ceiling', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hide ceiling', exact: true }).click();
  await page.getByRole('button', { name: 'All walls', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Hide east wall', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'All walls', exact: true }).click();
  await page.screenshot({
    path: 'test-results/workspace-overhead.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: '3D perspective', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show north wall', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show west wall', exact: true })
    .click();
  await page.screenshot({
    path: 'test-results/workspace-desktop.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('imperial input, no display drift, invalid values, presets and shortcut history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  const viewport = page.getByTestId('editor-viewport');
  await page.getByLabel('width in meters', { exact: true }).fill('4.123456789');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'ft / in', exact: true }).click();
    await page.getByRole('button', { name: 'Apply dimensions' }).click();
    await page.getByRole('button', { name: 'm', exact: true }).click();
  }
  await expect(viewport).toHaveAttribute('data-width', '4.123456789');
  await page.getByRole('button', { name: 'ft / in', exact: true }).click();
  await page.getByLabel('width feet', { exact: true }).fill('12');
  await page.getByLabel('width inches', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(viewport).toHaveAttribute('data-width', '3.81');
  await page.getByLabel('width inches', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(
    page
      .getByRole('complementary', { name: 'Room properties' })
      .getByRole('alert'),
  ).toContainText('inches from 0');
  await expect(viewport).toHaveAttribute('data-width', '3.81');
  await page.getByRole('button', { name: 'm', exact: true }).click();
  await page.getByLabel('width in meters', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(
    page
      .getByRole('complementary', { name: 'Room properties' })
      .getByRole('alert'),
  ).toContainText('between 1 and 30');
  await expect(viewport).toHaveAttribute('data-width', '3.81');
  await page
    .getByLabel('Room template', { exact: true })
    .selectOption('studio');
  await page.getByRole('button', { name: 'Create empty room' }).click();
  await expect(viewport).toHaveAttribute('data-width', '3');
  await page.getByRole('button', { name: 'Create empty room' }).focus();
  await page.keyboard.press('Control+z');
  await expect(viewport).toHaveAttribute('data-width', '3.81');
  await page.keyboard.press('Control+Shift+z');
  await expect(viewport).toHaveAttribute('data-width', '3');
});

for (const width of [360, 768, 1440])
  test(`workspace fits ${width}px and exposes both panels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/workspace');
    const viewport = page.getByTestId('editor-viewport');
    await expect(viewport).toHaveAttribute('data-ready', 'true');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByLabel('width in meters', { exact: true }),
    ).toBeVisible();
    if (width < 1231) {
      await page
        .getByRole('button', { name: 'Room & scene', exact: true })
        .click();
      await expect(
        page.getByLabel('Room template', { exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Properties', exact: true })
        .click();
    }
    await expect(
      page.getByLabel('height in meters', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/workspace-${width}.png`,
      fullPage: true,
    });
  });

test('numeric editing works without WebGL and survives a graphics retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(
    page.getByRole('heading', { name: 'Preview unavailable' }),
  ).toBeVisible();
  await page.getByLabel('width in meters', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await page.getByRole('button', { name: 'Retry 3D preview' }).click();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '7',
  );
});

test('room bounds at supported size extremes reframe without graphics errors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  const viewport = page.getByTestId('editor-viewport');
  await expect(viewport).toHaveAttribute('data-ready', 'true');
  for (const [width, depth, height] of [
    ['1', '1', '1.8'],
    ['30', '30', '6'],
  ]) {
    await page.getByLabel('width in meters', { exact: true }).fill(width);
    await page.getByLabel('depth in meters', { exact: true }).fill(depth);
    await page.getByLabel('height in meters', { exact: true }).fill(height);
    await page.getByRole('button', { name: 'Apply dimensions' }).click();
    await expect(viewport).toHaveAttribute('data-width', width);
    await expect(viewport).toHaveAttribute('data-height', height);
    await page
      .getByRole('button', { name: '2D overhead', exact: true })
      .click();
    await expect(
      page.getByText(`Width · ${width} m`, { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/workspace-size-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: '3D perspective', exact: true })
      .click();
  }
  await expect(viewport).toHaveAttribute('data-ready', 'true');
});

test('graphics context loss can retry without discarding the measured room', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  const viewport = page.getByTestId('editor-viewport');
  await expect(viewport).toHaveAttribute('data-ready', 'true');
  await page.getByLabel('width in meters', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await viewport
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext(),
    );
  await expect(
    page.getByRole('heading', { name: 'Preview unavailable' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry 3D preview' }).click();
  await expect(viewport).toHaveAttribute('data-ready', 'true');
  await expect(viewport).toHaveAttribute('data-width', '6');
  await expect(page.getByText('Width · 6 m', { exact: true })).toBeVisible();
});
