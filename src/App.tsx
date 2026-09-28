import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Account from './pages/Account';
import Addresses from './pages/Addresses';
import Help from './pages/Help';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import POSBilling from './pages/admin/POSBilling';
import StoreGuide from './pages/admin/StoreGuide';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import BottomNav from './components/BottomNav';

function AppLayout() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-16 md:pb-0">
      <Header />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const { init, loading } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Toaster position="bottom-center" />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="login" element={<Login />} />
          <Route path="account" element={<Account />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="help" element={<Help />} />
          <Route path="orders" element={<Orders />} />
          <Route path="order/:id" element={<OrderTracking />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="pos" element={<POSBilling />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="guide" element={<StoreGuide />} />
        </Route>
      </Routes>
    </Router>
  );
}
