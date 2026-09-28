import React, { useState } from 'react';
import { Product } from '../../types';
import { useInventoryStore } from '../../store/useInventoryStore';
import { soundEngine } from '../../utils/audio';
import toast from 'react-hot-toast';
import { 
  X, 
  Package, 
  Plus, 
  Minus, 
  SlidersHorizontal, 
  Check, 
  ArrowRight, 
  Barcode as BarcodeIcon,
  RotateCcw
} from 'lucide-react';
import Barcode from '../Barcode';

interface CustomStockModalProps {
  product: Product;
  onClose: () => void;
}

export default function CustomStockModal({ product, onClose }: CustomStockModalProps) {
  const { setCustomStock, addCustomStock } = useInventoryStore();

  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [addQty, setAddQty] = useState<number | ''>(10);
  const [exactQty, setExactQty] = useState<number | ''>(product.stock);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presets = [5, 10, 20, 50, 100, 200];

  // Calculate projected final stock
  const currentStock = product.stock || 0;
  const projectedStock = mode === 'add' 
    ? Math.max(0, currentStock + (typeof addQty === 'number' ? addQty : 0))
    : (typeof exactQty === 'number' ? Math.max(0, exactQty) : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'add') {
        const delta = typeof addQty === 'number' ? addQty : 0;
        if (delta === 0) {
          toast.error('Please enter a quantity to add or adjust');
          setIsSubmitting(false);
          return;
        }
        await addCustomStock(product.id, delta);
        soundEngine.playSaleSuccess();
        toast.success(
          `Stock updated for ${product.name}! ${delta > 0 ? `+${delta}` : delta} units (New total: ${Math.max(0, currentStock + delta)})`
        );
      } else {
        const target = typeof exactQty === 'number' ? exactQty : currentStock;
        await setCustomStock(product.id, target);
        soundEngine.playSaleSuccess();
        toast.success(`Stock for ${product.name} set to ${target} units!`);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update stock: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden relative">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500 to-[#ea580c] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">Custom Stock Adjuster</h3>
              <p className="text-xs text-orange-100 font-medium">Precision inventory & inward count</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Overview Card */}
        <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3.5">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-14 h-14 rounded-2xl object-contain bg-white border border-gray-200 p-1 shrink-0 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-gray-900 text-sm truncate">{product.name}</h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium">
                <span>{product.brand || 'Generic'}</span>
                <span>•</span>
                <span>{product.unit}</span>
                <span>•</span>
                <span className="font-bold text-gray-900">₹{product.price}</span>
              </div>
              {product.barcode && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
                  <BarcodeIcon className="w-3.5 h-3.5 text-orange-500" />
                  <span>{product.barcode}</span>
                </div>
              )}
            </div>

            {/* Current Stock Pill */}
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current</span>
              <span className={`text-xl font-black ${product.stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                {product.stock}
              </span>
              <span className="text-[10px] font-medium text-gray-400 block">units</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`py-2 text-xs font-black uppercase tracking-tight rounded-xl transition-all ${
                mode === 'add'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Add / Inward Stock (+)
            </button>
            <button
              type="button"
              onClick={() => setMode('set')}
              className={`py-2 text-xs font-black uppercase tracking-tight rounded-xl transition-all ${
                mode === 'set'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Set Exact Count (=)
            </button>
          </div>

          {/* Mode A: Inward / Add Quantity */}
          {mode === 'add' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Units to Add (or enter negative to deduct)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddQty(prev => (typeof prev === 'number' ? prev - 1 : -1))}
                    className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={addQty}
                    onChange={e => setAddQty(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="Enter custom quantity..."
                    className="flex-1 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-center font-black text-xl text-gray-900 focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setAddQty(prev => (typeof prev === 'number' ? prev + 1 : 1))}
                    className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Add Presets:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {presets.map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAddQty(num)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-black transition-colors border ${
                        addQty === num 
                          ? 'bg-orange-50 border-orange-400 text-orange-700' 
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      +{num} units
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Set Exact Count */}
          {mode === 'set' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  New Exact Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={exactQty}
                  onChange={e => setExactQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                  placeholder="e.g. 75"
                  className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-center font-black text-2xl text-gray-900 focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 text-center mt-1.5 font-medium">
                  Use this when auditing shelf stock to overwrite current count directly.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setExactQty(0)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Set Out of Stock (0)
                </button>
                <button
                  type="button"
                  onClick={() => setExactQty(50)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Default (50)
                </button>
                <button
                  type="button"
                  onClick={() => setExactQty(100)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Full Rack (100)
                </button>
              </div>
            </div>
          )}

          {/* Projected Result Callout */}
          <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-gray-600 block">Final Projected Stock:</span>
              <span className="text-[11px] text-gray-400">
                {currentStock} {mode === 'add' ? (typeof addQty === 'number' && addQty >= 0 ? `+ ${addQty}` : `- ${Math.abs(Number(addQty))}`) : '→'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-orange-600">
                {projectedStock}
              </span>
              <span className="text-xs font-bold text-orange-950 uppercase">units</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-tight hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs uppercase tracking-tight shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Updating Stock...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
