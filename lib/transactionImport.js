/**
 * Utility untuk Import Transaksi Simpanan (Pokok, Wajib, Sukarela) dan Unduh Template
 * Template memuat langsung header baku di Baris 1 beserta seluruh No & Nama Anggota aktif.
 * Mendukung format Excel (.xlsx, .xls), HTML/XML Spreadsheet, dan CSV (.csv).
 * Dilengkapi Anti-Duplikasi & Auto-Matching ke Master Anggota Koperasi.
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
 * Baris 1 langsung berisi Header Kolom resmi.
 * Diikuti daftar seluruh anggota aktif yang sudah terdaftar di sistem koperasi.
 */
export function downloadTemplateSimpananMultiExcel(settings = {}, anggotaList = []) {
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

  let rowsHtml = '';
  memberRows.forEach((m, idx) => {
    const noAnggota = m.nomor_anggota || m.id || `ANG-${String(idx + 1).padStart(3, '0')}`;
    const namaAnggota = m.nama_lengkap || m.nama || 'Anggota';
    const sukarelaNom = m.nominal_sukarela || m.nominal_tagihan_sukarela || defaultSukarela;

    rowsHtml += `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center; font-weight:bold; mso-number-format:'\\@';">${noAnggota}</td>
        <td>${namaAnggota}</td>
        <td style="text-align:center; mso-number-format:'yyyy-mm-dd';">${todayStr}</td>
        <td style="text-align:right;">0</td>
        <td style="text-align:right;">${defaultWajib}</td>
        <td style="text-align:right;">${sukarelaNom}</td>
        <td>Setoran Simpanan Rutin</td>
      </tr>`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
    table { border-collapse: collapse; width: 100%; }
    th { background-color: #002045; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #001025; padding: 8px 12px; }
    td { border: 1px solid #cbd5e1; padding: 6px 10px; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Nomor Anggota</th>
        <th>Nama Anggota</th>
        <th>Tanggal Transaksi</th>
        <th>Simpanan Pokok</th>
        <th>Simpanan Wajib</th>
        <th>Simpanan Sukarela</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `Template_Import_Simpanan_${(settings?.namaKoperasi || 'Koperasi_Idaman').replace(/\s+/g, '_')}.xls`);
}

/**
 * Unduh Template CSV (.csv)
 * Format paling aman, universal & instan dibuka rapi di Excel dengan UTF-8 BOM
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
  triggerDownload(blob, `Template_Import_Simpanan_${(settings?.namaKoperasi || 'Koperasi_Idaman').replace(/\s+/g, '_')}.csv`);
}

// ==============================================================================
// 2. PARSER & DECODER FILE MULTI-FORMAT
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

/**
 * Decode buffer ke teks dengan deteksi UTF-8, UTF-16LE, UTF-16BE secara otomatis
 */
function decodeFileBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) return '';

  // UTF-16LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  // UTF-16BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  // Deteksi UTF-16LE tanpa BOM (banyak byte 0x00 bergantian)
  let zeroCount = 0;
  const sampleLen = Math.min(bytes.length, 600);
  for (let i = 0; i < sampleLen; i++) {
    if (bytes[i] === 0) zeroCount++;
  }
  if (zeroCount > sampleLen * 0.25) {
    try {
      const decoded = new TextDecoder('utf-16le').decode(bytes);
      if (decoded.includes('<') || decoded.includes(',') || decoded.includes(';') || decoded.includes('\t')) {
        return decoded;
      }
    } catch (_) {}
  }

  // UTF-8
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Bersihkan MHTML multipart boundary & quoted-printable encoding
 */
function cleanMHTMLAndQuotedPrintable(rawText) {
  let text = rawText || '';

  // Jika file berupa MHTML (MIME multipart Excel)
  if (text.includes('Content-Type: multipart/related') || text.includes('------=_NextPart_')) {
    const parts = text.split(/------=_NextPart_[^\r\n]*/);
    for (const p of parts) {
      const pLower = p.toLowerCase();
      if (pLower.includes('<table') || pLower.includes('<html')) {
        text = p;
        break;
      }
    }
  }

  // Quoted-printable decode (=3D -> =, dsb.)
  if (text.includes('=3D') || text.includes('=\r\n') || text.includes('=\n')) {
    text = text
      .replace(/=\r?\n/g, '')
      .replace(/=3D/gi, '=')
      .replace(/=20/gi, ' ')
      .replace(/=09/gi, '\t')
      .replace(/=22/gi, '"')
      .replace(/=27/gi, "'")
      .replace(/=3C/gi, '<')
      .replace(/=3E/gi, '>')
      .replace(/=2F/gi, '/');
  }

  return text;
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

/**
 * Parser tangguh untuk HTML Table & XML Spreadsheet 2003
 */
export function parseHTMLTable(htmlText) {
  const text = cleanMHTMLAndQuotedPrintable(htmlText);
  const lower = text.toLowerCase();

  // 1. Cek format XML Spreadsheet 2003 (<Workbook ...><Row><Cell><Data ...>)
  if (lower.includes('<workbook') && lower.includes('<row')) {
    const rows = [];
    const rowRegex = /<Row[^>]*>([\s\S]*?)<\/Row>/gi;
    const cellRegex = /<Cell[^>]*>[\s\S]*?<Data[^>]*>([\s\S]*?)<\/Data>[\s\S]*?<\/Cell>/gi;
    let rMatch;
    while ((rMatch = rowRegex.exec(text)) !== null) {
      const rowContent = rMatch[1];
      const cells = [];
      let cMatch;
      while ((cMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
    if (rows.length >= 2) return rows;
  }

  // 2. Cek format HTML Table via DOMParser
  if (lower.includes('<table') || lower.includes('<tr')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const trList = doc.querySelectorAll('tr');
      if (trList && trList.length >= 2) {
        const rows = [];
        trList.forEach((tr) => {
          const cells = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            cells.push((cell.textContent || '').trim());
          });
          if (cells.length > 0 && cells.some((c) => c.length > 0)) {
            rows.push(cells);
          }
        });
        if (rows.length >= 2) return rows;
      }
    } catch (_) {}

    // 3. Fallback: Regex HTML Table Parser
    const rows = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(text)) !== null) {
      const rowContent = trMatch[1];
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        let val = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .trim();
        cells.push(val);
      }
      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
    if (rows.length >= 2) return rows;
  }

  return [];
}

/**
 * Native ZIP Uncompressor untuk file .xlsx (Zero External Dependencies)
 * Bekerja 100% offline di browser modern dengan DecompressionStream('deflate-raw')
 */
async function parseXlsxNative(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const files = {};
  let offset = 0;

  // Baca Local File Headers di ZIP
  while (offset + 30 < arrayBuffer.byteLength) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;

    const compMethod = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const fileName = new TextDecoder('utf-8').decode(nameBytes);
    const dataOffset = offset + 30 + nameLen + extraLen;
    const compData = bytes.subarray(dataOffset, dataOffset + compSize);

    if (compMethod === 0) {
      files[fileName] = new TextDecoder('utf-8').decode(compData);
    } else if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compData);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let pos = 0;
        for (const c of chunks) {
          merged.set(c, pos);
          pos += c.length;
        }
        files[fileName] = new TextDecoder('utf-8').decode(merged);
      } catch (_) {}
    }

    offset = dataOffset + compSize;
  }

  // Temukan file worksheet dan sharedStrings
  const sheetXmlKey = Object.keys(files).find((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'));
  if (!sheetXmlKey || !files[sheetXmlKey]) return null;

  const sharedStringsXml = files['xl/sharedStrings.xml'] || '';
  const sharedStrings = [];
  if (sharedStringsXml) {
    const siRegex = /<si>([\s\S]*?)<\/si>/gi;
    let match;
    while ((match = siRegex.exec(sharedStringsXml)) !== null) {
      const tRegex = /<t[^>]*>([^<]*)<\/t>/gi;
      let tMatch;
      let str = '';
      while ((tMatch = tRegex.exec(match[1])) !== null) {
        str += tMatch[1];
      }
      sharedStrings.push(str || match[1].replace(/<[^>]+>/g, '').trim());
    }
  }

  // Parse sel dari sheet XML
  const sheetXml = files[sheetXmlKey];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/gi;
  const colLetterToIndex = (letters) => {
    let index = 0;
    for (let i = 0; i < letters.length; i++) {
      index = index * 26 + (letters.charCodeAt(i) - 64);
    }
    return index - 1;
  };

  const parsedRows = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<c\s+r="([A-Z]+)(\d+)"(?:\s+[^>]*?t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/gi;
    const rowCells = [];
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetters = cellMatch[1];
      const colIdx = colLetterToIndex(colLetters);
      const cellType = cellMatch[3] || '';
      const cellInner = cellMatch[4] || '';

      let val = '';
      const vMatch = /<v>([^<]*)<\/v>/i.exec(cellInner);
      const tMatch = /<t[^>]*>([^<]*)<\/t>/i.exec(cellInner);

      if (cellType === 's' && vMatch) {
        const sIdx = parseInt(vMatch[1], 10);
        val = sharedStrings[sIdx] || '';
      } else if (vMatch) {
        val = vMatch[1];
      } else if (tMatch) {
        val = tMatch[1];
      }

      while (rowCells.length < colIdx) {
        rowCells.push('');
      }
      rowCells[colIdx] = val.trim();
    }

    if (rowCells.length > 0 && rowCells.some((c) => c.length > 0)) {
      parsedRows.push(rowCells);
    }
  }

  return parsedRows.length >= 2 ? parsedRows : null;
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
        const timer = setTimeout(() => reject(new Error('Timeout loading SheetJS')), 4000);
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
  throw new Error('Tidak dapat memuat modul online Excel');
}

/**
 * Pembaca file utama: Menangani .xlsx (native zip), .xls (HTML/MHTML/XML), dan .csv
 */
export async function readFileToRows(file) {
  const fileName = (file.name || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. Cek Signature File ZIP / .xlsx (PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04)
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    try {
      const nativeRows = await parseXlsxNative(buffer);
      if (nativeRows && nativeRows.length >= 2) return nativeRows;
    } catch (e) {
      console.warn('Native XLSX reader note:', e);
    }
  }

  // 2. Decode buffer ke text string dengan deteksi encoding UTF-8 / UTF-16
  const text = decodeFileBuffer(buffer);
  const textLower = text.toLowerCase();

  // 3. Cek format HTML Table atau XML Spreadsheet 2003
  if (
    textLower.includes('<table') ||
    textLower.includes('<tr') ||
    textLower.includes('<workbook') ||
    textLower.includes('xmlns:x=') ||
    textLower.includes('xmlns:o=')
  ) {
    const tableRows = parseHTMLTable(text);
    if (tableRows && tableRows.length >= 2) {
      return tableRows;
    }
  }

  // 4. Cek Format CSV / Delimited
  if (
    fileName.endsWith('.csv') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.tsv') ||
    text.includes(',') ||
    text.includes(';') ||
    text.includes('\t')
  ) {
    const csvRows = parseCSVString(text);
    if (csvRows && csvRows.length >= 2) {
      return csvRows;
    }
  }

  // 5. Cek apakah file adalah BIFF8 Binary (Excel 97-2003 .xls murni, signature D0 CF 11 E0)
  const isBiff8 = bytes.length > 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;

  // 6. Coba fallback ke SheetJS
  try {
    const XLSX = await loadSheetJS();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (data && data.length >= 2) {
      return data;
    }
  } catch (err) {
    if (isBiff8) {
      throw new Error(
        'File terdeteksi berformat Excel 97-2003 biner (.xls). ' +
        'Solusi Mudah: Gunakan Template CSV (.csv) atau simpan file sebagai Excel Workbook (.xlsx), lalu unggah kembali.'
      );
    }
  }

  // 7. Fallback terakhir: Coba parse ulang sebagai CSV
  const lastResort = parseCSVString(text);
  if (lastResort && lastResort.length >= 2) {
    return lastResort;
  }

  throw new Error('File tidak memiliki data baris yang cukup untuk diimpor. Pastikan file memiliki baris judul dan daftar nama anggota.');
}

// ==============================================================================
// 3. IDENTIFIKASI HEADER & PEMETAAN KOLOM
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

    // Abaikan paragraf deskripsi yang terlalu panjang
    if (raw.length > 50) return;

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
  const distinct = new Set([indices.nomor, indices.nama, indices.pokok, indices.wajib, indices.sukarela].filter((i) => i !== -1));
  return hasMember && hasSavings && distinct.size >= 2;
}

// ==============================================================================
// 4. PROSES DAN VALIDASI FILE IMPORT MULTI SIMPANAN
// ==============================================================================

export async function processMultiSimpananImportFile(file, anggotaList = []) {
  const rawRows = await readFileToRows(file);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File tidak memiliki data baris yang cukup untuk diimpor.');
  }

  // Master anggota koperasi untuk auto-matching nama & nomor anggota
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

  // Fallback pemetaan kolom default jika tidak ditemukan teks header eksplisit
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
  let skippedCount = 0;

  dataRows.forEach((row, rowIdx) => {
    if (!row || row.every((c) => String(c).trim() === '')) return;

    const rawNo = colMap.nomor !== -1 ? String(row[colMap.nomor] || '').trim() : '';
    const rawNama = colMap.nama !== -1 ? String(row[colMap.nama] || '').trim() : '';
    const rawTanggal = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    const rawPokok = colMap.pokok !== -1 ? row[colMap.pokok] : 0;
    const rawWajib = colMap.wajib !== -1 ? row[colMap.wajib] : 0;
    const rawSukarela = colMap.sukarela !== -1 ? row[colMap.sukarela] : 0;
    const rawKet = colMap.keterangan !== -1 ? String(row[colMap.keterangan] || '').trim() : '';

    // Abaikan jika ini baris total / subtotal
    const combinedText = (rawNo + ' ' + rawNama).toLowerCase();
    if (combinedText.includes('total') || combinedText.includes('jumlah') || combinedText.includes('grand total')) {
      return;
    }

    const pokok = normalizeNominal(rawPokok);
    const wajib = normalizeNominal(rawWajib);
    const sukarela = normalizeNominal(rawSukarela);
    const totalSetoran = pokok + wajib + sukarela;
    const tanggal = normalizeDate(rawTanggal);

    // Matching anggota ke master data
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

    const nomorAnggota = foundMember ? (foundMember.nomor_anggota || foundMember.id) : (rawNo || `ANG-${String(rowIdx + 1).padStart(3, '0')}`);
    const namaAnggota = foundMember ? (foundMember.nama_lengkap || foundMember.nama) : (rawNama || 'Anggota');

    const errors = [];
    if (!rawNo && !rawNama) {
      errors.push('Identitas anggota kosong');
    }

    // Jika totalSetoran 0, anggota tidak menyetor pada periode ini (bukan error fatal, tetapi dilewati)
    const isSkipped = totalSetoran <= 0 && errors.length === 0;
    const isValid = errors.length === 0 && !isSkipped;

    if (isValid) {
      validCount++;
      totalPokok += pokok;
      totalWajib += wajib;
      totalSukarela += sukarela;
    } else if (isSkipped) {
      skippedCount++;
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
      keterangan: rawKet || 'Setoran Simpanan Rutin',
      isValid,
      isSkipped,
      statusLabel: isValid ? 'Valid' : (isSkipped ? 'Dilewati (Rp 0)' : 'Error'),
      errors
    });
  });

  const grandTotal = totalPokok + totalWajib + totalSukarela;

  return {
    items: parsedItems,
    totalRows: parsedItems.length,
    validCount,
    invalidCount,
    skippedCount,
    totalPokok,
    totalWajib,
    totalSukarela,
    grandTotal
  };
}
