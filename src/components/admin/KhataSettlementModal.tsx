import React, { useState } from 'react';
import { Customer } from '../../types';
import { useCustomerStore } from '../../store/useCustomerStore';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  QrCode, 
  BookOpen, 
  Share2, 
  Printer, 
  Receipt,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { soundEngine } from '../../utils/audio';

interface KhataSettlementModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess?: (settlement: {
    customerName: string;
    customerPhone: string;
    amountPaid: number;
    previousBalance: number;
    newBalance: number;
    paymentMode: 'cash' | 'upi';
  }) => void;
}

export default function KhataSettlementModal({
  isOpen,
  customer,
  onClose,
  onSuccess
}: KhataSettlementModalProps) {
  const { recordKhataSettlement } = useCustomerStore();

  const [amountPaid, setAmountPaid] = useState<number | ''>(() => {
    return customer?.outstandingKhataBalance ? customer.outstandingKhataBalance : '';
  });
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [notes, setNotes] = useState('Counter Khata payment received');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlementSuccessData, setSettlementSuccessData] = useState<{
    customerName: string;
    customerPhone: string;
    amountPaid: number;
    previousBalance: number;
    newBalance: number;
    paymentMode: 'cash' | 'upi';
    receiptId: string;
    date: Date;
  } | null>(null);

  if (!isOpen || !customer) return null;

  const currentDue = customer.outstandingKhataBalance || 0;
  const payNum = typeof amountPaid === 'number' ? amountPaid : 0;
  const newBalance = Math.max(0, currentDue - payNum);
  const changeDue = typeof cashTendered === 'number' && cashTendered > payNum ? cashTendered - payNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payNum <= 0) {
      toast.error('Please enter a valid received amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordKhataSettlement(customer.id, payNum, paymentMode, notes);
      soundEngine.playSaleSuccess();
      toast.success(`₹${payNum} received from ${customer.name}! Khata updated.`);

      const receiptId = `KHT-${Date.now().toString().slice(-6)}`;
      const successInfo = {
        customerName: customer.name,
        customerPhone: customer.phone,
        amountPaid: payNum,
        previousBalance: currentDue,
        newBalance,
        paymentMode,
        receiptId,
        date: new Date()
      };

      setSettlementSuccessData(successInfo);
      if (onSuccess) onSuccess(successInfo);
    } catch (err: any) {
      toast.error('Failed to update Khata: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!customer?.phone) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const msg = `🙏 *Annapurna Mart - Khata Receipt*\n` +
      `Namaste ${customer.name} ji,\n` +
      `Aapka Khata Bhugtan (Payment) prapt hua:\n` +
      `• *Jama Rashi (Received)*: ₹${settlementSuccessData?.amountPaid || payNum}\n` +
      `• *Madhyam (Mode)*: ${paymentMode.toUpperCase()}\n` +
      `• *Purani Baki (Old Balance)*: ₹${currentDue}\n` +
      `• *Nayi Baki Rashi (Current Due)*: ₹${settlementSuccessData ? settlementSuccessData.newBalance : newBalance}\n\n` +
      `Annapurna Mart par aane ke liye dhanyawad! 🛒`;

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8 border border-gray-100">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>

        {!settlementSuccessData ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-800">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Khata Jama (Receive Payment)
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Record money collected to clear customer udhaar
                </p>
              </div>
            </div>

            {/* Customer Header Pill */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                    Customer Account
                  </span>
                  <p className="text-sm font-black text-gray-900">{customer.name}</p>
                  <p className="text-xs font-mono text-gray-600">+91 {customer.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                    Current Udhaar Due
                  </span>
                  <span className="text-xl font-black text-red-600">₹{currentDue}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Amount to pay */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                    Amount Received / Jama Rashi (₹) *
                  </label>
                  <span className="text-[11px] font-bold text-gray-500">
                    Remaining: <strong className="text-gray-900">₹{newBalance}</strong>
                  </span>
                </div>
                <input
                  required
                  type="number"
                  min="1"
                  max={currentDue > 0 ? currentDue * 2 : 100000}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value ? Number(e.target.value) : '')}
                  placeholder={`e.g. ${currentDue}`}
                  className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />

                {/* Quick amount shortcuts */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(currentDue)}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-black transition-colors"
                  >
                    Full Due (₹{currentDue})
                  </button>
                  {[100, 200, 500, 1000, 2000].filter(v => v < currentDue).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountPaid(val)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        amountPaid === val 
                          ? 'bg-[#ea580c] text-white border-[#ea580c]' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1.5">
                  Payment Mode Received
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black uppercase transition-all ${
                      paymentMode === 'cash'
                        ? 'border-[#ea580c] bg-orange-50 text-[#ea580c]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black uppercase transition-all ${
                      paymentMode === 'upi'
                        ? 'border-[#ea580c] bg-orange-50 text-[#ea580c]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>
                </div>
              </div>

              {/* Cash tendered if Cash */}
              {paymentMode === 'cash' && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-600">Cash Note Given (₹)</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 500"
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-right font-bold text-xs"
                    />
                  </div>
                  {changeDue > 0 && (
                    <div className="flex justify-between items-center text-xs font-black text-emerald-700 pt-1 border-t border-gray-200">
                      <span>Change to return:</span>
                      <span>₹{changeDue}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Settlement Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Remark / Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at evening, GPay settlement"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || payNum <= 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-tight shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording Payment...' : `Confirm Jama ₹${payNum}`}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Settlement Confirmation Slip */
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">
                Khata Payment Recorded!
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Receipt #{settlementSuccessData.receiptId} • Saved to customer ledger
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-gray-900">{settlementSuccessData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Received:</span>
                <span className="font-black text-emerald-600 text-sm">₹{settlementSuccessData.amountPaid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Mode:</span>
                <span className="font-bold uppercase text-gray-800">{settlementSuccessData.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Previous Balance:</span>
                <span className="font-bold text-gray-700">₹{settlementSuccessData.previousBalance}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                <span className="text-gray-900">New Outstanding Due:</span>
                <span className={`font-black ${settlementSuccessData.newBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ₹{settlementSuccessData.newBalance}
                </span>
              </div>
            </div>

            {/* WhatsApp Share Button */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-3 rounded-xl text-xs uppercase tracking-tight flex items-center justify-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Send WhatsApp Khata Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
