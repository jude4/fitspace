import { furnitureParts, partColor, type Product } from '@/domain/catalog';
const project = ([x, y, z]: number[]) =>
  `${80 + 55 * (x - z)},${100 - 65 * y + 24 * (x + z)}`;
export function ProductThumbnail({ product }: { product: Product }) {
  const dims = product.dimensions;
  const longest = Math.max(
    dims.width.meters,
    dims.depth.meters,
    dims.height.meters,
  );
  const scale = [
    dims.width.meters / longest,
    dims.height.meters / longest,
    dims.depth.meters / longest,
  ];
  const parts = furnitureParts(product.id).map((p) => ({
    ...p,
    position: p.position.map((v, i) => v * scale[i]) as [
      number,
      number,
      number,
    ],
    size: p.size.map((v, i) => v * scale[i]) as [number, number, number],
  }));
  return (
    <svg
      viewBox="0 0 160 135"
      role="img"
      aria-label={`${product.name} illustrative preview`}
    >
      <ellipse cx="80" cy="111" rx="56" ry="13" fill="#798366" opacity=".1" />
      {[...parts]
        .sort(
          (a, b) =>
            a.position[1] - b.position[1] + a.position[2] - b.position[2],
        )
        .map((p, i) => {
          const [x, y, z] = p.position,
            [w, h, d] = p.size;
          const v = [
            [x - w / 2, y - h / 2, z - d / 2],
            [x + w / 2, y - h / 2, z - d / 2],
            [x + w / 2, y - h / 2, z + d / 2],
            [x - w / 2, y - h / 2, z + d / 2],
            [x - w / 2, y + h / 2, z - d / 2],
            [x + w / 2, y + h / 2, z - d / 2],
            [x + w / 2, y + h / 2, z + d / 2],
            [x - w / 2, y + h / 2, z + d / 2],
          ];
          return (
            <g
              key={i}
              fill={partColor(p.role, product.variants[0].color)}
              stroke="#5c654b"
              strokeWidth=".3"
            >
              {[
                [1, 2, 6, 5],
                [2, 3, 7, 6],
                [4, 5, 6, 7],
              ].map((face, k) => (
                <polygon
                  key={k}
                  points={face.map((n) => project(v[n])).join(' ')}
                  style={{
                    filter: `brightness(${k === 2 ? 1.08 : k === 0 ? 0.84 : 0.94})`,
                  }}
                />
              ))}
            </g>
          );
        })}
    </svg>
  );
}
