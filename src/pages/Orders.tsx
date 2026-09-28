import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order } from '../types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user]);

  if (loading) {
    return <div className="max-w-4xl mx-auto p-4 py-8 animate-pulse text-gray-500 font-medium">Loading orders...</div>;
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'due') return o.paymentStatus === 'due' || o.paymentStatus === 'pending' || o.paymentStatus === 'partial';
    if (filter === 'paid') return o.paymentStatus === 'paid';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-black mb-6 tracking-tight text-gray-900">My Orders</h1>
      
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
        {(['all', 'due', 'paid'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-tight shrink-0 transition-colors ${
              filter === f ? 'bg-[#ea580c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-transparent text-center">
          <p className="text-gray-500 mb-6 font-medium">No orders found.</p>
          <button onClick={() => navigate('/')} className="bg-[#ea580c] text-white px-8 py-3 rounded-xl font-black uppercase tracking-tight text-sm hover:bg-[#c2410c] transition-colors">
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(o => (
            <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group" onClick={() => navigate(`/order/${o.id}`)}>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-black text-gray-900">Order #{o.id}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-tight ${
                    o.orderStatus === 'delivered' ? 'bg-orange-100 text-[#ea580c]' : o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-[#DBEAFE] text-[#2563EB]'
                  }`}>
                    {o.orderStatus}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-tight ${
                    o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : o.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {o.paymentStatus === 'paid' ? 'PAID' : o.paymentStatus === 'partial' ? `PARTIAL (₹${o.total - (o.amountPaid || 0)} DUE)` : 'DUE / PENDING'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1 font-medium">
                  Ordered: {o.createdAt?.toDate ? format(o.createdAt.toDate(), 'PP p') : 'Just now'}
                </p>
                {o.paymentStatus === 'paid' && o.paidAt && (
                   <p className="text-xs text-green-600 mb-1 font-bold">
                     Paid on: {o.paidAt.toDate ? format(o.paidAt.toDate(), 'PP p') : 'Recently'}
                   </p>
                )}
                {o.paymentStatus === 'partial' && (
                   <p className="text-xs text-orange-600 mb-1 font-bold">
                     Paid so far: ₹{o.amountPaid || 0}
                   </p>
                )}
                <p className="text-sm text-gray-900 font-bold mt-2">{o.items.length} items • ₹{o.total}</p>
              </div>
              <div className="flex -space-x-2 overflow-hidden">
                {o.items.slice(0, 4).map((item, i) => (
                  <div key={i} className="inline-block h-12 w-12 rounded-xl ring-2 ring-white bg-[#F3F4F6] p-1.5 shrink-0">
                    <img className="w-full h-full object-contain mix-blend-multiply" src={item.imageUrl} alt={item.name} />
                  </div>
                ))}
                {o.items.length > 4 && (
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-white bg-gray-100 text-xs font-black text-gray-600 z-10">
                    +{o.items.length - 4}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
