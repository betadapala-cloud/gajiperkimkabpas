import React, { useState, useEffect } from 'react';
import { PayrollItem } from '../types';
import { formatNominal, parseNominal } from '../utils/formatters';
import { X, Calculator, UserCheck, CreditCard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PayrollItem) => void;
  editItem?: PayrollItem | null;
  nextNo: number;
}

export const InputEmployeeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  nextNo,
}) => {
  const [nama, setNama] = useState('');
  const [noRekening, setNoRekening] = useState('');
  const [gajiKotor, setGajiKotor] = useState<number>(0);
  const [potongan, setPotongan] = useState<number>(0);
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editItem) {
      setNama(editItem.nama);
      setNoRekening(editItem.noRekening);
      setGajiKotor(editItem.gajiKotor);
      setPotongan(editItem.potongan);
      setKeterangan(editItem.keterangan || '');
    } else {
      setNama('');
      setNoRekening('');
      setGajiKotor(1800000);
      setPotongan(604000);
      setKeterangan('');
    }
    setErrors({});
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const gajiBersih = Math.max(0, gajiKotor - potongan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nama.trim()) {
      newErrors.nama = 'Nama pegawai wajib diisi';
    }
    if (!noRekening.trim()) {
      newErrors.noRekening = 'Nomor rekening wajib diisi';
    }
    if (gajiKotor <= 0) {
      newErrors.gajiKotor = 'Gaji kotor harus lebih dari 0';
    }
    if (potongan < 0) {
      newErrors.potongan = 'Potongan tidak boleh negatif';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const itemToSave: PayrollItem = {
      id: editItem ? editItem.id : `item-${Date.now()}`,
      no: editItem ? editItem.no : nextNo,
      nama: nama.trim().toUpperCase(),
      noRekening: noRekening.trim(),
      gajiKotor,
      potongan,
      gajiBersih,
      keterangan: keterangan.trim() || undefined,
    };

    onSave(itemToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                {editItem ? 'Edit Data Pegawai' : 'Input Data Pegawai'}
              </h3>
              <p className="text-xs text-slate-300">
                Penyaluran Gaji & Rekapitulasi Potongan
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nama Pegawai */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Lengkap Pegawai <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: MUHAMMAD AFANDI"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-medium uppercase"
            />
            {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
          </div>

          {/* Nomor Rekening */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Nomor Rekening <span className="text-red-500">*</span></span>
              <span className="text-[11px] text-slate-400 font-normal">Angka 0 di depan tetap tersimpan</span>
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={noRekening}
                onChange={(e) => setNoRekening(e.target.value)}
                placeholder="Contoh: 0236739074"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-mono"
              />
            </div>
            {errors.noRekening && (
              <p className="text-xs text-red-500 mt-1">{errors.noRekening}</p>
            )}
          </div>

          {/* Nilai Kotor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nilai Kotor (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-500">Rp</span>
              <input
                type="text"
                required
                value={formatNominal(gajiKotor)}
                onChange={(e) => setGajiKotor(parseNominal(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-semibold text-right"
              />
            </div>
            {errors.gajiKotor && (
              <p className="text-xs text-red-500 mt-1">{errors.gajiKotor}</p>
            )}
          </div>

          {/* JUMLAH POTONGAN (Diubah sesuai permintaan 3) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              JUMLAH POTONGAN (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-500">Rp</span>
              <input
                type="text"
                required
                value={formatNominal(potongan)}
                onChange={(e) => setPotongan(parseNominal(e.target.value))}
                placeholder="605.251"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-rose-50/50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition font-semibold text-right text-rose-700"
              />
            </div>
            {errors.potongan && (
              <p className="text-xs text-red-500 mt-1">{errors.potongan}</p>
            )}
          </div>

          {/* Kalkulasi Nilai Bersih (Auto-calculated) */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-xs uppercase font-bold tracking-wider block text-emerald-900">
                  Nilai Bersih
                </span>
                <span className="text-[11px] text-emerald-700">
                  Nilai Kotor - Jumlah Potongan
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-700 tracking-tight">
                Rp {formatNominal(gajiBersih)}
              </span>
            </div>
          </div>

          {/* Keterangan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Lunas transfer / Golongan III/a"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {editItem ? 'Simpan Perubahan' : 'Tambahkan Pegawai'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
