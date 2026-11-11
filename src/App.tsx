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
import { BankPayrollPdfModal } from './components/BankPayrollPdfModal';
import { saveBankPdfToStorage, deleteBankPdfFromStorage } from './utils/bankPdfStorage';

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
  FileText,
  Eye,
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
  const [isBankPdfModalOpen, setIsBankPdfModalOpen] = useState(false);
  const bankPdfToolbarInputRef = React.useRef<HTMLInputElement>(null);
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

  // 3. Simpan perubahan ke Cloud Firestore terpusat & Google Drive (DATABASE GAJIPERKIM)
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
      try {
        localStorage.setItem('payroll_last_updated', String(payload.lastUpdated));
      } catch {}
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
    if (!activePeriod) return { kotor: 0, potongan: 0, bersih: 0, count: 0, confirmedCount: 0 };
    const kotor = activePeriod.items.reduce((sum, item) => sum + item.gajiKotor, 0);
    const potongan = activePeriod.items.reduce((sum, item) => sum + item.potongan, 0);
    const bersih = activePeriod.items.reduce((sum, item) => sum + item.gajiBersih, 0);
    const confirmedCount = activePeriod.items.filter((item) => item.isConfirmed).length;
    return {
      kotor,
      potongan,
      bersih,
      count: activePeriod.items.length,
      confirmedCount,
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

  // Konfirmasi Penerimaan Gaji Pegawai
  // Catatan: Mengkonfirmasi penerimaan terbuka untuk pegawai, namun MEMBATALKAN konfirmasi yang sudah ada harus membuka kunci aplikasi (password admin: djoko92m).
  const handleToggleConfirmation = (item: PayrollItem) => {
    if (!activePeriod) return;

    // Jika saat ini sudah dikonfirmasi, membatalkannya harus membuka kunci aplikasi
    if (item.isConfirmed) {
      requireAdmin(() => {
        executeToggleConfirmation(item, false);
      });
      return;
    }

    // Jika belum dikonfirmasi, langsung konfirmasi (terbuka untuk pegawai tanpa kunci)
    executeToggleConfirmation(item, true);
  };

  const executeToggleConfirmation = (item: PayrollItem, newConfirmed: boolean) => {
    if (!activePeriod) return;
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
        : `Konfirmasi penerimaan gaji ${item.nama} berhasil dibatalkan.`
    );
  };

  // Simpan Feedback / Ulasan Pegawai
  // Catatan: Pengisian/edit ulasan dan konfirmasi penerimaan terbuka untuk pegawai, namun membatalkan konfirmasi yang sudah ada harus membuka kunci aplikasi.
  const handleSaveFeedback = (commentText: string, isConfirmed?: boolean) => {
    if (!activePeriod || !feedbackModalItem) return;

    // Jika awalnya sudah dikonfirmasi dan pengguna membatalkannya, memerlukan pembukaan kunci admin
    if (feedbackModalItem.isConfirmed && isConfirmed === false && !isUnlocked) {
      requireAdmin(() => {
        executeSaveFeedback(commentText, isConfirmed);
      });
      return;
    }

    executeSaveFeedback(commentText, isConfirmed);
  };

  const executeSaveFeedback = (commentText: string, isConfirmed?: boolean) => {
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

  // Upload Berkas PDF Data Asli Payroll ke Bank untuk Periode Aktif
  const handleUploadBankPdf = async (file: File) => {
    if (!activePeriod) return;
    const now = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const pdfMeta = {
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: now,
            dataUrl,
          };

          // Simpan ke storage (IndexedDB + Firestore dokumen terpisah)
          await saveBankPdfToStorage(activePeriod.id, pdfMeta);

          // Update data periode saat ini
          setDataByCategory((prev) => {
            const periods = prev[activeCategory] || [];
            const updated = periods.map((p) => {
              if (p.id === activePeriod.id) {
                return {
                  ...p,
                  bankPayrollPdf: {
                    fileName: file.name,
                    fileSize: file.size,
                    uploadedAt: now,
                    // Sertakan dataUrl di state memori lokal agar langsung tampil
                    dataUrl: dataUrl.length < 250000 ? dataUrl : '',
                  },
                };
              }
              return p;
            });
            return { ...prev, [activeCategory]: updated };
          });

          showToast(`Berkas PDF data asli Payroll ke Bank (${file.name}) berhasil diunggah!`);
          setIsBankPdfModalOpen(true);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Hapus Berkas PDF Data Asli Payroll ke Bank untuk Periode Aktif
  const handleDeleteBankPdf = async () => {
    if (!activePeriod) return;
    await deleteBankPdfFromStorage(activePeriod.id);
    setDataByCategory((prev) => {
      const periods = prev[activeCategory] || [];
      const updated = periods.map((p) => {
        if (p.id === activePeriod.id) {
          return {
            ...p,
            bankPayrollPdf: null,
          };
        }
        return p;
      });
      return { ...prev, [activeCategory]: updated };
    });
    showToast('Berkas PDF data asli payroll ke bank berhasil dihapus.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 print-hide sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Judul Sistem */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/logo-dpkp.svg"
              alt="Logo DPKP Kabupaten Pasuruan"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0 filter drop-shadow-md hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold tracking-tight leading-tight truncate sm:whitespace-normal">
                Sistem Tanda Terima Gaji & TPP Elektronik
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate sm:whitespace-normal">
                Dinas Perumahan dan Kawasan Permukiman Kab Pasuruan
              </p>
            </div>
          </div>

          {/* Pengunci Edit & Aksi Header */}
          <div className="grid grid-cols-3 sm:flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            {/* Tombol Status Kunci Edit */}
            {isUnlocked ? (
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  showToast('Mode edit dikunci kembali.');
                }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 rounded-xl transition shadow-2xs active:scale-95"
                title="Klik untuk mengunci mode edit"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold">Kunci</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900/90 border border-amber-600/60 rounded-xl transition shadow-2xs active:scale-95"
                title="Buka kunci edit dengan akun admin"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold">Buka Kunci</span>
              </button>
            )}

            {/* Tombol Backup / Restore Database Keseluruhan */}
            <button
              onClick={() => requireAdmin(() => setIsBackupModalOpen(true))}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shadow-2xs active:scale-95"
              title="Upload / Download Database Keseluruhan Aplikasi"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs">Backup</span>
            </button>

            {/* Pengaturan */}
            <button
              onClick={() => requireAdmin(() => setIsSettingsModalOpen(true))}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shadow-2xs active:scale-95"
              title="Atur Nama Instansi, Unit Kerja & Judul Laporan"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs">Pengaturan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6 flex-1">
        {/* DROPDOWN KATEGORI & TOOLBAR KONTROL (PRINT HIDE) */}
        <div className="bg-slate-900/90 border border-slate-800 text-slate-100 p-3.5 sm:p-5 rounded-2xl shadow-md space-y-4 print-hide">
          {/* Baris 1: Dropdown 3 Kategori Gaji & Pilihan Bulan */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 sm:gap-4">
            {/* DROPDOWN 3 BAGIAN: Gaji Paruh Waktu, Gaji PNS, Gaji PPPK */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Kategori:</span>
                  {!isUnlocked && (
                    <button
                      type="button"
                      onClick={() => requireAdmin(() => {})}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-600/50 rounded text-[10px] font-bold transition"
                      title="Kategori dikunci: Klik untuk membuka kunci dengan password admin"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </button>
                  )}
                </span>
                <div className="relative flex-1 sm:flex-none min-w-[170px]">
                  <select
                    value={activeCategory}
                    onMouseDown={(e) => {
                      if (!isUnlocked) {
                        e.preventDefault();
                        requireAdmin(() => {});
                      }
                    }}
                    onChange={(e) => {
                      const nextCat = e.target.value as PayrollCategory;
                      if (nextCat === activeCategory) return;
                      requireAdmin(() => {
                        setActiveCategory(nextCat);
                        showToast(`Beralih ke kategori: ${CATEGORIES.find((c) => c.id === nextCat)?.name || nextCat}`);
                      });
                    }}
                    className={`w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none transition shadow-2xs ${
                      !isUnlocked
                        ? 'text-amber-200 bg-amber-950/50 hover:bg-amber-950/80 border border-amber-600/50'
                        : 'text-emerald-300 bg-slate-800 hover:bg-slate-750 border border-slate-700'
                    }`}
                    title={
                      !isUnlocked
                        ? 'Kategori Terkunci: Memerlukan password admin untuk merubah kategori'
                        : 'Pilih Kategori Gaji'
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-100">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`w-4 h-4 absolute right-2.5 top-2.5 sm:top-3 pointer-events-none ${
                      !isUnlocked ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />
                </div>
              </div>

              {/* Dropdown Periode Bulan (Ikut Dikunci saat Mode Kunci Aktif) */}
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">Bulan:</span>
                  {!isUnlocked && (
                    <button
                      type="button"
                      onClick={() => requireAdmin(() => {})}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-600/50 rounded text-[10px] font-bold transition"
                      title="Bulan dikunci: Klik untuk membuka kunci dengan password admin"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </button>
                  )}
                </span>
                <div className="relative flex-1 sm:flex-none min-w-[145px]">
                  <select
                    value={currentPeriodId}
                    onMouseDown={(e) => {
                      if (!isUnlocked) {
                        e.preventDefault();
                        requireAdmin(() => {});
                      }
                    }}
                    onChange={(e) => {
                      const nextPeriodId = e.target.value;
                      if (nextPeriodId === currentPeriodId) return;
                      requireAdmin(() => {
                        setActivePeriodIdByCategory((prev) => ({
                          ...prev,
                          [activeCategory]: nextPeriodId,
                        }));
                        const target = currentCategoryPeriods.find((p) => p.id === nextPeriodId);
                        if (target) {
                          showToast(`Beralih ke periode: ${target.title}`);
                        }
                      });
                    }}
                    className={`w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none transition shadow-2xs ${
                      !isUnlocked
                        ? 'text-amber-200 bg-amber-950/50 hover:bg-amber-950/80 border border-amber-600/50'
                        : 'text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700'
                    }`}
                    title={
                      !isUnlocked
                        ? 'Bulan Terkunci: Memerlukan password admin untuk merubah bulan'
                        : 'Pilih Periode Bulan'
                    }
                  >
                    {currentCategoryPeriods.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                        {p.title} ({p.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`w-4 h-4 absolute right-2.5 top-2.5 sm:top-3 pointer-events-none ${
                      !isUnlocked ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <button
                onClick={() => requireAdmin(() => setIsPeriodModalOpen(true))}
                className="px-3 py-2 text-xs font-medium text-blue-300 hover:text-blue-200 bg-blue-950/70 hover:bg-blue-900 border border-blue-700/50 rounded-xl transition flex items-center gap-1.5 shrink-0"
                title="Kelola atau buat bulan baru"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Bulan Baru</span>
              </button>
            </div>

            {/* Baris 2: Tombol Aksi (Input Data, Import Excel, Ekspor PDF) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              {/* Tombol Input Data Pegawai */}
              <button
                onClick={() =>
                  requireAdmin(() => {
                    setEditingItem(null);
                    setIsInputModalOpen(true);
                  })
                }
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Pegawai</span>
              </button>

              {/* Import Excel */}
              <button
                onClick={() => requireAdmin(() => setIsImportModalOpen(true))}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 rounded-xl transition flex items-center gap-1.5 shrink-0"
                title="Import data dari Excel (.xlsx / .xls / .csv)"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import Excel</span>
              </button>

              {/* Ekspor PDF */}
              <button
                onClick={handleExportPdf}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/50 rounded-xl transition flex items-center gap-1.5 shrink-0"
                title="Unduh laporan resmi format PDF"
              >
                <FileDown className="w-4 h-4 text-rose-400" />
                <span>Ekspor PDF</span>
              </button>

              {/* Ekspor Excel */}
              <button
                onClick={handleExportExcel}
                className="px-3 py-2 sm:py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-1.5 shrink-0"
                title="Unduh berkas Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span>Excel</span>
              </button>

              {/* Data Asli Payroll ke Bank (PDF) */}
              <button
                type="button"
                onClick={() => setIsBankPdfModalOpen(true)}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
                title="Lihat berkas PDF data asli payroll ke Bank (Bank Jatim / Bank Mina Mandiri)"
              >
                <FileText className="w-4 h-4 text-indigo-200" />
                <span>Data Asli Payroll Bank (PDF)</span>
                {activePeriod?.bankPayrollPdf && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>

              {/* Cetak */}
              <button
                onClick={() => window.print()}
                className="p-2 sm:p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shrink-0"
                title="Cetak Laporan Langsung"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Input file tersembunyi untuk toolbar upload cepat */}
              <input
                ref={bankPdfToolbarInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadBankPdf(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards Ringkasan */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 print-hide">
          <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Total Nilai Kotor
              </span>
              <div className="p-1 sm:p-1.5 bg-blue-950/70 text-blue-400 border border-blue-800/40 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-blue-400 font-mono tracking-tight truncate">
              Rp {formatNominal(totals.kotor)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              Nilai bruto sebelum potongan
            </p>
          </div>

          <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Total Potongan
              </span>
              <div className="p-1 sm:p-1.5 bg-rose-950/70 text-rose-400 border border-rose-800/40 rounded-lg">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-rose-400 font-mono tracking-tight truncate">
              Rp {formatNominal(totals.potongan)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-rose-400/80 mt-0.5 truncate">
              Akumulasi potongan
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 p-3 sm:p-4 rounded-2xl border border-emerald-700/60 shadow-md">
            <div className="flex items-center justify-between text-emerald-300 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Total Nilai Bersih
              </span>
              <div className="p-1 sm:p-1.5 bg-emerald-900/80 text-emerald-300 rounded-lg">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-emerald-300 font-mono tracking-tight truncate">
              Rp {formatNominal(totals.bersih)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-0.5 truncate">
              Total disalurkan via rekening
            </p>
          </div>

          <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Jumlah Pegawai
              </span>
              <div className="p-1 sm:p-1.5 bg-indigo-950/70 text-indigo-400 border border-indigo-800/40 rounded-lg">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-slate-100 tracking-tight truncate">
              {totals.count} <span className="text-xs font-normal text-slate-400">Orang</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              Kategori: <span className="font-semibold text-emerald-400">{CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
            </p>
          </div>

          <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Sudah Konfirmasi
              </span>
              <div className="p-1 sm:p-1.5 bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-emerald-400 tracking-tight truncate">
              {totals.confirmedCount} <span className="text-xs font-normal text-slate-400">/ {totals.count} Orang</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-0.5 font-medium truncate">
              {totals.count > 0 ? `${Math.round((totals.confirmedCount / totals.count) * 100)}% telah menerima` : '0%'}
            </p>
          </div>
        </div>

        {/* CONTAINER TABEL UTAMA LAPORAN */}
        <div className="bg-slate-900/95 rounded-2xl shadow-md border border-slate-800 p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 printable-area">
          {/* KOP SURAT & JUDUL LAPORAN (DAPAT DIEDIT REALTIME) */}
          <div className="border-b-2 border-slate-600 pb-4 text-center">
            <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-slate-100">
              {currentSettings.instansi}
            </h2>
            <h3 className="text-xs sm:text-sm font-semibold uppercase text-slate-300 mt-0.5">
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
                    className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-black uppercase text-center bg-slate-800 text-white border-2 border-emerald-500 rounded-lg outline-none"
                  />
                  <button
                    onClick={handleSaveTitleInline}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition"
                    title="Simpan Judul"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingTitleInline(false)}
                    className="p-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                    title="Batal"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="group inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-slate-800/90 border border-slate-700 rounded-md max-w-full overflow-hidden">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 truncate">
                    {currentSettings.judulLaporan}
                  </span>
                  <button
                    onClick={() =>
                      requireAdmin(() => {
                        setTempTitle(currentSettings.judulLaporan);
                        setIsEditingTitleInline(true);
                      })
                    }
                    className="p-1 text-slate-400 hover:text-white transition rounded print-hide shrink-0"
                    title="Klik untuk mengedit judul laporan"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-300 uppercase">
              BULAN: <span className="text-emerald-400 font-bold">{activePeriod?.title.toUpperCase()}</span>
            </p>
          </div>

          {/* BANNER DATA ASLI PAYROLL KE BANK (PDF) */}
          <div className="bg-slate-900/90 border border-indigo-900/60 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print-hide shadow-md">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-100">
                    Data Asli Payroll ke Bank:
                  </span>
                  {activePeriod?.bankPayrollPdf ? (
                    <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 flex items-center gap-1 font-sans">
                      <Check className="w-3 h-3 text-emerald-400 stroke-[3]" /> {activePeriod.bankPayrollPdf.fileName}
                    </span>
                  ) : (
                    <span className="text-[11px] sm:text-xs font-medium text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-700/50">
                      Belum ada berkas PDF yang diunggah
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Dokumen asli bukti penyaluran data payroll ke Bank (Bank Jatim / Bank Mina Mandiri) untuk periode ini
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-col sm:flex-row w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsBankPdfModalOpen(true)}
                className="w-full sm:w-auto px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                title="Klik tombol untuk melihat pdf yang diupload tentang data Payroll ke Bank"
              >
                <Eye className="w-4 h-4 text-indigo-200" />
                <span>Lihat Data Asli Payroll ke Bank (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => requireAdmin(() => bankPdfToolbarInputRef.current?.click())}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-indigo-300 bg-slate-800 hover:bg-slate-700 border border-indigo-700/50 rounded-xl transition flex items-center justify-center gap-1.5"
                title={isUnlocked ? "Upload berkas PDF" : "Terkunci: Memerlukan sandi admin untuk mengunggah PDF"}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload PDF</span>
              </button>
            </div>
          </div>

          {/* Search bar & info atas tabel */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print-hide">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama pegawai / no rekening..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/90 text-slate-100 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400 w-full sm:w-auto">
              <span>Menampilkan {filteredItems.length} dari {activePeriod?.items.length || 0} pegawai</span>
              <button
                onClick={handleResetData}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Reset data kategori ini ke bawaan awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile swipe helper hint */}
          <div className="sm:hidden flex items-center justify-between text-[11px] text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 print-hide">
            <span className="flex items-center gap-1.5">
              <span className="inline-block animate-pulse text-emerald-400 font-bold">↔</span>
              <span>Geser tabel ke samping untuk melihat kolom lengkap</span>
            </span>
          </div>

          {/* TABEL DENGAN KOLOM JUMLAH POTONGAN (GARIS LEBIH TERANG & KONTRAS) */}
          <div className="border border-slate-600 overflow-x-auto rounded-xl shadow-md">
            <table className="w-full min-w-[780px] text-xs border-collapse printable-table">
              {/* Header Tabel */}
              <thead>
                <tr className="bg-slate-800 text-slate-100 font-extrabold border-b-2 border-slate-500 divide-x divide-slate-600">
                  <th className="py-3 px-3 text-center w-12 tracking-wider">
                    NO
                  </th>
                  <th className="py-3 px-4 text-center tracking-wider">
                    NAMA
                  </th>
                  {currentSettings.showNoRekening !== false && (
                    <th className="py-3 px-4 text-center w-40 tracking-wider">
                      NO REKENING
                    </th>
                  )}
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
              <tbody className="divide-y divide-slate-600 bg-slate-900/90 text-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={currentSettings.showNoRekening !== false ? 7 : 6} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data pegawai yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="divide-x divide-slate-600 hover:bg-slate-800/60 transition group"
                    >
                      {/* NO */}
                      <td className="py-2.5 px-3 text-center font-normal text-slate-400 align-middle">
                        {item.no || idx + 1}
                      </td>

                      {/* NAMA */}
                      <td className="py-2.5 px-4 text-left font-normal uppercase tracking-tight align-middle text-slate-100">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="font-semibold">{item.nama}</span>
                          {item.keterangan && (
                            <span className="text-[10px] text-slate-400 font-sans italic">
                              ({item.keterangan})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NO REKENING (Sembunyikan jika diatur nonaktif di Pengaturan) */}
                      {currentSettings.showNoRekening !== false && (
                        <td className="py-2.5 px-4 text-center font-mono text-slate-300 relative align-middle">
                          <span className="absolute left-1 top-1 w-0 h-0 border-t-4 border-t-emerald-500 border-r-4 border-r-transparent print-hide"></span>
                          {item.noRekening}
                        </td>
                      )}

                      {/* NILAI KOTOR */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-200 align-middle">
                        {formatNominal(item.gajiKotor)}
                      </td>

                      {/* JUMLAH POTONGAN */}
                      <td className="py-2.5 px-4 text-right font-mono text-rose-400 align-middle">
                        {formatNominal(item.potongan)}
                      </td>

                      {/* NILAI BERSIH */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-300 align-middle">
                        {formatNominal(item.gajiBersih)}
                      </td>

                      {/* KONFIRMASI & ULASAN (Status & ulasan tampil saat print, tombol interaktif print-hide) */}
                      <td className="py-2.5 px-3 text-left align-middle">
                        <div className="space-y-1">
                          {/* Status konfirmasi */}
                          <div>
                            {item.isConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded font-sans">
                                ✓ Diterima {item.confirmedAt ? `(${item.confirmedAt})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-300 bg-amber-950/70 border border-amber-700/50 px-1.5 py-0.5 rounded font-sans">
                                Belum Konfirmasi
                              </span>
                            )}
                          </div>

                          {/* Ulasan tampil jika ada */}
                          {item.feedback && (
                            <div className="text-[10.5px] font-sans text-blue-200 bg-blue-950/70 border border-blue-800/50 rounded px-2 py-1">
                              <span className="font-bold text-blue-400">Ulasan:</span> "{item.feedback}" {item.feedbackAt ? `(${item.feedbackAt})` : ''}
                            </div>
                          )}

                          {/* Tombol interaktif (disembunyikan saat print) */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 print-hide">
                            <button
                              type="button"
                              onClick={() => handleToggleConfirmation(item)}
                              className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition shadow-2xs ${
                                item.isConfirmed
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-1 ring-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 hover:text-emerald-300 hover:bg-slate-750'
                              }`}
                              title={
                                item.isConfirmed
                                  ? `Status: Telah Diterima (${item.confirmedAt || 'Sudah Konfirmasi'}). Klik untuk membatalkan${!isUnlocked ? ' (Memerlukan buka kunci aplikasi)' : ''}.`
                                  : 'Klik ceklis ini untuk konfirmasi penerimaan gaji'
                              }
                            >
                              <Check className={`w-3.5 h-3.5 ${item.isConfirmed ? 'stroke-[2.5]' : 'text-slate-400'}`} />
                              <span>{item.isConfirmed ? 'Diterima' : 'Konfirmasi'}</span>
                              {item.isConfirmed && !isUnlocked && (
                                <Lock className="w-2.5 h-2.5 text-emerald-200 ml-0.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackModalItem(item);
                                setIsFeedbackModalOpen(true);
                              }}
                              className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 border transition ${
                                item.feedback
                                  ? 'bg-blue-950/80 border-blue-700/60 text-blue-300 hover:bg-blue-900 font-medium'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-blue-300'
                              }`}
                              title={
                                item.feedback
                                  ? `Ulasan: "${item.feedback}". Klik untuk melihat/mengedit.`
                                  : 'Klik untuk mengisi ulasan atau konfirmasi penerimaan'
                              }
                            >
                              <MessageSquare className={`w-3.5 h-3.5 ${item.feedback ? 'text-blue-400' : 'text-slate-400'}`} />
                              <span>{item.feedback ? 'Ulasan' : '+ Ulasan'}</span>
                            </button>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-600">
                              <button
                                onClick={() => {
                                  setSlipItem(item);
                                  setIsSlipModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
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
                                className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                                title="Edit Data Pegawai (Khusus Admin)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(item.id, item.nama)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
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

              {/* Baris JUMLAH */}
              <tfoot>
                <tr className="border-t-2 border-slate-500 divide-x divide-slate-600 bg-slate-800 font-extrabold text-slate-100">
                  <td
                    colSpan={currentSettings.showNoRekening !== false ? 3 : 2}
                    className="py-3 px-4 text-center font-extrabold tracking-wider text-slate-100 text-sm"
                  >
                    JUMLAH
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-100 font-extrabold">
                    {formatNominal(totals.kotor)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400 font-extrabold">
                    {formatNominal(totals.potongan)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-300 font-extrabold">
                    {formatNominal(totals.bersih)}
                  </td>
                  <td className="print-hide bg-slate-800"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terbilang & Catatan */}
          <div className="pt-2 space-y-2.5">
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider block text-[10px]">
                Terbilang Total Nilai Bersih yang Disalurkan:
              </span>
              <p className="font-semibold text-emerald-300 italic mt-0.5">
                "{terbilangRupiah(totals.bersih)}"
              </p>
            </div>

            {/* Catatan Sesuai Permintaan */}
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200">
              <p className="font-medium">
                <strong className="font-bold text-amber-300">Catatan:</strong> Bahwasannya Nilai Bersih yang ditampilkan adalah Gaji sebelum dipotong oleh BANK JATIM atau BANK MINA MANDIRI. Untuk Jumlah Potongan Termasuk dari (INFAQ / DHARMA WANITA / PMI / BPJS).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Aplikasi */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-5 border-t border-slate-800 print-hide text-center space-y-1">
        <p className="font-semibold text-slate-300 tracking-wide">
          Copyright 2026 @joko92m
        </p>
        <p className="text-[11px] text-slate-500">
          Sistem Tanda Terima Gaji & TPP Elektronik • Dinas Perumahan dan Kawasan Permukiman Kab Pasuruan
        </p>
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
        syncStatus={syncStatus}
        isSyncingManual={isSyncingManual}
        onManualSync={handleManualSync}
        isFirestoreConnected={isFirestoreConnected}
      />

      {/* MODAL FEEDBACK & KONFIRMASI PENERIMAAN PEGAWAI */}
      <EmployeeFeedbackModal
        isOpen={isFeedbackModalOpen}
        item={feedbackModalItem}
        periodTitle={activePeriod?.title || ''}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          setFeedbackModalItem(null);
        }}
        onSave={handleSaveFeedback}
        requireAdmin={requireAdmin}
        isUnlocked={isUnlocked}
      />

      {/* MODAL LIHAT & UPLOAD DATA ASLI PAYROLL KE BANK (PDF) */}
      <BankPayrollPdfModal
        isOpen={isBankPdfModalOpen}
        onClose={() => setIsBankPdfModalOpen(false)}
        period={activePeriod}
        categoryName={CATEGORIES.find((c) => c.id === activeCategory)?.name || activeCategory}
        onUploadPdf={handleUploadBankPdf}
        onDeletePdf={handleDeleteBankPdf}
        requireAdmin={requireAdmin}
        isUnlocked={isUnlocked}
      />
    </div>
  );
}
