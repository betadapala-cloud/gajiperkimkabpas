import React, { useState, useRef } from 'react';
import { SharedDatabasePayload } from '../utils/apiService';
import { Database, Download, Upload, CheckCircle2, AlertCircle, X, FileText, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDatabase: SharedDatabasePayload;
  onRestore: (restoredData: SharedDatabasePayload) => void;
}

export const DatabaseBackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentDatabase,
  onRestore,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<SharedDatabasePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Hitung metrik database saat ini
  const totalPeriods = Object.values(currentDatabase.dataByCategory || {}).reduce(
    (acc, periods) => acc + (periods?.length || 0),
    0
  );
  const totalEmployees = Object.values(currentDatabase.dataByCategory || {}).reduce(
    (acc, periods) =>
      acc +
      (periods || []).reduce((pAcc, period) => pAcc + (period.items?.length || 0), 0),
    0
  );

  // 1. Download Database Keseluruhan
  const handleDownload = () => {
    try {
      const exportPayload: SharedDatabasePayload = {
        ...currentDatabase,
        lastUpdated: Date.now(),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `Backup_Database_Payroll_${dateStr}_${timeStr}.json`;

      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg(`Database berhasil diunduh (${filename}).`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setError('Gagal mengunduh berkas database.');
    }
  };

  // 2. Upload / Baca Berkas Cadangan JSON
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as SharedDatabasePayload;

        // Validasi struktur dasar database
        if (!parsed || !parsed.dataByCategory || !parsed.settingsByCategory) {
          throw new Error('Format file tidak sesuai dengan struktur database aplikasi.');
        }

        setParsedData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Berkas JSON rusak atau tidak valid.');
        setParsedData(null);
      }
    };

    reader.onerror = () => {
      setError('Gagal membaca berkas yang dipilih.');
    };

    reader.readAsText(file);
  };

  // 3. Konfirmasi Pulihkan / Terapkan Database
  const handleConfirmRestore = () => {
    if (!parsedData) return;
    onRestore(parsedData);
    setSuccessMsg('Database keseluruhan berhasil dipulihkan!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleResetUpload = () => {
    setSelectedFile(null);
    setParsedData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Backup & Restore Database Keseluruhan</h3>
              <p className="text-xs text-slate-300">
                Unduh berkas cadangan atau unggah untuk memulihkan seluruh data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Alert */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BAGIAN 1: DOWNLOAD DATABASE (BACKUP) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    1. Download Database Terakhir
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mencakup seluruh 4 kategori, semua periode bulanan, data pegawai, dan pengaturan.
                  </p>
                </div>
              </div>
            </div>

            {/* Ringkasan data yang akan diunduh */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Kategori</span>
                <span className="font-bold text-slate-800">4 Bagian</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Periode</span>
                <span className="font-bold text-slate-800">{totalPeriods} Bulan</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Pegawai</span>
                <span className="font-bold text-emerald-700">{totalEmployees} Orang</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Berkas Cadangan (.JSON)</span>
            </button>
          </div>

          {/* BAGIAN 2: UPLOAD DATABASE (RESTORE) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  2. Upload & Pulihkan Database
                </h4>
                <p className="text-[11px] text-slate-500">
                  Unggah berkas JSON cadangan untuk memulihkan seluruh data aplikasi.
                </p>
              </div>
            </div>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">
                  Pilih Berkas Backup (.json)
                </span>
                <span className="text-[10px] text-slate-400">
                  Klik untuk mencari file cadangan di komputer Anda
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-800 block">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleResetUpload}
                    className="text-[11px] text-rose-600 hover:underline font-medium"
                  >
                    Ganti
                  </button>
                </div>

                {parsedData && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Berkas Valid & Siap Dipulihkan:</span>
                    </div>
                    <ul className="text-[11px] text-emerald-800 space-y-0.5 list-disc pl-5">
                      <li>Kategori: Paruh Waktu, PNS, PPPK, TPP PNS</li>
                      <li>
                        Total Periode:{' '}
                        <strong>
                          {Object.values(parsedData.dataByCategory || {}).reduce(
                            (a, c) => a + (c?.length || 0),
                            0
                          )}{' '}
                          Bulan
                        </strong>
                      </li>
                      <li>
                        Total Pegawai:{' '}
                        <strong>
                          {Object.values(parsedData.dataByCategory || {}).reduce(
                            (a, c) =>
                              a + (c || []).reduce((pa, p) => pa + (p.items?.length || 0), 0),
                            0
                          )}{' '}
                          Orang
                        </strong>
                      </li>
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!parsedData}
                  onClick={handleConfirmRestore}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Terapkan & Pulihkan Seluruh Database</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Close */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
