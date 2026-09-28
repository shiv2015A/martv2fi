import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Search as SearchIcon, Barcode } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, loading, initRealtimeListener } = useInventoryStore();

  useEffect(() => {
    const unsub = initRealtimeListener();
    return () => unsub();
  }, [initRealtimeListener]);

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) return [];

    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.keywords && p.keywords.some(k => k.toLowerCase().includes(term)))
    );
  }, [products, searchTerm]);

  const hasSearched = searchTerm.trim().length >= 2;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      <div className="relative mb-8 max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          autoFocus
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 text-base sm:text-lg border-none bg-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c] placeholder:text-gray-400"
          placeholder="Search by product name, brand, or barcode..."
        />
      </div>

      {hasSearched ? (
        searchResults.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                Showing {searchResults.length} results for "{searchTerm}"
              </h2>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Live Stock Checked
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {searchResults.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No products found</h2>
            <p className="text-gray-500 font-medium text-sm">
              Try searching with different keywords like 'milk', 'atta', 'lays', or a barcode.
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-20">
          <SearchIcon className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-400 tracking-tight">
            Type product name, category, or barcode above to search
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-md mx-auto">
            {['Milk', 'Potato', 'Onion', 'Atta', 'Butter', 'Eggs', 'Coca-Cola', 'Maggi'].map(tag => (
              <button
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#ea580c] text-xs font-bold text-gray-600 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
