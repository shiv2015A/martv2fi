import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Order, Customer } from '../../types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  Barcode, 
  ShoppingBag, 
  Store, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  BookOpen, 
  Phone, 
  Search, 
  Share2, 
  DollarSign, 
  User, 
  AlertCircle 
} from 'lucide-react';
import Logo from '../../components/Logo';
import { useCustomerStore } from '../../store/useCustomerStore';
import KhataSettlementModal from '../../components/admin/KhataSettlementModal';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [userFilter, setUserFilter] = useState<string>('');

  // Dashboard Tab: 'orders' | 'khata'
  const [activeTab, setActiveTab] = useState<'orders' | 'khata'>('orders');

  // Khata ledger search & filter
  const { customers, searchCustomers, initCustomerListener } = useCustomerStore();
  const [khataSearch, setKhataSearch] = useState('');
  const [khataFilter, setKhataFilter] = useState<'all' | 'due_only'>('due_only');
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    // Real-time listener for orders so store manager sees new POS and online orders instantly
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });

    const unsubCust = initCustomerListener();

    return () => {
      unsubscribe();
      unsubCust();
    };
  }, [initCustomerListener]);

  // Extract unique users from recent orders for filter dropdown
  const uniqueUsers = Array.from(new Set(orders.map(o => o.userId))) as string[];

  const filteredOrders = orders.filter(o => {
    let matchStatus = true;
    if (filter === 'due') matchStatus = o.paymentStatus === 'due' || o.paymentStatus === 'pending' || o.paymentStatus === 'partial';
    if (filter === 'paid') matchStatus = o.paymentStatus === 'paid';
    
    let matchUser = true;
    if (userFilter) matchUser = o.userId === userFilter;

    return matchStatus && matchUser;
  });

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.total, 0);

  const totalDue = orders
    .filter(o => o.paymentStatus !== 'paid')
    .reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0);

  const posOrdersCount = orders.filter(o => o.orderType === 'pos_counter').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span>Store Dashboard & Ledger</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Sync
            </span>
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Real-time sales tracking, customer ledger (Udhaar / Khata), and POS receipts
          </p>
        </div>

        {/* Quick Launch Button to POS Billing */}
        <Link
          to="/admin/pos"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-black text-xs uppercase tracking-tight shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 hover:-translate-y-0.5 transition-all"
        >
          <Barcode className="w-4 h-4" />
          <span>Launch Barcode POS Billing Counter</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Orders</p>
          <p className="text-3xl font-black text-gray-900">{orders.length}</p>
          <span className="text-[10px] text-gray-400 font-medium">POS + Online App</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/40">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Total Paid Revenue</p>
          <p className="text-3xl font-black text-emerald-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Settled transactions</span>
        </div>

        <div 
          onClick={() => setActiveTab('khata')}
          className={`p-5 rounded-2xl shadow-sm border transition-all cursor-pointer ${
            activeTab === 'khata' 
              ? 'border-amber-400 bg-amber-100/50 ring-2 ring-amber-400/30' 
              : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Total Due (Udhaar)</p>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-800">₹{totalDue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
            <span>Customer Khata ledger</span>
            <span className="font-bold underline">→ View register</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 bg-orange-50/40">
          <p className="text-xs font-bold uppercase tracking-wider text-[#ea580c] mb-1">POS Counter Sales</p>
          <p className="text-3xl font-black text-[#ea580c]">{posOrdersCount}</p>
          <span className="text-[10px] text-[#ea580c] font-medium">Billed through scanner machine</span>
        </div>
      </div>

      {/* Main View Tabs: Orders vs Khata Ledger */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-3 px-4 font-black text-xs uppercase tracking-tight transition-all border-b-2 ${
            activeTab === 'orders'
              ? 'border-[#ea580c] text-[#ea580c]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders & Sales Invoices ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('khata')}
          className={`flex items-center gap-2 pb-3 px-4 font-black text-xs uppercase tracking-tight transition-all border-b-2 ${
            activeTab === 'khata'
              ? 'border-[#ea580c] text-[#ea580c]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Customer Khata Register / Bahi-Khata ({customers.filter(c => (c.outstandingKhataBalance || 0) > 0).length} with dues)</span>
        </button>
      </div>

      {/* VIEW 1: Orders & Sales Invoices */}
      {activeTab === 'orders' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Orders & Invoices</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#ea580c]"
              >
                <option value="">All Customers</option>
                {uniqueUsers.map(uid => (
                  <option key={uid} value={uid}>ID: {uid.slice(0, 10)}...</option>
                ))}
              </select>
              
              <div className="flex bg-white rounded-xl border border-gray-200 p-1">
                {(['all', 'due', 'paid'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-colors ${
                      filter === f ? 'bg-[#ea580c] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'due' ? 'Udhaar / Due' : 'Paid'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                    <th className="p-4">Order / Bill ID</th>
                    <th className="p-4">Source / Type</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold">
                        <Link to={`/order/${o.id}`} className="text-[#ea580c] hover:underline flex items-center gap-1.5">
                          <span>#{o.billNumber || o.id.slice(0, 14)}</span>
                        </Link>
                      </td>
                      <td className="p-4">
                        {o.orderType === 'pos_counter' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ea580c] text-[10px] font-black uppercase tracking-wider">
                            <Barcode className="w-3 h-3" />
                            <span>Store POS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Online App</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {o.customerName || o.deliveryAddress?.fullName || 'Walk-in Customer'}
                      </td>
                      <td className="p-4 text-gray-500">
                        {o.createdAt?.toDate ? format(o.createdAt.toDate(), 'dd MMM, hh:mm a') : 'Just now'}
                      </td>
                      <td className="p-4 text-gray-900 font-black text-sm">₹{o.total}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          o.orderStatus === 'placed' ? 'bg-amber-100 text-amber-800' :
                          o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                          o.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {o.orderStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : o.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.paymentStatus === 'paid' ? 'PAID' : o.paymentStatus === 'partial' ? `PARTIAL (₹${o.total - (o.amountPaid || 0)} DUE)` : 'DUE / KHATA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="p-12 text-center text-gray-400 font-medium">
                  No orders found in this filter view.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Customer Khata Register (Bahi-Khata) */}
      {activeTab === 'khata' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Customer Udhaar Bahi-Khata</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Credit Ledger
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Track running balances, receive payments, and send instant WhatsApp payment reminders
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={khataSearch}
                  onChange={e => setKhataSearch(e.target.value)}
                  placeholder="Search customer name or phone..."
                  className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#ea580c] w-64"
                />
              </div>

              {/* Dues filter toggle */}
              <div className="flex bg-white rounded-xl border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setKhataFilter('due_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-colors ${
                    khataFilter === 'due_only' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Pending Dues Only
                </button>
                <button
                  type="button"
                  onClick={() => setKhataFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-colors ${
                    khataFilter === 'all' ? 'bg-[#ea580c] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All Registered Customers
                </button>
              </div>
            </div>
          </div>

          {/* Customer Khata Ledger Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-amber-50/60 border-b border-gray-200 text-[11px] font-black uppercase text-amber-900 tracking-wider">
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Orders & Spend</th>
                    <th className="p-4">Outstanding Due (Baki)</th>
                    <th className="p-4">Notes / Remarks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {customers
                    .filter(c => {
                      if (khataFilter === 'due_only' && (!c.outstandingKhataBalance || c.outstandingKhataBalance <= 0)) {
                        return false;
                      }
                      if (khataSearch.trim()) {
                        const q = khataSearch.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const phone = c.phone.replace(/[^0-9]/g, '');
                        const name = c.name.toLowerCase();
                        return phone.includes(q) || name.includes(khataSearch.toLowerCase());
                      }
                      return true;
                    })
                    .map(cust => {
                      const due = cust.outstandingKhataBalance || 0;
                      const hasDue = due > 0;

                      return (
                        <tr key={cust.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 text-xs block">{cust.name}</span>
                                {cust.address && (
                                  <span className="text-[10px] text-gray-400 block truncate max-w-xs">{cust.address}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-mono font-bold text-gray-700">
                            +91 {cust.phone}
                          </td>

                          <td className="p-4">
                            <span className="text-gray-900 font-bold block">{cust.totalOrdersCount || 0} bills</span>
                            <span className="text-[10px] text-gray-500">₹{(cust.totalSpend || 0).toLocaleString('en-IN')} total</span>
                          </td>

                          <td className="p-4">
                            {hasDue ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-black text-xs">
                                <span>₹{due.toLocaleString('en-IN')} Due</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Clear (₹0)</span>
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-gray-500 max-w-xs truncate">
                            {cust.notes || 'Regular counter customer'}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Receive Payment / Jama Karein */}
                              <button
                                type="button"
                                onClick={() => setSettlementCustomer(cust)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-tight flex items-center gap-1 shadow-sm transition-all"
                                title="Collect money towards this customer's Khata"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Jama</span>
                              </button>

                              {/* WhatsApp Payment Reminder */}
                              {hasDue && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                                    const msg = `🙏 *Annapurna Mart - Khata Payment Reminder*\n` +
                                      `Namaste ${cust.name} ji,\n` +
                                      `Annapurna Mart se aapka baki udhaar (Khata Balance) *₹${due}* hai.\n\n` +
                                      `Kripya aate samay ya UPI ke madhyam se jama karein.\n` +
                                      `• UPI ID: annapurnamart@icici\n\n` +
                                      `Dhanyawad! 🛒`;
                                    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-[11px] uppercase tracking-tight flex items-center gap-1 shadow-sm transition-all"
                                  title="Send WhatsApp payment reminder with UPI ID"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>
                              )}

                              {/* Quick Bill */}
                              <Link
                                to="/admin/pos"
                                className="p-1.5 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-[#ea580c] text-gray-600 font-bold transition-colors"
                                title="Create new POS bill for this customer"
                              >
                                <Barcode className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {customers.filter(c => khataFilter === 'due_only' ? (c.outstandingKhataBalance || 0) > 0 : true).length === 0 && (
                <div className="p-12 text-center text-gray-400 font-medium">
                  {khataFilter === 'due_only' ? '✓ Great news! No customers currently have outstanding udhaar dues.' : 'No customers match this search.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Khata Settlement Modal */}
      {settlementCustomer && (
        <KhataSettlementModal
          isOpen={Boolean(settlementCustomer)}
          customer={settlementCustomer}
          onClose={() => setSettlementCustomer(null)}
          onSuccess={() => setSettlementCustomer(null)}
        />
      )}
    </div>
  );
}
