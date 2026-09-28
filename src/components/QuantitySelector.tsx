import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../utils/cn';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  className?: string;
}

export default function QuantitySelector({ quantity, onIncrease, onDecrease, className }: QuantitySelectorProps) {
  if (quantity === 0) {
    return (
      <button 
        onClick={onIncrease}
        className={cn("bg-white border border-[#ea580c] text-[#ea580c] px-4 py-1.5 rounded-lg text-xs font-black hover:bg-[#ea580c] hover:text-white transition-colors uppercase tracking-tight", className)}
      >
        Add
      </button>
    );
  }

  return (
    <div className={cn("flex items-center bg-[#ea580c] rounded-lg overflow-hidden", className)}>
      <button onClick={onDecrease} className="text-white px-2 py-1.5 font-bold text-xs hover:bg-[#c2410c] transition-colors active:scale-95">
        −
      </button>
      <span className="text-white text-xs font-black px-1 min-w-[1.25rem] text-center">{quantity}</span>
      <button onClick={onIncrease} className="text-white px-2 py-1.5 font-bold text-xs hover:bg-[#c2410c] transition-colors active:scale-95">
        +
      </button>
    </div>
  );
}
