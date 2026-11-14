'use client';
import { useState } from 'react';
import { categories, filterProducts, type Product } from '@/domain/catalog';
import { useEditorStore } from '@/features/editor/editor-store';
import { formatLength } from '@/domain/units';
import { ProductThumbnail } from './product-thumbnail';
import { ProductDialog } from './product-dialog';
export function CatalogPanel() {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All'),
    [material, setMaterial] = useState('All'),
    [preview, setPreview] = useState<Product | null>(null);
  const units = useEditorStore((s) => s.units);
  const products = filterProducts(query, category, material);
  return (
    <section
      id="sample-catalog"
      className="catalog-panel panel-section"
      aria-label="Sample furniture catalog"
    >
      <h3>Make it your own</h3>
      <p className="editor-help">
        Original FitSpace concepts. All dimensions are samples; these are not
        retailer listings.
      </p>
      <label className="editor-field-label" htmlFor="catalog-search">
        Search furniture
      </label>
      <input
        id="catalog-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sofa, desk, lamp…"
      />
      <div className="catalog-filters">
        <label>
          Category
          <select
            aria-label="Furniture category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Material
          <select
            aria-label="Furniture material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            {['All', 'Fabric', 'Wood', 'Metal'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="catalog-count" role="status">
        {products.length} sample{' '}
        {products.length === 1 ? 'concept' : 'concepts'}
      </p>
      <div className="catalog-grid">
        {products.map((product) => (
          <button
            key={product.id}
            className="catalog-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                'application/x-fitspace-product',
                product.id,
              );
              event.dataTransfer.effectAllowed = 'copy';
            }}
            aria-label={`Preview ${product.name}`}
            onClick={() => setPreview(product)}
          >
            <ProductThumbnail product={product} />
            <strong>{product.name}</strong>
            <small>
              {formatLength(product.dimensions.width.meters, units)} W · Sample
            </small>
            <span>Drag to room · 3D ↗</span>
          </button>
        ))}
      </div>
      {!products.length && (
        <p>
          No sample concepts match these filters. Try another category or clear
          your search.
        </p>
      )}
      {preview && (
        <ProductDialog product={preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}
