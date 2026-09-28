import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../firebase/config';
import { Product, CartItem } from '../../types';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  setDoc, 
  writeBatch, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Barcode as BarcodeIcon, 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  BookOpen, 
  Volume2, 
  RotateCcw,
  Sparkles,
  Camera,
  X,
  PackagePlus,
  ArrowRight,
  SlidersHorizontal,
  PauseCircle,
  PlayCircle,
  Share2,
  Send,
  ShoppingBag,
  Tag,
  User
} from 'lucide-react';
import Barcode from '../../components/Barcode';
import Logo from '../../components/Logo';
import { soundEngine, ScannerSoundStyle } from '../../utils/audio';
import CustomStockModal from '../../components/admin/CustomStockModal';
import ScannerSetupModal from '../../components/admin/ScannerSetupModal';
import CustomerSelectDropdown from '../../components/admin/CustomerSelectDropdown';
import QuickProductCatalogPicker from '../../components/admin/QuickProductCatalogPicker';
import KhataSettlementModal from '../../components/admin/KhataSettlementModal';
import { useCustomerStore } from '../../store/useCustomerStore';

// Quick grocery image presets for new product fast creation
const GROCERY_IMAGE_PRESETS = [
  { label: 'Atta / Flour', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', cat: 'Staples' },
  { label: 'Milk / Dairy', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80', cat: 'Dairy' },
  { label: 'Oil / Ghee', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80', cat: 'Staples' },
  { label: 'Vegetables', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80', cat: 'Fruits & Vegetables' },
  { label: 'Snacks / Chips', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80', cat: 'Snacks' },
  { label: 'Spices / Masala', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80', cat: 'Staples' },
  { label: 'Beverages', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', cat: 'Beverages' },
  { label: 'Rice / Dal', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80', cat: 'Staples' },
];

interface POSLineItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function POSBilling() {
  const { user } = useAuthStore();
  const { 
    products, 
    loading, 
    findProductByBarcode, 
    addNewProductWithBarcode, 
    restockProduct,
    initRealtimeListener 
  } = useInventoryStore();

  // Active bill state
  const [billItems, setBillItems] = useState<POSLineItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'udhaar'>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0); // 0% or 5% GST

  // Khata (Udhaar / Credit) Indian Kirana store states
  const [khataAmountReceived, setKhataAmountReceived] = useState<number | ''>('');
  const [khataReceivedPaymentMode, setKhataReceivedPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [khataCashTendered, setKhataCashTendered] = useState<number | ''>('');
  const [khataPromiseDate, setKhataPromiseDate] = useState<string>('');
  const [khataNotes, setKhataNotes] = useState<string>('');
  const [showKhataSettlementModal, setShowKhataSettlementModal] = useState<boolean>(false);

  // Customer store sync & matched customer lookup
  const { customers } = useCustomerStore();
  const matchedCustomer = React.useMemo(() => {
    const clean = customerPhone.replace(/[^0-9]/g, '');
    if (!clean) return undefined;
    return customers.find(c => c.phone.replace(/[^0-9]/g, '') === clean);
  }, [customers, customerPhone]);
  const currentCustomerKhataBalance = matchedCustomer?.outstandingKhataBalance || 0;

  // View Mode: 'catalog' (manual touch product selection) | 'cart' (bill items table) | 'split'
  const [activeLeftTab, setActiveLeftTab] = useState<'catalog' | 'cart' | 'split'>('catalog');

  // Parked / Held Bills system
  interface HeldBill {
    id: string;
    customerName: string;
    customerPhone: string;
    items: POSLineItem[];
    subtotal: number;
    timestamp: Date;
  }
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);

  // Memoized map of product ID to quantity in bill for lightning fast badges
  const billItemMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    billItems.forEach(i => {
      map[i.product.id] = i.quantity;
    });
    return map;
  }, [billItems]);

  // Barcode scanner inputs & status
  const [scannerInput, setScannerInput] = useState('');
  const [autoFocusScanner, setAutoFocusScanner] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [identifiedStatus, setIdentifiedStatus] = useState<{
    type: 'existing' | 'new' | 'out_of_stock';
    barcode: string;
    product?: Product;
    timestamp: number;
  } | null>(null);

  // New product modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newBarcode, setNewBarcode] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Generic');
  const [newProdCategory, setNewProdCategory] = useState('Staples');
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('');
  const [newProdMrp, setNewProdMrp] = useState<number | ''>('');
  const [newProdStock, setNewProdStock] = useState<number | ''>(50);
  const [newProdUnit, setNewProdUnit] = useState('1 pc');
  const [newProdImage, setNewProdImage] = useState(GROCERY_IMAGE_PRESETS[0].url);
  const [savingProduct, setSavingProduct] = useState(false);

  // Printing & checkout state
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [customStockProduct, setCustomStockProduct] = useState<Product | null>(null);

  // Hardware scanner connection verification & audio settings state
  const [scannerConnected, setScannerConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('annapurna_scanner_verified') === 'true';
    }
    return false;
  });
  const [scannerDeviceName, setScannerDeviceName] = useState<string>('USB / Bluetooth Scanner');
  const [showScannerSetupModal, setShowScannerSetupModal] = useState(false);
  const [currentSoundStyle, setCurrentSoundStyle] = useState<ScannerSoundStyle>(soundEngine.soundStyle);
  const [currentVolume, setCurrentVolume] = useState<number>(soundEngine.getVolume());

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Initialize real-time listener for products
  useEffect(() => {
    const unsub = initRealtimeListener();
    return () => unsub();
  }, [initRealtimeListener]);

  // Global hardware scanner keystroke listener (hardware scanners send rapid characters + Enter)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in other standard text inputs, selects, or textareas
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') && 
        target.id !== 'scanner-machine-input'
      ) {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault();
          // Hardware barcode burst detected
          setScannerConnected(true);
          sessionStorage.setItem('annapurna_scanner_verified', 'true');
          handleProcessBarcode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // If typing fast (< 60ms) it's a hardware barcode scanner machine
        if (diff > 120 && buffer.length > 0) {
          buffer = ''; // reset buffer if human typing slowly
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // Process a scanned or typed barcode
  const handleProcessBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setScannerInput('');

    // 1. Check if the scanned barcode is a Bill / Invoice ID (e.g. APM-123456 or pos-apm-123456)
    if (trimmed.toUpperCase().startsWith('APM-') || trimmed.toLowerCase().startsWith('pos-')) {
      const cleanBillNo = trimmed.toUpperCase().replace(/^POS-/, '');
      const orderDocId = trimmed.toLowerCase().startsWith('pos-') ? trimmed.toLowerCase() : `pos-${trimmed.toUpperCase()}`;

      try {
        let orderSnap = await getDoc(doc(db, 'orders', orderDocId));
        if (orderSnap.exists()) {
          const orderData = { id: orderSnap.id, ...orderSnap.data() } as any;
          soundEngine.playSaleSuccess();
          toast.success(`✓ Scanned Bill #${orderData.billNumber || cleanBillNo} (${orderData.customerName || 'Walk-in'})`);
          setLastCompletedOrder(orderData);
          setShowReceiptModal(true);
          return;
        }

        // Query by billNumber field
        const q = query(collection(db, 'orders'), where('billNumber', '==', cleanBillNo));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const docItem = qSnap.docs[0];
          const orderData = { id: docItem.id, ...docItem.data() } as any;
          soundEngine.playSaleSuccess();
          toast.success(`✓ Scanned Bill #${orderData.billNumber || cleanBillNo} (${orderData.customerName || 'Walk-in'})`);
          setLastCompletedOrder(orderData);
          setShowReceiptModal(true);
          return;
        }

        soundEngine.playWarningTone();
        toast.error(`Bill barcode "${trimmed}" not found in store database`);
        return;
      } catch (err: any) {
        toast.error('Error retrieving bill: ' + err.message);
        return;
      }
    }

    // 2. Check if barcode exists in inventory
    const existing = findProductByBarcode(trimmed);

    if (existing) {
      // Existing stock identified!
      soundEngine.playScanBeep();
      setIdentifiedStatus({
        type: existing.stock <= 0 ? 'out_of_stock' : 'existing',
        barcode: trimmed,
        product: existing,
        timestamp: Date.now()
      });

      // Add to bill
      addItemToBill(existing);
    } else {
      // New barcode not in inventory!
      soundEngine.playNewItemChime();
      setIdentifiedStatus({
        type: 'new',
        barcode: trimmed,
        timestamp: Date.now()
      });

      // Open new product modal prefilled with this barcode
      setNewBarcode(trimmed);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdMrp('');
      setNewProdStock(50);
      setIsAddProductOpen(true);
    }
  };

  // Add line item to bill
  const addItemToBill = (product: Product) => {
    setBillItems((prev) => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        if (item.quantity >= product.stock) {
          soundEngine.playWarningTone();
          toast.error(`Stock Limit: Only ${product.stock} units of ${product.name} in inventory!`, {
            id: `stock-limit-${product.id}`
          });
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...item,
          quantity: item.quantity + 1
        };
        toast.success(`+1 ${product.name} added to bill`);
        return updated;
      } else {
        if (product.stock <= 0) {
          soundEngine.playWarningTone();
          toast.error(`${product.name} is currently out of stock!`);
        }
        toast.success(`Added ${product.name} to bill`);
        return [...prev, { product, quantity: 1, unitPrice: product.price }];
      }
    });
  };

  // Update item quantity in bill
  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItemFromBill(productId);
      return;
    }
    const item = billItems.find(i => i.product.id === productId);
    if (item && newQty > item.product.stock) {
      soundEngine.playWarningTone();
      toast.error(`Only ${item.product.stock} units available in stock!`);
      return;
    }
    setBillItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    ));
  };

  const removeItemFromBill = (productId: string) => {
    setBillItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const clearCurrentBill = () => {
    if (billItems.length === 0) return;
    if (window.confirm("Are you sure you want to clear the current bill?")) {
      setBillItems([]);
      setCashTendered('');
      setDiscountAmount(0);
      setIdentifiedStatus(null);
      setKhataAmountReceived('');
      setKhataCashTendered('');
      setKhataPromiseDate('');
      setKhataNotes('');
    }
  };

  // Quick Restock Existing Product directly from scan banner
  const handleQuickRestock = async (productId: string, units: number) => {
    try {
      await restockProduct(productId, units);
      soundEngine.playScanBeep();
      toast.success(`Successfully added +${units} stock to inventory!`);
    } catch (e: any) {
      toast.error("Failed to restock: " + e.message);
    }
  };

  // Save brand new product to Firestore and add to active bill
  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarcode) {
      toast.error('Barcode is required');
      return;
    }
    if (!newProdName) {
      toast.error('Product name is required');
      return;
    }
    if (!newProdPrice || Number(newProdPrice) <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }

    setSavingProduct(true);
    try {
      const priceNum = Number(newProdPrice);
      const mrpNum = newProdMrp ? Number(newProdMrp) : priceNum;
      const stockNum = newProdStock ? Number(newProdStock) : 50;

      const newId = await addNewProductWithBarcode({
        name: newProdName,
        barcode: newBarcode.trim(),
        barcodeType: 'EAN-13',
        brand: newProdBrand || 'Generic',
        categoryId: 'cat_' + newProdCategory.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        categoryName: newProdCategory,
        price: priceNum,
        mrp: mrpNum,
        discountPercentage: mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0,
        stock: stockNum,
        unit: newProdUnit || '1 pc',
        imageUrl: newProdImage,
        description: `Fresh & authentic ${newProdName} sourced by Annapurna Mart.`,
        isAvailable: stockNum > 0,
        keywords: [newProdName.toLowerCase(), newBarcode.toLowerCase()]
      });

      soundEngine.playScanBeep();
      toast.success(`New product "${newProdName}" added to inventory!`);

      // Immediately add this new product to the active POS bill
      const newProductObj: Product = {
        id: newId,
        name: newProdName,
        barcode: newBarcode.trim(),
        brand: newProdBrand || 'Generic',
        categoryId: 'cat_custom',
        categoryName: newProdCategory,
        price: priceNum,
        mrp: mrpNum,
        discountPercentage: 0,
        stock: stockNum,
        unit: newProdUnit,
        imageUrl: newProdImage,
        description: '',
        isAvailable: true,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addItemToBill(newProductObj);
      setIsAddProductOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error creating product: " + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  // Calculations
  const subtotal = billItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const taxAmount = Math.round(subtotal * (taxPercent / 100));
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const changeDue = typeof cashTendered === 'number' ? Math.max(0, cashTendered - grandTotal) : 0;
  const totalItemCount = billItems.reduce((acc, item) => acc + item.quantity, 0);

  // Khata (Udhaar) Calculations
  const effectiveKhataReceived = typeof khataAmountReceived === 'number' ? Math.max(0, khataAmountReceived) : 0;
  const netKhataDueToday = Math.max(0, grandTotal - effectiveKhataReceived);
  const newTotalKhataBalance = currentCustomerKhataBalance + netKhataDueToday;
  const khataCashChange = (paymentMethod === 'udhaar' && khataReceivedPaymentMode === 'cash' && typeof khataCashTendered === 'number' && khataCashTendered > effectiveKhataReceived)
    ? (khataCashTendered - effectiveKhataReceived)
    : 0;

  // Complete Sale & Generate Bill
  const handleCompleteSaleAndPrint = async () => {
    if (billItems.length === 0) {
      toast.error("Please scan or add products to make a bill");
      return;
    }

    if (paymentMethod === 'cash' && typeof cashTendered === 'number' && cashTendered < grandTotal) {
      toast.error(`Cash received (₹${cashTendered}) is less than total amount (₹${grandTotal})`);
      return;
    }

    if (paymentMethod === 'udhaar') {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5 || customerName === 'Walk-in Customer') {
        toast.error("Customer name & mobile number are required to record a Khata (Udhaar) bill");
        return;
      }
      if (effectiveKhataReceived > grandTotal) {
        toast.error(`Received amount (₹${effectiveKhataReceived}) cannot exceed grand total (₹${grandTotal})`);
        return;
      }
      if (effectiveKhataReceived > 0 && khataReceivedPaymentMode === 'cash' && typeof khataCashTendered === 'number' && khataCashTendered < effectiveKhataReceived) {
        toast.error(`Cash note tendered (₹${khataCashTendered}) is less than received payment (₹${effectiveKhataReceived})`);
        return;
      }
    }

    setIsProcessingSale(true);
    try {
      const billNumber = `APM-${Date.now().toString().slice(-6)}`;
      const orderId = `pos-${billNumber}`;

      const orderPayload = {
        userId: user?.uid || 'pos_cashier',
        orderType: 'pos_counter' as const,
        billNumber,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        cashierName: user?.name || 'Store Cashier',
        items: billItems.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          price: i.unitPrice,
          quantity: i.quantity,
          imageUrl: i.product.imageUrl
        })),
        subtotal,
        discount: discountAmount,
        deliveryFee: 0,
        total: grandTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus: paymentMethod === 'udhaar' 
          ? (netKhataDueToday === 0 ? 'paid' as const : (effectiveKhataReceived > 0 ? 'partial' as const : 'due' as const))
          : 'paid' as const,
        amountPaid: paymentMethod === 'udhaar' ? effectiveKhataReceived : grandTotal,
        dueAmount: paymentMethod === 'udhaar' ? netKhataDueToday : 0,
        paidAt: paymentMethod === 'udhaar' ? (effectiveKhataReceived > 0 ? serverTimestamp() : null) : serverTimestamp(),
        cashReceived: paymentMethod === 'cash' 
          ? (typeof cashTendered === 'number' ? cashTendered : grandTotal) 
          : (paymentMethod === 'udhaar' ? (typeof khataCashTendered === 'number' ? khataCashTendered : effectiveKhataReceived) : grandTotal),
        changeGiven: paymentMethod === 'cash' ? changeDue : (paymentMethod === 'udhaar' ? khataCashChange : 0),
        khataDetails: paymentMethod === 'udhaar' ? {
          previousBalance: currentCustomerKhataBalance,
          addedToKhata: netKhataDueToday,
          newBalance: newTotalKhataBalance,
          promiseDate: khataPromiseDate || null,
          notes: khataNotes || null,
          upfrontPaymentMode: effectiveKhataReceived > 0 ? khataReceivedPaymentMode : 'none'
        } : null,
        orderStatus: 'delivered' as const,
        deliveryAddress: {
          id: 'store_counter',
          fullName: customerName || 'Walk-in Customer',
          phone: customerPhone || 'Store Counter',
          houseFlat: 'Annapurna Mart Store Counter',
          streetArea: 'Supermarket POS Station',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const batch = writeBatch(db);

      // 1. Record Order doc
      const orderRef = doc(db, 'orders', orderId);
      batch.set(orderRef, orderPayload);

      // 2. Real-time atomic inventory deduction for each scanned item
      for (const item of billItems) {
        const prodRef = doc(db, 'products', item.product.id);
        batch.update(prodRef, {
          stock: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();

      soundEngine.playSaleSuccess();
      toast.success(
        paymentMethod === 'udhaar'
          ? `Khata Bill #${billNumber} saved! ${netKhataDueToday > 0 ? `₹${netKhataDueToday} added to Udhaar` : 'Settled in full'}`
          : `Bill #${billNumber} generated! Stock updated.`
      );

      // Record customer purchase and update Khata ledger
      if (customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
        await useCustomerStore.getState().recordCustomerPurchase(
          customerPhone, 
          customerName, 
          grandTotal, 
          paymentMethod === 'udhaar' ? netKhataDueToday : 0,
          {
            billNumber,
            notes: khataNotes || (paymentMethod === 'udhaar' ? `Khata Bill: ₹${netKhataDueToday} due` : 'Paid in full'),
            paidAmount: paymentMethod === 'udhaar' ? effectiveKhataReceived : grandTotal
          }
        );
      }

      setLastCompletedOrder({
        ...orderPayload,
        id: orderId,
        createdAtDate: new Date()
      });
      setShowReceiptModal(true);

      // Reset bill for next customer
      setBillItems([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCashTendered('');
      setDiscountAmount(0);
      setIdentifiedStatus(null);
      setKhataAmountReceived('');
      setKhataCashTendered('');
      setKhataPromiseDate('');
      setKhataNotes('');
    } catch (err: any) {
      console.error("Sale error:", err);
      toast.error("Failed to complete sale: " + err.message);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Hold current active bill (Park Bill for customer)
  const handleHoldCurrentBill = () => {
    if (billItems.length === 0) {
      toast.error("Active bill is empty, nothing to hold");
      return;
    }

    const newHeld: HeldBill = {
      id: `hold_${Date.now()}`,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      items: [...billItems],
      subtotal,
      timestamp: new Date()
    };

    setHeldBills(prev => [newHeld, ...prev]);
    setBillItems([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCashTendered('');
    setDiscountAmount(0);
    setKhataAmountReceived('');
    setKhataCashTendered('');
    setKhataPromiseDate('');
    setKhataNotes('');
    soundEngine.playNewItemChime();
    toast.success(`Bill for "${newHeld.customerName}" held! Next customer ready.`);
  };

  // Resume a held parked bill
  const handleResumeHeldBill = (held: HeldBill) => {
    if (billItems.length > 0) {
      // Park the current active bill
      const currentPark: HeldBill = {
        id: `hold_${Date.now()}`,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items: [...billItems],
        subtotal,
        timestamp: new Date()
      };
      setHeldBills(prev => [currentPark, ...prev.filter(h => h.id !== held.id)]);
    } else {
      setHeldBills(prev => prev.filter(h => h.id !== held.id));
    }

    setBillItems(held.items);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setShowHeldBillsModal(false);
    soundEngine.playScanBeep();
    toast.success(`Resumed bill for ${held.customerName}`);
  };

  // Filtered products for manual search
  const manualFilteredProducts = manualSearch.trim().length > 1
    ? products.filter(p => 
        p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(manualSearch.toLowerCase()))
      ).slice(0, 6)
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header & Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div className="border-l border-gray-300 pl-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Barcode Scanner & POS Billing</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Inventory Connected
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              High-speed barcode scanner machine integration • Auto stock deduction • Instant thermal receipt
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Held / Parked Bills Button with counter badge */}
          {heldBills.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldBillsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-tight shadow-md animate-pulse transition-all"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Held Bills ({heldBills.length})</span>
            </button>
          )}

          {/* Left View Mode Switcher Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveLeftTab('split')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLeftTab === 'split'
                  ? 'bg-white text-gray-900 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ⚡ Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('catalog')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeLeftTab === 'catalog'
                  ? 'bg-white text-gray-900 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
              <span>Touch Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('cart')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeLeftTab === 'cart'
                  ? 'bg-white text-gray-900 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Active Bill</span>
              {totalItemCount > 0 && (
                <span className="bg-[#ea580c] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewBarcode(`890${Date.now().toString().slice(-9)}`);
              setNewProdName('');
              setNewProdPrice('');
              setNewProdMrp('');
              setNewProdStock(50);
              setIsAddProductOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-[#ea580c] font-black text-xs hover:bg-orange-100 transition-colors uppercase tracking-tight shadow-sm"
          >
            <PackagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Add Product</span>
          </button>

          <Link
            to="/admin/guide"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs uppercase tracking-tight transition-colors shadow-sm"
            title="Open comprehensive Kirana Store Operating Guide & POS Manual"
          >
            <BookOpen className="w-4 h-4 text-amber-700" />
            <span className="hidden md:inline">Store Guide</span>
          </Link>
        </div>
      </div>

      {/* Barcode Scanner Machine Command Deck */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-4 sm:p-6 mb-6 shadow-lg border border-gray-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Scanner Machine Input Field */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#ea580c]">
              <BarcodeIcon className="w-6 h-6 animate-pulse" />
            </div>
            <input
              id="scanner-machine-input"
              ref={barcodeInputRef}
              type="text"
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleProcessBarcode(scannerInput);
                }
              }}
              placeholder="Scan barcode with scanner machine OR type code & press Enter..."
              className="w-full pl-12 pr-28 py-3.5 bg-gray-950/90 border border-orange-500/40 rounded-2xl text-white font-mono text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent placeholder:text-gray-400 placeholder:font-sans"
            />
            <button
              type="button"
              onClick={() => handleProcessBarcode(scannerInput)}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-[#ea580c] text-white font-bold text-xs uppercase tracking-tight hover:bg-[#c2410c] transition-colors flex items-center gap-1.5"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </div>

          {/* Hardware Scanner Dynamic Connection Status Indicator */}
          <div className="flex items-center gap-3 bg-gray-800/80 px-3.5 py-2.5 rounded-2xl border border-gray-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setShowScannerSetupModal(true)}
              className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity"
              title="Click to open Scanner Hardware Setup & Test"
            >
              <span className="relative flex h-3 w-3">
                {scannerConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                )}
              </span>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  scannerConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {scannerConnected ? 'Scanner Connected' : 'Scanner Not Connected'}
                </span>
                <span className="text-[11px] text-gray-300">
                  {scannerConnected ? 'Verified • Point & trigger' : 'Click to Pair / Test USB'}
                </span>
              </div>
            </button>

            <div className="h-6 w-px bg-gray-700"></div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playScanBeep(currentSoundStyle);
                toast.success('Playing Supermarket Scanner Chime');
              }}
              title="Test Loud Supermarket Audio Beep"
              className="px-2.5 py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <Volume2 className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px]">Test Sound</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScannerSetupModal(true)}
              title="Configure Scanner & Audio Settings"
              className="p-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-bold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Barcode Identification Feedback Banner */}
        {identifiedStatus && (
          <div className="mt-4 pt-3 border-t border-gray-800/80 transition-all">
            {identifiedStatus.type === 'existing' && identifiedStatus.product && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 text-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white">✓ Existing Stock Identified:</span>
                      <span className="font-bold text-emerald-300">{identifiedStatus.product.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-800/60 font-mono text-emerald-200">
                        Barcode: {identifiedStatus.barcode}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      Price: <strong className="text-white">₹{identifiedStatus.product.price}</strong> • Available Stock: <strong className="text-emerald-400">{identifiedStatus.product.stock} units</strong> • Category: {identifiedStatus.product.categoryName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-900/50 px-2.5 py-1 rounded-lg">
                    ✓ Added To Bill
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickRestock(identifiedStatus.product!.id, 10)}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-bold text-gray-200 border border-gray-600 transition-colors"
                    title="Add 10 units to inventory stock"
                  >
                    +10 Restock
                  </button>
                </div>
              </div>
            )}

            {identifiedStatus.type === 'new' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3.5 text-amber-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-sm text-white">⚠️ New Barcode Detected: </span>
                    <span className="font-mono font-bold text-amber-300">[{identifiedStatus.barcode}]</span>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      This barcode is not in your inventory yet. Add product details to save it and add to current bill.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewBarcode(identifiedStatus.barcode);
                    setIsAddProductOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#ea580c] hover:from-amber-600 hover:to-[#c2410c] text-white font-black text-xs uppercase tracking-tight flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add To Inventory Now</span>
                </button>
              </div>
            )}

            {identifiedStatus.type === 'out_of_stock' && identifiedStatus.product && (
              <div className="flex items-center justify-between gap-3 bg-red-950/60 border border-red-500/40 rounded-2xl p-3.5 text-red-100">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="font-black text-sm text-white">{identifiedStatus.product.name} is OUT OF STOCK (0 Units)!</span>
                    <p className="text-xs text-red-300">Would you like to restock this product now?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickRestock(identifiedStatus.product!.id, 20)}
                    className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs"
                  >
                    +20 Units Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomStockProduct(identifiedStatus.product!)}
                    className="px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Custom Stock</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main POS Grid: 2 Columns (Left: Manual Catalog & Cart, Right: Customer, Payment & Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Manual Touch Product Catalog & Active Bill Items */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Manual Touch Product Catalog Picker (No scanner needed) */}
          {(activeLeftTab === 'catalog' || activeLeftTab === 'split') && (
            <div className={activeLeftTab === 'split' ? 'min-h-[380px]' : 'min-h-[500px]'}>
              <QuickProductCatalogPicker
                products={products}
                billItemMap={billItemMap}
                onAddProduct={addItemToBill}
              />
            </div>
          )}

          {/* Active Bill Items Table */}
          {(activeLeftTab === 'cart' || activeLeftTab === 'split') && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-lg text-gray-900 tracking-tight">Active Bill Items</h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#ea580c] font-black text-xs">
                    {totalItemCount} Items
                  </span>
                </div>

                {/* Manual search fallback if barcode unscannable */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={e => setManualSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (manualFilteredProducts.length > 0) {
                          addItemToBill(manualFilteredProducts[0]);
                          setManualSearch('');
                        }
                      }
                    }}
                    placeholder="Manual search product..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                  {manualFilteredProducts.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100">
                      {manualFilteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            addItemToBill(p);
                            setManualSearch('');
                          }}
                          className="p-2.5 hover:bg-orange-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">Barcode: {p.barcode || 'N/A'} • Stock: {p.stock}</p>
                          </div>
                          <span className="text-xs font-black text-[#ea580c]">₹{p.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                      <th className="py-2.5 px-3">Item / Barcode</th>
                      <th className="py-2.5 px-2">Rate</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billItems.map(({ product, quantity, unitPrice }) => {
                      const isOverStock = quantity > product.stock;
                      return (
                        <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" 
                              />
                              <div>
                                <p className="font-bold text-gray-900 text-sm leading-tight">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                    {product.barcode || 'NO-BARCODE'}
                                  </span>
                                  <span className={`text-[10px] font-bold ${isOverStock ? 'text-red-600' : 'text-gray-500'}`}>
                                    Stock: {product.stock}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm font-bold text-gray-800">
                            ₹{unitPrice}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-1.5 bg-gray-100 rounded-xl p-1 max-w-[110px] mx-auto">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(product.id, quantity - 1)}
                                className="p-1 rounded-lg bg-white shadow-sm hover:bg-gray-200 text-gray-700"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-black text-xs w-6 text-center">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(product.id, quantity + 1)}
                                className="p-1 rounded-lg bg-white shadow-sm hover:bg-gray-200 text-gray-700"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right text-sm font-black text-gray-900">
                            ₹{unitPrice * quantity}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemFromBill(product.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {billItems.length === 0 && (
                  <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-[#ea580c] mb-3">
                      <BarcodeIcon className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-gray-700 text-base">No items in active bill yet</p>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      Tap products in the Manual Touch Catalog above, or scan using your barcode machine.
                    </p>
                  </div>
                )}
              </div>

              {/* Bill Actions bar with Hold Bill button */}
              {billItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCurrentBill}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-tight"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleHoldCurrentBill}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors uppercase tracking-tight shadow-sm"
                      title="Park this active bill to serve next customer"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hold Bill</span>
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-medium mr-2">Items: {totalItemCount}</span>
                    <span className="text-sm font-black text-gray-900">Subtotal: ₹{subtotal}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Customer Details, Discount, Payment & Print */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
            
            {/* Customer Details Section with Phone Number Search */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-xs text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Customer (Phone Search)</span>
                </h3>
              </div>
              <CustomerSelectDropdown
                selectedName={customerName}
                selectedPhone={customerPhone}
                onSelectCustomer={({ name, phone }) => {
                  setCustomerName(name);
                  setCustomerPhone(phone);
                }}
              />

              {/* Outstanding Khata Banner with 1-click Settlement if customer has dues */}
              {matchedCustomer && currentCustomerKhataBalance > 0 && (
                <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 block text-[11px]">Purani Baki (Old Due):</span>
                      <span className="font-black text-red-600 text-sm">₹{currentCustomerKhataBalance}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKhataSettlementModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm transition-colors"
                  >
                    Receive Khata Payment
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <h3 className="font-black text-xs text-gray-900 uppercase tracking-tight mb-2">
              Payment Method
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: 'cash', label: 'Cash', icon: DollarSign },
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'card', label: 'Card / POS', icon: CreditCard },
                { id: 'udhaar', label: 'Khata (Due)', icon: BookOpen }
              ].map(m => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      active 
                        ? 'border-[#ea580c] bg-orange-50 text-[#ea580c]' 
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tendered Calculator with Quick Shortcuts (if Cash is selected) */}
            {paymentMethod === 'cash' && (
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 mb-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Cash Received (₹)</label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value ? Number(e.target.value) : '')}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Enter cash..."
                    className="w-32 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-right outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>

                {/* Quick Cash Tendered Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCashTendered(grandTotal)}
                    className="px-2 py-1 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg text-[11px] font-black text-[#ea580c] transition-colors"
                  >
                    Exact (₹{grandTotal})
                  </button>
                  {[100, 200, 500, 2000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashTendered(val)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        cashTendered === val 
                          ? 'bg-[#ea580c] text-white border-[#ea580c]' 
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>

                {typeof cashTendered === 'number' && cashTendered >= grandTotal && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs font-black text-emerald-700">Change to Return:</span>
                    <span className="text-sm font-black text-emerald-700">₹{changeDue}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI QR Display (if UPI is selected) */}
            {paymentMethod === 'upi' && (
              <div className="bg-orange-50/60 p-3 rounded-2xl border border-orange-200 mb-5 text-center">
                <p className="text-xs font-bold text-[#ea580c] mb-2">Scan & Pay ₹{grandTotal} via any UPI App</p>
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl shadow-sm border border-orange-100 flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-900" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-2">UPI ID: annapurnamart@icici</p>
              </div>
            )}

            {/* Khata (Udhaar / Credit Ledger) Section */}
            {paymentMethod === 'udhaar' && (
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 mb-5 space-y-3.5">
                {/* Customer Requirement Warning */}
                {(!customerPhone || customerName === 'Walk-in Customer') ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Customer Required for Khata</p>
                      <p className="text-[11px] text-red-600 mt-0.5">
                        Please search or select customer mobile number above so the credit ledger can be updated.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Customer Existing Balance summary */
                  <div className="bg-white/80 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Customer Khata Account</span>
                      <span className="font-black text-xs text-gray-900">{customerName}</span>
                      <span className="text-[11px] font-mono text-gray-500 block">+91 {customerPhone}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Purani Baki (Old Due)</span>
                      <span className={`text-sm font-black ${currentCustomerKhataBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{currentCustomerKhataBalance}
                      </span>
                      {currentCustomerKhataBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowKhataSettlementModal(true)}
                          className="text-[10px] font-bold text-[#ea580c] hover:underline block mt-0.5"
                        >
                          Clear Old Dues →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount Received Upfront (Jama Rashi) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <span>Amount Received Today (₹ Jama)</span>
                      <span className="text-[10px] font-medium text-gray-500">(0 for full udhaar)</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-gray-600">
                      Bill: ₹{grandTotal}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={khataAmountReceived}
                      onChange={e => setKhataAmountReceived(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0 (Pura Udhaar)"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-gray-900 focus:ring-2 focus:ring-[#ea580c] outline-none"
                    />
                    {effectiveKhataReceived > 0 && (
                      <span className="absolute right-3 top-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        ₹{effectiveKhataReceived} Jama
                      </span>
                    )}
                  </div>

                  {/* Quick Amount Received Shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setKhataAmountReceived(0)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        effectiveKhataReceived === 0
                          ? 'bg-[#ea580c] text-white border-[#ea580c]'
                          : 'bg-white border-amber-200 text-gray-700 hover:bg-amber-100/50'
                      }`}
                    >
                      ₹0 (Full Udhaar)
                    </button>
                    {grandTotal > 50 && (
                      <button
                        type="button"
                        onClick={() => setKhataAmountReceived(Math.round(grandTotal / 2))}
                        className="px-2 py-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[11px] font-bold text-gray-700 transition-colors"
                      >
                        50% (₹{Math.round(grandTotal / 2)})
                      </button>
                    )}
                    {[100, 200, 500].filter(v => v < grandTotal).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setKhataAmountReceived(val)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          khataAmountReceived === val
                            ? 'bg-[#ea580c] text-white border-[#ea580c]'
                            : 'bg-white border-amber-200 text-gray-700 hover:bg-amber-100/50'
                        }`}
                      >
                        ₹{val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setKhataAmountReceived(grandTotal)}
                      className="px-2 py-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[11px] font-bold text-emerald-700 transition-colors"
                    >
                      Exact (₹{grandTotal})
                    </button>
                  </div>
                </div>

                {/* If partial amount received > 0, select upfront mode (Cash or UPI) */}
                {effectiveKhataReceived > 0 && (
                  <div className="pt-2 border-t border-amber-200/80">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-tight mb-1.5">
                      Received Payment Mode:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKhataReceivedPaymentMode('cash')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all ${
                          khataReceivedPaymentMode === 'cash'
                            ? 'border-[#ea580c] bg-orange-50 text-[#ea580c]'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setKhataReceivedPaymentMode('upi')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all ${
                          khataReceivedPaymentMode === 'upi'
                            ? 'border-[#ea580c] bg-orange-50 text-[#ea580c]'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>UPI / QR</span>
                      </button>
                    </div>

                    {/* If Cash, optional change calculator */}
                    {khataReceivedPaymentMode === 'cash' && (
                      <div className="mt-2.5 p-2.5 bg-white/90 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-600">Cash Handed Over (₹):</span>
                        <input
                          type="number"
                          value={khataCashTendered}
                          onChange={e => setKhataCashTendered(e.target.value ? Number(e.target.value) : '')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          placeholder={`e.g. ${effectiveKhataReceived}`}
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-right font-bold text-xs"
                        />
                      </div>
                    )}
                    {khataCashChange > 0 && (
                      <div className="mt-1 flex justify-between items-center text-xs font-black text-emerald-700 px-1">
                        <span>Change to return:</span>
                        <span>₹{khataCashChange}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Transparent Khata Balance Calculation Matrix */}
                <div className="bg-white p-3 rounded-xl border border-amber-300/80 text-xs space-y-1.5 font-medium shadow-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Today's Total Bill:</span>
                    <span className="font-bold text-gray-900">₹{grandTotal}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Received Right Now:</span>
                    <span className="font-bold">-₹{effectiveKhataReceived}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-dashed border-gray-200">
                    <span>Net Added to Khata (Aaj Ka Baki):</span>
                    <span>+₹{netKhataDueToday}</span>
                  </div>
                  {currentCustomerKhataBalance > 0 && (
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>Previous Due (Purani Baki):</span>
                      <span>₹{currentCustomerKhataBalance}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-gray-200 font-black text-gray-900">
                    <span className="text-amber-900">New Total Khata Due (Nayi Baki):</span>
                    <span className="text-sm text-red-600">₹{newTotalKhataBalance}</span>
                  </div>
                </div>

                {/* Payment Promise Date (Khata Tareekh) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Payment Promise Date (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[
                      { label: 'Next Saturday', val: 'Next Saturday' },
                      { label: '1st of Month', val: '1st of Next Month' },
                      { label: 'In 7 Days', val: 'In 7 Days' },
                      { label: 'In 15 Days', val: 'In 15 Days' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setKhataPromiseDate(p.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          khataPromiseDate === p.val
                            ? 'bg-amber-200 text-amber-900 border-amber-400'
                            : 'bg-white border-amber-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={khataPromiseDate}
                    onChange={e => setKhataPromiseDate(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="e.g. Next Saturday, 5th Oct, Pay on salary"
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#ea580c] outline-none"
                  />
                </div>

                {/* Khata Note / Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Khata Remarks / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={khataNotes}
                    onChange={e => setKhataNotes(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="e.g. Items taken by son, ₹200 given in cash balance on 5th"
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#ea580c] outline-none"
                  />
                </div>
              </div>
            )}

            {/* Bill Pricing Breakdown */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100 mb-6 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">₹{subtotal}</span>
              </div>

              {/* Discount Section with Quick Discount Buttons */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-600 items-center">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    value={discountAmount || ''}
                    onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0"
                    className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-right font-bold text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {[
                    { label: 'None', val: 0 },
                    { label: '5%', val: Math.round(subtotal * 0.05) },
                    { label: '10%', val: Math.round(subtotal * 0.10) },
                    { label: '₹20', val: 20 },
                    { label: '₹50', val: 50 },
                  ].map(d => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setDiscountAmount(d.val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        discountAmount === d.val 
                          ? 'bg-orange-100 border-orange-400 text-orange-800' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-gray-600 items-center pt-1">
                <span>GST Tax</span>
                <select
                  value={taxPercent}
                  onChange={e => setTaxPercent(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-200 rounded px-2 py-1 font-bold text-xs"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (Standard Grocery)</option>
                  <option value={12}>12% (Packaged Food)</option>
                  <option value={18}>18% (Snacks/Cosmetics)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                <span className="font-black text-gray-900 text-sm uppercase tracking-tight">Grand Total</span>
                <span className="font-black text-2xl text-[#ea580c]">₹{grandTotal}</span>
              </div>
            </div>

            {/* Main Action: Generate & Print Bill */}
            <button
              type="button"
              onClick={handleCompleteSaleAndPrint}
              disabled={isProcessingSale || billItems.length === 0}
              className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-600/30 transition-all uppercase tracking-tight text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              <Printer className="w-5 h-5" />
              <span>{isProcessingSale ? 'Updating Inventory & Bill...' : 'Generate & Print Bill'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add New Product On-The-Fly (Triggered for new unrecognized barcodes) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-orange-100 text-[#ea580c]">
                <PackagePlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Add New Product to Inventory
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Barcode detected: automatically assigns barcode & adds to active bill upon save
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateNewProduct} className="space-y-4">
              {/* Barcode display */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Barcode</span>
                  <span className="font-mono text-base font-black text-gray-900">{newBarcode}</span>
                </div>
                <Barcode value={newBarcode} width={130} height={36} showText={false} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Product Name *
                </label>
                <input
                  required
                  type="text"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  placeholder="e.g. MDH Deggi Mirch 100g, Amul Masti Dahi"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Category
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  >
                    <option value="Staples">Staples & Grains</option>
                    <option value="Dairy">Dairy & Eggs</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Snacks">Snacks & Biscuits</option>
                    <option value="Beverages">Beverages & Drinks</option>
                    <option value="Bakery">Bakery & Breads</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={e => setNewProdBrand(e.target.value)}
                    placeholder="e.g. Nestle, Amul, Tata"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="45"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={newProdMrp}
                    onChange={e => setNewProdMrp(e.target.value ? Number(e.target.value) : '')}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Initial Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={newProdStock}
                    onChange={e => setNewProdStock(e.target.value ? Number(e.target.value) : '')}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Unit (e.g. 1 kg, 500 g, 1 pc, 1 L)
                </label>
                <input
                  type="text"
                  value={newProdUnit}
                  onChange={e => setNewProdUnit(e.target.value)}
                  placeholder="1 kg"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              {/* Quick Image Preset selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1.5">
                  Select Product Thumbnail
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GROCERY_IMAGE_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setNewProdImage(preset.url);
                        setNewProdCategory(preset.cat);
                      }}
                      className={`p-1.5 rounded-xl border text-center cursor-pointer transition-all ${
                        newProdImage === preset.url 
                          ? 'border-[#ea580c] bg-orange-50 ring-2 ring-[#ea580c]/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-10 object-cover rounded-lg mb-1" />
                      <span className="text-[10px] font-bold text-gray-700 block truncate">{preset.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-tight shadow-md disabled:opacity-50"
                >
                  {savingProduct ? 'Saving to Inventory...' : 'Save & Add to Active Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable POS Thermal Bill / Tax Receipt (80mm standard format) */}
      {showReceiptModal && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <span className="text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                ✓ Bill Generated & Stock Updated
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#ea580c] text-white font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-[#c2410c]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thermal Receipt Body (Formatted for 80mm POS Printers) */}
            <div id="printable-pos-receipt" className="border border-dashed border-gray-300 p-6 rounded-2xl bg-white font-mono text-xs">
              
              {/* Header with authentic brand logo */}
              <div className="text-center pb-4 border-b border-dashed border-gray-300">
                <div className="flex justify-center mb-1">
                  <Logo size="sm" variant="badge" />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Supermarket & Grocery Store</p>
                <p className="text-[10px] text-gray-500">Shop #14, Main Market, Delhi - 110001</p>
                <p className="text-[10px] text-gray-500">Ph: +91 98765 43210 • GSTIN: 07AABCU9603R1ZM</p>
              </div>

              {/* Bill Details */}
              <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>BILL NO:</span>
                  <strong className="text-gray-900 font-bold">{lastCompletedOrder.billNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>DATE/TIME:</span>
                  <span>{format(new Date(), 'dd-MM-yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span>{lastCompletedOrder.customerName || 'Walk-in'}</span>
                </div>
                {lastCompletedOrder.customerPhone && (
                  <div className="flex justify-between">
                    <span>PHONE:</span>
                    <span>{lastCompletedOrder.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{lastCompletedOrder.cashierName || 'Cashier 01'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-3 border-b border-dashed border-gray-300">
                <div className="flex justify-between font-bold text-gray-900 pb-1.5 text-[11px]">
                  <span>ITEM</span>
                  <div className="flex gap-4">
                    <span>QTY</span>
                    <span>PRICE</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {lastCompletedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2">{item.name}</span>
                      <div className="flex gap-4 shrink-0 font-medium">
                        <span className="w-6 text-center">{item.quantity}</span>
                        <span className="w-12 text-right">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>₹{lastCompletedOrder.subtotal}</span>
                </div>
                {lastCompletedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>DISCOUNT:</span>
                    <span>-₹{lastCompletedOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 text-gray-900">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹{lastCompletedOrder.total}</span>
                </div>
                <div className="flex justify-between pt-1 text-gray-600">
                  <span>PAYMENT MODE:</span>
                  <span className="font-bold uppercase">{lastCompletedOrder.paymentMethod}</span>
                </div>
                {lastCompletedOrder.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CASH TENDERED:</span>
                      <span>₹{lastCompletedOrder.cashReceived}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>CHANGE GIVEN:</span>
                      <span>₹{lastCompletedOrder.changeGiven}</span>
                    </div>
                  </>
                )}

                {/* Khata Ledger Details on Bill */}
                {lastCompletedOrder.paymentMethod === 'UDHAAR' && (
                  <div className="pt-2 border-t border-dashed border-gray-300 space-y-1 text-[11px] bg-amber-50/70 p-2.5 rounded-xl font-bold">
                    <div className="flex justify-between text-emerald-800">
                      <span>UPFRONT RECEIVED (JAMA):</span>
                      <span>₹{lastCompletedOrder.amountPaid || 0}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>ADDED TO KHATA TODAY:</span>
                      <span>₹{lastCompletedOrder.dueAmount || 0}</span>
                    </div>
                    {lastCompletedOrder.khataDetails?.previousBalance !== undefined && (
                      <div className="flex justify-between text-gray-500 font-medium">
                        <span>PREVIOUS KHATA (PURANI BAKI):</span>
                        <span>₹{lastCompletedOrder.khataDetails.previousBalance}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-gray-900 border-t border-dashed border-amber-300 pt-1 text-xs">
                      <span>TOTAL KHATA DUE (NAYI BAKI):</span>
                      <span className="text-red-600">
                        ₹{lastCompletedOrder.khataDetails?.newBalance ?? lastCompletedOrder.total}
                      </span>
                    </div>
                    {lastCompletedOrder.khataDetails?.promiseDate && (
                      <div className="flex justify-between text-[10px] text-gray-600 font-medium pt-0.5">
                        <span>BHUGTAN TAREEKH (PROMISE):</span>
                        <span>{lastCompletedOrder.khataDetails.promiseDate}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Barcode on receipt for return/exchange tracking */}
              <div className="pt-4 text-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  INVOICE BARCODE / बिल बारकोड
                </span>
                <Barcode value={lastCompletedOrder.billNumber} width={180} height={40} showText={true} />
                <p className="text-[10px] text-gray-500 mt-2 font-sans font-bold">Thank you for visiting अन्नपूर्णा MART!</p>
                <p className="text-[9px] text-gray-400 font-sans">
                  Scan this barcode at counter for 24-hr item exchange or Khata verification.
                </p>
              </div>
            </div>

            {/* Action Bar with WhatsApp Share & Print */}
            <div className="mt-4 pt-1 space-y-2">
              {lastCompletedOrder.customerPhone && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = lastCompletedOrder.customerPhone.replace(/[^0-9]/g, '');
                    const isUdhaar = lastCompletedOrder.paymentMethod === 'UDHAAR';
                    const itemsText = lastCompletedOrder.items.map((i: any) => `• ${i.name} (${i.quantity}x) = ₹${i.price * i.quantity}`).join('\n');
                    
                    const msg = `🙏 *Annapurna Mart - Bill #${lastCompletedOrder.billNumber}*\n` +
                      `Customer: ${lastCompletedOrder.customerName}\n` +
                      `Date: ${format(new Date(), 'dd-MM-yyyy HH:mm')}\n\n` +
                      `*Items:*\n${itemsText}\n\n` +
                      `*Total Bill: ₹${lastCompletedOrder.total}*\n` +
                      (isUdhaar ? 
                        `*Payment Mode: KHATA (UDHAAR)*\n` +
                        `• Jama Rashi (Received): ₹${lastCompletedOrder.amountPaid || 0}\n` +
                        `• Aaj Ka Baki (Added to Khata): ₹${lastCompletedOrder.dueAmount || 0}\n` +
                        `• *Aapki Kul Baki Rashi: ₹${lastCompletedOrder.khataDetails?.newBalance ?? lastCompletedOrder.total}*\n` +
                        (lastCompletedOrder.khataDetails?.promiseDate ? `• Bhugtan Tareekh: ${lastCompletedOrder.khataDetails.promiseDate}\n` : '')
                        : `Payment Mode: ${lastCompletedOrder.paymentMethod} (PAID)\n`
                      ) +
                      `\nAnnapurna Mart par khareedari ke liye dhanyawad! 🛒`;

                    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-3 rounded-2xl text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send WhatsApp Bill {lastCompletedOrder.paymentMethod === 'UDHAAR' ? '& Khata Slip' : ''}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl uppercase tracking-tight"
              >
                Close & Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Stock Adjustment Modal */}
      {customStockProduct && (
        <CustomStockModal
          product={customStockProduct}
          onClose={() => setCustomStockProduct(null)}
        />
      )}

      {/* Hardware Scanner Setup & Audio Settings Modal */}
      <ScannerSetupModal
        isOpen={showScannerSetupModal}
        onClose={() => setShowScannerSetupModal(false)}
        scannerConnected={scannerConnected}
        onScannerVerified={(deviceName) => {
          setScannerConnected(true);
          sessionStorage.setItem('annapurna_scanner_verified', 'true');
          if (deviceName) setScannerDeviceName(deviceName);
        }}
        onDisconnectScanner={() => {
          setScannerConnected(false);
          sessionStorage.removeItem('annapurna_scanner_verified');
          toast.success('Scanner disconnected (Standby mode)');
        }}
        currentSoundStyle={currentSoundStyle}
        onSoundStyleChange={(style) => {
          setCurrentSoundStyle(style);
          soundEngine.setSoundStyle(style);
        }}
        currentVolume={currentVolume}
        onVolumeChange={(vol) => {
          setCurrentVolume(vol);
          soundEngine.setVolume(vol);
        }}
      />

      {/* Quick Khata Settlement (Receive Payment) Modal */}
      {showKhataSettlementModal && matchedCustomer && (
        <KhataSettlementModal
          isOpen={showKhataSettlementModal}
          customer={matchedCustomer}
          onClose={() => setShowKhataSettlementModal(false)}
          onSuccess={() => {
            setShowKhataSettlementModal(false);
          }}
        />
      )}
    </div>
  );
}
