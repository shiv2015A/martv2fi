import React from 'react';
import { X, Printer } from 'lucide-react';
import { Order } from '../types';
import { format } from 'date-fns';
import Logo from './Logo';
import Barcode from './Barcode';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative invoice-container">
        
        {/* Header - Hidden when printing */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 print:hidden">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Invoice</h2>
          <div className="flex gap-2">
            <button
              onClick={printInvoice}
              className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 print:p-0 bg-white">
          <div className="flex justify-between items-start mb-8">
            <div>
              <Logo size="sm" variant="badge" className="mb-2" />
              <p className="text-gray-500 text-xs font-medium mt-1">123 Supermarket Road, Delhi - 110001</p>
              <p className="text-gray-500 text-xs font-medium">GSTIN: 07AABCU9603R1ZM • Ph: +91 98765 43210</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-gray-900 mb-1">INVOICE</h2>
              <p className="text-gray-500 font-mono font-bold text-xs">#{order.billNumber || order.id.toUpperCase()}</p>
              <p className="text-gray-500 font-medium text-xs">
                Date: {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPP') : 'N/A'}
              </p>
              <div className="mt-2 flex justify-end">
                <Barcode value={order.billNumber || order.id.slice(0, 12)} width={140} height={32} showText={false} />
              </div>
            </div>
          </div>

          <div className="mb-8 border-t border-b border-gray-100 py-4">
            <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-tight text-xs">Billed To</h3>
            <p className="font-bold text-gray-900">{order.deliveryAddress.fullName}</p>
            <p className="text-gray-600 text-sm">{order.deliveryAddress.phone}</p>
            <p className="text-gray-600 text-sm">{order.deliveryAddress.houseFlat}, {order.deliveryAddress.streetArea}</p>
            <p className="text-gray-600 text-sm">{order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</p>
          </div>

          <table className="w-full text-left mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="py-3 font-bold text-gray-900 text-sm uppercase tracking-tight">Item</th>
                <th className="py-3 font-bold text-gray-900 text-sm uppercase tracking-tight text-center">Qty</th>
                <th className="py-3 font-bold text-gray-900 text-sm uppercase tracking-tight text-right">Price</th>
                <th className="py-3 font-bold text-gray-900 text-sm uppercase tracking-tight text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.productId}>
                  <td className="py-4">
                    <p className="font-bold text-gray-900">{item.name}</p>
                  </td>
                  <td className="py-4 text-center text-gray-600 font-medium">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-600 font-medium">₹{item.price}</td>
                  <td className="py-4 text-right font-bold text-gray-900">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-1/2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900">₹{order.total}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Delivery Fee</span>
                <span className="font-bold text-[#ea580c]">Free</span>
              </div>
              <div className="flex justify-between py-4">
                <span className="font-black text-xl text-gray-900">Total</span>
                <span className="font-black text-xl text-[#ea580c]">₹{order.total}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-500 font-medium border-t border-gray-100 pt-6">
            <p>Thank you for shopping with Annapurna Mart!</p>
            <p>This is a computer generated invoice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
