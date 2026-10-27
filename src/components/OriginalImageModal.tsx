import React from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OriginalImageModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-emerald-400 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Tabel Referensi Asli yang Diunggah</h3>
              <p className="text-xs text-slate-400">
                Laporan Payroll Paruh Waktu Oktober (Format Gambar Sumber)
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

        {/* Image Content */}
        <div className="p-6 bg-slate-100 flex flex-col items-center justify-center">
          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-300 max-w-full overflow-auto">
            <img
              src="/assets/aistudio/laporan_payrol_Paruh_waktu_Oktober_44d7207e.JPG"
              alt="Tabel Asli Payroll Paruh Waktu"
              className="max-w-full h-auto object-contain mx-auto rounded"
            />
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Tabel di aplikasi telah dipetakan 100% presisi sesuai kolom, nama, rekening, gaji kotor, potongan BPJS+DWP, dan gaji bersih pada gambar di atas.
          </p>
        </div>
      </div>
    </div>
  );
};
