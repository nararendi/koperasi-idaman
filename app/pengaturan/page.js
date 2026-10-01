'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import RupiahInput from '../../components/RupiahInput';
import { dataService } from '../../lib/dataService';
import { authService } from '../../lib/authService';

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState('koperasi'); // 'koperasi' | 'users' | 'profil_saya' | 'database'

  // Tab 1: Koperasi Settings
  const [formData, setFormData] = useState({
    namaKoperasi: '',
    badanHukum: '',
    alamat: '',
    telepon: '',
    email: '',
    ketua: '',
    sekretaris: '',
    bendahara: '',
    pengawas: '',
    simpananPokok: 500000,
    simpananWajib: 100000,
    simpananSukarela: 25000,
    sukuBungaPinjaman: 1.5,
    shuPersenAnggota: 40,
    shuPersenModal: 30,
    shuPersenPengurus: 20,
    shuPersenCadangan: 10
  });

  // Tab 2: Admin Users Management
  const [usersList, setUsersList] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    id: '',
    username: '',
    nama: '',
    email: '',
    password: '',
    role: 'Kasir & Teller',
    status: 'Aktif'
  });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Tab 3: Profil Saya
  const [currentUser, setCurrentUser] = useState(null);
  const [myProfileForm, setMyProfileForm] = useState({
    nama: '',
    email: '',
    username: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [toastMessage, setToastMessage] = useState('');

  const loadData = () => {
    const s = dataService.getSettings();
    const uList = authService.getAllUsers();
    const current = authService.getCurrentUser();

    setFormData(s);
    setUsersList(uList);
    setCurrentUser(current);

    if (current) {
      setMyProfileForm({
        nama: current.nama || '',
        email: current.email || '',
        username: current.username || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  useEffect(() => {
    loadData();

    // Auto pull data dari Supabase saat buka halaman
    dataService.fetchFromSupabase().catch(() => {});
    authService.fetchUsersFromSupabase().catch(() => {});

    const handleUsersUpdate = () => loadData();
    const handleAuthUpdate = () => loadData();
    const handleDbUpdate = () => loadData();

    window.addEventListener('koperasi_users_updated', handleUsersUpdate);
    window.addEventListener('koperasi_auth_updated', handleAuthUpdate);
    window.addEventListener('koperasi_db_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('koperasi_users_updated', handleUsersUpdate);
      window.removeEventListener('koperasi_auth_updated', handleAuthUpdate);
      window.removeEventListener('koperasi_db_updated', handleDbUpdate);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Handle Save Koperasi Settings
  const handleKoperasiSubmit = (e) => {
    e.preventDefault();
    dataService.updateSettings({
      ...formData,
      simpananPokok: Number(formData.simpananPokok),
      simpananWajib: Number(formData.simpananWajib),
      simpananSukarela: Number(formData.simpananSukarela) || 25000,
      sukuBungaPinjaman: Number(formData.sukuBungaPinjaman),
      shuPersenAnggota: Number(formData.shuPersenAnggota),
      shuPersenModal: Number(formData.shuPersenModal),
      shuPersenPengurus: Number(formData.shuPersenPengurus),
      shuPersenCadangan: Number(formData.shuPersenCadangan)
    });
    showToast('Konfigurasi dan profil koperasi berhasil disimpan!');
  };

  // User Management Handlers
  const handleOpenAddUser = () => {
    setIsEditingUser(false);
    setUserFormData({
      id: '',
      username: '',
      nama: '',
      email: '',
      password: '',
      role: 'Kasir & Teller',
      status: 'Aktif'
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setIsEditingUser(true);
    setUserFormData({
      id: user.id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (isEditingUser) {
        const updateData = {
          nama: userFormData.nama,
          email: userFormData.email,
          role: userFormData.role,
          status: userFormData.status
        };
        if (userFormData.password) {
          updateData.password = userFormData.password;
        }
        await authService.updateUser(userFormData.id, updateData);
        showToast(`Akun admin ${userFormData.nama} berhasil diperbarui!`);
      } else {
        if (!userFormData.password) {
          alert('Kata sandi wajib diisi untuk pengguna baru.');
          return;
        }
        await authService.addUser(userFormData);
        showToast(`Pengguna admin baru "${userFormData.nama}" berhasil ditambahkan!`);
      }
      setUserModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user) return;
    if (confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${user.nama}" (@${user.username})?`)) {
      try {
        await authService.deleteUser(user.id);
        showToast(`Akun pengguna ${user.nama} berhasil dihapus permanen!`);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    try {
      if (myProfileForm.newPassword) {
        if (myProfileForm.newPassword !== myProfileForm.confirmPassword) {
          alert('Konfirmasi kata sandi baru tidak cocok.');
          return;
        }
        if (currentUser?.password && currentUser.password !== myProfileForm.oldPassword) {
          alert('Kata sandi lama salah.');
          return;
        }
      }

      const updatedFields = {
        nama: myProfileForm.nama,
        email: myProfileForm.email,
        username: myProfileForm.username
      };

      if (myProfileForm.newPassword) {
        updatedFields.password = myProfileForm.newPassword;
      }

      if (currentUser?.id) {
        await authService.updateUser(currentUser.id, updatedFields);
      }
      showToast('Profil dan kata sandi berhasil diperbarui ke Cloud Supabase!');
      setMyProfileForm((prev) => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportBackup = () => {
    const json = dataService.exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_koperasi_idaman_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a);
    showToast('Backup database JSON berhasil diunduh.');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const res = dataService.importDatabaseJSON(content);
      if (res.success) {
        setFormData(dataService.getSettings());
        showToast('Database berhasil dipulihkan dari file backup!');
      } else {
        alert('Gagal memulihkan database: ' + res.message);
      }
    };
    reader.readAsText(file);
  };

  // Cloud Supabase Sync
  const [syncLoading, setSyncLoading] = useState(false);

  const handleTestSupabaseConnection = async () => {
    setSyncLoading(true);
    const { testSupabaseConnection } = await import('../../lib/supabase');
    const res = await testSupabaseConnection();
    setSyncLoading(false);
    if (res.success) {
      showToast('Koneksi Supabase Cloud Berhasil & Aktif!');
    } else {
      alert('Koneksi Supabase: ' + res.message);
    }
  };

  const handlePushToSupabase = async () => {
    if (!confirm('Apakah Anda ingin mengunggah (push) seluruh data lokal (Anggota, Simpanan, Pinjaman, Kas, Produk Toko, Qurban, Tagihan) ke Supabase Cloud?')) return;
    setSyncLoading(true);
    const res = await dataService.pushAllToSupabase();
    setSyncLoading(false);
    if (res.success) {
      showToast(res.message);
    } else {
      alert('Gagal: ' + res.message);
    }
  };

  const handleFetchFromSupabase = async () => {
    if (!confirm('Apakah Anda ingin menarik (fetch) seluruh data dari Supabase Cloud untuk menyelaraskan data lokal?')) return;
    setSyncLoading(true);
    const res = await dataService.fetchFromSupabase();
    setSyncLoading(false);
    if (res.success) {
      showToast(res.message);
      loadData();
    } else {
      alert('Gagal: ' + res.message);
    }
  };

  // Clear all demo data
  const handleClearAllData = async () => {
    if (confirm('KONFIRMASI: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi (Anggota, Simpanan, Pinjaman, Buku Kas, Toko, Qurban)?\n\nDatabase akan dikosongkan bersih sehingga siap diisi data operasional riil.')) {
      dataService.clearAllData();
      await dataService.clearSupabaseData();
      showToast('Seluruh data transaksi berhasil dibersihkan!');
      loadData();
    }
  };

  if (currentUser && currentUser.role !== 'Super Admin') {
    return (
      <AppLayout
        title="Pengaturan & Sistem"
        subtitle="Akses terbatas hanya untuk Super Administrator."
      >
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs max-w-md mx-auto my-10">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h3 className="text-base font-extrabold text-[#0f172a] mb-2">Akses Dibatasi</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Halaman Pengaturan sistem hanya dapat diakses oleh akun dengan role <strong>Super Admin</strong>. Akun Anda saat ini tercatat sebagai <strong>{currentUser.role}</strong>.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white rounded-full text-xs font-bold shadow-md shadow-[#2563eb]/20 hover:bg-[#1d4ed8] transition-all"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Kembali ke Beranda
          </a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Pengaturan & Sistem"
      subtitle="Kelola konfigurasi koperasi, manajemen pengguna admin, profil akun, dan database."
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2563eb] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <span className="material-symbols-outlined text-base text-[#ffd159]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('koperasi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'koperasi'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">account_balance</span>
            Profil Koperasi
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">manage_accounts</span>
            Kelola Pengguna ({usersList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profil_saya')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'profil_saya'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">person</span>
            Profil Saya
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-slate-600 hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">database</span>
            Database & Backup
          </button>
        </div>

        {/* TAB 1: KOPERASI & PARAMETER */}
        {activeTab === 'koperasi' && (
          <form onSubmit={handleKoperasiSubmit} className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">account_balance</span>
                <h2 className="text-sm font-extrabold text-[#0f172a]">Profil Lembaga Koperasi</h2>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nama Resmi Koperasi *</label>
                  <input
                    type="text"
                    required
                    value={formData.namaKoperasi || ''}
                    onChange={(e) => setFormData({ ...formData, namaKoperasi: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Alamat Kantor Koperasi</label>
                  <textarea
                    rows={2}
                    value={formData.alamat || ''}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Contoh: Jl. Situtarate - Cibaduyut, Bandung"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-medium text-slate-800 resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Badan Hukum / Akta</label>
                  <input
                    type="text"
                    value={formData.badanHukum || ''}
                    onChange={(e) => setFormData({ ...formData, badanHukum: e.target.value })}
                    placeholder="AHU-0012948.AH.01.26.TAHUN 2020"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.telepon || ''}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="085323066335"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Koperasi</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@koperasi-idaman.co.id"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Ketua Koperasi</label>
                  <input
                    type="text"
                    value={formData.ketua || ''}
                    onChange={(e) => setFormData({ ...formData, ketua: e.target.value })}
                    placeholder="Asep Solehudin, S.Pd."
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Sekretaris</label>
                  <input
                    type="text"
                    value={formData.sekretaris || ''}
                    onChange={(e) => setFormData({ ...formData, sekretaris: e.target.value })}
                    placeholder="Nama Sekretaris"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Bendahara</label>
                  <input
                    type="text"
                    value={formData.bendahara || ''}
                    onChange={(e) => setFormData({ ...formData, bendahara: e.target.value })}
                    placeholder="Ica Cahyani"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Parameter Simpan Pinjam */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">tune</span>
                <h2 className="text-sm font-extrabold text-[#0f172a]">Parameter Simpan Pinjam</h2>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarif Simpanan Pokok (Rp)</label>
                  <RupiahInput
                    value={formData.simpananPokok}
                    onChange={(val) => setFormData({ ...formData, simpananPokok: val })}
                    className="bg-[#f8fafc] rounded-2xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarif Simpanan Wajib (Rp / Bln)</label>
                  <RupiahInput
                    value={formData.simpananWajib}
                    onChange={(val) => setFormData({ ...formData, simpananWajib: val })}
                    className="bg-[#f8fafc] rounded-2xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarif Simpanan Sukarela Rutin (Default Rp / Bln)</label>
                  <RupiahInput
                    value={formData.simpananSukarela}
                    onChange={(val) => setFormData({ ...formData, simpananSukarela: val })}
                    className="bg-[#f8fafc] rounded-2xl"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default tagihan sukarela per bulan bagi anggota (sama seperti wajib)</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Suku Bunga Pinjaman (% / Bln)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.sukuBungaPinjaman || 1.5}
                    onChange={(e) => setFormData({ ...formData, sukuBungaPinjaman: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-bold text-[#2563eb] text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Bunga pinjaman flat per bulan</span>
                </div>
              </div>
            </div>

            {/* Alokasi SHU */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">pie_chart</span>
                <h2 className="text-sm font-extrabold text-[#0f172a]">Alokasi Pembagian SHU (%)</h2>
              </div>

              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jasa Anggota (%)</label>
                  <input
                    type="number"
                    value={formData.shuPersenAnggota || 40}
                    onChange={(e) => setFormData({ ...formData, shuPersenAnggota: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-extrabold text-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jasa Modal (%)</label>
                  <input
                    type="number"
                    value={formData.shuPersenModal || 30}
                    onChange={(e) => setFormData({ ...formData, shuPersenModal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-extrabold text-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pengurus & Pengawas (%)</label>
                  <input
                    type="number"
                    value={formData.shuPersenPengurus || 20}
                    onChange={(e) => setFormData({ ...formData, shuPersenPengurus: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-extrabold text-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dana Cadangan (%)</label>
                  <input
                    type="number"
                    value={formData.shuPersenCadangan || 10}
                    onChange={(e) => setFormData({ ...formData, shuPersenCadangan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-extrabold text-[#2563eb]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">save</span>
                Simpan Konfigurasi Koperasi
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: KELOLA PENGGUNA ADMIN */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-[#0f172a]">Daftar Pengguna & Hak Akses Administrator</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Kelola akun staf, bendahara, kasir, dan hak akses sistem terintegrasi cloud.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                + Tambah Pengguna
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                    <th className="px-4 py-3.5">Pengguna</th>
                    <th className="px-4 py-3.5">Username</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Role / Jabatan</th>
                    <th className="px-4 py-3.5">Login Terakhir</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(usersList || []).filter(Boolean).map((u) => {
                    const isSelf = currentUser && currentUser.id === u?.id;
                    return (
                      <tr key={u?.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-xs">
                              {u?.avatar || 'US'}
                            </div>
                            <div className="font-extrabold text-[#0f172a]">
                              {u?.nama || 'User'} {isSelf && <span className="text-[10px] text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full ml-1 font-bold">(Anda)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {u.username}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {u.email}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full font-extrabold text-[10px] ${
                              u.role === 'Super Admin'
                                ? 'bg-[#fef8e7] text-[#df9800]'
                                : u.role === 'Bendahara'
                                ? 'bg-[#e0e7ff] text-[#4338ca]'
                                : 'bg-[#eff6ff] text-[#2563eb]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap font-medium">
                          {u.lastLogin || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold ${
                              u.status === 'Aktif' ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#fff1f2] text-[#e11d48]'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit Pengguna"
                              className="p-1.5 text-[#2563eb] hover:bg-[#eff6ff] rounded-xl transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title="Hapus Pengguna"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROFIL SAYA & PASSWORD */}
        {activeTab === 'profil_saya' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-[#f8fafc] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563eb]">badge</span>
              <div>
                <h3 className="text-sm font-extrabold text-[#0f172a]">Profil Akun Saya</h3>
                <p className="text-xs text-slate-500 font-medium">Perbarui data profil pribadi dan kata sandi akun Anda.</p>
              </div>
            </div>

            <form onSubmit={handleSaveMyProfile} className="p-6 md:p-8 flex flex-col gap-6 text-xs">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                  {currentUser?.avatar || 'AD'}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#0f172a]">{currentUser?.nama || 'Administrator'}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{currentUser?.role || 'Super Admin'} &bull; @{currentUser?.username || 'admin'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={myProfileForm.nama}
                    onChange={(e) => setMyProfileForm({ ...myProfileForm, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alamat Email *</label>
                  <input
                    type="email"
                    required
                    value={myProfileForm.email}
                    onChange={(e) => setMyProfileForm({ ...myProfileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={myProfileForm.username}
                    onChange={(e) => setMyProfileForm({ ...myProfileForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-mono font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hak Akses / Role</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.role || 'Super Admin'}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-semibold"
                  />
                </div>
              </div>

              <div className="bg-[#eff6ff] p-5 rounded-2xl border border-[#bfdbfe] space-y-3">
                <span className="font-extrabold text-[#0f172a] block text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#df9800]">lock_reset</span>
                  Ganti Kata Sandi (Kosongkan jika tidak ingin mengubah sandi)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Kata Sandi Lama</label>
                    <input
                      type="password"
                      value={myProfileForm.oldPassword}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, oldPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#2563eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={myProfileForm.newPassword}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, newPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#2563eb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ulangi Sandi Baru</label>
                    <input
                      type="password"
                      value={myProfileForm.confirmPassword}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#2563eb] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Simpan Perubahan Profil
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: DATABASE & PEMBERSIHAN DATA */}
        {activeTab === 'database' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563eb]">database</span>
              <h2 className="text-sm font-extrabold text-[#0f172a]">Manajemen Database & Backup</h2>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <p className="text-slate-500 font-medium leading-relaxed">
                Unduh seluruh salinan data (Anggota, Simpanan, Pinjaman, Buku Kas) dalam format JSON untuk cadangan berkala, atau impor file backup untuk pemulihan data.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-[#f8fafc]">
                  <div>
                    <h3 className="font-extrabold text-slate-800">Backup Data (JSON)</h3>
                    <p className="text-slate-500 text-[11px] mt-1 font-medium">Unduh seluruh rekaman database koperasi ke komputer Anda.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cloud_download</span>
                    Unduh Backup JSON
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-[#f8fafc]">
                  <div>
                    <h3 className="font-extrabold text-slate-800">Restore Data (JSON)</h3>
                    <p className="text-slate-500 text-[11px] mt-1 font-medium">Unggah file backup .json untuk memulihkan rekaman.</p>
                  </div>
                  <label className="w-full py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-full font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Pilih File Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="border border-rose-200 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-rose-50/40">
                  <div>
                    <h3 className="font-extrabold text-rose-800">Reset Semua Transaksi</h3>
                    <p className="text-slate-500 text-[11px] mt-1 font-medium">Kosongkan riwayat data transaksi anggota, simpanan, & pinjaman.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllData}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                    Kosongkan Data Transaksi
                  </button>
                </div>
              </div>

              {/* Supabase Cloud Live Sync */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-base">cloud_sync</span>
                      Sinkronisasi Supabase Cloud
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                      Kelola sinkronisasi instan dua arah antara database aplikasi dan cloud database Supabase.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={syncLoading}
                    onClick={handleTestSupabaseConnection}
                    className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-emerald-500">sensors</span>
                    Tes Koneksi
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={syncLoading}
                    onClick={handlePushToSupabase}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                    {syncLoading ? 'Memproses...' : 'Unggah (Push) Semua Data ke Supabase'}
                  </button>
                  <button
                    type="button"
                    disabled={syncLoading}
                    onClick={handleFetchFromSupabase}
                    className="py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cloud_download</span>
                    {syncLoading ? 'Memproses...' : 'Tarik (Fetch) Data dari Supabase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT PENGGUNA ADMIN */}
      {userModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] max-w-md w-full max-h-[88vh] my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-6 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#ffd159]">person</span>
                <h3 className="text-base font-extrabold">{isEditingUser ? 'Edit Pengguna Admin' : 'Tambah Pengguna Admin Baru'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs flex-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.nama}
                    onChange={(e) => setUserFormData({ ...userFormData, nama: e.target.value })}
                    placeholder="Contoh: Siti Rahayu"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alamat Email *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="siti@koperasi-idaman.co.id"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      disabled={isEditingUser}
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      placeholder="kasir1"
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-mono font-semibold text-slate-800 disabled:bg-slate-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isEditingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
                    </label>
                    <input
                      type="password"
                      required={!isEditingUser}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Role / Peran</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Bendahara">Bendahara</option>
                      <option value="Kasir & Teller">Kasir & Teller</option>
                      <option value="Pengawas">Pengawas</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status Akun</label>
                    <select
                      value={userFormData.status}
                      onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  {isEditingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
