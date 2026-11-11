import React, { useState, useEffect } from 'react';
import { ReportSettings } from '../types';
import { Settings, Save, X, Building, FileText, CreditCard, Eye, EyeOff } from 'lucide-react';

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

  useEffect(() => {
    setFormData(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Pengaturan Kop & Judul Laporan</h3>
              <p className="text-xs text-slate-400">
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
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
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
              className="w-full px-3.5 py-2.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold uppercase placeholder-slate-500"
            />
            <p className="text-[11px] text-slate-400">
              Judul utama dokumen yang ditampilkan pada header tabel dan berkas PDF/Excel.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>Informasi Instansi / Lembaga</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Nama Instansi / Perusahaan
              </label>
              <input
                type="text"
                required
                value={formData.instansi}
                onChange={(e) =>
                  setFormData({ ...formData, instansi: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Unit Kerja / Bagian
              </label>
              <input
                type="text"
                value={formData.unitKerja}
                onChange={(e) =>
                  setFormData({ ...formData, unitKerja: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Kota
                </label>
                <input
                  type="text"
                  value={formData.kota || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, kota: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 31 Oktober 2024"
                  value={formData.tanggalLaporan || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggalLaporan: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Opsi Tampilan & Privasi Nomor Rekening */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Opsi Tampilan & Privasi Data</span>
            </div>

            <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">
                      Nomor Rekening Pegawai
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tampilkan atau sembunyikan kolom nomor rekening pegawai pada tabel laporan dan cetak.
                  </p>
                </div>

                {/* Tombol Sakelar Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.showNoRekening !== false}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      showNoRekening: prev.showNoRekening === false ? true : false,
                    }))
                  }
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    formData.showNoRekening !== false ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  title={
                    formData.showNoRekening !== false
                      ? 'Klik untuk menyembunyikan nomor rekening'
                      : 'Klik untuk menampilkan nomor rekening'
                  }
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white text-slate-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.showNoRekening !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {formData.showNoRekening !== false ? (
                      <Eye className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-slate-500" />
                    )}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    formData.showNoRekening !== false
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  }`}
                >
                  {formData.showNoRekening !== false
                    ? '✓ Status: Nomor Rekening Ditampilkan'
                    : '✗ Status: Nomor Rekening Disembunyikan (Privasi Aktif)'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition flex items-center gap-2"
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
