'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import RupiahInput from '../../components/RupiahInput';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { pdfExport } from '../../lib/pdfExport';
import { formatRupiah } from '../../lib/formatters';

export default function SimpananPage() {
  const [summary, setSummary] = useState({
    pokok: 0,
    wajib: 0,
    sukarela: 0,
    total: 0
  });

  const [simpananList, setSimpananList] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [settings, setSettings] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal: Catat Transaksi Baru
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nomor_anggota: '',
    jenis: 'Sukarela',
    tipe: 'Setoran',
    jumlah: '',
    metode: 'Tunai',
    keterangan: ''
  });

  // Modal: Bukti Kuitansi
  const [kuitansiModalOpen, setKuitansiModalOpen] = useState(false);
  const [selectedKuitansi, setSelectedKuitansi] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const selectedModalMember = (anggotaList || []).find(
    (a) => (a.nomor_anggota || a.id) === formData.nomor_anggota
  );

  const loadData = () => {
    const s = dataService.getSimpananSummary();
    const list = dataService.getSimpananList();
    const anggota = dataService.getAnggotaList();
    const sett = dataService.getSettings();

    setSummary(s);
    setSimpananList(list);
    setAnggotaList(anggota);
    setSettings(sett);

    if (anggota.length > 0 && !formData.nomor_anggota) {
      setFormData((prev) => ({
        ...prev,
        nomor_anggota: anggota[0].nomor_anggota || anggota[0].id
      }));
    }
  };

  useEffect(() => {
    loadData();
    dataService.fetchFromSupabase().catch(() => {});

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenModal = (nomorAnggota = '', defaultTipe = 'Setoran') => {
    const selectedNomor = nomorAnggota || (anggotaList.length > 0 ? (anggotaList[0].nomor_anggota || anggotaList[0].id) : '');
    setFormData({
      nomor_anggota: selectedNomor,
      jenis: 'Sukarela',
      tipe: defaultTipe,
      jumlah: '',
      metode: 'Tunai',
      keterangan: ''
    });
    setModalOpen(true);
  };

  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    if (!formData.nomor_anggota) {
      alert('Pilih anggota terlebih dahulu.');
      return;
    }
    if (!formData.jumlah || Number(formData.jumlah) <= 0) {
      alert('Nominal harus lebih dari 0.');
      return;
    }

    dataService.addSimpananTransaction({
      nomor_anggota: formData.nomor_anggota,
      jenis: formData.jenis,
      tipe: formData.tipe,
      jumlah: formData.jumlah,
      metode: formData.metode,
      keterangan: formData.keterangan || `${formData.tipe} Simpanan ${formData.jenis}`
    });

    setModalOpen(false);
    showToast(`Transaksi Simpanan ${formData.jenis} sebesar Rp ${Number(formData.jumlah).toLocaleString('id-ID')} berhasil dicatat!`);
  };

  // State Accordion Collapse/Expand per Anggota (Set berisi nomor_anggota yang dibuka)
  const [expandedMembers, setExpandedMembers] = useState(new Set());

  const toggleMemberExpand = (noAnggota) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(noAnggota)) {
        next.delete(noAnggota);
      } else {
        next.add(noAnggota);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allNos = new Set(groupedMembers.map((g) => g.nomor_anggota));
    setExpandedMembers(allNos);
  };

  const collapseAll = () => {
    setExpandedMembers(new Set());
  };

  // Grouping list per Anggota
  const groupedMembers = (() => {
    const map = new Map();

    // Inisialisasi dari anggotaList agar anggota terdaftar tetap ada di daftar
    (anggotaList || []).forEach((a) => {
      const no = a.nomor_anggota || a.id;
      if (!no) return;
      map.set(no, {
        nomor_anggota: no,
        nama_anggota: a.nama || a.nama_lengkap || '-',
        pokok: 0,
        wajib: 0,
        sukarela: 0,
        total: 0,
        transactions: []
      });
    });

    (simpananList || []).forEach((item) => {
      if (!item) return;
      const no = item.nomor_anggota || 'UNKNOWN';
      const nama = item.nama_anggota || item.nama || '-';

      if (!map.has(no)) {
        map.set(no, {
          nomor_anggota: no,
          nama_anggota: nama,
          pokok: 0,
          wajib: 0,
          sukarela: 0,
          total: 0,
          transactions: []
        });
      }

      const entry = map.get(no);
      entry.transactions.push(item);

      const amount = Number(item.jumlah || 0);
      const isWithdrawal = item.tipe === 'Penarikan' || (item.keterangan || '').toLowerCase().includes('tarik');
      const val = isWithdrawal ? -amount : amount;
      const j = (item.jenis || '').toLowerCase();

      if (j.includes('pokok')) entry.pokok += val;
      else if (j.includes('wajib')) entry.wajib += val;
      else if (j.includes('sukarela')) entry.sukarela += val;

      entry.total += val;
    });

    // Filter berdasarkan search query dan jenisFilter
    const groups = Array.from(map.values()).map((g) => {
      const filteredTrx = g.transactions.filter((t) => {
        if (jenisFilter === 'all') return true;
        return (t.jenis || '').toLowerCase().includes(jenisFilter.toLowerCase());
      });

      return {
        ...g,
        filteredTransactions: filteredTrx
      };
    });

    return groups.filter((g) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        g.nama_anggota.toLowerCase().includes(query) ||
        g.nomor_anggota.toLowerCase().includes(query);

      const hasTransactions = g.filteredTransactions.length > 0;

      return matchSearch && (jenisFilter === 'all' || hasTransactions);
    });
  })();

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, jenisFilter]);

  const paginatedMembers = groupedMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrintKuitansi = (item) => {
    setSelectedKuitansi(item);
    setKuitansiModalOpen(true);
  };

  return (
    <AppLayout
      title="Manajemen Simpanan"
      subtitle="Pencatatan saldo simpanan pokok, wajib, dan sukarela beserta mutasi rekening anggota."
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => excelExport.exportSimpanan(simpananList, summary, settings)}
            className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            + Catat Setoran / Penarikan
          </button>
        </div>
      }
    >
      {/* Toast */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Simpanan Pokok</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">lock</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#0f172a]">{formatRupiah(summary.pokok)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Setoran wajib pendaftaran</p>
        </div>

        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Simpanan Wajib</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">calendar_month</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#2563eb]">{formatRupiah(summary.wajib)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Iuran rutin bulanan anggota</p>
        </div>

        <div className="bg-[#fefbf2] border border-[#faecd2] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Simpanan Sukarela</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#df9800] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">savings</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#df9800]">{formatRupiah(summary.sukarela)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Dapat disetor & ditarik kapanpun</p>
        </div>

        <div className="bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Total Simpanan</span>
            <span className="material-symbols-outlined text-[#ffd159]">account_balance</span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-white mt-2">{formatRupiah(summary.total)}</p>
            <p className="text-[10px] text-blue-100 mt-0.5 font-medium">Kekayaan dana simpanan anggota</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden flex flex-col">
        {/* Filters & Collapse Actions */}
        <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-extrabold text-slate-500 mr-1">Filter Jenis:</span>
            {['all', 'pokok', 'wajib', 'sukarela'].map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setJenisFilter(j)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  jenisFilter === j
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-[#f8fafc]'
                }`}
              >
                {j === 'all' ? 'Semua' : j.charAt(0).toUpperCase() + j.slice(1)}
              </button>
            ))}

            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Buka semua rincian riwayat transaksi"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Tutup semua rincian"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau No. Anggota..."
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-transparent rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Grouped Accordion Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                <th className="px-4 py-3.5 w-12 text-center">#</th>
                <th className="px-4 py-3.5">No. Anggota</th>
                <th className="px-4 py-3.5 min-w-[300px] lg:min-w-[340px]">Nama Anggota</th>
                <th className="px-4 py-3.5 text-right">Simp. Pokok</th>
                <th className="px-4 py-3.5 text-right">Simp. Wajib</th>
                <th className="px-4 py-3.5 text-right">Simp. Sukarela</th>
<th className="px-4 py-3.5 text-right">Total Simpanan</th>
                <th className="px-4 py-3.5 text-center w-24">Riwayat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                    Belum ada data transaksi simpanan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((group) => {
                  const isExpanded = expandedMembers.has(group.nomor_anggota);
                  const displayTrx = group.filteredTransactions || group.transactions;

                  return (
                    <tr key={group.nomor_anggota} className="contents">
                      {/* Baris Utama Akumulasi per Anggota (Click to Expand/Collapse) */}
                      <tr
                        onClick={() => toggleMemberExpand(group.nomor_anggota)}
                        className={`group cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-[#f8fafc]/80'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`material-symbols-outlined text-base transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-[#2563eb]' : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            chevron_right
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-[#2563eb] whitespace-nowrap">
                          {group.nomor_anggota}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-extrabold text-[#0f172a] whitespace-nowrap">
                              {group.nama_anggota}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(group.nomor_anggota);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#2563eb] bg-[#eff6ff] hover:bg-[#2563eb] hover:text-white border border-[#2563eb]/20 hover:border-[#2563eb] rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer active:scale-95 shrink-0 group-hover:bg-[#dbeafe] group-hover:border-[#2563eb]/40"
                              title={`Catat Setoran / Penarikan untuk ${group.nama_anggota}`}
                            >
                              <span className="material-symbols-outlined text-[15px]">add_circle</span>
                              <span>Catat Setoran / Penarikan</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatRupiah(group.pokok)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatRupiah(group.wajib)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-[#df9800] whitespace-nowrap">
                          {formatRupiah(group.sukarela)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-[#2563eb] whitespace-nowrap">
                          {formatRupiah(group.total)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isExpanded
                                ? 'bg-[#2563eb] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            {displayTrx.length} Trx
                          </span>
                        </td>
                      </tr>

                      {/* Sub-Table Rincian Mutasi / Transaksi Simpanan Anggota */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 border-b border-slate-100 bg-[#f8fafc]">
                            <div className="p-4 sm:px-8 sm:py-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm text-[#2563eb]">
                                    receipt_long
                                  </span>
                                  Mutasi Rekening: {group.nama_anggota} ({group.nomor_anggota})
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Total Saldo: <strong className="text-[#2563eb] font-extrabold">{formatRupiah(group.total)}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(group.nomor_anggota);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[11px] font-extrabold transition-all shadow-2xs cursor-pointer active:scale-95"
                                    title={`Catat Transaksi Baru untuk ${group.nama_anggota}`}
                                  >
                                    <span className="material-symbols-outlined text-[15px]">add_circle</span>
                                    + Catat Setoran / Penarikan
                                  </button>
                                </div>
                              </div>

                              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                                      <th className="px-4 py-2.5">Tanggal</th>
                                      <th className="px-4 py-2.5">Kode</th>
                                      <th className="px-4 py-2.5">Jenis</th>
                                      <th className="px-4 py-2.5">Tipe</th>
                                      <th className="px-4 py-2.5">Metode</th>
                                      <th className="px-4 py-2.5">Keterangan</th>
                                      <th className="px-4 py-2.5 text-right">Nominal</th>
                                      <th className="px-4 py-2.5 text-center">Kuitansi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayTrx.length === 0 ? (
                                      <tr>
                                        <td colSpan={8} className="px-4 py-4 text-center text-slate-400 text-xs">
                                          Tidak ada transaksi pada filter ini.
                                        </td>
                                      </tr>
                                    ) : (
                                      displayTrx.map((trx) => {
                                        const isWithdrawal =
                                          trx.tipe === 'Penarikan' || (trx.keterangan || '').toLowerCase().includes('tarik');

                                        return (
                                          <tr key={trx.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                                              {trx.tanggal}
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                                              {trx.id}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                                  (trx.jenis || '').toLowerCase().includes('pokok')
                                                    ? 'bg-[#eff6ff] text-[#2563eb]'
                                                    : (trx.jenis || '').toLowerCase().includes('wajib')
                                                    ? 'bg-[#e0e7ff] text-[#4338ca]'
                                                    : 'bg-[#fef8e7] text-[#b88000]'
                                                }`}
                                              >
                                                {trx.jenis}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                  isWithdrawal ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}
                                              >
                                                {trx.tipe || (isWithdrawal ? 'Penarikan' : 'Setoran')}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                              {trx.metode || 'Tunai'}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 max-w-[220px] truncate" title={trx.keterangan || ''}>
                                              {trx.keterangan || '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-extrabold whitespace-nowrap">
                                              <span className={isWithdrawal ? 'text-rose-600' : 'text-emerald-600'}>
                                                {isWithdrawal ? '-' : '+'}{formatRupiah(trx.jumlah)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handlePrintKuitansi(trx);
                                                }}
                                                className="px-2.5 py-1 text-[11px] font-bold text-[#2563eb] bg-blue-50 hover:bg-[#2563eb] hover:text-white rounded-lg transition-all cursor-pointer shadow-2xs"
                                                title="Cetak Kuitansi Resmi"
                                              >
                                                Kuitansi
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={groupedMembers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL CATAT TRANSAKSI SIMPANAN */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-lg w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#ffd159]">payments</span>
                <div>
                  <h3 className="text-base font-extrabold">Catat Transaksi Simpanan</h3>
                  {selectedModalMember && (
                    <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                      Anggota: <span className="font-bold text-white underline underline-offset-2">{selectedModalMember.nomor_anggota || selectedModalMember.id} - {selectedModalMember.nama || selectedModalMember.nama_lengkap}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                {/* Tipe Transaksi */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe Transaksi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipe: 'Setoran' })}
                      className={`py-2.5 rounded-2xl font-extrabold border transition-all ${
                        formData.tipe === 'Setoran'
                          ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-[#f8fafc]'
                      }`}
                    >
                      + Setoran Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipe: 'Penarikan', jenis: 'Sukarela' })}
                      className={`py-2.5 rounded-2xl font-extrabold border transition-all ${
                        formData.tipe === 'Penarikan'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-[#f8fafc]'
                      }`}
                    >
                      - Penarikan Saldo
                    </button>
                  </div>
                </div>

                {/* Pilih Anggota */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Anggota *</label>
                  <select
                    required
                    value={formData.nomor_anggota || ''}
                    onChange={(e) => setFormData({ ...formData, nomor_anggota: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  >
                    <option value="">-- Pilih Anggota --</option>
                    {anggotaList.map((a) => (
                      <option key={a.id || a.nomor_anggota} value={a.nomor_anggota || a.id}>
                        {a.nomor_anggota || a.id} - {a.nama || a.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis Simpanan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Simpanan</label>
                  <select
                    value={formData.jenis}
                    disabled={formData.tipe === 'Penarikan'}
                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all disabled:bg-slate-100"
                  >
                    <option value="Sukarela">Simpanan Sukarela (Bebas Setor/Tarik)</option>
                    <option value="Wajib">Simpanan Wajib (Bulanan)</option>
                    <option value="Pokok">Simpanan Pokok</option>
                  </select>
                </div>

                {/* Nominal */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal Jumlah (Rp) *</label>
                  <RupiahInput
                    required
                    value={formData.jumlah}
                    onChange={(val) => setFormData({ ...formData, jumlah: val })}
                    className="focus:border-[#2563eb] font-extrabold text-[#2563eb] text-sm bg-[#f8fafc] rounded-2xl"
                  />
                </div>

                {/* Metode Pembayaran */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Metode Penerimaan / Pembayaran</label>
                  <select
                    value={formData.metode}
                    onChange={(e) => setFormData({ ...formData, metode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  >
                    <option value="Tunai">Tunai / Kasir</option>
                    <option value="Transfer Bank">Transfer Bank / QRIS</option>
                    <option value="Potong Gaji">Potong Gaji Otomatis</option>
                  </select>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Keterangan / Catatan</label>
                  <input
                    type="text"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Contoh: Setoran sukarela tabungan qurban"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KUITANSI PRINT PREVIEW */}
      {kuitansiModalOpen && selectedKuitansi && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-md w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-5 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase tracking-wider">Kuitansi Resmi Transaksi</span>
              <button
                type="button"
                onClick={() => setKuitansiModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div id="printArea" className="p-6 flex flex-col gap-4 text-xs">
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm text-[#0f172a]">KOPERASI SIMPAN PINJAM IDAMAN</h3>
                <p className="text-[11px] text-slate-500 font-medium">Bukti Penerimaan / Penarikan Simpanan</p>
                <p className="font-mono text-[10px] text-slate-400 mt-1">No. Bukti: {selectedKuitansi.id}</p>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-semibold text-slate-800">{selectedKuitansi.tanggal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Anggota:</span>
                  <span className="font-mono font-bold text-[#2563eb]">{selectedKuitansi?.nomor_anggota || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Anggota:</span>
                  <span className="font-extrabold text-slate-800">{selectedKuitansi?.nama_anggota || selectedKuitansi?.nama || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Transaksi:</span>
                  <span className="font-bold text-[#2563eb]">Simpanan {selectedKuitansi?.jenis || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode:</span>
                  <span className="text-slate-800">{selectedKuitansi?.metode || 'Tunai'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Keterangan:</span>
                  <span className="text-slate-800">{selectedKuitansi?.keterangan || '-'}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-dashed border-slate-300 text-sm font-bold">
                  <span>Nominal Transaksi:</span>
                  <span className="text-[#2563eb] font-extrabold">{formatRupiah(selectedKuitansi?.jumlah || 0)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 text-center text-[10px] text-slate-500">
                <div>
                  <p>Penyetor / Anggota,</p>
                  <div className="h-10"></div>
                  <p className="font-bold text-slate-700">({selectedKuitansi?.nama_anggota || selectedKuitansi?.nama || 'Anggota'})</p>
                </div>
                <div>
                  <p>Petugas Kasir,</p>
                  <div className="h-10"></div>
                  <p className="font-bold text-slate-700">({selectedKuitansi?.pencatat || 'Kasir Koperasi'})</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setKuitansiModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => pdfExport.exportKuitansiSimpananPDF(selectedKuitansi, settings)}
                className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                Ekspor PDF Kuitansi
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
