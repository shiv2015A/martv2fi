# अन्नपूर्णा MART (Annapurna Mart) — Full Kirana Store & POS Operating Guide

Welcome to the official **Store Operations, POS Billing & Khata Management Guide** for **Annapurna Mart (अन्नपूर्णा MART)**. This guide covers every feature, keyboard workflow, hardware setting, accounting calculation, and troubleshooting protocol necessary to run a high-speed, modern Indian Kirana & Supermarket counter.

---

## Table of Contents
1. [Store Architecture Overview](#1-store-architecture-overview)
2. [Hardware Setup & Configuration](#2-hardware-setup--configuration)
   - 2.1 [USB / Wireless Barcode Scanners](#21-usb--wireless-barcode-scanners)
   - 2.2 [80mm Thermal Receipt Printers](#22-80mm-thermal-receipt-printers)
   - 2.3 [Audio Feedback & Sound Styles](#23-audio-feedback--sound-styles)
3. [POS Barcode Billing Workflow](#3-pos-barcode-billing-workflow)
   - 3.1 [Rapid Barcode Scanning](#31-rapid-barcode-scanning)
   - 3.2 [Touch Catalog (Manual No-Scanner Billing)](#32-touch-catalog-manual-no-scanner-billing)
   - 3.3 [Stock Limit Protections](#33-stock-limit-protections)
   - 3.4 [Holding & Resuming Parked Bills](#34-holding--resuming-parked-bills)
4. [Customer Khata (Udhaar / Credit Ledger)](#4-customer-khata-udhaar--credit-ledger)
   - 4.1 [How Indian Kirana Khata Works](#41-how-indian-kirana-khata-works)
   - 4.2 [Full Udhaar vs. Partial Payments](#42-full-udhaar-vs-partial-payments)
   - 4.3 [Customer Validation & Balance Visualizer](#43-customer-validation--balance-visualizer)
   - 4.4 [Payment Promise Dates & Remarks](#44-payment-promise-dates--remarks)
   - 4.5 [Collecting Udhaar Repayments (Khata Jama)](#45-collecting-udhaar-repayments-khata-jama)
   - 4.6 [Bahi-Khata Ledger in Admin Dashboard](#46-bahi-khata-ledger-in-admin-dashboard)
   - 4.7 [Automated WhatsApp Billing & Khata Slips](#47-automated-whatsapp-billing--khata-slips)
5. [Invoice Barcode, Returns & Exchanges](#5-invoice-barcode-returns--exchanges)
   - 5.1 [Understanding the Bill Barcode (APM-XXXXXX)](#51-understanding-the-bill-barcode-apm-xxxxxx)
   - 5.2 [Scanning a Receipt for 24-Hour Item Exchange](#52-scanning-a-receipt-for-24-hour-item-exchange)
6. [Inventory & Product Management](#6-inventory--product-management)
   - 6.1 [On-the-Fly Product Registration](#61-on-the-fly-product-registration)
   - 6.2 [Batch Import from Vyapar & Excel / CSV](#62-batch-import-from-vyapar--excel--csv)
   - 6.3 [Manual Stock Adjustment & Threshold Alerts](#63-manual-stock-adjustment--threshold-alerts)
7. [Online Storefront & Delivery App](#7-online-storefront--delivery-app)
   - 7.1 [Customer Self-Ordering & Cart](#71-customer-self-ordering--cart)
   - 7.2 [Order Tracking & Status Lifecycle](#72-order-tracking--status-lifecycle)
8. [Keyboard Shortcuts & Speed Tips](#8-keyboard-shortcuts--speed-tips)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. Store Architecture Overview

Annapurna Mart is engineered as a unified omni-channel retail system designed specifically for Indian grocery stores:

```
                  ┌────────────────────────────────────────┐
                  │          अन्नपूर्णा MART Core          │
                  └───────────────────┬────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           │                                                     │
           ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│  Online Storefront    │                             │  Admin POS Counter    │
│  - Instant Catalog    │                             │  - Hardware Scanner   │
│  - Customer Cart      │                             │  - Touch POS Billing  │
│  - Live Order Tracker │                             │  - Customer Khata     │
│  - Delivery Addresses │                             │  - Thermal Printing   │
└──────────┬────────────┘                             └──────────┬────────────┘
           │                                                     │
           └──────────────────────────┬──────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    Firebase Cloud Firestore   │
                      │  - products, orders, customers│
                      │  - atomic stock increment     │
                      │  - khata_entries audit ledger │
                      └───────────────────────────────┘
```

- **Zero-Flicker Reactive Inventory**: Whenever an item is scanned and billed at the POS counter or purchased online, its stock level drops atomically in Firestore across all devices.
- **Offline / Sample Resilience**: If network connectivity drops momentarily, the local Zustand stores retain current balances and state optimistically so counter queues never stall.

---

## 2. Hardware Setup & Configuration

### 2.1 USB / Wireless Barcode Scanners
Annapurna Mart works out-of-the-box with **any standard USB, 2.4GHz Wireless Dongle, or Bluetooth Barcode Scanner** (Honeywell, Zebra, TVS, Pegasus, Netum, Eyoyo, Symcode, etc.).

1. **How It Works**:
   - Hardware barcode scanners operate as a Human Interface Device (HID keyboard wedge). When a barcode is read, the scanner sends the characters rapidly followed by a carriage return (`Enter`).
   - The application has a global hardware keystroke listener that intercepts scanner bursts in under 120ms without stealing focus from form inputs.
2. **Scanner Verification**:
   - To verify that your scanner is properly paired, click the **Scanner Device Status button** in the top header of `/admin/pos`.
   - In the modal, pull the trigger on any barcode (or type `TEST12345` and press Enter).
   - Once verified, the badge changes to a green **Scanner Online (Ready)** indicator stored in session memory.

### 2.2 80mm Thermal Receipt Printers
- The POS printable receipt is formatted with exact **80mm (3-inch)** width CSS standards (`id="printable-pos-receipt"`).
- Supports ESC/POS printers (Epson TM-T82, TVS RP-3200, Rugtek, NGX, thermal Bluetooth printers).
- When you click **Print Receipt** (or press `Ctrl + P`), browser print styles automatically suppress sidebars, headers, and navigation, printing only the pristine receipt.

### 2.3 Audio Feedback & Sound Styles
Audio cues help cashiers ring up groceries without looking at the screen after every scan:
- **Scan Beep (Chime)**: Loud high-frequency chirp confirming existing product added to cart.
- **New Item Tone**: Two-tone alert signaling an unrecognized barcode (prompts to register).
- **Stock Limit / Error Tone**: Warning low tone indicating item is out of stock.
- **Sale Success Fanfare**: Harmonious chord played when bill is generated and inventory deducted.

*To change sound profiles*: Click **Audio Settings** in the POS header to switch between:
1. `High Pitch (Sharp Kirana Beeper)` — Best for noisy shop environments.
2. `Classic POS Chime` — Standard supermarket two-frequency tone.
3. `Subtle Digital Click` — For quiet or boutique counters.

---

## 3. POS Barcode Billing Workflow

### 3.1 Rapid Barcode Scanning
1. Open `/admin/pos`.
2. Aim your laser or 2D scanner at any grocery barcode (EAN-13, UPC, Code-128).
3. The item is automatically identified:
   - Added to the active bill table.
   - Quantity increases automatically if scanned multiple times.
   - Live subtotal and tax recalculate instantly.

### 3.2 Touch Catalog (Manual No-Scanner Billing)
For loose items (sugar, rice, loose onions, fresh milk packets) without a scannable barcode:
1. Use the **Quick Touch Catalog** located in the left/middle pane.
2. Filter by category pills (*Staples, Dairy, Vegetables, Snacks, Beverages*).
3. Search by name (e.g. type `Milk` or `Dahi`).
4. Click or tap any product tile:
   - It adds immediately to the current bill.
   - Quantity counter buttons (`+` and `-`) allow instant adjustments.
5. Use the view toggle:
   - `Split View`: Shows Touch Catalog and Active Cart side-by-side.
   - `Touch Catalog`: Maximizes catalog for tablet touchscreen counters.
   - `Active Bill`: Focuses on cart rows and item list.

### 3.3 Stock Limit Protections
- The system prevents cashiers from ringing up more items than are physically in stock.
- If an item's stock reaches zero, an error toast displays: `Only X units available in inventory!`.
- Cashiers can click **Quick Restock (+10, +50)** directly from the banner to replenish inventory on-the-fly when new cartons arrive.

### 3.4 Holding & Resuming Parked Bills
When a customer leaves the queue to pick up an extra item (e.g., *"Bhaiya, ek packet dahi aur lana bhool gaya"*):
1. Click the **Hold Bill (Pause)** button.
2. The active cart is safely parked in memory with a timestamp and customer name.
3. The counter resets instantly to serve the next customer.
4. When the customer returns, click **Held Bills (X)** in the header and tap **Resume Bill**.

---

## 4. Customer Khata (Udhaar / Credit Ledger)

The Khata system is tailored to the financial reality of Indian neighborhood Kirana stores.

### 4.1 How Indian Kirana Khata Works
In India, regular neighborhood customers often buy groceries on credit, settle weekly or monthly after their salary, or pay part of the bill in cash and leave the remaining balance in their Khata.

### 4.2 Full Udhaar vs. Partial Payments
When selecting **Khata (Due)** as the Payment Method:
- **Amount Received Today (₹ Jama)** field allows any number:
  - `0`: Full Udhaar (100% of bill added to customer's outstanding balance).
  - `₹200` on a `₹750` bill: ₹200 is marked received right now, and only ₹550 goes to Khata.
  - `Exact (₹750)`: Fully paid bill with customer record updated.
- **Quick Action Chips**:
  - `₹0 (Full Udhaar)`
  - `50%`
  - `₹100`, `₹200`, `₹500`
  - `Exact (₹{grandTotal})`
- **Received Payment Mode**: Cash or UPI / QR for the upfront portion.
- **Cash Handed Over Calculator**: Enter customer cash note (e.g. ₹500 note for ₹200 upfront payment) to compute exact change to return (₹300).

### 4.3 Customer Validation & Balance Visualizer
- Khata requires a customer account (name and 10-digit mobile number).
- Selecting or typing a customer instantly reveals their **Existing Khata Due (Purani Baki)**.
- A live transparent calculation card shows:
  ```text
  Today's Total Bill:                  ₹750
  Received Right Now:                 -₹200
  Net Added to Khata (Aaj Ka Baki):   +₹550
  Previous Due (Purani Baki):          ₹320
  New Total Khata Due (Nayi Baki):     ₹870
  ```

### 4.4 Payment Promise Dates & Remarks
- **Promise Date Chips**: `Next Saturday`, `1st of Next Month`, `In 7 Days`, `In 15 Days` or custom date.
- **Remarks Field**: e.g., *"Will pay with milk bill on 5th"*.

### 4.5 Collecting Udhaar Repayments (Khata Jama)
When a customer visits the store solely to pay down their old Khata balance:
1. Search customer by name or phone in POS or Dashboard.
2. Click **Receive Khata Payment (Jama)**.
3. Enter amount received (supports quick chips: Full Due, ₹100, ₹200, ₹500, etc.).
4. Select payment mode (Cash / UPI) and click **Confirm Jama**.
5. The customer's `outstandingKhataBalance` decreases instantly.
6. A receipt is generated with a 1-click button to send a WhatsApp confirmation slip.

### 4.6 Bahi-Khata Ledger in Admin Dashboard
Open `/admin` to access the **Customer Khata Register (Bahi-Khata)**:
- Filter between **Pending Dues Only** and **All Registered Customers**.
- Search by customer name or phone.
- View total orders count, lifetime spend, and current dues.
- **1-Click WhatsApp Payment Reminder**: Opens WhatsApp with a polite bilingual reminder:
  ```text
  🙏 Namaste Ramesh Kumar ji,
  Annapurna Mart se aapka baki udhaar (Khata Balance) ₹550 hai.
  Kripya aate samay ya UPI ke madhyam se jama karein.
  • UPI ID: annapurnamart@icici
  Dhanyawad! 🛒
  ```

### 4.7 Automated WhatsApp Billing & Khata Slips
After generating any bill, clicking **Send WhatsApp Bill & Khata Slip** opens WhatsApp Web or mobile app with:
- Store Header & Invoice Number
- List of items with quantities and prices
- Total Bill amount
- Upfront amount received (Jama Rashi)
- New balance added to Khata
- Customer's total outstanding balance across all visits
- Promise date and thank-you note.

---

## 5. Invoice Barcode, Returns & Exchanges

### 5.1 Understanding the Bill Barcode (`APM-XXXXXX`)
Printed at the very bottom of every thermal receipt is a Code-128 barcode:
```
       ||| | |||| | ||| || |||| | ||||
                 APM-849201
         INVOICE BARCODE / बिल बारकोड
```
- **APM**: Annapurna Mart prefix.
- **XXXXXX**: Unique six-digit numeric timestamp hash.

### 5.2 Scanning a Receipt for 24-Hour Item Exchange
When a customer comes back with their receipt to exchange or return an item:
1. Cashier does not need to search through dates or records.
2. Cashier points the hardware barcode scanner at the barcode on the paper bill.
3. The system detects the `APM-` prefix, fetches the exact original bill from the database, plays a success chime, and displays:
   - Full list of items originally purchased.
   - Original prices and discounts.
   - Customer name, phone number, and payment mode.
   - Khata breakdown if billed on credit.

---

## 6. Inventory & Product Management

### 6.1 On-the-Fly Product Registration
When an uncataloged item is scanned:
1. The scanner detects that the barcode does not exist in inventory.
2. A special chime plays and the **Add New Product** modal opens with the barcode already pre-filled.
3. Cashier enters:
   - Product Name (e.g. *MDH Deggi Mirch 100g*)
   - Selling Price (₹) & MRP (₹)
   - Initial Stock count (e.g. 50 units)
   - Unit (e.g. 1 pc, 1 kg, 500 g)
   - Selects a 1-tap grocery thumbnail preset (Atta, Oil, Dairy, Spices, Snacks).
4. Clicks **Save & Add to Active Bill**:
   - The product is permanently saved to Firestore inventory.
   - It is immediately added to the current customer's bill. No re-scanning required.

### 6.2 Batch Import from Vyapar & Excel / CSV
Navigate to `/admin/products`:
1. Click **Import from Vyapar / Excel**.
2. Upload your standard spreadsheet or Vyapar export CSV (`Item Name`, `Barcode`, `Sale Price`, `Stock`, `Category`).
3. The preview parser maps columns, warns about duplicates, and imports hundreds of grocery products in seconds.

### 6.3 Manual Stock Adjustment & Threshold Alerts
- Click **Edit Stock** on any product in the inventory table to increment, decrement, or correct counts after physical shop audits.
- Products with stock $\le 5$ display amber badges to remind store owners to re-order from distributors.

---

## 7. Online Storefront & Delivery App

Customers can browse and order from their mobile phones:
- **Instant Delivery Catalog**: Browse by categories (Staples, Snacks, Dairy, Personal Care).
- **Search with Live Highlighting**: Fast client-side search by brand, keyword, or barcode.
- **Customer Address Book**: Save multiple addresses (Home, Office, Shop).
- **Order Lifecycle**:
  - `placed` $\rightarrow$ `confirmed` $\rightarrow$ `packing` $\rightarrow$ `out_for_delivery` $\rightarrow$ `delivered`.
- **Live Sync with Store POS**: POS sales and online app orders share the exact same Firestore inventory in real time.

---

## 8. Keyboard Shortcuts & Speed Tips

| Shortcut / Key | Function |
|---|---|
| **Enter (in Scanner)** | Automatically processes scanned barcode burst |
| **Tab** | Moves focus between customer search, received amount, and checkout |
| **Exact Button** | Automatically fills cash tendered or received amount equal to Grand Total |
| **Clear Button** | Resets active cart with confirmation prompt |
| **Ctrl + P / Cmd + P** | Opens native 80mm thermal receipt printer dialog |
| **Numeric Keypad** | Quickly type amounts into Cash Tendered or Khata Received input |

---

## 9. Troubleshooting & FAQs

### Q1: Why does the scanner modal show "Scanner Standby"?
**Answer**: Handheld scanners operate as keyboards. They do not maintain an active serial port connection. The app shows "Online (Ready)" once the first barcode is triggered or verified via the setup modal.

### Q2: Can a customer pay part in cash and part on Khata?
**Answer**: Yes. Select **Khata (Due)**, enter the cash amount in **Amount Received Today (₹)**, and select **Cash**. The difference will be added to the customer's Khata, and the printed bill will reflect both the paid and due portions.

### Q3: How do we handle return of a loose item?
**Answer**: Tap the minus (`-`) button or trash icon in the cart row to remove the item before finalizing, or scan the invoice barcode to locate the original transaction.

### Q4: Does the bill print properly without color?
**Answer**: Yes. The thermal bill template uses pure monochrome black styling (`#000000`) on white with dashed dividing lines, optimized for high-contrast thermal paper rolls.

---

*अन्नपूर्णा MART — Fast, Reliable & Digital Kirana Store Management.*
