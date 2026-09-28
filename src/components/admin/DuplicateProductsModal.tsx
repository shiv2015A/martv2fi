import React, { useState, useMemo } from 'react';
import { useInventoryStore, DuplicateGroup } from '../../store/useInventoryStore';
import { soundEngine } from '../../utils/audio';
import toast from 'react-hot-toast';
import { 
  X, 
  Trash2, 
  CopyCheck, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Barcode as BarcodeIcon,
  RefreshCw
} from 'lucide-react';
import Barcode from '../Barcode';

interface DuplicateProductsModalProps {
  onClose: () => void;
}

export default function DuplicateProductsModal({ onClose }: DuplicateProductsModalProps) {
  const { 
    products, 
    getDuplicateGroups, 
    smartMergeDuplicateGroup, 
    cleanAllCatalogDuplicates,
    batchDeleteProducts 
  } = useInventoryStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'barcode' | 'name'>('all');

  // Compute duplicate groups in real-time
  const duplicateGroups = useMemo(() => {
    return getDuplicateGroups();
  }, [products, getDuplicateGroups]);

  const filteredGroups = duplicateGroups.filter(g => {
    if (selectedTab === 'all') return true;
    return g.type === selectedTab;
  });

  const totalRedundantItems = duplicateGroups.reduce(
    (sum, g) => sum + g.duplicates.length,
    0
  );

  const totalStockConsolidated = duplicateGroups.reduce(
    (sum, g) => sum + g.duplicates.reduce((acc, d) => acc + (d.stock || 0), 0),
    0
  );

  // Handle single group merge
  const handleMergeGroup = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    try {
      const dupIds = group.duplicates.map(d => d.id);
      const extraStock = await smartMergeDuplicateGroup(group.primaryProduct.id, dupIds);
      soundEngine.playSaleSuccess();
      toast.success(
        `Merged ${dupIds.length} duplicate(s) for "${group.primaryProduct.name}"! (+${extraStock} stock combined)`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to merge duplicates: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle single group delete without combining stock
  const handleDeleteGroupDuplicates = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    try {
      const dupIds = group.duplicates.map(d => d.id);
      await batchDeleteProducts(dupIds);
      soundEngine.playNewItemChime();
      toast.success(`Removed ${dupIds.length} duplicate copy(ies) for "${group.primaryProduct.name}"`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete duplicates: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle 1-click clean all
  const handleCleanAll = async () => {
    if (duplicateGroups.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await cleanAllCatalogDuplicates();
      soundEngine.playSaleSuccess();
      toast.success(
        `Successfully cleaned all duplicates! Consolidated ${res.itemsRemoved} duplicate items across ${res.groupsMerged} groups and combined ${res.totalStockConsolidated} stock units.`,
        { duration: 5000 }
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to clean all duplicates: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden relative my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 text-[#ea580c] border border-orange-500/30">
              <Layers className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Duplicate Products Cleaner
                </h3>
                {duplicateGroups.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[10px] font-bold border border-red-500/30">
                    {duplicateGroups.length} Groups Found
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Detect matching barcodes and titles, merge combined stock, and eliminate catalog duplicates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics bar */}
        <div className="p-4 sm:p-5 bg-orange-50/60 border-b border-orange-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Duplicate Groups
              </span>
              <span className="text-xl font-black text-gray-900">{duplicateGroups.length}</span>
            </div>
            <div className="h-8 w-px bg-orange-200/60" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Redundant Items
              </span>
              <span className="text-xl font-black text-red-600">{totalRedundantItems} items</span>
            </div>
            <div className="h-8 w-px bg-orange-200/60" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Stock to Consolidate
              </span>
              <span className="text-xl font-black text-emerald-700">+{totalStockConsolidated} units</span>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <button
              onClick={handleCleanAll}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md shadow-orange-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Merge & Clean All Duplicates</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="p-3 sm:px-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedTab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All ({duplicateGroups.length})
            </button>
            <button
              onClick={() => setSelectedTab('barcode')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedTab === 'barcode' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              By Barcode ({duplicateGroups.filter(g => g.type === 'barcode').length})
            </button>
            <button
              onClick={() => setSelectedTab('name')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedTab === 'name' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              By Name ({duplicateGroups.filter(g => g.type === 'name').length})
            </button>
          </div>

          <span className="text-[11px] text-gray-400 font-medium">
            Smart Merge keeps the best record & combines stock numbers.
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-gray-900 mb-1">Catalog is 100% Clean!</h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                No duplicate products found by barcode or name in your Annapurna Mart inventory.
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const primary = group.primaryProduct;
              return (
                <div 
                  key={group.key}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 hover:border-orange-300 transition-all"
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        group.type === 'barcode' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        Duplicate {group.type === 'barcode' ? 'Barcode' : 'Name'}
                      </span>
                      <h4 className="font-black text-gray-900 text-sm">
                        {primary.name}
                      </h4>
                      {primary.barcode && (
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {primary.barcode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleDeleteGroupDuplicates(group)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50"
                        title="Delete duplicates without altering primary item stock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete {group.duplicates.length} Copy(ies)</span>
                      </button>

                      <button
                        onClick={() => handleMergeGroup(group)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-tight shadow-sm transition-colors disabled:opacity-50"
                        title="Combine stock into primary item and delete duplicate records"
                      >
                        <CopyCheck className="w-3.5 h-3.5" />
                        <span>Merge & Combine (+{group.duplicates.reduce((a, b) => a + (b.stock || 0), 0)} Stock)</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Item (To Keep) */}
                  <div className="mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mb-1.5">
                      ✓ Primary Item (Will be kept & updated)
                    </span>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={primary.imageUrl}
                          alt={primary.name}
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-black text-gray-900">{primary.name}</p>
                          <p className="text-[11px] text-gray-500 font-mono">ID: {primary.id.slice(0, 10)}... • {primary.unit}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-bold block">RATE</span>
                          <span className="font-bold text-gray-900">₹{primary.price}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-bold block">STOCK</span>
                          <span className="font-black text-gray-900">{primary.stock}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Duplicates to Remove */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block mb-1.5">
                      ✕ Redundant Duplicates ({group.duplicates.length} to be removed)
                    </span>
                    <div className="space-y-1.5">
                      {group.duplicates.map(dup => (
                        <div 
                          key={dup.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs hover:bg-red-50/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                              ✕
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-gray-800">{dup.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">ID: {dup.id.slice(0, 10)}... • {dup.unit}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 font-bold block">RATE</span>
                              <span className="font-bold text-gray-700">₹{dup.price}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 font-bold block">EXTRA STOCK</span>
                              <span className="font-black text-amber-700">+{dup.stock}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500 font-medium">
            Merging safely sums the stock into one clean product record and deletes excess Firestore documents.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-tight transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
