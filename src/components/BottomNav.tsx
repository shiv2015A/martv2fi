import { Home, Search, ShoppingBag, User, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { items } = useCartStore();
  
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Cart', path: '/cart', icon: ShoppingCart },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Profile', path: user ? '/account' : '/login', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center pb-safe pt-2 px-2 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center gap-1 p-2 relative ${isActive ? 'text-[#ea580c]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            {item.name === 'Cart' && totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-[#ea580c] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {totalItems}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
