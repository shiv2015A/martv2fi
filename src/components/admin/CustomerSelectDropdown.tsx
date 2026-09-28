import React, { useState, useRef, useEffect } from 'react';
import { useCustomerStore } from '../../store/useCustomerStore';
import { Customer } from '../../types';
import { 
  User, 
  Phone, 
  Search, 
  UserPlus, 
  Check, 
  ChevronDown, 
  X, 
  BookOpen, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerSelectDropdownProps {
  selectedName: string;
  selectedPhone: string;
  onSelectCustomer: (customer: { name: string; phone: string }) => void;
}

export default function CustomerSelectDropdown({
  selectedName,
  selectedPhone,
  onSelectCustomer
}: CustomerSelectDropdownProps) {
  const { customers, searchCustomers, addCustomer, initCustomerListener } = useCustomerStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New customer form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = initCustomerListener();
    return () => unsub();
  }, [initCustomerListener]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = searchCustomers(searchQuery);

  const activeCustomer = customers.find(c => {
    if (!selectedPhone) return false;
    return c.phone.replace(/[^0-9]/g, '') === selectedPhone.replace(/[^0-9]/g, '');
  });

  const handleSelect = (c: Customer) => {
    onSelectCustomer({ name: c.name, phone: c.phone });
    setIsOpen(false);
    setSearchQuery('');
    toast.success(`Selected customer: ${c.name}`);
  };

  const handleSelectWalkIn = () => {
    onSelectCustomer({ name: 'Walk-in Customer', phone: '' });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    const cleanPhone = newPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSaving(true);
    try {
      await addCustomer({
        name: newName.trim(),
        phone: cleanPhone,
        address: newAddress.trim() || undefined,
        notes: newNotes.trim() || undefined,
        totalOrdersCount: 0,
        totalSpend: 0,
        outstandingKhataBalance: 0
      });

      onSelectCustomer({ name: newName.trim(), phone: cleanPhone });
      setShowAddModal(false);
      setIsOpen(false);
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewNotes('');
      toast.success(`Customer "${newName}" registered & selected!`);
    } catch (err: any) {
      toast.error('Failed to save customer: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Active Customer Trigger Pill */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 hover:border-orange-300 rounded-2xl transition-all">
        <div 
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
          }}
          className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm shrink-0">
            {selectedName && selectedName !== 'Walk-in Customer' ? selectedName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <span className="font-black text-gray-900 text-xs truncate">
                {selectedName || 'Walk-in Customer'}
              </span>
              {selectedPhone && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  +91 {selectedPhone}
                </span>
              )}
              {activeCustomer && (activeCustomer.outstandingKhataBalance || 0) > 0 && (
                <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                  Due: ₹{activeCustomer.outstandingKhataBalance}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-medium block">
              {selectedPhone ? 'Saved Regular Customer' : 'Click to select saved customer or search phone'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedName !== 'Walk-in Customer' && (
            <button
              type="button"
              onClick={handleSelectWalkIn}
              title="Reset to Walk-in Customer"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 text-[10px] font-bold"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
            }}
            className="p-1.5 rounded-lg bg-gray-200/60 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Header */}
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-orange-500 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Mobile Number or Name..."
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action: Walk-in & Add New */}
          <div className="p-2 border-b border-gray-100 flex items-center justify-between gap-2 bg-white">
            <button
              type="button"
              onClick={handleSelectWalkIn}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold text-center transition-colors"
            >
              Default Walk-in
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                // Pre-fill phone if search query looks like a number
                if (/^\d+$/.test(searchQuery)) {
                  setNewPhone(searchQuery);
                } else if (searchQuery) {
                  setNewName(searchQuery);
                }
              }}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#ea580c] text-xs font-black text-center flex items-center justify-center gap-1 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>

          {/* Customer List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-5 text-center text-xs text-gray-500">
                <p className="font-bold text-gray-700">No saved customers found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Would you like to register "{searchQuery}" as a new customer?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(true);
                    if (/^\d+$/.test(searchQuery)) {
                      setNewPhone(searchQuery);
                    } else {
                      setNewName(searchQuery);
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1 bg-[#ea580c] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Customer</span>
                </button>
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = selectedPhone === c.phone || (selectedName === c.name && !selectedPhone);
                const hasKhata = (c.outstandingKhataBalance || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50/80 font-bold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-gray-900 truncate">{c.name}</p>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#ea580c]" />}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>+91 {c.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {hasKhata ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          Khata: ₹{c.outstandingKhataBalance}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {c.totalOrdersCount ? `${c.totalOrdersCount} orders` : 'New customer'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Register New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-2xl bg-orange-100 text-[#ea580c]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">Save New Customer</h3>
                <p className="text-xs text-gray-500 font-medium">Enable fast lookup by phone number for future bills</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-gray-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="98765 43210"
                    className="w-full pl-11 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Flat / House / Area, Landmark"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Customer Notes (Optional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Regular milk buyer / Khata account"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save & Select'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
