import { it, expect } from 'vitest';
import { createFloorTexture } from '@/scene/floor-texture';
it('gives floors distinct original patterns at a consistent two-meter repeat scale', () => {
  const wood = createFloorTexture('oak', 4, 5),
    stone = createFloorTexture('stone', 4, 5),
    larger = createFloorTexture('oak', 8, 10);
  expect(wood.image.width).toBe(128);
  expect(wood.image.height).toBe(128);
  expect(wood.repeat.toArray()).toEqual([2, 2.5]);
  expect(larger.repeat.toArray()).toEqual([4, 5]);
  expect(wood.image.data).toEqual(larger.image.data);
  expect(wood.image.data).not.toEqual(stone.image.data);
  [wood, stone, larger].forEach((texture) => texture.dispose());
});
