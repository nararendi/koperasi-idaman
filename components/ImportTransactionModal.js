'use client';

import { useState, useRef } from 'react';
import {
  downloadTemplateKasExcel,
  downloadTemplateKasCsv,
  downloadTemplateSimpananExcel,
  downloadTemplateSimpananCsv,
  processKasImportFile,
  processSimpananImportFile
} from '../lib/transactionImport';
import { dataService } from '../lib/dataService';
import { formatRupiah, formatNominal } from '../lib/formatters';

export default function ImportTransactionModal({
  isOpen,
  onClose,
  type = 'kas', // 'kas' | 'simpanan'
  settings = {},
  anggotaList = [],
  onSuccess
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const isKas = type === 'kas';
  const modalTitle = isKas ? 'Import Transaksi Kas Harian' : 'Import Transaksi Simpanan Anggota';
  const modalSubtitle = isKas
    ? 'Unggah mutasi kas masuk dan keluar secara massal via file Excel atau CSV'
    : 'Unggah setoran dan penarikan simpanan anggota koperasi secara massal';

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelected(selectedFile);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setParseError('');
    setIsParsing(true);
    setParseResult(null);

    try {
      let result;
      if (isKas) {
        result = await processKasImportFile(selectedFile);
      } else {
        result = await processSimpananImportFile(selectedFile, anggotaList);
      }
      setParseResult(result);
    } catch (err) {
      console.error('Import parse error:', err);
      setParseError(err.message || 'Gagal memproses file. Pastikan format tabel sesuai dengan template.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParseResult(null);
    setParseError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplateExcel = () => {
    if (isKas) {
      downloadTemplateKasExcel(settings);
    } else {
      downloadTemplateSimpananExcel(settings, anggotaList);
    }
  };

  const handleDownloadTemplateCsv = () => {
    if (isKas) {
      downloadTemplateKasCsv();
    } else {
      downloadTemplateSimpananCsv(anggotaList);
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return;

    const itemsToImport = parseResult.items.filter((item) => item.isValid);
    if (itemsToImport.length === 0) {
      alert('Tidak ada baris data valid yang dapat diimpor.');
      return;
    }

    if (parseResult.invalidCount > 0 && !skipErrors) {
      alert(`Terdapat ${parseResult.invalidCount} baris bermasalah. Centang opsi "Lewati baris bermasalah" untuk melanjutkan.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isKas) {
        const res = await dataService.importKasTransactions(itemsToImport);
        if (res.success) {
          if (onSuccess) {
            onSuccess({
              count: itemsToImport.length,
              totalMasuk: parseResult.totalMasuk,
              totalKeluar: parseResult.totalKeluar
            });
          }
          onClose();
        } else {
          alert('Gagal mengimpor: ' + (res.message || 'Terjadi kesalahan sistem'));
        }
      } else {
        const res = await dataService.importSimpananTransactions(itemsToImport);
        if (res.success) {
          if (onSuccess) {
            onSuccess({
              count: itemsToImport.length,
              grandTotal: parseResult.grandTotal
            });
          }
          onClose();
        } else {
          alert('Gagal mengimpor: ' + (res.message || 'Terjadi kesalahan sistem'));
        }
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan data: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter preview items
  const displayItems = (parseResult?.items || []).filter((item) => {
    if (activeFilter === 'valid') return item.isValid;
    if (activeFilter === 'invalid') return !item.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-4xl w-full max-h-[92vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
        {/* ================= HEADER MODAL ================= */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-2xl text-[#ffd159]">file_upload</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">{modalTitle}</h3>
              <p className="text-[11px] text-blue-100/90 font-medium">{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* ================= BODY CONTENT ================= */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs flex-1">
          {/* BANNER UNDUH TEMPLATE */}
          <div className="bg-[#eff6ff] rounded-2xl border border-[#bfdbfe] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl text-[#2563eb] shrink-0 mt-0.5">info</span>
              <div>
                <h4 className="font-extrabold text-[#1e3a8a] text-xs">Belum memiliki format data transaksi?</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Unduh template resmi berformat rapi, lengkapi baris data, lalu unggah kembali ke sini.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#2563eb]/30 text-[#2563eb] rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Unduh format Microsoft Excel (.xls)"
              >
                <span className="material-symbols-outlined text-base text-[#047857]">description</span>
                Template Excel (.xls)
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Unduh format teks koma (.csv)"
              >
                <span className="material-symbols-outlined text-base text-slate-500">table_chart</span>
                Template CSV
              </button>
            </div>
          </div>

          {/* DROPZONE / FILE UPLOAD AREA */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#2563eb] bg-[#eff6ff]/70 scale-[0.99]'
                  : 'border-slate-200 hover:border-[#2563eb]/50 hover:bg-[#f8fafc]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl">cloud_upload</span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#0f172a]">
                  Pilih atau seret file transaksi ke area ini
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung file Microsoft Excel (<span className="font-semibold text-slate-600">.xlsx, .xls</span>) dan <span className="font-semibold text-slate-600">.csv</span>
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold text-xs shadow-sm transition-all cursor-pointer"
              >
                Jelajahi File Komputer
              </button>
            </div>
          ) : (
            <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
                  {file.name.split('.').pop() || 'FILE'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#0f172a] truncate text-xs">{file.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {(file.size / 1024).toFixed(1)} KB &bull; Siap diproses
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetFile}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
              >
                Ganti File
              </button>
            </div>
          )}

          {/* PARSING LOADING STATE */}
          {isParsing && (
            <div className="p-8 text-center bg-[#f8fafc] rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-600">Memindai dan memvalidasi baris data transaksi...</span>
            </div>
          )}

          {/* PARSE ERROR ALERT */}
          {parseError && (
            <div className="bg-[#fff1f2] border border-rose-200 rounded-2xl p-4 text-rose-700 flex items-start gap-3">
              <span className="material-symbols-outlined text-xl text-rose-500 shrink-0">error</span>
              <div>
                <h5 className="font-bold text-xs">Gagal Membaca File</h5>
                <p className="text-[11px] text-rose-600 mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* PREVIEW & VALIDATION RESULTS */}
          {parseResult && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* METRIC CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Baris</span>
                  <div className="text-lg font-extrabold text-[#0f172a] mt-0.5">{parseResult.totalRows} Baris</div>
                </div>

                <div className="bg-[#ecfdf5] p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Data Valid</span>
                  <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{parseResult.validCount} Siap Impor</div>
                </div>

                <div className={`p-3.5 rounded-2xl border shadow-2xs ${
                  parseResult.invalidCount > 0 ? 'bg-[#fff1f2] border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    parseResult.invalidCount > 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}>Data Bermasalah</span>
                  <div className={`text-lg font-extrabold mt-0.5 ${
                    parseResult.invalidCount > 0 ? 'text-rose-700' : 'text-slate-400'
                  }`}>{parseResult.invalidCount} Baris</div>
                </div>

                {isKas ? (
                  <div className="bg-[#eff6ff] p-3.5 rounded-2xl border border-[#bfdbfe] shadow-2xs">
                    <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">Estimasi Arus Kas</span>
                    <div className="text-xs font-extrabold text-[#2563eb] mt-0.5">
                      +{formatNominal(parseResult.totalMasuk)} / -{formatNominal(parseResult.totalKeluar)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#eff6ff] p-3.5 rounded-2xl border border-[#bfdbfe] shadow-2xs">
                    <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider block">Total Nominal</span>
                    <div className="text-sm font-extrabold text-[#2563eb] mt-0.5">
                      {formatRupiah(parseResult.grandTotal)}
                    </div>
                  </div>
                )}
              </div>

              {/* TABLE FILTER TABS & CONTROL */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Semua ({parseResult.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                      activeFilter === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    Valid ({parseResult.validCount})
                  </button>
                  {parseResult.invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('invalid')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                        activeFilter === 'invalid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      }`}
                    >
                      Bermasalah ({parseResult.invalidCount})
                    </button>
                  )}
                </div>

                {parseResult.invalidCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="rounded text-[#2563eb] focus:ring-[#2563eb] w-4 h-4"
                    />
                    <span>Abaikan baris bermasalah dan impor baris valid</span>
                  </label>
                )}
              </div>

              {/* LIVE PREVIEW TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-inner bg-white">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">#</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Tanggal</th>
                      {isKas ? (
                        <>
                          <th className="px-3 py-2.5">Jenis</th>
                          <th className="px-3 py-2.5">Kategori</th>
                          <th className="px-3 py-2.5 text-right">Nominal</th>
                          <th className="px-3 py-2.5">Keterangan</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2.5">Anggota</th>
                          <th className="px-3 py-2.5">Simpanan</th>
                          <th className="px-3 py-2.5">Tipe</th>
                          <th className="px-3 py-2.5 text-right">Nominal</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((item, idx) => {
                        const isPenerimaan = item.jenis === 'Penerimaan' || item.tipe === 'Setoran';
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              !item.isValid ? 'bg-[#fff1f2]/50 hover:bg-[#fff1f2]' : 'hover:bg-[#f8fafc]'
                            }`}
                          >
                            <td className="px-3 py-2 text-center text-slate-400 font-mono font-medium">
                              {item.rowNumber}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {item.isValid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase">
                                  Valid
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[9px] uppercase"
                                  title={(item.errors || []).join(', ')}
                                >
                                  Error
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-medium">
                              {item.tanggal}
                            </td>

                            {isKas ? (
                              <>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase ${
                                      isPenerimaan ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#fff1f2] text-rose-600'
                                    }`}
                                  >
                                    {isPenerimaan ? 'Masuk' : 'Keluar'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-bold text-[#0f172a] whitespace-nowrap">
                                  {item.kategori}
                                </td>
                                <td className={`px-3 py-2 text-right font-extrabold whitespace-nowrap ${
                                  isPenerimaan ? 'text-[#2563eb]' : 'text-rose-600'
                                }`}>
                                  {formatRupiah(item.jumlah)}
                                </td>
                                <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={item.keterangan}>
                                  {item.keterangan}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 font-bold text-[#0f172a] whitespace-nowrap">
                                  {item.nama_anggota} ({item.nomor_anggota})
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-700">
                                  {item.jenis}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase ${
                                      isPenerimaan ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#fff1f2] text-rose-600'
                                    }`}
                                  >
                                    {item.tipe}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-extrabold text-[#2563eb] whitespace-nowrap">
                                  {formatRupiah(item.jumlah)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ACTIONS ================= */}
        <div className="p-4 sm:p-5 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!parseResult || parseResult.validCount === 0 || isSubmitting}
              onClick={handleExecuteImport}
              className={`px-6 sm:px-8 py-2.5 rounded-full font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                !parseResult || parseResult.validCount === 0 || isSubmitting
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan Transaksi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>
                    Import Sekarang ({parseResult ? parseResult.validCount : 0} Data Valid)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
