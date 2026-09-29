'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import RupiahInput from '../../components/RupiahInput';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { hitungSimulasiPinjaman, hitungJadwalAkumulasiPinjaman, formatRupiah, formatNominal } from '../../lib/formatters';

export default function PinjamanPage() {
  const [summary, setSummary] = useState({
    berjalan: 0,
    lunas: 0,
    diajukan: 0,
    sisaHutang: 0
  });

  const [pinjamanList, setPinjamanList] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [settings, setSettings] = useState({});
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal: Ajukan Pinjaman Baru
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [applyForm, setApplyForm] = useState({
    nomor_anggota: '',
    jumlah: '10000000',
    bunga: 2.5,
    tenor: 12,
    metodeBunga: 'menurun',
    pembulatan: 50000,
    keperluan: ''
  });

  // Modal: Bayar Angsuran
  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [selectedPinjamanBayar, setSelectedPinjamanBayar] = useState(null);
  const [bayarForm, setBayarForm] = useState({
    cicilanKe: 1,
    jumlahBayar: '',
    pokok: 0,
    bunga: 0,
    metode: 'Tunai',
    penerima: 'Admin Kasir',
    keterangan: ''
  });

  // Modal: Detail Pinjaman & Riwayat Angsuran
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPinjamanDetail, setSelectedPinjamanDetail] = useState(null);

  const loadData = () => {
    const s = dataService.getPinjamanSummary();
    const list = dataService.getPinjamanList();
    const anggota = dataService.getAnggotaList();
    const currentSettings = dataService.getSettings();

    setSummary(s);
    setPinjamanList(list);
    setAnggotaList(anggota);
    setSettings(currentSettings);

    if (anggota.length > 0 && !applyForm.nomor_anggota) {
      setApplyForm((prev) => ({
        ...prev,
        nomor_anggota: anggota[0].nomor_anggota || anggota[0].id,
        bunga: 2.5
      }));
    }
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

  // Open Apply Modal
  const handleOpenApplyModal = () => {
    setApplyForm({
      nomor_anggota: anggotaList.length > 0 ? (anggotaList[0].nomor_anggota || anggotaList[0].id) : '',
      jumlah: '10000000',
      bunga: 2.5,
      tenor: 12,
      metodeBunga: 'menurun',
      pembulatan: 50000,
      keperluan: ''
    });
    setShowSchedulePreview(false);
    setApplyModalOpen(true);
  };

  // Submit Loan Application
  const handleSubmitApply = (e) => {
    e.preventDefault();
    if (!applyForm.nomor_anggota) {
      alert('Pilih anggota pemohon pinjaman.');
      return;
    }
    if (!applyForm.jumlah || Number(applyForm.jumlah) <= 0) {
      alert('Masukkan nominal pinjaman yang valid.');
      return;
    }

    const newLoan = dataService.applyPinjaman(applyForm);
    setApplyModalOpen(false);
    showToast(`Pengajuan pinjaman baru (${newLoan.nomor_pinjaman}) senilai ${formatRupiah(newLoan.jumlah)} berhasil diajukan!`);
  };

  // Change Loan Status (Approve / Reject / Disburse)
  const handleUpdateStatus = (id, newStatus) => {
    if (newStatus === 'Berjalan') {
      if (!confirm('Apakah Anda yakin ingin mencairkan dana pinjaman ini? Saldo Kas Koperasi akan otomatis dipotong untuk pencairan dana pinjaman.')) {
        return;
      }
    }
    const updated = dataService.updatePinjamanStatus(id, newStatus);
    if (updated) {
      showToast(`Status pinjaman ${updated.nomor_pinjaman} diubah menjadi "${newStatus}"`);
    }
  };

  // Helper to get loan repayment schedule
  const getPinjamanSchedule = (pinjaman) => {
    if (!pinjaman) return [];
    if (pinjaman.jadwal_angsuran && pinjaman.jadwal_angsuran.length > 0) {
      return pinjaman.jadwal_angsuran;
    }
    const sim = hitungSimulasiPinjaman(
      pinjaman.jumlah,
      pinjaman.tenor || 12,
      pinjaman.bunga || 2.5,
      pinjaman.metode_bunga || 'menurun',
      pinjaman.pembulatan !== undefined ? pinjaman.pembulatan : 50000
    );
    return sim.jadwal || [];
  };

  // Open Pay Installment Modal with dynamic accumulation
  const handleOpenBayarModal = (pinjaman, targetBulan = null) => {
    setSelectedPinjamanBayar(pinjaman);
    const dynamicSchedule = hitungJadwalAkumulasiPinjaman(pinjaman);

    // Tentukan cicilan target: jika targetBulan diberikan gunakan itu,
    // jika tidak cari cicilan pertama yang belum lunas (status !== 'Lunas')
    let defaultCicilan = 1;
    if (targetBulan) {
      defaultCicilan = Number(targetBulan);
    } else {
      const firstUnpaid = dynamicSchedule.find((s) => s.status !== 'Lunas');
      if (firstUnpaid) {
        defaultCicilan = firstUnpaid.bulanKe;
      } else {
        defaultCicilan = Math.min(Number(pinjaman.tenor) || 12, (pinjaman.riwayat_angsuran ? pinjaman.riwayat_angsuran.length : 0) + 1);
      }
    }

    const scheduleItem = dynamicSchedule.find((s) => s.bulanKe === defaultCicilan) || dynamicSchedule[0];
    const initialAmount = scheduleItem
      ? (scheduleItem.status === 'Sebagian' ? scheduleItem.sisaKurang : scheduleItem.totalTagihan)
      : (pinjaman.total_angsuran_bulanan || 0);

    setBayarForm({
      cicilanKe: defaultCicilan,
      jumlahBayar: initialAmount,
      pokok: scheduleItem ? scheduleItem.pokok : 0,
      bunga: scheduleItem ? scheduleItem.bunga : 0,
      metode: 'Tunai',
      penerima: 'Admin Kasir',
      keterangan: `Angsuran ke-${defaultCicilan} Pinjaman ${pinjaman.nama || 'Anggota'} (${pinjaman.nomor_pinjaman || pinjaman.id})`
    });
    setBayarModalOpen(true);
  };

  // Handle changing selected installment period in modal
  const handleCicilanChange = (cicilanNumber) => {
    const num = Number(cicilanNumber);
    if (!selectedPinjamanBayar) return;

    const dynamicSchedule = hitungJadwalAkumulasiPinjaman(selectedPinjamanBayar);
    const scheduleItem = dynamicSchedule.find((s) => s.bulanKe === num);

    if (scheduleItem) {
      const targetAmount = scheduleItem.status === 'Sebagian' ? scheduleItem.sisaKurang : scheduleItem.totalTagihan;
      setBayarForm((prev) => ({
        ...prev,
        cicilanKe: num,
        jumlahBayar: targetAmount,
        pokok: scheduleItem.pokok,
        bunga: scheduleItem.bunga,
        keterangan: `Angsuran ke-${num} Pinjaman ${selectedPinjamanBayar.nama || 'Anggota'} (${selectedPinjamanBayar.nomor_pinjaman || selectedPinjamanBayar.id})`
      }));
    } else {
      setBayarForm((prev) => ({
        ...prev,
        cicilanKe: num
      }));
    }
  };

  // Submit Installment Payment with manual flexible amount
  const handleSubmitBayar = (e) => {
    e.preventDefault();
    if (!selectedPinjamanBayar) return;
    if (!bayarForm.jumlahBayar || Number(bayarForm.jumlahBayar) <= 0) {
      alert('Masukkan nominal pembayaran angsuran yang valid (lebih dari 0).');
      return;
    }

    const updated = dataService.payPinjamanInstallment({
      pinjamanId: selectedPinjamanBayar.id,
      jumlahBayar: bayarForm.jumlahBayar,
      metode: bayarForm.metode,
      penerima: bayarForm.penerima,
      angsuranKe: bayarForm.cicilanKe,
      pokok: bayarForm.pokok,
      bunga: bayarForm.bunga,
      keterangan: bayarForm.keterangan
    });

    setBayarModalOpen(false);
    loadData();

    if (updated) {
      const sisa = Number(updated.sisa_hutang) || 0;
      if (sisa <= 0 || updated.status === 'Lunas') {
        showToast(`🎉 Pembayaran Cicilan ke-${bayarForm.cicilanKe} (${formatRupiah(bayarForm.jumlahBayar)}) berhasil! Pinjaman ${updated.nama} telah LUNAS.`);
      } else {
        showToast(`✅ Pembayaran Cicilan ke-${bayarForm.cicilanKe} (${formatRupiah(bayarForm.jumlahBayar)}) berhasil dicatat! Sisa pinjaman belum lunas: ${formatRupiah(sisa)}`);
      }
    }
  };

  // Open Detail Modal
  const handleOpenDetailModal = (pinjaman) => {
    setSelectedPinjamanDetail(pinjaman);
    setDetailModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Berjalan':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#eff6ff] text-[#2563eb]">Berjalan</span>;
      case 'Diajukan':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#fef8e7] text-[#df9800]">Diajukan</span>;
      case 'Disetujui':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#e0f2fe] text-[#0369a1]">Disetujui</span>;
      case 'Lunas':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600">Lunas</span>;
      case 'Ditolak':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#fff1f2] text-[#e11d48]">Ditolak</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const filteredList = (pinjamanList || []).filter((item) => {
    if (!item) return false;
    const nama = (item?.nama || '').toLowerCase();
    const noPj = (item?.nomor_pinjaman || item?.id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchSearch = nama.includes(query) || noPj.includes(query);
    const matchStatus = statusFilter === 'Semua' || item?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Real-time Declining Balance Loan Calculation & Rounding Preview
  const liveSim = hitungSimulasiPinjaman(
    applyForm.jumlah,
    applyForm.tenor,
    applyForm.bunga,
    applyForm.metodeBunga,
    applyForm.pembulatan
  );

  return (
    <AppLayout
      title="Manajemen Pinjaman"
      subtitle="Kelola pengajuan kredit, persetujuan, pencairan dana, dan penerimaan angsuran."
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => excelExport.exportPinjaman(filteredList, summary, settings)}
            className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            + Ajukan Pinjaman
          </button>
        </div>
      }
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2563eb] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <span className="material-symbols-outlined text-base text-[#ffd159]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pinjaman Berjalan</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">trending_up</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#2563eb]">{formatRupiah(summary.berjalan)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Total plafon kredit aktif</p>
        </div>

        <div className="bg-[#fefbf2] border border-[#faecd2] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sisa Piutang</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#df9800] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">receipt_long</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#df9800]">{formatRupiah(summary.sisaHutang)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Belum terbayar pinjaman aktif</p>
        </div>

        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pinjaman Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">check_circle</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#0f172a]">{formatRupiah(summary.lunas)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Riwayat kredit lunas tuntas</p>
        </div>

        <div className="bg-[#fef8e7] border border-[#ffd159]/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Perlu Persetujuan</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#b88000] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">pending_actions</span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#b88000]">{formatRupiah(summary.diajukan)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Pengajuan baru yang perlu ditinjau</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-extrabold text-slate-500 mr-1">Status:</span>
            {['Semua', 'Diajukan', 'Disetujui', 'Berjalan', 'Lunas', 'Ditolak'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-[#f8fafc]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari peminjam, nomor kredit..."
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-transparent rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                <th className="px-4 py-3.5">No. Pinjaman</th>
                <th className="px-4 py-3.5">Peminjam</th>
                <th className="px-4 py-3.5 text-right">Plafon Pinjaman</th>
                <th className="px-4 py-3.5">Bunga & Tenor</th>
                <th className="px-4 py-3.5 text-right">Angsuran / Bln</th>
                <th className="px-4 py-3.5 text-right">Sisa Hutang</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi / Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-medium">
                    Tidak ditemukan data pinjaman dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(item)}
                        className="text-[#2563eb] hover:underline cursor-pointer flex items-center gap-1 font-mono"
                        title="Klik untuk melihat rincian & sisa hutang pinjaman"
                      >
                        {item.nomor_pinjaman || item.id}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(item)}
                        className="text-left group cursor-pointer block"
                        title="Klik untuk melihat sisa pinjaman & rincian anggota ini"
                      >
                        <div className="font-extrabold text-[#0f172a] group-hover:text-[#2563eb] group-hover:underline flex items-center gap-1">
                          {item.nama}
                          <span className="material-symbols-outlined text-[13px] text-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity">info</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.nomor_anggota}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-[#0f172a] whitespace-nowrap">
                      {formatRupiah(item.jumlah)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="font-semibold">{item.bunga}% / bln</div>
                      <div className="text-[10px] font-bold text-[#2563eb]">{item.tenor} Bulan</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-700 whitespace-nowrap">
                      {formatRupiah(item.total_angsuran_bulanan || item.angsuran_pokok)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold whitespace-nowrap">
                      {item.status === 'Lunas' ? (
                        <span className="text-[#2563eb]">Rp 0 (Lunas)</span>
                      ) : (
                        <span className="text-rose-500">{formatRupiah(item.sisa_hutang || item.total_pinjaman)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status === 'Diajukan' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                              title="Setujui Pengajuan Pinjaman"
                              className="px-3 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-[10px] font-extrabold shadow-xs cursor-pointer"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                              title="Tolak Pinjaman"
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[10px] font-extrabold shadow-xs cursor-pointer"
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        {item.status === 'Disetujui' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'Berjalan')}
                            title="Cairkan Dana & Potong Kas"
                            className="px-3.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">payments</span>
                            Cairkan Dana
                          </button>
                        )}

                        {item.status === 'Berjalan' && (
                          <button
                            type="button"
                            onClick={() => handleOpenBayarModal(item)}
                            title="Bayar Angsuran Pinjaman"
                            className="px-3.5 py-1 bg-[#ffd159] hover:bg-[#f7be38] text-[#0f172a] rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">add_card</span>
                            Bayar Angsuran
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(item)}
                          title="Lihat Detail & Jadwal Angsuran"
                          className="p-1.5 text-[#2563eb] hover:bg-[#eff6ff] rounded-xl transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">info</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {/* MODAL AJUKAN PINJAMAN BARU */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-xl w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#ffd159]">request_quote</span>
                <h3 className="text-base font-extrabold">Formulir Pengajuan Pinjaman</h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Anggota Pemohon *</label>
                  <select
                    required
                    value={applyForm.nomor_anggota}
                    onChange={(e) => setApplyForm({ ...applyForm, nomor_anggota: e.target.value })}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 block mb-1">Plafon Pinjaman (Rp) *</label>
                    <RupiahInput
                      required
                      value={applyForm.jumlah}
                      onChange={(val) => setApplyForm({ ...applyForm, jumlah: val })}
                      className="font-extrabold text-[#2563eb] bg-[#f8fafc] rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tenor (Bulan) *</label>
                    <select
                      value={applyForm.tenor}
                      onChange={(e) => setApplyForm({ ...applyForm, tenor: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          {m} Bulan {m === 12 ? '(1 Tahun)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Suku Bunga (% / Bln)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={applyForm.bunga}
                      onChange={(e) => setApplyForm({ ...applyForm, bunga: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* Metode Bunga & Pembulatan Pokok */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#eff6ff] p-4 rounded-2xl border border-[#bfdbfe]">
                  <div>
                    <label className="font-bold text-[#0f172a] block mb-1">Sistem Perhitungan Bunga</label>
                    <select
                      value={applyForm.metodeBunga}
                      onChange={(e) => setApplyForm({ ...applyForm, metodeBunga: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-[#2563eb] outline-none bg-white font-extrabold text-[#0f172a] text-xs cursor-pointer"
                    >
                      <option value="menurun">Bunga Menurun (Efektif - Dari Sisa Pinjaman) ⭐</option>
                      <option value="flat">Bunga Flat (Tetap Tiap Bulan)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                      {applyForm.metodeBunga === 'menurun'
                        ? 'Bunga awal 2.5% x Plafon, bulan selanjutnya 2.5% x Sisa Pokok (menurun).'
                        : 'Bunga tetap flat dihitung dari plafon awal.'}
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-[#0f172a] block mb-1">Pembulatan Pokok / Bulan</label>
                    <select
                      value={applyForm.pembulatan}
                      onChange={(e) => setApplyForm({ ...applyForm, pembulatan: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-[#2563eb] outline-none bg-white font-extrabold text-[#0f172a] text-xs cursor-pointer"
                    >
                      <option value={50000}>Dibulatkan ke atas Rp 50.000</option>
                      <option value={10000}>Dibulatkan ke atas Rp 10.000</option>
                      <option value={1000}>Dibulatkan ke atas Rp 1.000</option>
                      <option value={0}>Tanpa Pembulatan (Pas)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                      Mencegah pecahan ganjil agar cicilan bulat dan mudah dibayarkan.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tujuan / Keperluan Pinjaman</label>
                  <input
                    type="text"
                    value={applyForm.keperluan}
                    onChange={(e) => setApplyForm({ ...applyForm, keperluan: e.target.value })}
                    placeholder="Contoh: Tambahan modal usaha warung sembako"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-medium text-slate-800"
                  />
                </div>

                {/* Real-time Loan Calculator Preview */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0f172a] flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-base text-[#2563eb]">calculate</span>
                      Simulasi Angsuran {applyForm.metodeBunga === 'menurun' ? '(Bunga Menurun)' : '(Bunga Flat)'}:
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#2563eb] text-white">
                      Pokok: {formatRupiah(liveSim.pokokPerBulan)}/Bln
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-slate-500 block text-[10px]">Pokok / Bulan:</span>
                      <span className="font-extrabold text-slate-800">{formatRupiah(liveSim.pokokPerBulan)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-slate-500 block text-[10px]">Bunga Bulan ke-1:</span>
                      <span className="font-extrabold text-[#2563eb]">{formatRupiah(liveSim.bungaBulanPertama)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-slate-500 block text-[10px]">Angsuran Bln 1:</span>
                      <span className="font-extrabold text-[#2563eb]">{formatRupiah(liveSim.angsuranBulanPertama)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-slate-500 block text-[10px]">Total Estimasi:</span>
                      <span className="font-extrabold text-[#0f172a]">{formatRupiah(liveSim.totalPengembalian)}</span>
                    </div>
                  </div>

                  {applyForm.metodeBunga === 'menurun' && liveSim.jadwal && liveSim.jadwal.length > 1 && (
                    <div className="text-[11px] bg-white border border-[#bfdbfe] rounded-xl p-2.5 text-[#1d4ed8] flex items-center justify-between">
                      <span>
                        📉 <strong>Bulan ke-2 Menurun:</strong> Pokok {formatRupiah(liveSim.jadwal[1].pokok)} + Bunga <strong>{formatRupiah(liveSim.jadwal[1].bunga)}</strong> (Sisa {formatRupiah(liveSim.jadwal[1].sisaAwal)}) = <strong>{formatRupiah(liveSim.jadwal[1].totalAngsuran)}</strong>
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] bg-white/90 border border-blue-200 rounded-xl p-2.5 text-[#1e40af] flex items-start gap-2 shadow-2xs">
                    <span className="material-symbols-outlined text-sm text-[#2563eb] shrink-0 mt-0.5">info</span>
                    <span className="leading-relaxed">
                      <strong>Fleksibilitas Angsuran:</strong> Pembayaran angsuran tidak harus mengikuti skema cicilan di atas secara kaku. Anggota dapat membayar nominal secara manual/sebagian, dan sisa nominal tunggakan maupun kelebihan bayar akan otomatis diakumulasikan ke cicilan selanjutnya.
                    </span>
                  </div>

                  {/* Collapsible Monthly Schedule */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                      className="text-[11px] text-[#2563eb] hover:text-[#1d4ed8] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showSchedulePreview ? 'expand_less' : 'expand_more'}
                      </span>
                      {showSchedulePreview ? 'Sembunyikan Rincian Jadwal' : `Lihat Jadwal Angsuran Menurun Lengkap (${liveSim.tenor} Bulan)`}
                    </button>

                    {showSchedulePreview && (
                      <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-[#2563eb] text-white font-bold">
                              <th className="p-2 text-center">Bln</th>
                              <th className="p-2 text-right">Sisa Pokok Awal</th>
                              <th className="p-2 text-right">Pokok</th>
                              <th className="p-2 text-right">Bunga ({applyForm.bunga}%)</th>
                              <th className="p-2 text-right">Total Tagihan</th>
                              <th className="p-2 text-right">Sisa Pokok Akhir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {liveSim.jadwal.map((j) => (
                              <tr key={j.bulanKe} className="hover:bg-[#f8fafc]">
                                <td className="p-2 text-center font-bold">{j.bulanKe}</td>
                                <td className="p-2 text-right text-slate-600">{formatRupiah(j.sisaAwal)}</td>
                                <td className="p-2 text-right font-semibold">{formatRupiah(j.pokok)}</td>
                                <td className="p-2 text-right text-[#2563eb] font-semibold">{formatRupiah(j.bunga)}</td>
                                <td className="p-2 text-right font-extrabold text-[#0f172a]">{formatRupiah(j.totalAngsuran)}</td>
                                <td className="p-2 text-right text-slate-500">{formatRupiah(j.sisaAkhir)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm cursor-pointer transition-all"
                >
                  Ajukan Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BAYAR ANGSURAN */}
      {bayarModalOpen && selectedPinjamanBayar && (() => {
        const dynamicSchedule = hitungJadwalAkumulasiPinjaman(selectedPinjamanBayar);
        const activeItem = dynamicSchedule.find((s) => s.bulanKe === Number(bayarForm.cicilanKe)) || dynamicSchedule[0] || {};
        const skemaAsli = Number(activeItem.skemaAsli) || 0;
        const akumulasiSebelumnya = Number(activeItem.akumulasiSebelumnya) || 0;
        const totalDibayarSebelumnya = Number(activeItem.totalDibayar) || 0;
        const totalTagihanBulanIni = Number(activeItem.totalTagihan) || 0;
        const sisaWajibBayar = activeItem.status === 'Sebagian' ? activeItem.sisaKurang : totalTagihanBulanIni;
        const payAmount = Number(bayarForm.jumlahBayar) || 0;
        const selisih = payAmount - sisaWajibBayar;
        const nextBulan = (Number(bayarForm.cicilanKe) || 1) + 1;
        const totalSisaHutang = Number(selectedPinjamanBayar.sisa_hutang) || 0;

        return (
          <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-lg w-full max-h-[90vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#ffd159]">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">Bayar Angsuran Pinjaman</h3>
                    <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                      {selectedPinjamanBayar.nomor_pinjaman || selectedPinjamanBayar.id} • {selectedPinjamanBayar.nama}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBayarModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitBayar} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                  {/* Summary Pinjaman Card */}
                  <div className="p-3.5 bg-[#eff6ff] rounded-2xl border border-[#bfdbfe] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Peminjam</span>
                      <span className="font-extrabold text-slate-800 text-sm">{selectedPinjamanBayar.nama}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sisa Hutang Total</span>
                      <span className="font-black text-rose-600 text-sm">{formatRupiah(totalSisaHutang)}</span>
                    </div>
                  </div>

                  {/* Pilihan Cicilan Ke- & Metode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Pilih Angsuran Ke- *</label>
                      <select
                        value={bayarForm.cicilanKe}
                        onChange={(e) => handleCicilanChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-bold text-[#0f172a] text-xs transition-all"
                      >
                        {dynamicSchedule.map((j) => {
                          let labelStatus = '';
                          if (j.status === 'Lunas') labelStatus = '✓ Lunas';
                          else if (j.status === 'Sebagian') labelStatus = `Sebagian (Kurang ${formatRupiah(j.sisaKurang)})`;
                          else if (j.akumulasiSebelumnya !== 0) labelStatus = `Belum (${formatRupiah(j.totalTagihan)}*)`;
                          else labelStatus = `Belum (${formatRupiah(j.totalTagihan)})`;

                          return (
                            <option key={j.bulanKe} value={j.bulanKe}>
                              Bulan {j.bulanKe} — {labelStatus}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                      <select
                        value={bayarForm.metode}
                        onChange={(e) => setBayarForm({ ...bayarForm, metode: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 text-xs transition-all"
                      >
                        <option value="Tunai">Tunai / Kasir</option>
                        <option value="Transfer Bank">Transfer Bank / QRIS</option>
                        <option value="Potong Simpanan Sukarela">Potong Saldo Sukarela</option>
                        <option value="Potong Gaji">Potong Gaji Otomatis</option>
                      </select>
                    </div>
                  </div>

                  {/* Card Rincian Skema & Akumulasi Otomatis */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Skema Asli Bulan ke-{bayarForm.cicilanKe}:</span>
                      <span className="font-semibold">{formatRupiah(skemaAsli)} <span className="text-[10px] text-slate-400">(Pokok {formatRupiah(activeItem.pokok)} + Bunga {formatRupiah(activeItem.bunga)})</span></span>
                    </div>

                    {akumulasiSebelumnya > 0 && (
                      <div className="flex justify-between items-center text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                          Akumulasi Sisa/Tunggakan Bulan Lalu:
                        </span>
                        <span>+{formatRupiah(akumulasiSebelumnya)}</span>
                      </div>
                    )}

                    {akumulasiSebelumnya < 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">savings</span>
                          Potongan Kelebihan Bayar Bulan Lalu:
                        </span>
                        <span>-{formatRupiah(Math.abs(akumulasiSebelumnya))}</span>
                      </div>
                    )}

                    {totalDibayarSebelumnya > 0 && (
                      <div className="flex justify-between items-center text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl">
                        <span>Sudah Disetor Sebelumnya:</span>
                        <span>-{formatRupiah(totalDibayarSebelumnya)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-800">
                      <span>Target Tagihan Berjalan:</span>
                      <span className="text-[#2563eb] text-base">{formatRupiah(sisaWajibBayar)}</span>
                    </div>
                  </div>

                  {/* Input Jumlah Bayar */}
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="font-bold text-slate-700">Nominal yang Dibayarkan (Rp) *</label>
                      <span className="text-[10px] text-slate-500 font-medium">Bisa diinput manual bebas</span>
                    </div>
                    <RupiahInput
                      required
                      value={bayarForm.jumlahBayar}
                      onChange={(val) => setBayarForm({ ...bayarForm, jumlahBayar: val })}
                      className="font-black text-[#2563eb] bg-[#f8fafc] rounded-2xl text-base py-3"
                    />
                  </div>

                  {/* Tombol Cepat Isi Nominal */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Isi Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setBayarForm({ ...bayarForm, jumlahBayar: sisaWajibBayar })}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563eb] rounded-lg text-[10px] font-bold transition-all border border-blue-200 cursor-pointer"
                    >
                      Target Tagihan ({formatRupiah(sisaWajibBayar)})
                    </button>
                    {skemaAsli !== sisaWajibBayar && (
                      <button
                        type="button"
                        onClick={() => setBayarForm({ ...bayarForm, jumlahBayar: skemaAsli })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        Skema Asli ({formatRupiah(skemaAsli)})
                      </button>
                    )}
                    {totalSisaHutang > 0 && (
                      <button
                        type="button"
                        onClick={() => setBayarForm({ ...bayarForm, jumlahBayar: totalSisaHutang })}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-all border border-emerald-200 cursor-pointer"
                      >
                        Pelunasan Penuh ({formatRupiah(totalSisaHutang)})
                      </button>
                    )}
                  </div>

                  {/* Dynamic Live Banner: Dampak Akumulasi Sisa/Kelebihan */}
                  {payAmount > 0 && (
                    <div
                      className={`p-3.5 rounded-2xl border text-[11px] transition-all ${
                        selisih < 0
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                          : selisih > 0
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      {selisih < 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
                            <span className="material-symbols-outlined text-base text-amber-600">error</span>
                            <span>Pembayaran Sebagian (Kurang {formatRupiah(Math.abs(selisih))})</span>
                          </div>
                          <p className="leading-relaxed text-amber-800">
                            Sisa nominal kekurangan sebesar <strong>{formatRupiah(Math.abs(selisih))}</strong> akan otomatis <strong>diakumulasikan ke Cicilan ke-{nextBulan}</strong>.
                          </p>
                        </div>
                      ) : selisih > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                            <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                            <span>Pembayaran Lebih (Kelebihan {formatRupiah(selisih)})</span>
                          </div>
                          <p className="leading-relaxed text-emerald-800">
                            Cicilan ini lunas. Kelebihan bayar sebesar <strong>{formatRupiah(selisih)}</strong> akan otomatis <strong>memotong tagihan Cicilan ke-{nextBulan}</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-blue-800">
                          <span className="material-symbols-outlined text-base text-[#2563eb]">check_circle</span>
                          <span>Pembayaran tepat sesuai kewajiban tagihan cicilan ke-{bayarForm.cicilanKe}.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keterangan & Kasir */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Penerima Kasir</label>
                      <input
                        type="text"
                        value={bayarForm.penerima}
                        onChange={(e) => setBayarForm({ ...bayarForm, penerima: e.target.value })}
                        placeholder="Contoh: Admin Kasir"
                        className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Catatan / Keterangan</label>
                      <input
                        type="text"
                        value={bayarForm.keterangan}
                        onChange={(e) => setBayarForm({ ...bayarForm, keterangan: e.target.value })}
                        placeholder="Contoh: Setor angsuran sebagian"
                        className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBayarModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    Simpan Pembayaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL DETAIL PINJAMAN */}
      {detailModalOpen && selectedPinjamanDetail && (() => {
        const dynamicDetailSchedule = hitungJadwalAkumulasiPinjaman(selectedPinjamanDetail);
        const totalWajib = Number(selectedPinjamanDetail.total_pinjaman) || 0;
        const totalBayar = Number(selectedPinjamanDetail.total_terbayar) || 0;
        const sisaHutang = Number(selectedPinjamanDetail.sisa_hutang) || 0;
        const isLunas = sisaHutang <= 0 || selectedPinjamanDetail.status === 'Lunas';
        const progressPercent = totalWajib > 0 ? Math.min(100, Math.round((totalBayar / totalWajib) * 100)) : 0;

        return (
          <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-2xl w-full max-h-[88vh] my-auto overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-pop-in">
              <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center rounded-t-[32px]">
                <div>
                  <h3 className="text-base font-extrabold">Rincian & Status Pinjaman</h3>
                  <p className="text-xs text-blue-100 font-mono">{selectedPinjamanDetail.nomor_pinjaman || selectedPinjamanDetail.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 text-xs">
                {/* Prominent Sisa Pinjaman Belum Lunas Card */}
                <div className={`p-4 rounded-2xl border ${isLunas ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {isLunas ? 'Status Pelunasan' : 'Sisa Pinjaman Belum Lunas'}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isLunas ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                      {isLunas ? 'Lunas 100%' : `Sisa ${100 - progressPercent}%`}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className={`text-2xl font-black ${isLunas ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {isLunas ? 'Rp 0 (Lunas)' : formatRupiah(sisaHutang)}
                    </p>
                    <span className="text-xs font-semibold text-slate-500">
                      Terbayar: <strong className="text-[#2563eb]">{formatRupiah(totalBayar)}</strong>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${isLunas ? 'bg-emerald-500' : 'bg-[#2563eb]'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium">
                      <span>Sudah Masuk: {formatRupiah(totalBayar)}</span>
                      <span>Total Kewajiban: {formatRupiah(totalWajib)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#eff6ff] p-4 rounded-2xl border border-[#bfdbfe]">
                  <div>
                    <span className="text-slate-400 font-bold block">Nama Peminjam:</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedPinjamanDetail?.nama || '-'}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{selectedPinjamanDetail?.nomor_anggota || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Status Pinjaman:</span>
                    <span>{getStatusBadge(selectedPinjamanDetail.status)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Plafon Pinjaman:</span>
                    <span className="font-extrabold text-slate-800">{formatRupiah(selectedPinjamanDetail.jumlah)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Tenor & Bunga:</span>
                    <span className="font-extrabold text-slate-800">{selectedPinjamanDetail.tenor} Bulan ({selectedPinjamanDetail.bunga}% / bln)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Sistem Bunga:</span>
                    <span className="font-extrabold text-slate-800">
                      {selectedPinjamanDetail.metode_bunga === 'flat' ? 'Bunga Flat' : 'Bunga Menurun (Efektif)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Total Kewajiban:</span>
                    <span className="font-extrabold text-slate-800">{formatRupiah(selectedPinjamanDetail.total_pinjaman)}</span>
                  </div>
                </div>

                {/* Installment History Table */}
                <div>
                  <h4 className="text-sm font-extrabold text-[#0f172a] mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#2563eb]">history</span>
                    Riwayat Pembayaran Angsuran ({selectedPinjamanDetail.riwayat_angsuran?.length || 0})
                  </h4>

                  {(!selectedPinjamanDetail.riwayat_angsuran || selectedPinjamanDetail.riwayat_angsuran.length === 0) ? (
                    <p className="text-slate-400 italic bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                      Belum ada riwayat pembayaran angsuran.
                    </p>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#eff6ff] text-slate-500 font-bold border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2">Angsuran</th>
                            <th className="px-3 py-2">Tanggal</th>
                            <th className="px-3 py-2">Metode</th>
                            <th className="px-3 py-2 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPinjamanDetail.riwayat_angsuran.map((ang, idx) => (
                            <tr key={ang.id || idx}>
                              <td className="px-3 py-2 font-bold text-[#2563eb]">Cicilan ke-{ang.angsuran_ke}</td>
                              <td className="px-3 py-2 text-slate-600">{ang.tanggal}</td>
                              <td className="px-3 py-2 text-slate-600">{ang.metode}</td>
                              <td className="px-3 py-2 text-right font-extrabold text-[#2563eb]">{formatRupiah(ang.jumlah)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Projected Schedule & Payment Status */}
                {dynamicDetailSchedule.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <h4 className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#2563eb]">calendar_month</span>
                        Jadwal & Skema Angsuran Terakumulasi ({selectedPinjamanDetail.tenor} Bulan)
                      </h4>
                      <span className="text-[10px] text-slate-400">Sisa kekurangan/kelebihan otomatis dialihkan ke bulan berikutnya</span>
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-[#eff6ff] text-slate-700 font-bold border-b border-slate-100">
                          <tr>
                            <th className="p-2 text-center">Bln</th>
                            <th className="p-2 text-right">Pokok</th>
                            <th className="p-2 text-right">Bunga</th>
                            <th className="p-2 text-right">Skema Asli</th>
                            <th className="p-2 text-center">Akumulasi Sisa</th>
                            <th className="p-2 text-right font-extrabold">Total Tagihan</th>
                            <th className="p-2 text-right">Terbayar</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dynamicDetailSchedule.map((j) => {
                            const isPaid = j.status === 'Lunas';
                            const isPartial = j.status === 'Sebagian';

                            return (
                              <tr
                                key={j.bulanKe}
                                className={`transition-colors ${
                                  isPaid
                                    ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                    : isPartial
                                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                    : 'hover:bg-[#f8fafc]'
                                }`}
                              >
                                <td className="p-2 text-center font-bold">{j.bulanKe}</td>
                                <td className="p-2 text-right text-slate-600">{formatRupiah(j.pokok)}</td>
                                <td className="p-2 text-right text-[#2563eb]">{formatRupiah(j.bunga)}</td>
                                <td className="p-2 text-right font-semibold text-slate-700">{formatRupiah(j.skemaAsli)}</td>
                                <td className="p-2 text-center whitespace-nowrap">
                                  {j.akumulasiSebelumnya > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-rose-50 text-rose-600 border border-rose-200">
                                      +{formatRupiah(j.akumulasiSebelumnya)}
                                    </span>
                                  ) : j.akumulasiSebelumnya < 0 ? (
                                    <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200">
                                      -{formatRupiah(Math.abs(j.akumulasiSebelumnya))}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="p-2 text-right font-black text-[#0f172a] whitespace-nowrap">
                                  {formatRupiah(j.totalTagihan)}
                                </td>
                                <td className="p-2 text-right font-bold text-[#2563eb] whitespace-nowrap">
                                  {j.totalDibayar > 0 ? formatRupiah(j.totalDibayar) : '-'}
                                </td>
                                <td className="p-2 text-center whitespace-nowrap">
                                  {isPaid ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                                      ✓ Lunas
                                    </span>
                                  ) : isPartial ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                      Sebagian (-{formatRupiah(j.sisaKurang)})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                                      Belum
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-center whitespace-nowrap">
                                  {!isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDetailModalOpen(false);
                                        handleOpenBayarModal(selectedPinjamanDetail, j.bulanKe);
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-extrabold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg transition-all shadow-2xs cursor-pointer"
                                      title={`Bayar Angsuran Bulan ${j.bulanKe}`}
                                    >
                                      Bayar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-5 py-2 bg-[#2563eb] text-white rounded-full text-xs font-extrabold hover:bg-[#1d4ed8] transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
