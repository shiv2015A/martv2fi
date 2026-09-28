# 🚀 Vercel & GitHub Deployment Master Guide
## अन्नपूर्णा MART (Annapurna Mart) — Zero-Friction Production Deployment

This step-by-step guide explains how to push your **Annapurna Mart** codebase to **GitHub** and host it on **Vercel** with 100% feature parity. Every single detail — hardware barcode scanning, 80mm thermal receipts, Khata Bahi-Khata ledger, Vyapar Excel import, and customer ordering — works flawlessly in production.

---

## 📋 Table of Contents
1. [Pre-Flight Checklist](#1-pre-flight-checklist)
2. [Step 1: Push Code to GitHub](#2-step-1-push-code-to-github)
3. [Step 2: Deploy to Vercel in 60 Seconds](#3-step-2-deploy-to-vercel-in-60-seconds)
4. [Step 3: Firebase Authorized Domains (CRITICAL Step)](#4-step-3-firebase-authorized-domains-critical-step)
5. [Step 4: Environment Variables (Zero-Config or Custom)](#5-step-4-environment-variables-zero-config-or-custom)
6. [Step 5: How Every Feature Runs on Vercel](#6-step-5-how-every-feature-runs-on-vercel)
   - 6.1 [Deep Links & Page Refresh (SPA Routing Fix)](#61-deep-links--page-refresh-spa-routing-fix)
   - 6.2 [Hardware Barcode Scanners & Camera Scanners](#62-hardware-barcode-scanners--camera-scanners)
   - 6.3 [80mm Thermal Receipt Printing](#63-80mm-thermal-receipt-printing)
   - 6.4 [Synthesized Supermarket Audio Feedback](#64-synthesized-supermarket-audio-feedback)
   - 6.5 [Customer Khata & WhatsApp Billing](#65-customer-khata--whatsapp-billing)
   - 6.6 [Vyapar & Excel Batch Inventory Import](#66-vyapar--excel-batch-inventory-import)
7. [Step 6: Custom Domain Setup (Optional)](#7-step-6-custom-domain-setup-optional)
8. [Troubleshooting & FAQs](#8-troubleshooting--faqs)

---

## 1. Pre-Flight Checklist

Before pushing, your project has already been pre-configured with:
- ✅ **`vercel.json`**: Configured with Vite build framework and universal SPA rewrite rules (`/(.*)` -> `/index.html`) so refreshing deep links like `/admin/pos` or `/admin/inventory` never throws a `404: NOT_FOUND`.
- ✅ **Dual-Mode Firebase Configuration (`src/firebase/config.ts`)**: Automatically reads Vercel environment variables (`VITE_FIREBASE_*`) if provided, and falls back seamlessly to the bundled `firebase-applet-config.json` if omitted. It also prevents duplicate app initialization.
- ✅ **Universal Web Audio Synthesizer (`src/utils/audio.ts`)**: Generates loud, authentic retail register scanner beeps using browser Web Audio oscillators without relying on external MP3 files that could 404.
- ✅ **Optimistic Local Caching**: Works smoothly even during momentary mobile internet fluctuations at your store counter.

---

## 2. Step 1: Push Code to GitHub

Open your terminal or command prompt in the project root directory and run:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add all files to staging
git add .

# 3. Commit the repository
git commit -m "feat: complete Annapurna Mart Kirana POS, Khata ledger, and Vercel configuration"

# 4. Set default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push code to GitHub
git push -u origin main
```

> **Tip**: The repository includes `.gitignore` which keeps `node_modules/` and local test logs out of GitHub while keeping your deployment configuration clean and lightweight.

---

## 3. Step 2: Deploy to Vercel in 60 Seconds

1. Go to **[https://vercel.com](https://vercel.com)** and sign in with your GitHub account.
2. Click the **"Add New..."** button in the top right and select **"Project"**.
3. Locate your repository from the list and click **"Import"**.
4. In the **Configure Project** screen, Vercel will automatically detect your project settings thanks to `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Default)
   - **Build Command**: `vite build` or `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**.
6. In about 30–45 seconds, Vercel will finish building and provide your live production URL (e.g., `https://annapurna-mart-xyz.vercel.app`).

---

## 4. Step 3: Firebase Authorized Domains (CRITICAL Step)

> ⚠️ **IMPORTANT**: For Firebase Authentication (Email/Password, Google Sign-in, or session persistence) to work on your new Vercel domain, you must authorize it in the Firebase Console.

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase project: **`ai-studio-1f1c433b-752d-4af0-99b3-d768a0ce6650`** (or your own custom project).
3. In the left navigation menu, click **Build** ➜ **Authentication**.
4. Click the **Settings** tab at the top.
5. In the left column of Settings, click **Authorized domains**.
6. Click **Add domain**.
7. Paste your Vercel deployment domain without `https://` (for example: `annapurna-mart-xyz.vercel.app` or `yourcustomstore.com`).
8. Click **Add**.

Now logins, account creation, and admin role verification will work seamlessly on your live Vercel URL!

---

## 5. Step 4: Environment Variables (Zero-Config or Custom)

### Option A: Zero-Config (Default)
You **do not need to add any environment variables** in Vercel to get started! The application includes the production Firebase credentials in `firebase-applet-config.json`, and `src/firebase/config.ts` automatically uses them.

### Option B: Custom Firebase Project (Optional)
If you ever want to switch to a different Firebase project without changing code, navigate to:
**Vercel Dashboard** ➜ **Your Project** ➜ **Settings** ➜ **Environment Variables** and add:

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `my-store.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `my-store-123` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Cloud Storage Bucket | `my-store-123.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Cloud Messaging ID | `782642274787` |
| `VITE_FIREBASE_APP_ID` | Web App ID | `1:782...:web:...` |
| `VITE_FIREBASE_DATABASE_ID` | Firestore Database ID | `ai-studio-1f1c433b-752d-4af0-99b3-d768a0ce6650` |

After saving, trigger a redeployment in Vercel.

---

## 6. Step 5: How Every Feature Runs on Vercel

### 6.1 Deep Links & Page Refresh (SPA Routing Fix)
In client-side single page apps, pressing browser refresh on `/admin/pos`, `/admin/inventory`, `/admin/dashboard`, or `/orders` often yields a `404 NOT_FOUND` on static hosts.
- **How it's resolved**: The root `vercel.json` contains:
  ```json
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
  ```
  Every sub-route now resolves correctly, allowing cashiers to bookmark `/admin/pos` directly on their counter PC or tablet.

### 6.2 Hardware Barcode Scanners & Camera Scanners
- **Hardware Scanners (USB/Bluetooth)**: Operates via rapid keystroke wedge interception. Works identically on localhost and Vercel.
- **Camera Barcode Scanners**: Modern browsers **require HTTPS** to access device cameras. Because Vercel provides automatic SSL/HTTPS certificates, camera barcode scanning for mobile counter devices works right away!

### 6.3 80mm Thermal Receipt Printing
- Receipts are rendered with high-contrast, black-and-white ESC/POS thermal formatting (`#printable-pos-receipt`).
- Simply click **"Print Thermal Receipt"** or press `Ctrl + P`. In the browser print dialog:
  - Destination: Select your thermal printer (Epson, TVS RP-3200, NGX, etc.).
  - Paper size: **80mm** (or 3-inch roll).
  - Margins: **None**.
  - Options: Uncheck "Headers and Footers".

### 6.4 Synthesized Supermarket Audio Feedback
- Audio alerts use the **Web Audio API**. There are no missing MP3 or WAV file downloads.
- Browser policy requires one user interaction (like clicking anywhere on the POS page) before the browser allows audio playback. Once clicked, every scan triggers an immediate supermarket chime.

### 6.5 Customer Khata & WhatsApp Billing
- **Instant Udhaar Ledger**: Store credit balances, repayments, and promise dates update in real-time.
- **WhatsApp Web Integration**: Clicking **"Share on WhatsApp"** generates standard `https://wa.me/91XXXXXXXXXX?text=...` URI links that automatically open WhatsApp Web on desktop or the WhatsApp App on mobile with pre-formatted receipts and ICICI UPI payment links.

### 6.6 Vyapar & Excel Batch Inventory Import
- The Excel/CSV parser uses client-side Web Workers and `xlsx`/`papaparse` engines. It parses thousands of grocery items directly in the browser and batches them into Firestore without requiring any custom backend proxy.

---

## 7. Step 6: Custom Domain Setup (Optional)

If you own a custom domain (e.g., `annapurnamart.in` or `billing.yourstore.com`):
1. In the Vercel Dashboard, go to **Settings** ➜ **Domains**.
2. Type your domain name and click **Add**.
3. Follow the DNS instructions (add a `CNAME` or `A` record at your registrar like GoDaddy, Namecheap, or Cloudflare).
4. Once verified, remember to add this domain to **Firebase Console ➜ Authentication ➜ Authorized Domains** as described in [Step 3](#4-step-3-firebase-authorized-domains-critical-step).

---

## 8. Troubleshooting & FAQs

### Q1: I get `auth/unauthorized-domain` when signing in on Vercel.
- **Fix**: You need to add your Vercel URL to the Firebase Authorized Domains list. Follow [Step 3](#4-step-3-firebase-authorized-domains-critical-step).

### Q2: I refreshed `/admin/pos` and it worked without a 404! How?
- **Answer**: The included `vercel.json` instructs Vercel to route all incoming requests to `index.html`, where React Router handles the route on the client.

### Q3: Do my products or customer Khata records reset when I deploy a new version on Vercel?
- **Answer**: No! All data is stored permanently in **Google Cloud Firestore**. Deploying code updates on Vercel only updates the frontend interface; your database remains intact and real-time.

### Q4: Can I use multiple cashier devices at the same time?
- **Answer**: Yes. Because the app uses Firestore reactive listeners (`onSnapshot`), stock quantities and customer Khata balances synchronize instantly across multiple counter PCs, tablets, or phones.

---

**Annapurna Mart is now ready for production on GitHub & Vercel! 🎉**
