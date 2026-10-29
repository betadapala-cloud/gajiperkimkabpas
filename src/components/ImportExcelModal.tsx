import React, { useState, useRef } from 'react';
import { PayrollItem } from '../types';
import { downloadExcelTemplate, parseExcelPayroll } from '../utils/excelHelper';
import { formatNominal } from '../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (items: PayrollItem[], mode: 'replace' | 'append') => void;
  currentCount: number;
}

export const ImportExcelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentCount,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    const result = await parseExcelPayroll(selectedFile);
    setIsLoading(false);

    if (result.success && result.items.length > 0) {
      setParsedItems(result.items);
    } else {
      setError(result.error || 'Gagal memproses file Excel.');
      setParsedItems([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parsedItems.length === 0) return;
    onImportSuccess(parsedItems, importMode);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParsedItems([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalKotor = parsedItems.reduce((acc, curr) => acc + curr.gajiKotor, 0);
  const totalPotongan = parsedItems.reduce((acc, curr) => acc + curr.potongan, 0);
  const totalBersih = parsedItems.reduce((acc, curr) => acc + curr.gajiBersih, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Import Data Payroll dari Excel</h3>
              <p className="text-xs text-emerald-200">
                Mendukung file format .xlsx, .xls, atau .csv
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Action Download Template */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  Belum punya template format Excel?
                </p>
                <p className="text-[11px] text-emerald-700">
                  Unduh template resmi dengan susunan kolom NO, NAMA, NO REKENING, NILAI KOTOR, JUMLAH POTONGAN, NILAI BERSIH.
                </p>
              </div>
            </div>
            <button
              onClick={downloadExcelTemplate}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <div className="p-3 bg-white group-hover:bg-emerald-100 text-slate-400 group-hover:text-emerald-600 rounded-2xl shadow-xs transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Pilih atau Tarik Berkas Excel ke Sini
              </p>
              <p className="text-xs text-slate-400">
                Format yang didukung: .xlsx, .xls, .csv (Maksimal 10 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedItems.length} Pegawai Terbaca
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Ganti File
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Preview Ringkasan Hasil Parse */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Total Pegawai</p>
                      <p className="text-base font-bold text-slate-800">{parsedItems.length} Orang</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Total Potongan</p>
                      <p className="text-base font-bold text-rose-600">Rp {formatNominal(totalPotongan)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Total Nilai Bersih</p>
                      <p className="text-base font-bold text-emerald-700">Rp {formatNominal(totalBersih)}</p>
                    </div>
                  </div>

                  {/* Mode Pilihan */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Metode Penempatan Data:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                        importMode === 'replace'
                          ? 'bg-white border-emerald-500 shadow-2xs text-emerald-900 font-semibold'
                          : 'bg-slate-100/60 border-slate-200 text-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-emerald-600"
                        />
                        <span>Ganti Semua Data ({currentCount} item lama akan diganti)</span>
                      </label>
                      <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                        importMode === 'append'
                          ? 'bg-white border-emerald-500 shadow-2xs text-emerald-900 font-semibold'
                          : 'bg-slate-100/60 border-slate-200 text-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-emerald-600"
                        />
                        <span>Tambahkan ke Data Saat Ini (Gabung)</span>
                      </label>
                    </div>
                  </div>

                  {/* Pratinjau 4 Baris Pertama */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-center w-8">NO</th>
                          <th className="p-2">NAMA</th>
                          <th className="p-2">NO REKENING</th>
                          <th className="p-2 text-right">NILAI KOTOR</th>
                          <th className="p-2 text-right">JUMLAH POTONGAN</th>
                          <th className="p-2 text-right">NILAI BERSIH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedItems.slice(0, 5).map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-500">{row.no}</td>
                            <td className="p-2 font-medium text-slate-800">{row.nama}</td>
                            <td className="p-2 font-mono text-slate-600">{row.noRekening}</td>
                            <td className="p-2 text-right font-mono">{formatNominal(row.gajiKotor)}</td>
                            <td className="p-2 text-right font-mono text-rose-600">{formatNominal(row.potongan)}</td>
                            <td className="p-2 text-right font-mono font-semibold text-emerald-700">{formatNominal(row.gajiBersih)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedItems.length > 5 && (
                      <div className="p-1.5 text-center bg-slate-50 text-[11px] text-slate-500 border-t border-slate-200">
                        ... dan {parsedItems.length - 5} data pegawai lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={parsedItems.length === 0 || isLoading}
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan Import ({parsedItems.length} Pegawai)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
