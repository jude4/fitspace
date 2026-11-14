import { deflateSync } from 'node:zlib';
import type { SceneDocument } from '@/domain/scene-document';
import { corners, rectangleFor } from '@/domain/spatial-geometry';
// Original plan preview, generated from validated numeric scene data. No uploaded image decoder.
export function planThumbnail(scene: SceneDocument) {
  const width = 320,
    height = 240,
    pixels = Buffer.alloc(width * height * 3, 244),
    scale = Math.min(
      280 / scene.room.dimensions.width.meters,
      200 / scene.room.dimensions.depth.meters,
    ),
    ox = (width - scene.room.dimensions.width.meters * scale) / 2,
    oz = (height - scene.room.dimensions.depth.meters * scale) / 2;
  const paint = (x: number, y: number, color: number[]) => {
    if (x >= 0 && x < width && y >= 0 && y < height)
      for (let k = 0; k < 3; k++) pixels[(y * width + x) * 3 + k] = color[k];
  };
  for (
    let y = Math.ceil(oz);
    y < oz + scene.room.dimensions.depth.meters * scale;
    y++
  )
    for (
      let x = Math.ceil(ox);
      x < ox + scene.room.dimensions.width.meters * scale;
      x++
    )
      paint(x, y, [218, 206, 184]);
  for (const p of scene.placements) {
    const points = corners(rectangleFor(p)).map((v) => ({
      x: ox + v.x * scale,
      z: oz + v.z * scale,
    }));
    for (
      let y = Math.max(0, Math.floor(Math.min(...points.map((v) => v.z))));
      y < Math.min(height, Math.ceil(Math.max(...points.map((v) => v.z))));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(Math.min(...points.map((v) => v.x))));
        x < Math.min(width, Math.ceil(Math.max(...points.map((v) => v.x))));
        x++
      ) {
        let inside = false;
        for (let i = 0, j = 3; i < 4; j = i++) {
          const a = points[i],
            b = points[j];
          if (
            a.z > y !== b.z > y &&
            x < ((b.x - a.x) * (y - a.z)) / (b.z - a.z) + a.x
          )
            inside = !inside;
        }
        if (inside) paint(x, y, [103, 119, 86]);
      }
  }
  const crc = (data: Buffer) => {
    let c = 0xffffffff;
    for (const v of data) {
      c ^= v;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (name: string, data: Buffer) => {
    const label = Buffer.from(name),
      length = Buffer.alloc(4),
      check = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    check.writeUInt32BE(crc(Buffer.concat([label, data])));
    return Buffer.concat([length, label, data, check]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const scan = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    pixels.copy(
      scan,
      y * (width * 3 + 1) + 1,
      y * width * 3,
      (y + 1) * width * 3,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scan)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
