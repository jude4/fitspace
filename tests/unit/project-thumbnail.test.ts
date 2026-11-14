import { it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { createRoom } from '@/domain/room';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { createPlacement } from '@/domain/placements';
import { products } from '@/domain/catalog';
import { planThumbnail } from '@/features/projects/thumbnail';
it('creates a bounded PNG plan preview whose pixels change with actual scene contents', () => {
  const room = createRoom(),
    doc = parseScene(serializeScene({ room, placements: [] }, 'metric'));
  const blank = planThumbnail(doc);
  expect([...blank.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(blank.readUInt32BE(16)).toBe(320);
  expect(blank.readUInt32BE(20)).toBe(240);
  doc.placements = [createPlacement(products[0], room, 'sofa')];
  const furnished = planThumbnail(doc);
  expect(furnished.equals(blank)).toBe(false);
  expect(furnished.length).toBeLessThan(524288);
  let offset = 8;
  const data = [];
  while (offset < furnished.length) {
    const length = furnished.readUInt32BE(offset);
    if (furnished.subarray(offset + 4, offset + 8).toString() === 'IDAT')
      data.push(furnished.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  expect(inflateSync(Buffer.concat(data)).length).toBe((320 * 3 + 1) * 240);
});
