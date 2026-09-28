import React, { useState, useRef } from 'react';
import { useInventoryStore } from '../../store/useInventoryStore';
import { 
  parseVyaparFile, 
  downloadSampleVyaparExcel, 
  VyaparParsedItem, 
  VyaparParseResult 
} from '../../utils/vyaparParser';
import { soundEngine } from '../../utils/audio';
import toast from 'react-hot-toast';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Package, 
  RefreshCw, 
  Layers, 
  FileCheck,
  Check,
  Zap
} from 'lucide-react';

interface VyaparImportModalProps {
  onClose: () => void;
}

export default function VyaparImportModal({ onClose }: VyaparImportModalProps) {
  const { products, importVyaparItems } = useInventoryStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<VyaparParseResult | null>(null);
  const [importMode, setImportMode] = useState<'sync_stock_and_price' | 'inward_add_stock' | 'add_new_only'>('sync_stock_and_price');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Analyze how many parsed items match existing catalog
  const matchAnalysis = React.useMemo(() => {
    if (!parseResult) return { matched: 0, newItems: 0 };

    const barcodeSet = new Set(
      products
        .filter(p => p.barcode && p.barcode.trim())
        .map(p => p.barcode!.trim().toLowerCase())
    );
    const nameSet = new Set(
      products.map(p => p.name.trim().toLowerCase())
    );

    let matched = 0;
    let newItems = 0;

    parseResult.items.forEach(item => {
      const bCode = item.barcode ? item.barcode.trim().toLowerCase() : '';
      const name = item.name.trim().toLowerCase();

      if ((bCode && barcodeSet.has(bCode)) || nameSet.has(name)) {
        matched++;
      } else {
        newItems++;
      }
    });

    return { matched, newItems };
  }, [parseResult, products]);

  // Handle file selection
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setParsing(true);
    try {
      const result = await parseVyaparFile(file);
      if (result.errors.length > 0 && result.items.length === 0) {
        toast.error(result.errors[0]);
        setParseResult(null);
      } else {
        setParseResult(result);
        soundEngine.playScanBeep();
        toast.success(`Parsed ${result.items.length} items from ${file.name}!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to parse file: ' + err.message);
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Perform import
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return;
    setImporting(true);
    setProgress(20);

    try {
      setProgress(50);
      const res = await importVyaparItems(parseResult.items, importMode);
      setProgress(100);

      soundEngine.playSaleSuccess();
      toast.success(
        `Vyapar Stock Import Complete! Updated: ${res.updated} products, Created: ${res.created} new products.`,
        { duration: 6000 }
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden relative my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Vyapar Billing App Stock Importer
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold">
                  Excel (.xlsx / .xls) & CSV
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Sync items, barcodes, current stock quantity, and rates exported from Vyapar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* File Upload / Dropzone */}
          {!parseResult ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                    : 'border-gray-300 hover:border-emerald-400 bg-gray-50/50 hover:bg-emerald-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={onFileInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  {parsing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <h4 className="font-black text-gray-900 text-base mb-1">
                  {parsing ? 'Parsing Vyapar Spreadsheet...' : 'Choose or Drag & Drop Vyapar Export File'}
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Upload your Excel (.xlsx, .xls) or CSV file exported from Vyapar Desktop or Mobile app.
                </p>

                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-xs font-bold text-gray-700">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Select Excel / CSV File</span>
                </div>
              </div>

              {/* Sample format card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Need a reference format?</p>
                    <p className="text-[11px] text-gray-500">
                      Standard Vyapar columns: Item Name, Item Code, Sale Price, Current Stock, Unit, etc.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleVyaparExcel();
                    toast.success('Sample Vyapar Excel downloaded!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Sample Excel</span>
                </button>
              </div>
            </div>
          ) : (
            /* Parsed File Preview & Sync Configuration */
            <div className="space-y-5">
              {/* File Info Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-black text-gray-900 text-sm truncate">{selectedFile?.name}</h4>
                    <p className="text-xs text-emerald-800 font-medium">
                      {parseResult.items.length} items parsed • Vyapar format confirmed
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 underline self-start sm:self-auto"
                >
                  Change File
                </button>
              </div>

              {/* Matching Summary Chips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Total Rows
                  </span>
                  <span className="text-xl font-black text-gray-900">{parseResult.items.length}</span>
                </div>

                <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Existing Catalog Matches
                  </span>
                  <span className="text-xl font-black text-blue-900">{matchAnalysis.matched}</span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    New Products to Create
                  </span>
                  <span className="text-xl font-black text-emerald-900">{matchAnalysis.newItems}</span>
                </div>
              </div>

              {/* Import Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Stock Sync Mode:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setImportMode('sync_stock_and_price')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'sync_stock_and_price'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/40'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'sync_stock_and_price'}
                      onChange={() => setImportMode('sync_stock_and_price')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        Smart Sync (Replace Stock with Vyapar Counts & Update Prices)
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Overwrites matching items with exact Vyapar stock counts and adds new items. Best for daily or weekly store audits.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('inward_add_stock')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'inward_add_stock'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/40'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'inward_add_stock'}
                      onChange={() => setImportMode('inward_add_stock')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        Inward Shipment (Add Imported Quantities to Existing Stock)
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Adds the imported stock number to your current remaining stock (Current Stock + Vyapar Stock).
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('add_new_only')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      importMode === 'add_new_only'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/40'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'add_new_only'}
                      onChange={() => setImportMode('add_new_only')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        Add New Products Only (Skip Existing Items)
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Only imports products that do not already exist in your Annapurna Mart database.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Data Preview (First 5 Rows):
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Showing 5 of {parseResult.items.length} items
                  </span>
                </div>
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Barcode / Code</th>
                        <th className="p-2.5">Sale Rate</th>
                        <th className="p-2.5">Vyapar Stock</th>
                        <th className="p-2.5">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseResult.items.slice(0, 5).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80">
                          <td className="p-2.5 font-bold text-gray-900 max-w-[180px] truncate">
                            {it.name}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-gray-500">
                            {it.barcode || '—'}
                          </td>
                          <td className="p-2.5 font-bold text-gray-900">
                            ₹{it.price}
                          </td>
                          <td className="p-2.5 font-black text-emerald-700">
                            {it.stock}
                          </td>
                          <td className="p-2.5 text-gray-500 text-[11px]">
                            {it.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress Bar when importing */}
              {importing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-emerald-800">
                    <span>Syncing with Firestore...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-tight hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          {parseResult && (
            <button
              type="button"
              disabled={importing || parseResult.items.length === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Vyapar Import...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Import & Sync {parseResult.items.length} Items</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
