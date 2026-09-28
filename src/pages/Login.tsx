import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import Logo from '../components/Logo';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin' && password === 'admin123') {
      localStorage.setItem('fake_admin', 'true');
      useAuthStore.getState().init();
      toast.success('Logged in as Admin');
      navigate('/admin');
      return;
    }

    if (email.startsWith('user') && password === 'user123') {
      localStorage.setItem('fake_user', email);
      useAuthStore.getState().init();
      toast.success('Logged in as Demo User');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
        navigate('/');
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', user.uid), {
          name,
          email,
          role: 'customer',
          addresses: [],
          createdAt: serverTimestamp()
        });
        toast.success('Account created successfully');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl shadow-sm border border-transparent p-8">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
        <h1 className="text-xl font-black text-center text-gray-900 mb-8 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Email or Username</label>
            <input required type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-tight">Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#ea580c] outline-none text-sm font-medium" minLength={6} />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#ea580c] text-white font-black py-4 rounded-xl hover:bg-[#c2410c] transition-colors mt-6 disabled:opacity-70 uppercase tracking-tight text-sm"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-500 font-medium text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-[#ea580c] font-black hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
