import React, { memo, useState, useMemo } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { ArrowDownUp } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'popularity';

const ProductGrid = memo(({ products }: ProductGridProps) => {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const sortedProducts = useMemo(() => {
    const arr = [...products];
    if (sortBy === 'price_asc') {
      arr.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      arr.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'popularity') {
      arr.sort((a, b) => b.stock - a.stock);
    }
    return arr;
  }, [products, sortBy]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {products.length} Products Available
        </span>
        <div className="relative">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-9 rounded-xl text-xs sm:text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent cursor-pointer"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popularity">Popularity / Stock</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
            <ArrowDownUp className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {sortedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.products.length !== nextProps.products.length) return false;
  for (let i = 0; i < prevProps.products.length; i++) {
    const p = prevProps.products[i];
    const n = nextProps.products[i];
    if (
      p.id !== n.id ||
      p.stock !== n.stock ||
      p.isAvailable !== n.isAvailable ||
      p.price !== n.price
    ) {
      return false;
    }
  }
  return true;
});

export default ProductGrid;
