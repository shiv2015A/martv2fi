import React, { useState } from 'react';
import { useCartStore } from '../store/useCartStore';
import QuantitySelector from '../components/QuantitySelector';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const navigate = useNavigate();

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 20 : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-48 h-48 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-6">
          <ShoppingCartIcon className="w-20 h-20 text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 font-medium">Looks like you haven't added anything yet.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-[#ea580c] text-white font-black px-8 py-3 rounded-xl hover:bg-[#c2410c] transition-colors uppercase tracking-tight text-sm"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">My Cart</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6">
            <h2 className="font-black mb-4 flex items-center justify-between text-gray-900">
              <span>Items ({items.length})</span>
            </h2>
            
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.productId} className="py-4 flex gap-4">
                  <div className="w-20 h-20 bg-[#F3F4F6] rounded-2xl p-2 shrink-0 flex items-center justify-center">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h3>
                    <p className="font-black text-gray-900 mb-2">₹{item.price}</p>
                  </div>
                  <div className="w-24 flex flex-col items-end justify-between">
                    <button 
                      onClick={() => removeItem(item.productId)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <QuantitySelector 
                      quantity={item.quantity}
                      onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
                      onDecrease={() => {
                        if (item.quantity === 1) removeItem(item.productId);
                        else updateQuantity(item.productId, item.quantity - 1);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bill Details */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sticky top-24">
            <h2 className="font-black mb-4 text-gray-900 tracking-tight">Bill Details</h2>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Subtotal</span>
                <span className="text-gray-900 font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Delivery Fee</span>
                <span className="text-gray-900 font-bold">₹{deliveryFee}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-lg text-gray-900">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-[#ea580c] text-white font-black py-3.5 rounded-xl hover:bg-[#c2410c] transition-colors flex items-center justify-center gap-2 uppercase tracking-tight text-sm"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
