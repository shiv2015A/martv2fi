import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { 
  Plus, 
  Search, 
  Barcode as BarcodeIcon, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  Zap, 
  Printer, 
  Upload, 
  Database,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
  Sparkles,
  Download
} from 'lucide-react';
import Barcode from '../../components/Barcode';
import { useInventoryStore } from '../../store/useInventoryStore';
import { soundEngine } from '../../utils/audio';
import CustomStockModal from '../../components/admin/CustomStockModal';
import DuplicateProductsModal from '../../components/admin/DuplicateProductsModal';
import VyaparImportModal from '../../components/admin/VyaparImportModal';
import { downloadSampleVyaparExcel } from '../../utils/vyaparParser';

const SAMPLE_PRODUCTS_WITH_BARCODES = [
  { barcode: "8901030829147", name: "Amul Butter 100g", categoryName: "Dairy", price: 56, mrp: 60, unit: "100 g", imageUrl: "https://images.unsplash.com/photo-1589112933758-c0b8b613143c?w=500&q=80", brand: "Amul", stock: 45 },
  { barcode: "8901058852370", name: "Maggi 2-Minute Noodles", categoryName: "Snacks", price: 14, mrp: 14, unit: "70 g", imageUrl: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80", brand: "Nestle", stock: 80 },
  { barcode: "8901491101837", name: "Lays Classic Salted", categoryName: "Snacks", price: 20, mrp: 20, unit: "50 g", imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80", brand: "Lays", stock: 35 },
  { barcode: "8901764012211", name: "Coca-Cola 750ml", categoryName: "Beverages", price: 40, mrp: 40, unit: "750 ml", imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80", brand: "Coca-Cola", stock: 24 },
  { barcode: "8901725131227", name: "Aashirvaad Shudh Chakki Atta", categoryName: "Staples", price: 245, mrp: 265, unit: "5 kg", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80", brand: "Aashirvaad", stock: 18 },
  { barcode: "8902080000122", name: "Amul Taaza Homogenised Toned Milk", categoryName: "Dairy", price: 54, mrp: 54, unit: "1 L", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80", brand: "Amul", stock: 50 },
  { barcode: "8906001020018", name: "Harvest Gold White Bread", categoryName: "Bakery", price: 40, mrp: 40, unit: "400 g", imageUrl: "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=500&q=80", brand: "Harvest Gold", stock: 15 },
  { barcode: "8901234500011", name: "Farm Fresh Potato (Aloo)", categoryName: "Fruits & Vegetables", price: 30, mrp: 40, unit: "1 kg", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80", brand: "Farm Fresh", stock: 65 },
  { barcode: "8901234500028", name: "Fresh Red Onion (Pyaz)", categoryName: "Fruits & Vegetables", price: 28, mrp: 38, unit: "1 kg", imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80", brand: "Farm Fresh", stock: 40 },
  { barcode: "8901234500035", name: "Farm Fresh Brown Eggs (Pack of 6)", categoryName: "Dairy & Eggs", price: 65, mrp: 80, unit: "6 pcs", imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&q=80", brand: "Farm Fresh", stock: 4 },
  { barcode: "8901764012228", name: "Thums Up Soft Drink 750ml", categoryName: "Beverages", price: 40, mrp: 40, unit: "750 ml", imageUrl: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", brand: "Thums Up", stock: 3 }
];

export default function AdminProducts() {
  const { 
    products, 
    loading, 
    updateStock, 
    restockProduct, 
    addNewProductWithBarcode,
    getDuplicateGroups,
    initRealtimeListener,
    syncCount 
  } = useInventoryStore();

  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
  
  // Barcode quick lookup in inventory table
  const [barcodeSearchInput, setBarcodeSearchInput] = useState('');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  // Modals state
  const [customStockProduct, setCustomStockProduct] = useState<Product | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isVyaparModalOpen, setIsVyaparModalOpen] = useState(false);

  // Add Product modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Generic');
  const [newCategory, setNewCategory] = useState('Staples');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newMrp, setNewMrp] = useState<number | ''>('');
  const [newStock, setNewStock] = useState<number | ''>(50);
  const [newUnit, setNewUnit] = useState('1 pc');
  const [newImageUrl, setNewImageUrl] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80');

  useEffect(() => {
    const unsub = initRealtimeListener();
    return () => unsub();
  }, [initRealtimeListener]);

  // Inventory Real-time Analytics
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => !p.isAvailable || p.stock <= 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStockThreshold || 5)).length;
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

  // Calculate duplicate groups for alert badge
  const duplicateGroups = useMemo(() => {
    return getDuplicateGroups();
  }, [products, getDuplicateGroups]);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    // Search match
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterStock === 'out') return !p.isAvailable || p.stock <= 0;
    if (filterStock === 'low') return p.stock > 0 && p.stock <= (p.minStockThreshold || 5);
    return true;
  });

  // Handle barcode quick scan to identify stock
  const handleBarcodeQuickScan = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    const found = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === trimmed);
    if (found) {
      soundEngine.playScanBeep();
      setHighlightedProductId(found.id);
      toast.success(`Found: ${found.name} (Stock: ${found.stock})`);
      setBarcodeSearchInput('');
      // Scroll into view
      const elem = document.getElementById(`prod-row-${found.id}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      soundEngine.playNewItemChime();
      toast.error(`Barcode [${code}] not found in inventory. You can add it!`);
      setNewBarcode(code.trim());
      setIsAddModalOpen(true);
    }
  };

  // Seed sample products with genuine barcodes
  const seedData = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const cats = ['Fruits & Vegetables', 'Dairy', 'Snacks', 'Beverages', 'Staples', 'Bakery', 'Dairy & Eggs'];
      for (const c of cats) {
        const cRef = doc(collection(db, 'categories'));
        batch.set(cRef, { name: c, isActive: true, sortOrder: 0 });
      }

      for (const p of SAMPLE_PRODUCTS_WITH_BARCODES) {
        const pRef = doc(collection(db, 'products'));
        batch.set(pRef, {
          ...p,
          barcodeType: 'EAN-13',
          categoryId: "cat_sample",
          description: "Fresh and premium quality sourced for Annapurna Mart.",
          discountPercentage: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
          isAvailable: p.stock > 0,
          minStockThreshold: 5,
          keywords: [
            ...p.name.toLowerCase().split(' '),
            ...(p.brand ? p.brand.toLowerCase().split(' ') : []),
            p.barcode.toLowerCase()
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      soundEngine.playSaleSuccess();
      toast.success('Sample grocery inventory with barcodes loaded!');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to seed: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  // Add Product Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      toast.error('Please enter product name');
      return;
    }
    const priceNum = Number(newPrice);
    if (!priceNum || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      const mrpNum = newMrp ? Number(newMrp) : priceNum;
      const stockNum = newStock !== '' ? Number(newStock) : 50;
      const finalBarcode = newBarcode.trim() || `890${Date.now().toString().slice(-9)}`;

      await addNewProductWithBarcode({
        name: newName,
        barcode: finalBarcode,
        barcodeType: 'EAN-13',
        brand: newBrand || 'Generic',
        categoryId: 'cat_' + newCategory.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        categoryName: newCategory,
        price: priceNum,
        mrp: mrpNum,
        discountPercentage: mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0,
        stock: stockNum,
        unit: newUnit,
        imageUrl: newImageUrl,
        description: `Premium ${newName} available at Annapurna Mart.`,
        isAvailable: stockNum > 0,
        minStockThreshold: 5,
        keywords: [newName.toLowerCase(), finalBarcode.toLowerCase()]
      });

      soundEngine.playScanBeep();
      toast.success(`Product "${newName}" added successfully with initial stock of ${stockNum}!`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewBarcode('');
      setNewPrice('');
      setNewMrp('');
      setNewStock(50);
    } catch (err: any) {
      toast.error("Failed to add product: " + err.message);
    }
  };

  // CSV file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSeeding(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          for (const row of results.data as any[]) {
            const pRef = doc(collection(db, 'products'));
            const pPrice = Number(row.price) || 0;
            const pMrp = Number(row.mrp) || pPrice;
            const pStock = Number(row.stock) || 50;
            const pBarcode = row.barcode || `890${Date.now().toString().slice(-9)}${count}`;

            batch.set(pRef, {
              name: row.name || 'Unknown Product',
              barcode: pBarcode,
              barcodeType: 'EAN-13',
              categoryName: row.categoryName || 'General',
              price: pPrice,
              mrp: pMrp,
              unit: row.unit || '1 pc',
              imageUrl: row.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
              brand: row.brand || 'Generic',
              categoryId: "cat_sample",
              description: row.description || "Fresh and premium quality.",
              discountPercentage: pMrp > pPrice ? Math.round(((pMrp - pPrice) / pMrp) * 100) : 0,
              stock: pStock,
              isAvailable: pStock > 0,
              minStockThreshold: 5,
              keywords: (row.name || '').toLowerCase().split(' '),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            count++;
            
            if (count % 400 === 0) {
              await batch.commit();
            }
          }
          await batch.commit();
          toast.success(`Successfully uploaded ${count} products with barcodes!`);
        } catch (error: any) {
          console.error(error);
          toast.error("Error uploading products: " + error.message);
        } finally {
          setSeeding(false);
          if (e.target) e.target.value = '';
        }
      },
      error: () => {
        toast.error("Error parsing CSV");
        setSeeding(false);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span>Inventory & Stock Management</span>
            {syncCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Live Real-Time Sync
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Monitor real-time remaining stock, scan barcodes, adjust custom inward quantities, and sync Vyapar exports.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Add Product Button */}
          <button
            onClick={() => {
              setNewBarcode(`890${Date.now().toString().slice(-9)}`);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          {/* Vyapar Excel Import Button */}
          <button
            onClick={() => setIsVyaparModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Vyapar Excel Import</span>
          </button>

          {/* Remove Duplicates Button */}
          <button
            onClick={() => setIsDuplicateModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight transition-all border ${
              duplicateGroups.length > 0 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm animate-pulse' 
                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Duplicates</span>
            {duplicateGroups.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
                {duplicateGroups.length}
              </span>
            )}
          </button>

          {/* Import CSV */}
          <label className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>{seeding ? 'Uploading...' : 'CSV'}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={seeding} />
          </label>

          {/* Seed Sample */}
          <button 
            onClick={seedData} 
            disabled={seeding}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-colors disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5 text-orange-400" />
            <span>{seeding ? 'Seeding...' : 'Seed Stock'}</span>
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner if duplicate items are found */}
      {duplicateGroups.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-sm">
                Duplicate Products Detected in Catalog ({duplicateGroups.length} Groups Found)
              </h4>
              <p className="text-xs text-amber-800 font-medium">
                Multiple products share the same barcode or title. Review and use 1-Click Smart Merge to combine their stocks and eliminate duplicates.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDuplicateModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tight shadow-sm transition-all shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Review & Clean Duplicates</span>
          </button>
        </div>
      )}

      {/* Real-time Inventory Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total SKUs</span>
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900">{totalProducts}</p>
          <span className="text-[10px] text-gray-400 font-medium">Unique products in catalog</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Value</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-900">₹{totalInventoryValue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Selling price valuation</span>
        </div>

        <div 
          onClick={() => setFilterStock(filterStock === 'low' ? 'all' : 'low')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStock === 'low' 
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' 
              : 'bg-white border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock (≤5)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-800">{lowStockCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">Needs immediate restock</span>
        </div>

        <div 
          onClick={() => setFilterStock(filterStock === 'out' ? 'all' : 'out')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            filterStock === 'out' 
              ? 'bg-red-100 border-red-400 ring-2 ring-red-300' 
              : 'bg-white border-red-200 hover:bg-red-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-700">{outOfStockCount}</p>
          <span className="text-[10px] text-red-500 font-medium">0 units remaining</span>
        </div>
      </div>

      {/* Barcode Quick Scan & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Barcode Scanner Intake Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-500">
            <BarcodeIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={barcodeSearchInput}
            onChange={e => setBarcodeSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleBarcodeQuickScan(barcodeSearchInput);
              }
            }}
            placeholder="Scan barcode to identify stock or adjust quantity..."
            className="w-full pl-9 pr-24 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
          />
          <button
            onClick={() => handleBarcodeQuickScan(barcodeSearchInput)}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-gray-900 text-white font-bold text-[10px] uppercase hover:bg-black"
          >
            Locate
          </button>
        </div>

        {/* Text Filter */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search name, brand, category..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
          />
        </div>

        {/* Stock Filter Pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0">
          {(['all', 'low', 'out'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterStock(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-colors ${
                filterStock === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Products & Real-Time Stock Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                <th className="p-4">Product Info</th>
                <th className="p-4">Barcode</th>
                <th className="p-4">Category</th>
                <th className="p-4">Selling Rate</th>
                <th className="p-4">Remaining Stock</th>
                <th className="p-4 text-center">Stock Adjustment & Custom Add</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredProducts.map(p => {
                const isOut = !p.isAvailable || p.stock <= 0;
                const isLow = !isOut && p.stock <= (p.minStockThreshold || 5);
                const isHighlighted = highlightedProductId === p.id;

                return (
                  <tr 
                    key={p.id} 
                    id={`prod-row-${p.id}`}
                    className={`transition-colors ${
                      isHighlighted ? 'bg-orange-50 ring-2 ring-orange-400' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0" 
                        />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{p.brand} • {p.unit}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {p.barcode ? (
                        <div className="inline-flex flex-col items-start">
                          <Barcode value={p.barcode} width={130} height={32} showText={true} />
                        </div>
                      ) : (
                        <span className="font-mono text-gray-400 text-[10px] bg-gray-100 px-2 py-1 rounded">
                          NO BARCODE
                        </span>
                      )}
                    </td>

                    <td className="p-4 font-medium text-gray-600">
                      {p.categoryName}
                    </td>

                    <td className="p-4 font-black text-gray-900 text-sm">
                      ₹{p.price}
                      {p.mrp > p.price && (
                        <span className="text-[10px] text-gray-400 line-through ml-1.5 font-normal">
                          ₹{p.mrp}
                        </span>
                      )}
                    </td>

                    {/* Real-time remaining stock column with live badge */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-gray-900 w-10">
                          {p.stock}
                        </span>
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                            Low Stock (≤5)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                            In Stock
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quick Restock & Custom Stock Adding Buttons */}
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                        <button
                          onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))}
                          className="px-2 py-1 rounded-lg bg-white shadow-sm hover:bg-gray-200 text-gray-700 font-bold"
                          title="Decrease 1"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => restockProduct(p.id, 5)}
                          className="px-2.5 py-1 rounded-lg bg-white shadow-sm hover:bg-gray-200 text-gray-900 font-bold"
                          title="Restock +5 units"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => restockProduct(p.id, 20)}
                          className="px-2.5 py-1 rounded-lg bg-white shadow-sm hover:bg-gray-200 text-gray-900 font-bold"
                          title="Restock +20 units"
                        >
                          +20
                        </button>

                        {/* Custom Stock Adding Option */}
                        <button
                          onClick={() => setCustomStockProduct(p)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-[11px] uppercase tracking-tight shadow-sm transition-colors"
                          title="Open Custom Stock Inward / Set Exact Count"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Custom (+/-)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500 font-medium">
              No products found matching the criteria.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Custom Stock Adjuster */}
      {customStockProduct && (
        <CustomStockModal
          product={customStockProduct}
          onClose={() => setCustomStockProduct(null)}
        />
      )}

      {/* Modal: Duplicate Products Cleaner */}
      {isDuplicateModalOpen && (
        <DuplicateProductsModal
          onClose={() => setIsDuplicateModalOpen(false)}
        />
      )}

      {/* Modal: Vyapar Billing App Importer */}
      {isVyaparModalOpen && (
        <VyaparImportModal
          onClose={() => setIsVyaparModalOpen(false)}
        />
      )}

      {/* Modal: Add New Product */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-orange-100 text-[#ea580c]">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Add New Product</h3>
                <p className="text-xs text-gray-500 font-medium">Enter product details and assign custom initial stock & barcode</p>
              </div>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Barcode (EAN-13 / Code128)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={e => setNewBarcode(e.target.value)}
                    placeholder="e.g. 8901030829147"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewBarcode(`890${Date.now().toString().slice(-9)}`)}
                    className="absolute right-2 top-2 px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-[10px] font-bold rounded-lg uppercase"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Product Name *
                </label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Fortune Sunflower Oil 1L"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  >
                    <option value="Staples">Staples & Grains</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    placeholder="Generic"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="120"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={newMrp}
                    onChange={e => setNewMrp(e.target.value ? Number(e.target.value) : '')}
                    placeholder="135"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                    Custom Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Unit (e.g. 1 L, 1 kg, 500 g, 1 pc)
                </label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  placeholder="1 pc"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-tight shadow-md"
                >
                  Save Product to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
