import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface VyaparParsedItem {
  name: string;
  barcode: string;
  categoryName: string;
  price: number;
  mrp: number;
  costPrice?: number;
  stock: number;
  unit: string;
  minStockThreshold?: number;
  description?: string;
  rawRow: Record<string, any>;
}

export interface VyaparParseResult {
  items: VyaparParsedItem[];
  totalRows: number;
  headers: string[];
  isVyaparFormat: boolean;
  detectedFields: {
    nameCol?: string;
    barcodeCol?: string;
    priceCol?: string;
    mrpCol?: string;
    purchasePriceCol?: string;
    stockCol?: string;
    unitCol?: string;
    categoryCol?: string;
  };
  errors: string[];
}

// Normalize strings for column header matching
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Identify column mappings from Vyapar Excel / CSV export
 */
export function detectVyaparColumns(headers: string[]): VyaparParseResult['detectedFields'] {
  const result: VyaparParseResult['detectedFields'] = {};

  for (const h of headers) {
    const clean = normalizeHeader(h);

    // Name column
    if (!result.nameCol) {
      if (
        clean === 'itemname' ||
        clean === 'productname' ||
        clean === 'item' ||
        clean === 'itemdescription' ||
        clean.includes('itemname') ||
        clean.includes('productname') ||
        clean === 'name' ||
        clean === 'description'
      ) {
        result.nameCol = h;
      }
    }

    // Barcode / Item Code column
    if (!result.barcodeCol) {
      if (
        clean === 'itemcode' ||
        clean === 'barcode' ||
        clean === 'itemcodebarcode' ||
        clean === 'productcode' ||
        clean === 'sku' ||
        clean === 'itemsku' ||
        clean.includes('barcode') ||
        clean.includes('itemcode')
      ) {
        result.barcodeCol = h;
      }
    }

    // Sale Price column
    if (!result.priceCol) {
      if (
        clean === 'saleprice' ||
        clean === 'salesprice' ||
        clean === 'sellingprice' ||
        clean === 'salepriceinctax' ||
        clean === 'salepriceexcltax' ||
        clean === 'salerate' ||
        clean === 'rate' ||
        clean === 'price' ||
        clean.includes('saleprice') ||
        clean.includes('sellingprice')
      ) {
        result.priceCol = h;
      }
    }

    // MRP column
    if (!result.mrpCol) {
      if (clean === 'mrp' || clean.includes('mrp')) {
        result.mrpCol = h;
      }
    }

    // Purchase Price / Cost Price column
    if (!result.purchasePriceCol) {
      if (
        clean === 'purchaseprice' ||
        clean === 'purchasepriceinctax' ||
        clean === 'costprice' ||
        clean === 'buyprice' ||
        clean === 'purchaserate' ||
        clean.includes('purchaseprice')
      ) {
        result.purchasePriceCol = h;
      }
    }

    // Stock column
    if (!result.stockCol) {
      if (
        clean === 'currentstock' ||
        clean === 'stockquantity' ||
        clean === 'stock' ||
        clean === 'quantity' ||
        clean === 'openingstock' ||
        clean === 'closingstock' ||
        clean === 'qty' ||
        clean.includes('stockquantity') ||
        clean.includes('currentstock') ||
        clean.includes('stock')
      ) {
        result.stockCol = h;
      }
    }

    // Unit column
    if (!result.unitCol) {
      if (
        clean === 'unit' ||
        clean === 'measuringunit' ||
        clean === 'baseunit' ||
        clean === 'stockunit' ||
        clean.includes('unit')
      ) {
        result.unitCol = h;
      }
    }

    // Category column
    if (!result.categoryCol) {
      if (
        clean === 'category' ||
        clean === 'categoryname' ||
        clean === 'itemcategory' ||
        clean.includes('category')
      ) {
        result.categoryCol = h;
      }
    }
  }

  return result;
}

/**
 * Parse an Excel file (.xlsx, .xls) or CSV into VyaparParsedItems
 */
export async function parseVyaparFile(file: File): Promise<VyaparParseResult> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    return parseExcelFile(file);
  } else {
    return parseCsvFile(file);
  }
}

async function parseExcelFile(file: File): Promise<VyaparParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use the first non-empty sheet, or one named "Items" / "Stock"
  let sheetName = workbook.SheetNames[0];
  const itemsSheet = workbook.SheetNames.find(
    s => s.toLowerCase().includes('item') || s.toLowerCase().includes('stock')
  );
  if (itemsSheet) {
    sheetName = itemsSheet;
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      items: [],
      totalRows: 0,
      headers: [],
      isVyaparFormat: false,
      detectedFields: {},
      errors: ['The selected Excel file has no readable sheets.']
    };
  }

  // Convert to JSON with headers
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      items: [],
      totalRows: 0,
      headers: [],
      isVyaparFormat: false,
      detectedFields: {},
      errors: ['Excel sheet contains no data rows.']
    };
  }

  const headers = Object.keys(rawRows[0]);
  return processRows(rawRows, headers);
}

function parseCsvFile(file: File): Promise<VyaparParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as Record<string, any>[];
        if (!rawRows || rawRows.length === 0) {
          resolve({
            items: [],
            totalRows: 0,
            headers: [],
            isVyaparFormat: false,
            detectedFields: {},
            errors: ['CSV file contains no data rows.']
          });
          return;
        }

        const headers = results.meta.fields || (rawRows[0] ? Object.keys(rawRows[0]) : []);
        resolve(processRows(rawRows, headers));
      },
      error: (err) => {
        resolve({
          items: [],
          totalRows: 0,
          headers: [],
          isVyaparFormat: false,
          detectedFields: {},
          errors: ['Failed to parse CSV: ' + err.message]
        });
      }
    });
  });
}

function processRows(rows: Record<string, any>[], headers: string[]): VyaparParseResult {
  const detected = detectVyaparColumns(headers);
  const isVyaparFormat = Boolean(
    detected.nameCol && (detected.stockCol || detected.priceCol || detected.barcodeCol)
  );

  const items: VyaparParsedItem[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const rawName = detected.nameCol ? row[detected.nameCol] : (row['Item Name'] || row['Name'] || '');
    const cleanName = String(rawName || '').trim();

    // Skip empty summary lines often found in Vyapar exports (e.g. "Total", "Grand Total")
    if (!cleanName || cleanName.toLowerCase() === 'total' || cleanName.toLowerCase().startsWith('grand total')) {
      return;
    }

    const rawBarcode = detected.barcodeCol ? row[detected.barcodeCol] : (row['Item Code'] || row['Barcode'] || '');
    const barcode = String(rawBarcode || '').trim();

    const rawPrice = detected.priceCol ? row[detected.priceCol] : (row['Sale Price'] || row['Price'] || 0);
    const priceNum = Math.max(0, parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0);

    const rawMrp = detected.mrpCol ? row[detected.mrpCol] : (row['MRP'] || priceNum);
    const mrpNum = Math.max(priceNum, parseFloat(String(rawMrp).replace(/[^0-9.]/g, '')) || priceNum);

    const rawCost = detected.purchasePriceCol ? row[detected.purchasePriceCol] : (row['Purchase Price'] || undefined);
    const costPriceNum = rawCost !== undefined ? parseFloat(String(rawCost).replace(/[^0-9.]/g, '')) || undefined : undefined;

    const rawStock = detected.stockCol ? row[detected.stockCol] : (row['Current Stock'] || row['Stock'] || row['Stock Quantity'] || 0);
    const stockNum = Math.max(0, Math.floor(parseFloat(String(rawStock).replace(/[^0-9.-]/g, '')) || 0));

    const rawUnit = detected.unitCol ? row[detected.unitCol] : (row['Unit'] || '1 pc');
    const unitStr = String(rawUnit || '1 pc').trim();

    const rawCategory = detected.categoryCol ? row[detected.categoryCol] : (row['Category'] || 'General Grocery');
    const categoryStr = String(rawCategory || 'General Grocery').trim();

    items.push({
      name: cleanName,
      barcode: barcode,
      categoryName: categoryStr,
      price: priceNum,
      mrp: mrpNum,
      costPrice: costPriceNum,
      stock: stockNum,
      unit: unitStr,
      minStockThreshold: 5,
      description: `Stock item imported from Vyapar: ${cleanName}`,
      rawRow: row
    });
  });

  return {
    items,
    totalRows: items.length,
    headers,
    isVyaparFormat,
    detectedFields: detected,
    errors
  };
}

/**
 * Generates and downloads a standard sample Vyapar Excel export workbook
 */
export function downloadSampleVyaparExcel(): void {
  const sampleData = [
    {
      "Item Name": "Amul Butter 100g",
      "Item Code": "8901030829147",
      "Category": "Dairy",
      "Sale Price": 56,
      "Purchase Price": 51,
      "Current Stock": 45,
      "Unit": "PCS",
      "MRP": 60,
      "Minimum Stock": 10
    },
    {
      "Item Name": "Maggi 2-Minute Noodles",
      "Item Code": "8901058852370",
      "Category": "Snacks",
      "Sale Price": 14,
      "Purchase Price": 12.5,
      "Current Stock": 120,
      "Unit": "PKT",
      "MRP": 14,
      "Minimum Stock": 20
    },
    {
      "Item Name": "Aashirvaad Shudh Chakki Atta 5kg",
      "Item Code": "8901725131227",
      "Category": "Staples",
      "Sale Price": 245,
      "Purchase Price": 225,
      "Current Stock": 30,
      "Unit": "BAG",
      "MRP": 265,
      "Minimum Stock": 5
    },
    {
      "Item Name": "Tata Salt 1kg",
      "Item Code": "8901058850024",
      "Category": "Staples",
      "Sale Price": 28,
      "Purchase Price": 24,
      "Current Stock": 60,
      "Unit": "PKT",
      "MRP": 28,
      "Minimum Stock": 15
    },
    {
      "Item Name": "Fortune Sunlite Sunflower Oil 1L",
      "Item Code": "8906007281024",
      "Category": "Staples",
      "Sale Price": 145,
      "Purchase Price": 132,
      "Current Stock": 25,
      "Unit": "POUCH",
      "MRP": 160,
      "Minimum Stock": 8
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vyapar_Item_Stock");

  // Adjust column widths
  worksheet["!cols"] = [
    { wch: 32 }, // Item Name
    { wch: 18 }, // Item Code
    { wch: 14 }, // Category
    { wch: 12 }, // Sale Price
    { wch: 14 }, // Purchase Price
    { wch: 14 }, // Current Stock
    { wch: 8 },  // Unit
    { wch: 10 }, // MRP
    { wch: 14 }  // Minimum Stock
  ];

  XLSX.writeFile(workbook, "Vyapar_Stock_Sample_Export.xlsx");
}
