import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const scene = async (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('fitspace.scene.v1') ?? 'null'),
  );
async function add(page: Page, name: string) {
  await page
    .getByRole('button', { name: `Preview ${name}`, exact: true })
    .click();
  await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: `Add ${name} to room`, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('catalog filters, live preview, placement, transforms, variants, duplicate, delete and reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  await page.getByLabel('Search furniture', { exact: true }).fill('sofa');
  await expect(
    page.getByRole('button', { name: 'Preview Arc sofa', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Preview Studio desk', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Furniture category').selectOption('Appliances');
  await expect(
    page.getByText('No sample concepts match these filters.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Search furniture', { exact: true }).fill('');
  await page.getByLabel('Furniture category').selectOption('All');
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Arc sofa', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.screenshot({ path: 'test-results/product-preview.png' });
  await dialog
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext(),
    );
  await expect(
    dialog.getByText(/The 3D preview lost its graphics context/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close product details' }).click();
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  await expect(dialog.locator('canvas')).toBeVisible();
  await page
    .getByRole('button', { name: 'Add Arc sofa to room', exact: true })
    .click();
  const viewport = page.getByTestId('editor-viewport');
  await expect(viewport).toHaveAttribute('data-placement-count', '1');
  await expect(
    page.getByRole('heading', { name: 'Arc sofa', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Position X (m)', { exact: true }).fill('1.5');
  await page.getByLabel('Rotation (degrees)', { exact: true }).fill('90');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await page.getByLabel('Material variant').selectOption('olive');
  await expect
    .poll(async () => {
      const s = await scene(page);
      return s?.placements[0]?.position.x;
    })
    .toBe(1.5);
  const p = (await scene(page)).placements[0];
  expect(p.rotationYRadians).toBeCloseTo(Math.PI / 2, 8);
  expect(p.materialVariantId).toBe('olive');
  expect(p.dimensions.width.meters).toBe(2.2);
  await expect(
    page.getByLabel('Adjustable width (m)', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Duplicate object' }).click();
  await expect(viewport).toHaveAttribute('data-placement-count', '2');
  await page.getByRole('button', { name: 'Delete object' }).click();
  await expect(viewport).toHaveAttribute('data-placement-count', '1');
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(viewport).toHaveAttribute('data-placement-count', '2');
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const before = await scene(page);
  await page.reload();
  await expect(viewport).toHaveAttribute('data-placement-count', '2');
  expect((await scene(page)).placements).toEqual(before.placements);
  await page
    .getByRole('button', { name: 'Select Arc sofa 1', exact: true })
    .click();
  await page.screenshot({
    path: 'test-results/furniture-workspace.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('adjustable concepts, exact numeric edits, wall alignment and one drag per undo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await add(page, 'Studio desk');
  await page.getByLabel('Adjustable width (m)', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await expect
    .poll(
      async () => (await scene(page))?.placements[0]?.dimensions.width.meters,
    )
    .toBe(2);
  await page.getByLabel('Adjustable width (m)', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await expect(
    page
      .getByRole('complementary', { name: 'Furniture properties' })
      .getByRole('alert'),
  ).toContainText('adjustable range');
  await page.getByLabel('Adjustable width (m)', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await page.getByLabel('Align to room wall').selectOption('west');
  await page.getByRole('button', { name: 'Snap selected to wall' }).click();
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .toBe(1);
  await page.getByLabel('Position X (m)', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await page.getByLabel('Snap dragging to 0.1 m grid').check();
  await page.getByRole('button', { name: '2D overhead', exact: true }).click();
  const canvas = page.getByTestId('editor-viewport').locator('canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing canvas');
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 25,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .not.toBe(2);
  const after = (await scene(page)).placements[0].position;
  expect(after.x * 10).toBeCloseTo(Math.round(after.x * 10), 6);
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .toBe(2);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
  await page.getByRole('button', { name: 'Redo room edit' }).click();
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position)
    .toEqual(after);
});

test('all nine sample categories add supported original assets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  for (const name of [
    'Arc sofa',
    'Outline lounge chair',
    'Pebble coffee table',
    'Platform bed',
    'Frame cabinet',
    'Open shelf',
    'Studio desk',
    'Stem floor lamp',
    'Compact refrigerator',
  ])
    await add(page, name);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '9',
  );
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  expect((await scene(page)).placements).toHaveLength(9);
});

test('corrupt/future scene recovery never overwrites data without explicit replacement', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('fitspace.scene.v1', '{"schemaVersion":999}'),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(
    page.getByText(/Existing saved data will not be overwritten/),
  ).toBeVisible();
  await page.getByLabel('width in meters', { exact: true }).fill('6');
  await page
    .getByRole('button', { name: 'Apply dimensions', exact: true })
    .click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Not saved locally',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('fitspace.scene.v1')),
  ).toBe('{"schemaVersion":999}');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download saved data' }).click();
  const download = await downloadPromise;
  expect(await readFile((await download.path())!, 'utf8')).toBe(
    '{"schemaVersion":999}',
  );
  await page
    .getByRole('button', { name: 'Replace saved data with this scene' })
    .click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  expect((await scene(page)).room.dimensions.width.meters).toBe(6);
});

test('quota failure retains memory and supports an exported backup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fitspace.scene.v1')
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(page.getByText(/Local save failed/)).toBeVisible();
  await add(page, 'Arc sofa');
  await expect(page.getByTestId('save-status')).toContainText(
    'Not saved locally',
  );
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export scene', exact: true }).click();
  const download = await wait;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.placements).toHaveLength(1);
  expect(backup.placements[0].productId).toBe('arc-sofa');
});

test('scene import validates before replacing and is undoable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await add(page, 'Arc sofa');
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const backup = await scene(page);
  backup.placements[0].position.x = 1.23456789;
  await page.getByLabel('Import scene file', { exact: true }).setInputFiles({
    name: 'scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .toBe(1.23456789);
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .toBe(2);
  await page.getByLabel('Import scene file', { exact: true }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(
    page.getByText(
      'This scene file is invalid or incompatible. The current design was not changed.',
    ),
  ).toBeVisible();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
});

test('mobile catalog, preview and furniture inspector remain reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Room & scene', exact: true }).click();
  await add(page, 'Arc sofa');
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(
    page.getByLabel('Position X (m)', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: 'test-results/furniture-mobile.png',
    fullPage: true,
  });
});

test('catalog drop projects onto the floor and adds one undoable object', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByRole('button', { name: '2D overhead', exact: true }).click();
  const data = await page.evaluateHandle(() => new DataTransfer());
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .dispatchEvent('dragstart', { dataTransfer: data });
  const canvas = page.getByTestId('editor-viewport').locator('canvas'),
    bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing canvas');
  await canvas.dispatchEvent('drop', {
    dataTransfer: data,
    clientX: bounds.x + bounds.width / 2 + 40,
    clientY: bounds.y + bounds.height / 2,
  });
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
  await expect
    .poll(async () => (await scene(page))?.placements[0]?.position.x)
    .not.toBe(2);
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '0',
  );
});

test('another tab blocks automatic overwrites until explicitly reloaded', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const other = await page.context().newPage();
  await other.setViewportSize({ width: 1440, height: 1000 });
  await other.goto('/workspace');
  await expect(other.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  await page.getByLabel('width in meters', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  await expect(other.getByText(/Another tab changed/)).toBeVisible();
  await expect(other.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '4',
  );
  await other
    .getByRole('button', { name: 'Retry / reload saved scene' })
    .click();
  await expect(other.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6',
  );
  await other.close();
});
