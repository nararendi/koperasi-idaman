/**
 * Utility untuk Import Transaksi Simpanan (Pokok, Wajib, Sukarela) dan Unduh Template
 * Template memuat langsung header baku di Baris 1 beserta seluruh No & Nama Anggota aktif.
 * Mendukung format Excel (.xlsx, .xls) dan CSV (.csv) dengan Anti-Duplikasi & Auto-Matching.
 */

import { formatNominal, formatRupiah } from './formatters';
import { dataService } from './dataService';

// ==============================================================================
// 1. UNDUH TEMPLATE TRANSAKSI SIMPANAN (BARIS 1 = HEADER BAKU)
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
 * Unduh Template Excel (.xls)
 * Baris 1 langsung berisi Header Kolom agar 100% kompatibel dengan parser Excel mana pun.
 * Diikuti daftar seluruh anggota aktif yang sudah terdaftar di sistem koperasi.
 */
export function downloadTemplateSimpananMultiExcel(settings = {}, anggotaList = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultWajib = Number(settings?.simpananWajib) || 100000;
  const defaultSukarela = Number(settings?.simpananSukarela) || 25000;

  // Ambil daftar anggota aktif (jika kosong di props, ambil langsung dari dataService)
  const allMembers = (anggotaList && anggotaList.length > 0) ? anggotaList : dataService.getAnggotaList();
  const activeMembers = (allMembers || []).filter(
    (a) => (a?.status || a?.status_keanggotaan || 'aktif').toLowerCase() === 'aktif'
  );

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
        <td class="center font-mono bold" style="mso-number-format:'\\@';">${noAnggota}</td>
        <td>${namaAnggota}</td>
        <td class="center" style="mso-number-format:'yyyy-mm-dd';">${todayStr}</td>
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
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 9px 12px; font-size: 10.5pt; }
          td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10pt; vertical-align: middle; }
          td.center { text-align: center; }
          td.right { text-align: right; mso-number-format:"\#\,\#\#0"; }
          td.bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th style="width: 140px;">Nomor Anggota</th>
              <th style="width: 260px;">Nama Anggota</th>
              <th style="width: 150px;">Tanggal Transaksi</th>
              <th style="width: 150px;">Simpanan Pokok</th>
              <th style="width: 150px;">Simpanan Wajib</th>
              <th style="width: 150px;">Simpanan Sukarela</th>
              <th style="width: 250px;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `Template_Import_Simpanan_${(settings?.namaKoperasi || 'KOPERASI').replace(/\s+/g, '_')}.xls`);
}

/**
 * Unduh Template CSV (.csv)
 * Baris 1 langsung berisi Header Kolom dengan UTF-8 BOM
 */
export function downloadTemplateSimpananMultiCsv(settings = {}, anggotaList = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultWajib = Number(settings?.simpananWajib) || 100000;
  const defaultSukarela = Number(settings?.simpananSukarela) || 25000;

  const allMembers = (anggotaList && anggotaList.length > 0) ? anggotaList : dataService.getAnggotaList();
  const activeMembers = (allMembers || []).filter(
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
// 2. PARSER FILE & EKSTRAKSI DATA
// ==============================================================================

export function normalizeDate(input) {
  if (!input) {
    return new Date().toISOString().split('T')[0];
  }

  // Jika berupa serial number Excel (contoh: 45594)
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

  // Format Indonesia: DD/MM/YYYY atau DD-MM-YYYY
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
  if (!str) return 0;

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

  let delimiter = ',';
  if (semicolons > commas && semicolons > tabs) delimiter = ';';
  else if (tabs > commas && tabs > semicolons) delimiter = '\t';

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

  const cdnList = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];

  for (const url of cdnList) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        const timer = setTimeout(() => reject(new Error('Timeout loading SheetJS')), 5000);
        script.onload = () => {
          clearTimeout(timer);
          if (window.XLSX) resolve(window.XLSX);
          else reject(new Error('XLSX undefined'));
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Error loading script'));
        };
        document.head.appendChild(script);
      });
      if (window.XLSX) return window.XLSX;
    } catch (_) {}
  }

  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }
  throw new Error('Parser biner Excel tidak dapat dimuat secara online. Silakan simpan file Anda dalam format .csv atau .xls, lalu unggah kembali.');
}

export async function readFileToRows(file) {
  const fileName = (file.name || '').toLowerCase();

  // 1. Format CSV atau Text
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
    const text = await file.text();
    return parseCSVString(text);
  }

  // 2. Format .xls (Bisa berupa HTML Table bawaan export Excel)
  if (fileName.endsWith('.xls')) {
    const text = await file.text();
    if (text.includes('<table') || text.includes('<html') || text.includes('xmlns:x=')) {
      const parsedHtml = parseHTMLTable(text);
      if (parsedHtml.length > 0) return parsedHtml;
    }
  }

  // 3. Format .xlsx atau .xls biner
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
      throw new Error(err.message || 'Gagal membaca file Excel. Pastikan file berformat .csv, .xls, atau .xlsx yang valid.');
    }
  }
}

// ==============================================================================
// 3. IDENTIFIKASI HEADER & VALIDASI ANTI-DOUBLE
// ==============================================================================

function findSimpananHeaderIndices(headerRow = []) {
  const indices = {
    no: -1,
    nomor: -1,
    nama: -1,
    tanggal: -1,
    pokok: -1,
    wajib: -1,
    sukarela: -1,
    keterangan: -1
  };

  headerRow.forEach((col, idx) => {
    const raw = String(col || '').trim();
    const text = raw.toLowerCase();

    // Abaikan paragraf teks panjang (misal teks petunjuk pengisian)
    if (raw.length > 45) return;

    if (text === 'no' || text === 'no.' || text === 'nomor urut') {
      indices.no = idx;
    } else if (indices.nomor === -1 && (
      text.includes('nomor anggota') || text.includes('no anggota') || text.includes('no_anggota') || 
      text.includes('id anggota') || text.includes('no. anggota') || text === 'nomor' || text === 'id_anggota'
    )) {
      indices.nomor = idx;
    } else if (indices.nama === -1 && (
      text.includes('nama anggota') || text.includes('nama lengkap') || text === 'nama' || text.includes('member')
    )) {
      indices.nama = idx;
    } else if (indices.tanggal === -1 && (
      text.includes('tanggal') || text.includes('tgl') || text.includes('date') || text.includes('waktu')
    )) {
      indices.tanggal = idx;
    } else if (indices.pokok === -1 && text.includes('pokok')) {
      indices.pokok = idx;
    } else if (indices.wajib === -1 && text.includes('wajib')) {
      indices.wajib = idx;
    } else if (indices.sukarela === -1 && text.includes('sukarela')) {
      indices.sukarela = idx;
    } else if (indices.keterangan === -1 && (
      text.includes('keterangan') || text.includes('deskripsi') || text.includes('uraian') || text.includes('catatan') || text === 'ket'
    )) {
      indices.keterangan = idx;
    }
  });

  return indices;
}

function isValidHeaderRow(indices) {
  const hasMember = indices.nomor !== -1 || indices.nama !== -1;
  const hasSavings = indices.pokok !== -1 || indices.wajib !== -1 || indices.sukarela !== -1;
  const distinct = new Set([indices.nomor, indices.nama, indices.pokok, indices.wajib, indices.sukarela].filter(i => i !== -1));
  return hasMember && hasSavings && distinct.size >= 2;
}

/**
 * Memproses dan memvalidasi file import simpanan multi-kolom
 */
export async function processMultiSimpananImportFile(file, anggotaList = []) {
  const rawRows = await readFileToRows(file);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File tidak memiliki data baris yang cukup untuk diimpor.');
  }

  // Ambil data master anggota koperasi untuk auto-matching
  const masterMembers = (anggotaList && anggotaList.length > 0) ? anggotaList : dataService.getAnggotaList();
  const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const memberByNo = new Map();
  const memberByName = new Map();

  (masterMembers || []).forEach((m) => {
    const no = cleanStr(m.nomor_anggota || m.id);
    const nama = cleanStr(m.nama_lengkap || m.nama);
    if (no) memberByNo.set(no, m);
    if (nama) memberByName.set(nama, m);
  });

  // Cari baris header
  let headerIndex = -1;
  let colMap = null;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length < 3) continue;
    const map = findSimpananHeaderIndices(row);
    if (isValidHeaderRow(map)) {
      headerIndex = i;
      colMap = map;
      break;
    }
  }

  // Jika tidak ditemukan teks header baku, gunakan mapping default baris 0
  if (headerIndex === -1) {
    headerIndex = 0;
    colMap = {
      no: 0,
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

    // Abaikan jika ini baris subtotal / footer tabel
    const combinedText = (rawNo + ' ' + rawNama).toLowerCase();
    if (combinedText.includes('total') || combinedText.includes('jumlah total') || combinedText.includes('grand total')) {
      return;
    }

    const pokok = normalizeNominal(rawPokok);
    const wajib = normalizeNominal(rawWajib);
    const sukarela = normalizeNominal(rawSukarela);
    const totalSetoran = pokok + wajib + sukarela;
    const tanggal = normalizeDate(rawTanggal);

    // Cari anggota di master data
    const cleanNo = cleanStr(rawNo);
    const cleanNama = cleanStr(rawNama);

    let foundMember = null;
    if (cleanNo && memberByNo.has(cleanNo)) {
      foundMember = memberByNo.get(cleanNo);
    }
    if (!foundMember && cleanNama && memberByName.has(cleanNama)) {
      foundMember = memberByName.get(cleanNama);
    }
    if (!foundMember && cleanNama) {
      foundMember = (masterMembers || []).find((m) => {
        const mName = cleanStr(m.nama_lengkap || m.nama);
        return mName && (mName.includes(cleanNama) || cleanNama.includes(mName));
      });
    }

    // Sesuaikan dengan data resmi dari master data (atau gunakan teks dari template)
    const nomorAnggota = foundMember ? (foundMember.nomor_anggota || foundMember.id) : (rawNo || `ANG-${String(rowIdx + 1).padStart(3, '0')}`);
    const namaAnggota = foundMember ? (foundMember.nama_lengkap || foundMember.nama) : (rawNama || 'Anggota');

    const errors = [];
    if (!rawNo && !rawNama) {
      errors.push('Identitas anggota kosong');
    }

    if (totalSetoran <= 0) {
      errors.push('Total setoran Rp 0 (tidak ada nominal yang diinputkan)');
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
