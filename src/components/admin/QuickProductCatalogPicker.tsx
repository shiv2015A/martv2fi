import React, { useState, useMemo, memo } from 'react';
import { Product } from '../../types';
import { 
  Search, 
  Plus, 
  Check, 
  Layers, 
  Grid, 
  List, 
  Sparkles, 
  X,
  Package,
  TrendingUp,
  Tag
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface QuickProductCatalogPickerProps {
  products: Product[];
  billItemMap: Record<string, number>; // productId -> quantity in cart
  onAddProduct: (product: Product) => void;
}

// Memoized Individual Product Tile for maximum speed and zero lag
const ProductTile = memo(({ 
  product, 
  cartQty, 
  onAdd 
}: { 
  product: Product; 
  cartQty: number; 
  onAdd: (p: Product) => void;
}) => {
  const isOutOfStock = !product.isAvailable || product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.minStockThreshold || 5);

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          soundEngine.playScanBeep();
          onAdd(product);
        }
      }}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all select-none text-left ${
        isOutOfStock
          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-gray-200 hover:border-orange-400 hover:shadow-md cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* In-Bill Quantity Badge */}
      {cartQty > 0 && (
        <span className="absolute -top-2 -right-2 z-10 bg-[#ea580c] text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md animate-in zoom-in-75 duration-150">
          ×{cartQty}
        </span>
      )}

      <div>
        {/* Product Image & Badges */}
        <div className="relative w-full aspect-square max-h-28 rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center overflow-hidden mb-2">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
          />
          {isOutOfStock && (
            <span className="absolute inset-x-1 bottom-1 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider py-0.5 rounded text-center">
              Out of Stock
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="absolute top-1 left-1 bg-amber-500 text-white font-bold text-[8px] uppercase px-1 py-0.2 rounded">
              Low: {product.stock}
            </span>
          )}
        </div>

        {/* Product Title & Info */}
        <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight group-hover:text-[#ea580c] transition-colors">
          {product.name}
        </h4>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">
          {product.brand} • {product.unit}
        </p>
      </div>

      {/* Pricing & Add Button */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
        <div>
          <span className="font-black text-sm text-gray-900">₹{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-[10px] text-gray-400 line-through ml-1">₹{product.mrp}</span>
          )}
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          className={`p-1.5 rounded-lg transition-colors ${
            cartQty > 0
              ? 'bg-[#ea580c] text-white'
              : 'bg-orange-50 group-hover:bg-[#ea580c] text-[#ea580c] group-hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

// Memoized Compact List Row
const ProductRow = memo(({ 
  product, 
  cartQty, 
  onAdd 
}: { 
  product: Product; 
  cartQty: number; 
  onAdd: (p: Product) => void;
}) => {
  const isOutOfStock = !product.isAvailable || product.stock <= 0;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          soundEngine.playScanBeep();
          onAdd(product);
        }
      }}
      className={`p-2.5 flex items-center justify-between gap-3 border-b border-gray-100 transition-colors select-none ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed bg-gray-50/50'
          : 'hover:bg-orange-50/50 cursor-pointer active:bg-orange-100/50'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0"
        />
        <div className="truncate">
          <p className="font-bold text-xs text-gray-900 truncate">{product.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>{product.brand}</span>
            <span>•</span>
            <span>{product.unit}</span>
            <span>•</span>
            <span className={product.stock <= 5 ? 'text-amber-600 font-bold' : ''}>
              Stock: {product.stock}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="font-black text-xs text-gray-900 block">₹{product.price}</span>
          {cartQty > 0 && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1 rounded">
              {cartQty} in cart
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          className="p-1 rounded-lg bg-orange-100 hover:bg-[#ea580c] text-[#ea580c] hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

export default function QuickProductCatalogPicker({
  products,
  billItemMap,
  onAddProduct
}: QuickProductCatalogPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Compute available categories dynamically with counts
  const categories = useMemo(() => {
    const cats: Record<string, number> = { All: products.length };
    products.forEach(p => {
      const c = p.categoryName || 'General';
      cats[c] = (cats[c] || 0) + 1;
    });
    return Object.entries(cats).map(([name, count]) => ({ name, count }));
  }, [products]);

  // High performance filtered items (memoized)
  const filteredProducts = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return products.filter(p => {
      if (selectedCategory !== 'All' && p.categoryName !== selectedCategory) {
        return false;
      }
      if (!cleanSearch) return true;

      return (
        p.name.toLowerCase().includes(cleanSearch) ||
        (p.brand && p.brand.toLowerCase().includes(cleanSearch)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(cleanSearch)) ||
        (p.barcode && p.barcode.toLowerCase().includes(cleanSearch))
      );
    });
  }, [products, search, selectedCategory]);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Search & View Toggle */}
      <div className="p-3.5 sm:p-4 bg-gray-50 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#ea580c]" />
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-900">
              Manual Product Catalog ({filteredProducts.length})
            </h3>
          </div>

          {/* View mode toggle: Grid vs List */}
          <div className="flex items-center bg-gray-200/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid Tile View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            placeholder="Search manual catalog by item name, brand, or barcode..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map(cat => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`ml-1 text-[10px] ${selectedCategory === cat.name ? 'text-orange-400' : 'text-gray-400'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Items Canvas */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-h-[520px]">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-gray-300 mb-2" />
            <p className="font-bold text-gray-600">No products found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Try searching with a different name or category.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredProducts.map(p => (
              <ProductTile
                key={p.id}
                product={p}
                cartQty={billItemMap[p.id] || 0}
                onAdd={onAddProduct}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                cartQty={billItemMap[p.id] || 0}
                onAdd={onAddProduct}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 font-medium flex items-center justify-between px-4">
        <span>Tap any item to add instantly to bill</span>
        <span className="font-mono text-gray-400">{filteredProducts.length} items available</span>
      </div>
    </div>
  );
}
