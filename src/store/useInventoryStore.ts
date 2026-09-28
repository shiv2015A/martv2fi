import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';
import { VyaparParsedItem } from '../utils/vyaparParser';

export interface DuplicateGroup {
  key: string;
  type: 'barcode' | 'name';
  primaryProduct: Product;
  duplicates: Product[];
  totalCombinedStock: number;
}

interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  syncCount: number;
  barcodeMap: Record<string, Product>;
  
  // Real-time stock actions
  findProductByBarcode: (barcode: string) => Product | undefined;
  updateStock: (productId: string, newStock: number) => Promise<void>;
  restockProduct: (productId: string, additionalUnits: number) => Promise<void>;
  setCustomStock: (productId: string, exactStock: number) => Promise<void>;
  addCustomStock: (productId: string, deltaUnits: number) => Promise<void>;
  
  // Product creation and deletion
  addNewProductWithBarcode: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteProduct: (productId: string) => Promise<void>;
  batchDeleteProducts: (productIds: string[]) => Promise<void>;
  
  // Duplicate detection & cleaning
  getDuplicateGroups: () => DuplicateGroup[];
  smartMergeDuplicateGroup: (primaryId: string, duplicateIds: string[]) => Promise<number>;
  cleanAllCatalogDuplicates: () => Promise<{ groupsMerged: number; itemsRemoved: number; totalStockConsolidated: number }>;

  // Vyapar import
  importVyaparItems: (
    items: VyaparParsedItem[], 
    mode: 'sync_stock_and_price' | 'inward_add_stock' | 'add_new_only'
  ) => Promise<{ updated: number; created: number; skipped: number }>;

  initRealtimeListener: () => () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    products: [],
    loading: true,
    error: null,
    lastSyncTime: null,
    syncCount: 0,
    barcodeMap: {},

    findProductByBarcode: (code: string) => {
      if (!code) return undefined;
      const cleanCode = code.trim().toLowerCase();
      const { products } = get();

      // Check barcode field first
      const byBarcode = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === cleanCode);
      if (byBarcode) return byBarcode;

      // Check ID
      const byId = products.find(p => p.id.toLowerCase() === cleanCode);
      if (byId) return byId;

      return undefined;
    },

    updateStock: async (productId: string, newStock: number) => {
      const sanitizedStock = Math.max(0, Math.floor(newStock));
      const ref = doc(db, 'products', productId);
      await updateDoc(ref, {
        stock: sanitizedStock,
        isAvailable: sanitizedStock > 0,
        updatedAt: serverTimestamp()
      });
    },

    restockProduct: async (productId: string, additionalUnits: number) => {
      const ref = doc(db, 'products', productId);
      const current = get().products.find(p => p.id === productId);
      const currentStock = current ? current.stock : 0;
      const finalStock = Math.max(0, currentStock + additionalUnits);

      await updateDoc(ref, {
        stock: increment(additionalUnits),
        isAvailable: finalStock > 0,
        updatedAt: serverTimestamp()
      });
    },

    setCustomStock: async (productId: string, exactStock: number) => {
      const sanitizedStock = Math.max(0, Math.floor(exactStock));
      const ref = doc(db, 'products', productId);
      await updateDoc(ref, {
        stock: sanitizedStock,
        isAvailable: sanitizedStock > 0,
        updatedAt: serverTimestamp()
      });
    },

    addCustomStock: async (productId: string, deltaUnits: number) => {
      const current = get().products.find(p => p.id === productId);
      const currentStock = current ? current.stock : 0;
      const finalStock = Math.max(0, currentStock + deltaUnits);
      const ref = doc(db, 'products', productId);

      await updateDoc(ref, {
        stock: finalStock,
        isAvailable: finalStock > 0,
        updatedAt: serverTimestamp()
      });
    },

    addNewProductWithBarcode: async (productData) => {
      const productsRef = collection(db, 'products');
      const discountPercentage = productData.mrp > productData.price 
        ? Math.round(((productData.mrp - productData.price) / productData.mrp) * 100) 
        : 0;

      const newDocRef = await addDoc(productsRef, {
        ...productData,
        stock: Math.max(0, productData.stock || 0),
        isAvailable: (productData.stock || 0) > 0,
        discountPercentage,
        keywords: [
          ...productData.name.toLowerCase().split(' '),
          ...(productData.brand ? productData.brand.toLowerCase().split(' ') : []),
          ...(productData.categoryName ? productData.categoryName.toLowerCase().split(' ') : []),
          ...(productData.barcode ? [productData.barcode.toLowerCase()] : [])
        ].filter(Boolean),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return newDocRef.id;
    },

    deleteProduct: async (productId: string) => {
      const ref = doc(db, 'products', productId);
      await deleteDoc(ref);
    },

    batchDeleteProducts: async (productIds: string[]) => {
      if (productIds.length === 0) return;
      
      // Chunks of 400 to respect Firestore 500 limit
      const chunkSize = 400;
      for (let i = 0; i < productIds.length; i += chunkSize) {
        const chunk = productIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'products', id));
        }
        await batch.commit();
      }
    },

    /**
     * Scans catalog to identify duplicate products by barcode or normalized name
     */
    getDuplicateGroups: () => {
      const { products } = get();
      const groups: DuplicateGroup[] = [];

      // 1. Group by non-empty barcode
      const barcodeBuckets: Record<string, Product[]> = {};
      const handledProductIds = new Set<string>();

      products.forEach((p) => {
        if (p.barcode && p.barcode.trim()) {
          const bCode = p.barcode.trim().toLowerCase();
          if (!barcodeBuckets[bCode]) barcodeBuckets[bCode] = [];
          barcodeBuckets[bCode].push(p);
        }
      });

      Object.entries(barcodeBuckets).forEach(([bCode, prods]) => {
        if (prods.length > 1) {
          // Sort by stock descending or newest first
          const sorted = [...prods].sort((a, b) => (b.stock || 0) - (a.stock || 0));
          const primary = sorted[0];
          const duplicates = sorted.slice(1);
          const totalStock = prods.reduce((sum, item) => sum + (item.stock || 0), 0);

          prods.forEach(p => handledProductIds.add(p.id));

          groups.push({
            key: `barcode_${bCode}`,
            type: 'barcode',
            primaryProduct: primary,
            duplicates,
            totalCombinedStock: totalStock
          });
        }
      });

      // 2. Group remaining by normalized name
      const nameBuckets: Record<string, Product[]> = {};
      products.forEach((p) => {
        if (handledProductIds.has(p.id)) return;
        const normName = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normName) return;
        if (!nameBuckets[normName]) nameBuckets[normName] = [];
        nameBuckets[normName].push(p);
      });

      Object.entries(nameBuckets).forEach(([normName, prods]) => {
        if (prods.length > 1) {
          const sorted = [...prods].sort((a, b) => (b.stock || 0) - (a.stock || 0));
          const primary = sorted[0];
          const duplicates = sorted.slice(1);
          const totalStock = prods.reduce((sum, item) => sum + (item.stock || 0), 0);

          groups.push({
            key: `name_${normName}`,
            type: 'name',
            primaryProduct: primary,
            duplicates,
            totalCombinedStock: totalStock
          });
        }
      });

      return groups;
    },

    /**
     * Merges a single group of duplicates: combines their stock into primary and deletes duplicates
     */
    smartMergeDuplicateGroup: async (primaryId: string, duplicateIds: string[]) => {
      const { products } = get();
      const primary = products.find(p => p.id === primaryId);
      if (!primary) return 0;

      let extraStock = 0;
      duplicateIds.forEach(dupId => {
        const dup = products.find(p => p.id === dupId);
        if (dup && dup.stock > 0) {
          extraStock += dup.stock;
        }
      });

      const batch = writeBatch(db);
      const primaryRef = doc(db, 'products', primaryId);
      
      const newStock = primary.stock + extraStock;
      batch.update(primaryRef, {
        stock: newStock,
        isAvailable: newStock > 0,
        updatedAt: serverTimestamp()
      });

      duplicateIds.forEach(dupId => {
        batch.delete(doc(db, 'products', dupId));
      });

      await batch.commit();
      return extraStock;
    },

    /**
     * Cleans ALL catalog duplicates across the board in one batch operation
     */
    cleanAllCatalogDuplicates: async () => {
      const groups = get().getDuplicateGroups();
      if (groups.length === 0) {
        return { groupsMerged: 0, itemsRemoved: 0, totalStockConsolidated: 0 };
      }

      let itemsRemoved = 0;
      let totalStockConsolidated = 0;

      const batch = writeBatch(db);

      groups.forEach((group) => {
        const primary = group.primaryProduct;
        let groupExtraStock = 0;

        group.duplicates.forEach((dup) => {
          if (dup.stock > 0) {
            groupExtraStock += dup.stock;
            totalStockConsolidated += dup.stock;
          }
          itemsRemoved++;
          batch.delete(doc(db, 'products', dup.id));
        });

        const newStock = primary.stock + groupExtraStock;
        const primaryRef = doc(db, 'products', primary.id);
        batch.update(primaryRef, {
          stock: newStock,
          isAvailable: newStock > 0,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      return {
        groupsMerged: groups.length,
        itemsRemoved,
        totalStockConsolidated
      };
    },

    /**
     * Imports Vyapar parsed items and updates/creates products in Firestore
     */
    importVyaparItems: async (items, mode) => {
      const { products } = get();
      let updated = 0;
      let created = 0;
      let skipped = 0;

      // Build lookup maps for existing products
      const barcodeLookup: Record<string, Product> = {};
      const nameLookup: Record<string, Product> = {};

      products.forEach((p) => {
        if (p.barcode && p.barcode.trim()) {
          barcodeLookup[p.barcode.trim().toLowerCase()] = p;
        }
        if (p.name && p.name.trim()) {
          nameLookup[p.name.trim().toLowerCase()] = p;
        }
      });

      // Prepare operations in chunks of 350 to stay under Firestore's 500 limit
      const chunkSize = 350;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const cleanBarcode = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const cleanName = item.name.trim().toLowerCase();

          // Check if product already exists
          const existing = (cleanBarcode && barcodeLookup[cleanBarcode]) || nameLookup[cleanName];

          if (existing) {
            if (mode === 'add_new_only') {
              skipped++;
              continue;
            }

            const pRef = doc(db, 'products', existing.id);
            let finalStock = item.stock;
            if (mode === 'inward_add_stock') {
              finalStock = (existing.stock || 0) + item.stock;
            }

            const updateData: Record<string, any> = {
              stock: finalStock,
              isAvailable: finalStock > 0,
              updatedAt: serverTimestamp()
            };

            // Update prices if provided
            if (item.price > 0) updateData.price = item.price;
            if (item.mrp > 0) updateData.mrp = item.mrp;
            if (item.costPrice !== undefined) updateData.costPrice = item.costPrice;
            if (item.barcode && !existing.barcode) updateData.barcode = item.barcode;
            if (item.unit && (!existing.unit || existing.unit === '1 pc')) updateData.unit = item.unit;

            batch.update(pRef, updateData);
            updated++;
          } else {
            // New product
            const newRef = doc(collection(db, 'products'));
            const discountPercentage = item.mrp > item.price 
              ? Math.round(((item.mrp - item.price) / item.mrp) * 100) 
              : 0;

            const finalBarcode = item.barcode.trim() || `890${Date.now().toString().slice(-9)}${created}`;

            batch.set(newRef, {
              name: item.name,
              barcode: finalBarcode,
              barcodeType: 'EAN-13',
              categoryName: item.categoryName || 'General Grocery',
              categoryId: 'cat_' + (item.categoryName || 'general').toLowerCase().replace(/[^a-z0-9]/g, '_'),
              price: item.price || 0,
              mrp: item.mrp || item.price || 0,
              costPrice: item.costPrice,
              unit: item.unit || '1 pc',
              imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
              brand: 'Generic',
              description: item.description || `Stock imported from Vyapar: ${item.name}`,
              discountPercentage,
              stock: item.stock || 0,
              isAvailable: (item.stock || 0) > 0,
              minStockThreshold: item.minStockThreshold || 5,
              keywords: [
                ...item.name.toLowerCase().split(' '),
                ...(item.categoryName ? item.categoryName.toLowerCase().split(' ') : []),
                finalBarcode.toLowerCase()
              ].filter(Boolean),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Also register in local lookups for next iterations within this run
            const pseudoProduct = { id: newRef.id, name: item.name, barcode: finalBarcode, stock: item.stock } as Product;
            if (finalBarcode) barcodeLookup[finalBarcode.toLowerCase()] = pseudoProduct;
            nameLookup[cleanName] = pseudoProduct;

            created++;
          }
        }

        await batch.commit();
      }

      return { updated, created, skipped };
    },

    initRealtimeListener: () => {
      if (unsubscribe) {
        return unsubscribe;
      }

      set({ loading: true });
      const productsRef = collection(db, 'products');

      unsubscribe = onSnapshot(
        productsRef,
        (snapshot) => {
          const list: Product[] = [];
          const bMap: Record<string, Product> = {};

          snapshot.forEach((d) => {
            const data = d.data();
            const product: Product = {
              id: d.id,
              name: data.name || '',
              description: data.description || '',
              brand: data.brand || '',
              categoryId: data.categoryId || '',
              categoryName: data.categoryName || '',
              price: Number(data.price) || 0,
              mrp: Number(data.mrp) || Number(data.price) || 0,
              discountPercentage: Number(data.discountPercentage) || 0,
              unit: data.unit || '1 pc',
              imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
              stock: Number(data.stock ?? 0),
              isAvailable: data.isAvailable ?? (Number(data.stock ?? 0) > 0),
              keywords: data.keywords || [],
              barcode: data.barcode || undefined,
              barcodeType: data.barcodeType || 'EAN-13',
              costPrice: data.costPrice ? Number(data.costPrice) : undefined,
              minStockThreshold: data.minStockThreshold ? Number(data.minStockThreshold) : 5,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
            list.push(product);
            if (product.barcode) {
              bMap[product.barcode.trim().toLowerCase()] = product;
            }
          });

          set((state) => ({
            products: list,
            barcodeMap: bMap,
            loading: false,
            lastSyncTime: new Date(),
            syncCount: state.syncCount + 1,
            error: null
          }));
        },
        (err) => {
          console.error("Firestore onSnapshot products error:", err);
          set({ error: err.message, loading: false });
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
