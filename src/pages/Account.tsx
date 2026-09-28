import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function Account() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">My Account</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-transparent p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-[#F3F4F6] rounded-full flex items-center justify-center text-[#ea580c] text-3xl font-black shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user.name}</h2>
            <p className="text-gray-500 font-medium mt-1">{user.email}</p>
            {user.phone ? (
              <p className="text-gray-500 font-medium">{user.phone}</p>
            ) : (
              <p className="text-[#ea580c] font-bold text-sm mt-1 cursor-pointer hover:underline">
                + Add Phone Number
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-2xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate('/orders')}>
            <h3 className="font-black text-gray-900 text-lg mb-1">Orders</h3>
            <p className="text-gray-500 text-sm font-medium">Check your order status</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate('/addresses')}>
            <h3 className="font-black text-gray-900 text-lg mb-1">Addresses</h3>
            <p className="text-gray-500 text-sm font-medium">Manage delivery locations</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate('/help')}>
            <h3 className="font-black text-gray-900 text-lg mb-1">Help</h3>
            <p className="text-gray-500 text-sm font-medium">FAQs & Support</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="font-black text-gray-900 mb-4 tracking-tight">App Settings</h3>
          
          <button 
            onClick={() => {
              const showRichNotification = (title: string, body: string) => {
                if (Notification.permission === 'granted') {
                  new Notification(title, { 
                    body, 
                    icon: 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png'
                  });
                }
              };

              if (Notification.permission === 'granted') {
                showRichNotification('Your order is arriving! 🛵', 'Delivery partner is 2 mins away with your items.');
              } else {
                Notification.requestPermission().then(p => {
                  if (p === 'granted') {
                    showRichNotification('Notifications Enabled 🎉', 'You will now get live order updates.');
                  }
                });
              }
            }}
            className="w-full text-left py-4 px-2 rounded-xl hover:bg-gray-50 font-bold text-gray-900 flex justify-between items-center transition-colors mb-2"
          >
            Enable Mobile Notifications
            <span className="text-[#ea580c]">Test</span>
          </button>
        </div>
      </div>

      <button 
        onClick={handleSignOut}
        className="w-full bg-[#FEE2E2] text-[#EF4444] font-black py-4 rounded-xl hover:bg-red-200 transition-colors uppercase tracking-tight text-sm"
      >
        Sign Out
      </button>
    </div>
  );
}
