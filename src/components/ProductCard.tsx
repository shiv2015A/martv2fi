import React, { memo } from 'react';
import { Product } from '../types';
import QuantitySelector from './QuantitySelector';
import { useCartStore } from '../store/useCartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

const ProductCard = memo(({ product }: ProductCardProps) => {
  const quantity = useCartStore(state => state.items.find(item => item.productId === product.id)?.quantity || 0);
  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);

  const isOutOfStock = !product.isAvailable || product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.minStockThreshold || 5);

  const handleIncrease = () => {
    if (isOutOfStock) {
      toast.error('Item is out of stock');
      return;
    }

    if (quantity >= product.stock) {
      toast.error(`Only ${product.stock} units available in stock!`, { id: `stock-${product.id}` });
      return;
    }

    if (quantity === 0) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl
      });
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecrease = () => {
    if (quantity === 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <div className={`bg-white p-3 rounded-2xl border transition-all flex flex-col h-full relative group ${
      isOutOfStock 
        ? 'border-gray-200 opacity-80' 
        : 'border-transparent hover:border-[#ea580c] shadow-sm hover:shadow-md'
    }`}>
      {/* Product Image Box */}
      <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
        {/* Discount Badge */}
        {product.discountPercentage > 0 && !isOutOfStock && (
          <span className="absolute top-2 left-2 bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-md z-10">
            {product.discountPercentage}% OFF
          </span>
        )}

        {/* Real-time Low Stock Ribbon */}
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm z-10 animate-pulse">
            Only {product.stock} left!
          </span>
        )}

        <img 
          src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'} 
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-300 ${
            isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105'
          }`}
        />

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20 p-2">
            <span className="bg-red-600 text-white px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider shadow">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[11px] text-gray-400 font-medium truncate">{product.brand || 'Generic'}</p>
          {/* Real-time stock count indicator */}
          {!isOutOfStock && (
            <span className="text-[10px] font-bold text-gray-500">
              {product.stock} in stock
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-gray-900 truncate mb-1" title={product.name}>
          {product.name}
        </h4>
        <p className="text-xs text-gray-400 mb-2">{product.unit}</p>

        {/* Price & Cart Actions */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div>
            <span className="text-sm sm:text-base font-black text-gray-900">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-[10px] text-gray-400 line-through ml-1.5 font-medium">₹{product.mrp}</span>
            )}
          </div>
          
          <div className="shrink-0">
            {!isOutOfStock ? (
              <QuantitySelector 
                quantity={quantity} 
                onIncrease={handleIncrease} 
                onDecrease={handleDecrease}
              />
            ) : (
              <button 
                disabled 
                className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight cursor-not-allowed"
              >
                Sold Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.isAvailable === nextProps.product.isAvailable &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.name === nextProps.product.name
  );
});

export default ProductCard;
