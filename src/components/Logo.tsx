import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  className?: string;
  theme?: 'light' | 'dark';
}

export default function Logo({ 
  size = 'md', 
  variant = 'full', 
  className = '',
  theme = 'light'
}: LogoProps) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-xl sm:text-2xl', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-4xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // SVG Emblem: Supermarket Cart + Grain/Wheat Motif + Brand Orange
  const Emblem = ({ className = 'w-9 h-9' }: { className?: string }) => (
    <div className={`relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white shadow-md shadow-orange-500/20 p-1.5 ${className}`}>
      <svg 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full"
      >
        {/* Shopping Cart Body */}
        <path 
          d="M8 12H13L17.5 28H35.5L39.5 16H16" 
          stroke="currentColor" 
          strokeWidth="3.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        {/* Wheels */}
        <circle cx="20" cy="36" r="3.5" fill="currentColor" />
        <circle cx="33" cy="36" r="3.5" fill="currentColor" />
        
        {/* Wheat Sprout / Harvest Grain (Symbolizing Annapurna - Goddess of Abundant Food) */}
        <path 
          d="M26 12C26 7 30 5 33 5C33 8 30 12 26 12Z" 
          fill="#FEF08A" 
        />
        <path 
          d="M26 15C24 10 20 8 18 10C19 13 23 15 26 15Z" 
          fill="#FEF08A" 
        />
        <path 
          d="M26 6V18" 
          stroke="#FEF08A" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return <Emblem className={`${currentSize.icon} ${className}`} />;
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-orange-50 border border-orange-200 ${className}`}>
        <Emblem className="w-6 h-6" />
        <div className="flex flex-col leading-none">
          <span className="text-[#ea580c] font-black text-sm tracking-tight">अन्नपूर्णा MART</span>
          <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Daily Fresh Grocery</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <Emblem className={currentSize.icon} />
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline">
          <span className="text-[#ea580c] font-black tracking-tight leading-none text-xl sm:text-2xl font-serif">
            अन्नपूर्णा
          </span>
          <span className={`font-black tracking-wider ml-1 text-lg sm:text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            MART
          </span>
        </div>
        <span className={`font-bold tracking-widest uppercase text-[8px] sm:text-[9px] ${theme === 'dark' ? 'text-orange-300' : 'text-gray-500'}`}>
          SUPERMARKET & GROCERY
        </span>
      </div>
    </div>
  );
}
