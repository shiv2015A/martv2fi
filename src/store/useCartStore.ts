import { create } from 'zustand';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (newItem) => set((state) => {
    const existingItem = state.items.find(i => i.productId === newItem.productId);
    if (existingItem) {
      return {
        items: state.items.map(i => 
          i.productId === newItem.productId 
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        )
      };
    }
    return { items: [...state.items, newItem] };
  }),
  removeItem: (productId) => set((state) => ({
    items: state.items.filter(i => i.productId !== productId)
  })),
  updateQuantity: (productId, quantity) => set((state) => ({
    items: state.items.map(i => 
      i.productId === productId ? { ...i, quantity } : i
    ).filter(i => i.quantity > 0)
  })),
  clearCart: () => set({ items: [] })
}));
