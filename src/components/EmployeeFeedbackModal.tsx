import React, { useState, useEffect } from 'react';
import { PayrollItem } from '../types';
import { formatNominal, formatRupiah } from '../utils/formatters';
import { MessageSquare, CheckCircle2, X, Save, Clock, User, CreditCard, Trash2, RotateCcw, Lock } from 'lucide-react';

interface EmployeeFeedbackModalProps {
  isOpen: boolean;
  item: PayrollItem | null;
  periodTitle: string;
  onClose: () => void;
  onSave: (feedback: string, isConfirmed?: boolean) => void;
  isSaving?: boolean;
  requireAdmin?: (action: () => void) => void;
  isUnlocked?: boolean;
}

export const EmployeeFeedbackModal: React.FC<EmployeeFeedbackModalProps> = ({
  isOpen,
  item,
  periodTitle,
  onClose,
  onSave,
  isSaving = false,
  requireAdmin,
  isUnlocked = false,
}) => {
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (item) {
      setComment(item.feedback || '');
      setConfirmed(!!item.isConfirmed);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Jika awalnya sudah dikonfirmasi dan sekarang statusnya dibatalkan, harus lewat requireAdmin
    if (item.isConfirmed && !confirmed && !isUnlocked && requireAdmin) {
      requireAdmin(() => {
        onSave(comment.trim(), confirmed);
      });
      return;
    }
    onSave(comment.trim(), confirmed);
  };

  const handleClearComment = () => {
    setComment('');
  };

  const handleToggleCheck = (checked: boolean) => {
    // Jika awalnya sudah terkonfirmasi dan pengguna ingin membatalkannya
    if (item.isConfirmed && !checked && !isUnlocked && requireAdmin) {
      requireAdmin(() => setConfirmed(false));
      return;
    }
    setConfirmed(checked);
  };

  const handleUncheckConfirmation = () => {
    if (item.isConfirmed && !isUnlocked && requireAdmin) {
      requireAdmin(() => setConfirmed(false));
      return;
    }
    setConfirmed(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">
                Ulasan & Konfirmasi Penerimaan Gaji
              </h3>
              <p className="text-xs text-slate-400">
                Periode: {periodTitle} • Terbuka untuk Pegawai (Tanpa Kunci Admin)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Employee Info Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-sm text-slate-100 uppercase">
                  {item.nama}
                </span>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2.5 py-0.5 rounded border border-slate-700 text-slate-300 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-400" />
                {item.noRekening}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-700/80 text-xs">
              <span className="text-slate-400">Nilai Bersih Diterima:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatRupiah(item.gajiBersih)}
              </span>
            </div>
          </div>

          {/* Konfirmasi Penerimaan Checkbox */}
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmCheck"
                checked={confirmed}
                onChange={(e) => handleToggleCheck(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-500 rounded border-slate-600 bg-slate-800 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="confirmCheck" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-bold text-emerald-300 block">
                  Konfirmasi Sudah Menerima Gaji
                </span>
                Centang ceklis ini jika dana gaji bersih di atas telah benar-benar masuk ke rekening Anda.
                {item.confirmedAt && confirmed && (
                  <span className="block mt-1 text-[11px] text-emerald-400 font-medium">
                    Status: Sudah dikonfirmasi ({item.confirmedAt})
                  </span>
                )}
              </label>
            </div>
            {confirmed && (
              <button
                type="button"
                onClick={handleUncheckConfirmation}
                className="text-[11px] text-rose-300 hover:text-rose-200 bg-rose-950/80 hover:bg-rose-900 px-2 py-1 rounded border border-rose-800/60 transition shrink-0 flex items-center gap-1 font-medium"
                title={
                  item.isConfirmed && !isUnlocked
                    ? 'Batalkan ceklis konfirmasi (Memerlukan buka kunci aplikasi)'
                    : 'Batalkan ceklis konfirmasi'
                }
              >
                {item.isConfirmed && !isUnlocked ? (
                  <Lock className="w-3 h-3 text-rose-400" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                <span>Batalkan</span>
              </button>
            )}
          </div>

          {/* Feedback / Ulasan Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                Ulasan / Feedback Pegawai:
              </label>
              {comment.trim() && (
                <button
                  type="button"
                  onClick={handleClearComment}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60 transition flex items-center gap-1"
                  title="Hapus ulasan / feedback"
                >
                  <Trash2 className="w-3 h-3" /> Hapus Ulasan
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tuliskan catatan, ulasan, atau konfirmasi terkait penyaluran dana Anda..."
              className="w-full text-xs p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition text-slate-100 placeholder-slate-500"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Maksimal 500 karakter</span>
              {item.feedbackAt && comment.trim() && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" /> Terakhir disimpan: {item.feedbackAt}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Ulasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

