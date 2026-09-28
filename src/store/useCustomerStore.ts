import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc,
  updateDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Customer } from '../types';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchCustomers: (query: string) => Customer[];
  getCustomerByPhone: (phone: string) => Customer | undefined;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateKhataBalance: (customerId: string, delta: number) => Promise<void>;
  recordCustomerPurchase: (
    phone: string, 
    name: string, 
    totalBillAmount: number, 
    udhaarDeltaAmount: number,
    details?: { billNumber?: string; notes?: string; paidAmount?: number }
  ) => Promise<void>;
  recordKhataSettlement: (
    customerId: string, 
    amountPaid: number, 
    paymentMode: 'cash' | 'upi', 
    notes?: string
  ) => Promise<void>;
  initCustomerListener: () => () => void;
}

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_sample_1',
    name: 'Ramesh Kumar',
    phone: '9810123456',
    address: 'Flat 402, Shanti Kunj, Delhi',
    totalOrdersCount: 14,
    totalSpend: 7850,
    outstandingKhataBalance: 0,
    notes: 'Regular morning dairy & grocery buyer'
  },
  {
    id: 'cust_sample_2',
    name: 'Sunita Sharma',
    phone: '9876543210',
    address: 'House 12, Sector 4, Noida',
    totalOrdersCount: 22,
    totalSpend: 15400,
    outstandingKhataBalance: 320,
    notes: 'Monthly staples & dry fruits'
  },
  {
    id: 'cust_sample_3',
    name: 'Amit Verma',
    phone: '9988776655',
    address: 'Shop 5, Main Market, Delhi',
    totalOrdersCount: 8,
    totalSpend: 4200,
    outstandingKhataBalance: 0,
    notes: 'Beverages & snacks buyer'
  },
  {
    id: 'cust_sample_4',
    name: 'Priya Singh',
    phone: '9123456789',
    address: 'B-24, Mayur Vihar, Delhi',
    totalOrdersCount: 18,
    totalSpend: 9600,
    outstandingKhataBalance: 0,
    notes: 'Organic fruits & vegetables'
  }
];

export const useCustomerStore = create<CustomerState>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    customers: DEFAULT_CUSTOMERS,
    loading: false,
    searchQuery: '',

    setSearchQuery: (q: string) => set({ searchQuery: q }),

    searchCustomers: (query: string) => {
      const clean = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const { customers } = get();
      if (!clean) return customers;

      return customers.filter(c => {
        const phoneClean = c.phone.replace(/[^0-9]/g, '');
        const nameClean = c.name.toLowerCase();
        return phoneClean.includes(clean) || nameClean.includes(query.trim().toLowerCase());
      });
    },

    getCustomerByPhone: (phone: string) => {
      const clean = phone.trim().replace(/[^0-9]/g, '');
      if (!clean) return undefined;
      const { customers } = get();
      return customers.find(c => c.phone.replace(/[^0-9]/g, '') === clean);
    },

    addCustomer: async (data) => {
      const colRef = collection(db, 'customers');
      const cleanPhone = data.phone.replace(/[^0-9]/g, '');
      const docRef = await addDoc(colRef, {
        ...data,
        phone: cleanPhone,
        totalOrdersCount: data.totalOrdersCount || 1,
        totalSpend: data.totalSpend || 0,
        outstandingKhataBalance: data.outstandingKhataBalance || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update local state immediately for instant UI responsiveness
      const newCust: Customer = {
        id: docRef.id,
        ...data,
        phone: cleanPhone,
        totalOrdersCount: data.totalOrdersCount || 1,
        totalSpend: data.totalSpend || 0,
        outstandingKhataBalance: data.outstandingKhataBalance || 0
      };
      set(state => ({ customers: [newCust, ...state.customers] }));
      return docRef.id;
    },

    updateKhataBalance: async (customerId: string, delta: number) => {
      // Local optimistic update
      set(state => ({
        customers: state.customers.map(c => 
          c.id === customerId 
            ? { ...c, outstandingKhataBalance: Math.max(0, (c.outstandingKhataBalance || 0) + delta) }
            : c
        )
      }));

      try {
        const ref = doc(db, 'customers', customerId);
        await updateDoc(ref, {
          outstandingKhataBalance: increment(delta),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore updateKhataBalance warning (may be sample data):', err);
      }
    },

    recordCustomerPurchase: async (
      phone: string, 
      name: string, 
      totalBillAmount: number, 
      udhaarDeltaAmount: number,
      details?: { billNumber?: string; notes?: string; paidAmount?: number }
    ) => {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5) return;

      const { customers } = get();
      const existing = customers.find(c => c.phone.replace(/[^0-9]/g, '') === cleanPhone);

      // Local optimistic update
      if (existing) {
        set(state => ({
          customers: state.customers.map(c => 
            c.id === existing.id 
              ? { 
                  ...c, 
                  totalOrdersCount: (c.totalOrdersCount || 0) + 1,
                  totalSpend: (c.totalSpend || 0) + totalBillAmount,
                  outstandingKhataBalance: (c.outstandingKhataBalance || 0) + udhaarDeltaAmount
                }
              : c
          )
        }));

        try {
          const ref = doc(db, 'customers', existing.id);
          await updateDoc(ref, {
            totalOrdersCount: increment(1),
            totalSpend: increment(totalBillAmount),
            outstandingKhataBalance: increment(udhaarDeltaAmount),
            updatedAt: serverTimestamp()
          });

          // Also record Khata ledger entry if there was credit or payment
          if (udhaarDeltaAmount > 0 || (details?.paidAmount && details.paidAmount > 0)) {
            const ledgerCol = collection(db, 'khata_entries');
            await addDoc(ledgerCol, {
              customerId: existing.id,
              customerName: existing.name,
              customerPhone: cleanPhone,
              billNumber: details?.billNumber || 'POS',
              type: udhaarDeltaAmount > 0 ? 'debit_credit' : 'sale',
              totalBill: totalBillAmount,
              paidAmount: details?.paidAmount || 0,
              khataBalanceAdded: udhaarDeltaAmount,
              notes: details?.notes || '',
              createdAt: serverTimestamp()
            });
          }
        } catch {
          // If sample data, local update is already set
        }
      } else if (name && name !== 'Walk-in Customer') {
        const newCustObj: Customer = {
          id: `cust_${Date.now()}`,
          name: name.trim(),
          phone: cleanPhone,
          totalOrdersCount: 1,
          totalSpend: totalBillAmount,
          outstandingKhataBalance: udhaarDeltaAmount,
          notes: details?.notes || 'Created via POS Counter',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set(state => ({ customers: [newCustObj, ...state.customers] }));

        try {
          const colRef = collection(db, 'customers');
          const docRef = await addDoc(colRef, {
            name: name.trim(),
            phone: cleanPhone,
            totalOrdersCount: 1,
            totalSpend: totalBillAmount,
            outstandingKhataBalance: udhaarDeltaAmount,
            notes: details?.notes || 'Created via POS Counter',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          if (udhaarDeltaAmount > 0) {
            const ledgerCol = collection(db, 'khata_entries');
            await addDoc(ledgerCol, {
              customerId: docRef.id,
              customerName: name.trim(),
              customerPhone: cleanPhone,
              billNumber: details?.billNumber || 'POS',
              type: 'credit',
              totalBill: totalBillAmount,
              paidAmount: details?.paidAmount || 0,
              khataBalanceAdded: udhaarDeltaAmount,
              notes: details?.notes || '',
              createdAt: serverTimestamp()
            });
          }
        } catch {}
      }
    },

    recordKhataSettlement: async (customerId: string, amountPaid: number, paymentMode: 'cash' | 'upi', notes?: string) => {
      if (amountPaid <= 0) return;
      const { customers } = get();
      const existing = customers.find(c => c.id === customerId);

      // Local optimistic update
      set(state => ({
        customers: state.customers.map(c => 
          c.id === customerId 
            ? { ...c, outstandingKhataBalance: Math.max(0, (c.outstandingKhataBalance || 0) - amountPaid) }
            : c
        )
      }));

      try {
        const ref = doc(db, 'customers', customerId);
        await updateDoc(ref, {
          outstandingKhataBalance: increment(-amountPaid),
          updatedAt: serverTimestamp()
        });

        // Add payment receipt entry to ledger
        const ledgerCol = collection(db, 'khata_entries');
        await addDoc(ledgerCol, {
          customerId,
          customerName: existing?.name || 'Customer',
          customerPhone: existing?.phone || '',
          type: 'settlement',
          amountSettled: amountPaid,
          paymentMode,
          notes: notes || 'Khata dues settlement at counter',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Khata settlement write warning:', err);
      }
    },

    initCustomerListener: () => {
      if (unsubscribe) return unsubscribe;

      const colRef = collection(db, 'customers');
      unsubscribe = onSnapshot(
        colRef,
        (snap) => {
          const fetched: Customer[] = [];
          snap.forEach(d => {
            const data = d.data();
            fetched.push({
              id: d.id,
              name: data.name || '',
              phone: data.phone || '',
              email: data.email,
              address: data.address,
              totalOrdersCount: Number(data.totalOrdersCount) || 0,
              totalSpend: Number(data.totalSpend) || 0,
              outstandingKhataBalance: Number(data.outstandingKhataBalance) || 0,
              notes: data.notes || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });

          if (fetched.length > 0) {
            // Merge with default customers avoiding phone duplicates
            const phoneSet = new Set(fetched.map(c => c.phone));
            const merged = [...fetched];
            DEFAULT_CUSTOMERS.forEach(dc => {
              if (!phoneSet.has(dc.phone)) {
                merged.push(dc);
              }
            });
            set({ customers: merged, loading: false });
          }
        },
        (err) => {
          console.error("Customers onSnapshot error:", err);
        }
      );

      return () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
    }
  };
});
