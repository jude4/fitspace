import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRoom } from '../../src/domain/room';
import { products } from '../../src/domain/catalog';
import { createPlacement } from '../../src/domain/placements';
async function addSofa(page: Page) {
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add Arc sofa to room', exact: true })
    .click();
}
const analysis = (page: Page) =>
  page.getByRole('complementary', { name: 'Spatial analysis' });
test('findings and warning bounds update with placement edits and undo', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await addSofa(page);
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(
    analysis(page).locator('[data-code="within-boundary"]'),
  ).toContainText('sample/estimated boundary');
  await expect(analysis(page).getByTestId('spatial-warning-count')).toHaveText(
    '0',
  );
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await page.getByRole('button', { name: 'Duplicate object' }).click();
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(
    analysis(page).locator('[data-code="potential-overlap"]'),
  ).toBeVisible();
  const canvas = page.getByTestId('editor-viewport').locator('canvas');
  const warned = await canvas.screenshot();
  await page.getByLabel('Show spatial warning bounds').uncheck();
  await expect
    .poll(async () => Buffer.compare(warned, await canvas.screenshot()))
    .not.toBe(0);
  await page.getByLabel('Show spatial warning bounds').check();
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(
    analysis(page).locator('[data-code="potential-overlap"]'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo room edit' }).click();
  await expect(
    analysis(page).locator('[data-code="potential-overlap"]'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Select Arc sofa 2', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await page.getByLabel('Position X (m)', { exact: true }).fill('-0.1');
  await page.getByRole('button', { name: 'Apply furniture changes' }).click();
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(
    analysis(page).locator('[data-code="outside-room"]'),
  ).toBeVisible();
  await expect(
    analysis(page).locator('[data-code="wall-overlap"]'),
  ).toContainText('west');
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(1000);
  await page.screenshot({
    path: 'test-results/spatial-desktop.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('guidelines, doorway checks, comparisons, history and persisted settings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await addSofa(page);
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(analysis(page).getByTestId('doorway-result')).toHaveAttribute(
    'data-status',
    'requires-measurements',
  );
  await page
    .getByLabel('Walking clearance guideline (m)', { exact: true })
    .fill('1.2');
  await page.getByLabel('Clear doorway width (m)', { exact: true }).fill('1');
  await page
    .getByLabel('Clear doorway height (m)', { exact: true })
    .fill('2.1');
  await page.getByRole('button', { name: 'Apply spatial settings' }).click();
  await expect(analysis(page).getByTestId('doorway-result')).toHaveAttribute(
    'data-status',
    'candidate-orientation',
  );
  await expect(analysis(page).getByTestId('doorway-result')).toContainText(
    'delivery cannot be determined',
  );
  await expect(
    analysis(page).locator('[data-code="limited-clearance"]'),
  ).toBeVisible();
  const canvas = page.getByTestId('editor-viewport').locator('canvas');
  const withoutClearance = await canvas.screenshot();
  await page.getByLabel('Show selected clearance envelope').check();
  await expect
    .poll(async () =>
      Buffer.compare(withoutClearance, await canvas.screenshot()),
    )
    .not.toBe(0);
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(
    page.getByLabel('Walking clearance guideline (m)', { exact: true }),
  ).toHaveValue('0.8');
  await page.getByRole('button', { name: 'Redo room edit' }).click();
  await expect(
    page.getByLabel('Clear doorway width (m)', { exact: true }),
  ).toHaveValue('1');
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  await page.reload();
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(
    page.getByLabel('Walking clearance guideline (m)', { exact: true }),
  ).toHaveValue('1.2');
  await page.getByLabel('Clear doorway width (m)', { exact: true }).fill('0.7');
  await page.getByRole('button', { name: 'Apply spatial settings' }).click();
  await expect(analysis(page).getByTestId('doorway-result')).toHaveAttribute(
    'data-status',
    'no-simple-candidate',
  );
  await page.getByLabel('Clear doorway height (m)', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Apply spatial settings' }).click();
  await expect(analysis(page).getByTestId('doorway-result')).toHaveAttribute(
    'data-status',
    'requires-measurements',
  );
  await page
    .getByRole('button', { name: 'Preview Studio desk', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add Studio desk to room' }).click();
  const options = await page
    .getByLabel('Compare against', { exact: true })
    .locator('option')
    .allTextContents();
  expect(options.join(' ')).toContain('Arc sofa');
  await page
    .getByLabel('Compare against', { exact: true })
    .selectOption({ label: 'Arc sofa 1' });
  await expect(analysis(page).getByRole('table')).toContainText('width');
  await expect(analysis(page).getByRole('table')).toContainText('0.8 m');
});
test('schema-1 scenes migrate with a downloadable original backup', async ({
  page,
}) => {
  const room = createRoom(),
    p = createPlacement(products[0], room, 'legacy-sofa');
  p.position.x = 1.23456789;
  const raw = JSON.stringify({
    schemaVersion: 1,
    room,
    placements: [p],
    displayUnits: 'metric',
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem('fitspace.scene.v1'))
      localStorage.setItem('fitspace.scene.v1', value);
  }, raw);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await page
    .getByLabel('Walking clearance guideline (m)', { exact: true })
    .fill('0.5');
  await page.getByRole('button', { name: 'Apply spatial settings' }).click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const value = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fitspace.scene.v1')!),
  );
  expect(value.schemaVersion).toBe(2);
  expect(value.placements[0].position.x).toBe(1.23456789);
  expect(value.spatial.clearanceMeters).toBe(0.5);
  const wait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download pre-upgrade backup' })
    .click();
  const download = await wait;
  expect(await readFile((await download.path())!, 'utf8')).toBe(raw);
});
test('long reports retain all findings behind progressive disclosure', async ({
  page,
}) => {
  const room = createRoom();
  const raw = JSON.stringify({
    schemaVersion: 1,
    room,
    placements: Array.from({ length: 12 }, (_, i) =>
      createPlacement(products[0], room, `crowded-${i}`),
    ),
    displayUnits: 'metric',
  });
  await page.addInitScript(
    (value) => localStorage.setItem('fitspace.scene.v1', value),
    raw,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await page
    .getByRole('button', { name: 'Layout analysis', exact: true })
    .click();
  await expect(analysis(page).getByTestId('spatial-warning-count')).toHaveText(
    '66',
  );
  await expect(
    analysis(page).locator('[data-code="potential-overlap"]'),
  ).toHaveCount(60);
  await expect(analysis(page)).toContainText('Showing 60 of 78 findings');
  await page.getByRole('button', { name: 'Show more findings' }).click();
  await expect(
    analysis(page).locator('[data-code="potential-overlap"]'),
  ).toHaveCount(66);
  await expect(
    analysis(page).locator('[data-code="within-boundary"]'),
  ).toHaveCount(12);
  await expect(
    page.getByRole('button', { name: 'Show more findings' }),
  ).toHaveCount(0);
});
for (const width of [360, 768])
  test(`analysis is reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/workspace');
    await page.getByRole('button', { name: 'Analysis', exact: true }).click();
    await expect(
      analysis(page).getByRole('heading', { name: 'Layout analysis' }),
    ).toBeVisible();
    await page
      .getByLabel('Walking clearance guideline (m)', { exact: true })
      .fill('-1');
    await page.getByRole('button', { name: 'Apply spatial settings' }).click();
    await expect(analysis(page).getByRole('alert')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/spatial-${width}.png`,
      fullPage: true,
    });
  });
