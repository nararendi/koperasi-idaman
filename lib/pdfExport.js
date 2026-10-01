/**
 * Utility untuk Ekspor Dokumen Resmi PDF (Cetak ke PDF / Download PDF)
 * Menghasilkan tata letak dokumen formal A4, kop surat resmi, tabel berborder rapi,
 * tanpa elemen website/antarmuka layar (bukan screenshot).
 */

function openPrintPDF(documentHtml, documentTitle, orientation = 'portrait', margin = '10mm') {
  const printWindow = window.open('', '_blank', 'width=1000,height=750');
  if (!printWindow) {
    alert('Harap izinkan popup di browser Anda untuk mengunduh/mencetak PDF.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${documentTitle}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${margin};
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 10px;
            line-height: 1.35;
          }

          /* KOP SURAT */
          .kop-container {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .kop-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .kop-sub {
            font-size: 9.5pt;
            margin: 1px 0;
          }

          /* JUDUL DOKUMEN */
          .doc-header {
            text-align: center;
            margin: 12px 0 16px 0;
          }
          .doc-title {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            text-decoration: underline;
            margin-bottom: 3px;
          }
          .doc-periode {
            font-size: 10.5pt;
            font-weight: bold;
          }

          /* TABEL FORMAL */
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          table.report-table th, table.report-table td {
            border: 1px solid #000;
            padding: 5px 8px;
            font-size: 10pt;
          }
          table.report-table th {
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
          }
          .section-head {
            background-color: #e2e8f0;
            font-weight: bold;
            font-size: 10.5pt;
          }
          .text-right { text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 9.5pt; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .total-row {
            background-color: #f8fafc;
            font-weight: bold;
            border-top: 2px solid #000;
          }

          /* TANDA TANGAN */
          .ttd-container {
            width: 100%;
            margin-top: 25px;
            page-break-inside: avoid;
          }
          .ttd-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
          }
          .ttd-table td {
            border: none;
            text-align: center;
            font-size: 10.5pt;
            padding: 3px;
          }

          /* WATERMARK KUITANSI */
          .kuitansi-box {
            border: 2px solid #000;
            padding: 20px;
            border-radius: 4px;
            position: relative;
          }
        </style>
      </head>
      <body>
        ${documentHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

import { formatNominal } from './formatters';

const fmt = (num) => formatNominal(num);

export const pdfExport = {
  // 1. Ekspor Laporan Keuangan Formal PDF
  exportLaporanKeuanganPDF(laporan, settings, labelPeriode) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeaderParts = [];
    if (settings.alamat) subHeaderParts.push(settings.alamat);
    if (settings.telepon) subHeaderParts.push(`Telp: ${settings.telepon}`);
    const subHeaderStr = subHeaderParts.join(' &bull; ');

    const html = `
      <div class="kop-container">
        <div class="kop-title">${settings.namaKoperasi || 'KOPERASI IDAMAN'}</div>
        ${subHeaderStr ? `<div class="kop-sub">${subHeaderStr}</div>` : ''}
      </div>

      <div class="doc-header">
        <div class="doc-title">Laporan Keuangan & Perkembangan Usaha</div>
        <div class="doc-periode">Periode: ${labelPeriode}</div>
      </div>

      <!-- I. ARUS KAS -->
      <table class="report-table">
        <thead>
          <tr>
            <th colspan="3" class="section-head" style="text-align: left;">I. LAPORAN ARUS KAS (CASHFLOW)</th>
          </tr>
          <tr>
            <th style="width: 40px;">No</th>
            <th>Uraian Transaksi</th>
            <th style="width: 180px;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td class="text-center">A</td>
            <td colspan="2">Penerimaan Kas (Arus Masuk)</td>
          </tr>
          <tr>
            <td class="text-center">1</td>
            <td>Penerimaan Setoran Simpanan (Pokok, Wajib & Sukarela)</td>
            <td class="text-right">${fmt(laporan.arusKas.totalSimpananMasuk)}</td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td>Penerimaan Angsuran Pinjaman Anggota</td>
            <td class="text-right">${fmt(laporan.arusKas.totalAngsuranMasuk)}</td>
          </tr>
          ${(laporan.arusKas.totalPenjualanSembako || 0) > 0 ? `
          <tr>
            <td class="text-center">3</td>
            <td>Penerimaan Omzet Toko Sembako</td>
            <td class="text-right">${fmt(laporan.arusKas.totalPenjualanSembako)}</td>
          </tr>` : ''}
          ${(laporan.arusKas.totalSetoranQurban || 0) > 0 ? `
          <tr>
            <td class="text-center">4</td>
            <td>Penerimaan Titipan Tabungan Qurban</td>
            <td class="text-right">${fmt(laporan.arusKas.totalSetoranQurban)}</td>
          </tr>` : ''}
          <tr>
            <td class="text-center">${(laporan.arusKas.totalPenjualanSembako || 0) > 0 || (laporan.arusKas.totalSetoranQurban || 0) > 0 ? '5' : '3'}</td>
            <td>Pendapatan Lain-Lain & Administrasi</td>
            <td class="text-right">${fmt(laporan.arusKas.totalPendapatanLain)}</td>
          </tr>
          <tr class="font-bold" style="background-color: #f1f5f9;">
            <td colspan="2" style="text-align: right;">Total Penerimaan Kas</td>
            <td class="text-right">Rp ${fmt(laporan.arusKas.totalPemasukan)}</td>
          </tr>

          <tr style="background: #f8fafc; font-weight: bold;">
            <td class="text-center">B</td>
            <td colspan="2">Pengeluaran Kas (Arus Keluar)</td>
          </tr>
          <tr>
            <td class="text-center">1</td>
            <td>Penyaluran Pinjaman / Kredit Baru ke Anggota</td>
            <td class="text-right">${fmt(laporan.arusKas.totalPenyaluranPinjaman)}</td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td>Penarikan Simpanan Sukarela Anggota</td>
            <td class="text-right">${fmt(laporan.arusKas.totalPenarikanSimpanan)}</td>
          </tr>
          ${(laporan.arusKas.totalKulakanSembako || 0) > 0 ? `
          <tr>
            <td class="text-center">3</td>
            <td>Pembelian / Kulakan Stok Toko Sembako</td>
            <td class="text-right">${fmt(laporan.arusKas.totalKulakanSembako)}</td>
          </tr>` : ''}
          ${(laporan.arusKas.totalPenyaluranQurban || 0) > 0 ? `
          <tr>
            <td class="text-center">4</td>
            <td>Penyaluran / Pembelian Hewan Qurban</td>
            <td class="text-right">${fmt(laporan.arusKas.totalPenyaluranQurban)}</td>
          </tr>` : ''}
          <tr>
            <td class="text-center">${(laporan.arusKas.totalKulakanSembako || 0) > 0 || (laporan.arusKas.totalPenyaluranQurban || 0) > 0 ? '5' : '3'}</td>
            <td>Biaya Operasional, Kantor & Konsumsi</td>
            <td class="text-right">${fmt(laporan.arusKas.totalBiayaOperasional)}</td>
          </tr>
          <tr class="font-bold" style="background-color: #f1f5f9;">
            <td colspan="2" style="text-align: right;">Total Pengeluaran Kas</td>
            <td class="text-right">Rp ${fmt(laporan.arusKas.totalPengeluaran)}</td>
          </tr>

          <tr class="total-row">
            <td colspan="2" style="font-size: 10.5pt;">SALDO KAS BERSIH PERIODE INI</td>
            <td class="text-right font-bold" style="font-size: 10.5pt;">Rp ${fmt(laporan.arusKas.saldoKasBersih)}</td>
          </tr>
        </tbody>
      </table>

      <!-- II. NERACA SALDO -->
      <table class="report-table">
        <thead>
          <tr>
            <th colspan="4" class="section-head" style="text-align: left;">II. NERACA KEUANGAN KOPERASI (POSISI KEUANGAN)</th>
          </tr>
          <tr>
            <th colspan="2" style="width: 50%;">ASET / AKTIVA</th>
            <th colspan="2" style="width: 50%;">KEWAJIBAN & EKUITAS / PASIVA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kas Likuid</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.kas)}</td>
            <td>Dana Titipan Qurban</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.danaTitipanQurban || 0)}</td>
          </tr>
          <tr>
            <td>Piutang Pinjaman Anggota</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.piutangPinjaman)}</td>
            <td>Simpanan Sukarela Anggota</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.simpananSukarela)}</td>
          </tr>
          <tr>
            <td>Persediaan Toko Sembako</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.persediaanSembako || 0)}</td>
            <td>Simpanan Pokok Anggota</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.simpananPokok)}</td>
          </tr>
          <tr>
            <td>-</td>
            <td class="text-right">-</td>
            <td>Simpanan Wajib Anggota</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.simpananWajib)}</td>
          </tr>
          <tr>
            <td>-</td>
            <td class="text-right">-</td>
            <td>Cadangan Modal & Laba Ditahan</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.cadanganModal || 0)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL ASET / AKTIVA</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.totalAset)}</td>
            <td>TOTAL PASIVA & EKUITAS</td>
            <td class="text-right">Rp ${fmt(laporan.neraca.totalKewajibanModal || laporan.neraca.totalAset)}</td>
          </tr>
        </tbody>
      </table>

      <!-- III. SIMULASI SHU -->
      <table class="report-table">
        <thead>
          <tr>
            <th colspan="3" class="section-head" style="text-align: left;">III. ESTIMASI SISA HASIL USAHA (SHU)</th>
          </tr>
          <tr>
            <th style="width: 40px;">No</th>
            <th>Uraian Komponen SHU</th>
            <th style="width: 180px;">Nilai (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td>Pendapatan Jasa Bunga Pinjaman Anggota</td>
            <td class="text-right">${fmt(laporan.shu.pendapatanBunga)}</td>
          </tr>
          ${(laporan.shu.labaSembako || 0) > 0 ? `
          <tr>
            <td class="text-center">2</td>
            <td>Laba Margin Usaha Toko Sembako</td>
            <td class="text-right">${fmt(laporan.shu.labaSembako)}</td>
          </tr>` : ''}
          <tr>
            <td class="text-center">${(laporan.shu.labaSembako || 0) > 0 ? '3' : '2'}</td>
            <td>Pendapatan Administrasi & Lainnya</td>
            <td class="text-right">${fmt(laporan.shu.pendapatanLain)}</td>
          </tr>
          <tr>
            <td class="text-center">${(laporan.shu.labaSembako || 0) > 0 ? '4' : '3'}</td>
            <td>Beban Biaya Operasional Koperasi</td>
            <td class="text-right">-${fmt(laporan.shu.biayaOperasional)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2">ESTIMASI SHU BERSIH KOPERASI</td>
            <td class="text-right font-bold">Rp ${fmt(laporan.shu.shuBersih)}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td colspan="3" class="font-bold">Alokasi Pembagian SHU Menurut AD/ART:</td>
          </tr>
          <tr>
            <td class="text-center">&bull;</td>
            <td>Jasa Anggota (${settings.shuPersenAnggota || 40}%)</td>
            <td class="text-right">Rp ${fmt(laporan.shu.alokasi.anggota)}</td>
          </tr>
          <tr>
            <td class="text-center">&bull;</td>
            <td>Jasa Modal / Simpanan (${settings.shuPersenModal || 30}%)</td>
            <td class="text-right">Rp ${fmt(laporan.shu.alokasi.modal)}</td>
          </tr>
          <tr>
            <td class="text-center">&bull;</td>
            <td>Pengurus & Pengawas (${settings.shuPersenPengurus || 20}%)</td>
            <td class="text-right">Rp ${fmt(laporan.shu.alokasi.pengurus)}</td>
          </tr>
          <tr>
            <td class="text-center">&bull;</td>
            <td>Dana Cadangan (${settings.shuPersenCadangan || 10}%)</td>
            <td class="text-right">Rp ${fmt(laporan.shu.alokasi.cadangan)}</td>
          </tr>
        </tbody>
      </table>

      <!-- TANDA TANGAN RESMI -->
      <div class="ttd-container">
        <table class="ttd-table">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%;">${todayStr}</td>
          </tr>
          <tr>
            <td>Mengetahui,<br/><strong>Ketua Pengurus</strong></td>
            <td>Disusun Oleh,<br/><strong>Bendahara</strong></td>
          </tr>
          <tr>
            <td style="height: 65px;"></td>
            <td style="height: 65px;"></td>
          </tr>
          <tr>
            <td><u><strong>${settings.ketua || '-'}</strong></u></td>
            <td><u><strong>${settings.bendahara || '-'}</strong></u></td>
          </tr>
        </table>
      </div>
    `;

    openPrintPDF(html, `Laporan_Keuangan_Koperasi_${labelPeriode}`);
  },

  // 2. Ekspor Kuitansi Simpanan Formal PDF
  exportKuitansiSimpananPDF(item, settings) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const isPenarikan = item.tipe === 'Penarikan' || (item.keterangan || '').toLowerCase().includes('tarik');
    const judulKuitansi = isPenarikan ? 'BUKTI PENARIKAN SIMPANAN' : 'KUITANSI BUKTI PENERIMAAN SIMPANAN';

    const subHeaderParts = [];
    if (settings.alamat) subHeaderParts.push(settings.alamat);
    if (settings.telepon) subHeaderParts.push(`Telp: ${settings.telepon}`);
    const subHeaderStr = subHeaderParts.join(' &bull; ');

    const html = `
      <div class="kuitansi-box">
        <div class="kop-container" style="border-bottom: 2px solid #000; margin-bottom: 10px;">
          <div class="kop-title" style="font-size: 14pt;">${settings.namaKoperasi || 'KOPERASI IDAMAN'}</div>
          ${subHeaderStr ? `<div class="kop-sub">${subHeaderStr}</div>` : ''}
        </div>

        <div class="doc-header" style="margin: 8px 0 14px 0;">
          <div class="doc-title" style="font-size: 12pt;">${judulKuitansi}</div>
          <div style="font-size: 9.5pt; font-family: monospace; margin-top: 2px;">No. Kuitansi: ${item.id}</div>
        </div>

        <table style="width: 100%; border: none; font-size: 10pt; line-height: 1.6;">
          <tr>
            <td style="width: 160px; font-weight: bold;">Telah ${isPenarikan ? 'diserahkan kepada' : 'diterima dari'}</td>
            <td style="width: 15px;">:</td>
            <td style="font-weight: bold;">${item.nama_anggota} (${item.nomor_anggota})</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Jumlah Pembayaran</td>
            <td>:</td>
            <td style="font-size: 12pt; font-weight: bold; color: #000;">
              Rp ${fmt(item.jumlah)}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; font-style: italic;">Terbilang</td>
            <td>:</td>
            <td style="font-style: italic; font-weight: bold; color: #334155;">
              # ${(item.jumlah ? (function(num){
                const b = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
                const t = (n) => {
                  n = Math.floor(Math.abs(Number(n) || 0));
                  if (n < 12) return b[n];
                  if (n < 20) return t(n - 10) + ' Belas';
                  if (n < 100) return (t(Math.floor(n / 10)) + ' Puluh ' + b[n % 10]).trim();
                  if (n < 200) return ('Seratus ' + t(n - 100)).trim();
                  if (n < 1000) return (t(Math.floor(n / 100)) + ' Ratus ' + t(n % 100)).trim();
                  if (n < 2000) return ('Seribu ' + t(n - 1000)).trim();
                  if (n < 1000000) return (t(Math.floor(n / 1000)) + ' Ribu ' + t(n % 1000)).trim();
                  if (n < 1000000000) return (t(Math.floor(n / 1000000)) + ' Juta ' + t(n % 1000000)).trim();
                  return (t(Math.floor(n / 1000000000)) + ' Miliar ' + t(n % 1000000000)).trim();
                };
                return t(num) + ' Rupiah';
              })(item.jumlah) : 'Nol Rupiah')} #
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Jenis Simpanan</td>
            <td>:</td>
            <td>Simpanan ${item.jenis} (${item.tipe || 'Setoran'})</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Metode Transaksi</td>
            <td>:</td>
            <td>${item.metode || 'Tunai'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Tanggal Transaksi</td>
            <td>:</td>
            <td>${item.tanggal}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Keterangan</td>
            <td>:</td>
            <td>${item.keterangan || '-'}</td>
          </tr>
        </table>

        <div class="ttd-container" style="margin-top: 20px;">
          <table class="ttd-table">
            <tr>
              <td style="width: 50%;">Anggota Koperasi,</td>
              <td style="width: 50%;">Petugas Kasir & Teller,</td>
            </tr>
            <tr>
              <td style="height: 55px;"></td>
              <td style="height: 55px;"></td>
            </tr>
            <tr>
              <td><u><strong>${item.nama_anggota}</strong></u></td>
              <td><u><strong>${item.pencatat || 'Petugas Kasir'}</strong></u></td>
            </tr>
          </table>
        </div>
      </div>
    `;

    openPrintPDF(html, `Kuitansi_${item.id}`);
  },

  // 3. Ekspor Daftar Tagihan & Potongan Bulanan Anggota (Payroll / Billing Sheet)
  exportDaftarTagihanPDF(tagihanData, settings, labelPeriode, kategori = 'internal') {
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateLine = `Bandung, ${todayFormatted}`;

    const listInternal = tagihanData.listInternal || (tagihanData?.list || []).filter(r => !r?.is_luar_lembaga);
    const listLuarLembaga = tagihanData.listLuarLembaga || (tagihanData?.list || []).filter(r => r?.is_luar_lembaga);
    const totals = tagihanData.totals || {};
    const totalsInternal = tagihanData.totalsInternal || {};
    const totalsLuarLembaga = tagihanData.totalsLuarLembaga || {};

    let titleKategori = '';
    let filenameSuffix = 'Tagihan';

    if (kategori === 'internal') {
      titleKategori = 'ANGGOTA INTERNAL (LEMBAGA)';
      filenameSuffix = 'Internal';
    } else if (kategori === 'luar') {
      titleKategori = 'ANGGOTA LUAR LEMBAGA';
      filenameSuffix = 'Luar_Lembaga';
    } else {
      titleKategori = 'SEMUA ANGGOTA (INTERNAL & LUAR LEMBAGA)';
      filenameSuffix = 'Semua_Anggota';
    }

    const renderTable = (subTitle, rows, subTotals) => {
      const rowsHtml = (rows || []).filter(Boolean).map((row, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt;">${idx + 1}</td>
          <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${row?.nomor_anggota || '-'}</td>
          <td style="border: 1px solid #000; padding: 3px 4px; font-weight: 500; font-size: 7.5pt;">${row?.nama || '-'}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.wajib || 0) > 0 ? `Rp ${fmt(row.wajib)}` : ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.sukarela || 0) > 0 ? `Rp ${fmt(row.sukarela)}` : ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.qurban || 0) > 0 ? `Rp ${fmt(row.qurban)}` : ''}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 3px 2px; font-weight: bold; font-size: 7.5pt;">${row?.cicilanKe || ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.pokok || 0) > 0 ? `Rp ${fmt(row.pokok)}` : ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.jasa || 0) > 0 ? `Rp ${fmt(row.jasa)}` : ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 2px; font-size: 7.5pt; white-space: nowrap;">${(row?.sembako || 0) > 0 ? `Rp ${fmt(row.sembako)}` : ''}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 3px 3px; font-weight: bold; color: #dc2626; font-size: 7.5pt; white-space: nowrap;">Rp ${fmt(row?.jumlah || 0)}</td>
        </tr>
      `).join('');

      return `
        ${subTitle ? `<div style="font-weight: 800; font-size: 8.5pt; margin: 10px 0 4px 0; color: #0f172a; text-transform: uppercase;">${subTitle} (${rows.length} Orang)</div>` : ''}
        <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; line-height: 1.15; margin-bottom: 10px;">
          <thead>
            <tr>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 4px 2px; width: 20px; text-align: center; font-weight: 800;">NO.</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 4px 2px; width: 46px; text-align: center; font-weight: 800;">NO. ANGGOTA</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 4px 4px; text-align: center; font-weight: 800;">NAMA</th>
              <th colspan="3" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 3px; text-align: center; font-weight: 800;">SIMPANAN</th>
              <th colspan="4" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 3px; text-align: center; font-weight: 800;">POTONGAN</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; padding: 4px 2px; width: 66px; text-align: center; font-weight: 800;">JUMLAH</th>
            </tr>
            <tr>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 50px; text-align: center; font-weight: 700;">WAJIB</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 54px; text-align: center; font-weight: 700;">SUKARELA</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 54px; text-align: center; font-weight: 700;">QURBAN</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 34px; text-align: center; font-weight: 700;">CICILAN KE</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 56px; text-align: center; font-weight: 700;">POKOK</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 48px; text-align: center; font-weight: 700;">JASA</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; padding: 3px 2px; width: 50px; text-align: center; font-weight: 700;">SEMBAKO</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 10px; border: 1px solid #000;">Tidak ada data tagihan</td></tr>'}
            <tr style="font-weight: bold; background: #e2e8f0; font-size: 7.5pt;">
              <td colspan="3" style="text-align: center; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; font-size: 7.5pt; color: #0f172a;">${subTitle ? `TOTAL ${subTitle}` : 'JUMLAH'}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.wajib || 0)}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.sukarela || 0)}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.qurban || 0)}</td>
              <td style="border: 1px solid #475569; padding: 4px 2px;"></td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.pokok || 0)}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.jasa || 0)}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; white-space: nowrap;">Rp ${fmt(subTotals?.sembako || 0)}</td>
              <td style="text-align: right; border: 1px solid #475569; padding: 4px 2px; font-weight: 900; color: #dc2626; font-size: 7.5pt; white-space: nowrap;">Rp ${fmt(subTotals?.total || 0)}</td>
            </tr>
          </tbody>
        </table>
      `;
    };

    let contentTablesHtml = '';
    if (kategori === 'internal') {
      contentTablesHtml = renderTable('', listInternal, totalsInternal);
    } else if (kategori === 'luar') {
      contentTablesHtml = renderTable('', listLuarLembaga, totalsLuarLembaga);
    } else {
      // Tampilkan Bagian I (Internal) dan Bagian II (Luar Lembaga) terpisah secara teratur
      contentTablesHtml = `
        ${renderTable('BAGIAN I: ANGGOTA INTERNAL (LEMBAGA)', listInternal, totalsInternal)}
        ${listLuarLembaga.length > 0 ? renderTable('BAGIAN II: ANGGOTA LUAR LEMBAGA', listLuarLembaga, totalsLuarLembaga) : ''}
        <div style="margin: 12px 0 16px 0; padding: 8px 12px; background: #fee2e2; border: 1.5px solid #ef4444; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 9pt;">
          <strong style="color: #991b1b; text-transform: uppercase;">GRAND TOTAL TAGIHAN (BAGIAN I + BAGIAN II):</strong>
          <strong style="color: #b91c1c; font-size: 11pt;">Rp ${fmt(totals?.total || 0)}</strong>
        </div>
      `;
    }

    const html = `
      <div style="text-align: center; margin-bottom: 12px;">
        <h2 style="font-size: 12.5pt; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          DAFTAR TAGIHAN ${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}
        </h2>
        <div style="font-size: 9.5pt; font-weight: 800; color: #1e40af; margin-top: 2px; text-transform: uppercase;">
          ${titleKategori}
        </div>
        <h3 style="font-size: 10pt; font-weight: 800; margin: 3px 0 0 0; text-transform: uppercase; color: #475569;">
          BULAN ${(labelPeriode || `${monthNames[today.getMonth()]} ${today.getFullYear()}`).toUpperCase()}
        </h3>
      </div>

      ${contentTablesHtml}

      <!-- Tanda Tangan Resmi Simetris & Berimbang -->
      <div style="margin-top: 20px; width: 100%;">
        <table style="width: 100%; border: none; font-size: 9.5pt; line-height: 1.35; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: top; text-align: center; border: none; padding: 0;">
              <div>Mengetahui,</div>
              <div style="font-weight: bold;">Ketua Koperasi</div>
              <div style="height: 60px;"></div>
              <div><strong style="text-decoration: underline; font-size: 10pt;">${settings.ketua || 'Asep Solehudin, S.Pd.'}</strong></div>
            </td>
            <td style="width: 20%; border: none;"></td>
            <td style="width: 40%; vertical-align: top; text-align: center; border: none; padding: 0;">
              <div>${dateLine}</div>
              <div style="font-weight: bold;">Bendahara Koperasi</div>
              <div style="height: 60px;"></div>
              <div><strong style="text-decoration: underline; font-size: 10pt;">${settings.bendahara || 'Ica Cahyani'}</strong></div>
            </td>
          </tr>
        </table>
      </div>
    `;

    openPrintPDF(html, `Daftar_Tagihan_${filenameSuffix}_${labelPeriode || 'Bulan'}`, 'portrait', '8mm 6mm');
  }
};
