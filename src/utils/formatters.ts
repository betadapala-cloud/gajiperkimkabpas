export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format angka ke format mata uang Indonesia atau angka berpemisah ribuan titik
 * Contoh: 1888984 -> "1.888.984" (sesuai format tabel asli di gambar)
 */
export function formatNominal(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) || 0 : val;
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num));
}

/**
 * Format dengan awalan Rp
 * Contoh: 1888984 -> "Rp 1.888.984"
 */
export function formatRupiah(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return 'Rp 0';
  return `Rp ${formatNominal(val)}`;
}

/**
 * Parse string nominal (e.g. "1.888.984" or "Rp 1.888.984" or "1888984") ke number
 */
export function parseNominal(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Hapus semua karakter kecuali digit dan minus
  const cleaned = val.toString().replace(/[^0-9-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fungsi Terbilang Bahasa Indonesia untuk slip gaji / laporan keuangan
 */
export function terbilang(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  const roundNum = Math.floor(Math.abs(n));

  if (roundNum < 12) {
    return bilangan[roundNum];
  } else if (roundNum < 20) {
    return `${terbilang(roundNum - 10)} Belas`;
  } else if (roundNum < 100) {
    return `${terbilang(Math.floor(roundNum / 10))} Puluh ${terbilang(roundNum % 10)}`.trim();
  } else if (roundNum < 200) {
    return `Seratus ${terbilang(roundNum - 100)}`.trim();
  } else if (roundNum < 1000) {
    return `${terbilang(Math.floor(roundNum / 100))} Ratus ${terbilang(roundNum % 100)}`.trim();
  } else if (roundNum < 2000) {
    return `Seribu ${terbilang(roundNum - 1000)}`.trim();
  } else if (roundNum < 1000000) {
    return `${terbilang(Math.floor(roundNum / 1000))} Ribu ${terbilang(roundNum % 1000)}`.trim();
  } else if (roundNum < 1000000000) {
    return `${terbilang(Math.floor(roundNum / 1000000))} Juta ${terbilang(roundNum % 1000000)}`.trim();
  } else if (roundNum < 1000000000000) {
    return `${terbilang(Math.floor(roundNum / 1000000000))} Milyar ${terbilang(roundNum % 1000000000)}`.trim();
  }
  return roundNum.toString();
}

export function terbilangRupiah(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  return `${terbilang(n)} Rupiah`.replace(/\s+/g, ' ');
}
