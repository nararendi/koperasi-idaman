'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import ImportTransactionModal from '../components/ImportTransactionModal';
import { dataService } from '../lib/dataService';
import { downloadTemplateSimpananMultiExcel, downloadTemplateSimpananMultiCsv } from '../lib/transactionImport';
import { formatRupiah } from '../lib/formatters';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalAnggota: 0,
    totalSimpanan: 0,
    totalPinjaman: 0,
    saldoKas: 0
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [settings, setSettings] = useState({});
  const [selectedBar, setSelectedBar] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  // Dynamic Chart: Menampilkan grafik aktivitas keuangan terkini secara murni & realistis dari data aktual
  const getDynamicChartData = () => {
    const kasList = dataService.getKasList() || [];
    const barCount = 14;
    const rawData = [];
    const today = new Date();

    for (let i = 1; i <= barCount; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - (barCount - i));
      
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Ambil seluruh transaksi kas aktual pada tanggal ini
      const matchingKas = kasList.filter(
        (k) => (k?.tanggal || '').slice(0, 10) === dateStr
      );
      const segmentSum = matchingKas.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);

      rawData.push({
        targetDate,
        dateStr,
        day: targetDate.getDate(),
        label: `${targetDate.getDate()} ${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`,
        amount: segmentSum,
        count: matchingKas.length,
        isToday: i === barCount
      });
    }

    const actualMax = Math.max(...rawData.map((d) => d.amount), 0);
    // Skala dinamis mengikuti data riil tertinggi (atau default 1.000.000 jika belum ada transaksi)
    const scaleMax = actualMax > 0 
      ? Math.max(100000, Math.ceil((actualMax * 1.2) / 100000) * 100000) 
      : 1000000;

    const bars = rawData.map((item) => {
      // Tinggi bar murni proporsional terhadap data aktual (0 jika tidak ada transaksi)
      const heightPercent = item.amount > 0 
        ? Math.min(100, Math.max(6, Math.round((item.amount / scaleMax) * 100))) 
        : 0;

      return {
        ...item,
        val: heightPercent,
        displayAmount: formatRupiah(item.amount),
        hasRealData: item.amount > 0
      };
    });

    return {
      bars,
      scaleMax,
      actualMax,
      level3: Math.round(scaleMax),
      level2: Math.round(scaleMax * 0.66),
      level1: Math.round(scaleMax * 0.33)
    };
  };

  const chartInfo = getDynamicChartData();
  const chartData = chartInfo.bars;

  const loadDashboardData = () => {
    const anggota = dataService.getAnggotaList();
    const simpananSum = dataService.getSimpananSummary();
    const pinjamanSum = dataService.getPinjamanSummary();
    const kasSum = dataService.getKasSummary();
    const kasList = dataService.getKasList();
    const currentSettings = dataService.getSettings();

    setStats({
      totalAnggota: (anggota || []).filter((a) => (a.status || a.status_keanggotaan || '').toLowerCase() === 'aktif').length,
      totalSimpanan: simpananSum.total,
      totalPinjaman: pinjamanSum.berjalan,
      saldoKas: kasSum.saldo
    });

    setRecentTransactions(kasList.slice(0, 6));
    setAnggotaList(anggota || []);
    setSettings(currentSettings);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, []);

  // Pastel icon colors for transaction list
  const avatarColors = [
    'bg-[#dbeafe] text-[#1d4ed8]',
    'bg-[#dcfce7] text-[#15803d]',
    'bg-[#fef3c7] text-[#b45309]',
    'bg-[#e0e7ff] text-[#4338ca]',
    'bg-[#fae8ff] text-[#86198f]'
  ];

  return (
    <AppLayout
      title="Ringkasan & Finansial Koperasi"
      subtitle={`Selamat datang di sistem manajemen ${settings.namaKoperasi || 'Koperasi Idaman'}`}
      rightAction={
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown Unduh Template */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#047857]">file_download</span>
              <span>Unduh Template</span>
              <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
            </button>

            {templateMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-pop-in"
                onMouseLeave={() => setTemplateMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Format Template Simpanan
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadTemplateSimpananMultiCsv(settings, anggotaList);
                    setTemplateMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#eff6ff] hover:text-[#2563eb] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#2563eb]">table_chart</span>
                    <span>Template CSV (.csv)</span>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Paling Lancar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadTemplateSimpananMultiExcel(settings, anggotaList);
                    setTemplateMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#eff6ff] hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-[#047857]">description</span>
                  <span>Template Excel (.xls)</span>
                </button>
              </div>
            )}
          </div>

          {/* Tombol Import Transaksi */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">file_upload</span>
            <span>Import Transaksi</span>
          </button>

          {/* Tombol Unduh Laporan */}
          <Link
            href="/laporan"
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Unduh Laporan</span>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        
        {/* ==================== CHART HEADER & LEGEND ==================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-extrabold text-sm">
            <span className="material-symbols-outlined text-[#2563eb] text-lg">insights</span>
            <span>Aktivitas Arus Kas Terkini (Real-Time)</span>
          </div>

          {/* Chart Legend Info */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffd159]"></span>
              Hari Ini (Terkini)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]"></span>
              Arus Kas & Transaksi
            </span>
          </div>
        </div>

        {/* INTERACTIVE VERTICAL BAR CHART */}
        <div className="bg-[#f8fafc] border border-slate-100 rounded-3xl p-5 md:p-6 shadow-inner relative overflow-hidden">
          <div className="relative h-56 flex items-end justify-between gap-1 sm:gap-2 pt-10 pb-4 border-b border-slate-200/80">
            
            {/* Background horizontal grid lines with dynamic amounts */}
            <div className="absolute inset-x-0 top-6 border-b border-dashed border-slate-200/60 pointer-events-none flex justify-between text-[10px] text-slate-400 font-semibold px-1">
              <span>{formatRupiah(chartInfo.level3)}</span>
            </div>
            <div className="absolute inset-x-0 top-24 border-b border-dashed border-slate-200/60 pointer-events-none flex justify-between text-[10px] text-slate-400 font-semibold px-1">
              <span>{formatRupiah(chartInfo.level2)}</span>
            </div>
            <div className="absolute inset-x-0 top-40 border-b border-dashed border-slate-200/60 pointer-events-none flex justify-between text-[10px] text-slate-400 font-semibold px-1">
              <span>{formatRupiah(chartInfo.level1)}</span>
            </div>

            {/* Vertical Bars with Staggered Rise Animation */}
            {chartData.map((item, idx) => {
              const isSelected = selectedBar === item.dateStr || (selectedBar === null && item.isToday);
              const hasData = item.amount > 0;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedBar(item.dateStr)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative z-10"
                >
                  {/* Floating Tooltip if selected or active */}
                  {isSelected && (
                    <div className="absolute -top-10 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-lg flex flex-col items-center whitespace-nowrap animate-pop-in z-30 pointer-events-none">
                      <span className={`text-xs font-extrabold ${hasData ? 'text-[#2563eb]' : 'text-slate-500'}`}>
                        {item.displayAmount}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        {item.label} {item.count > 0 ? `• ${item.count} Transaksi` : '• Tidak ada transaksi'}
                      </span>
                      <div className="w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200/80 absolute -bottom-1"></div>
                    </div>
                  )}

                  {/* The Bar: Menampilkan tinggi riil jika ada data, atau garis dasar tipis jika Rp 0 */}
                  <div
                    style={{
                      height: hasData ? `${item.val}%` : '4px',
                      animationDelay: `${idx * 30}ms`
                    }}
                    className={`w-3 sm:w-4 md:w-5 rounded-t-lg transition-all duration-300 ${
                      hasData
                        ? isSelected
                          ? 'bg-[#ffd159] shadow-md scale-y-105 ring-2 ring-[#ffd159]/50 animate-bar-rise'
                          : 'bg-[#bfdbfe] hover:bg-[#93c5fd] group-hover:scale-y-105 group-hover:shadow-sm animate-bar-rise'
                        : isSelected
                          ? 'bg-[#ffd159] shadow-xs'
                          : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Numbers */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-bold pt-2 px-1">
            {chartData.map((item) => {
              const isSelected = selectedBar === item.dateStr || (selectedBar === null && item.isToday);
              return (
                <span
                  key={item.dateStr}
                  onClick={() => setSelectedBar(item.dateStr)}
                  className={`flex-1 text-center cursor-pointer transition-all duration-150 ${
                    isSelected ? 'text-[#0f172a] font-black scale-110 underline decoration-[#ffd159] decoration-2' : 'hover:text-slate-700'
                  }`}
                >
                  {item.day}
                </span>
              );
            })}
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Anggota */}
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-sm card-hover flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Anggota Aktif</span>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2563eb] shadow-xs group-hover:scale-110 group-hover:bg-[#2563eb] group-hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-lg">group</span>
              </div>
            </div>
            <div className="text-xl font-extrabold text-[#0f172a] mt-2">
              {stats.totalAnggota} <span className="text-xs font-semibold text-slate-400">Orang</span>
            </div>
            <Link href="/anggota" className="mt-2 text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Kelola Data &rarr;
            </Link>
          </div>

          {/* Total Simpanan */}
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-sm card-hover flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Simpanan</span>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2563eb] shadow-xs group-hover:scale-110 group-hover:bg-[#2563eb] group-hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-lg">savings</span>
              </div>
            </div>
            <div className="text-xl font-extrabold text-[#2563eb] mt-2">
              {formatRupiah(stats.totalSimpanan)}
            </div>
            <Link href="/simpanan" className="mt-2 text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Buku Simpanan &rarr;
            </Link>
          </div>

          {/* Total Pinjaman */}
          <div className="bg-[#fefbf2] border border-[#faecd2] rounded-2xl p-4 shadow-sm card-hover flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pinjaman Berjalan</span>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#df9800] shadow-xs group-hover:scale-110 group-hover:bg-[#df9800] group-hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-lg">payments</span>
              </div>
            </div>
            <div className="text-xl font-extrabold text-[#df9800] mt-2">
              {formatRupiah(stats.totalPinjaman)}
            </div>
            <Link href="/pinjaman" className="mt-2 text-[11px] font-bold text-[#df9800] hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Tagihan & Angsuran &rarr;
            </Link>
          </div>

          {/* Saldo Kas */}
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-sm card-hover flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Kas</span>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2563eb] shadow-xs group-hover:scale-110 group-hover:bg-[#2563eb] group-hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-lg">account_balance</span>
              </div>
            </div>
            <div className="text-xl font-extrabold text-[#0f172a] mt-2">
              {formatRupiah(stats.saldoKas)}
            </div>
            <Link href="/kas" className="mt-2 text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Arus Kas &rarr;
            </Link>
          </div>
        </section>

        {/* LOWER SECTION: ARRIVING TODAY LIST & PROMO BANNER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Left 2 Cols: Transaksi Terkini Activity List */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                <span>Aktivitas Transaksi Terkini</span>
                <span className="text-xs font-semibold text-slate-400">({recentTransactions.length} Mutasi Terakhir)</span>
              </h3>
              <Link href="/kas" className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5 btn-interactive">
                Lihat Semua &gt;
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center bg-[#f8fafc] rounded-2xl border border-slate-100 text-xs text-slate-400 font-semibold">
                  Belum ada transaksi terbaru.
                </div>
              ) : (
                recentTransactions.map((tx, idx) => {
                  const isPenerimaan = tx.jenis === 'Penerimaan';
                  const avatarColor = avatarColors[idx % avatarColors.length];

                  return (
                    <div
                      key={tx.id || idx}
                      className="bg-white border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-[#2563eb]/40 card-hover group"
                    >
                      {/* Left: Avatar / Art icon & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl ${avatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-inner group-hover:scale-105 transition-transform`}>
                          <span className="material-symbols-outlined text-xl">
                            {isPenerimaan ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#0f172a] truncate group-hover:text-[#2563eb] transition-colors">
                            {tx.keterangan || tx.kategori || 'Transaksi Keuangan'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {tx.kategori || 'Umum'} &bull; {tx.tanggal}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Status Badge */}
                      <div className="hidden sm:block">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold transition-transform group-hover:scale-105 ${
                            isPenerimaan
                              ? 'bg-[#eff6ff] text-[#2563eb]'
                              : 'bg-[#fff1f2] text-[#e11d48]'
                          }`}
                        >
                          {isPenerimaan ? 'Kas Masuk' : 'Kas Keluar'}
                        </span>
                      </div>

                      {/* Right: Amount & Timestamp */}
                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col">
                          <span className={`text-xs font-extrabold ${isPenerimaan ? 'text-[#2563eb]' : 'text-rose-500'}`}>
                            {isPenerimaan ? '+' : '-'}{formatRupiah(tx.jumlah)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {tx.tanggal || 'Hari ini'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right 1 Col: Summary Banner */}
          <div className="bg-gradient-to-br from-[#eff6ff] via-[#dbeafe] to-[#bfdbfe] border border-[#93c5fd]/50 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xs min-h-[220px] card-hover">
            {/* Background Decorative Palms & Geometric Art */}
            <div className="absolute -bottom-6 -right-6 w-36 h-36 opacity-70 pointer-events-none animate-float">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#2563eb]/20 fill-current">
                <path d="M50 0 C40 30 10 40 0 50 C30 60 40 90 50 100 C60 70 90 60 100 50 C70 40 60 10 50 0 Z" />
              </svg>
            </div>
            
            {/* Top Text Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/60 text-[#1d4ed8] text-[10px] font-extrabold mb-2 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-ping"></span>
                Status Sehat
              </div>
              <h4 className="text-base font-extrabold text-[#0f172a]">
                Kinerja Koperasi!
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                Likuiditas kas dan perputaran dana anggota bulan ini dalam performa optimal.
              </p>
            </div>

            {/* Bottom Yellow Action Button */}
            <div className="pt-5 relative z-10">
              <Link
                href="/kas"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#ffd159] hover:bg-[#f7be38] text-[#0f172a] rounded-xl font-extrabold text-xs shadow-sm btn-interactive cursor-pointer"
              >
                <span>Kelola Kas</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2563eb] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <span className="material-symbols-outlined text-base text-[#ffd159]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL IMPORT TRANSAKSI SIMPANAN (BERANDA) */}
      <ImportTransactionModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        settings={settings}
        anggotaList={anggotaList}
        onSuccess={({ countMembers, createdCount, updatedCount, grandTotal }) => {
          loadDashboardData();
          const info = updatedCount > 0
            ? `${countMembers} anggota (${createdCount} baru, ${updatedCount} disesuaikan/anti-dobel)`
            : `${countMembers} anggota`;
          showToast(`Berhasil mengimpor setoran simpanan ${info} senilai ${formatRupiah(grandTotal)}!`);
        }}
      />
    </AppLayout>
  );
}
