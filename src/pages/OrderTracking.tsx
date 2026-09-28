import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle2, Circle, Package, Truck, Check, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/InvoiceModal';

const STATUS_STEPS = ['placed', 'confirmed', 'packing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = ['Placed', 'Confirmed', 'Packing', 'Out for Delivery', 'Delivered'];

export default function OrderTracking() {
  const { id } = useParams();
  const { user, isAdmin } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        let docSnap = await getDoc(doc(db, 'orders', id));
        if (!docSnap.exists() && !id.startsWith('pos-')) {
          docSnap = await getDoc(doc(db, 'orders', `pos-${id}`));
        }

        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          // Query by billNumber field
          const q = query(collection(db, 'orders'), where('billNumber', '==', id.toUpperCase().replace(/^POS-/, '')));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const firstDoc = qSnap.docs[0];
            setOrder({ id: firstDoc.id, ...firstDoc.data() } as Order);
          } else {
            toast.error("Order not found");
            navigate('/');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'orders', id), {
        orderStatus: newStatus
      });
      setOrder(prev => prev ? { ...prev, orderStatus: newStatus as any } : null);
      toast.success("Status updated");
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleUpdatePaymentStatus = async (status: 'paid' | 'due' | 'partial', amountPaidValue?: number) => {
    if (!id || !isAdmin) return;
    try {
      const updateData: any = { paymentStatus: status };
      if (status === 'paid') {
        updateData.paidAt = new Date();
        updateData.amountPaid = order?.total || 0;
      } else if (status === 'due') {
        updateData.paidAt = null;
        updateData.amountPaid = 0;
      } else if (status === 'partial' && amountPaidValue !== undefined) {
        updateData.amountPaid = (order?.amountPaid || 0) + amountPaidValue;
        if (updateData.amountPaid >= (order?.total || 0)) {
          updateData.paymentStatus = 'paid';
          updateData.paidAt = new Date();
        }
      }
      
      await updateDoc(doc(db, 'orders', id), updateData);
      setOrder(prev => prev ? { ...prev, ...updateData } : null);
      toast.success(`Payment updated successfully`);
    } catch (e) {
      toast.error("Failed to update payment status");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading order details...</div>;
  if (!order) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
      {showInvoice && <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />}
      
      <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8 mb-6">
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Order #{order.id}</h1>
            <p className="text-gray-500 font-medium mb-3">₹{order.total} • {order.items.length} items</p>
            <button 
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight text-[#ea580c] hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-200"
            >
              <Receipt className="w-4 h-4" />
              View Invoice
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`font-black px-3 py-1 rounded text-[10px] uppercase tracking-tight ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-[#ea580c]'}`}>
              {order.orderStatus.replace(/_/g, ' ')}
            </span>
            <div className="flex flex-col items-end gap-2">
              <span className={`font-black px-3 py-1 rounded text-[10px] uppercase tracking-tight ${
                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {order.paymentStatus === 'paid' ? 'PAID' : order.paymentStatus === 'partial' ? `PARTIAL (₹${order.total - (order.amountPaid || 0)} DUE)` : 'DUE / PENDING'}
              </span>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center justify-end gap-2 mt-2 max-w-[250px]">
                <button 
                  onClick={() => handleUpdatePaymentStatus('paid')}
                  disabled={order.paymentStatus === 'paid'}
                  className="text-[10px] font-black uppercase bg-orange-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-50"
                >
                  Mark Full Paid
                </button>
                <button 
                  onClick={() => setShowPartialModal(true)}
                  disabled={order.paymentStatus === 'paid'}
                  className="text-[10px] font-black uppercase bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 disabled:opacity-50"
                >
                  Add Khata Payment
                </button>
                <button 
                  onClick={() => handleUpdatePaymentStatus('due')}
                  disabled={order.paymentStatus === 'due' || order.paymentStatus === 'pending'}
                  className="text-[10px] font-black uppercase bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100 disabled:opacity-50"
                >
                  Reset to Due
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="py-6">
          {isCancelled ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-black">X</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Order Cancelled</h3>
                <p className="text-gray-500 font-medium text-sm">This order has been cancelled.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step} className="flex items-center mb-8 last:mb-0 relative">
                    {/* Line connector */}
                    {index < STATUS_STEPS.length - 1 && (
                      <div className={`absolute left-4 top-10 w-0.5 h-10 ${index < currentStepIndex ? 'bg-[#ea580c]' : 'bg-gray-200'}`} />
                    )}
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${isCompleted ? 'bg-[#ea580c] text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isCompleted ? <Check className="w-5 h-5" strokeWidth={3} /> : <Circle className="w-4 h-4" strokeWidth={3} />}
                    </div>
                    
                    <div className="ml-4">
                      <h3 className={`font-black tracking-tight ${isCurrent ? 'text-[#ea580c] text-lg' : isCompleted ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}`}>
                        {STATUS_LABELS[index]}
                      </h3>
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => handleUpdateStatus(step)}
                        className="ml-auto text-xs font-black uppercase tracking-tight bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                      >
                        Set Status
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {isAdmin && !isCancelled && (
          <div className="mt-8 border-t border-gray-100 pt-6 flex justify-end">
             <button 
                onClick={() => setShowCancelModal(true)}
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-tight transition-colors"
              >
                Cancel Order
              </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8">
          <h2 className="font-black mb-4 tracking-tight text-gray-900 text-lg">Items in this order</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.productId} className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] p-1.5 shrink-0 flex items-center justify-center">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h3>
                  <p className="text-gray-500 font-medium text-xs">{item.quantity} x ₹{item.price}</p>
                </div>
                <div className="ml-auto font-black text-gray-900 text-sm">₹{item.price * item.quantity}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8">
          <h2 className="font-black mb-4 tracking-tight text-gray-900 text-lg">Delivery Details</h2>
          <div className="text-gray-700 text-sm space-y-1.5 font-medium mb-4">
            <p className="font-bold text-gray-900 text-base mb-2">{order.deliveryAddress.fullName}</p>
            <p>{order.deliveryAddress.phone}</p>
            <p>{order.deliveryAddress.houseFlat}, {order.deliveryAddress.streetArea}</p>
            <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</p>
          </div>
          {isAdmin && order.coordinates && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Precise Coordinates</h3>
              <p className="text-gray-500 text-xs font-mono bg-gray-50 p-2 rounded-lg">
                Lat: {order.coordinates.lat.toFixed(6)}, Lng: {order.coordinates.lng.toFixed(6)}
              </p>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${order.coordinates.lat},${order.coordinates.lng}`}
                target="_blank" rel="noreferrer"
                className="text-[#ea580c] text-xs font-bold uppercase tracking-tight mt-2 inline-block hover:underline"
              >
                Open in Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {showPartialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm">
            <h2 className="text-xl font-black mb-2 tracking-tight">Khata Payment</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Balance Due: ₹{order.total - (order.amountPaid || 0)}</p>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Amount Paid (₹)</label>
              <input 
                type="number" 
                value={partialAmount} 
                onChange={e => setPartialAmount(e.target.value)} 
                placeholder="Enter amount"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" 
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPartialModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-colors uppercase tracking-tight">Cancel</button>
              <button 
                onClick={() => {
                  const amt = Number(partialAmount);
                  if (!isNaN(amt) && amt > 0) {
                    handleUpdatePaymentStatus('partial', amt);
                    setShowPartialModal(false);
                    setPartialAmount('');
                  } else {
                    toast.error("Invalid amount");
                  }
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm transition-colors uppercase tracking-tight"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm">
            <h2 className="text-xl font-black mb-2 tracking-tight">Cancel Order</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to cancel this order?</p>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Reason (Optional)</label>
              <input 
                type="text" 
                value={cancelReason} 
                onChange={e => setCancelReason(e.target.value)} 
                placeholder="e.g. Out of stock"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium" 
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-colors uppercase tracking-tight">Close</button>
              <button 
                onClick={() => {
                  handleUpdateStatus('cancelled');
                  setShowCancelModal(false);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-colors uppercase tracking-tight"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
