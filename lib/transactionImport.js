/**
 * Utility untuk Import Transaksi (Kas & Simpanan) dan Unduh Template
 * Mendukung format Excel (.xlsx, .xls) dan CSV (.csv) dengan validasi cerdas,
 * deteksi header otomatis, pembersihan format mata uang, serta auto-sync.
 */

import { formatNominal, formatRupiah } from './formatters';

// ==============================================================================
// 1. UNDUH TEMPLATE TRANSAKSI (EXCEL & CSV)
// ==============================================================================

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Unduh Template Transaksi Kas dalam format Excel (.xls)
 * Memuat kop resmi koperasi, tabel berformat rapi, petunjuk pengisian, dan contoh data realistis.
 */
export function downloadTemplateKasExcel(settings = {}) {
  const namaKoperasi = (settings?.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase();
  const alamat = settings?.alamat || 'Jl. Situtarate - Cibaduyut';
  const telepon = settings?.telepon ? `Telp: ${settings.telepon}` : '';
  const subHeader = [alamat, telepon].filter(Boolean).join(' • ');

  const html = `
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
                <x:Name>Template Kas</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; }
          .kop-title { font-size: 15pt; font-weight: bold; color: #002045; text-align: center; }
          .kop-sub { font-size: 9.5pt; color: #64748b; text-align: center; }
          .kop-doc { font-size: 12pt; font-weight: bold; color: #1e3a8a; text-align: center; padding-top: 8px; }
          .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 9.5pt; padding: 10px; }
          
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 9px 12px; font-size: 10.5pt; }
          td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10pt; vertical-align: middle; }
          td.center { text-align: center; }
          td.right { text-align: right; mso-number-format:"\#\,\#\#0"; }
          td.bold { font-weight: bold; }
          td.in { background-color: #ecfdf5; color: #065f46; font-weight: bold; text-align: center; }
          td.out { background-color: #fff1f2; color: #9f1239; font-weight: bold; text-align: center; }
          .note-title { font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="5" class="kop-title">${namaKoperasi}</td>
          </tr>
          ${subHeader ? `<tr><td colspan="5" class="kop-sub">${subHeader}</td></tr>` : ''}
          <tr>
            <td colspan="5" class="kop-doc">TEMPLATE RESMI IMPORT TRANSAKSI KAS (BUKU KAS HARIAN)</td>
          </tr>
          <tr><td colspan="5" style="border:none; height: 10px;"></td></tr>
          <tr>
            <td colspan="5" class="info-box">
              <span class="note-title">PETUNJUK PENGISIAN TEMPLATE:</span><br/>
              1. <b>Tanggal</b>: Gunakan format TAHUN-BULAN-HARI (contoh: 2026-10-29) atau format tanggal Excel standar.<br/>
              2. <b>Jenis</b>: Isi dengan <b>Penerimaan</b> (untuk Kas Masuk) atau <b>Pengeluaran</b> (untuk Kas Keluar).<br/>
              3. <b>Kategori</b>: Kategori transaksi (contoh: Operasional, ATK, Listrik, Konsumsi, Pendapatan Kas, Donasi, dll).<br/>
              4. <b>Jumlah</b>: Isi nominal angka murni tanpa simbol Rp (contoh: 500000 atau 1500000).<br/>
              5. <b>Keterangan</b>: Rincian / deskripsi transaksi secara lengkap.<br/>
              6. Anda dapat menghapus baris contoh dan menambahkan baris transaksi baru Anda di bawah header.
            </td>
          </tr>
          <tr><td colspan="5" style="border:none; height: 10px;"></td></tr>
          <tr>
            <th style="width: 130px;">Tanggal</th>
            <th style="width: 140px;">Jenis</th>
            <th style="width: 180px;">Kategori</th>
            <th style="width: 150px;">Jumlah</th>
            <th style="width: 320px;">Keterangan</th>
          </tr>
          <tr>
            <td class="center">2026-10-25</td>
            <td class="in">Penerimaan</td>
            <td>Pendapatan Kas</td>
            <td class="right">500000</td>
            <td>Penerimaan jasa administrasi dan operasional koperasi</td>
          </tr>
          <tr>
            <td class="center">2026-10-26</td>
            <td class="out">Pengeluaran</td>
            <td>Operasional Kantor</td>
            <td class="right">150000</td>
            <td>Pembelian kertas HVS, tinta printer dan ATK kantor</td>
          </tr>
          <tr>
            <td class="center">2026-10-27</td>
            <td class="out">Pengeluaran</td>
            <td>Listrik & Internet</td>
            <td class="right">350000</td>
            <td>Pembayaran tagihan listrik PLN dan WiFi kantor bulan berjalan</td>
          </tr>
          <tr>
            <td class="center">2026-10-28</td>
            <td class="in">Penerimaan</td>
            <td>Lain-lain</td>
            <td class="right">250000</td>
            <td>Sumbangan sukarela dan pendapatan kas non-operasional</td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `Template_Import_Transaksi_Kas_${namaKoperasi.replace(/\s+/g, '_')}.xls`);
}

/**
 * Unduh Template Transaksi Kas dalam format CSV (.csv) dengan UTF-8 BOM
 */
export function downloadTemplateKasCsv() {
  const csvContent = 
    `\uFEFFTanggal,Jenis,Kategori,Jumlah,Keterangan\n` +
    `2026-10-25,Penerimaan,Pendapatan Kas,500000,Penerimaan jasa administrasi dan operasional koperasi\n` +
    `2026-10-26,Pengeluaran,Operasional Kantor,150000,Pembelian kertas HVS dan ATK kantor\n` +
    `2026-10-27,Pengeluaran,Listrik & Internet,350000,Pembayaran tagihan listrik PLN dan WiFi kantor\n` +
    `2026-10-28,Penerimaan,Lain-lain,250000,Sumbangan sukarela dan pendapatan kas`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'Template_Import_Transaksi_Kas.csv');
}

/**
 * Unduh Template Transaksi Simpanan dalam format Excel (.xls)
 */
export function downloadTemplateSimpananExcel(settings = {}, anggotaList = []) {
  const namaKoperasi = (settings?.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase();
  const sampleMember = (anggotaList && anggotaList[0]) || { nomor_anggota: 'ANG-001', nama_lengkap: 'Budi Santoso' };
  const sampleMember2 = (anggotaList && anggotaList[1]) || { nomor_anggota: 'ANG-002', nama_lengkap: 'Siti Aminah' };

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #0f172a; }
          .kop-title { font-size: 15pt; font-weight: bold; color: #002045; text-align: center; }
          .kop-doc { font-size: 12pt; font-weight: bold; color: #1e3a8a; text-align: center; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 9px 12px; }
          td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10pt; }
          td.center { text-align: center; }
          td.right { text-align: right; mso-number-format:"\#\,\#\#0"; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="kop-title">${namaKoperasi}</td></tr>
          <tr><td colspan="7" class="kop-doc">TEMPLATE IMPORT TRANSAKSI SIMPANAN ANGGOTA</td></tr>
          <tr><td colspan="7" style="border:none; height: 10px;"></td></tr>
          <tr>
            <th>Nomor Anggota</th>
            <th>Nama Anggota</th>
            <th>Tanggal</th>
            <th>Jenis Simpanan</th>
            <th>Tipe Transaksi</th>
            <th>Jumlah</th>
            <th>Metode & Keterangan</th>
          </tr>
          <tr>
            <td class="center">${sampleMember.nomor_anggota || 'ANG-001'}</td>
            <td>${sampleMember.nama_lengkap || sampleMember.nama || 'Budi Santoso'}</td>
            <td class="center">2026-10-25</td>
            <td class="center">Wajib</td>
            <td class="center">Setoran</td>
            <td class="right">100000</td>
            <td>Setoran Simpanan Wajib Bulanan</td>
          </tr>
          <tr>
            <td class="center">${sampleMember2.nomor_anggota || 'ANG-002'}</td>
            <td>${sampleMember2.nama_lengkap || sampleMember2.nama || 'Siti Aminah'}</td>
            <td class="center">2026-10-26</td>
            <td class="center">Sukarela</td>
            <td class="center">Setoran</td>
            <td class="right">50000</td>
            <td>Setoran Simpanan Sukarela</td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `Template_Import_Simpanan_${namaKoperasi.replace(/\s+/g, '_')}.xls`);
}

/**
 * Unduh Template Transaksi Simpanan dalam format CSV (.csv)
 */
export function downloadTemplateSimpananCsv(anggotaList = []) {
  const sampleMember = (anggotaList && anggotaList[0]) || { nomor_anggota: 'ANG-001', nama_lengkap: 'Budi Santoso' };
  const sampleMember2 = (anggotaList && anggotaList[1]) || { nomor_anggota: 'ANG-002', nama_lengkap: 'Siti Aminah' };

  const csvContent = 
    `\uFEFFNomor Anggota,Nama Anggota,Tanggal,Jenis Simpanan,Tipe,Jumlah,Keterangan\n` +
    `${sampleMember.nomor_anggota || 'ANG-001'},${sampleMember.nama_lengkap || 'Budi Santoso'},2026-10-25,Wajib,Setoran,100000,Setoran Simpanan Wajib Bulanan\n` +
    `${sampleMember2.nomor_anggota || 'ANG-002'},${sampleMember2.nama_lengkap || 'Siti Aminah'},2026-10-26,Sukarela,Setoran,50000,Setoran Simpanan Sukarela`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'Template_Import_Simpanan.csv');
}

// ==============================================================================
// 2. PARSER & NORMALIZER FILE TRANSAKSI
// ==============================================================================

/**
 * Normalisasi format tanggal input ke string ISO (YYYY-MM-DD)
 */
export function normalizeDate(input) {
  if (!input) {
    return new Date().toISOString().split('T')[0];
  }

  // Jika input adalah nomor serial tanggal Excel (misal: 45594)
  if (typeof input === 'number' || (!isNaN(Number(input)) && Number(input) > 20000 && Number(input) < 70000)) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + Number(input) * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(input).trim();

  // Format ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format Indonesia/Eropa: DD/MM/YYYY atau DD-MM-YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-\.]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // Coba parse dengan Date native
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Pembersih dan normalisasi nominal angka dari berbagai format penulisan
 */
export function normalizeNominal(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);

  let str = String(val).trim();
  // Hilangkan Rp, spasi, simbol mata uang
  str = str.replace(/rp/gi, '').replace(/[^\d,\.\-]/g, '').trim();

  // Cek apakah ada koma dan titik sekaligus (misal: 1.500.000,00 atau 1,500,000.00)
  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Format Indonesia: 1.500.000,50 -> buang titik, ganti koma jadi titik
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US: 1,500,000.50 -> buang koma
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    // Bisa jadi ribuan: 1.500.000 atau desimal 1500.50
    const parts = str.split('.');
    if (parts.length > 2) {
      // Pasti ribuan: 1.500.000
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      // Jika digit setelah titik tepat 3 digit, kemungkinan besar ribuan: 150.000
      if (parts[1].length === 3) {
        str = str.replace(/\./g, '');
      }
    }
  } else if (hasComma && !hasDot) {
    // Format koma ribuan (1,500,000) atau desimal (150,50)
    const parts = str.split(',');
    if (parts.length > 2) {
      str = str.replace(/,/g, '');
    } else if (parts.length === 2) {
      if (parts[1].length === 3) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(',', '.');
      }
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Normalisasi Jenis Transaksi Kas (Penerimaan vs Pengeluaran)
 */
export function normalizeJenisKas(val) {
  if (!val) return 'Pengeluaran';
  const s = String(val).trim().toLowerCase();

  const penerimaanKeys = [
    'penerimaan', 'masuk', 'kas masuk', 'in', 'income',
    'debit', 'd', 'terima', 'setoran', 'cr', 'credit'
  ];

  for (const k of penerimaanKeys) {
    if (s === k || s.startsWith(k)) {
      return 'Penerimaan';
    }
  }

  return 'Pengeluaran';
}

/**
 * Parser teks format CSV & TSV dengan deteksi otomatis pemisah (comma, semicolon, tab)
 */
export function parseCSVString(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Deteksi pemisah terbaik
  const sample = lines[0] + (lines[1] ? '\n' + lines[1] : '');
  const countChar = (char) => (sample.match(new RegExp('\\' + char, 'g')) || []).length;
  const semicolons = countChar(';');
  const commas = countChar(',');
  const tabs = countChar('\t');
  const pipes = countChar('|');

  let delimiter = ',';
  if (semicolons > commas && semicolons > tabs) delimiter = ';';
  else if (tabs > commas && tabs > semicolons) delimiter = '\t';
  else if (pipes > commas && pipes > semicolons) delimiter = '|';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parser file tabel HTML Excel (.xls buatan Microsoft Excel / Koperasi Idaman)
 */
export function parseHTMLTable(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];

    const rows = [];
    const trList = table.querySelectorAll('tr');
    trList.forEach((tr) => {
      // Lewati baris kop / instruksi jika memiliki colspan besar (misal kop surat)
      const firstCell = tr.querySelector('th, td');
      if (firstCell && firstCell.getAttribute('colspan') && Number(firstCell.getAttribute('colspan')) >= 4) {
        return;
      }

      const cells = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        cells.push(cell.textContent.trim());
      });

      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    });

    return rows;
  } catch (e) {
    console.error('Error parsing HTML table:', e);
    return [];
  }
}

/**
 * Pemuat SheetJS dinamis dari CDN jika pengguna mengunggah file biner modern .xlsx
 */
async function loadSheetJS() {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error('SheetJS gagal dimuat'));
    };
    script.onerror = () => {
      // Coba fallback CDN cdnjs
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      fallback.async = true;
      fallback.onload = () => resolve(window.XLSX);
      fallback.onerror = () => reject(new Error('Gagal mengunduh parser Excel .xlsx dari jaringan.'));
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });
}

/**
 * Membaca File dan mengembalikan data mentah dalam bentuk array of rows (2D array)
 */
export async function readFileToRows(file) {
  const fileName = (file.name || '').toLowerCase();

  // 1. Format CSV atau Text
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
    const text = await file.text();
    return parseCSVString(text);
  }

  // 2. Format .xls (Bisa berupa HTML Table buatan export atau Excel lama)
  if (fileName.endsWith('.xls')) {
    const text = await file.text();
    if (text.includes('<table') || text.includes('<html') || text.includes('xmlns:x="urn:schemas-microsoft-com:office:excel"')) {
      const parsedHtml = parseHTMLTable(text);
      if (parsedHtml.length > 0) return parsedHtml;
    }
  }

  // 3. Format .xlsx atau .xls biner via SheetJS
  try {
    const XLSX = await loadSheetJS();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return data;
  } catch (err) {
    // Jika SheetJS gagal atau offline, coba baca sebagai teks barangkali HTML
    try {
      const text = await file.text();
      if (text.includes('<table')) {
        return parseHTMLTable(text);
      }
      return parseCSVString(text);
    } catch (_) {
      throw new Error('Gagal membaca format file. Pastikan file berformat .csv, .xls, atau .xlsx yang valid.');
    }
  }
}

// ==============================================================================
// 3. ENGINE VALIDASI TRANSAKSI KAS
// ==============================================================================

/**
 * Menganalisis dan memetakan header tabel Transaksi Kas
 */
function findKasHeaderIndices(headerRow = []) {
  const indices = {
    tanggal: -1,
    jenis: -1,
    kategori: -1,
    jumlah: -1,
    keterangan: -1,
    debit: -1,
    kredit: -1
  };

  headerRow.forEach((col, idx) => {
    const text = String(col || '').toLowerCase().trim();

    if (indices.tanggal === -1 && (text.includes('tanggal') || text.includes('tgl') || text.includes('date') || text.includes('waktu'))) {
      indices.tanggal = idx;
    } else if (indices.jenis === -1 && (text.includes('jenis') || text.includes('tipe') || text.includes('type') || text.includes('arus'))) {
      indices.jenis = idx;
    } else if (indices.kategori === -1 && (text.includes('kategori') || text.includes('category') || text.includes('pos') || text.includes('akun'))) {
      indices.kategori = idx;
    } else if (text.includes('debit') || text.includes('masuk') || text.includes('penerimaan')) {
      indices.debit = idx;
    } else if (text.includes('kredit') || text.includes('keluar') || text.includes('pengeluaran')) {
      indices.kredit = idx;
    } else if (indices.jumlah === -1 && (text.includes('jumlah') || text.includes('nominal') || text.includes('total') || text.includes('amount') || text.includes('nilai'))) {
      indices.jumlah = idx;
    } else if (indices.keterangan === -1 && (text.includes('keterangan') || text.includes('deskripsi') || text.includes('uraian') || text.includes('rincian') || text.includes('catatan') || text.includes('memo'))) {
      indices.keterangan = idx;
    }
  });

  return indices;
}

/**
 * Memproses dan memvalidasi seluruh baris transaksi kas dari file
 */
export async function processKasImportFile(file) {
  const rawRows = await readFileToRows(file);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File tidak memiliki data yang cukup untuk diimpor.');
  }

  // Cari baris header yang paling sesuai
  let headerIndex = -1;
  let colMap = null;

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    const map = findKasHeaderIndices(row);
    // Header valid jika menemukan minimal jumlah atau (debit/kredit) atau jenis
    if (map.jumlah !== -1 || (map.debit !== -1 && map.kredit !== -1) || (map.tanggal !== -1 && map.jenis !== -1)) {
      headerIndex = i;
      colMap = map;
      break;
    }
  }

  // Jika tidak terdeteksi header teks spesifik, asumsikan baris 0 adalah header standar
  if (headerIndex === -1) {
    headerIndex = 0;
    colMap = {
      tanggal: 0,
      jenis: 1,
      kategori: 2,
      jumlah: 3,
      keterangan: 4,
      debit: -1,
      kredit: -1
    };
  }

  const dataRows = rawRows.slice(headerIndex + 1);
  const parsedItems = [];

  let totalMasuk = 0;
  let totalKeluar = 0;
  let validCount = 0;
  let invalidCount = 0;

  dataRows.forEach((row, rowIdx) => {
    // Lewati baris kosong
    if (!row || row.every((c) => String(c).trim() === '')) return;

    const rawTanggal = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    const rawJenis = colMap.jenis !== -1 ? row[colMap.jenis] : '';
    const rawKategori = colMap.kategori !== -1 ? row[colMap.kategori] : '';
    const rawKeterangan = colMap.keterangan !== -1 ? row[colMap.keterangan] : '';

    let nominal = 0;
    let jenis = 'Pengeluaran';

    // Cek jika menggunakan kolom Debit / Kredit terpisah
    if (colMap.debit !== -1 || colMap.kredit !== -1) {
      const debitVal = colMap.debit !== -1 ? normalizeNominal(row[colMap.debit]) : 0;
      const kreditVal = colMap.kredit !== -1 ? normalizeNominal(row[colMap.kredit]) : 0;

      if (debitVal > 0) {
        nominal = debitVal;
        jenis = 'Penerimaan';
      } else if (kreditVal > 0) {
        nominal = kreditVal;
        jenis = 'Pengeluaran';
      } else if (colMap.jumlah !== -1) {
        nominal = normalizeNominal(row[colMap.jumlah]);
        jenis = normalizeJenisKas(rawJenis);
      }
    } else {
      nominal = colMap.jumlah !== -1 ? normalizeNominal(row[colMap.jumlah]) : 0;
      jenis = normalizeJenisKas(rawJenis);
    }

    const tanggal = normalizeDate(rawTanggal);
    const kategori = (rawKategori && String(rawKategori).trim()) || (jenis === 'Penerimaan' ? 'Pendapatan Kas' : 'Operasional');
    const keterangan = (rawKeterangan && String(rawKeterangan).trim()) || '-';

    // Validasi baris
    const errors = [];
    if (!nominal || nominal <= 0) {
      errors.push('Nominal tidak boleh 0 atau kosong');
    }
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      errors.push('Format tanggal tidak valid');
    }

    const isValid = errors.length === 0;

    if (isValid) {
      validCount++;
      if (jenis === 'Penerimaan') totalMasuk += nominal;
      else totalKeluar += nominal;
    } else {
      invalidCount++;
    }

    parsedItems.push({
      rowNumber: rowIdx + 1,
      tanggal,
      jenis,
      kategori,
      jumlah: nominal,
      keterangan,
      isValid,
      errors
    });
  });

  return {
    items: parsedItems,
    totalRows: parsedItems.length,
    validCount,
    invalidCount,
    totalMasuk,
    totalKeluar,
    saldoBersih: totalMasuk - totalKeluar
  };
}

// ==============================================================================
// 4. ENGINE VALIDASI TRANSAKSI SIMPANAN
// ==============================================================================

export async function processSimpananImportFile(file, anggotaList = []) {
  const rawRows = await readFileToRows(file);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File tidak memiliki data yang cukup untuk diimpor.');
  }

  // Peta nomor & nama anggota untuk lookup cepat
  const memberMap = new Map();
  (anggotaList || []).forEach((a) => {
    const no = String(a.nomor_anggota || a.id || '').trim().toLowerCase();
    const nama = String(a.nama_lengkap || a.nama || '').trim().toLowerCase();
    if (no) memberMap.set(no, a);
    if (nama) memberMap.set(nama, a);
  });

  // Identifikasi header
  let headerIndex = 0;
  const colMap = {
    nomor: -1,
    nama: -1,
    tanggal: -1,
    jenis: -1,
    tipe: -1,
    jumlah: -1,
    metode: -1,
    keterangan: -1
  };

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    row.forEach((col, idx) => {
      const text = String(col || '').toLowerCase().trim();
      if (colMap.nomor === -1 && (text.includes('nomor') || text.includes('no_anggota') || text.includes('id_anggota') || text.includes('no anggota'))) colMap.nomor = idx;
      else if (colMap.nama === -1 && (text.includes('nama') || text.includes('member'))) colMap.nama = idx;
      else if (colMap.tanggal === -1 && (text.includes('tanggal') || text.includes('tgl') || text.includes('date'))) colMap.tanggal = idx;
      else if (colMap.jenis === -1 && (text.includes('jenis') || text.includes('pokok') || text.includes('wajib') || text.includes('sukarela'))) colMap.jenis = idx;
      else if (colMap.tipe === -1 && (text.includes('tipe') || text.includes('setoran') || text.includes('penarikan'))) colMap.tipe = idx;
      else if (colMap.jumlah === -1 && (text.includes('jumlah') || text.includes('nominal') || text.includes('total'))) colMap.jumlah = idx;
      else if (colMap.metode === -1 && (text.includes('metode') || text.includes('tunai') || text.includes('transfer'))) colMap.metode = idx;
      else if (colMap.keterangan === -1 && (text.includes('keterangan') || text.includes('deskripsi') || text.includes('uraian'))) colMap.keterangan = idx;
    });

    if (colMap.jumlah !== -1 && (colMap.nomor !== -1 || colMap.nama !== -1)) {
      headerIndex = i;
      break;
    }
  }

  const dataRows = rawRows.slice(headerIndex + 1);
  const parsedItems = [];
  let validCount = 0;
  let invalidCount = 0;
  let grandTotal = 0;

  dataRows.forEach((row, rowIdx) => {
    if (!row || row.every((c) => String(c).trim() === '')) return;

    const rawNo = colMap.nomor !== -1 ? String(row[colMap.nomor] || '').trim() : '';
    const rawNama = colMap.nama !== -1 ? String(row[colMap.nama] || '').trim() : '';
    const rawTanggal = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    const rawJenis = colMap.jenis !== -1 ? String(row[colMap.jenis] || '').trim() : 'Wajib';
    const rawTipe = colMap.tipe !== -1 ? String(row[colMap.tipe] || '').trim() : 'Setoran';
    const rawNominal = colMap.jumlah !== -1 ? row[colMap.jumlah] : 0;
    const rawMetode = colMap.metode !== -1 ? String(row[colMap.metode] || '').trim() : 'Tunai';
    const rawKet = colMap.keterangan !== -1 ? String(row[colMap.keterangan] || '').trim() : '';

    const nominal = normalizeNominal(rawNominal);
    const tanggal = normalizeDate(rawTanggal);

    // Cari anggota
    let foundAnggota = null;
    if (rawNo) foundAnggota = memberMap.get(rawNo.toLowerCase());
    if (!foundAnggota && rawNama) foundAnggota = memberMap.get(rawNama.toLowerCase());

    const nomorAnggota = foundAnggota ? (foundAnggota.nomor_anggota || foundAnggota.id) : rawNo;
    const namaAnggota = foundAnggota ? (foundAnggota.nama_lengkap || foundAnggota.nama) : (rawNama || 'Anggota');

    // Normalisasi jenis simpanan
    let jenis = 'Sukarela';
    const jLow = rawJenis.toLowerCase();
    if (jLow.includes('pokok')) jenis = 'Pokok';
    else if (jLow.includes('wajib')) jenis = 'Wajib';
    else if (jLow.includes('sukarela')) jenis = 'Sukarela';

    // Normalisasi tipe transaksi
    let tipe = 'Setoran';
    const tLow = rawTipe.toLowerCase();
    if (tLow.includes('tarik') || tLow.includes('penarikan') || tLow.includes('keluar')) {
      tipe = 'Penarikan';
    }

    const errors = [];
    if (!nomorAnggota) {
      errors.push('Nomor / Nama Anggota tidak ditemukan di master data');
    }
    if (nominal <= 0) {
      errors.push('Nominal transaksi harus lebih dari 0');
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
      grandTotal += (tipe === 'Setoran' ? nominal : -nominal);
    } else {
      invalidCount++;
    }

    parsedItems.push({
      rowNumber: rowIdx + 1,
      nomor_anggota: nomorAnggota,
      nama_anggota: namaAnggota,
      tanggal,
      jenis,
      tipe,
      jumlah: nominal,
      metode: rawMetode || 'Tunai',
      keterangan: rawKet || `${tipe} Simpanan ${jenis}`,
      isValid,
      errors
    });
  });

  return {
    items: parsedItems,
    totalRows: parsedItems.length,
    validCount,
    invalidCount,
    grandTotal
  };
}
