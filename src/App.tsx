import React, { useState, useEffect, useMemo } from 'react';
import { PayrollCategory, PayrollItem, PayrollPeriod, ReportSettings } from './types';
import {
  CATEGORIES,
  INITIAL_DATA_BY_CATEGORY,
  INITIAL_REPORT_SETTINGS,
} from './utils/initialData';
import { BULAN_INDONESIA, formatNominal, formatRupiah, terbilangRupiah } from './utils/formatters';
import { exportPeriodToPdf } from './utils/pdfHelper';
import { exportPeriodToExcel } from './utils/excelHelper';
import { fetchSharedDatabase, saveSharedDatabase, SharedDatabasePayload } from './utils/apiService';
import { subscribeToFirestorePayroll, saveToCloudFirestore } from './utils/firestoreService';
import { testConnection } from './firebase';

import { InputEmployeeModal } from './components/InputEmployeeModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { PeriodManagerModal } from './components/PeriodManagerModal';
import { SlipGajiModal } from './components/SlipGajiModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { EmployeeFeedbackModal } from './components/EmployeeFeedbackModal';

import {
  FileSpreadsheet,
  FileDown,
  Printer,
  Plus,
  Upload,
  Calendar,
  Settings,
  Search,
  Trash2,
  Edit2,
  Receipt,
  RotateCcw,
  Building2,
  Users,
  DollarSign,
  TrendingDown,
  Wallet,
  CheckCircle2,
  ChevronDown,
  Lock,
  Unlock,
  Layers,
  Pencil,
  Check,
  X as CloseIcon,
  Cloud,
  RefreshCw,
  Database,
  MessageSquare,
} from 'lucide-react';

export default function App() {
  // 1. Kategori Aktif (Gaji Paruh Waktu, Gaji PNS, Gaji PPPK, TPP PNS)
  const [activeCategory, setActiveCategory] = useState<PayrollCategory>(() => {
    try {
      const savedCat = localStorage.getItem('payroll_active_category');
      if (savedCat === 'paruh-waktu' || savedCat === 'pns' || savedCat === 'pppk' || savedCat === 'tpp-pns') {
        return savedCat;
      }
    } catch {
      // fallback
    }
    return 'paruh-waktu';
  });

  // 2. Data Payroll Real-time per Kategori
  const [dataByCategory, setDataByCategory] = useState<Record<PayrollCategory, PayrollPeriod[]>>(() => {
    try {
      const savedData = localStorage.getItem('payroll_data_by_category');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          ...INITIAL_DATA_BY_CATEGORY,
          ...parsed,
          'tpp-pns': parsed['tpp-pns'] || INITIAL_DATA_BY_CATEGORY['tpp-pns'],
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_DATA_BY_CATEGORY;
  });

  // 3. Pengaturan Judul & Kop Real-time per Kategori
  const [settingsByCategory, setSettingsByCategory] = useState<Record<PayrollCategory, ReportSettings>>(() => {
    try {
      const savedSettings = localStorage.getItem('payroll_settings_by_category');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          ...INITIAL_REPORT_SETTINGS,
          ...parsed,
          'tpp-pns': parsed['tpp-pns'] || INITIAL_REPORT_SETTINGS['tpp-pns'],
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_REPORT_SETTINGS;
  });

  // 4. Periode Aktif per Kategori
  const [activePeriodIdByCategory, setActivePeriodIdByCategory] = useState<Record<PayrollCategory, string>>(() => {
    try {
      const savedPeriodIds = localStorage.getItem('payroll_active_period_ids');
      if (savedPeriodIds) {
        const parsed = JSON.parse(savedPeriodIds);
        return {
          'paruh-waktu': 'pw-period-2024-10',
          pns: 'pns-period-2024-10',
          pppk: 'pppk-period-2024-10',
          'tpp-pns': 'tpp-period-2024-10',
          ...parsed,
        };
      }
    } catch {
      // fallback
    }
    return {
      'paruh-waktu': 'pw-period-2024-10',
      pns: 'pns-period-2024-10',
      pppk: 'pppk-period-2024-10',
      'tpp-pns': 'tpp-period-2024-10',
    };
  });

  // 5. Status Pengunci Edit (admin : djoko92m)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('payroll_is_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Inline editing judul laporan
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipItem, setSlipItem] = useState<PayrollItem | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackModalItem, setFeedbackModalItem] = useState<PayrollItem | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const isRemoteUpdateRef = React.useRef(false);

  // 1. Sinkronisasi Real-Time dengan Cloud Firestore terpusat
  // Setiap orang yang membuka aplikasi akan langsung menampilkan data yang sama
  useEffect(() => {
    let isMounted = true;
    testConnection().then((ok) => {
      if (isMounted) setIsFirestoreConnected(ok);
    });

    const unsubscribe = subscribeToFirestorePayroll(
      (remotePayload) => {
        if (!isMounted) return;
        isRemoteUpdateRef.current = true;
        if (remotePayload.dataByCategory) setDataByCategory(remotePayload.dataByCategory);
        if (remotePayload.settingsByCategory) setSettingsByCategory(remotePayload.settingsByCategory);
        if (remotePayload.activeCategory) setActiveCategory(remotePayload.activeCategory);
        if (remotePayload.activePeriodIdByCategory) setActivePeriodIdByCategory(remotePayload.activePeriodIdByCategory);
        setIsLoadedFromServer(true);
        setSyncStatus('synced');
      },
      (err) => {
        console.warn('Firestore subscription fallback:', err);
        fetchSharedDatabase().then((serverDb) => {
          if (serverDb && isMounted) {
            if (serverDb.dataByCategory) setDataByCategory(serverDb.dataByCategory);
            if (serverDb.settingsByCategory) setSettingsByCategory(serverDb.settingsByCategory);
            if (serverDb.activeCategory) setActiveCategory(serverDb.activeCategory);
            if (serverDb.activePeriodIdByCategory) setActivePeriodIdByCategory(serverDb.activePeriodIdByCategory);
            setIsLoadedFromServer(true);
          }
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Simpan realtime ke localStorage sebagai cadangan offline lokal
  useEffect(() => {
    localStorage.setItem('payroll_data_by_category', JSON.stringify(dataByCategory));
  }, [dataByCategory]);

  useEffect(() => {
    localStorage.setItem('payroll_settings_by_category', JSON.stringify(settingsByCategory));
  }, [settingsByCategory]);

  useEffect(() => {
    localStorage.setItem('payroll_active_category', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    localStorage.setItem('payroll_active_period_ids', JSON.stringify(activePeriodIdByCategory));
  }, [activePeriodIdByCategory]);

  useEffect(() => {
    localStorage.setItem('payroll_is_unlocked', isUnlocked ? 'true' : 'false');
  }, [isUnlocked]);

  // 3. Simpan perubahan ke Cloud Firestore terpusat (dan cadangkan ke server backend)
  useEffect(() => {
    if (!isLoadedFromServer) return;
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    setSyncStatus('saving');
    const timer = setTimeout(async () => {
      const payload: SharedDatabasePayload = {
        activeCategory,
        activePeriodIdByCategory,
        settingsByCategory,
        dataByCategory,
        lastUpdated: Date.now(),
      };
      const success = await saveToCloudFirestore(payload);
      // Minimum display duration to prevent fast flickering/blinking
      setTimeout(() => {
        setSyncStatus(success ? 'synced' : 'offline');
      }, 800);
    }, 500);
    return () => clearTimeout(timer);
  }, [dataByCategory, settingsByCategory, activeCategory, activePeriodIdByCategory, isLoadedFromServer]);

  // Sinkronisasi manual dari Cloud Firestore
  const handleManualSync = async () => {
    setIsSyncingManual(true);
    const serverDb = await fetchSharedDatabase();
    if (serverDb) {
      if (serverDb.dataByCategory) setDataByCategory(serverDb.dataByCategory);
      if (serverDb.settingsByCategory) setSettingsByCategory(serverDb.settingsByCategory);
      if (serverDb.activeCategory) setActiveCategory(serverDb.activeCategory);
      if (serverDb.activePeriodIdByCategory) setActivePeriodIdByCategory(serverDb.activePeriodIdByCategory);
      setSyncStatus('synced');
      showToast('Database Cloud Firestore berhasil disegarkan.');
    } else {
      setSyncStatus('offline');
      showToast('Gagal terhubung ke database cloud, tetap menggunakan data lokal.');
    }
    setIsSyncingManual(false);
  };

  // Pulihkan / Restore Database Keseluruhan dari File JSON
  const handleRestoreDatabase = (restored: SharedDatabasePayload) => {
    if (restored.dataByCategory) setDataByCategory(restored.dataByCategory);
    if (restored.settingsByCategory) setSettingsByCategory(restored.settingsByCategory);
    if (restored.activeCategory) setActiveCategory(restored.activeCategory);
    if (restored.activePeriodIdByCategory) setActivePeriodIdByCategory(restored.activePeriodIdByCategory);
    showToast('Database keseluruhan berhasil dipulihkan!');
  };

  // Toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Periode saat ini
  const currentCategoryPeriods = useMemo(() => {
    return dataByCategory[activeCategory] || [];
  }, [dataByCategory, activeCategory]);

  const currentPeriodId = activePeriodIdByCategory[activeCategory];
  const activePeriod = useMemo(() => {
    const found = currentCategoryPeriods.find((p) => p.id === currentPeriodId);
    return found || currentCategoryPeriods[0] || null;
  }, [currentCategoryPeriods, currentPeriodId]);

  const currentSettings = settingsByCategory[activeCategory];

  // Helper cek hak akses sebelum menjalankan aksi edit
  const requireAdmin = (action: () => void) => {
    if (isUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setIsAuthModalOpen(true);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!activePeriod) return [];
    if (!searchQuery.trim()) return activePeriod.items;
    const q = searchQuery.toLowerCase();
    return activePeriod.items.filter(
      (item) =>
        item.nama.toLowerCase().includes(q) ||
        item.noRekening.toLowerCase().includes(q) ||
        String(item.no).includes(q)
    );
  }, [activePeriod, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    if (!activePeriod) return { kotor: 0, potongan: 0, bersih: 0, count: 0 };
    const kotor = activePeriod.items.reduce((sum, item) => sum + item.gajiKotor, 0);
    const potongan = activePeriod.items.reduce((sum, item) => sum + item.potongan, 0);
    const bersih = activePeriod.items.reduce((sum, item) => sum + item.gajiBersih, 0);
    return {
      kotor,
      potongan,
      bersih,
      count: activePeriod.items.length,
    };
  }, [activePeriod]);

  // Tambah / Edit Pegawai
  const handleSaveEmployee = (item: PayrollItem) => {
    if (!activePeriod) return;

    setDataByCategory((prev) => {
      const catPeriods = prev[activeCategory];
      const updatedPeriods = catPeriods.map((p) => {
        if (p.id !== activePeriod.id) return p;

        const exists = p.items.some((i) => i.id === item.id);
        let updatedItems: PayrollItem[];

        if (exists) {
          updatedItems = p.items.map((i) => (i.id === item.id ? item : i));
          showToast(`Data pegawai ${item.nama} berhasil diperbarui.`);
        } else {
          updatedItems = [...p.items, item];
          showToast(`Pegawai ${item.nama} berhasil ditambahkan.`);
        }

        updatedItems = updatedItems.map((it, idx) => ({ ...it, no: idx + 1 }));
        return { ...p, items: updatedItems };
      });

      return {
        ...prev,
        [activeCategory]: updatedPeriods,
      };
    });
  };

  // Hapus Pegawai
  const handleDeleteEmployee = (id: string, nama: string) => {
    requireAdmin(() => {
      if (!activePeriod) return;

      setDataByCategory((prev) => {
        const catPeriods = prev[activeCategory];
        const updatedPeriods = catPeriods.map((p) => {
          if (p.id !== activePeriod.id) return p;
          const updatedItems = p.items
            .filter((i) => i.id !== id)
            .map((it, idx) => ({ ...it, no: idx + 1 }));
          return { ...p, items: updatedItems };
        });

        return {
          ...prev,
          [activeCategory]: updatedPeriods,
        };
      });

      showToast(`Data pegawai ${nama} telah dihapus.`);
    });
  };

  // Konfirmasi Penerimaan Gaji Pegawai (TIDAK DIKUNCI ADMIN)
  const handleToggleConfirmation = (item: PayrollItem) => {
    if (!activePeriod) return;
    const newConfirmed = !item.isConfirmed;
    const now = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setDataByCategory((prev) => {
      const catPeriods = prev[activeCategory] || [];
      const updatedPeriods = catPeriods.map((p) => {
        if (p.id !== activePeriod.id) return p;
        const updatedItems = p.items.map((i) =>
          i.id === item.id
            ? {
                ...i,
                isConfirmed: newConfirmed,
                confirmedAt: newConfirmed ? now : null,
              }
            : i
        );
        return { ...p, items: updatedItems };
      });
      return {
        ...prev,
        [activeCategory]: updatedPeriods,
      };
    });

    showToast(
      newConfirmed
        ? `✓ Penerimaan gaji ${item.nama} telah dikonfirmasi!`
        : `Konfirmasi penerimaan gaji ${item.nama} dibatalkan.`
    );
  };

  // Simpan Feedback / Ulasan Pegawai (TIDAK DIKUNCI ADMIN)
  const handleSaveFeedback = (commentText: string, isConfirmed?: boolean) => {
    if (!activePeriod || !feedbackModalItem) return;
    const now = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setDataByCategory((prev) => {
      const catPeriods = prev[activeCategory] || [];
      const updatedPeriods = catPeriods.map((p) => {
        if (p.id !== activePeriod.id) return p;
        const updatedItems = p.items.map((i) =>
          i.id === feedbackModalItem.id
            ? {
                ...i,
                feedback: commentText || null,
                feedbackAt: commentText ? now : null,
                isConfirmed: isConfirmed !== undefined ? isConfirmed : i.isConfirmed,
                confirmedAt:
                  isConfirmed !== undefined
                    ? (isConfirmed ? (i.confirmedAt || now) : null)
                    : i.confirmedAt,
              }
            : i
        );
        return { ...p, items: updatedItems };
      });
      return {
        ...prev,
        [activeCategory]: updatedPeriods,
      };
    });

    setIsFeedbackModalOpen(false);
    setFeedbackModalItem(null);
    showToast(`Ulasan dan konfirmasi untuk ${feedbackModalItem.nama} berhasil disimpan!`);
  };

  // Import Excel Success
  const handleImportSuccess = (newItems: PayrollItem[], mode: 'replace' | 'append') => {
    if (!activePeriod) return;

    setDataByCategory((prev) => {
      const catPeriods = prev[activeCategory];
      const updatedPeriods = catPeriods.map((p) => {
        if (p.id !== activePeriod.id) return p;

        let merged: PayrollItem[];
        if (mode === 'replace') {
          merged = newItems;
        } else {
          merged = [...p.items, ...newItems];
        }

        merged = merged.map((it, idx) => ({ ...it, no: idx + 1 }));
        return { ...p, items: merged };
      });

      return {
        ...prev,
        [activeCategory]: updatedPeriods,
      };
    });

    showToast(`Berhasil mengimpor ${newItems.length} pegawai ke ${activePeriod.title}.`);
  };

  // Tambah Periode Baru
  const handleAddPeriod = (newPeriod: PayrollPeriod) => {
    setDataByCategory((prev) => ({
      ...prev,
      [activeCategory]: [newPeriod, ...prev[activeCategory]],
    }));
    setActivePeriodIdByCategory((prev) => ({
      ...prev,
      [activeCategory]: newPeriod.id,
    }));
    showToast(`Periode ${newPeriod.title} berhasil dibuat!`);
  };

  // Hapus Periode
  const handleDeletePeriod = (id: string) => {
    setDataByCategory((prev) => {
      let remaining = prev[activeCategory].filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        remaining = [
          {
            id: `${activeCategory}-period-${year}-${String(month).padStart(2, '0')}`,
            month,
            year,
            title: `${BULAN_INDONESIA[month - 1]} ${year}`,
            status: 'Draf',
            items: [],
          },
        ];
      }

      setActivePeriodIdByCategory((pState) => ({
        ...pState,
        [activeCategory]: remaining[0].id,
      }));

      return {
        ...prev,
        [activeCategory]: remaining,
      };
    });
    showToast('Periode berhasil dihapus.');
  };

  // Ubah Status Periode (Draf <-> Disalurkan)
  const handleUpdatePeriodStatus = (id: string, newStatus: 'Draf' | 'Disalurkan' | 'Terverifikasi') => {
    setDataByCategory((prev) => {
      const updated = prev[activeCategory].map((p) =>
        p.id === id ? { ...p, status: newStatus } : p
      );
      return {
        ...prev,
        [activeCategory]: updated,
      };
    });
    showToast(`Status periode berhasil diubah menjadi "${newStatus}".`);
  };

  // Edit Judul Laporan secara Realtime
  const handleSaveTitleInline = () => {
    if (!tempTitle.trim()) return;
    setSettingsByCategory((prev) => ({
      ...prev,
      [activeCategory]: {
        ...prev[activeCategory],
        judulLaporan: tempTitle.trim().toUpperCase(),
      },
    }));
    setIsEditingTitleInline(false);
    showToast('Judul laporan berhasil diubah & disimpan realtime.');
  };

  // Reset ke data awal
  const handleResetData = () => {
    requireAdmin(() => {
      if (confirm('Kembalikan data kategori ini ke data bawaan awal?')) {
        setDataByCategory((prev) => ({
          ...prev,
          [activeCategory]: INITIAL_DATA_BY_CATEGORY[activeCategory],
        }));
        setSettingsByCategory((prev) => ({
          ...prev,
          [activeCategory]: INITIAL_REPORT_SETTINGS[activeCategory],
        }));
        showToast('Data kategori ini telah direset ke setelan awal.');
      }
    });
  };

  // Ekspor PDF
  const handleExportPdf = () => {
    if (!activePeriod) return;
    exportPeriodToPdf(activePeriod, currentSettings);
    showToast('Berkas PDF berhasil diunduh.');
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    if (!activePeriod) return;
    exportPeriodToExcel(activePeriod, currentSettings);
    showToast('Berkas Excel berhasil diunduh.');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 print-hide sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Judul Sistem */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl shadow-md text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight">
                Sistem Penyaluran Gaji Pegawai
              </h1>
              <p className="text-[11px] text-slate-400">
                Rekapitulasi Nilai Kotor, Potongan & Nilai Bersih
              </p>
            </div>
          </div>

          {/* Pengunci Edit & Aksi Header */}
          <div className="flex items-center gap-2">
            {/* Tombol Status Kunci Edit */}
            {isUnlocked ? (
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  showToast('Mode edit dikunci kembali.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 rounded-xl transition"
                title="Klik untuk mengunci mode edit"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mode Edit Aktif</span>
                <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-200">
                  Kunci
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 rounded-xl transition"
                title="Buka kunci edit dengan akun admin"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Terkunci</span>
                <span className="text-[10px] bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded font-bold">
                  Buka Kunci
                </span>
              </button>
            )}

            {/* Status Sinkronisasi Database Bersama Cloud Firestore */}
            <button
              onClick={handleManualSync}
              disabled={isSyncingManual}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/50 rounded-xl transition"
              title="Cloud Firestore Terpusat: data otomatis tersinkronisasi realtime ke semua orang di browser atau perangkat manapun. Klik untuk menyinkronkan ulang."
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">
                {syncStatus === 'saving' ? 'Menyimpan ke Cloud...' : 'Cloud Firestore'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden md:inline"></span>
              <RefreshCw className={`w-3 h-3 text-emerald-300 ${isSyncingManual ? 'animate-spin' : ''}`} />
            </button>

            {/* Tombol Backup / Restore Database Keseluruhan */}
            <button
              onClick={() => requireAdmin(() => setIsBackupModalOpen(true))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shadow-2xs"
              title="Upload / Download Database Keseluruhan Aplikasi"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Backup/Restore</span>
            </button>

            <button
              onClick={() => requireAdmin(() => setIsSettingsModalOpen(true))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
              title="Atur Nama Instansi, Unit Kerja & Judul Laporan"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Pengaturan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* DROPDOWN KATEGORI & TOOLBAR KONTROL (PRINT HIDE) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 print-hide">
          {/* Baris 1: Dropdown 3 Kategori Gaji & Pilihan Bulan */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* DROPDOWN 3 BAGIAN: Gaji Paruh Waktu, Gaji PNS, Gaji PPPK */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Kategori:</span>
                  {!isUnlocked && (
                    <button
                      type="button"
                      onClick={() => requireAdmin(() => {})}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 rounded text-[10px] font-bold transition"
                      title="Kategori dikunci: Klik untuk membuka kunci dengan password admin"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </button>
                  )}
                </span>
                <div className="relative">
                  <select
                    value={activeCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value as PayrollCategory;
                      if (nextCat === activeCategory) return;
                      requireAdmin(() => {
                        setActiveCategory(nextCat);
                        showToast(`Beralih ke kategori: ${CATEGORIES.find((c) => c.id === nextCat)?.name || nextCat}`);
                      });
                    }}
                    className={`appearance-none pl-3.5 pr-9 py-2 text-sm font-extrabold rounded-xl cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none transition shadow-2xs ${
                      !isUnlocked
                        ? 'text-amber-950 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-300'
                        : 'text-slate-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300'
                    }`}
                    title={
                      !isUnlocked
                        ? 'Kategori Terkunci: Memerlukan password admin untuk merubah kategori'
                        : 'Pilih Kategori Gaji'
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`w-4 h-4 absolute right-2.5 top-3 pointer-events-none ${
                      !isUnlocked ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  />
                </div>
              </div>

              {/* Dropdown Periode Bulan */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Bulan:
                </span>
                <div className="relative">
                  <select
                    value={currentPeriodId}
                    onChange={(e) =>
                      setActivePeriodIdByCategory((prev) => ({
                        ...prev,
                        [activeCategory]: e.target.value,
                      }))
                    }
                    className="appearance-none pl-3 pr-8 py-2 text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  >
                    {currentCategoryPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => requireAdmin(() => setIsPeriodModalOpen(true))}
                className="px-3 py-2 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5"
                title="Kelola atau buat bulan baru"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Bulan Baru</span>
              </button>
            </div>

            {/* Baris 2: Tombol Aksi (Input Data, Import Excel, Ekspor PDF) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Input Data Pegawai */}
              <button
                onClick={() =>
                  requireAdmin(() => {
                    setEditingItem(null);
                    setIsInputModalOpen(true);
                  })
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Pegawai</span>
              </button>

              {/* Import Excel */}
              <button
                onClick={() => requireAdmin(() => setIsImportModalOpen(true))}
                className="px-3.5 py-2.5 text-xs font-semibold text-emerald-900 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5"
                title="Import data dari Excel (.xlsx / .xls / .csv)"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>Import Excel</span>
              </button>

              {/* Ekspor PDF */}
              <button
                onClick={handleExportPdf}
                className="px-3.5 py-2.5 text-xs font-semibold text-rose-900 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5"
                title="Unduh laporan resmi format PDF"
              >
                <FileDown className="w-4 h-4 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>

              {/* Ekspor Excel */}
              <button
                onClick={handleExportExcel}
                className="px-3 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition flex items-center gap-1.5"
                title="Unduh berkas Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              {/* Cetak */}
              <button
                onClick={() => window.print()}
                className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition"
                title="Cetak Laporan Langsung"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner status hak akses jika terkunci */}
          {!isUnlocked && (
            <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Aplikasi dalam mode lihat (terkunci).</strong> Silakan buka kunci untuk mengedit atau menginput data.
                </span>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs transition shrink-0 ml-2"
              >
                Buka Kunci
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards Ringkasan */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-hide">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Nilai Kotor
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
              Rp {formatNominal(totals.kotor)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nilai bruto sebelum potongan
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Potongan
              </span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-rose-600 font-mono">
              Rp {formatNominal(totals.potongan)}
            </p>
            <p className="text-[11px] text-rose-500/80 mt-0.5">
              Akumulasi potongan
            </p>
          </div>

          <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-emerald-200 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Nilai Bersih
              </span>
              <div className="p-1.5 bg-emerald-800 text-emerald-300 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-300 font-mono">
              Rp {formatNominal(totals.bersih)}
            </p>
            <p className="text-[11px] text-emerald-200 mt-0.5">
              Total disalurkan via rekening
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Jumlah Pegawai
              </span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900">
              {totals.count} <span className="text-xs font-normal text-slate-500">Orang</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kategori: <span className="font-semibold text-emerald-600">{CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
            </p>
          </div>
        </div>

        {/* CONTAINER TABEL UTAMA LAPORAN */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-300 p-6 sm:p-8 space-y-6 printable-area">
          {/* KOP SURAT & JUDUL LAPORAN (DAPAT DIEDIT REALTIME) */}
          <div className="border-b-2 border-slate-800 pb-4 text-center">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
              {currentSettings.instansi}
            </h2>
            <h3 className="text-xs sm:text-sm font-semibold uppercase text-slate-700">
              {currentSettings.unitKerja}
            </h3>

            {/* Judul Laporan yang Dapat Diedit Langsung */}
            <div className="my-2.5 flex items-center justify-center gap-2">
              {isEditingTitleInline ? (
                <div className="flex items-center gap-2 max-w-xl w-full">
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitleInline();
                      if (e.key === 'Escape') setIsEditingTitleInline(false);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-black uppercase text-center bg-yellow-50 border-2 border-amber-400 rounded-lg outline-none"
                  />
                  <button
                    onClick={handleSaveTitleInline}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    title="Simpan Judul"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingTitleInline(false)}
                    className="p-1.5 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition"
                    title="Batal"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="group inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-300 rounded-md">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                    {currentSettings.judulLaporan}
                  </span>
                  <button
                    onClick={() =>
                      requireAdmin(() => {
                        setTempTitle(currentSettings.judulLaporan);
                        setIsEditingTitleInline(true);
                      })
                    }
                    className="p-1 text-slate-400 hover:text-slate-900 transition rounded print-hide"
                    title="Klik untuk mengedit judul laporan"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-600 uppercase">
              BULAN: <span className="text-slate-900 font-bold">{activePeriod?.title.toUpperCase()}</span>
            </p>
          </div>

          {/* Search bar & info atas tabel */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print-hide">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama pegawai / no rekening..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
              <span>Menampilkan {filteredItems.length} dari {activePeriod?.items.length || 0} pegawai</span>
              <button
                onClick={handleResetData}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Reset data kategori ini ke bawaan awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TABEL DENGAN KOLOM JUMLAH POTONGAN (SESUAI PERMINTAAN 3) */}
          <div className="border border-slate-900 overflow-x-auto rounded-none">
            <table className="w-full text-xs border-collapse printable-table">
              {/* Header Tabel persis gambar, dengan label JUMLAH POTONGAN */}
              <thead>
                <tr className="bg-[#D9D9D9] text-black font-extrabold border-b border-slate-900 divide-x divide-slate-900">
                  <th className="py-3 px-3 text-center w-12 tracking-wider">
                    NO
                  </th>
                  <th className="py-3 px-4 text-center tracking-wider">
                    NAMA
                  </th>
                  <th className="py-3 px-4 text-center w-40 tracking-wider">
                    NO REKENING
                  </th>
                  <th className="py-3 px-4 text-center w-36 tracking-wider">
                    NILAI KOTOR
                  </th>
                  <th className="py-3 px-4 text-center w-44 tracking-wider">
                    JUMLAH POTONGAN
                  </th>
                  <th className="py-3 px-4 text-center w-36 tracking-wider">
                    NILAI BERSIH
                  </th>
                  <th className="py-3 px-3 text-center w-64">
                    KONFIRMASI & ULASAN
                  </th>
                </tr>
              </thead>

              {/* Body Rows */}
              <tbody className="divide-y divide-slate-900 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data pegawai yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="divide-x divide-slate-900 hover:bg-emerald-50/40 transition group"
                    >
                      {/* NO */}
                      <td className="py-2.5 px-3 text-center font-normal text-black align-middle">
                        {item.no || idx + 1}
                      </td>

                      {/* NAMA */}
                      <td className="py-2.5 px-4 text-left font-normal text-black uppercase tracking-tight align-middle">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="font-semibold">{item.nama}</span>
                          {item.keterangan && (
                            <span className="text-[10px] text-slate-500 font-sans italic">
                              ({item.keterangan})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NO REKENING */}
                      <td className="py-2.5 px-4 text-center font-mono text-black relative align-middle">
                        <span className="absolute left-1 top-1 w-0 h-0 border-t-4 border-t-emerald-600 border-r-4 border-r-transparent print-hide"></span>
                        {item.noRekening}
                      </td>

                      {/* NILAI KOTOR */}
                      <td className="py-2.5 px-4 text-right font-mono text-black align-middle">
                        {formatNominal(item.gajiKotor)}
                      </td>

                      {/* JUMLAH POTONGAN */}
                      <td className="py-2.5 px-4 text-right font-mono text-black align-middle">
                        {formatNominal(item.potongan)}
                      </td>

                      {/* NILAI BERSIH */}
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-black align-middle">
                        {formatNominal(item.gajiBersih)}
                      </td>

                      {/* KONFIRMASI & ULASAN (Status & ulasan tampil saat print, tombol interaktif print-hide) */}
                      <td className="py-2.5 px-3 text-left align-middle">
                        <div className="space-y-1">
                          {/* Status konfirmasi tampil saat print & screen */}
                          <div>
                            {item.isConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-sans">
                                ✓ Diterima {item.confirmedAt ? `(${item.confirmedAt})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-sans">
                                Belum Konfirmasi
                              </span>
                            )}
                          </div>

                          {/* Ulasan tampil saat print & screen jika ada */}
                          {item.feedback && (
                            <div className="text-[10.5px] font-sans text-blue-950 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                              <span className="font-bold text-blue-700">Ulasan:</span> "{item.feedback}" {item.feedbackAt ? `(${item.feedbackAt})` : ''}
                            </div>
                          )}

                          {/* Tombol interaktif (disembunyikan saat print) */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 print-hide">
                            <button
                              type="button"
                              onClick={() => handleToggleConfirmation(item)}
                              className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition shadow-2xs ${
                                item.isConfirmed
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-1 ring-emerald-700/40'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                              }`}
                              title={
                                item.isConfirmed
                                  ? `Status: Telah Diterima (${item.confirmedAt || 'Sudah Konfirmasi'}). Klik untuk membatalkan.`
                                  : 'Klik ceklis ini untuk konfirmasi penerimaan gaji'
                              }
                            >
                              <Check className={`w-3.5 h-3.5 ${item.isConfirmed ? 'stroke-[2.5]' : 'text-slate-400'}`} />
                              <span>{item.isConfirmed ? 'Diterima' : 'Konfirmasi'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackModalItem(item);
                                setIsFeedbackModalOpen(true);
                              }}
                              className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 border transition ${
                                item.feedback
                                  ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 font-medium'
                                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-blue-700'
                              }`}
                              title={
                                item.feedback
                                  ? `Ulasan: "${item.feedback}". Klik untuk melihat/mengedit.`
                                  : 'Klik untuk mengisi ulasan atau konfirmasi penerimaan'
                              }
                            >
                              <MessageSquare className={`w-3.5 h-3.5 ${item.feedback ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span>{item.feedback ? 'Ulasan' : '+ Ulasan'}</span>
                            </button>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200">
                              <button
                                onClick={() => {
                                  setSlipItem(item);
                                  setIsSlipModalOpen(true);
                                }}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Cetak Slip Gaji Pegawai"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  requireAdmin(() => {
                                    setEditingItem(item);
                                    setIsInputModalOpen(true);
                                  })
                                }
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Edit Data Pegawai (Khusus Admin)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(item.id, item.nama)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Hapus Pegawai (Khusus Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Baris JUMLAH persis gambar */}
              <tfoot>
                <tr className="border-t-2 border-slate-900 divide-x divide-slate-900 bg-white font-extrabold text-black">
                  <td
                    colSpan={3}
                    className="py-3 px-4 text-center font-extrabold tracking-wider text-black text-sm"
                  >
                    JUMLAH
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-black font-extrabold">
                    {formatNominal(totals.kotor)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-black font-extrabold">
                    {formatNominal(totals.potongan)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-black font-extrabold">
                    {formatNominal(totals.bersih)}
                  </td>
                  <td className="print-hide bg-slate-50"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terbilang & Catatan */}
          <div className="pt-2 space-y-2.5">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                Terbilang Total Nilai Bersih yang Disalurkan:
              </span>
              <p className="font-semibold text-slate-900 italic mt-0.5">
                "{terbilangRupiah(totals.bersih)}"
              </p>
            </div>

            {/* Catatan Sesuai Permintaan */}
            <div className="p-3 bg-amber-50/80 border border-amber-300/80 rounded text-xs text-amber-950">
              <p className="font-medium">
                <strong className="font-bold">Catatan:</strong> Bahwasannya Nilai Bersih yang ditampilkan adalah Gaji sebelum dipotong oleh BANK JATIM atau BANK MINA MANDIRI. Untuk Jumlah Potongan Termasuk dari (INFAQ / DHARMA WANITA / PMI / BPJS).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 print-hide text-center">
        <p>Aplikasi Penyaluran Gaji Pegawai • Mendukung Gaji Paruh Waktu, Gaji PNS, Gaji PPPK, dan TPP PNS • Copyright @joko92m</p>
      </footer>

      {/* MODAL AUTENTIKASI ADMIN (user: admin, password: djoko92m) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setIsUnlocked(true);
          showToast('Kunci edit berhasil dibuka! Anda dapat mengedit data sekarang.');
          if (pendingAction) {
            const action = pendingAction;
            setPendingAction(null);
            action();
          }
        }}
      />

      {/* MODAL INPUT / EDIT PEGAWAI */}
      <InputEmployeeModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEmployee}
        editItem={editingItem}
        nextNo={(activePeriod?.items.length || 0) + 1}
      />

      {/* MODAL IMPORT EXCEL */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        currentCount={activePeriod?.items.length || 0}
      />

      {/* MODAL KELOLA PERIODE BULAN */}
      <PeriodManagerModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        periods={currentCategoryPeriods}
        currentPeriodId={currentPeriodId}
        onSelectPeriod={(id) =>
          setActivePeriodIdByCategory((prev) => ({
            ...prev,
            [activeCategory]: id,
          }))
        }
        onAddPeriod={handleAddPeriod}
        onDeletePeriod={handleDeletePeriod}
        onUpdatePeriodStatus={handleUpdatePeriodStatus}
      />

      {/* MODAL SLIP GAJI */}
      {activePeriod && (
        <SlipGajiModal
          isOpen={isSlipModalOpen}
          onClose={() => {
            setIsSlipModalOpen(false);
            setSlipItem(null);
          }}
          item={slipItem}
          period={activePeriod}
          settings={currentSettings}
        />
      )}

      {/* MODAL PENGATURAN KOP & JUDUL */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onSave={(newSet) => {
          setSettingsByCategory((prev) => ({
            ...prev,
            [activeCategory]: newSet,
          }));
          showToast('Pengaturan kop & judul laporan berhasil disimpan realtime.');
        }}
      />

      {/* MODAL BACKUP & RESTORE DATABASE KESELURUHAN */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentDatabase={{
          activeCategory,
          activePeriodIdByCategory,
          settingsByCategory,
          dataByCategory,
        }}
        onRestore={handleRestoreDatabase}
      />

      {/* MODAL FEEDBACK & KONFIRMASI PENERIMAAN PEGAWAI (TIDAK DIKUNCI ADMIN) */}
      <EmployeeFeedbackModal
        isOpen={isFeedbackModalOpen}
        item={feedbackModalItem}
        periodTitle={activePeriod?.title || ''}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          setFeedbackModalItem(null);
        }}
        onSave={handleSaveFeedback}
      />
    </div>
  );
}
