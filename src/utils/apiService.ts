import { PayrollCategory, PayrollPeriod, ReportSettings } from '../types';

export interface SharedDatabasePayload {
  activeCategory: PayrollCategory;
  activePeriodIdByCategory: Record<PayrollCategory, string>;
  settingsByCategory: Record<PayrollCategory, ReportSettings>;
  dataByCategory: Record<PayrollCategory, PayrollPeriod[]>;
  lastUpdated?: number;
}

/**
 * Mengambil database penggajian bersama dari server backend
 * Memastikan data yang tampil sama di browser manapun / perangkat manapun
 */
export async function fetchSharedDatabase(): Promise<SharedDatabasePayload | null> {
  try {
    const response = await fetch('/api/payroll', {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const result = await response.json();
    if (result.success && result.data) {
      return result.data as SharedDatabasePayload;
    }
    return null;
  } catch (error) {
    console.warn('Gagal memuat database dari server, beralih ke cache lokal:', error);
    return null;
  }
}

/**
 * Menyimpan data perubahan ke database server secara realtime
 */
export async function saveSharedDatabase(payload: SharedDatabasePayload): Promise<boolean> {
  try {
    const response = await fetch('/api/payroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        lastUpdated: Date.now(),
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Gagal menyimpan ke database server:', error);
    return false;
  }
}
