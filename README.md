# अन्नपूर्णा MART (Annapurna Mart)

A modern high-speed Indian Kirana POS counter, Barcode Billing, Bahi-Khata (Udhaar) ledger, and Instant Grocery Delivery web application built with React, Vite, Tailwind CSS, Zustand, and Firebase Cloud Firestore.

---

## 📚 Complete Guides & Documentation

- 📖 **[Kirana Store & POS Operating Guide](./KIRANA_STORE_OPERATING_GUIDE.md)**: Full manual covering USB/Wireless barcode scanners, 80mm thermal receipt printing, audio tones, Khata udhaar accounting, invoice barcodes, and keyboard shortcuts.
- 🚀 **[GitHub + Vercel Hosting Guide](./VERCEL_GITHUB_DEPLOYMENT_GUIDE.md)**: Step-by-step instructions to push to your GitHub and deploy to Vercel in 60 seconds with zero 404 routing errors, HTTPS camera scanning, and Firebase domain authorization.

---

## Firebase Setup & Configuration

This project is fully integrated with Firebase. It uses Firebase Authentication, Cloud Firestore, and Firebase Storage.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Add a Web App to the project and copy the configuration snippet.

### 2. Enable Authentication
1. Go to **Authentication** in the Firebase console.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, enable **Email/Password**.

### 3. Setup Firestore
1. Go to **Firestore Database** in the Firebase console.
2. Click **Create database** (start in production mode).

### 4. Setup Storage
1. Go to **Storage** in the Firebase console.
2. Click **Get Started** (start in production mode).

### 5. Deploy Security Rules
You can deploy the generated security rules using the Firebase CLI or copy them into the Firebase Console directly:

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() { 
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; 
    }

    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId && request.resource.data.role == 'customer';
      allow update: if request.auth != null && (request.auth.uid == userId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']) || isAdmin());
      allow delete: if isAdmin();
    }

    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /orders/{orderId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update: if isAdmin() || (request.auth != null && request.auth.uid == resource.data.userId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['orderStatus']) && request.resource.data.orderStatus == 'cancelled');
      allow delete: if isAdmin();
    }
  }
}
```

### 6. Admin Account Configuration
1. Sign up for a normal account through the frontend via `/login`.
2. Open the [Firebase Console](https://console.firebase.google.com/).
3. Go to **Firestore Database** -> `users` collection.
4. Find the document corresponding to your UID.
5. Change the `role` field from `"customer"` to `"admin"`.
6. Reload the application. You will now see the "Admin Panel" link in the header.

### 7. Seed Sample Data
1. Log in to your newly created admin account.
2. Navigate to the Admin Panel (`/admin`).
3. Go to the **Products** section (`/admin/products`).
4. Click the **Seed Sample Data** button to populate the store with categories and sample grocery products.

## Environment Variables
The application expects your Firebase configuration to be provided during initialization. In AI Studio, this is managed via `firebase-applet-config.json` automatically, but you can also configure `VITE_FIREBASE_API_KEY` etc. in a `.env` file if running locally outside the platform.
