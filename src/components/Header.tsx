import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, User, MapPin, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../utils/cn';
import Logo from './Logo';

export default function Header() {
  const { items } = useCartStore();
  const { user, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [locationName, setLocationName] = useState('Fetching location...');

  const isHome = location.pathname === '/';

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            
            // Format address
            let locality = data.address?.city || data.address?.town || data.address?.suburb || 'Unknown Location';
            let pincode = data.address?.postcode || '';
            setLocationName(`${locality}${pincode ? `, ${pincode}` : ''}`);
          } catch (e) {
            setLocationName('Delhi, 110001');
          }
        },
        () => {
          setLocationName('Delhi, 110001');
        }
      );
    } else {
      setLocationName('Delhi, 110001');
    }
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-50 gap-3 sm:gap-0">
      <div className="flex items-center justify-between w-full sm:w-auto">
        <div className="flex items-center gap-3">
          {!isHome && (
            <button 
              onClick={() => navigate(-1)} 
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <Link to="/" className="flex flex-col shrink-0">
            <Logo size="sm" />
            <div className="flex items-center text-xs text-gray-500 font-medium mt-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-[#ea580c] shrink-0" />
              <div className="flex flex-col items-start truncate max-w-[160px] sm:max-w-xs">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold leading-none text-gray-400">Delivery Location</span>
                <span className="text-gray-900 font-bold text-[10px] sm:text-xs truncate w-full">{locationName}</span>
              </div>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <Link to={user ? "/account" : "/login"} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </Link>
          <button onClick={() => navigate('/cart')} className="relative w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ea580c] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-8 w-full sm:flex-1 sm:max-w-xl sm:mx-8">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder='Search "milk", "bread", "eggs"...'
            className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            onClick={() => navigate('/search')}
            readOnly
          />
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
        </div>
      </div>

      {/* Right Nav (Desktop only) */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
          {isAdmin && (
            <Link to="/admin" className="hidden sm:block text-xs font-bold uppercase text-[#ea580c] hover:text-orange-800">
              Admin
            </Link>
          )}
          
          <Link to={user ? "/account" : "/login"} className="hidden sm:flex flex-col items-center text-gray-500 hover:text-gray-900">
            <User className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-[10px] font-bold uppercase mt-0.5">Account</span>
          </Link>

          <button 
            onClick={() => navigate('/cart')}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 sm:gap-3 shadow-sm transition-colors",
              totalItems > 0 
                ? "bg-[#ea580c] text-white hover:bg-[#c2410c]" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {totalItems > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start hidden sm:flex">
                  <span className="text-[10px] font-bold leading-none opacity-80 uppercase">{totalItems} ITEMS</span>
                  <span className="text-sm font-bold">₹{totalPrice}</span>
                </div>
                <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
                <ShoppingCart className="w-5 h-5" strokeWidth={2} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" strokeWidth={2} />
              </div>
            )}
          </button>
        </div>
    </header>
  );
}
