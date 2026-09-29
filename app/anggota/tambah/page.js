'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/AppLayout';
import { dataService } from '../../../lib/dataService';
import { formatRupiah } from '../../../lib/formatters';

export default function TambahAnggotaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nomor_anggota: '',
    nama_lengkap: '',
    alamat_lengkap: '',
    nomor_hp: '',
    pekerjaan: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    tanggal_daftar: '',
    status_keanggotaan: 'Aktif',
    setorSimpananPokok: true
  });

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const autoNumber = dataService.getNextNomorAnggota();
    const s = dataService.getSettings();

    setSettings(s);
    setFormData((prev) => ({
      ...prev,
      nomor_anggota: autoNumber,
      tanggal_daftar: today
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!formData.nama_lengkap.trim()) {
        throw new Error('Nama lengkap wajib diisi.');
      }
      if (!formData.nomor_hp.trim()) {
        throw new Error('Nomor HP / WhatsApp wajib diisi.');
      }

      dataService.addAnggota(
        {
          nomor_anggota: formData.nomor_anggota,
          nama_lengkap: formData.nama_lengkap,
          alamat_lengkap: formData.alamat_lengkap,
          nomor_hp: formData.nomor_hp,
          pekerjaan: formData.pekerjaan,
          tempat_lahir: formData.tempat_lahir,
          tanggal_lahir: formData.tanggal_lahir,
          tanggal_daftar: formData.tanggal_daftar,
          status_keanggotaan: formData.status_keanggotaan
        },
        formData.setorSimpananPokok
      );

      setSuccessMessage(
        `Anggota baru "${formData.nama_lengkap}" (${formData.nomor_anggota}) berhasil didaftarkan!`
      );

      setTimeout(() => {
        router.push('/anggota');
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data anggota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Pendaftaran Anggota Baru"
      subtitle="Formulir registrasi dan pembukuan data anggota resmi koperasi."
      rightAction={
        <Link
          href="/anggota"
          className="px-4 py-2 border border-[#2563eb]/30 bg-[#eff6ff] rounded-full text-xs font-bold text-[#2563eb] hover:bg-[#dbeafe] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Kembali ke Daftar
        </Link>
      }
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {successMessage && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
            <span className="material-symbols-outlined text-xl text-[#2563eb]">check_circle</span>
            <div>
              <p className="font-extrabold">{successMessage}</p>
              <p className="text-blue-700 font-medium">Mengalihkan kembali ke daftar anggota...</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
            <span className="material-symbols-outlined text-xl text-rose-600">error</span>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-[#ffd159]">badge</span>
              <h2 className="text-sm font-extrabold">Informasi Identitas Anggota</h2>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-mono text-white font-bold">
              Formulir Resmi
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 text-xs">
            {/* Row 1: Nomor Anggota & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nomor Pokok Anggota (Auto-Generated)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    pin
                  </span>
                  <input
                    type="text"
                    name="nomor_anggota"
                    value={formData.nomor_anggota}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-[#2563eb] outline-none"
                    placeholder="Contoh: KI-01"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pendaftaran</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    calendar_today
                  </span>
                  <input
                    type="date"
                    name="tanggal_daftar"
                    value={formData.tanggal_daftar}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Nama Lengkap & No HP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Lengkap Sesuai KTP <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    name="nama_lengkap"
                    value={formData.nama_lengkap}
                    onChange={handleChange}
                    placeholder="Contoh: Muhammad Farhan"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    phone_android
                  </span>
                  <input
                    type="tel"
                    required
                    name="nomor_hp"
                    value={formData.nomor_hp}
                    onChange={handleChange}
                    placeholder="08123456789"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Tempat Lahir & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  name="tempat_lahir"
                  value={formData.tempat_lahir}
                  onChange={handleChange}
                  placeholder="Kota Kelahiran"
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pekerjaan</label>
                <input
                  type="text"
                  name="pekerjaan"
                  value={formData.pekerjaan}
                  onChange={handleChange}
                  placeholder="Karyawan / Wiraswasta / dll"
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none font-semibold text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Row 4: Alamat */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alamat Tempat Tinggal Lengkap</label>
              <textarea
                name="alamat_lengkap"
                rows={3}
                value={formData.alamat_lengkap}
                onChange={handleChange}
                placeholder="Jl. Nama Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota"
                className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] focus:bg-white outline-none resize-none font-medium"
              />
            </div>

            {/* Simpanan Pokok Checkbox & Notice */}
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="setorSimpananPokok"
                name="setorSimpananPokok"
                checked={formData.setorSimpananPokok}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb] cursor-pointer"
              />
              <label htmlFor="setorSimpananPokok" className="cursor-pointer">
                <span className="font-extrabold text-[#0f172a] block">
                  Otomatis Catat Setoran Simpanan Pokok Awal ({formatRupiah(settings.simpananPokok || 500000)})
                </span>
                <span className="text-slate-600 block text-[11px] mt-0.5 font-medium">
                  Mencatat mutasi Simpanan Pokok sebesar biaya pendaftaran awal dan membukukan langsung ke Penerimaan Kas Koperasi.
                </span>
              </label>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Link
                href="/anggota"
                className="px-5 py-2.5 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-extrabold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                {loading ? 'Menyimpan...' : 'Daftarkan Anggota'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
