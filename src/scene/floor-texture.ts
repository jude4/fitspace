import {
  DataTexture,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
} from 'three';
import type { FloorMaterialId } from '@/domain/room';
/** Original deterministic grain/tile texture. Repeat distance is two meters. */
export function createFloorTexture(
  material: FloorMaterialId,
  width: number,
  depth: number,
) {
  const resolution = 128,
    pixels = new Uint8Array(resolution * resolution * 4);
  const wood = material === 'oak' || material === 'walnut';
  for (let y = 0; y < resolution; y++)
    for (let x = 0; x < resolution; x++) {
      const noise =
        ((Math.imul(x + 17, 374761393) ^ Math.imul(y + 11, 668265263)) >>> 0) %
        29;
      const seam = wood
        ? x % 16 === 0
        : material === 'stone' && (x === 0 || y === 0);
      const grain = wood
        ? Math.sin(y * 0.55 + Math.sin(x * 0.31) * 3) * 7
        : Math.sin(x * 0.8 + y * 0.6) * 2;
      const value = Math.max(
        0,
        Math.min(255, Math.round(seam ? 175 : 233 + grain - noise * 0.5)),
      );
      const offset = (y * resolution + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  const texture = new DataTexture(pixels, resolution, resolution, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(width / 2, depth / 2);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
