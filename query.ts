import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  try {
    const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('sortOrder')));
    console.log('Categories:', catSnap.docs.length);
    const prodSnap = await getDocs(query(collection(db, 'products'), limit(12)));
    console.log('Products:', prodSnap.docs.length);
  } catch (e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
check();
