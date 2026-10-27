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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Kelola Periode Payroll Bulanan</h3>
              <p className="text-xs text-slate-300">
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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Buat Periode Baru */}
          <form onSubmit={handleCreatePeriod} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Tambah Periode Baru</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bulan
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {BULAN_INDONESIA.map((bulan, idx) => (
                    <option key={bulan} value={idx + 1}>
                      {bulan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tahun
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyFromCurrent}
                  onChange={(e) => setCopyFromCurrent(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Salin otomatis daftar pegawai & nomor rekening dari <strong>{currentPeriod?.title}</strong>
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Status Periode:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Draf' | 'Disalurkan')}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Draf">Draf (Persiapan)</option>
                  <option value="Disalurkan">Disalurkan</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Buka & Buat Periode Ini
            </button>
          </form>

          {/* Daftar Periode Tersimpan */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
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
                        <span className="font-semibold text-sm text-slate-800">
                          {period.title}
                        </span>

                        {/* Dropdown Pengubah Status Periode (Draf <-> Disalurkan) */}
                        <div onClick={(e) => e.stopPropagation()} className="relative">
                          <select
                            value={period.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              onUpdatePeriodStatus(period.id, e.target.value as 'Draf' | 'Disalurkan' | 'Terverifikasi');
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition appearance-none pr-6 shadow-2xs ${
                              period.status === 'Disalurkan'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            }`}
                            title="Klik untuk mengubah status periode ini"
                          >
                            <option value="Draf">Draf (Persiapan)</option>
                            <option value="Disalurkan">Disalurkan</option>
                            <option value="Terverifikasi">Terverifikasi</option>
                          </select>
                          <span className="pointer-events-none absolute right-1.5 top-1.5 text-[10px] text-slate-500 font-bold">
                            ▼
                          </span>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
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
                          className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                        >
                          Pilih
                        </button>
                      )}

                      {/* Tombol Hapus Periode dengan Konfirmasi Langsung di UI (Tanpa window.confirm yang sering terblokir iframe) */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                          <span className="text-[10px] text-rose-700 font-bold px-1">Hapus?</span>
                          <button
                            type="button"
                            onClick={() => handleExecuteDelete(period.id)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded transition shadow-2xs"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
