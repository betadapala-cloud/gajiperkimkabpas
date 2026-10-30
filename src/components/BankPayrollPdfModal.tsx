import React, { useState, useEffect, useRef } from 'react';
import { PayrollPeriod, BankPayrollPdf } from '../types';
import { getBankPdfDataUrl } from '../utils/bankPdfStorage';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  X,
  FileUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  period: PayrollPeriod | null;
  categoryName: string;
  onUploadPdf: (file: File) => Promise<void>;
  onDeletePdf: () => Promise<void>;
  requireAdmin: (action: () => void) => void;
  isUnlocked: boolean;
}

export const BankPayrollPdfModal: React.FC<Props> = ({
  isOpen,
  onClose,
  period,
  categoryName,
  onUploadPdf,
  onDeletePdf,
  requireAdmin,
  isUnlocked,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !period) {
      setPdfUrl(null);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getBankPdfDataUrl(period.id, period.bankPayrollPdf?.dataUrl)
      .then((url) => {
        if (!isMounted) return;
        setPdfUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Gagal mengambil PDF:', err);
        setErrorMessage('Gagal memuat dokumen PDF.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, period, period?.bankPayrollPdf]);

  if (!isOpen || !period) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Format berkas harus PDF (.pdf)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 15 MB.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      await onUploadPdf(file);
    } catch (err) {
      setErrorMessage('Gagal mengunggah berkas PDF.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenNewTab = () => {
    if (!pdfUrl) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<iframe src="${pdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
      newWindow.document.title = `Data Asli Payroll ke Bank - ${period.title}`;
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = period.bankPayrollPdf?.fileName || `Data_Asli_Payroll_Bank_${period.title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-slate-300">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  Data Asli Payroll ke Bank (PDF)
                </h3>
                {pdfUrl && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    Tersedia
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kategori: <span className="text-indigo-300 font-semibold">{categoryName}</span> • Periode: <span className="text-white font-semibold">{period.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Tutup Pratinjau PDF"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Aksi Atas */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            {period.bankPayrollPdf ? (
              <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                <span className="font-semibold text-slate-900">{period.bankPayrollPdf.fileName}</span>
                {period.bankPayrollPdf.fileSize > 0 && (
                  <span className="text-slate-400 font-mono">({formatFileSize(period.bankPayrollPdf.fileSize)})</span>
                )}
                {period.bankPayrollPdf.uploadedAt && (
                  <span className="text-[11px] text-slate-500">Diunggah: {period.bankPayrollPdf.uploadedAt}</span>
                )}
              </div>
            ) : pdfUrl ? (
              <span className="text-slate-600 font-medium">Dokumen Bukti Payroll Bank Periode {period.title}</span>
            ) : (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Belum ada berkas PDF data asli payroll ke bank untuk periode ini
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Tombol Upload / Ganti PDF */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => requireAdmin(() => fileInputRef.current?.click())}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
              title={isUnlocked ? "Upload berkas PDF" : "Terkunci: Memerlukan sandi admin untuk mengunggah PDF"}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{pdfUrl ? 'Ganti PDF' : 'Upload PDF'}</span>
                </>
              )}
            </button>

            {/* Tombol Download */}
            {pdfUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1.5"
                title="Unduh berkas PDF asli"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh</span>
              </button>
            )}

            {/* Tombol Buka Tab Baru */}
            {pdfUrl && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1.5"
                title="Buka PDF di tab browser baru"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Buka di Tab Baru</span>
              </button>
            )}

            {/* Tombol Hapus PDF */}
            {period.bankPayrollPdf && (
              <button
                type="button"
                onClick={() =>
                  requireAdmin(() => {
                    if (window.confirm('Hapus berkas PDF data asli payroll ke bank untuk periode ini?')) {
                      onDeletePdf();
                    }
                  })
                }
                className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition flex items-center gap-1"
                title={isUnlocked ? "Hapus berkas PDF" : "Terkunci: Memerlukan sandi admin untuk menghapus PDF"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifikasi Error jika ada */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Area Konten Pratinjau PDF */}
        <div className="flex-1 overflow-auto bg-slate-200/80 p-3 sm:p-5 flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Memuat berkas PDF data asli payroll...</p>
            </div>
          ) : pdfUrl ? (
            <div className="w-full h-full flex flex-col space-y-2">
              <iframe
                src={pdfUrl}
                title={`Data Asli Payroll ke Bank - ${period.title}`}
                className="w-full h-[66vh] bg-white rounded-xl border border-slate-300 shadow-sm"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Dokumen PDF Data Asli Payroll ke Bank ({period.title})</span>
                <button
                  onClick={handleOpenNewTab}
                  className="text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Jika tampilan terpotong, klik untuk buka di tab penuh
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 p-8 sm:p-12 text-center max-w-lg w-full space-y-4 shadow-sm transition">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <FileUp className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-800">
                  Belum Ada Berkas PDF Data Asli Payroll ke Bank
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unggah berkas PDF data asli laporan atau bukti penyaluran payroll ke Bank (Bank Jatim / Bank Mina Mandiri) untuk periode <strong className="text-slate-800">{period.title}</strong>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => requireAdmin(() => fileInputRef.current?.click())}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih & Upload Berkas PDF</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Format didukung: Berkas dokumen PDF (.pdf) hingga 15 MB
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
