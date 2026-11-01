import { SharedDatabasePayload } from './apiService';
import firebaseConfig from '../../firebase-applet-config.json';

const FOLDER_NAME = 'DATABASE GAJIPERKIM';
const FILE_NAME = 'payroll-database.json';

let cachedAccessToken: string | null = null;

export function setGoogleAccessToken(token: string) {
  cachedAccessToken = token;
  try {
    localStorage.setItem('gdrive_access_token', token);
  } catch {}
}

export function getGoogleAccessToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    return localStorage.getItem('gdrive_access_token');
  } catch {
    return null;
  }
}

/**
 * Cek apakah Google Drive terhubung
 */
export function isGoogleDriveConnected(): boolean {
  return !!getGoogleAccessToken();
}

/**
 * Meminta token akses Google Drive menggunakan Google Identity Services (GIS)
 */
export function requestGoogleDriveAuth(silent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window tidak tersedia'));
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      // Load GIS script dynamically if not present
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initAndRequestToken(resolve, reject, silent);
      };
      script.onerror = () => reject(new Error('Gagal memuat Google Identity Services'));
      document.head.appendChild(script);
      return;
    }

    initAndRequestToken(resolve, reject, silent);
  });
}

function initAndRequestToken(resolve: (token: string) => void, reject: (err: any) => void, silent = false) {
  try {
    const google = (window as any).google;
    const client = google.accounts.oauth2.initTokenClient({
      client_id: (firebaseConfig as any).oAuthClientId || '',
      scope: 'https://www.googleapis.com/auth/drive',
      login_hint: 'jokomardiyanto92@gmail.com',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const token = response.access_token;
        setGoogleAccessToken(token);
        resolve(token);
      },
    });
    client.requestAccessToken({ prompt: silent ? 'none' : '' });
  } catch (err) {
    reject(err);
  }
}

/**
 * Mencari atau membuat folder 'DATABASE GAJIPERKIM' di Google Drive
 */
async function getOrCreateFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Buat folder baru
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

/**
 * Sinkronisasi Baca dari Google Drive (Folder DATABASE GAJIPERKIM)
 */
export async function readDatabaseFromGoogleDrive(): Promise<SharedDatabasePayload | null> {
  const token = getGoogleAccessToken();
  if (!token) return null;

  try {
    const folderId = await getOrCreateFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and name='${FILE_NAME}' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      return null;
    }

    const fileId = data.files[0].id;
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await contentRes.json();
    return payload as SharedDatabasePayload;
  } catch (err) {
    console.warn('Background Google Drive read sync note:', err);
    return null;
  }
}

/**
 * Sinkronisasi Tulis (Simpan) ke Google Drive (Folder DATABASE GAJIPERKIM) secara latar belakang
 */
export async function saveDatabaseToGoogleDrive(payload: SharedDatabasePayload): Promise<boolean> {
  const token = getGoogleAccessToken();
  if (!token) return false;

  try {
    const folderId = await getOrCreateFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and name='${FILE_NAME}' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const fileContent = JSON.stringify(payload, null, 2);

    if (data.files && data.files.length > 0) {
      // Update file yang sudah ada
      const fileId = data.files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      });
    } else {
      // Buat file baru multipart
      const metadata = {
        name: FILE_NAME,
        parents: [folderId],
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    }
    return true;
  } catch (err) {
    console.warn('Background Google Drive save sync note:', err);
    return false;
  }
}
