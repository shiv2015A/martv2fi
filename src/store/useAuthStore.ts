import { create } from 'zustand';
import { User } from '../types';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  init: () => void;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  isAdmin: false,
  init: () => {
    // Check for hardcoded admin first
    if (localStorage.getItem('fake_admin') === 'true') {
      const adminUser: User = { uid: 'admin-hardcoded', name: 'Admin', email: 'admin', role: 'admin', addresses: [], createdAt: new Date() };
      set({ user: adminUser, isAdmin: true, loading: false });
      return;
    }

    // Check for hardcoded user first
    const fakeUserEmail = localStorage.getItem('fake_user');
    if (fakeUserEmail) {
      const dummyUser: User = { uid: `user-${fakeUserEmail}`, name: 'Demo User', email: fakeUserEmail, role: 'customer', addresses: [], createdAt: new Date() };
      set({ user: dummyUser, isAdmin: false, loading: false });
      return;
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          set({
            user: { ...userData, uid: firebaseUser.uid },
            isAdmin: userData.role === 'admin',
            loading: false,
          });
        } else {
          set({ user: null, isAdmin: false, loading: false });
        }
      } else {
        set({ user: null, isAdmin: false, loading: false });
      }
    });
  },
  signOut: async () => {
    if (localStorage.getItem('fake_admin') === 'true') {
      localStorage.removeItem('fake_admin');
      set({ user: null, isAdmin: false });
      return;
    }
    if (localStorage.getItem('fake_user')) {
      localStorage.removeItem('fake_user');
      set({ user: null, isAdmin: false });
      return;
    }
    await firebaseSignOut(auth);
    set({ user: null, isAdmin: false });
  },
  setUser: (user) => set({ user, isAdmin: user?.role === 'admin' })
}));
