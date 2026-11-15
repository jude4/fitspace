import { test, expect } from '@playwright/test';
import { uploadReference } from '../helpers/photo';
test('private photo calibration updates estimates, geometry, history and local recovery', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/workspace');
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await uploadReference(page);
  await page.screenshot({ path: testInfo.outputPath('photo-desktop.png') });
  await expect(page.getByTestId('photo-estimate')).toContainText(
    'Approximate width: 4 m',
  );
  await page.getByLabel('Known reference length (meters)').fill('3');
  await expect(page.getByTestId('photo-estimate')).toContainText(
    'Approximate width: 6 m',
  );
  await page.getByLabel('Marker 4 X percent').fill('50');
  await expect(page.getByTestId('photo-estimate')).toContainText(
    'Approximate width: 4 m',
  );
  await page.getByLabel('Known reference length (meters)').fill('4.5');
  await page.getByRole('button', { name: 'Apply approximate width' }).click();
  await expect(
    page.getByText('Approximate width applied.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Return to room', exact: true })
    .click();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6',
  );
  await expect(
    page.getByText('Photo estimate · uncertainty unknown · 6 m', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo room edit' }).click();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '4',
  );
  await page.getByRole('button', { name: 'Redo room edit' }).click();
  await expect(page.getByTestId('save-status')).toContainText(
    'Saved on this device',
  );
  const raw = await page.evaluate(() =>
    localStorage.getItem('fitspace.scene.v1')!,
  );
  expect(JSON.parse(raw).room.dimensions.width).toEqual({
    meters: 6,
    source: 'image_estimated',
  });
  expect(raw).not.toContain('blob:');
  expect(raw).not.toContain('data:image');
  await page.reload();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-width',
    '6',
  );
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await expect(page.getByAltText('Your private room reference')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('photo review rejects disguised, oversized, corrupt and extreme-pixel uploads without losing a valid photo', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await uploadReference(page);
  const input = page.getByLabel('Choose room photo');
  await input.setInputFiles({
    name: 'unsafe.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    ),
  });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Invalid or unsupported photo',
  );
  await expect(page.getByAltText('Your private room reference')).toBeVisible();
  await input.setInputFiles({
    name: 'large.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '8 MiB',
  );
  const header = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
  header.writeUInt32BE(13, 8);
  header.writeUInt32BE(0x49484452, 12);
  header.writeUInt32BE(9000, 16);
  header.writeUInt32BE(100, 20);
  await input.setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: header,
  });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '8192 pixels',
  );
  header.writeUInt32BE(100, 16);
  await input.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: header,
  });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'could not be decoded',
  );
  await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  await expect(page.getByAltText('Your private room reference')).toHaveCount(0);
});
test('mobile calibration is reachable and AR fallback keeps the sample preview usable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Room & scene', exact: true }).click();
  await page
    .getByRole('button', { name: 'Photo reference & calibration' })
    .click();
  await uploadReference(page);
  await page.screenshot({ path: testInfo.outputPath('photo-mobile.png') });
  expect(
    await page
      .getByRole('dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Return to room', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Augmented reality preview' }),
  ).toContainText('AR is unavailable');
  await expect(
    page.getByRole('button', { name: 'Try AR at sample scale' }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Add Arc sofa to room', exact: true })
    .click();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute(
    'data-placement-count',
    '1',
  );
});
test('AR permission denial offers retry without losing the product preview', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'xr', {
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
    }),
  );
  await page.goto('/workspace');
  await page
    .getByRole('button', { name: 'Preview Arc sofa', exact: true })
    .click();
  const button = page.getByRole('button', { name: 'Try AR at sample scale' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(
    page.getByRole('region', { name: 'Augmented reality preview' }),
  ).toContainText('AR permission was denied');
  await expect(button).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Add Arc sofa to room', exact: true }),
  ).toBeVisible();
});
