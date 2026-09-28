import React, { useState } from 'react';
import { 
  BookOpen, 
  Barcode, 
  DollarSign, 
  Printer, 
  Share2, 
  Search, 
  CheckCircle2, 
  HelpCircle, 
  Keyboard, 
  PackagePlus, 
  Phone, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StoreGuide() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'billing' | 'khata' | 'barcode' | 'inventory' | 'shortcuts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      id: 'billing',
      category: 'billing',
      title: '1. Fast Barcode Billing & Scanner Setup',
      icon: Barcode,
      color: 'text-[#ea580c]',
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'How to use USB/Bluetooth barcode scanners and manual touch catalog for lightning-speed billing.',
      items: [
        {
          heading: 'Instant Barcode Scanning',
          content: 'Point your USB or Bluetooth barcode scanner at any product barcode. The scanner automatically sends the code burst and Enter key. The system catches this globally within 120ms without needing you to manually click any input field.'
        },
        {
          heading: 'Manual Touch Catalog (No Scanner Needed)',
          content: 'For loose products like vegetables, loose pulses, or items with damaged barcodes, switch to Touch Catalog mode or use the Split View. Filter by categories (Staples, Dairy, Vegetables, etc.) and tap the product to add it instantly to the active bill.'
        },
        {
          heading: 'Stock Limit Protections',
          content: 'If an item has only 5 units in inventory and you try to add a 6th unit, the POS sounds a warning chime and shows a toast limit notification. This prevents overselling goods that are not physically present on the shelves.'
        },
        {
          heading: 'Hold & Resume Bills (Parking Bills)',
          content: 'If a customer in the queue forgets an item, click "Hold Bill". The bill is saved safely with their name and timestamp. Serve subsequent customers normally, then click "Held Bills" in the header to resume the parked bill in 1 click.'
        }
      ]
    },
    {
      id: 'khata',
      category: 'khata',
      title: '2. Customer Khata (Udhaar / Credit Ledger)',
      icon: BookOpen,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      description: 'Complete Indian Kirana customer credit tracking, partial upfront payments, and WhatsApp slips.',
      items: [
        {
          heading: 'Partial Payments & Flexible Upfront Amount',
          content: 'When billing on Khata (Due), cashiers can enter any amount received today (e.g. ₹200 on an ₹850 bill). The received portion is marked paid, and only the remaining ₹650 is added to the customer\'s running Khata balance.'
        },
        {
          heading: 'Customer Validation & Live Ledger Matrix',
          content: 'Khata requires a customer name and 10-digit mobile number so ledger balances can be tracked. Selecting a customer immediately shows their Purani Baki (Old Due), Today\'s Bill, Amount Received Today, and New Total Outstanding Due.'
        },
        {
          heading: 'Receiving Khata Payments (Jama Karein)',
          content: 'When a customer comes to the shop only to repay their old credit (without buying goods), click "Receive Khata Payment (Jama)" on the customer card or in the Dashboard Bahi-Khata. Enter the amount received via Cash or UPI and confirm.'
        },
        {
          heading: '1-Click WhatsApp Reminders & Slips',
          content: 'From the bill receipt or the Dashboard Bahi-Khata register, tap "Send WhatsApp". It pre-fills an authentic polite bilingual WhatsApp reminder with the customer\'s bill, old balance, amount paid, and store UPI ID for direct payment.'
        }
      ]
    },
    {
      id: 'barcode',
      category: 'barcode',
      title: '3. Invoice Barcodes, Returns & 24-Hr Exchanges',
      icon: Printer,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Understanding the APM-XXXXXX barcode printed on thermal bills and how it automates customer returns.',
      items: [
        {
          heading: 'What is the Barcode on the Bill?',
          content: 'The barcode printed at the bottom of every thermal receipt (e.g. APM-849201) is the Invoice Barcode. It uniquely identifies the entire sales transaction in the Annapurna Mart database.'
        },
        {
          heading: 'Scanning Receipts for Instant Return / Exchange',
          content: 'When a customer returns with their printed bill or slip for exchange, simply point your barcode scanner at the bill\'s barcode. The system recognizes the "APM-" prefix, fetches the original bill from the database, and displays all original items, prices, and Khata records.'
        },
        {
          heading: 'Anti-Fraud & Duplicate Bill Prevention',
          content: 'Because each bill barcode is matched directly against cloud Firestore records, customers cannot present duplicate or forged receipts.'
        }
      ]
    },
    {
      id: 'inventory',
      category: 'inventory',
      title: '4. Inventory & Fast Product Management',
      icon: PackagePlus,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
      description: 'Registering new grocery products on-the-fly when scanned, and importing from Vyapar / Excel.',
      items: [
        {
          heading: 'On-the-Fly Product Registration',
          content: 'When an uncataloged item is scanned at the counter, a special chime plays and the "Add New Product" modal opens with the barcode already pre-filled. Enter the name, selling price, MRP, and select a grocery image preset to add it directly to both the inventory and the active bill in 5 seconds.'
        },
        {
          heading: 'Importing from Vyapar & Excel / CSV',
          content: 'Under "Inventory & Products" (/admin/products), click "Import from Vyapar / Excel" to upload your shop\'s existing spreadsheet. The tool maps product names, barcodes, prices, and stock counts with duplicate detection.'
        },
        {
          heading: 'Instant Stock Restock',
          content: 'When a scanned product is out of stock, cashiers can click "+10" or "+50" directly on the scan banner to restock the shelf count immediately.'
        }
      ]
    },
    {
      id: 'shortcuts',
      category: 'shortcuts',
      title: '5. Fast Keyboard Shortcuts & Counter Speed Tips',
      icon: Keyboard,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
      description: 'Hotkeys and operational techniques to ring up customer queues in under 30 seconds.',
      items: [
        {
          heading: 'Hardware Scanner Enter Key',
          content: 'Hardware scanners automatically send rapid keystrokes followed by Enter. The app handles this automatically without interrupting other form fields.'
        },
        {
          heading: 'Exact Amount Shortcut',
          content: 'In both Cash and Khata modes, click the "Exact (₹...)" button to automatically populate the exact bill amount without typing on the keyboard.'
        },
        {
          heading: '80mm Thermal Receipt Printing',
          content: 'Press Ctrl+P (or Cmd+P on Mac) or click "Print Receipt". The CSS automatically strips the UI and prints the clean thermal bill format.'
        }
      ]
    }
  ];

  const filteredSections = sections.filter(sec => {
    if (activeCategory !== 'all' && sec.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = sec.title.toLowerCase().includes(q);
      const inDesc = sec.description.toLowerCase().includes(q);
      const inItems = sec.items.some(i => i.heading.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
      return inTitle || inDesc || inItems;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto font-sans pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white rounded-3xl p-6 sm:p-8 mb-8 border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ea580c] text-white text-[10px] font-black uppercase tracking-wider">
                Store Operator SOP
              </span>
              <span className="text-xs text-gray-400 font-bold">Annapurna Mart v2.5</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kirana Store Operations & POS Guide
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl mt-1 leading-relaxed">
              Complete reference manual for cashier staff, shop managers, and store owners. Learn how barcode scanning, Indian Khata credit accounting, invoice returns, and inventory sync work.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admin/pos"
              className="px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs uppercase tracking-tight flex items-center gap-2 shadow-md transition-all"
            >
              <Barcode className="w-4 h-4" />
              <span>Launch POS Billing</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search topics (e.g. Khata, scanner, barcode)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#ea580c] outline-none shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'billing', label: 'POS Billing' },
            { id: 'khata', label: 'Khata (Udhaar)' },
            { id: 'barcode', label: 'Invoice Barcode' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'shortcuts', label: 'Shortcuts' },
          ].map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === c.id
                  ? 'bg-[#ea580c] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Content Sections */}
      <div className="space-y-8">
        {filteredSections.map(sec => {
          const Icon = sec.icon;
          return (
            <div 
              key={sec.id}
              className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 overflow-hidden transition-all hover:border-gray-300"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-2xl ${sec.bgColor} ${sec.color} shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {sec.title}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {sec.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sec.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5 hover:bg-orange-50/20 hover:border-orange-200/60 transition-all"
                  >
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]"></span>
                      <span>{item.heading}</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="p-16 text-center text-gray-400 font-medium bg-white rounded-3xl border border-gray-200">
            No guide topics found matching "{searchQuery}". Try searching for "Khata", "Barcode", or "Scanner".
          </div>
        )}
      </div>

      {/* Quick WhatsApp Template Box */}
      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-gray-900 tracking-tight">
              Standard WhatsApp Customer Notification Template
            </h3>
            <p className="text-xs text-emerald-800 font-medium">
              Sent automatically to customer phones upon bill generation or payment reminder
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 font-mono text-xs text-gray-800 space-y-1 select-all">
          <p>🙏 *Annapurna Mart - Bill #APM-123456*</p>
          <p>Customer: Ramesh Kumar</p>
          <p>Date: 28-09-2026 14:30</p>
          <p className="pt-1 text-gray-500">• Aashirvaad Atta 5kg (1x) = ₹245</p>
          <p className="text-gray-500">• Amul Taaza Milk 1L (2x) = ₹136</p>
          <p className="font-bold pt-1">*Total Bill: ₹381*</p>
          <p className="text-amber-800 font-bold">*Payment Mode: KHATA (UDHAAR)*</p>
          <p>• Jama Rashi (Received): ₹150</p>
          <p>• Aaj Ka Baki (Added to Khata): ₹231</p>
          <p className="font-black text-red-600">• *Aapki Kul Baki Rashi: ₹551*</p>
          <p>• Bhugtan Tareekh: Next Saturday</p>
          <p className="pt-1 text-emerald-700 font-sans font-bold">Annapurna Mart par khareedari ke liye dhanyawad! 🛒</p>
        </div>
      </div>
    </div>
  );
}
