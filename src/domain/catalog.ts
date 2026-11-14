import type { Axis, Dimensions } from './room';
export const categories = [
  'Sofas',
  'Chairs',
  'Tables',
  'Beds',
  'Cabinets',
  'Shelves',
  'Desks',
  'Lamps',
  'Appliances',
] as const;
export type Category = (typeof categories)[number];
export type Product = {
  id: string;
  revision: number;
  assetRevisionId: string;
  name: string;
  category: Category;
  description: string;
  dimensions: Dimensions;
  variants: {
    id: string;
    name: string;
    color: string;
    material: 'Fabric' | 'Wood' | 'Metal';
  }[];
  adjustable: Partial<Record<Axis, { min: number; max: number }>>;
};
const dimensions = (
  width: number,
  depth: number,
  height: number,
): Dimensions => ({
  width: { meters: width, source: 'sample' },
  depth: { meters: depth, source: 'sample' },
  height: { meters: height, source: 'sample' },
});
const fabric = [
  {
    id: 'linen',
    name: 'Natural linen',
    color: '#cbbb9d',
    material: 'Fabric' as const,
  },
  {
    id: 'olive',
    name: 'Olive weave',
    color: '#7b8563',
    material: 'Fabric' as const,
  },
  {
    id: 'clay',
    name: 'Clay textile',
    color: '#b17a5a',
    material: 'Fabric' as const,
  },
];
const wood = [
  {
    id: 'oak',
    name: 'Natural oak',
    color: '#b49770',
    material: 'Wood' as const,
  },
  { id: 'walnut', name: 'Walnut', color: '#75523c', material: 'Wood' as const },
];
const metal = [
  {
    id: 'ivory',
    name: 'Ivory enamel',
    color: '#ddd9ce',
    material: 'Metal' as const,
  },
  {
    id: 'graphite',
    name: 'Graphite',
    color: '#555b54',
    material: 'Metal' as const,
  },
];
const definitions: [
  string,
  string,
  Category,
  string,
  Dimensions,
  Product['variants'],
  Product['adjustable'],
][] = [
  [
    'arc-sofa',
    'Arc sofa',
    'Sofas',
    'A low, softly upholstered two-seat concept sofa.',
    dimensions(2.2, 0.92, 0.82),
    fabric,
    {},
  ],
  [
    'outline-chair',
    'Outline lounge chair',
    'Chairs',
    'A timber-framed lounge concept with a padded seat.',
    dimensions(0.78, 0.8, 0.86),
    fabric,
    {},
  ],
  [
    'pebble-table',
    'Pebble coffee table',
    'Tables',
    'A compact, oval-topped timber coffee-table concept.',
    dimensions(1.2, 0.68, 0.42),
    wood,
    {},
  ],
  [
    'platform-bed',
    'Platform bed',
    'Beds',
    'A low platform concept with a padded headboard.',
    dimensions(1.8, 2.15, 0.95),
    fabric,
    {},
  ],
  [
    'frame-cabinet',
    'Frame cabinet',
    'Cabinets',
    'A freestanding cabinet concept with two doors.',
    dimensions(1.2, 0.42, 1.1),
    wood,
    {},
  ],
  [
    'open-shelf',
    'Open shelf',
    'Shelves',
    'An adjustable-width open shelving concept.',
    dimensions(1, 0.35, 1.8),
    wood,
    { width: { min: 0.6, max: 1.8 } },
  ],
  [
    'studio-desk',
    'Studio desk',
    'Desks',
    'A width-adjustable desk concept with slender legs.',
    dimensions(1.4, 0.65, 0.75),
    wood,
    { width: { min: 1, max: 2.4 } },
  ],
  [
    'stem-lamp',
    'Stem floor lamp',
    'Lamps',
    'A shaded floor-light concept; visual only, no lighting specifications.',
    dimensions(0.45, 0.45, 1.6),
    metal,
    {},
  ],
  [
    'compact-fridge',
    'Compact refrigerator',
    'Appliances',
    'A refrigerator-volume concept, not an operational appliance specification.',
    dimensions(0.6, 0.65, 1.7),
    metal,
    {},
  ],
];
/** Immutable sample revision 1. Retain old revisions if future catalog entries change. */
export const products: Product[] = definitions.map(
  ([id, name, category, description, dimensions, variants, adjustable]) => ({
    id,
    name,
    category,
    description,
    dimensions,
    variants,
    adjustable,
    revision: 1,
    assetRevisionId: `procedural:${id}:1`,
  }),
);
export function findProduct(id: string, revision = 1) {
  return products.find(
    (product) => product.id === id && product.revision === revision,
  );
}
export function filterProducts(
  query: string,
  category: string,
  material: string,
) {
  const search = query.trim().toLowerCase();
  return products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      (material === 'All' || p.variants.some((v) => v.material === material)) &&
      `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search),
  );
}
export type FurniturePart = {
  position: [number, number, number];
  size: [number, number, number];
  role: 'primary' | 'wood' | 'metal' | 'accent';
  kind?: 'box' | 'cylinder' | 'sphere';
  rounded?: boolean;
};
const part = (
  position: FurniturePart['position'],
  size: FurniturePart['size'],
  role: FurniturePart['role'] = 'primary',
  kind: FurniturePart['kind'] = 'box',
  rounded = false,
): FurniturePart => ({ position, size, role, kind, rounded });
const legs = (height: number, x = 0.4, z = 0.36) =>
  [-x, x].flatMap((a) =>
    [-z, z].map((b) =>
      part([a, height / 2, b], [0.055, height, 0.055], 'wood'),
    ),
  );
/** Bottom-center pivot; every original model occupies its unit physical envelope. */
export function furnitureParts(productId: string): FurniturePart[] {
  switch (productId) {
    case 'arc-sofa':
      return [
        ...legs(0.16),
        part([0, 0.32, 0], [1, 0.32, 1], 'primary', 'box', true),
        part([0, 0.74, -0.4], [1, 0.52, 0.2], 'primary', 'box', true),
        ...[-0.45, 0.45].map((x) =>
          part([x, 0.5, 0], [0.1, 0.55, 1], 'primary', 'box', true),
        ),
        ...[-0.22, 0.22].map((x) =>
          part([x, 0.54, 0.04], [0.42, 0.14, 0.74], 'primary', 'box', true),
        ),
        part([-0.3, 0.76, -0.2], [0.2, 0.28, 0.12], 'accent', 'box', true),
      ];
    case 'outline-chair':
      return [
        ...legs(0.42, 0.4, 0.35),
        part([0, 0.48, 0], [0.92, 0.14, 0.88], 'primary', 'box', true),
        part([0, 0.76, -0.43], [1, 0.48, 0.14], 'primary', 'box', true),
        ...[-0.46, 0.46].map((x) =>
          part([x, 0.65, 0], [0.08, 0.08, 1], 'wood'),
        ),
      ];
    case 'pebble-table':
      return [
        part([0, 0.92, 0], [1, 0.16, 1], 'primary', 'cylinder'),
        part([-0.28, 0.42, 0], [0.12, 0.84, 0.7], 'wood'),
        part([0.28, 0.42, 0], [0.12, 0.84, 0.7], 'wood'),
      ];
    case 'platform-bed':
      return [
        ...legs(0.16),
        part([0, 0.24, 0], [1, 0.16, 1], 'wood'),
        part([0, 0.45, 0.04], [0.96, 0.26, 0.9], 'primary', 'box', true),
        part([0, 0.67, -0.46], [1, 0.66, 0.08], 'primary', 'box', true),
        ...[-0.24, 0.24].map((x) =>
          part([x, 0.64, -0.25], [0.42, 0.12, 0.24], 'accent', 'box', true),
        ),
      ];
    case 'frame-cabinet':
      return [
        ...legs(0.12, 0.4, 0.35),
        part([0, 0.56, -0.04], [1, 0.88, 0.92]),
        ...[-0.245, 0.245].map((x) => part([x, 0.56, 0.44], [0.47, 0.8, 0.06])),
        ...[-0.07, 0.07].map((x) =>
          part([x, 0.56, 0.485], [0.025, 0.16, 0.03], 'metal'),
        ),
      ];
    case 'open-shelf':
      return [
        ...[-0.47, 0.47].map((x) => part([x, 0.5, 0], [0.06, 1, 1])),
        ...[0, 0.25, 0.5, 0.75, 0.975].map((y) =>
          part([0, y + 0.0125, 0], [0.94, 0.025, 1]),
        ),
        part([0, 0.5, -0.48], [0.94, 1, 0.04], 'accent'),
      ];
    case 'studio-desk':
      return [
        ...legs(0.94, 0.44, 0.4),
        part([0, 0.97, 0], [1, 0.06, 1]),
        part([0, 0.74, -0.45], [0.9, 0.05, 0.05], 'metal'),
      ];
    case 'stem-lamp':
      return [
        part([0, 0.025, 0], [0.7, 0.05, 0.7], 'metal', 'cylinder'),
        part([0, 0.43, 0], [0.055, 0.86, 0.055], 'metal', 'cylinder'),
        part([0, 0.87, 0], [1, 0.26, 1], 'primary', 'cylinder'),
      ];
    case 'compact-fridge':
      return [
        part([0, 0.5, -0.03], [1, 1, 0.94], 'primary', 'box', true),
        part([0, 0.74, 0.455], [0.96, 0.47, 0.03]),
        part([0, 0.245, 0.455], [0.96, 0.47, 0.03]),
        part([-0.35, 0.68, 0.485], [0.04, 0.25, 0.03], 'metal'),
        part([-0.35, 0.3, 0.485], [0.04, 0.25, 0.03], 'metal'),
      ];
    default:
      throw new Error('Unsupported sample furniture asset.');
  }
}
export function partColor(role: FurniturePart['role'], primary: string) {
  return role === 'primary'
    ? primary
    : role === 'wood'
      ? '#75583e'
      : role === 'metal'
        ? '#4e534c'
        : '#e4dcc9';
}
