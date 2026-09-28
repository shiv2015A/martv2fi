import React, { useState } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { addDoc, doc, setDoc, updateDoc, collection, serverTimestamp, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Address } from '../types';
import toast from 'react-hot-toast';
import { MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';

export default function Checkout() {
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState<Partial<Address>>({
    fullName: user?.name || '',
    phone: user?.phone || '',
    houseFlat: '',
    streetArea: '',
    city: '',
    state: '',
    pincode: ''
  });

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = 20;
  const total = subtotal + deliveryFee;

  React.useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  if (items.length === 0) {
    return null;
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Precise location captured!");
      },
      (err) => {
        setLocating(false);
        toast.error("Failed to get precise location. Please enable location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (!address.phone || address.phone.length < 10) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    if (!coordinates) {
      toast.error("Precise location is compulsory. Please detect location first.");
      return;
    }

    setPlacingOrder(true);
    try {
      const sanitizedUserName = (user.name || 'guest').replace(/[^a-zA-Z0-9]/g, '');
      const orderId = `${sanitizedUserName}-${format(new Date(), 'E-dd-HH:mm-yyyy')}`;

      const batch = writeBatch(db);

      // 1. Prepare Order doc
      const orderRef = doc(db, 'orders', orderId);
      batch.set(orderRef, {
        userId: user.uid,
        items,
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        amountPaid: 0,
        orderStatus: 'placed',
        orderType: 'online',
        deliveryAddress: address,
        coordinates: coordinates,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Atomically decrement stock for all items
      for (const item of items) {
        const prodRef = doc(db, 'products', item.productId);
        batch.update(prodRef, {
          stock: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();

      // Update user phone number if needed
      if (address.phone && address.phone !== user.phone) {
        try {
          if (!user.uid.startsWith('user-user')) {
             await updateDoc(doc(db, 'users', user.uid), { phone: address.phone });
          }
        } catch (e) {
          console.error("Failed to update user profile phone", e);
        }
      }

      clearCart();
      toast.success('Order placed successfully! Stock updated.');
      navigate(`/order/${orderId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSelectSavedAddress = (savedAddr: Address) => {
    setAddress({
      fullName: savedAddr.fullName,
      phone: savedAddr.phone,
      houseFlat: savedAddr.houseFlat,
      streetArea: savedAddr.streetArea,
      city: savedAddr.city,
      state: savedAddr.state,
      pincode: savedAddr.pincode
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Checkout</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {user && user.addresses && user.addresses.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8 mb-6">
              <h2 className="font-black mb-4 text-xl text-gray-900 tracking-tight">Saved Addresses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.addresses.map(addr => (
                  <div 
                    key={addr.id} 
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-[#ea580c] hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#ea580c] mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{addr.fullName}</p>
                        <p className="text-gray-500 text-xs mt-1">{addr.houseFlat}, {addr.streetArea}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form id="checkout-form" onSubmit={handlePlaceOrder} className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8">
            <h2 className="font-black mb-6 text-xl text-gray-900 tracking-tight">Delivery Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-start gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Precise Location Required</h3>
                  <p className="text-xs text-gray-500 mt-1">We need your exact coordinates for 10-minute delivery.</p>
                </div>
                {coordinates ? (
                  <div className="flex items-center gap-2 text-[#ea580c] bg-orange-50 px-3 py-2 rounded-lg text-sm font-bold w-full">
                    <MapPin className="w-4 h-4" /> Location Captured
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleGetLocation} 
                    disabled={locating}
                    className="flex items-center justify-center gap-2 bg-[#ea580c] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#c2410c] w-full uppercase tracking-tight disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4" />
                    {locating ? 'Detecting...' : 'Detect My Location'}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Full Name</label>
                <input required type="text" value={address.fullName} onChange={e => setAddress({...address, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Phone Number</label>
                <input required type="tel" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">House / Flat / Block</label>
                <input required type="text" value={address.houseFlat} onChange={e => setAddress({...address, houseFlat: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Street / Area</label>
                <input required type="text" value={address.streetArea} onChange={e => setAddress({...address, streetArea: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">City</label>
                <input required type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">State</label>
                <input required type="text" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">PIN Code</label>
                <input required type="text" value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
              </div>
            </div>

            <h2 className="font-black mb-4 mt-8 text-xl text-gray-900 tracking-tight">Payment Method</h2>
            <div className="border border-[#ea580c] bg-orange-50/50 rounded-2xl p-4 flex items-center gap-3">
              <input type="radio" checked readOnly className="w-4 h-4 text-[#ea580c] focus:ring-[#ea580c]" />
              <span className="font-black text-[#ea580c]">Cash on Delivery (COD)</span>
            </div>
          </form>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sticky top-24">
            <h2 className="font-black mb-4 text-gray-900 tracking-tight">Order Summary</h2>
            <div className="space-y-3 text-sm mb-6 border-b border-gray-100 pb-4">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-gray-700">
                  <span className="truncate pr-4 font-medium">{item.quantity}x {item.name}</span>
                  <span className="shrink-0 font-bold">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Subtotal</span>
                <span className="text-gray-900 font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Delivery Fee</span>
                <span className="text-gray-900 font-bold">₹{deliveryFee}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-lg text-gray-900">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
            <button 
              form="checkout-form"
              type="submit"
              disabled={placingOrder}
              className="w-full bg-[#ea580c] text-white font-black py-3.5 rounded-xl hover:bg-[#c2410c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-tight text-sm"
            >
              {placingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
