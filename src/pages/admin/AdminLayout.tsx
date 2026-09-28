import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import Logo from '../../components/Logo';
import { LayoutDashboard, Barcode, PackageCheck, Store, LogOut, BookOpen } from 'lucide-react';

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuthStore();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Admin Portal...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" />;

  const navLinks = [
    { path: '/admin', label: 'Dashboard & Ledger', icon: LayoutDashboard },
    { path: '/admin/pos', label: 'Barcode POS Billing', icon: Barcode, badge: 'Scanner' },
    { path: '/admin/products', label: 'Inventory & Products', icon: PackageCheck },
    { path: '/admin/guide', label: 'Store Operator Guide', icon: BookOpen, badge: 'Help' },
  ];

  return (
    <div className="min-h-screen md:h-screen bg-gray-50 flex flex-col md:flex-row font-sans md:overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-full md:w-64 bg-gray-950 text-white flex flex-col border-r border-gray-800 shrink-0 md:h-full md:overflow-y-auto">
        <div className="p-6 border-b border-gray-800/80">
          <Link to="/admin" className="flex items-center">
            <Logo size="sm" theme="dark" />
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Live Store Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs uppercase tracking-tight transition-all ${
                  isActive
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
                    isActive ? 'bg-white text-[#ea580c]' : 'bg-orange-500/20 text-[#ea580c]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 mt-6 border-t border-gray-800/80 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-gray-900 transition-colors uppercase tracking-tight"
            >
              <Store className="w-4 h-4 text-orange-400" />
              <span>Customer Storefront</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors uppercase tracking-tight text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin Portal</span>
            </button>
          </div>
        </nav>

        {/* Cashier / Operator info */}
        <div className="p-4 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-200">{user.name || 'Store Admin'}</p>
            <p className="text-[10px] text-gray-500">{user.email}</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-orange-950 text-[#ea580c] text-[10px] font-black uppercase">
            ADMIN
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
