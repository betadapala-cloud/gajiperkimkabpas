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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Import Data Payroll dari Excel</h3>
              <p className="text-xs text-slate-400">
                Mendukung file format .xlsx, .xls, atau .csv
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Action Download Template */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-900/80 text-emerald-300 rounded-lg">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Belum punya template format Excel?
                </p>
                <p className="text-[11px] text-emerald-400/80">
                  Unduh template resmi dengan susunan kolom NO, NAMA, NO REKENING, NILAI KOTOR, JUMLAH POTONGAN, NILAI BERSIH.
                </p>
              </div>
            </div>
            <button
              onClick={downloadExcelTemplate}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-300 bg-slate-800 hover:bg-slate-750 border border-emerald-700/60 rounded-lg shadow-2xs transition flex items-center gap-1.5 shrink-0"
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
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-850 hover:bg-slate-800 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <div className="p-3 bg-slate-800 group-hover:bg-emerald-950/80 text-slate-400 group-hover:text-emerald-400 rounded-2xl shadow-xs transition border border-slate-700">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
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
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">{file.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • {parsedItems.length} Pegawai Terbaca
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-rose-400 hover:underline"
                >
                  Ganti File
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-950/80 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Preview Ringkasan Hasil Parse */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Pegawai</p>
                      <p className="text-base font-bold text-white">{parsedItems.length} Orang</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Potongan</p>
                      <p className="text-base font-bold text-rose-400 font-mono">Rp {formatNominal(totalPotongan)}</p>
                    </div>
                    <div className="p-3 bg-emerald-950/70 rounded-xl border border-emerald-800/60">
                      <p className="text-[10px] uppercase font-bold text-emerald-400">Total Nilai Bersih</p>
                      <p className="text-base font-bold text-emerald-300 font-mono">Rp {formatNominal(totalBersih)}</p>
                    </div>
                  </div>

                  {/* Mode Pilihan */}
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-slate-300">Metode Penempatan Data:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                        importMode === 'replace'
                          ? 'bg-slate-900 border-emerald-500 shadow-2xs text-emerald-300 font-semibold'
                          : 'bg-slate-850 border-slate-700 text-slate-400'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-emerald-500"
                        />
                        <span>Ganti Semua Data ({currentCount} item diganti)</span>
                      </label>
                      <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                        importMode === 'append'
                          ? 'bg-slate-900 border-emerald-500 shadow-2xs text-emerald-300 font-semibold'
                          : 'bg-slate-850 border-slate-700 text-slate-400'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-emerald-500"
                        />
                        <span>Tambahkan ke Data Saat Ini (Gabung)</span>
                      </label>
                    </div>
                  </div>

                  {/* Pratinjau 4 Baris Pertama */}
                  <div className="border border-slate-700 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800 text-slate-300 sticky top-0 font-bold border-b border-slate-700">
                        <tr>
                          <th className="p-2 text-center w-8">NO</th>
                          <th className="p-2">NAMA</th>
                          <th className="p-2">NO REKENING</th>
                          <th className="p-2 text-right">NILAI KOTOR</th>
                          <th className="p-2 text-right">JUMLAH POTONGAN</th>
                          <th className="p-2 text-right">NILAI BERSIH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/90 text-slate-200">
                        {parsedItems.slice(0, 5).map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-800/60">
                            <td className="p-2 text-center text-slate-400">{row.no}</td>
                            <td className="p-2 font-medium text-white">{row.nama}</td>
                            <td className="p-2 font-mono text-slate-300">{row.noRekening}</td>
                            <td className="p-2 text-right font-mono text-slate-200">{formatNominal(row.gajiKotor)}</td>
                            <td className="p-2 text-right font-mono text-rose-400">{formatNominal(row.potongan)}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-300">{formatNominal(row.gajiBersih)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedItems.length > 5 && (
                      <div className="p-1.5 text-center bg-slate-800 text-[11px] text-slate-400 border-t border-slate-700">
                        ... dan {parsedItems.length - 5} data pegawai lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={parsedItems.length === 0 || isLoading}
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
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
