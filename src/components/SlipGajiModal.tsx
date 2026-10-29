import React from 'react';
import { PayrollItem, PayrollPeriod, ReportSettings } from '../types';
import { formatNominal, formatRupiah, terbilangRupiah } from '../utils/formatters';
import { Printer, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollItem | null;
  period: PayrollPeriod;
  settings: ReportSettings;
}

export const SlipGajiModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  period,
  settings,
}) => {
  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <h3 className="text-sm font-semibold">Pratinjau Slip Gaji Individu</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Canvas */}
        <div className="p-8 bg-white text-slate-800 space-y-6 printable-area">
          {/* Kop Surat Slip */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h2 className="text-base font-extrabold uppercase tracking-wide">
              {settings.instansi}
            </h2>
            <p className="text-xs uppercase font-medium text-slate-600">
              {settings.unitKerja}
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold tracking-wider uppercase">
              SLIP GAJI PEGAWAI
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Periode: <strong>{period.title.toUpperCase()}</strong>
            </p>
          </div>

          {/* Data Pegawai */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Nama Pegawai
              </span>
              <span className="font-bold text-sm text-slate-900">{item.nama}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Nomor Rekening
              </span>
              <span className="font-mono font-semibold text-sm text-slate-800">
                {item.noRekening}
              </span>
            </div>
          </div>

          {/* Rincian Finansial */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2.5 text-left">URAIAN</th>
                  <th className="p-2.5 text-right w-40">NOMINAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-medium">Nilai Kotor</td>
                  <td className="p-2.5 text-right font-mono font-semibold">
                    {formatRupiah(item.gajiKotor)}
                  </td>
                </tr>
                <tr className="bg-rose-50/40 text-rose-800">
                  <td className="p-2.5">
                    <span className="font-medium">JUMLAH POTONGAN</span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold text-rose-600">
                    - {formatRupiah(item.potongan)}
                  </td>
                </tr>
                <tr className="bg-emerald-50 text-emerald-950 font-bold border-t-2 border-slate-300">
                  <td className="p-3 text-sm">NILAI BERSIH</td>
                  <td className="p-3 text-right font-mono text-base text-emerald-700">
                    {formatRupiah(item.gajiBersih)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terbilang */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Terbilang:
            </span>
            <span className="italic font-medium text-slate-800">
              "{terbilangRupiah(item.gajiBersih)}"
            </span>
          </div>

          {/* Status Konfirmasi & Ulasan Pegawai */}
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Status Penerimaan:
              </span>
              {item.isConfirmed ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  ✓ Diterima Pegawai ({item.confirmedAt || 'Telah dikonfirmasi'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded text-[11px]">
                  Belum Dikonfirmasi
                </span>
              )}
            </div>
            {item.feedback && (
              <div className="pt-1.5 border-t border-blue-200/60 text-[11px] text-slate-700">
                <span className="font-bold text-slate-900 block text-[10px] uppercase">
                  Catatan / Ulasan Pegawai:
                </span>
                <p className="italic bg-white p-2 rounded border border-blue-100 mt-0.5">
                  "{item.feedback}"
                </p>
              </div>
            )}
          </div>

          {/* Catatan Resmi Bank & Potongan */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-[10.5px] leading-relaxed text-amber-950">
            <span className="font-bold block">Catatan:</span>
            Bahwasannya Nilai Bersih yang ditampilkan adalah Gaji sebelum dipotong oleh BANK JATIM atau BANK MINA MANDIRI. Untuk Jumlah Potongan Termasuk dari (INFAQ / DHARMA WANITA / PMI / BPJS).
          </div>
        </div>
      </div>
    </div>
  );
};
