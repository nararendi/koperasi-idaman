'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { formatRupiah } from '../../lib/formatters';

export default function DaftarAnggotaPage() {
  const [anggotaList, setAnggotaList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [settings, setSettings] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal States
  const [selectedAnggota, setSelectedAnggota] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const loadAnggota = () => {
    const list = dataService.getAnggotaList();
    const sett = dataService.getSettings();
    setAnggotaList(list);
    setSettings(sett);
  };

  useEffect(() => {
    loadAnggota();

    const handleUpdate = () => {
      loadAnggota();
    };

    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Open Detail Modal with personal savings & loan history
  const handleOpenDetail = (item) => {
    const simpanan = dataService.getSimpananByAnggota(item.nomor_anggota || item.id);
    const pinjaman = dataService.getPinjamanByAnggota(item.nomor_anggota || item.id);
    
    let totalSimpanan = 0;
    simpanan.forEach((s) => {
      const isWithdrawal = s.tipe === 'Penarikan' || (s.keterangan || '').toLowerCase().includes('tarik');
      totalSimpanan += isWithdrawal ? -Number(s.jumlah || 0) : Number(s.jumlah || 0);
    });

    setSelectedAnggota({
      ...item,
      simpananList: simpanan,
      pinjamanList: pinjaman,
      totalSimpanan
    });
    setDetailModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    if (!item) return;
    setEditFormData({
      id: item.id || item.nomor_anggota,
      nomor_anggota: item.nomor_anggota || item.id,
      nama: item.nama || item.nama_lengkap || '',
      alamat: item.alamat || item.alamat_lengkap || '',
      nomor_hp: item.nomor_hp || '',
      pekerjaan: item.pekerjaan || '',
      tempat_lahir: item.tempat_lahir || '',
      tanggal_lahir: item.tanggal_lahir || '',
      status: item.status || item.status_keanggotaan || 'Aktif'
    });
    setEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await dataService.updateAnggota(editFormData.id, editFormData);
    setEditModalOpen(false);
    showToast(`Data anggota ${editFormData?.nama || ''} berhasil diperbarui!`);
  };

  // Delete Anggota
  const handleDelete = async (item) => {
    if (!item) return;
    const id = item.nomor_anggota || item.id;
    if (confirm(`Apakah Anda yakin ingin menghapus data anggota "${item?.nama || item?.nama_lengkap || 'Anggota'}" (${id})?\n\nPerhatian: Seluruh simpanan dan pinjaman terkait anggota ini juga akan dihapus permanen dari sistem & Supabase.`)) {
      await dataService.deleteAnggota(id);
      showToast(`Data anggota ${id} berhasil dihapus permanen!`);
    }
  };

  const filteredAnggota = (anggotaList || []).filter((item) => {
    if (!item) return false;
    const nama = (item?.nama || item?.nama_lengkap || '').toLowerCase();
    const id = (item?.nomor_anggota || item?.id || '').toLowerCase();
    const alamat = (item?.alamat || item?.alamat_lengkap || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = nama.includes(query) || id.includes(query) || alamat.includes(query);
    const itemStatus = (item?.status || item?.status_keanggotaan || 'aktif').toLowerCase();
    const matchesStatus = statusFilter === 'all' || itemStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Reset page to 1 if search/filter reduces total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginatedAnggota = filteredAnggota.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'aktif') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#eff6ff] text-[#2563eb] text-[10px] font-extrabold uppercase">
          Aktif
        </span>
      );
    }
    if (s === 'keluar') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
          Keluar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#fff1f2] text-[#e11d48] text-[10px] font-extrabold uppercase">
        Berhenti
      </span>
    );
  };

  return (
    <AppLayout
      title="Manajemen Anggota"
      subtitle="Kelola data pendaftaran, keanggotaan aktif, dan profil anggota koperasi."
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => excelExport.exportAnggota(filteredAnggota, settings)}
            className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ekspor Excel
          </button>
          <Link
            href="/anggota/tambah"
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            + Tambah Anggota
          </Link>
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

      {/* Top Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Anggota</div>
            <div className="text-xl font-extrabold text-[#0f172a] mt-1">{anggotaList.length} Orang</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
        </div>

        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Anggota Aktif</div>
            <div className="text-xl font-extrabold text-[#2563eb] mt-1">
              {anggotaList.filter((a) => (a.status || a.status_keanggotaan || '').toLowerCase() === 'aktif').length} Orang
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white text-[#2563eb] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-xl">verified_user</span>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tidak Aktif / Keluar</div>
            <div className="text-xl font-extrabold text-slate-600 mt-1">
              {anggotaList.filter((a) => (a.status || a.status_keanggotaan || '').toLowerCase() !== 'aktif').length} Orang
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white text-slate-500 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-xl">person_off</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-extrabold text-slate-500 mr-1">Status:</span>
            {['all', 'aktif', 'keluar', 'berhenti'].map((st) => (
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
                {st === 'all' ? 'Semua' : st.charAt(0).toUpperCase() + st.slice(1)}
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
              placeholder="Cari nama, no. anggota, alamat..."
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-transparent rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Anggota List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                <th className="px-4 py-3.5">No. Anggota</th>
                <th className="px-4 py-3.5">Nama Anggota</th>
                <th className="px-4 py-3.5">No. HP / WA</th>
                <th className="px-4 py-3.5">Alamat</th>
                <th className="px-4 py-3.5">Tgl Daftar</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnggota.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                    Tidak ditemukan data anggota yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedAnggota.map((item) => (
                  <tr key={item?.id || item?.nomor_anggota} className="hover:bg-[#f8fafc]/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#2563eb] whitespace-nowrap">
                      {item?.nomor_anggota || item?.id}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-[#0f172a] whitespace-nowrap">
                      {item?.nama || item?.nama_lengkap || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {item?.nomor_hp || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate" title={item?.alamat || item?.alamat_lengkap || ''}>
                      {item?.alamat || item?.alamat_lengkap || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {item?.tanggal_daftar || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(item?.status || item?.status_keanggotaan)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          title="Lihat Detail & Tabungan"
                          className="p-1.5 text-[#2563eb] hover:bg-[#eff6ff] rounded-xl transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Data Anggota"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Hapus Anggota"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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
          totalItems={filteredAnggota.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedAnggota && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-2xl w-full max-h-[88vh] my-auto overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center rounded-t-[28px] sm:rounded-t-[32px]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-base border border-white/30">
                  {(selectedAnggota?.nama || selectedAnggota?.nama_lengkap || 'A').charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{selectedAnggota?.nama || selectedAnggota?.nama_lengkap || 'Anggota'}</h3>
                  <p className="text-xs text-blue-100 font-mono">No. {selectedAnggota?.nomor_anggota || selectedAnggota?.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#eff6ff] p-4 rounded-2xl border border-[#bfdbfe]">
                <div>
                  <span className="text-slate-400 font-bold block">Nomor HP / WA:</span>
                  <span className="font-extrabold text-slate-800">{selectedAnggota?.nomor_hp || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Pekerjaan:</span>
                  <span className="font-extrabold text-slate-800">{selectedAnggota?.pekerjaan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Tempat, Tgl Lahir:</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedAnggota?.tempat_lahir || '-'}, {selectedAnggota?.tanggal_lahir || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Tanggal Bergabung:</span>
                  <span className="font-extrabold text-slate-800">{selectedAnggota?.tanggal_daftar || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Status Keanggotaan:</span>
                  <span className="font-bold">{getStatusBadge(selectedAnggota?.status || selectedAnggota?.status_keanggotaan)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Total Saldo Simpanan:</span>
                  <span className="font-extrabold text-[#2563eb] text-sm">
                    {formatRupiah(selectedAnggota?.totalSimpanan || 0)}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 font-bold block">Alamat Lengkap:</span>
                  <span className="font-medium text-slate-800">{selectedAnggota?.alamat || selectedAnggota?.alamat_lengkap || '-'}</span>
                </div>
              </div>

              {/* Savings History for this member */}
              <div>
                <h4 className="text-sm font-extrabold text-[#0f172a] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#2563eb]">savings</span>
                  Riwayat Simpanan Anggota ({selectedAnggota.simpananList?.length || 0})
                </h4>
                {selectedAnggota.simpananList?.length === 0 ? (
                  <p className="text-slate-400 italic bg-[#f8fafc] p-3 rounded-xl border border-slate-100">Belum ada transaksi simpanan tercatat.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#eff6ff] text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2">Tgl</th>
                          <th className="px-3 py-2">Jenis</th>
                          <th className="px-3 py-2 text-right">Nominal</th>
                          <th className="px-3 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedAnggota.simpananList.map((s) => (
                          <tr key={s.id}>
                            <td className="px-3 py-2 text-slate-600">{s.tanggal}</td>
                            <td className="px-3 py-2 font-bold text-[#2563eb]">{s.jenis}</td>
                            <td className="px-3 py-2 text-right font-extrabold">{formatRupiah(s.jumlah || 0)}</td>
                            <td className="px-3 py-2 text-slate-500">{s.keterangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Loan History for this member */}
              <div>
                <h4 className="text-sm font-extrabold text-[#0f172a] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-600">payments</span>
                  Riwayat Pinjaman Anggota ({selectedAnggota.pinjamanList?.length || 0})
                </h4>
                {selectedAnggota.pinjamanList?.length === 0 ? (
                  <p className="text-slate-400 italic bg-[#f8fafc] p-3 rounded-xl border border-slate-100">Tidak ada pengajuan pinjaman aktif/lunas.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#eff6ff] text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2">No. Pinjaman</th>
                          <th className="px-3 py-2">Plafon</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Sisa Hutang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedAnggota.pinjamanList.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 font-mono text-[#2563eb]">{p.nomor_pinjaman || p.id}</td>
                            <td className="px-3 py-2 font-bold">{formatRupiah(p.jumlah || 0)}</td>
                            <td className="px-3 py-2">{getStatusBadge(p.status)}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-rose-500">
                              {formatRupiah(p.sisa_hutang || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-[#2563eb] text-white rounded-full font-bold hover:bg-[#1d4ed8] transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-xl w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">edit_square</span>
                <h3 className="text-base font-extrabold">Edit Data Anggota</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nomor Anggota (ID)</label>
                    <input
                      type="text"
                      disabled
                      value={editFormData.nomor_anggota || ''}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl font-mono text-slate-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.nama || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nama: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nomor HP / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.nomor_hp || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomor_hp: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pekerjaan</label>
                    <input
                      type="text"
                      value={editFormData.pekerjaan || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, pekerjaan: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={editFormData.tempat_lahir || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, tempat_lahir: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status Keanggotaan</label>
                    <select
                      value={editFormData.status || 'Aktif'}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-extrabold text-slate-800 transition-all"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Keluar">Keluar</option>
                      <option value="Berhenti">Berhenti</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                    <textarea
                      rows={3}
                      value={editFormData.alamat || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, alamat: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none resize-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm transition-all cursor-pointer"
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
