import { doc, getDoc, setDoc, onSnapshot, DocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PayrollCategory, PayrollItem, PayrollPeriod, ReportSettings } from '../types';
import { INITIAL_DATA_BY_CATEGORY, INITIAL_REPORT_SETTINGS } from './initialData';
import { saveSharedDatabase } from './apiService';

export interface SharedDatabasePayload {
  activeCategory: PayrollCategory;
  activePeriodIdByCategory: Record<PayrollCategory, string>;
  settingsByCategory: Record<PayrollCategory, ReportSettings>;
  dataByCategory: Record<PayrollCategory, PayrollPeriod[]>;
  lastUpdated?: number;
}

const FIRESTORE_DOC_PATH = 'payroll_periods/shared_database';

/**
 * Data default awal saat Firestore pertama kali dijalankan
 */
export function getDefaultDatabasePayload(): SharedDatabasePayload {
  return {
    activeCategory: 'paruh-waktu',
    activePeriodIdByCategory: {
      'paruh-waktu': 'pw-period-2024-10',
      'pns': 'pns-period-2024-10',
      'pppk': 'pppk-period-2024-10',
      'tpp-pns': 'tpp-period-2024-10',
    },
    settingsByCategory: INITIAL_REPORT_SETTINGS,
    dataByCategory: INITIAL_DATA_BY_CATEGORY,
    lastUpdated: Date.now(),
  };
}

/**
 * Berlangganan (Subscribe) ke Cloud Firestore secara Real-Time.
 * Semua perubahan yang dilakukan pengguna di perangkat/browser manapun
 * akan otomatis tersinkronisasi secara langsung ke semua layar.
 */
export function subscribeToFirestorePayroll(
  onData: (payload: SharedDatabasePayload) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(db, 'payroll_periods', 'shared_database');

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot: DocumentSnapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data() as SharedDatabasePayload;
          onData(data);
        } else {
          // Inisialisasi awal ke Cloud Firestore jika dokumen belum ada
          const initialData = getDefaultDatabasePayload();
          await setDoc(docRef, initialData);
          onData(initialData);
        }
      } catch (err) {
        console.error('Error processing Firestore snapshot:', err);
        if (onError) onError(err);
      }
    },
    (error: FirestoreError) => {
      handleFirestoreError(error, OperationType.GET, FIRESTORE_DOC_PATH);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Membersihkan nilai undefined agar tidak menyebabkan error pada Firestore setDoc
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned;
}

/**
 * Menyimpan seluruh data penggajian ke Cloud Firestore terpusat
 */
export async function saveToCloudFirestore(payload: SharedDatabasePayload): Promise<boolean> {
  const docRef = doc(db, 'payroll_periods', 'shared_database');
  const updatedPayload: SharedDatabasePayload = {
    ...payload,
    lastUpdated: Date.now(),
  };

  const sanitizedPayload = sanitizeForFirestore(updatedPayload);

  try {
    await setDoc(docRef, sanitizedPayload, { merge: true });
    // Cadangkan juga ke backend lokal /api/payroll
    saveSharedDatabase(updatedPayload).catch(() => {});
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, FIRESTORE_DOC_PATH);
    return false;
  }
}

/**
 * Menyimpan konfirmasi penerimaan gaji dan komentar/feedback pegawai
 * FUNGSI INI TERBUKA UNTUK SEMUA PEGAWAI (TIDAK DIKUNCI ADMIN)
 */
export async function saveEmployeeActionToFirestore(
  category: PayrollCategory,
  periodId: string,
  employeeId: string,
  updates: {
    isConfirmed?: boolean;
    confirmedAt?: string;
    feedback?: string;
    feedbackAt?: string;
  },
  currentData: SharedDatabasePayload
): Promise<SharedDatabasePayload> {
  const categoryPeriods = currentData.dataByCategory[category] || [];
  const updatedPeriods = categoryPeriods.map((period) => {
    if (period.id !== periodId) return period;

    const updatedItems = period.items.map((item) => {
      if (item.id !== employeeId) return item;
      return {
        ...item,
        ...updates,
      };
    });

    return {
      ...period,
      items: updatedItems,
    };
  });

  const nextPayload: SharedDatabasePayload = {
    ...currentData,
    dataByCategory: {
      ...currentData.dataByCategory,
      [category]: updatedPeriods,
    },
    lastUpdated: Date.now(),
  };

  await saveToCloudFirestore(nextPayload);
  return nextPayload;
}
