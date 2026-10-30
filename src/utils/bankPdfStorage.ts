import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BankPayrollPdf } from '../types';

const DB_NAME = 'PayrollBankPdfStorage';
const DB_VERSION = 1;
const STORE_NAME = 'bank_payroll_pdfs';

/**
 * Inisialisasi IndexedDB untuk penyimpanan file PDF skala penuh di browser
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME, { keyPath: 'periodId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Simpan berkas PDF ke IndexedDB lokal dan Cloud Firestore
 */
export async function saveBankPdfToStorage(periodId: string, pdf: BankPayrollPdf): Promise<void> {
  // 1. Simpan ke IndexedDB lokal
  try {
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        periodId,
        fileName: pdf.fileName,
        fileSize: pdf.fileSize,
        uploadedAt: pdf.uploadedAt,
        dataUrl: pdf.dataUrl || '',
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Gagal menyimpan PDF ke IndexedDB:', err);
  }

  // 2. Simpan ke Cloud Firestore (jika ukuran dataUrl < 900KB) agar tersinkron ke semua perangkat
  if (pdf.dataUrl && pdf.dataUrl.length < 900000) {
    try {
      const docRef = doc(db, 'payroll_periods', `bank_pdf_${periodId}`);
      await setDoc(docRef, {
        periodId,
        fileName: pdf.fileName,
        fileSize: pdf.fileSize,
        uploadedAt: pdf.uploadedAt,
        dataUrl: pdf.dataUrl,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Gagal menyimpan PDF ke Firestore:', err);
    }
  }
}

/**
 * Ambil dataUrl PDF dari IndexedDB, Firestore, atau file default
 */
export async function getBankPdfDataUrl(periodId: string, cachedDataUrl?: string): Promise<string | null> {
  if (cachedDataUrl && cachedDataUrl.startsWith('data:')) {
    return cachedDataUrl;
  }

  // 1. Coba ambil dari IndexedDB
  try {
    const idb = await openIndexedDB();
    const result = await new Promise<{ dataUrl: string } | null>((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(periodId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (result && result.dataUrl) {
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('Gagal membaca PDF dari IndexedDB:', err);
  }

  // 2. Coba ambil dari Cloud Firestore
  try {
    const docRef = doc(db, 'payroll_periods', `bank_pdf_${periodId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.dataUrl) {
        return data.dataUrl;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca PDF dari Firestore:', err);
  }

  // 3. Fallback jika periode Oktober 2024 Paruh Waktu belum punya PDF, gunakan dokumen yang ada
  if (periodId === 'pw-period-2024-10') {
    return '/assets/aistudio/LAPORAN_PENYALURAN_GAJI_PEGAWAI_PARUH_WAKTU_Oktober_2024_cbadf751.pdf';
  }

  return null;
}

/**
 * Hapus berkas PDF dari penyimpanan
 */
export async function deleteBankPdfFromStorage(periodId: string): Promise<void> {
  // 1. Hapus dari IndexedDB
  try {
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(periodId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Gagal menghapus PDF dari IndexedDB:', err);
  }

  // 2. Hapus dari Firestore
  try {
    const docRef = doc(db, 'payroll_periods', `bank_pdf_${periodId}`);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Gagal menghapus PDF dari Firestore:', err);
  }
}
