import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollPeriod, ReportSettings } from '../types';
import { formatNominal, terbilangRupiah } from './formatters';

export function exportPeriodToPdf(period: PayrollPeriod, settings: ReportSettings) {
  // Gunakan orientasi Landscape A4
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // 1. Header / Kop Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(settings.instansi.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.unitKerja.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Garis kop surat
  doc.setLineWidth(0.6);
  doc.line(14, currentY, pageWidth - 14, currentY);
  doc.setLineWidth(0.2);
  doc.line(14, currentY + 1, pageWidth - 14, currentY + 1);
  currentY += 7;

  // Judul Laporan (Editable)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(settings.judulLaporan.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`PERIODE : ${period.title.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // Hitung total
  const totalKotor = period.items.reduce((sum, item) => sum + item.gajiKotor, 0);
  const totalPotongan = period.items.reduce((sum, item) => sum + item.potongan, 0);
  const totalBersih = period.items.reduce((sum, item) => sum + item.gajiBersih, 0);

  // 2. Data Tabel dengan kolom JUMLAH POTONGAN & KONFIRMASI/ULASAN
  const tableHead = [
    [
      { content: 'NO', styles: { halign: 'center' as const } },
      { content: 'NAMA', styles: { halign: 'center' as const } },
      { content: 'NO REKENING', styles: { halign: 'center' as const } },
      { content: 'NILAI KOTOR', styles: { halign: 'center' as const } },
      { content: 'JUMLAH POTONGAN', styles: { halign: 'center' as const } },
      { content: 'NILAI BERSIH', styles: { halign: 'center' as const } },
      { content: 'KONFIRMASI & ULASAN', styles: { halign: 'center' as const } },
    ],
  ];

  const tableBody = period.items.map((item, index) => [
    { content: String(item.no || index + 1), styles: { halign: 'center' as const } },
    { content: item.nama.toUpperCase(), styles: { halign: 'left' as const } },
    { content: item.noRekening, styles: { halign: 'center' as const } },
    { content: formatNominal(item.gajiKotor), styles: { halign: 'right' as const } },
    { content: formatNominal(item.potongan), styles: { halign: 'right' as const } },
    { content: formatNominal(item.gajiBersih), styles: { halign: 'right' as const } },
    {
      content: `${item.isConfirmed ? `✓ Diterima${item.confirmedAt ? ` (${item.confirmedAt})` : ''}` : 'Belum Konfirmasi'}${item.feedback ? `\nUlasan: "${item.feedback}"` : ''}`,
      styles: { halign: 'left' as const, fontSize: 8 },
    },
  ]);

  // Baris JUMLAH
  const tableFoot = [
    [
      {
        content: 'JUMLAH',
        colSpan: 3,
        styles: { halign: 'center' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatNominal(totalKotor),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatNominal(totalPotongan),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatNominal(totalBersih),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: '',
        styles: { halign: 'center' as const },
      },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [20, 20, 20],
      lineColor: [40, 40, 40],
      lineWidth: 0.25,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [220, 224, 230], // Abu-abu persis gambar tabel spreadsheet
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [40, 40, 40],
      lineWidth: 0.35,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [40, 40, 40],
      lineWidth: 0.35,
    },
    columnStyles: {
      0: { cellWidth: 10 }, // NO
      1: { cellWidth: 54 }, // NAMA
      2: { cellWidth: 32 }, // NO REKENING
      3: { cellWidth: 35 }, // NILAI KOTOR
      4: { cellWidth: 35 }, // JUMLAH POTONGAN
      5: { cellWidth: 33 }, // NILAI BERSIH
      6: { cellWidth: 70, fontSize: 7.5 }, // KONFIRMASI & ULASAN
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  // Ambil posisi Y setelah tabel
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Terbilang Total Nilai Bersih
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Terbilang Jumlah Nilai Bersih: "${terbilangRupiah(totalBersih)}"`,
    14,
    finalY
  );

  // Catatan Khusus Sesuai Permintaan
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'Catatan: Bahwasannya Nilai Bersih yang ditampilkan adalah Gaji sebelum dipotong oleh BANK JATIM atau BANK MINA MANDIRI. Untuk Jumlah Potongan Termasuk dari (INFAQ / DHARMA WANITA / PMI / BPJS).',
    14,
    finalY + 6
  );

  // Catatan: Bagian penandatanganan dihapus sesuai permintaan
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Laporan Penyaluran Gaji • Dicetak otomatis pada ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`,
    14,
    pageHeight - 8
  );

  const cleanFilename = `${settings.judulLaporan.replace(/[^a-zA-Z0-9]/g, '_')}_${period.title.replace(/\s+/g, '_')}.pdf`;
  doc.save(cleanFilename);
}
