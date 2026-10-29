import * as XLSX from 'xlsx';
import { PayrollItem, PayrollPeriod, ReportSettings } from '../types';
import { parseNominal } from './formatters';

/**
 * Generate dan unduh template file Excel untuk import data
 */
export function downloadExcelTemplate() {
  const wsData = [
    ['NO', 'NAMA', 'NO REKENING', 'NILAI KOTOR', 'JUMLAH POTONGAN', 'NILAI BERSIH'],
    [1, 'MUHAMMAD AFANDI', '0236739074', 1888984, 605251, 1283733],
    [2, 'FIRDITYA RACHMA DAMAYANTI', '0236024415', 1838504, 604771, 1233733],
    [3, 'HADI MULYONO', '0232755130', 1939464, 605731, 1333733],
    [4, 'M SUGIANTO', '0233138398', 1788024, 604291, 1183733],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 30 }, // NAMA
    { wch: 18 }, // NO REKENING
    { wch: 16 }, // NILAI KOTOR
    { wch: 22 }, // JUMLAH POTONGAN
    { wch: 16 }, // NILAI BERSIH
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Gaji');

  XLSX.writeFile(wb, 'Template_Import_Gaji_Pegawai.xlsx');
}

/**
 * Export data laporan periode saat ini ke Excel (Tanpa bagian penandatanganan)
 */
export function exportPeriodToExcel(period: PayrollPeriod, settings: ReportSettings) {
  const totalKotor = period.items.reduce((acc, curr) => acc + curr.gajiKotor, 0);
  const totalPotongan = period.items.reduce((acc, curr) => acc + curr.potongan, 0);
  const totalBersih = period.items.reduce((acc, curr) => acc + curr.gajiBersih, 0);

  const aoa: (string | number)[][] = [
    [settings.instansi.toUpperCase()],
    [settings.unitKerja.toUpperCase()],
    [settings.judulLaporan.toUpperCase()],
    [`PERIODE: ${period.title.toUpperCase()}`],
    [], // Blank line
    ['NO', 'NAMA', 'NO REKENING', 'NILAI KOTOR', 'JUMLAH POTONGAN', 'NILAI BERSIH'],
  ];

  period.items.forEach((item, index) => {
    aoa.push([
      item.no || index + 1,
      item.nama.toUpperCase(),
      item.noRekening,
      item.gajiKotor,
      item.potongan,
      item.gajiBersih,
    ]);
  });

  // Baris JUMLAH
  aoa.push([
    '',
    'JUMLAH',
    '',
    totalKotor,
    totalPotongan,
    totalBersih,
  ]);

  aoa.push([]);
  aoa.push(['Catatan: Bahwasannya Nilai Bersih yang ditampilkan adalah Gaji sebelum dipotong oleh BANK JATIM atau BANK MINA MANDIRI. Untuk Jumlah Potongan Termasuk dari (INFAQ / DHARMA WANITA / PMI / BPJS).']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // NO
    { wch: 35 }, // NAMA
    { wch: 20 }, // NO REKENING
    { wch: 18 }, // NILAI KOTOR
    { wch: 22 }, // JUMLAH POTONGAN
    { wch: 18 }, // NILAI BERSIH
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = period.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 31) || 'Laporan_Gaji';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanFilename = `Laporan_Penyaluran_Gaji_${period.title.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Parse file Excel (.xlsx / .xls / .csv) yang diupload
 */
export async function parseExcelPayroll(file: File): Promise<{
  success: boolean;
  items: PayrollItem[];
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', raw: false });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({ success: false, items: [], error: 'File Excel kosong atau tidak memiliki sheet.' });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as unknown[][];

        if (rawJson.length === 0) {
          resolve({ success: false, items: [], error: 'Tidak ada data dalam lembar kerja Excel.' });
          return;
        }

        let headerRowIndex = -1;
        let colMap = {
          no: -1,
          nama: -1,
          rekening: -1,
          gajiKotor: -1,
          potongan: -1,
          gajiBersih: -1,
        };

        for (let r = 0; r < Math.min(rawJson.length, 15); r++) {
          const row = rawJson[r] || [];
          const rowStr = row.map((cell) => String(cell || '').trim().toUpperCase());

          const namaIdx = rowStr.findIndex((c) => c.includes('NAMA'));
          const rekIdx = rowStr.findIndex((c) => c.includes('REK') || c.includes('REKENING'));
          const kotorIdx = rowStr.findIndex((c) => c.includes('KOTOR') || c.includes('BRUTO'));
          const potIdx = rowStr.findIndex((c) => c.includes('POTONG'));
          const bersihIdx = rowStr.findIndex((c) => c.includes('BERSIH') || c.includes('NETTO'));

          if (namaIdx !== -1 && (rekIdx !== -1 || kotorIdx !== -1)) {
            headerRowIndex = r;
            colMap = {
              no: rowStr.findIndex((c) => c === 'NO' || c === 'NO.' || c.includes('NOMOR')),
              nama: namaIdx,
              rekening: rekIdx !== -1 ? rekIdx : 2,
              gajiKotor: kotorIdx !== -1 ? kotorIdx : 3,
              potongan: potIdx !== -1 ? potIdx : 4,
              gajiBersih: bersihIdx !== -1 ? bersihIdx : 5,
            };
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          colMap = {
            no: 0,
            nama: 1,
            rekening: 2,
            gajiKotor: 3,
            potongan: 4,
            gajiBersih: 5,
          };
        }

        const items: PayrollItem[] = [];
        let seq = 1;

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r] || [];
          if (!row || row.length === 0) continue;

          const rawNama = String(row[colMap.nama] || '').trim();

          if (!rawNama || 
              rawNama.toUpperCase().includes('JUMLAH') || 
              rawNama.toUpperCase().includes('TOTAL')) {
            continue;
          }

          let rawRek = String(row[colMap.rekening] || '').trim();
          rawRek = rawRek.replace(/[^0-9]/g, '');

          const gajiKotor = parseNominal(row[colMap.gajiKotor] as string | number);
          const potongan = parseNominal(row[colMap.potongan] as string | number);
          let gajiBersih = parseNominal(row[colMap.gajiBersih] as string | number);

          if (!gajiBersih && (gajiKotor || potongan)) {
            gajiBersih = Math.max(0, gajiKotor - potongan);
          }

          const rawNo = parseInt(String(row[colMap.no] || ''), 10);

          items.push({
            id: `imported-${Date.now()}-${r}`,
            no: !isNaN(rawNo) && rawNo > 0 ? rawNo : seq,
            nama: rawNama.toUpperCase(),
            noRekening: rawRek || '-',
            gajiKotor,
            potongan,
            gajiBersih,
          });

          seq++;
        }

        if (items.length === 0) {
          resolve({
            success: false,
            items: [],
            error: 'Tidak ditemukan baris data pegawai yang valid dalam file Excel.',
          });
          return;
        }

        resolve({ success: true, items });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal membaca berkas Excel.';
        resolve({ success: false, items: [], error: errorMsg });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, items: [], error: 'Gagal membuka file Excel.' });
    };

    reader.readAsArrayBuffer(file);
  });
}
