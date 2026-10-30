export type PayrollCategory = 'paruh-waktu' | 'pns' | 'pppk' | 'tpp-pns';

export interface CategoryInfo {
  id: PayrollCategory;
  name: string;
  defaultTitle: string;
  badgeColor: string;
}

export interface PayrollItem {
  id: string;
  no: number;
  nama: string;
  noRekening: string;
  gajiKotor: number;
  potongan: number; // JUMLAH POTONGAN
  gajiBersih: number;
  keterangan?: string;
  isConfirmed?: boolean;
  confirmedAt?: string;
  feedback?: string;
  feedbackAt?: string;
}

export interface BankPayrollPdf {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  dataUrl?: string;
}

export interface PayrollPeriod {
  id: string;
  month: number; // 1 - 12
  year: number;
  title: string;
  status: 'Draf' | 'Disalurkan' | 'Terverifikasi';
  items: PayrollItem[];
  tanggalPenyaluran?: string;
  catatan?: string;
  bankPayrollPdf?: BankPayrollPdf | null;
}

export interface ReportSettings {
  instansi: string;
  unitKerja: string;
  judulLaporan: string;
  subJudul?: string;
  kota?: string;
  tanggalLaporan?: string;
}
