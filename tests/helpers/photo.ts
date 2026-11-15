import { expect, type Page } from '@playwright/test';
export async function uploadReference(page: Page) {
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c8bda5';
    ctx.fillRect(0, 0, 1000, 600);
    ctx.fillStyle = '#6b785f';
    ctx.fillRect(100, 100, 700, 300);
    return Array.from(
      Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), (c) =>
        c.charCodeAt(0),
      ),
    );
  });
  await page.getByLabel('Choose room photo').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByAltText('Your private room reference')).toBeVisible();
}
