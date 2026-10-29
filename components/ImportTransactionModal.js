'use client';

import { useState, useRef } from 'react';
import {
  downloadTemplateSimpananMultiExcel,
  downloadTemplateSimpananMultiCsv,
  processMultiSimpananImportFile
} from '../lib/transactionImport';
import { dataService } from '../lib/dataService';
import { formatRupiah, formatNominal } from '../lib/formatters';

export default function ImportTransactionModal({
  isOpen,
  onClose,
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
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'valid' | 'skipped' | 'invalid'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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
      const result = await processMultiSimpananImportFile(selectedFile, anggotaList);
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
    downloadTemplateSimpananMultiExcel(settings, anggotaList);
  };

  const handleDownloadTemplateCsv = () => {
    downloadTemplateSimpananMultiCsv(settings, anggotaList);
  };

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return;

    const itemsToImport = parseResult.items.filter((item) => item.isValid);
    if (itemsToImport.length === 0) {
      alert('Tidak ada baris data setoran yang dapat diimpor (seluruh anggota bernilai Rp 0).');
      return;
    }

    if (parseResult.invalidCount > 0 && !skipErrors) {
      alert(`Terdapat ${parseResult.invalidCount} baris bermasalah. Centang opsi "Lewati baris bermasalah" untuk melanjutkan.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dataService.importMultiSimpananTransactions(itemsToImport);
      if (res.success) {
        if (onSuccess) {
          onSuccess({
            countMembers: itemsToImport.length,
            createdCount: res.createdCount || 0,
            updatedCount: res.updatedCount || 0,
            totalProcessed: res.totalProcessed || itemsToImport.length,
            grandTotal: parseResult.grandTotal
          });
        }
        onClose();
      } else {
        alert('Gagal mengimpor: ' + (res.message || 'Terjadi kesalahan sistem'));
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
    if (activeFilter === 'skipped') return item.isSkipped;
    if (activeFilter === 'invalid') return !item.isValid && !item.isSkipped;
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
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">Import Transaksi Simpanan Anggota</h3>
              <p className="text-[11px] text-blue-100/90 font-medium">
                Setoran massal Simpanan Pokok, Wajib, dan Sukarela via Spreadsheet Excel / CSV
              </p>
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
                <h4 className="font-extrabold text-[#1e3a8a] text-xs">Template Simpanan Siap Pakai (No & Nama Anggota Sudah Terisi)</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Unduh template resmi di bawah. Seluruh nama anggota koperasi sudah otomatis tersedia, Anda tinggal mengisi tanggal dan nominal setoran!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Unduh template CSV (Sangat direkomendasikan, 100% kompatibel di Excel tanpa peringatan)"
              >
                <span className="material-symbols-outlined text-base text-[#ffd159]">verified</span>
                Template CSV (Disarankan)
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Unduh template Excel (.xlsx)"
              >
                <span className="material-symbols-outlined text-base text-[#047857]">description</span>
                Template Excel (.xlsx)
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
                  Pilih atau seret file transaksi simpanan ke area ini
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung file Microsoft Excel (<span className="font-semibold text-slate-600">.xlsx, .xls</span>) dan <span className="font-semibold text-slate-600">.csv</span>
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold text-xs shadow-sm transition-all cursor-pointer"
              >
                Pilih File dari Komputer
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
              <span className="text-xs font-bold text-slate-600">Memvalidasi data simpanan anggota...</span>
            </div>
          )}

          {/* PARSE ERROR ALERT */}
          {parseError && (
            <div className="bg-[#fff1f2] border border-rose-200 rounded-2xl p-4 text-rose-700 flex items-start gap-3">
              <span className="material-symbols-outlined text-xl text-rose-500 shrink-0">error</span>
              <div className="flex-1">
                <h5 className="font-bold text-xs">Gagal Membaca File</h5>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{parseError}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplateCsv}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    Unduh Template CSV (Paling Lancar)
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Coba File Lain
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW & VALIDATION RESULTS */}
          {parseResult && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* METRIC CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Setoran Valid</span>
                  <div className="text-base font-extrabold text-[#0f172a] mt-0.5">
                    {parseResult.validCount} <span className="text-xs font-normal text-slate-500">Anggota</span>
                  </div>
                </div>

                <div className="bg-[#eff6ff] p-3 rounded-2xl border border-[#bfdbfe] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#1e40af] uppercase tracking-wider block">Simp. Pokok</span>
                  <div className="text-xs font-extrabold text-[#1e40af] mt-0.5">{formatRupiah(parseResult.totalPokok)}</div>
                </div>

                <div className="bg-[#ecfdf5] p-3 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Simp. Wajib</span>
                  <div className="text-xs font-extrabold text-emerald-700 mt-0.5">{formatRupiah(parseResult.totalWajib)}</div>
                </div>

                <div className="bg-[#fefce8] p-3 rounded-2xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Simp. Sukarela</span>
                  <div className="text-xs font-extrabold text-amber-700 mt-0.5">{formatRupiah(parseResult.totalSukarela)}</div>
                </div>

                <div className="bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white p-3 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">Grand Total</span>
                  <div className="text-xs sm:text-sm font-extrabold text-[#ffd159] mt-0.5">{formatRupiah(parseResult.grandTotal)}</div>
                </div>
              </div>

              {/* TABLE FILTER TABS & CONTROL */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    Siap Diimpor ({parseResult.validCount})
                  </button>
                  {parseResult.skippedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('skipped')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                        activeFilter === 'skipped'
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                      }`}
                    >
                      Dilewati Rp 0 ({parseResult.skippedCount})
                    </button>
                  )}
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
                    <span>Lewati baris bermasalah & impor baris yang valid</span>
                  </label>
                )}
              </div>

              {/* LIVE PREVIEW TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-inner bg-white">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">#</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">No. Anggota</th>
                      <th className="px-3 py-2.5">Nama Anggota</th>
                      <th className="px-3 py-2.5">Tanggal</th>
                      <th className="px-3 py-2.5 text-right">Pokok</th>
                      <th className="px-3 py-2.5 text-right">Wajib</th>
                      <th className="px-3 py-2.5 text-right">Sukarela</th>
                      <th className="px-3 py-2.5 text-right font-extrabold text-[#2563eb]">Total Setoran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            !item.isValid && !item.isSkipped
                              ? 'bg-[#fff1f2]/50 hover:bg-[#fff1f2]'
                              : item.isSkipped
                              ? 'bg-slate-50/60 opacity-60 hover:opacity-100'
                              : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <td className="px-3 py-2 text-center text-slate-400 font-mono font-medium">
                            {item.rowNumber}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {item.isValid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase">
                                Siap Impor
                              </span>
                            ) : item.isSkipped ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[9px]">
                                Dilewati (Rp 0)
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
                          <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-slate-700">
                            {item.nomor_anggota}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-bold text-[#0f172a]">
                            {item.nama_anggota}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-medium">
                            {item.tanggal}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-slate-600">
                            {item.pokok > 0 ? formatRupiah(item.pokok) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-emerald-700 font-semibold">
                            {item.wajib > 0 ? formatRupiah(item.wajib) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-amber-700 font-semibold">
                            {item.sukarela > 0 ? formatRupiah(item.sukarela) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap font-extrabold text-[#2563eb]">
                            {item.totalSetoran > 0 ? formatRupiah(item.totalSetoran) : '-'}
                          </td>
                        </tr>
                      ))
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

          <div className="flex items-center gap-3">
            {parseResult && parseResult.skippedCount > 0 && parseResult.validCount > 0 && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {parseResult.skippedCount} anggota Rp 0 akan dilewati
              </span>
            )}
            <button
              type="button"
              disabled={!parseResult || parseResult.validCount === 0 || isSubmitting}
              onClick={handleExecuteImport}
              className={`px-6 sm:px-8 py-2.5 rounded-full font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                !parseResult || parseResult.validCount === 0 || isSubmitting
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-500/20'
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
                    Import Sekarang ({parseResult ? parseResult.validCount : 0} Anggota)
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
