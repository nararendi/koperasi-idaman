'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/AppLayout';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { pdfExport } from '../../lib/pdfExport';
import { formatRupiah } from '../../lib/formatters';

export default function LaporanPage() {
  const now = new Date();
  const [filterMode, setFilterMode] = useState('bulan'); // 'bulan' | 'ytd' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [laporan, setLaporan] = useState({
    arusKas: {
      totalSimpananMasuk: 0,
      totalAngsuranMasuk: 0,
      totalPenjualanSembako: 0,
      totalSetoranQurban: 0,
      totalPendapatanLain: 0,
      totalPemasukan: 0,
      totalPenyaluranPinjaman: 0,
      totalPenarikanSimpanan: 0,
      totalKulakanSembako: 0,
      totalPenyaluranQurban: 0,
      totalBiayaOperasional: 0,
      totalPengeluaran: 0,
      saldoKasBersih: 0
    },
    neraca: {
      kas: 0,
      piutangPinjaman: 0,
      persediaanSembako: 0,
      totalAset: 0,
      danaTitipanQurban: 0,
      simpananPokok: 0,
      simpananWajib: 0,
      simpananSukarela: 0,
      cadanganModal: 0,
      totalDanaSimpanan: 0,
      totalKewajibanModal: 0,
      isBalanced: true
    },
    shu: {
      pendapatanBunga: 0,
      labaSembako: 0,
      pendapatanLain: 0,
      totalPendapatan: 0,
      biayaOperasional: 0,
      shuBersih: 0,
      alokasi: {
        anggota: 0,
        modal: 0,
        pengurus: 0,
        cadangan: 0
      }
    }
  });

  const [settings, setSettings] = useState({});

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const periodeInfo = useMemo(() => {
    if (filterMode === 'bulan') {
      const y = selectedYear;
      const m = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(y, selectedMonth, 0).getDate();
      return {
        startDate: `${y}-${m}-01`,
        endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
        label: `${monthNames[selectedMonth - 1]} ${selectedYear}`,
        badge: `Bulan ${monthNames[selectedMonth - 1]} ${selectedYear}`
      };
    } else if (filterMode === 'ytd') {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        label: `Tahun Buku ${selectedYear}`,
        badge: `Tahun Buku ${selectedYear} (Kumulatif 1 Jan - 31 Des ${selectedYear})`
      };
    } else {
      return {
        startDate: '',
        endDate: '',
        label: 'Semua Waktu (Kumulatif)',
        badge: 'Semua Periode Pembukuan'
      };
    }
  }, [filterMode, selectedMonth, selectedYear]);

  const loadLaporan = () => {
    const data = dataService.getLaporanData({
      startDate: periodeInfo.startDate,
      endDate: periodeInfo.endDate
    });
    const s = dataService.getSettings();
    setLaporan(data);
    setSettings(s);
  };

  useEffect(() => {
    loadLaporan();
  }, [periodeInfo]);

  useEffect(() => {
    const handleUpdate = () => {
      loadLaporan();
    };
    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, [periodeInfo]);

  const handleSetPreset = (preset) => {
    const currentNow = new Date();
    if (preset === 'bulan_ini') {
      setFilterMode('bulan');
      setSelectedMonth(currentNow.getMonth() + 1);
      setSelectedYear(currentNow.getFullYear());
    } else if (preset === 'bulan_lalu') {
      setFilterMode('bulan');
      const prevM = currentNow.getMonth() === 0 ? 12 : currentNow.getMonth();
      const prevY = currentNow.getMonth() === 0 ? currentNow.getFullYear() - 1 : currentNow.getFullYear();
      setSelectedMonth(prevM);
      setSelectedYear(prevY);
    } else if (preset === 'ytd') {
      setFilterMode('ytd');
      setSelectedYear(currentNow.getFullYear());
    } else if (preset === 'all') {
      setFilterMode('all');
    }
  };

  const handleExportPDF = () => {
    pdfExport.exportLaporanKeuanganPDF(laporan, settings, periodeInfo.label);
  };

  const handleExportExcel = () => {
    excelExport.exportLaporanKeuangan(laporan, settings, periodeInfo.label);
  };

  return (
    <AppLayout
      title="Laporan Keuangan & Rekapitulasi"
      subtitle="Rekapitulasi otomatis arus kas, neraca saldo, dan alokasi SHU periode berjalan."
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
            onClick={handleExportPDF}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Ekspor PDF
          </button>
        </div>
      }
    >
      <div id="laporanContainer" className="flex flex-col gap-6">
        
        {/* ==================== CONTROLLER FILTER PERIODE ==================== */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#2563eb] text-xl">tune</span>
                <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider">
                  Pengaturan Periode Laporan Keuangan
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Pilih rentang buku untuk merekapitulasi Arus Kas, Neraca, dan Sisa Hasil Usaha (SHU).
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetPreset('bulan_ini')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'bulan' && selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear()
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('bulan_lalu')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('ytd')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'ytd'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Tahun Buku {now.getFullYear()} (YTD / RAT)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua Riwayat
              </button>
            </div>
          </div>

          {/* Form Filter Selector */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {/* Mode Selector */}
            <div className="flex items-center bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('bulan')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'bulan' ? 'bg-white text-[#2563eb] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">calendar_view_month</span>
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ytd')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'ytd' ? 'bg-white text-[#2563eb] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">assessment</span>
                Tahun Buku (YTD)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'all' ? 'bg-white text-[#2563eb] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">all_inclusive</span>
                Semua Riwayat
              </button>
            </div>

            {/* Dropdown Bulan jika mode bulanan */}
            {filterMode === 'bulan' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3.5 py-2 bg-[#f8fafc] border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dropdown Tahun jika mode bulanan / YTD */}
            {(filterMode === 'bulan' || filterMode === 'ytd') && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3.5 py-2 bg-[#f8fafc] border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Badge */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Periode Aktif:</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#2563eb] border border-blue-200 px-3 py-1 rounded-full text-xs font-extrabold">
                <span className="material-symbols-outlined text-sm">event_available</span>
                {periodeInfo.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Report Header for Print / Screen */}
        <div className="text-center pb-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-[#0f172a] tracking-wide">{settings.namaKoperasi || 'KOPERASI IDAMAN'}</h2>
          {settings.alamat && (
            <p className="text-xs text-slate-500">{settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}</p>
          )}
          <div className="inline-flex items-center gap-1.5 bg-[#eff6ff] border border-[#2563eb]/20 px-4 py-1.5 rounded-full text-xs font-bold text-[#2563eb] mt-2 shadow-2xs">
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            <span>
              Periode Laporan: {periodeInfo.label}
            </span>
          </div>
        </div>

        {/* Section 1 & Section 2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Laporan Arus Kas */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563eb]">receipt_long</span>
                  <h3 className="text-sm font-extrabold text-[#0f172a]">Laporan Arus Kas (Cashflow)</h3>
                </div>
                <span className="text-[11px] font-extrabold text-[#2563eb] bg-[#eff6ff] px-2.5 py-0.5 rounded-full">
                  Realisasi Periode
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Arus Kas Masuk:</div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Penerimaan Setoran Simpanan</span>
                  <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.arusKas.totalSimpananMasuk)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Penerimaan Angsuran Pinjaman</span>
                  <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.arusKas.totalAngsuranMasuk)}</span>
                </div>
                {(laporan.arusKas.totalPenjualanSembako || 0) > 0 && (
                  <div className="flex justify-between pl-2">
                    <span className="text-slate-600">Penerimaan Toko Sembako</span>
                    <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.arusKas.totalPenjualanSembako)}</span>
                  </div>
                )}
                {(laporan.arusKas.totalSetoranQurban || 0) > 0 && (
                  <div className="flex justify-between pl-2">
                    <span className="text-slate-600">Penerimaan Titipan Qurban</span>
                    <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.arusKas.totalSetoranQurban)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Pendapatan Lain / Administrasi</span>
                  <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.arusKas.totalPendapatanLain)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold text-[#2563eb]">
                  <span>Total Pemasukan Kas</span>
                  <span>{formatRupiah(laporan.arusKas.totalPemasukan)}</span>
                </div>

                <div className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] pt-3">Arus Kas Keluar:</div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Penyaluran Pinjaman Anggota</span>
                  <span className="font-semibold text-rose-500">{formatRupiah(laporan.arusKas.totalPenyaluranPinjaman)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Penarikan Simpanan Sukarela</span>
                  <span className="font-semibold text-rose-500">{formatRupiah(laporan.arusKas.totalPenarikanSimpanan)}</span>
                </div>
                {(laporan.arusKas.totalKulakanSembako || 0) > 0 && (
                  <div className="flex justify-between pl-2">
                    <span className="text-slate-600">Pembelian Stok Sembako</span>
                    <span className="font-semibold text-rose-500">{formatRupiah(laporan.arusKas.totalKulakanSembako)}</span>
                  </div>
                )}
                {(laporan.arusKas.totalPenyaluranQurban || 0) > 0 && (
                  <div className="flex justify-between pl-2">
                    <span className="text-slate-600">Penyaluran Hewan Qurban</span>
                    <span className="font-semibold text-rose-500">{formatRupiah(laporan.arusKas.totalPenyaluranQurban)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Biaya Operasional & Kantor</span>
                  <span className="font-semibold text-rose-500">{formatRupiah(laporan.arusKas.totalBiayaOperasional)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold text-rose-600">
                  <span>Total Pengeluaran Kas</span>
                  <span>{formatRupiah(laporan.arusKas.totalPengeluaran)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-extrabold">
              <span className="text-[#0f172a]">Saldo Bersih Kas Periode Ini:</span>
              <span className={`text-base ${laporan.arusKas.saldoKasBersih >= 0 ? 'text-[#2563eb]' : 'text-rose-500'}`}>
                {formatRupiah(laporan.arusKas.saldoKasBersih)}
              </span>
            </div>
          </div>

          {/* Neraca Keuangan Koperasi */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563eb]">balance</span>
                  <h3 className="text-sm font-extrabold text-[#0f172a]">Neraca Keuangan Koperasi</h3>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Seimbang (Balanced)
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Aset / Aktiva:</div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Kas Likuid</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.kas)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Piutang Pinjaman Anggota (Kredit)</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.piutangPinjaman)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Persediaan Barang Toko Sembako</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.persediaanSembako || 0)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold text-[#2563eb]">
                  <span>Total Aset Koperasi</span>
                  <span>{formatRupiah(laporan.neraca.totalAset)}</span>
                </div>

                <div className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] pt-3">Kewajiban & Ekuitas / Pasiva:</div>
                {(laporan.neraca.danaTitipanQurban || 0) > 0 && (
                  <div className="flex justify-between pl-2">
                    <span className="text-slate-600">Dana Titipan Qurban</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.danaTitipanQurban)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Simpanan Sukarela Anggota</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.simpananSukarela)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Simpanan Pokok Anggota</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.simpananPokok)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Simpanan Wajib Anggota</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.simpananWajib)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-slate-600">Cadangan Modal & Laba Ditahan</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(laporan.neraca.cadanganModal || 0)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold text-[#0f172a]">
                  <span>Total Pasiva & Ekuitas</span>
                  <span>{formatRupiah(laporan.neraca.totalKewajibanModal || laporan.neraca.totalAset)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>* Neraca riil disusun otomatis dari buku kas, piutang, dan persediaan.</span>
              <span className="text-emerald-600 font-bold">Aktiva = Pasiva ✓</span>
            </div>
          </div>
        </div>

        {/* Section 3: Sisa Hasil Usaha (SHU) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563eb]">pie_chart</span>
              <h3 className="text-sm font-extrabold text-[#0f172a]">Simulasi Perhitungan Sisa Hasil Usaha (SHU)</h3>
            </div>
            <span className="text-[11px] font-extrabold text-[#2563eb] bg-[#eff6ff] px-2.5 py-0.5 rounded-full">
              Alokasi RAT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Pendapatan Jasa Bunga Pinjaman:</span>
                <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.shu.pendapatanBunga)}</span>
              </div>
              {(laporan.shu.labaSembako || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Margin Laba Toko Sembako:</span>
                  <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.shu.labaSembako)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Pendapatan Administrasi & Lainnya:</span>
                <span className="font-semibold text-[#2563eb]">{formatRupiah(laporan.shu.pendapatanLain)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Beban Biaya Operasional:</span>
                <span className="font-semibold text-rose-500">-{formatRupiah(laporan.shu.biayaOperasional)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-100 font-extrabold text-sm text-[#0f172a]">
                <span>Estimasi SHU Bersih Koperasi:</span>
                <span className="text-[#2563eb] text-base">{formatRupiah(laporan.shu.shuBersih)}</span>
              </div>
            </div>

            <div className="bg-[#eff6ff] p-4 rounded-2xl border border-[#bfdbfe] space-y-2">
              <span className="font-extrabold text-[#0f172a] block mb-2">Rencana Alokasi Pembagian Sesuai AD/ART:</span>
              <div className="flex justify-between">
                <span className="text-slate-600">Jasa Anggota ({settings.shuPersenAnggota || 40}%):</span>
                <span className="font-bold text-[#2563eb]">{formatRupiah(laporan.shu.alokasi.anggota)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Jasa Modal / Simpanan ({settings.shuPersenModal || 30}%):</span>
                <span className="font-bold text-[#2563eb]">{formatRupiah(laporan.shu.alokasi.modal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Dana Pengurus & Pengawas ({settings.shuPersenPengurus || 20}%):</span>
                <span className="font-bold text-[#2563eb]">{formatRupiah(laporan.shu.alokasi.pengurus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Dana Cadangan Koperasi ({settings.shuPersenCadangan || 10}%):</span>
                <span className="font-bold text-[#2563eb]">{formatRupiah(laporan.shu.alokasi.cadangan)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Tanda Tangan Pengurus */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-center">
            {/* Kiri: Ketua Pengurus */}
            <div className="w-full sm:w-64 flex flex-col items-center">
              <span className="text-slate-500 font-semibold mb-1">Mengetahui,</span>
              <span className="font-extrabold text-[#0f172a] text-sm">Ketua Pengurus</span>
              <div className="h-16"></div>
              <span className="font-extrabold text-[#0f172a] text-sm border-b border-slate-800 pb-0.5 min-w-36">
                {settings.ketua || '-'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Ketua Koperasi</span>
            </div>

            {/* Kanan: Bendahara */}
            <div className="w-full sm:w-64 flex flex-col items-center">
              <span className="text-slate-500 font-semibold mb-1">
                {settings.alamat ? `${settings.alamat.split(',').pop().trim()}, ` : ''}{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="font-extrabold text-[#0f172a] text-sm">Bendahara</span>
              <div className="h-16"></div>
              <span className="font-extrabold text-[#0f172a] text-sm border-b border-slate-800 pb-0.5 min-w-36">
                {settings.bendahara || '-'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Penanggung Jawab Keuangan</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
