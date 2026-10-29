/**
 * Utility untuk Import Transaksi Simpanan (Pokok, Wajib, Sukarela) dan Unduh Template
 * Template otomatis memuat seluruh nomor & nama anggota aktif yang terdaftar di koperasi.
 * Mendukung format Excel (.xlsx, .xls) dan CSV (.csv) dengan validasi cerdas & live preview.
 */

import { formatNominal, formatRupiah } from './formatters';

// ==============================================================================
// 1. UNDUH TEMPLATE TRANSAKSI SIMPANAN (POKOK, WAJIB, SUKARELA)
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
 * Unduh Template Transaksi Simpanan (.xls Excel)
 * Otomatis memuat No Anggota & Nama Anggota aktif dari database koperasi.
 * Pengguna hanya perlu mengisi nominal dan tanggal transaksi.
 */
export function downloadTemplateSimpananMultiExcel(settings = {}, anggotaList = []) {
  const namaKoperasi = (settings?.namaKoperasi || 'KOPERASI IDAMAN').toUpperCase();
  const alamat = settings?.alamat || 'Jl. Situtarate - Cibaduyut';
  const telepon = settings?.telepon ? `Telp: ${settings.telepon}` : '';
  const subHeader = [alamat, telepon].filter(Boolean).join(' • ');

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultWajib = Number(settings?.simpananWajib) || 100000;
  const defaultSukarela = Number(settings?.simpananSukarela) || 25000;

  // Filter anggota aktif
  const activeMembers = (anggotaList || []).filter(
    (a) => (a?.status || a?.status_keanggotaan || 'aktif').toLowerCase() === 'aktif'
  );

  // Jika anggota belum ada, berikan sample dummy
  const memberRows = activeMembers.length > 0 ? activeMembers : [
    { nomor_anggota: 'ANG-001', nama_lengkap: 'Asep Solehudin, S.Pd.' },
    { nomor_anggota: 'ANG-002', nama_lengkap: 'Ica Cahyani' },
    { nomor_anggota: 'ANG-003', nama_lengkap: 'Budi Santoso' }
  ];

  let rowsHtml = '';
  memberRows.forEach((m, idx) => {
    const noAnggota = m.nomor_anggota || m.id || `ANG-${String(idx + 1).padStart(3, '0')}`;
    const namaAnggota = m.nama_lengkap || m.nama || 'Anggota';
    const sukarelaNom = m.nominal_sukarela || m.nominal_tagihan_sukarela || defaultSukarela;

    rowsHtml += `
      <tr>
        <td class="center font-mono">${idx + 1}</td>
        <td class="center font-mono bold">${noAnggota}</td>
        <td>${namaAnggota}</td>
        <td class="center">${todayStr}</td>
        <td class="right">0</td>
        <td class="right">${defaultWajib}</td>
        <td class="right">${sukarelaNom}</td>
        <td>Setoran Simpanan Rutin</td>
      </tr>
    `;
  });

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
                <x:Name>Template Simpanan</x:Name>
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
          .kop-doc { font-size: 12pt; font-weight: bold; color: #1e3a8a; text-align: center; padding-top: 6px; }
          .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 9.5pt; padding: 10px; }
          
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 9px 10px; font-size: 10.5pt; }
          th.sub { background-color: #1e3a8a; }
          td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10pt; vertical-align: middle; }
          td.center { text-align: center; }
          td.right { text-align: right; mso-number-format:"\#\,\#\#0"; }
          td.bold { font-weight: bold; }
          .note-title { font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="8" class="kop-title">${namaKoperasi}</td>
          </tr>
          ${subHeader ? `<tr><td colspan="8" class="kop-sub">${subHeader}</td></tr>` : ''}
          <tr>
            <td colspan="8" class="kop-doc">TEMPLATE RESMI IMPORT TRANSAKSI SIMPANAN (POKOK, WAJIB, & SUKARELA)</td>
          </tr>
          <tr><td colspan="8" style="border:none; height: 10px;"></td></tr>
          <tr>
            <td colspan="8" class="info-box">
              <span class="note-title">PETUNJUK PENGISIAN:</span><br/>
              1. <b>Nomor Anggota & Nama Anggota</b> sudah otomatis terisi dari master data anggota aktif koperasi Anda.<br/>
              2. <b>Tanggal Transaksi</b>: Gunakan format TAHUN-BULAN-HARI (contoh: ${todayStr}) atau tanggal standar Excel.<br/>
              3. <b>Simpanan Pokok / Wajib / Sukarela</b>: Isi nominal angka bersih tanpa simbol Rp (contoh: 100000). Isi <b>0</b> jika tidak ada setoran.<br/>
              4. <b>Keterangan</b>: Keterangan tambahan (opsional).<br/>
              5. Setelah selesai diisi, simpan file ini lalu unggah kembali melalui tombol <b>Import Transaksi</b> di Beranda.
            </td>
          </tr>
          <tr><td colspan="8" style="border:none; height: 10px;"></td></tr>
          <tr>
            <th style="width: 50px;">No</th>
            <th style="width: 140px;">Nomor Anggota</th>
            <th style="width: 250px;">Nama Anggota</th>
            <th style="width: 140px;">Tanggal Transaksi</th>
            <th style="width: 150px;">Simpanan Pokok</th>
            <th style="width: 150px;">Simpanan Wajib</th>
            <th style="width: 150px;">Simpanan Sukarela</th>
            <th style="width: 260px;">Keterangan</th>
          </tr>
          ${rowsHtml}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `Template_Import_Simpanan_${namaKoperasi.replace(/\s+/g, '_')}.xls`);
}

/**
 * Unduh Template Transaksi Simpanan (.csv)
 * Memuat kolom No, Nomor Anggota, Nama Anggota, Tanggal Transaksi, Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela, Keterangan
 */
export function downloadTemplateSimpananMultiCsv(settings = {}, anggotaList = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultWajib = Number(settings?.simpananWajib) || 100000;
  const defaultSukarela = Number(settings?.simpananSukarela) || 25000;

  const activeMembers = (anggotaList || []).filter(
    (a) => (a?.status || a?.status_keanggotaan || 'aktif').toLowerCase() === 'aktif'
  );

  const memberRows = activeMembers.length > 0 ? activeMembers : [
    { nomor_anggota: 'ANG-001', nama_lengkap: 'Asep Solehudin, S.Pd.' },
    { nomor_anggota: 'ANG-002', nama_lengkap: 'Ica Cahyani' },
    { nomor_anggota: 'ANG-003', nama_lengkap: 'Budi Santoso' }
  ];

  let csvContent = `\uFEFFNo,Nomor Anggota,Nama Anggota,Tanggal Transaksi,Simpanan Pokok,Simpanan Wajib,Simpanan Sukarela,Keterangan\n`;

  memberRows.forEach((m, idx) => {
    const noAnggota = m.nomor_anggota || m.id || `ANG-${String(idx + 1).padStart(3, '0')}`;
    const namaAnggota = (m.nama_lengkap || m.nama || 'Anggota').replace(/,/g, ' ');
    const sukarelaNom = m.nominal_sukarela || m.nominal_tagihan_sukarela || defaultSukarela;
    csvContent += `${idx + 1},${noAnggota},"${namaAnggota}",${todayStr},0,${defaultWajib},${sukarelaNom},"Setoran Simpanan Rutin"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'Template_Import_Simpanan.csv');
}

// ==============================================================================
// 2. PARSER & NORMALIZER DOKUMEN
// ==============================================================================

export function normalizeDate(input) {
  if (!input) {
    return new Date().toISOString().split('T')[0];
  }

  // Jika berupa serial number Excel
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

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export function normalizeNominal(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);

  let str = String(val).trim();
  str = str.replace(/rp/gi, '').replace(/[^\d,\.\-]/g, '').trim();

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (parts.length === 2 && parts[1].length === 3) {
      str = str.replace(/\./g, '');
    }
  } else if (hasComma && !hasDot) {
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

export function parseCSVString(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

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

export function parseHTMLTable(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];

    const rows = [];
    const trList = table.querySelectorAll('tr');
    trList.forEach((tr) => {
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
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      fallback.async = true;
      fallback.onload = () => resolve(window.XLSX);
      fallback.onerror = () => reject(new Error('Gagal mengunduh parser Excel dari jaringan.'));
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });
}

export async function readFileToRows(file) {
  const fileName = (file.name || '').toLowerCase();

  // CSV atau Text
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
    const text = await file.text();
    return parseCSVString(text);
  }

  // XLS HTML
  if (fileName.endsWith('.xls')) {
    const text = await file.text();
    if (text.includes('<table') || text.includes('<html') || text.includes('xmlns:x="urn:schemas-microsoft-com:office:excel"')) {
      const parsedHtml = parseHTMLTable(text);
      if (parsedHtml.length > 0) return parsedHtml;
    }
  }

  // XLSX / XLS biner via SheetJS
  try {
    const XLSX = await loadSheetJS();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return data;
  } catch (err) {
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
// 3. ENGINE VALIDASI TRANSAKSI SIMPANAN (POKOK, WAJIB, SUKARELA)
// ==============================================================================

/**
 * Memetakan indeks kolom header template simpanan
 */
function findSimpananHeaderIndices(headerRow = []) {
  const indices = {
    nomor: -1,
    nama: -1,
    tanggal: -1,
    pokok: -1,
    wajib: -1,
    sukarela: -1,
    keterangan: -1
  };

  headerRow.forEach((col, idx) => {
    const text = String(col || '').toLowerCase().trim();

    if (indices.nomor === -1 && (text.includes('nomor') || text.includes('no_anggota') || text.includes('id_anggota') || text.includes('no anggota') || text === 'no. anggota')) {
      indices.nomor = idx;
    } else if (indices.nama === -1 && (text.includes('nama') || text.includes('member'))) {
      indices.nama = idx;
    } else if (indices.tanggal === -1 && (text.includes('tanggal') || text.includes('tgl') || text.includes('date'))) {
      indices.tanggal = idx;
    } else if (indices.pokok === -1 && text.includes('pokok')) {
      indices.pokok = idx;
    } else if (indices.wajib === -1 && text.includes('wajib')) {
      indices.wajib = idx;
    } else if (indices.sukarela === -1 && text.includes('sukarela')) {
      indices.sukarela = idx;
    } else if (indices.keterangan === -1 && (text.includes('keterangan') || text.includes('deskripsi') || text.includes('uraian') || text.includes('catatan'))) {
      indices.keterangan = idx;
    }
  });

  return indices;
}

/**
 * Memproses dan memvalidasi file import simpanan multi-kolom
 */
export async function processMultiSimpananImportFile(file, anggotaList = []) {
  const rawRows = await readFileToRows(file);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File tidak memiliki data yang cukup untuk diimpor.');
  }

  // Peta nomor & nama anggota
  const memberMap = new Map();
  (anggotaList || []).forEach((a) => {
    const no = String(a.nomor_anggota || a.id || '').trim().toLowerCase();
    const nama = String(a.nama_lengkap || a.nama || '').trim().toLowerCase();
    if (no) memberMap.set(no, a);
    if (nama) memberMap.set(nama, a);
  });

  // Cari baris header
  let headerIndex = -1;
  let colMap = null;

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    const map = findSimpananHeaderIndices(row);
    // Jika menemukan minimal (nomor atau nama) dan salah satu dari (pokok, wajib, sukarela)
    if ((map.nomor !== -1 || map.nama !== -1) && (map.pokok !== -1 || map.wajib !== -1 || map.sukarela !== -1)) {
      headerIndex = i;
      colMap = map;
      break;
    }
  }

  // Fallback default index
  if (headerIndex === -1) {
    headerIndex = 0;
    colMap = {
      nomor: 1,
      nama: 2,
      tanggal: 3,
      pokok: 4,
      wajib: 5,
      sukarela: 6,
      keterangan: 7
    };
  }

  const dataRows = rawRows.slice(headerIndex + 1);
  const parsedItems = [];

  let totalPokok = 0;
  let totalWajib = 0;
  let totalSukarela = 0;
  let validCount = 0;
  let invalidCount = 0;

  dataRows.forEach((row, rowIdx) => {
    if (!row || row.every((c) => String(c).trim() === '')) return;

    const rawNo = colMap.nomor !== -1 ? String(row[colMap.nomor] || '').trim() : '';
    const rawNama = colMap.nama !== -1 ? String(row[colMap.nama] || '').trim() : '';
    const rawTanggal = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    const rawPokok = colMap.pokok !== -1 ? row[colMap.pokok] : 0;
    const rawWajib = colMap.wajib !== -1 ? row[colMap.wajib] : 0;
    const rawSukarela = colMap.sukarela !== -1 ? row[colMap.sukarela] : 0;
    const rawKet = colMap.keterangan !== -1 ? String(row[colMap.keterangan] || '').trim() : '';

    const pokok = normalizeNominal(rawPokok);
    const wajib = normalizeNominal(rawWajib);
    const sukarela = normalizeNominal(rawSukarela);
    const totalSetoran = pokok + wajib + sukarela;
    const tanggal = normalizeDate(rawTanggal);

    // Cari anggota di database
    let found = null;
    if (rawNo) found = memberMap.get(rawNo.toLowerCase());
    if (!found && rawNama) found = memberMap.get(rawNama.toLowerCase());

    const nomorAnggota = found ? (found.nomor_anggota || found.id) : rawNo;
    const namaAnggota = found ? (found.nama_lengkap || found.nama) : (rawNama || 'Anggota');

    const errors = [];
    if (!nomorAnggota && !namaAnggota) {
      errors.push('Identitas anggota (Nomor atau Nama) kosong');
    } else if (!found && anggotaList.length > 0) {
      errors.push(`Anggota "${rawNama || rawNo}" tidak ditemukan dalam sistem`);
    }

    if (totalSetoran <= 0) {
      errors.push('Total setoran (Pokok + Wajib + Sukarela) adalah Rp 0');
    }

    const isValid = errors.length === 0;

    if (isValid) {
      validCount++;
      totalPokok += pokok;
      totalWajib += wajib;
      totalSukarela += sukarela;
    } else {
      invalidCount++;
    }

    parsedItems.push({
      rowNumber: rowIdx + 1,
      nomor_anggota: nomorAnggota,
      nama_anggota: namaAnggota,
      tanggal,
      pokok,
      wajib,
      sukarela,
      totalSetoran,
      keterangan: rawKet || 'Setoran Simpanan Bulanan',
      isValid,
      errors
    });
  });

  const grandTotal = totalPokok + totalWajib + totalSukarela;

  return {
    items: parsedItems,
    totalRows: parsedItems.length,
    validCount,
    invalidCount,
    totalPokok,
    totalWajib,
    totalSukarela,
    grandTotal
  };
}
