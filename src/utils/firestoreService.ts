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
        let localPayload: SharedDatabasePayload | null = null;
        try {
          const rawData = localStorage.getItem('payroll_data_by_category');
          const rawSettings = localStorage.getItem('payroll_settings_by_category');
          const rawCat = localStorage.getItem('payroll_active_category');
          const rawPeriods = localStorage.getItem('payroll_active_period_ids');
          if (rawData) {
            localPayload = {
              activeCategory: (rawCat as any) || 'paruh-waktu',
              activePeriodIdByCategory: rawPeriods ? JSON.parse(rawPeriods) : {},
              settingsByCategory: rawSettings ? JSON.parse(rawSettings) : {},
              dataByCategory: JSON.parse(rawData),
              lastUpdated: parseInt(localStorage.getItem('payroll_last_updated') || '0', 10),
            };
          }
        } catch {}

        if (snapshot.exists()) {
          const remoteData = snapshot.data() as SharedDatabasePayload;
          const remoteTime = remoteData.lastUpdated || 0;
          const localTime = localPayload?.lastUpdated || 0;

          if (localTime > remoteTime && localPayload) {
            // Data lokal lebih baru, simpan ke Firestore agar Firestore selalu menggunakan data terbaru
            await setDoc(docRef, sanitizeForFirestore(localPayload));
            onData(localPayload);
          } else {
            // Data remote sama atau lebih baru, gunakan remote data
            onData(remoteData);
          }
        } else {
          // Dokumen belum ada di Firestore, periksa apakah ada data lokal yang valid
          if (localPayload && localPayload.dataByCategory && Object.keys(localPayload.dataByCategory).length > 0) {
            await setDoc(docRef, sanitizeForFirestore(localPayload));
            onData(localPayload);
          } else {
            const initialData = getDefaultDatabasePayload();
            await setDoc(docRef, sanitizeForFirestore(initialData));
            onData(initialData);
          }
        }
      } catch (err) {
        console.error('Error processing Firestore snapshot:', err);
        if (onError) onError(err);
      }
    },
    (error: FirestoreError) => {
      console.warn('Firestore subscription offline / unreachable, using local cache:', error.message);
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
