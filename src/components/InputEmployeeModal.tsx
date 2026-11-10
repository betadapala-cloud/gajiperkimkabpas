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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                {editItem ? 'Edit Data Pegawai' : 'Input Data Pegawai'}
              </h3>
              <p className="text-xs text-slate-400">
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nama Lengkap Pegawai <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: MUHAMMAD AFANDI"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-800 text-slate-100 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium uppercase placeholder-slate-500"
            />
            {errors.nama && <p className="text-xs text-rose-400 mt-1">{errors.nama}</p>}
          </div>

          {/* Nomor Rekening */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Nomor Rekening <span className="text-rose-400">*</span></span>
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
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-800 text-slate-100 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-mono placeholder-slate-500"
              />
            </div>
            {errors.noRekening && (
              <p className="text-xs text-rose-400 mt-1">{errors.noRekening}</p>
            )}
          </div>

          {/* Nilai Kotor */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nilai Kotor (Rp) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
              <input
                type="text"
                required
                value={formatNominal(gajiKotor)}
                onChange={(e) => setGajiKotor(parseNominal(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-800 text-slate-100 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-semibold text-right"
              />
            </div>
            {errors.gajiKotor && (
              <p className="text-xs text-rose-400 mt-1">{errors.gajiKotor}</p>
            )}
          </div>

          {/* JUMLAH POTONGAN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              JUMLAH POTONGAN (Rp) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
              <input
                type="text"
                required
                value={formatNominal(potongan)}
                onChange={(e) => setPotongan(parseNominal(e.target.value))}
                placeholder="605.251"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-rose-950/40 text-rose-300 border border-rose-800/60 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition font-semibold text-right"
              />
            </div>
            {errors.potongan && (
              <p className="text-xs text-rose-400 mt-1">{errors.potongan}</p>
            )}
          </div>

          {/* Kalkulasi Nilai Bersih (Auto-calculated) */}
          <div className="p-4 bg-emerald-950/70 border border-emerald-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs uppercase font-bold tracking-wider block text-emerald-200">
                  Nilai Bersih
                </span>
                <span className="text-[11px] text-emerald-400/80">
                  Nilai Kotor - Jumlah Potongan
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-300 tracking-tight font-mono">
                Rp {formatNominal(gajiBersih)}
              </span>
            </div>
          </div>

          {/* Keterangan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Lunas transfer / Golongan III/a"
              className="w-full px-3.5 py-2 text-xs bg-slate-800 text-slate-100 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-slate-500"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-2"
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
