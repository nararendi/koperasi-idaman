/**
 * Utility untuk Ekspor Dokumen Microsoft Excel (.xls) dengan Styling Profesional,
 * Border Rapi, Header Berwarna, Format Angka, dan Kop Surat Lembaga Koperasi.
 */

function downloadExcel(htmlContent, fileName) {
  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
          .kop-title { font-size: 16pt; font-weight: bold; color: #002045; text-align: center; }
          .kop-sub { font-size: 10pt; color: #64748b; text-align: center; }
          .kop-doc { font-size: 12pt; font-weight: bold; color: #1e3a8a; text-align: center; }
          .periode-box { font-size: 10pt; font-weight: bold; background-color: #f1f5f9; text-align: center; padding: 6px; }
          
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 8px 10px; font-size: 10.5pt; }
          th.sub-header { background-color: #1e3a8a; color: #ffffff; border: 1px solid #1e293b; }
          th.emerald-header { background-color: #047857; color: #ffffff; border: 1px solid #064e3b; }
          th.purple-header { background-color: #6b21a8; color: #ffffff; border: 1px solid #4c1d95; }
          
          td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; vertical-align: middle; }
          td.center { text-align: center; }
          td.right { text-align: right; mso-number-format:"\#\,\#\#0"; }
          td.bold { font-weight: bold; }
          td.bg-section { background-color: #f8fafc; font-weight: bold; color: #334155; }
          td.bg-total { background-color: #e2e8f0; font-weight: bold; color: #0f172a; border-top: 2px solid #64748b; border-bottom: 2px solid #64748b; }
          td.bg-success { background-color: #ecfdf5; font-weight: bold; color: #065f46; }
          td.bg-danger { background-color: #fff1f2; font-weight: bold; color: #9f1239; }
          
          .ttd-table { margin-top: 30px; width: 100%; border: none; }
          .ttd-table td { border: none; text-align: center; font-size: 10pt; padding: 5px; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { formatNominal } from './formatters';

const fmt = (num) => formatNominal(num);

function buildSubHeader(settings) {
  const parts = [];
  if (settings?.alamat) parts.push(settings.alamat);
  if (settings?.telepon) parts.push(`Telp: ${settings.telepon}`);
  return parts.join(' • ');
}

export const excelExport = {
  // 1. Ekspor Laporan Keuangan Lengkap (Arus Kas, Neraca & Simulasi SHU)
  exportLaporanKeuangan(laporan, settings, labelPeriode) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeader = buildSubHeader(settings);

    const content = `
      <table>
        <tr>
          <td colspan="5" class="kop-title">${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        ${subHeader ? `<tr><td colspan="5" class="kop-sub">${subHeader}</td></tr>` : ''}
        <tr>
          <td colspan="5" class="kop-doc" style="padding-top: 10px;">LAPORAN KEUANGAN & PERKEMBANGAN USAHA</td>
        </tr>
        <tr>
          <td colspan="5" class="periode-box">Periode Laporan: ${labelPeriode}</td>
        </tr>
      </table>

      <br/>
      <!-- BAGIAN 1: ARUS KAS -->
      <table>
        <thead>
          <tr>
            <th colspan="5" class="emerald-header">I. LAPORAN ARUS KAS (CASHFLOW)</th>
          </tr>
          <tr>
            <th style="width: 40px;">No</th>
            <th colspan="3">Uraian / Keterangan Transaksi</th>
            <th style="width: 200px;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="bg-section center">A</td>
            <td colspan="3" class="bg-section">ARUS KAS MASUK (PENERIMAAN)</td>
            <td class="bg-section"></td>
          </tr>
          <tr>
            <td class="center">1</td>
            <td colspan="3">Penerimaan Setoran Simpanan (Pokok, Wajib & Sukarela)</td>
            <td class="right">${fmt(laporan.arusKas.totalSimpananMasuk)}</td>
          </tr>
          <tr>
            <td class="center">2</td>
            <td colspan="3">Penerimaan Angsuran Pinjaman Anggota</td>
            <td class="right">${fmt(laporan.arusKas.totalAngsuranMasuk)}</td>
          </tr>
          ${(laporan.arusKas.totalPenjualanSembako || 0) > 0 ? `
          <tr>
            <td class="center">3</td>
            <td colspan="3">Penerimaan Omzet Toko Sembako</td>
            <td class="right">${fmt(laporan.arusKas.totalPenjualanSembako)}</td>
          </tr>` : ''}
          ${(laporan.arusKas.totalSetoranQurban || 0) > 0 ? `
          <tr>
            <td class="center">4</td>
            <td colspan="3">Penerimaan Titipan Tabungan Qurban</td>
            <td class="right">${fmt(laporan.arusKas.totalSetoranQurban)}</td>
          </tr>` : ''}
          <tr>
            <td class="center">${(laporan.arusKas.totalPenjualanSembako || 0) > 0 || (laporan.arusKas.totalSetoranQurban || 0) > 0 ? '5' : '3'}</td>
            <td colspan="3">Pendapatan Administrasi & Lain-Lain</td>
            <td class="right">${fmt(laporan.arusKas.totalPendapatanLain)}</td>
          </tr>
          <tr>
            <td colspan="4" class="bg-success bold">TOTAL KAS MASUK</td>
            <td class="bg-success right">Rp ${fmt(laporan.arusKas.totalPemasukan)}</td>
          </tr>

          <tr>
            <td class="bg-section center">B</td>
            <td colspan="3" class="bg-section">ARUS KAS KELUAR (PENGELUARAN)</td>
            <td class="bg-section"></td>
          </tr>
          <tr>
            <td class="center">1</td>
            <td colspan="3">Penyaluran Pinjaman / Kredit Baru ke Anggota</td>
            <td class="right">${fmt(laporan.arusKas.totalPenyaluranPinjaman)}</td>
          </tr>
          <tr>
            <td class="center">2</td>
            <td colspan="3">Penarikan Simpanan Sukarela Anggota</td>
            <td class="right">${fmt(laporan.arusKas.totalPenarikanSimpanan)}</td>
          </tr>
          ${(laporan.arusKas.totalKulakanSembako || 0) > 0 ? `
          <tr>
            <td class="center">3</td>
            <td colspan="3">Pembelian / Kulakan Stok Toko Sembako</td>
            <td class="right">${fmt(laporan.arusKas.totalKulakanSembako)}</td>
          </tr>` : ''}
          ${(laporan.arusKas.totalPenyaluranQurban || 0) > 0 ? `
          <tr>
            <td class="center">4</td>
            <td colspan="3">Penyaluran / Pembelian Hewan Qurban</td>
            <td class="right">${fmt(laporan.arusKas.totalPenyaluranQurban)}</td>
          </tr>` : ''}
          <tr>
            <td class="center">${(laporan.arusKas.totalKulakanSembako || 0) > 0 || (laporan.arusKas.totalPenyaluranQurban || 0) > 0 ? '5' : '3'}</td>
            <td colspan="3">Biaya Operasional, Kantor & Konsumsi</td>
            <td class="right">${fmt(laporan.arusKas.totalBiayaOperasional)}</td>
          </tr>
          <tr>
            <td colspan="4" class="bg-danger bold">TOTAL KAS KELUAR</td>
            <td class="bg-danger right">Rp ${fmt(laporan.arusKas.totalPengeluaran)}</td>
          </tr>

          <tr>
            <td colspan="4" class="bg-total bold">SALDO KAS BERSIH PERIODE INI</td>
            <td class="bg-total right">Rp ${fmt(laporan.arusKas.saldoKasBersih)}</td>
          </tr>
        </tbody>
      </table>

      <br/>
      <!-- BAGIAN 2: NERACA KEUANGAN -->
      <table>
        <thead>
          <tr>
            <th colspan="5" class="sub-header">II. NERACA KEUANGAN KOPERASI (POSISI KEUANGAN)</th>
          </tr>
          <tr>
            <th colspan="2" style="width: 50%;">ASET / AKTIVA</th>
            <th colspan="3" style="width: 50%;">KEWAJIBAN & EKUITAS / PASIVA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kas Likuid Koperasi</td>
            <td class="right">Rp ${fmt(laporan.neraca.kas)}</td>
            <td colspan="2">Dana Titipan Tabungan Qurban</td>
            <td class="right">Rp ${fmt(laporan.neraca.danaTitipanQurban || 0)}</td>
          </tr>
          <tr>
            <td>Piutang Pinjaman Anggota</td>
            <td class="right">Rp ${fmt(laporan.neraca.piutangPinjaman)}</td>
            <td colspan="2">Simpanan Sukarela Anggota</td>
            <td class="right">Rp ${fmt(laporan.neraca.simpananSukarela)}</td>
          </tr>
          <tr>
            <td>Persediaan Barang Toko Sembako</td>
            <td class="right">Rp ${fmt(laporan.neraca.persediaanSembako || 0)}</td>
            <td colspan="2">Simpanan Pokok Anggota</td>
            <td class="right">Rp ${fmt(laporan.neraca.simpananPokok)}</td>
          </tr>
          <tr>
            <td>-</td>
            <td class="right">-</td>
            <td colspan="2">Simpanan Wajib Anggota</td>
            <td class="right">Rp ${fmt(laporan.neraca.simpananWajib)}</td>
          </tr>
          <tr>
            <td>-</td>
            <td class="right">-</td>
            <td colspan="2">Cadangan Modal & Laba Ditahan</td>
            <td class="right">Rp ${fmt(laporan.neraca.cadanganModal || 0)}</td>
          </tr>
          <tr>
            <td class="bg-total bold">TOTAL ASET KOPERASI</td>
            <td class="bg-total right">Rp ${fmt(laporan.neraca.totalAset)}</td>
            <td colspan="2" class="bg-total bold">TOTAL PASIVA & EKUITAS</td>
            <td class="bg-total right">Rp ${fmt(laporan.neraca.totalKewajibanModal || laporan.neraca.totalAset)}</td>
          </tr>
        </tbody>
      </table>

      <br/>
      <!-- BAGIAN 3: SIMULASI ALOKASI SHU -->
      <table>
        <thead>
          <tr>
            <th colspan="5" class="purple-header">III. ESTIMASI SISA HASIL USAHA (SHU) & ALOKASI RAT</th>
          </tr>
          <tr>
            <th style="width: 40px;">No</th>
            <th colspan="3">Komponen Perhitungan SHU</th>
            <th style="width: 200px;">Nilai (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td colspan="3">Pendapatan Jasa Bunga Pinjaman Anggota</td>
            <td class="right">${fmt(laporan.shu.pendapatanBunga)}</td>
          </tr>
          ${(laporan.shu.labaSembako || 0) > 0 ? `
          <tr>
            <td class="center">2</td>
            <td colspan="3">Laba Margin Usaha Toko Sembako</td>
            <td class="right">${fmt(laporan.shu.labaSembako)}</td>
          </tr>` : ''}
          <tr>
            <td class="center">${(laporan.shu.labaSembako || 0) > 0 ? '3' : '2'}</td>
            <td colspan="3">Pendapatan Administrasi & Operasional Lain</td>
            <td class="right">${fmt(laporan.shu.pendapatanLain)}</td>
          </tr>
          <tr>
            <td class="center">${(laporan.shu.labaSembako || 0) > 0 ? '4' : '3'}</td>
            <td colspan="3">Beban Biaya Operasional Koperasi</td>
            <td class="right">-${fmt(laporan.shu.biayaOperasional)}</td>
          </tr>
          <tr>
            <td colspan="4" class="bg-total bold">ESTIMASI SHU BERSIH KOPERASI</td>
            <td class="bg-total right">Rp ${fmt(laporan.shu.shuBersih)}</td>
          </tr>

          <tr>
            <td colspan="5" class="bg-section bold">Rencana Alokasi Pembagian Sesuai Anggaran Dasar:</td>
          </tr>
          <tr>
            <td class="center">&bull;</td>
            <td colspan="3">Alokasi Jasa Anggota (${settings.shuPersenAnggota || 40}%)</td>
            <td class="right">Rp ${fmt(laporan.shu.alokasi.anggota)}</td>
          </tr>
          <tr>
            <td class="center">&bull;</td>
            <td colspan="3">Alokasi Jasa Modal / Simpanan (${settings.shuPersenModal || 30}%)</td>
            <td class="right">Rp ${fmt(laporan.shu.alokasi.modal)}</td>
          </tr>
          <tr>
            <td class="center">&bull;</td>
            <td colspan="3">Alokasi Pengurus & Pengawas (${settings.shuPersenPengurus || 20}%)</td>
            <td class="right">Rp ${fmt(laporan.shu.alokasi.pengurus)}</td>
          </tr>
          <tr>
            <td class="center">&bull;</td>
            <td colspan="3">Alokasi Dana Cadangan Koperasi (${settings.shuPersenCadangan || 10}%)</td>
            <td class="right">Rp ${fmt(laporan.shu.alokasi.cadangan)}</td>
          </tr>
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <table class="ttd-table">
        <tr>
          <td colspan="2" style="width: 50%;"></td>
          <td colspan="3" style="width: 50%;">Dicetak pada: ${todayStr}</td>
        </tr>
        <tr>
          <td colspan="2">Mengetahui,<br/><strong>Ketua Pengurus</strong></td>
          <td colspan="3">Disusun Oleh,<br/><strong>Bendahara</strong></td>
        </tr>
        <tr>
          <td colspan="2" style="height: 60px;"></td>
          <td colspan="3" style="height: 60px;"></td>
        </tr>
        <tr>
          <td colspan="2"><u>${settings.ketua || '-'}</u></td>
          <td colspan="3"><u>${settings.bendahara || '-'}</u></td>
        </tr>
      </table>
    `;

    downloadExcel(content, `Laporan_Keuangan_Koperasi_${new Date().toISOString().split('T')[0]}`);
  },

  // 2. Ekspor Buku Kas Harian
  exportBukuKas(kasList, summary, settings) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeader = buildSubHeader(settings);

    const rowsHtml = (kasList || []).map((tx, idx) => {
      const isPenerimaan = tx.jenis === 'Penerimaan';
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="center">${tx.tanggal}</td>
          <td class="center font-mono"><strong>${tx.id}</strong></td>
          <td class="center ${isPenerimaan ? 'bg-success' : 'bg-danger'}">${tx.jenis}</td>
          <td>${tx.kategori}</td>
          <td>${tx.keterangan || '-'}</td>
          <td class="right ${isPenerimaan ? 'bold' : ''}">${isPenerimaan ? fmt(tx.jumlah) : '-'}</td>
          <td class="right ${!isPenerimaan ? 'bold' : ''}">${!isPenerimaan ? fmt(tx.jumlah) : '-'}</td>
        </tr>
      `;
    }).join('');

    const content = `
      <table>
        <tr>
          <td colspan="8" class="kop-title">${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        ${subHeader ? `<tr><td colspan="8" class="kop-sub">${subHeader}</td></tr>` : ''}
        <tr>
          <td colspan="8" class="kop-doc" style="padding-top: 10px;">BUKU KAS HARIAN & MUTASI KEUANGAN</td>
        </tr>
        <tr>
          <td colspan="8" class="periode-box">Tanggal Ekspor: ${todayStr}</td>
        </tr>
      </table>

      <br/>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 100px;">Tanggal</th>
            <th style="width: 110px;">Kode Kas</th>
            <th style="width: 110px;">Jenis</th>
            <th style="width: 150px;">Kategori</th>
            <th>Keterangan Transaksi</th>
            <th style="width: 140px;">Masuk / Debit (Rp)</th>
            <th style="width: 140px;">Keluar / Kredit (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="8" class="center">Belum ada data transaksi kas.</td></tr>'}
          <tr>
            <td colspan="6" class="bg-total bold">TOTAL PENERIMAAN & PENGELUARAN</td>
            <td class="bg-total right">Rp ${fmt(summary.masuk)}</td>
            <td class="bg-total right">Rp ${fmt(summary.keluar)}</td>
          </tr>
          <tr>
            <td colspan="6" class="bg-success bold">SALDO AKHIR KAS BERSIH</td>
            <td colspan="2" class="bg-success right" style="font-size: 11pt;">Rp ${fmt(summary.saldo)}</td>
          </tr>
        </tbody>
      </table>

      <table class="ttd-table">
        <tr>
          <td colspan="4" style="width: 50%;"></td>
          <td colspan="4" style="width: 50%;">Dicetak pada: ${todayStr}</td>
        </tr>
        <tr>
          <td colspan="4">Mengetahui,<br/><strong>Ketua Pengurus</strong></td>
          <td colspan="4">Penanggung Jawab Kas,<br/><strong>Bendahara</strong></td>
        </tr>
        <tr>
          <td colspan="4" style="height: 60px;"></td>
          <td colspan="4" style="height: 60px;"></td>
        </tr>
        <tr>
          <td colspan="4"><u>${settings.ketua || '-'}</u></td>
          <td colspan="4"><u>${settings.bendahara || '-'}</u></td>
        </tr>
      </table>
    `;

    downloadExcel(content, `Buku_Kas_Koperasi_${new Date().toISOString().split('T')[0]}`);
  },

  // 3. Ekspor Data Anggota
  exportAnggota(anggotaList, settings) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeader = buildSubHeader(settings);

    const rowsHtml = (anggotaList || []).filter(Boolean).map((a, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center font-mono"><strong>${a?.nomor_anggota || a?.id || '-'}</strong></td>
        <td class="bold">${a?.nama_lengkap || a?.nama || '-'}</td>
        <td>${a?.nomor_hp || '-'}</td>
        <td>${a?.pekerjaan || '-'}</td>
        <td>${a?.tempat_lahir || '-'}, ${a?.tanggal_lahir || '-'}</td>
        <td>${a?.alamat_lengkap || a?.alamat || '-'}</td>
        <td class="center">${a?.tanggal_daftar || '-'}</td>
        <td class="center ${a?.status_keanggotaan === 'Aktif' || a?.status === 'Aktif' ? 'bg-success' : 'bg-danger'}">
          ${a?.status_keanggotaan || a?.status || 'Aktif'}
        </td>
      </tr>
    `).join('');

    const content = `
      <table>
        <tr>
          <td colspan="9" class="kop-title">${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        ${subHeader ? `<tr><td colspan="9" class="kop-sub">${subHeader}</td></tr>` : ''}
        <tr>
          <td colspan="9" class="kop-doc" style="padding-top: 10px;">DAFTAR BUKU ANGGOTA KOPERASI</td>
        </tr>
        <tr>
          <td colspan="9" class="periode-box">Tanggal Unduh: ${todayStr} &bull; Total: ${anggotaList.length} Anggota</td>
        </tr>
      </table>

      <br/>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 120px;">No. Anggota</th>
            <th style="width: 200px;">Nama Lengkap</th>
            <th style="width: 120px;">No. Handphone</th>
            <th style="width: 130px;">Pekerjaan</th>
            <th style="width: 180px;">Tempat, Tgl Lahir</th>
            <th>Alamat Lengkap</th>
            <th style="width: 100px;">Tgl Daftar</th>
            <th style="width: 90px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9" class="center">Belum ada data anggota.</td></tr>'}
        </tbody>
      </table>
    `;

    downloadExcel(content, `Daftar_Anggota_Koperasi_${new Date().toISOString().split('T')[0]}`);
  },

  // 4. Ekspor Data Simpanan
  exportSimpanan(simpananList, summary, settings) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeader = buildSubHeader(settings);

    const rowsHtml = (simpananList || []).map((s, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center font-mono"><strong>${s.id}</strong></td>
        <td class="center">${s.tanggal}</td>
        <td class="center font-mono">${s.nomor_anggota}</td>
        <td class="bold">${s.nama_anggota}</td>
        <td class="center">${s.jenis}</td>
        <td class="center ${s.tipe === 'Penarikan' ? 'bg-danger' : 'bg-success'}">${s.tipe || 'Setoran'}</td>
        <td class="right bold">${fmt(s.jumlah)}</td>
        <td class="center">${s.metode || 'Tunai'}</td>
        <td>${s.keterangan || '-'}</td>
      </tr>
    `).join('');

    const content = `
      <table>
        <tr>
          <td colspan="10" class="kop-title">${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        ${subHeader ? `<tr><td colspan="10" class="kop-sub">${subHeader}</td></tr>` : ''}
        <tr>
          <td colspan="10" class="kop-doc" style="padding-top: 10px;">BUKU REKAPITULASI TRANSAKSI SIMPANAN</td>
        </tr>
        <tr>
          <td colspan="10" class="periode-box">Tanggal Unduh: ${todayStr}</td>
        </tr>
      </table>

      <br/>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 110px;">Kode Transaksi</th>
            <th style="width: 95px;">Tanggal</th>
            <th style="width: 110px;">No. Anggota</th>
            <th style="width: 180px;">Nama Anggota</th>
            <th style="width: 100px;">Jenis</th>
            <th style="width: 95px;">Tipe</th>
            <th style="width: 130px;">Jumlah (Rp)</th>
            <th style="width: 90px;">Metode</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" class="center">Belum ada transaksi simpanan.</td></tr>'}
          <tr>
            <td colspan="7" class="bg-total bold">TOTAL SIMPANAN POKOK</td>
            <td colspan="3" class="bg-total right">Rp ${fmt(summary.pokok)}</td>
          </tr>
          <tr>
            <td colspan="7" class="bg-total bold">TOTAL SIMPANAN WAJIB</td>
            <td colspan="3" class="bg-total right">Rp ${fmt(summary.wajib)}</td>
          </tr>
          <tr>
            <td colspan="7" class="bg-total bold">TOTAL SIMPANAN SUKARELA</td>
            <td colspan="3" class="bg-total right">Rp ${fmt(summary.sukarela)}</td>
          </tr>
          <tr>
            <td colspan="7" class="bg-success bold" style="font-size: 11pt;">TOTAL SELURUH DANA SIMPANAN</td>
            <td colspan="3" class="bg-success right" style="font-size: 11pt;">Rp ${fmt(summary.total)}</td>
          </tr>
        </tbody>
      </table>
    `;

    downloadExcel(content, `Buku_Simpanan_Koperasi_${new Date().toISOString().split('T')[0]}`);
  },

  // 5. Ekspor Data Pinjaman
  exportPinjaman(pinjamanList, summary, settings) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subHeader = buildSubHeader(settings);

    const rowsHtml = (pinjamanList || []).filter(Boolean).map((p, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center font-mono"><strong>${p?.nomor_pinjaman || p?.id || '-'}</strong></td>
        <td class="center">${p?.tanggal || '-'}</td>
        <td class="bold">${p?.nama || '-'}</td>
        <td class="right">${fmt(p?.jumlah || 0)}</td>
        <td class="center">${p?.tenor || 1} Bln (${p?.bunga || 0}%)</td>
        <td class="right bold">${fmt(p?.total_angsuran_bulanan || 0)}</td>
        <td class="right">${fmt(p?.total_pinjaman || 0)}</td>
        <td class="right">${fmt(p?.total_terbayar || 0)}</td>
        <td class="right bold ${(p?.sisa_hutang || 0) > 0 ? 'bg-danger' : 'bg-success'}">${fmt(p?.sisa_hutang || 0)}</td>
        <td class="center bold">${p?.status || 'Selesai'}</td>
      </tr>
    `).join('');

    const content = `
      <table>
        <tr>
          <td colspan="11" class="kop-title">${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        ${subHeader ? `<tr><td colspan="11" class="kop-sub">${subHeader}</td></tr>` : ''}
        <tr>
          <td colspan="11" class="kop-doc" style="padding-top: 10px;">BUKU REKAPITULASI PINJAMAN & KREDIT ANGGOTA</td>
        </tr>
        <tr>
          <td colspan="11" class="periode-box">Tanggal Unduh: ${todayStr}</td>
        </tr>
      </table>

      <br/>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 120px;">No. Pinjaman</th>
            <th style="width: 95px;">Tgl Ajukan</th>
            <th style="width: 180px;">Nama Peminjam</th>
            <th style="width: 120px;">Pokok Pinjaman</th>
            <th style="width: 95px;">Tenor/Bunga</th>
            <th style="width: 120px;">Angsuran/Bln</th>
            <th style="width: 120px;">Total Pinjaman</th>
            <th style="width: 120px;">Total Terbayar</th>
            <th style="width: 120px;">Sisa Piutang</th>
            <th style="width: 95px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="11" class="center">Belum ada data pinjaman.</td></tr>'}
          <tr>
            <td colspan="9" class="bg-total bold">TOTAL PINJAMAN AKTIF BERJALAN</td>
            <td colspan="2" class="bg-total right">Rp ${fmt(summary.berjalan)}</td>
          </tr>
          <tr>
            <td colspan="9" class="bg-danger bold">TOTAL SISA PIUTANG ANGGOTA</td>
            <td colspan="2" class="bg-danger right" style="font-size: 11pt;">Rp ${fmt(summary.sisaHutang)}</td>
          </tr>
        </tbody>
      </table>
    `;

    downloadExcel(content, `Buku_Pinjaman_Koperasi_${new Date().toISOString().split('T')[0]}`);
  },

  // 6. Ekspor Daftar Tagihan & Potongan Bulanan Anggota
  exportDaftarTagihanExcel(tagihanData, settings, labelPeriode, kategori = 'internal') {
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

    const renderTableExcel = (subTitle, rows, subTotals) => {
      const rowsHtml = (rows || []).filter(Boolean).map((row, idx) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="center bold">${row?.nomor_anggota || '-'}</td>
          <td>${row?.nama || '-'}</td>
          <td class="right">${(row?.wajib || 0) > 0 ? fmt(row.wajib) : ''}</td>
          <td class="right">${(row?.sukarela || 0) > 0 ? fmt(row.sukarela) : ''}</td>
          <td class="right">${(row?.qurban || 0) > 0 ? fmt(row.qurban) : ''}</td>
          <td class="center bold">${row?.cicilanKe || ''}</td>
          <td class="right">${(row?.pokok || 0) > 0 ? fmt(row.pokok) : ''}</td>
          <td class="right">${(row?.jasa || 0) > 0 ? fmt(row.jasa) : ''}</td>
          <td class="right">${(row?.sembako || 0) > 0 ? fmt(row.sembako) : ''}</td>
          <td class="right bold bg-danger" style="color: #9f1239;">${fmt(row?.jumlah || 0)}</td>
        </tr>
      `).join('');

      return `
        ${subTitle ? `<tr><td colspan="11" style="font-weight: bold; font-size: 11pt; padding-top: 10px; color: #0f172a;">${subTitle} (${rows.length} Orang)</td></tr>` : ''}
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; width: 45px; font-weight: bold;">NO.</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; width: 90px; font-weight: bold;">NO. ANGGOTA</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; width: 220px; font-weight: bold;">NAMA</th>
              <th colspan="3" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; font-weight: bold;">SIMPANAN</th>
              <th colspan="4" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; font-weight: bold;">POTONGAN</th>
              <th rowspan="2" style="background: #e2e8f0; color: #0f172a; border: 1px solid #475569; width: 130px; font-weight: bold;">JUMLAH</th>
            </tr>
            <tr>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 95px; font-weight: bold;">WAJIB</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 95px; font-weight: bold;">SUKARELA</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 95px; font-weight: bold;">QURBAN</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 65px; font-weight: bold;">CICILAN KE</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 100px; font-weight: bold;">POKOK</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 95px; font-weight: bold;">JASA</th>
              <th style="background: #f1f5f9; color: #0f172a; border: 1px solid #475569; width: 100px; font-weight: bold;">SEMBAKO</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="11" class="center">Tidak ada data tagihan</td></tr>'}
            <tr>
              <td colspan="3" class="center bold" style="font-size: 11pt; background: #e2e8f0; border: 1px solid #475569; color: #0f172a;">${subTitle ? `TOTAL ${subTitle}` : 'JUMLAH'}</td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.wajib || 0)}</td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.sukarela || 0)}</td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.qurban || 0)}</td>
              <td class="center bold" style="background: #e2e8f0; border: 1px solid #475569;"></td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.pokok || 0)}</td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.jasa || 0)}</td>
              <td class="right bold" style="background: #e2e8f0; border: 1px solid #475569;">${fmt(subTotals?.sembako || 0)}</td>
              <td class="right bold bg-danger" style="font-size: 11pt; color: #9f1239; border: 1px solid #475569;">${fmt(subTotals?.total || 0)}</td>
            </tr>
          </tbody>
        </table>
      `;
    };

    let tablesHtml = '';
    if (kategori === 'internal') {
      tablesHtml = renderTableExcel('', listInternal, totalsInternal);
    } else if (kategori === 'luar') {
      tablesHtml = renderTableExcel('', listLuarLembaga, totalsLuarLembaga);
    } else {
      tablesHtml = `
        ${renderTableExcel('BAGIAN I: ANGGOTA INTERNAL (LEMBAGA)', listInternal, totalsInternal)}
        <br/>
        ${listLuarLembaga.length > 0 ? renderTableExcel('BAGIAN II: ANGGOTA LUAR LEMBAGA', listLuarLembaga, totalsLuarLembaga) : ''}
        <br/>
        <table>
          <tr>
            <td colspan="10" class="right bold bg-danger" style="font-size: 12pt; color: #9f1239;">GRAND TOTAL KESELURUHAN (BAGIAN I + II):</td>
            <td class="right bold bg-danger" style="font-size: 12pt; color: #9f1239;">Rp ${fmt(totals.total)}</td>
          </tr>
        </table>
      `;
    }

    const content = `
      <table>
        <tr>
          <td colspan="11" class="kop-title" style="font-size: 14pt;">DAFTAR TAGIHAN ${(settings.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase()}</td>
        </tr>
        <tr>
          <td colspan="11" class="kop-doc" style="font-size: 11pt; color: #1e40af; font-weight: bold;">${titleKategori}</td>
        </tr>
        <tr>
          <td colspan="11" class="kop-doc" style="font-size: 11pt;">BULAN ${(labelPeriode || `${monthNames[today.getMonth()]} ${today.getFullYear()}`).toUpperCase()}</td>
        </tr>
      </table>

      <br/>
      ${tablesHtml}

      <br/>
      <table class="ttd-table">
        <tr>
          <td colspan="5" style="width: 50%; text-align: left; padding-left: 20px;">
            <br/>
            Ketua Koperasi
          </td>
          <td colspan="6" style="width: 50%; text-align: left; padding-left: 20px;">
            ${dateLine}<br/>
            Bendahara Koperasi
          </td>
        </tr>
        <tr>
          <td colspan="5" style="height: 50px;"></td>
          <td colspan="6" style="height: 50px;"></td>
        </tr>
        <tr>
          <td colspan="5" style="text-align: left; padding-left: 20px; font-weight: bold; text-decoration: underline;">
            ${settings.ketua || 'Asep Solehudin, S.Pd.'}
          </td>
          <td colspan="6" style="text-align: left; padding-left: 20px; font-weight: bold; text-decoration: underline;">
            ${settings.bendahara || 'Ica Cahyani'}
          </td>
        </tr>
      </table>
    `;

    downloadExcel(content, `Daftar_Tagihan_${filenameSuffix}_${new Date().toISOString().split('T')[0]}`);
  }
};
