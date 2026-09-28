import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Address } from '../types';
import toast from 'react-hot-toast';
import { Plus, Trash2, MapPin } from 'lucide-react';

export default function Addresses() {
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    fullName: user?.name || '',
    phone: user?.phone || '',
    houseFlat: '',
    streetArea: '',
    city: '',
    state: '',
    pincode: ''
  });

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.houseFlat || !newAddress.streetArea || !newAddress.pincode) return;

    const addressId = Math.random().toString(36).substring(7);
    const updatedAddresses = [...(user.addresses || []), { ...newAddress, id: addressId } as Address];
    
    try {
      if (!user.uid.startsWith('user-user')) {
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      }
      useAuthStore.setState({ user: { ...user, addresses: updatedAddresses } });
      toast.success('Address saved successfully');
      setShowAdd(false);
      setNewAddress({
        fullName: user.name,
        phone: user.phone || '',
        houseFlat: '',
        streetArea: '',
        city: '',
        state: '',
        pincode: ''
      });
    } catch (err) {
      toast.error('Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    const updatedAddresses = user.addresses.filter(a => a.id !== id);
    try {
      if (!user.uid.startsWith('user-user')) {
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      }
      useAuthStore.setState({ user: { ...user, addresses: updatedAddresses } });
      toast.success('Address removed');
    } catch (err) {
      toast.error('Failed to remove address');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Saved Addresses</h1>
        {!showAdd && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-[#ea580c] bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-tight"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 shadow-sm mb-6 border border-gray-100">
          <h2 className="font-black text-gray-900 mb-4 tracking-tight">Add New Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Full Name</label>
              <input required type="text" value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Phone Number</label>
              <input required type="tel" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">House / Flat / Block</label>
              <input required type="text" value={newAddress.houseFlat} onChange={e => setNewAddress({...newAddress, houseFlat: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Street / Area</label>
              <input required type="text" value={newAddress.streetArea} onChange={e => setNewAddress({...newAddress, streetArea: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">City</label>
              <input required type="text" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">State</label>
              <input required type="text" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">PIN Code</label>
              <input required type="text" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 font-bold text-gray-500 uppercase tracking-tight text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 font-bold text-white bg-[#ea580c] uppercase tracking-tight text-sm hover:bg-[#c2410c] rounded-lg">Save Address</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {(!user.addresses || user.addresses.length === 0) ? (
          <p className="text-gray-500 font-medium text-center py-8">No saved addresses.</p>
        ) : (
          user.addresses.map(addr => (
            <div key={addr.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="mt-1">
                  <MapPin className="w-5 h-5 text-[#ea580c]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">{addr.fullName} <span className="text-gray-500 font-medium text-sm ml-2">{addr.phone}</span></p>
                  <p className="text-gray-600 text-sm font-medium">{addr.houseFlat}, {addr.streetArea}</p>
                  <p className="text-gray-600 text-sm font-medium">{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(addr.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
