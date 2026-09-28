import React from 'react';
import { HelpCircle, Phone, Mail, MessageCircle } from 'lucide-react';

export default function Help() {
  const faqs = [
    { q: "How long does delivery take?", a: "We strive to deliver all orders within 10 minutes of order confirmation." },
    { q: "Do you offer Udhaar/Credit?", a: "Yes, we support due payments for regular customers. Contact support to get approved." },
    { q: "How can I return an item?", a: "You can return items at the door during delivery, or drop them at our store within 24 hours." },
    { q: "What payment methods do you accept?", a: "We accept Cash on Delivery (COD), UPI, and Udhaar for verified accounts." }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Help & Support</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a href="tel:18001234567" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-[#ea580c] transition-colors">
          <Phone className="w-6 h-6 text-[#ea580c] mb-2" />
          <h3 className="font-bold text-gray-900">Call Us</h3>
          <p className="text-xs text-gray-500 mt-1">1800-123-4567</p>
        </a>
        <a href="mailto:support@annapurnamart.com" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-[#ea580c] transition-colors">
          <Mail className="w-6 h-6 text-[#ea580c] mb-2" />
          <h3 className="font-bold text-gray-900">Email</h3>
          <p className="text-xs text-gray-500 mt-1">support@annapurna.com</p>
        </a>
        <a href="#" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-[#ea580c] transition-colors">
          <MessageCircle className="w-6 h-6 text-[#ea580c] mb-2" />
          <h3 className="font-bold text-gray-900">Chat</h3>
          <p className="text-xs text-gray-500 mt-1">Live Support</p>
        </a>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-[#ea580c]" />
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 text-sm font-medium leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
