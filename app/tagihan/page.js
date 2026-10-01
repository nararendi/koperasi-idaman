'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { pdfExport } from '../../lib/pdfExport';
import { formatRupiah, formatNominal } from '../../lib/formatters';
import RupiahInput from '../../components/RupiahInput';
import Link from 'next/link';

export default function TagihanPage() {
  const [tagihanData, setTagihanData] = useState({ list: [], totals: {} });
  const [settings, setSettings] = useState({});
  const [kategoriFilter, setKategoriFilter] = useState('internal'); // 'internal' | 'luar' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Modal Edit Tagihan Item
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editForm, setEditForm] = useState({
    wajib: '',
    sukarela: '',
    qurban: '',
    cicilanKe: '',
    pokok: '',
    jasa: '',
    sembako: ''
  });

  const getPeriodeLabel = () => {
    const d = new Date();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const loadData = () => {
    const data = dataService.getTagihanBulanan();
    const s = dataService.getSettings();
    setTagihanData(data);
    setSettings(s);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, []);

  // Filter berdasarkan kategori (Internal Lembaga vs Luar Lembaga vs Semua)
  const activeCategoryList = (tagihanData?.list || []).filter((row) => {
    if (!row) return false;
    if (kategoriFilter === 'internal') return !row.is_luar_lembaga;
    if (kategoriFilter === 'luar') return row.is_luar_lembaga;
    return true;
  });

  const filteredList = activeCategoryList.filter((row) => {
    const q = searchQuery.toLowerCase();
    return (
      (row?.nama || '').toLowerCase().includes(q) ||
      (row?.nomor_anggota || '').toLowerCase().includes(q)
    );
  }).map((row, idx) => ({
    ...row,
    displayNo: idx + 1
  }));

  // Reset page to 1 on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kategoriFilter]);

  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenEdit = (row) => {
    setSelectedMember(row);
    setEditForm({
      wajib: row.wajib || '',
      sukarela: row.sukarela || '',
      qurban: row.qurban || '',
      cicilanKe: row.cicilanKe || '',
      pokok: row.pokok || '',
      jasa: row.jasa || '',
      sembako: row.sembako || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    dataService.saveTagihanItem('', selectedMember.nomor_anggota, {
      wajib: Number(editForm.wajib) || 0,
      sukarela: Number(editForm.sukarela) || 0,
      qurban: Number(editForm.qurban) || 0,
      cicilanKe: editForm.cicilanKe || '',
      pokok: Number(editForm.pokok) || 0,
      jasa: Number(editForm.jasa) || 0,
      sembako: Number(editForm.sembako) || 0
    });

    setEditModalOpen(false);
    loadData();
  };

  // Helper untuk mengisi contoh data anggota SMK Assalaam sesuai screenshot
  const handleSeedDemoAnggota = () => {
    const demoMembers = [
      { id: 'KI-09', nomor_anggota: 'KI-09', nama: 'Aman Surahman, S.Pd.', status: 'Aktif' },
      { id: 'KI-07', nomor_anggota: 'KI-07', nama: 'Santi, S.AK.', status: 'Aktif' },
      { id: 'KI-10', nomor_anggota: 'KI-10', nama: 'Wini Desi Asrini', status: 'Aktif' },
      { id: 'KI-12', nomor_anggota: 'KI-12', nama: 'Ica Cahyani', status: 'Aktif' },
      { id: 'KI-13', nomor_anggota: 'KI-13', nama: 'Yadi Hermawan', status: 'Aktif' },
      { id: 'KI-11', nomor_anggota: 'KI-11', nama: 'Rendi Yosandi, A.P.', status: 'Aktif' },
      { id: 'KI-33', nomor_anggota: 'KI-33', nama: 'Asep Abdurrachman', status: 'Aktif' }
    ];

    demoMembers.forEach((m) => {
      dataService.addAnggota(m, false);
    });

    // Preset rincian sesuai screenshot
    dataService.saveTagihanItem('', 'KI-09', { wajib: 25000, sukarela: 25000, qurban: 0, cicilanKe: 2, pokok: 100000, jasa: 22500, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-07', { wajib: 25000, sukarela: 25000, qurban: 0, cicilanKe: '', pokok: 0, jasa: 0, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-10', { wajib: 25000, sukarela: 75000, qurban: 0, cicilanKe: '', pokok: 0, jasa: 0, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-12', { wajib: 25000, sukarela: 175000, qurban: 0, cicilanKe: '', pokok: 0, jasa: 0, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-13', { wajib: 25000, sukarela: 75000, qurban: 0, cicilanKe: 4, pokok: 300000, jasa: 52500, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-11', { wajib: 25000, sukarela: 150000, qurban: 0, cicilanKe: '', pokok: 0, jasa: 0, sembako: 0 });
    dataService.saveTagihanItem('', 'KI-33', { wajib: 25000, sukarela: 0, qurban: 0, cicilanKe: 1, pokok: 400000, jasa: 100000, sembako: 500000 });

    loadData();
  };

  const activeTotals = filteredList.reduce((acc, row) => {
    acc.wajib += Number(row?.wajib || 0);
    acc.sukarela += Number(row?.sukarela || 0);
    acc.qurban += Number(row?.qurban || 0);
    acc.pokok += Number(row?.pokok || 0);
    acc.jasa += Number(row?.jasa || 0);
    acc.sembako += Number(row?.sembako || 0);
    acc.total += Number(row?.jumlah || 0);
    return acc;
  }, { wajib: 0, sukarela: 0, qurban: 0, pokok: 0, jasa: 0, sembako: 0, total: 0 });

  const categoryLabel = kategoriFilter === 'internal'
    ? 'Internal (Lembaga)'
    : kategoriFilter === 'luar'
      ? 'Luar Lembaga'
      : 'Semua Anggota';

  const handleExportPDF = () => {
    pdfExport.exportDaftarTagihanPDF(tagihanData, settings, getPeriodeLabel(), kategoriFilter);
  };

  const handleExportExcel = () => {
    excelExport.exportDaftarTagihanExcel(tagihanData, settings, getPeriodeLabel(), kategoriFilter);
  };

  const today = new Date();
  const todayFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateLine = `Bandung, ${todayFormatted}`;

  return (
    <AppLayout
      title="Daftar Tagihan & Setoran Bulanan"
      subtitle="Rekapitulasi bukti setoran dan potongan simpanan, pinjaman, qurban, dan sembako per anggota bulan berjalan."
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title={`Ekspor Excel Tagihan (${categoryLabel})`}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ekspor Excel ({categoryLabel})
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm shadow-[#2563eb]/20 cursor-pointer"
            title={`Cetak / Ekspor PDF Tagihan (${categoryLabel})`}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Cetak / Ekspor PDF ({categoryLabel})
          </button>
        </div>
      }
    >
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">request_quote</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Tagihan {categoryLabel}
            </span>
            <span className="text-lg font-black text-rose-600">{formatRupiah(activeTotals.total)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">savings</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Simpanan & Qurban ({categoryLabel})
            </span>
            <span className="text-lg font-black text-[#0f172a]">{formatRupiah((activeTotals.wajib || 0) + (activeTotals.sukarela || 0) + (activeTotals.qurban || 0))}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Potongan Pinjaman ({categoryLabel})
            </span>
            <span className="text-lg font-black text-[#0f172a]">{formatRupiah((activeTotals.pokok || 0) + (activeTotals.jasa || 0))}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Tagihan Sembako ({categoryLabel})
            </span>
            <span className="text-lg font-black text-[#0f172a]">{formatRupiah(activeTotals.sembako)}</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6">
        {/* Document Header */}
        <div className="text-center pb-4 border-b border-slate-100 flex flex-col items-center gap-1.5">
          <h2 className="text-base sm:text-lg font-black text-[#0f172a] tracking-wide uppercase">
            DAFTAR TAGIHAN {(settings.namaKoperasi || 'KOPERASI GURU KARYAWAN SMK ASSALAAM BANDUNG').toUpperCase()}
          </h2>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50/90 border border-blue-200/80 rounded-full text-xs font-black text-[#1d4ed8] uppercase tracking-wide">
            <span className="material-symbols-outlined text-sm">
              {kategoriFilter === 'internal' ? 'apartment' : kategoriFilter === 'luar' ? 'public' : 'badge'}
            </span>
            <span>
              {kategoriFilter === 'internal' && 'DAFTAR TAGIHAN ANGGOTA INTERNAL (LEMBAGA)'}
              {kategoriFilter === 'luar' && 'DAFTAR TAGIHAN ANGGOTA LUAR LEMBAGA (NAMA HURUF BESAR)'}
              {kategoriFilter === 'all' && 'DAFTAR TAGIHAN SEMUA ANGGOTA (INTERNAL & LUAR LEMBAGA)'}
            </span>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase">
            BULAN {getPeriodeLabel().toUpperCase()}
          </h3>
        </div>

        {/* Category Selection Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Control Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setKategoriFilter('internal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                kategoriFilter === 'internal'
                  ? 'bg-white text-[#2563eb] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">apartment</span>
              <span>Anggota Internal (Lembaga)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                kategoriFilter === 'internal' ? 'bg-blue-100 text-[#2563eb]' : 'bg-slate-200 text-slate-700'
              }`}>
                {tagihanData?.counts?.internal ?? (tagihanData?.list || []).filter(r => !r.is_luar_lembaga).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setKategoriFilter('luar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                kategoriFilter === 'luar'
                  ? 'bg-white text-indigo-600 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">public</span>
              <span>Anggota Luar Lembaga</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                kategoriFilter === 'luar' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {tagihanData?.counts?.luarLembaga ?? (tagihanData?.list || []).filter(r => r.is_luar_lembaga).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setKategoriFilter('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                kategoriFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">list_alt</span>
              <span>Semua</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                kategoriFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tagihanData?.counts?.total ?? (tagihanData?.list || []).length}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau No. Anggota (KI-XX)..."
              className="w-full pl-10 pr-3.5 py-2 bg-[#f8fafc] border border-slate-200 rounded-full text-xs font-semibold focus:border-[#2563eb] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {tagihanData.list.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDemoAnggota}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                Isi Contoh Data Tagihan
              </button>
            )}
            <Link
              href="/anggota/tambah"
              className="px-4 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Tambah Anggota Baru
            </Link>
          </div>
        </div>

        {/* Beautiful Modern Table Layout with Pure Abu Muda (Light Grey) Headers */}
        <div className="overflow-hidden border border-slate-400 rounded-2xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* Header Tingkat 1 - Abu Muda Solid */}
                <tr className="bg-[#e2e8f0] text-slate-900 font-black text-center text-[11px]">
                  <th rowSpan={2} className="border border-slate-400 py-3.5 px-2 w-12 text-center bg-[#e2e8f0] text-slate-900">NO.</th>
                  <th rowSpan={2} className="border border-slate-400 py-3.5 px-3 w-28 text-center tracking-wide bg-[#e2e8f0] text-slate-900">NO. ANGGOTA</th>
                  <th rowSpan={2} className="border border-slate-400 py-3.5 px-4 text-left min-w-48 tracking-wide bg-[#e2e8f0] text-slate-900">NAMA</th>
                  <th colSpan={3} className="border border-slate-400 py-2.5 px-3 bg-[#e2e8f0] text-slate-900 font-black tracking-wider">
                    SIMPANAN
                  </th>
                  <th colSpan={4} className="border border-slate-400 py-2.5 px-3 bg-[#e2e8f0] text-slate-900 font-black tracking-wider">
                    POTONGAN
                  </th>
                  <th rowSpan={2} className="border border-slate-400 py-3.5 px-4 w-36 bg-[#e2e8f0] text-slate-900 font-black text-center tracking-wider">
                    JUMLAH
                  </th>
                  <th rowSpan={2} className="border border-slate-400 py-3.5 px-2 w-14 text-center bg-[#e2e8f0] text-slate-900">AKSI</th>
                </tr>
                {/* Header Tingkat 2 - Abu Muda */}
                <tr className="bg-[#f1f5f9] text-slate-800 font-black text-center text-[10px]">
                  <th className="border border-slate-400 py-2 px-2.5 w-24 bg-[#f1f5f9] text-slate-800">WAJIB</th>
                  <th className="border border-slate-400 py-2 px-2.5 w-24 bg-[#f1f5f9] text-slate-800">SUKARELA</th>
                  <th className="border border-slate-400 py-2 px-2.5 w-24 bg-[#f1f5f9] text-slate-800">QURBAN</th>
                  <th title="Urutan angsuran pinjaman berjalan anggota" className="border border-slate-400 py-2 px-2 w-20 bg-[#f1f5f9] text-slate-800">
                    CICILAN KE
                  </th>
                  <th className="border border-slate-400 py-2 px-2.5 w-28 bg-[#f1f5f9] text-slate-800">POKOK</th>
                  <th title="Bunga pinjaman anggota" className="border border-slate-400 py-2 px-2.5 w-24 bg-[#f1f5f9] text-slate-800">
                    JASA
                  </th>
                  <th className="border border-slate-400 py-2 px-2.5 w-24 bg-[#f1f5f9] text-slate-800">SEMBAKO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-slate-400 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                        <p className="font-semibold text-slate-600">Belum ada data tagihan anggota untuk kategori ini.</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Pilih tab kategori lainnya atau gunakan pencarian untuk menemukan anggota.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((row, idx) => (
                    <tr key={row.nomor_anggota} className={`${idx % 2 === 1 ? 'bg-[#fcfdfe]' : 'bg-white'} hover:bg-[#eff6ff]/70 transition-colors`}>
                      <td className="border border-slate-300 py-3 px-2 text-center font-semibold text-slate-500">{row.displayNo}</td>
                      <td className="border border-slate-300 py-3 px-2 text-center">
                        <span className="font-mono font-bold text-xs text-[#0f172a] bg-slate-100 px-2 py-0.5 rounded-md">
                          {row.nomor_anggota}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-3 px-3 font-bold text-[#0f172a]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{row.nama}</span>
                          {row.is_luar_lembaga && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                              LUAR LEMBAGA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.wajib > 0 ? formatRupiah(row.wajib) : '-'}</td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.sukarela > 0 ? formatRupiah(row.sukarela) : '-'}</td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.qurban > 0 ? formatRupiah(row.qurban) : '-'}</td>
                      <td title={`Urutan Cicilan Ke-${row.cicilanKe}`} className="border border-slate-300 py-3 px-2 text-center font-bold text-[#2563eb]">
                        {row.cicilanKe ? `Ke ${row.cicilanKe}` : '-'}
                      </td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.pokok > 0 ? formatRupiah(row.pokok) : '-'}</td>
                      <td title="Bunga Pinjaman" className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.jasa > 0 ? formatRupiah(row.jasa) : '-'}</td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-medium text-slate-700">{row.sembako > 0 ? formatRupiah(row.sembako) : '-'}</td>
                      <td className="border border-slate-300 py-3 px-3 text-right font-black text-rose-600 bg-rose-50/50">
                        {formatRupiah(row.jumlah)}
                      </td>
                      <td className="border border-slate-300 py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          title="Sesuaikan Tagihan Anggota"
                          className="p-1.5 hover:bg-blue-50 text-[#2563eb] rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[17px]">edit_note</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {/* Row Total JUMLAH */}
                <tr className="bg-[#f1f5f9] font-black text-slate-900 text-xs border-t-2 border-slate-400">
                  <td colSpan={3} className="border border-slate-300 py-3.5 px-4 text-center font-black tracking-wider text-[11px] bg-slate-200/90 uppercase">
                    JUMLAH TAGIHAN ({categoryLabel})
                  </td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.wajib)}</td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.sukarela)}</td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.qurban)}</td>
                  <td className="border border-slate-300 py-3.5 px-2 text-center"></td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.pokok)}</td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.jasa)}</td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-extrabold">{formatRupiah(activeTotals.sembako)}</td>
                  <td className="border border-slate-300 py-3.5 px-3 text-right font-black text-rose-600 bg-rose-100/80 text-sm">
                    {formatRupiah(activeTotals.total)}
                  </td>
                  <td className="border border-slate-300 py-3.5 px-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Tanda Tangan Sesuai Permintaan: Simetris, Rapi & Sejajar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center min-w-52">
            <span className="text-slate-500 block mb-0.5">Mengetahui,</span>
            <span className="font-bold text-slate-800 block mb-1">Ketua Koperasi</span>
            <div className="h-16"></div>
            <span className="font-extrabold text-[#0f172a] text-sm block border-b border-slate-800 pb-0.5 inline-block min-w-44">
              {settings.ketua || 'Asep Solehudin, S.Pd.'}
            </span>
          </div>

          <div className="text-center min-w-52">
            <span className="text-slate-500 font-semibold block mb-0.5">{dateLine}</span>
            <span className="font-bold text-slate-800 block mb-1">Bendahara Koperasi</span>
            <div className="h-16"></div>
            <span className="font-extrabold text-[#0f172a] text-sm block border-b border-slate-800 pb-0.5 inline-block min-w-44">
              {settings.bendahara || 'Ica Cahyani'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT TAGIHAN ANGGOTA */}
      {/* ========================================================================= */}
      {editModalOpen && selectedMember && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-lg max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-y-auto animate-pop-in">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 block">{selectedMember?.nomor_anggota || '-'}</span>
                <h3 className="font-extrabold text-sm text-[#0f172a]">Penyesuaian Tagihan: {selectedMember?.nama || 'Anggota'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {/* Simpanan */}
              <div>
                <h4 className="font-extrabold text-slate-800 mb-2 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#2563eb] text-sm">savings</span>
                  Komponen Simpanan
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Simpanan Wajib</label>
                    <RupiahInput
                      value={editForm.wajib}
                      onChange={(val) => setEditForm({ ...editForm, wajib: val })}
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Sukarela</label>
                    <RupiahInput
                      value={editForm.sukarela}
                      onChange={(val) => setEditForm({ ...editForm, sukarela: val })}
                      placeholder="0"
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tabungan Qurban</label>
                    <RupiahInput
                      value={editForm.qurban}
                      onChange={(val) => setEditForm({ ...editForm, qurban: val })}
                      placeholder="0"
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Potongan Pinjaman & Sembako */}
              <div>
                <h4 className="font-extrabold text-slate-800 mb-2 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-sm">payments</span>
                  Komponen Potongan Pinjaman & Sembako
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cicilan Ke (Urutan)</label>
                    <input
                      type="text"
                      value={editForm.cicilanKe}
                      onChange={(e) => setEditForm({ ...editForm, cicilanKe: e.target.value })}
                      placeholder="Contoh: 2"
                      className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl font-bold text-center text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pokok Pinjaman</label>
                    <RupiahInput
                      value={editForm.pokok}
                      onChange={(val) => setEditForm({ ...editForm, pokok: val })}
                      placeholder="0"
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jasa (Bunga Pinjaman)</label>
                    <RupiahInput
                      value={editForm.jasa}
                      onChange={(val) => setEditForm({ ...editForm, jasa: val })}
                      placeholder="0"
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Sembako</label>
                    <RupiahInput
                      value={editForm.sembako}
                      onChange={(val) => setEditForm({ ...editForm, sembako: val })}
                      placeholder="0"
                      className="!bg-[#f8fafc] !py-2 !rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Total Preview */}
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Total Tagihan Anggota:</span>
                <span className="text-base font-black text-rose-600">
                  {formatRupiah(
                    (Number(editForm.wajib) || 0) +
                    (Number(editForm.sukarela) || 0) +
                    (Number(editForm.qurban) || 0) +
                    (Number(editForm.pokok) || 0) +
                    (Number(editForm.jasa) || 0) +
                    (Number(editForm.sembako) || 0)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-extrabold transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
