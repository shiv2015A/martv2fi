import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Category, Product } from '../types';
import CategoryCard from '../components/CategoryCard';
import ProductGrid from '../components/ProductGrid';
import Logo from '../components/Logo';
import { useInventoryStore } from '../store/useInventoryStore';
import { Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [catLoading, setCatLoading] = useState(true);

  const { products, loading: prodLoading, initRealtimeListener, syncCount } = useInventoryStore();

  useEffect(() => {
    // Start real-time inventory subscription for live stock updates
    const unsubscribe = initRealtimeListener();

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('sortOrder')));
        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setCatLoading(false);
      }
    };

    fetchCategories();

    return () => {
      unsubscribe();
    };
  }, [initRealtimeListener]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(p => 
      p.categoryName?.toLowerCase() === selectedCategory.toLowerCase() ||
      p.categoryId === selectedCategory
    );
  }, [products, selectedCategory]);

  return (
    <div className="pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        {/* Hero Banner with Brand Identity */}
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-[#431407] rounded-[2rem] p-6 sm:p-12 mb-8 sm:mb-12 overflow-hidden relative flex flex-col justify-center min-h-[280px] shadow-xl border border-orange-950/40">
          {/* Subtle background image overlay */}
          <div className="absolute inset-0 z-0 opacity-25">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
              alt="Annapurna Supermarket" 
              className="w-full h-full object-cover mix-blend-luminosity"
            />
          </div>
          
          <div className="relative z-10 max-w-xl">
            {/* Logo Badge in Hero */}
            <div className="mb-4 inline-block">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 backdrop-blur-md border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>अन्नपूर्णा MART • Fresh Storefront</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.1] mb-3 tracking-tight">
              Daily Essentials <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                Delivered in Minutes.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 font-medium mb-6 max-w-md">
              Fresh farm vegetables, dairy, staples, and daily household needs sourced directly from local markets to your doorstep.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a 
                href="#products-section"
                className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-black px-6 py-3 rounded-xl transition-all uppercase tracking-tight text-xs sm:text-sm shadow-lg shadow-orange-600/30 hover:-translate-y-0.5"
              >
                Shop Daily Groceries
              </a>
              <div className="flex items-center gap-1.5 text-xs text-orange-200 font-bold bg-white/5 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Stock Sync Active</span>
              </div>
            </div>
          </div>

          {/* Decorative glowing gradient accents */}
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-orange-600/10 to-transparent pointer-events-none z-0"></div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#ea580c] opacity-25 rounded-full blur-[80px] z-0"></div>
        </div>

        {/* Categories Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Explore Categories
            </h2>
            {selectedCategory !== 'all' && (
              <button 
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-bold text-[#ea580c] hover:underline"
              >
                View All Categories
              </button>
            )}
          </div>

          {catLoading ? (
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex-shrink-0 w-20 h-24 sm:w-24 sm:h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-tight shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#ea580c] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs tracking-tight shrink-0 transition-colors flex items-center gap-2 ${
                    selectedCategory.toLowerCase() === category.name.toLowerCase()
                      ? 'bg-[#ea580c] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Products Section with Live Stock Header */}
        <section id="products-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Daily Groceries & Staples</span>
                {syncCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Live Inventory
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {selectedCategory === 'all' ? 'All items in stock' : `Filtered by: ${selectedCategory}`} • Stocks update in real-time
              </p>
            </div>
          </div>

          {prodLoading && products.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="bg-gray-100 h-64 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-200">
              <p className="text-gray-500 font-bold mb-2">No products found in this category.</p>
              <button 
                onClick={() => setSelectedCategory('all')}
                className="text-[#ea580c] font-black text-xs uppercase tracking-tight hover:underline"
              >
                Reset Filter
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
