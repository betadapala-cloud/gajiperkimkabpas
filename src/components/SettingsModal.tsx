import React, { useState } from 'react';
import { ReportSettings } from '../types';
import { Settings, Save, X, Building, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ReportSettings;
  onSave: (newSettings: ReportSettings) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<ReportSettings>(settings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Pengaturan Kop & Judul Laporan</h3>
              <p className="text-xs text-slate-300">
                Ubah judul laporan dan kop instansi untuk cetak & PDF
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Judul Laporan yang dapat diedit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Judul Laporan</span>
            </label>
            <input
              type="text"
              required
              value={formData.judulLaporan}
              onChange={(e) =>
                setFormData({ ...formData, judulLaporan: e.target.value })
              }
              placeholder="Contoh: LAPORAN PENYALURAN GAJI PEGAWAI PARUH WAKTU"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold uppercase"
            />
            <p className="text-[11px] text-slate-500">
              Judul utama dokumen yang ditampilkan pada header tabel dan berkas PDF/Excel.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Informasi Instansi / Lembaga</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Instansi / Perusahaan
              </label>
              <input
                type="text"
                required
                value={formData.instansi}
                onChange={(e) =>
                  setFormData({ ...formData, instansi: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Unit Kerja / Bagian
              </label>
              <input
                type="text"
                value={formData.unitKerja}
                onChange={(e) =>
                  setFormData({ ...formData, unitKerja: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kota
                </label>
                <input
                  type="text"
                  value={formData.kota || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, kota: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 31 Oktober 2024"
                  value={formData.tanggalLaporan || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggalLaporan: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
