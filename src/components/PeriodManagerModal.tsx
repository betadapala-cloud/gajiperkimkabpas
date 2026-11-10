import React, { useState } from 'react';
import { PayrollPeriod } from '../types';
import { BULAN_INDONESIA } from '../utils/formatters';
import { Calendar, Plus, Trash2, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  periods: PayrollPeriod[];
  currentPeriodId: string;
  onSelectPeriod: (id: string) => void;
  onAddPeriod: (newPeriod: PayrollPeriod) => void;
  onDeletePeriod: (id: string) => void;
  onUpdatePeriodStatus: (id: string, status: 'Draf' | 'Disalurkan' | 'Terverifikasi') => void;
}

export const PeriodManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  periods,
  currentPeriodId,
  onSelectPeriod,
  onAddPeriod,
  onDeletePeriod,
  onUpdatePeriodStatus,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [copyFromCurrent, setCopyFromCurrent] = useState<boolean>(true);
  const [status, setStatus] = useState<'Draf' | 'Disalurkan' | 'Terverifikasi'>('Draf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPeriod = periods.find((p) => p.id === currentPeriodId);

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const monthName = BULAN_INDONESIA[selectedMonth - 1];
    const title = `${monthName} ${selectedYear}`;
    const id = `period-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    // Cek apakah periode sudah ada
    const existing = periods.find((p) => p.id === id);
    if (existing) {
      setErrorMessage(`Periode ${title} sudah ada. Silakan pilih dari daftar tersimpan di bawah.`);
      onSelectPeriod(existing.id);
      return;
    }

    // Ambil data jika copy dari periode saat ini
    const clonedItems = copyFromCurrent && currentPeriod
      ? currentPeriod.items.map((item, idx) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`,
        }))
      : [];

    const newPeriod: PayrollPeriod = {
      id,
      month: selectedMonth,
      year: selectedYear,
      title,
      status,
      items: clonedItems,
      tanggalPenyaluran: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-28`,
    };

    onAddPeriod(newPeriod);
    onSelectPeriod(id);
    onClose();
  };

  const handleExecuteDelete = (id: string) => {
    onDeletePeriod(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Kelola Periode Payroll Bulanan</h3>
              <p className="text-xs text-slate-400">
                Pilih, buat, atau hapus daftar periode penyaluran gaji tiap bulan
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
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Buat Periode Baru */}
          <form onSubmit={handleCreatePeriod} className="p-4 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Tambah Periode Baru</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Bulan
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {BULAN_INDONESIA.map((bulan, idx) => (
                    <option key={bulan} value={idx + 1} className="bg-slate-900 text-white">
                      {bulan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tahun
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyFromCurrent}
                  onChange={(e) => setCopyFromCurrent(e.target.checked)}
                  className="rounded text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
                />
                <span>
                  Salin otomatis daftar pegawai & nomor rekening dari <strong className="text-white">{currentPeriod?.title}</strong>
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Status Periode:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Draf' | 'Disalurkan')}
                  className="px-2 py-1 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg"
                >
                  <option value="Draf" className="bg-slate-900 text-white">Draf (Persiapan)</option>
                  <option value="Disalurkan" className="bg-slate-900 text-white">Disalurkan</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Buka & Buat Periode Ini
            </button>
          </form>

          {/* Daftar Periode Tersimpan */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Daftar Periode Tersimpan ({periods.length})
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {periods.map((period) => {
                const isSelected = period.id === currentPeriodId;
                const totalPegawai = period.items.length;
                const isConfirmingDelete = confirmDeleteId === period.id;

                return (
                  <div
                    key={period.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-850 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        onSelectPeriod(period.id);
                        onClose();
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          {period.title}
                        </span>

                        {/* Dropdown Pengubah Status Periode */}
                        <div onClick={(e) => e.stopPropagation()} className="relative">
                          <select
                            value={period.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              onUpdatePeriodStatus(period.id, e.target.value as 'Draf' | 'Disalurkan' | 'Terverifikasi');
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition appearance-none pr-6 shadow-2xs ${
                              period.status === 'Disalurkan'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                                : 'bg-amber-950/70 text-amber-300 border-amber-700/50 hover:bg-amber-900'
                            }`}
                            title="Klik untuk mengubah status periode ini"
                          >
                            <option value="Draf" className="bg-slate-900 text-white">Draf (Persiapan)</option>
                            <option value="Disalurkan" className="bg-slate-900 text-white">Disalurkan</option>
                            <option value="Terverifikasi" className="bg-slate-900 text-white">Terverifikasi</option>
                          </select>
                          <span className="pointer-events-none absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-bold">
                            ▼
                          </span>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {totalPegawai} Pegawai • Rp{' '}
                        {period.items
                          .reduce((s, i) => s + i.gajiBersih, 0)
                          .toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      {!isSelected && !isConfirmingDelete && (
                        <button
                          onClick={() => {
                            onSelectPeriod(period.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg font-medium"
                        >
                          Pilih
                        </button>
                      )}

                      {/* Tombol Hapus Periode */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-800/60">
                          <span className="text-[10px] text-rose-300 font-bold px-1">Hapus?</span>
                          <button
                            type="button"
                            onClick={() => handleExecuteDelete(period.id)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition shadow-2xs"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        periods.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(period.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title={`Hapus Periode ${period.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
