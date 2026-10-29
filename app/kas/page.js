'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import RupiahInput from '../../components/RupiahInput';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { formatRupiah } from '../../lib/formatters';

export default function KasPage() {
  const [summary, setSummary] = useState({
    masuk: 0,
    keluar: 0,
    saldo: 0
  });

  const [kasList, setKasList] = useState([]);
  const [settings, setSettings] = useState({});
  const [filterJenis, setFilterJenis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    jenis: 'Pengeluaran',
    kategori: 'Operasional',
    jumlah: '',
    keterangan: '',
    tanggal: ''
  });

  const loadData = () => {
    const s = dataService.getKasSummary();
    const list = dataService.getKasList();
    const sett = dataService.getSettings();
    setSummary(s);
    setKasList(list);
    setSettings(sett);
  };

  useEffect(() => {
    loadData();

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

  const handleOpenModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      jenis: 'Pengeluaran',
      kategori: 'Operasional',
      jumlah: '',
      keterangan: '',
      tanggal: today
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.jumlah || Number(formData.jumlah) <= 0) {
      alert('Masukkan nominal transaksi yang valid.');
      return;
    }

    dataService.addKasTransaction(formData);
    setModalOpen(false);
    showToast(`Transaksi ${formData.jenis} sebesar ${formatRupiah(formData.jumlah)} berhasil dicatat.`);
  };

  const filteredKas = (kasList || []).filter((item) => {
    if (!item) return false;
    const kat = (item?.kategori || '').toLowerCase();
    const ket = (item?.keterangan || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchSearch = kat.includes(query) || ket.includes(query);
    const matchJenis = filterJenis === 'all' || (item?.jenis || '').toLowerCase() === filterJenis.toLowerCase();
    return matchSearch && matchJenis;
  });

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterJenis]);

  const paginatedKas = filteredKas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Export Professional Excel Document
  const handleExportExcel = () => {
    excelExport.exportBukuKas(filteredKas, summary, settings);
  };

  return (
    <AppLayout
      title="Buku Kas Harian & Arus Kas"
      subtitle="Pencatatan real-time penerimaan dan pengeluaran dana kas koperasi."
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            + Catat Mutasi Kas
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2563eb] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <span className="material-symbols-outlined text-base text-[#ffd159]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Kas Masuk */}
        <div className="bg-[#eff6ff] rounded-2xl border border-[#bfdbfe] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Kas Masuk (Penerimaan)</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-lg">arrow_downward</span>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#2563eb]">{formatRupiah(summary.masuk)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Setoran simpanan, angsuran kredit & pendapatan</p>
        </div>

        {/* Total Kas Keluar */}
        <div className="bg-[#fff5f5] rounded-2xl border border-rose-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Kas Keluar (Pengeluaran)</span>
            <div className="w-8 h-8 rounded-xl bg-white text-rose-500 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-500">{formatRupiah(summary.keluar)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pencairan pinjaman, tarik simpanan & operasional</p>
        </div>

        {/* Saldo Kas Bersih */}
        <div className="bg-[#eff6ff] rounded-2xl border border-[#bfdbfe] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Likuid</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div className={`text-2xl font-extrabold ${summary.saldo >= 0 ? 'text-[#0f172a]' : 'text-rose-600'}`}>
            {formatRupiah(summary.saldo)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Kas riil yang tersedia di brankas / bank koperasi</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
        {/* Filter & Search Bar */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8fafc]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Cari kategori atau keterangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-transparent rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-extrabold text-slate-500">Filter:</span>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-4 py-2 bg-[#f8fafc] border border-slate-200 rounded-full text-xs font-bold text-slate-700 focus:border-[#2563eb] outline-none"
            >
              <option value="all">Semua Mutasi</option>
              <option value="penerimaan">Penerimaan (Masuk)</option>
              <option value="pengeluaran">Pengeluaran (Keluar)</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                <th className="px-4 py-3.5">ID Kas</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Jenis</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Keterangan Transaksi</th>
                <th className="px-4 py-3.5 text-right">Debit (Masuk)</th>
                <th className="px-4 py-3.5 text-right">Kredit (Keluar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl text-slate-300 block mb-1">receipt_long</span>
                    Belum ada riwayat mutasi kas ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedKas.map((k) => {
                  const isPenerimaan = k.jenis === 'Penerimaan';
                  return (
                    <tr key={k.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {k.id}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {k.tanggal}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full font-extrabold text-[10px] uppercase ${
                            isPenerimaan ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#fff1f2] text-[#e11d48]'
                          }`}
                        >
                          {isPenerimaan ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-[#0f172a]">
                        {k.kategori}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={k.keterangan}>
                        {k.keterangan}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-[#2563eb] whitespace-nowrap">
                        {isPenerimaan ? formatRupiah(k.jumlah) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-rose-500 whitespace-nowrap">
                        {!isPenerimaan ? formatRupiah(k.jumlah) : '-'}
                      </td>
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
          totalItems={filteredKas.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL CATAT MUTASI KAS MANUAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-md w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#ffd159]">receipt_long</span>
                <h3 className="text-base font-extrabold">Catat Mutasi Kas Manual</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jenis Mutasi *</label>
                    <select
                      value={formData.jenis}
                      onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    >
                      <option value="Pengeluaran">Pengeluaran (Kas Keluar)</option>
                      <option value="Penerimaan">Penerimaan (Kas Masuk)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Transaksi</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Transaksi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Operasional, ATK, Listrik, Konsumsi, dll"
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal Transaksi (Rp) *</label>
                  <RupiahInput
                    required
                    value={formData.jumlah}
                    onChange={(val) => setFormData({ ...formData, jumlah: val })}
                    className="font-extrabold text-[#2563eb] bg-[#f8fafc] rounded-2xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Keterangan / Rincian</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan keterangan detail transaksi..."
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-medium text-slate-800 resize-none transition-all"
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
                  Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
