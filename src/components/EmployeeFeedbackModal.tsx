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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                Ulasan & Konfirmasi Penerimaan Gaji
              </h3>
              <p className="text-xs text-blue-200">
                Periode: {periodTitle} • Terbuka untuk Pegawai (Tanpa Kunci Admin)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Employee Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-sm text-slate-900 uppercase">
                  {item.nama}
                </span>
              </div>
              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-400" />
                {item.noRekening}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
              <span className="text-slate-500">Nilai Bersih Diterima:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatRupiah(item.gajiBersih)}
              </span>
            </div>
          </div>

          {/* Konfirmasi Penerimaan Checkbox */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmCheck"
                checked={confirmed}
                onChange={(e) => handleToggleCheck(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="confirmCheck" className="text-xs text-slate-700 cursor-pointer select-none">
                <span className="font-bold text-emerald-900 block">
                  Konfirmasi Sudah Menerima Gaji
                </span>
                Centang ceklis ini jika dana gaji bersih di atas telah benar-benar masuk ke rekening Anda.
                {item.confirmedAt && confirmed && (
                  <span className="block mt-1 text-[11px] text-emerald-700 font-medium">
                    Status: Sudah dikonfirmasi ({item.confirmedAt})
                  </span>
                )}
              </label>
            </div>
            {confirmed && (
              <button
                type="button"
                onClick={handleUncheckConfirmation}
                className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 transition shrink-0 flex items-center gap-1 font-medium"
                title={
                  item.isConfirmed && !isUnlocked
                    ? 'Batalkan ceklis konfirmasi (Memerlukan buka kunci aplikasi)'
                    : 'Batalkan ceklis konfirmasi'
                }
              >
                {item.isConfirmed && !isUnlocked ? (
                  <Lock className="w-3 h-3 text-rose-500" />
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
              <label className="block text-xs font-bold text-slate-700">
                Ulasan / Feedback Pegawai:
              </label>
              {comment.trim() && (
                <button
                  type="button"
                  onClick={handleClearComment}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 transition flex items-center gap-1"
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
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition text-slate-800 placeholder-slate-400"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Maksimal 500 karakter</span>
              {item.feedbackAt && comment.trim() && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" /> Terakhir disimpan: {item.feedbackAt}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow transition flex items-center gap-1.5 disabled:opacity-50"
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

