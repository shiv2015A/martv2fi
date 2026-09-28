import React from 'react';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
  key?: string | number;
}

export default function CategoryCard({ category, onClick }: CategoryCardProps) {
  return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer group"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F3F4F6] rounded-2xl p-2 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
        <img 
          src={category.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'} 
          alt={category.name}
          className="w-full h-full object-contain mix-blend-multiply"
        />
      </div>
      <span className="text-xs sm:text-sm font-bold text-center text-gray-800 leading-tight">
        {category.name}
      </span>
    </div>
  );
}
